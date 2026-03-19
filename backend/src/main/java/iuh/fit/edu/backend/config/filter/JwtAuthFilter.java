package iuh.fit.edu.backend.config.filter;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwk.Jwk;
import com.auth0.jwk.JwkProvider;
import com.auth0.jwk.UrlJwkProvider;
import iuh.fit.edu.backend.repository.mysql.BlackListUserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.security.interfaces.RSAPublicKey;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    @Autowired
    BlackListUserRepository blackListUserRepository;

    private static final String JWKS_URL =
            "https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_r9OwliPee";

    private static final String ISSUER =
            "https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_r9OwliPee";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String token = null;

        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("idToken".equals(cookie.getName())) {
                    token = cookie.getValue();
                    break;
                }
            }
        }

        if (token != null) {
            try {



                DecodedJWT decodedJWT = JWT.decode(token);
                String keyId = decodedJWT.getKeyId();

                JwkProvider provider = new UrlJwkProvider(JWKS_URL);
                Jwk jwk = provider.get(keyId);
                RSAPublicKey publicKey = (RSAPublicKey) jwk.getPublicKey();

                JWTVerifier verifier = JWT
                        .require(Algorithm.RSA256(publicKey, null))
                        .withIssuer(ISSUER)
                        .build();

                DecodedJWT jwt = verifier.verify(token);

                boolean revoked = blackListUserRepository.existsByAnyToken(token);

                if (revoked) {
                    throw new RuntimeException("Token revoked");
                }

                String phone = jwt.getClaim("phone_number").asString();

                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(
                                phone, null, List.of()
                        );


                SecurityContextHolder.getContext().setAuthentication(auth);

            } catch (Exception e) {
                System.err.println("JWT validation failed: " + e.getMessage());
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}
