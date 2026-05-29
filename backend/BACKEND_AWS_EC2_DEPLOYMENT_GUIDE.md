# Huong Dan Build Va Deploy Backend Wisdom Social Tren AWS EC2

Tai lieu nay mo ta luong build/deploy phu hop nhat cho backend hien tai cua `wisdom-social`, voi muc tieu:

- Tiet kiem chi phi trong goi credit AWS 120 USD.
- Duy tri server khoang 2 tuan.
- Backend chay on dinh voi REST API va WebSocket.
- Chi build/deploy backend khi code trong `backend/**` thay doi.
- Khong can ALB/ECS Fargate/NAT Gateway o giai doan dau.
- Co the nang cap len kien truc production lon hon sau nay.

## 1. Kien Truc De Xuat

Repo hien tai la monorepo:
 
```text
wisdom-social
├─ backend
├─ frontend-web
├─ frontend-mobile
└─ frontend-admin
```

Kien truc deploy backend nen dung:

```text
GitHub repo
   |
   v
GitHub Actions
   |
   v
AWS ECR: luu Docker image backend
   |
   v
EC2 Ubuntu
├─ Caddy container: HTTPS + reverse proxy
├─ Backend Spring Boot container
└─ Redis container
```

Frontend web/mobile se goi:

```text
https://api.yourdomain.com
wss://api.yourdomain.com/ws
wss://api.yourdomain.com/ws-native
```

Caddy nhan request o port `80/443`, sau do proxy noi bo vao backend:

```text
Caddy :443 -> backend :8080
```

Redis chay cung EC2 nhung la container rieng:

```text
Backend container -> Redis container
```

Backend va Redis khong nen gop chung mot container. Moi container nen co mot nhiem vu rieng de de update, restart, doc log, giu volume va nang cap ve sau.

## 2. Vi Sao Chon Kien Truc Nay

### 2.1 Khong dung ALB luc dau

ALB la Application Load Balancer cua AWS. ALB rat tot khi:

- Co nhieu backend instance.
- Can high availability.
- Can auto scaling.
- Dung ECS Fargate production.

Trong truong hop hien tai, ban chi can duy tri server khoang 2 tuan va co ngan sach 120 USD. Neu chi co mot EC2 thi mo hinh:

```text
Internet -> ALB -> 1 EC2
```

khong tang kha nang chiu loi dang ke, vi EC2 chet thi app van chet. No lai ton them chi phi. Vi vay giai doan dau khong nen dung ALB.

### 2.2 Dung Caddy thay vi cau hinh HTTPS truc tiep trong Spring Boot

Neu khong dung Caddy/Nginx, frontend phai goi truc tiep:

```text
http://ec2-public-ip:8080
```

Cach nay chi hop test nhanh. Khi deploy that, nen co:

```text
https://api.yourdomain.com
wss://api.yourdomain.com/ws
```

Caddy giup:

- Tu cap HTTPS bang Let's Encrypt.
- Tu renew certificate.
- Che port `8080` cua backend.
- Proxy WebSocket duoc.
- Config ngan hon Nginx.

### 2.3 Redis de chung EC2 nhung khac container

Voi 2 tuan demo, Redis chay cung EC2 la hop ly de tiet kiem tien:

```text
1 EC2
├─ backend container
└─ redis container
```

Redis van khong mat du lieu khi update backend neu dung Docker volume va bat AOF:

```text
redis_data:/data
--appendonly yes
```

Chi can tranh lenh:

```bash
docker compose down -v
```

vi `-v` se xoa volume.

## 3. Cac Dich Vu Se Dung

Dung trong tai khoan AWS deploy backend:

- EC2: chay Docker Compose.
- ECR: luu image backend.
- IAM: quyen GitHub Actions push image len ECR, EC2 pull image tu ECR.
- CloudWatch/Billing Budget: theo doi chi phi.

Khong can dung luc dau:

- ALB.
- ECS Fargate.
- NAT Gateway.
- ElastiCache.
- RDS neu database da o tai khoan khac.

Ban da co cac dich vu o tai khoan khac:

- S3.
- Cognito.
- MariaDB/TiDB.
- MongoDB.

Vi vay EC2 hien tai chi can chay:

- Backend.
- Redis.
- Caddy.

## 4. Checklist Truoc Khi Deploy

### 4.1 Tao AWS Budget

Trong AWS Billing, tao budget alert:

```text
20 USD
50 USD
90 USD
110 USD
```

Bat ca canh bao:

- Actual cost.
- Forecasted cost.

AWS khong mac dinh dung toan bo tai nguyen khi het credit. Budget alert giup ban biet som de tat/xoa tai nguyen.

### 4.2 Rotate secret hien tai

Backend hien tai co credential trong:

```text
backend/.env
backend/src/main/resources/application.properties
```

Nen rotate:

- AWS access key.
- AWS secret key.
- Database password.
- MongoDB password.
- JWT secret.
- AI provider key.

Khong commit `.env.prod` len Git.

### 4.3 Tach config thanh 3 file application

Nen tach config Spring Boot thanh 3 file:

```text
backend/src/main/resources/application.properties
backend/src/main/resources/application-dev.properties
backend/src/main/resources/application-prod.properties
```

Muc tieu:

- `application.properties`: config chung, khong chua secret.
- `application-dev.properties`: config local/dev, co the doc `backend/.env`.
- `application-prod.properties`: config production, doc tu environment variables cua Docker Compose/EC2.

Backend hien co dong:

```properties
jwt.secret-key={jwt.secret-key}
```

Nen doi thanh:

```properties
jwt.secret-key=${JWT_SECRET_KEY}
```

#### application.properties

File nay chi nen giu config chung:

```properties
spring.application.name=backend

spring.datasource.driver-class-name=org.mariadb.jdbc.Driver

spring.jpa.show-sql=false
```

Khong nen de secret trong file nay. Cac gia tri nhu DB URL, DB password, Mongo URI, Redis password, AWS key, JWT secret, AI key nen dua sang profile dev/prod.

#### application-dev.properties

File nay dung khi chay local. Neu ban muon giu cach doc `backend/.env` khi dev, dat `spring.config.import` o day:

```properties
spring.config.import=optional:file:.env[.properties]

logging.level.me.paulschwarz=DEBUG

spring.datasource.url=${SPRING_DATASOURCE_URL}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD}

spring.jpa.hibernate.ddl-auto=update

spring.data.mongodb.uri=${SPRING_DATA_MONGODB_URI}

spring.data.redis.host=${SPRING_DATA_REDIS_HOST:localhost}
spring.data.redis.port=${SPRING_DATA_REDIS_PORT:6379}
spring.data.redis.password=${SPRING_DATA_REDIS_PASSWORD}

aws.region=${AWS_REGION:ap-southeast-1}
aws.access-key=${AWS_ACCESS_KEY}
aws.secret-key=${AWS_SECRET_KEY}
aws.s3.bucket-name=${AWS_S3_BUCKET_NAME}
app.cdn-domain=${APP_CDN_DOMAIN}

jwt.secret-key=${JWT_SECRET_KEY}

aws.cognito.userPoolId=${AWS_COGNITO_USER_POOL_ID}
aws.cognito.clientId=${AWS_COGNITO_CLIENT_ID}

ai.provider.base-url=${AI_PROVIDER_BASE_URL}
ai.provider.api-key=${AI_PROVIDER_API_KEY}

app.web-url=${APP_WEB_URL:http://localhost:5173}
```

Khi chay local, set:

```bash
SPRING_PROFILES_ACTIVE=dev
```

Hoac chay Maven:

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

#### application-prod.properties

File nay dung khi chay Docker tren EC2. Khong can `spring.config.import=optional:file:.env[.properties]` vi Docker Compose se inject `.env.prod` vao container bang `env_file`.

```properties
logging.level.me.paulschwarz=INFO

spring.datasource.url=${SPRING_DATASOURCE_URL}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD}

spring.jpa.hibernate.ddl-auto=update

spring.data.mongodb.uri=${SPRING_DATA_MONGODB_URI}

spring.data.redis.host=${SPRING_DATA_REDIS_HOST}
spring.data.redis.port=${SPRING_DATA_REDIS_PORT}
spring.data.redis.password=${SPRING_DATA_REDIS_PASSWORD}

aws.region=${AWS_REGION}
aws.access-key=${AWS_ACCESS_KEY}
aws.secret-key=${AWS_SECRET_KEY}
aws.s3.bucket-name=${AWS_S3_BUCKET_NAME}
app.cdn-domain=${APP_CDN_DOMAIN}

jwt.secret-key=${JWT_SECRET_KEY}

aws.cognito.userPoolId=${AWS_COGNITO_USER_POOL_ID}
aws.cognito.clientId=${AWS_COGNITO_CLIENT_ID}

ai.provider.base-url=${AI_PROVIDER_BASE_URL}
ai.provider.api-key=${AI_PROVIDER_API_KEY}

app.web-url=${APP_WEB_URL}
```

Trong `docker-compose.yml`, set:

```yaml
services:
  backend:
    env_file:
      - .env.prod
    environment:
      SPRING_PROFILES_ACTIVE: prod
```

Voi giai doan demo ngan, co the tiep tuc dung access key trong env. Production that nen chuyen `S3Config` va `CognitoConfig` sang IAM role/DefaultCredentialsProvider.

## 5. Tao Dockerfile Cho Backend

Tao file:

```text
backend/docker/Dockerfile
```

Noi dung de xuat:

```dockerfile
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
RUN ./mvnw -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Neu Maven wrapper tren Windows bi loi, Docker build van thuong chay duoc vi stage build dung Linux shell va file `./mvnw`.

Nen dam bao file `mvnw` co quyen execute tren Git:

```bash
git update-index --chmod=+x backend/mvnw
```

## 6. Tao ECR Repository

Trong AWS Console:

```text
ECR -> Private repositories -> Create repository
Repository name: wisdom-backend
```

Hoac dung AWS CLI:

```bash
aws ecr create-repository \
  --repository-name wisdom-backend \
  --region ap-southeast-1
```

Sau khi tao, ECR URL se co dang:

```text
<aws-account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/wisdom-backend
```

Vi du:

```text
123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/wisdom-backend
```

## 7. Tao EC2

De xuat:

```text
Region: ap-southeast-1
AMI: Ubuntu 22.04 hoac 24.04
Instance type: t3.small hoac t4g.small
Disk: 20-30GB gp3
```

Security Group:

```text
Inbound:
22   SSH    chi mo cho IP cua ban
80   HTTP   0.0.0.0/0
443  HTTPS  0.0.0.0/0

Khong mo:
8080 backend
6379 Redis
```

Ly do khong mo `8080`:

```text
Internet -> Caddy :443 -> backend :8080 noi bo
```

Ly do khong mo `6379`:

```text
Redis chi cho backend noi bo dung, khong public internet.
```

Gan IAM role cho EC2 co quyen pull ECR:

```text
AmazonEC2ContainerRegistryReadOnly
```

## 8. Cai Docker Tren EC2

SSH vao EC2:

```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

Cai Docker:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu
```

Dang xuat SSH va dang nhap lai de group `docker` co hieu luc.

Kiem tra:

```bash
docker version
docker compose version
```

## 9. Tao Thu Muc Deploy Tren EC2

```bash
mkdir -p ~/wisdom-social
cd ~/wisdom-social
```

Tao cac file:

```text
~/wisdom-social
├─ docker-compose.yml
├─ Caddyfile
└─ .env.prod
```

## 10. File docker-compose.yml Tren EC2

Thay:

```text
<aws-account-id>
ap-southeast-1
```

bang thong tin cua ban.

```yaml
services:
  backend:
    image: <aws-account-id>.dkr.ecr.ap-southeast-1.amazonaws.com/wisdom-backend:latest
    container_name: wisdom-backend
    env_file:
      - .env.prod
    depends_on:
      - redis
    ports:
      - "127.0.0.1:8080:8080"
    restart: unless-stopped

  redis:
    image: redis:7.2
    container_name: wisdom-redis
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

  caddy:
    image: caddy:2
    container_name: wisdom-caddy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  redis_data:
  caddy_data:
  caddy_config:
```

Luu y:

- Backend bind `127.0.0.1:8080:8080`, khong public internet.
- Redis khong map port, chi container backend truy cap qua Docker network.
- Caddy public port `80` va `443`.
- Redis co volume `redis_data`.
- Caddy co volume `caddy_data` de giu certificate.

## 11. File Caddyfile

Neu da co domain `api.yourdomain.com` tro ve public IP cua EC2:

```caddyfile
api.yourdomain.com {
    reverse_proxy backend:8080
}
```

Caddy tu dong:

- Cap HTTPS.
- Renew certificate.
- Proxy WebSocket.

Neu chua co domain, ban co the test tam backend qua port `8080`, nhung nen dong port `8080` lai khi da dung domain + Caddy.

## 12. File .env.prod Tren EC2

Tao file:

```bash
nano ~/wisdom-social/.env.prod
```

Mau:

```env
SPRING_DATASOURCE_URL=jdbc:mariadb://your-db-host:4000/wisdomsocial?sslMode=TRUST
SPRING_DATASOURCE_USERNAME=your_db_user
SPRING_DATASOURCE_PASSWORD=your_db_password

SPRING_DATA_MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/wisdom-social

SPRING_DATA_REDIS_HOST=redis
SPRING_DATA_REDIS_PORT=6379
SPRING_DATA_REDIS_PASSWORD=your-strong-redis-password
REDIS_PASSWORD=your-strong-redis-password

AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY=your_rotated_aws_access_key
AWS_SECRET_KEY=your_rotated_aws_secret_key
AWS_S3_BUCKET_NAME=your_s3_bucket
APP_CDN_DOMAIN=https://your-cdn-or-s3-domain/

JWT_SECRET_KEY=your-long-random-jwt-secret

AWS_COGNITO_USER_POOL_ID=ap-southeast-1_xxxxx
AWS_COGNITO_CLIENT_ID=xxxxx

AI_PROVIDER_BASE_URL=https://openrouter.ai/api/v1
AI_PROVIDER_API_KEY=your_ai_provider_key

APP_WEB_URL=https://your-frontend-domain.com
```

Bao ve file:

```bash
chmod 600 ~/wisdom-social/.env.prod
```

## 13. GitHub Actions Secrets

Trong GitHub repo:

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

Can tao:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
AWS_ACCOUNT_ID
ECR_REPOSITORY
EC2_HOST
EC2_USER
EC2_SSH_KEY
```

Gia tri goi y:

```text
AWS_REGION=ap-southeast-1
ECR_REPOSITORY=wisdom-backend
EC2_USER=ubuntu
EC2_HOST=<public-ip-or-domain-of-ec2>
```

`EC2_SSH_KEY` la private key SSH dung de GitHub Actions SSH vao EC2. Nen tao mot key rieng cho deploy, khong dung key ca nhan neu co the.

IAM user dung cho GitHub Actions can quyen:

- Push image len ECR.
- Login ECR.

Quyen AWS managed co the dung giai doan dau:

```text
AmazonEC2ContainerRegistryPowerUser
```

Ve sau nen thu hep thanh policy rieng cho repository `wisdom-backend`.

## 14. GitHub Actions Workflow

Tao file:

```text
.github/workflows/backend-deploy.yml
```

Noi dung:

```yaml
name: Backend CI/CD

on:
  pull_request:
    branches:
      - main
    paths:
      - "backend/**"
      - ".github/workflows/backend-deploy.yml"

  push:
    branches:
      - main
    paths:
      - "backend/**"
      - ".github/workflows/backend-deploy.yml"

  workflow_dispatch:

jobs:
  test:
    name: Test backend
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Java 21
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "21"
          cache: maven

      - name: Make Maven wrapper executable
        run: chmod +x backend/mvnw

      - name: Test
        working-directory: backend
        run: ./mvnw test

  docker:
    name: Build and push Docker image
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    outputs:
      image: ${{ steps.image.outputs.image }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image
        id: image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: ${{ secrets.ECR_REPOSITORY }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          IMAGE="$ECR_REGISTRY/$ECR_REPOSITORY"
          docker build -f backend/docker/Dockerfile -t "$IMAGE:$IMAGE_TAG" -t "$IMAGE:latest" ./backend
          docker push "$IMAGE:$IMAGE_TAG"
          docker push "$IMAGE:latest"
          echo "image=$IMAGE:$IMAGE_TAG" >> "$GITHUB_OUTPUT"

  deploy:
    name: Deploy to EC2
    runs-on: ubuntu-latest
    needs: docker
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - name: Deploy over SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            set -e
            cd ~/wisdom-social
            aws ecr get-login-password --region ${{ secrets.AWS_REGION }} | docker login --username AWS --password-stdin ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ secrets.AWS_REGION }}.amazonaws.com
            docker compose pull backend
            docker compose up -d backend
            docker image prune -f
            docker ps
```

### Cach workflow nay hoat dong

PR vao `main` co sua `backend/**`:

```text
test
khong build Docker
khong deploy
```

Push/merge vao `main` co sua `backend/**`:

```text
test
-> build Docker
-> push ECR
-> deploy EC2
```

Neu chi sua frontend:

```text
workflow backend khong chay
```

## 15. Cai AWS CLI Tren EC2

Job deploy can EC2 login ECR. EC2 can co AWS CLI:

```bash
sudo apt update
sudo apt install -y unzip curl
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
aws --version
```

Neu dung EC2 ARM `t4g`, tai goi AWS CLI phu hop voi aarch64:

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o "awscliv2.zip"
```

EC2 nen co IAM role `AmazonEC2ContainerRegistryReadOnly`, luc do khong can luu AWS key tren EC2.

## 16. Lan Chay Dau Tren EC2

Truoc khi GitHub Actions deploy, can login ECR va pull image neu image da co.

```bash
cd ~/wisdom-social
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.ap-southeast-1.amazonaws.com
docker compose pull
docker compose up -d
```

Kiem tra:

```bash
docker ps
docker logs wisdom-backend --tail 200
docker logs wisdom-caddy --tail 100
docker logs wisdom-redis --tail 100
```

Test noi bo tren EC2:

```bash
curl http://127.0.0.1:8080
```

Test tu may cua ban:

```bash
curl https://api.yourdomain.com
```

## 17. DNS Domain

Tao record:

```text
Type: A
Name: api
Value: <EC2 public IPv4>
```

Ket qua:

```text
api.yourdomain.com -> EC2 public IP
```

Caddy chi cap HTTPS duoc khi:

- Domain tro dung IP.
- Port `80` va `443` mo trong Security Group.
- Container Caddy dang chay.

## 18. Cap Nhat Frontend De Goi Backend

Frontend web/mobile nen dung:

```text
API base URL: https://api.yourdomain.com
WebSocket:
  wss://api.yourdomain.com/ws
  wss://api.yourdomain.com/ws-native
```

Backend CORS hien tai dang whitelist localhost va IP LAN. Can them domain frontend production vao `CorsConfig`.

Vi du:

```java
configuration.setAllowedOrigins(Arrays.asList(
    "http://localhost:5173",
    "https://your-frontend-domain.com"
));
```

Trong `WebSocketConfig`, hien dang:

```java
.setAllowedOriginPatterns("*")
```

Demo co the de tam. Production nen gioi han domain that.

## 19. Luong Lam Viec Hang Ngay

### 19.1 Sua backend

```bash
git checkout -b feature/backend-fix
```

Sua code trong:

```text
backend/**
```

Push branch:

```bash
git push origin feature/backend-fix
```

Tao PR vao `main`.

GitHub Actions se:

```text
run backend test
```

Neu pass, review va merge.

Sau khi merge vao `main`:

```text
test lai
build Docker image
push ECR
deploy EC2
```

### 19.2 Sua frontend

Neu chi sua:

```text
frontend-web/**
frontend-mobile/**
frontend-admin/**
```

Backend workflow khong chay.

Frontend nen co workflow rieng neu can.

## 20. Rollback Khi Deploy Loi

Moi image nen co tag commit SHA:

```text
wisdom-backend:<commit-sha>
wisdom-backend:latest
```

Neu `latest` loi, SSH vao EC2:

```bash
cd ~/wisdom-social
nano docker-compose.yml
```

Doi image backend tu:

```yaml
image: <ecr-url>/wisdom-backend:latest
```

sang tag cu:

```yaml
image: <ecr-url>/wisdom-backend:<old-commit-sha>
```

Chay:

```bash
docker compose up -d backend
docker logs wisdom-backend -f
```

Sau khi fix xong co the doi lai `latest`.

## 21. Cac Lenh Van Hanh Quan Trong

Xem container:

```bash
docker ps
```

Xem log backend:

```bash
docker logs wisdom-backend -f
```

Xem log Redis:

```bash
docker logs wisdom-redis -f
```

Xem log Caddy:

```bash
docker logs wisdom-caddy -f
```

Restart backend:

```bash
docker compose up -d backend
```

Restart tat ca:

```bash
docker compose up -d
```

Dung container nhung giu volume:

```bash
docker compose down
```

Khong dung neu khong muon xoa Redis/Caddy data:

```bash
docker compose down -v
```

Don image cu:

```bash
docker image prune -f
```

## 22. Redis Co Mat Du Lieu Khi Update Backend Khong

Khong mat neu:

- Redis la container rieng.
- Co volume `redis_data:/data`.
- Bat `--appendonly yes`.
- Khong chay `docker compose down -v`.
- Khong xoa EBS volume cua EC2.

Update backend chi nen chay:

```bash
docker compose pull backend
docker compose up -d backend
```

Lenh nay khong xoa Redis volume.

Luu y: Redis trong he thong nay chu yeu nen duoc xem la cache/pub-sub/presence/rate-limit store. Du lieu chinh van nam o MariaDB/MongoDB. Mot so key co TTL se tu mat theo thiet ke.

## 23. Khi Nao Nen Tach Redis Ra Rieng

Hien tai nen de Redis chung EC2 vi:

- Chi chay 2 tuan.
- Tiet kiem credit.
- Setup nhanh.
- Backend chi co mot instance.

Nen tach Redis khi:

- Co nhieu backend instance.
- Chat realtime co nhieu user online.
- Can uptime tot hon.
- Can monitor/backup Redis nghiem tuc.
- Chuyen sang ECS/Fargate production.

Khi tach Redis, chi can doi:

```env
SPRING_DATA_REDIS_HOST=<redis-endpoint>
SPRING_DATA_REDIS_PORT=6379
SPRING_DATA_REDIS_PASSWORD=<redis-password>
```

Va bo service `redis` trong `docker-compose.yml`.

## 24. Khi Nao Nen Nang Len ALB/ECS

Hien tai:

```text
Domain -> EC2 -> Caddy -> backend
```

Sau nay khi can scale:

```text
Domain -> ALB -> ECS/Fargate backend tasks -> Redis rieng
```

Nen nang cap khi:

- Mot EC2 khong chiu noi traffic.
- Can zero-downtime deployment.
- Can auto scaling.
- Can high availability.
- Co nhieu backend instances.

Voi goi 120 USD va 2 tuan demo, chua can.

## 25. Viec Can Lam Trong Repo

Nen them/cap nhat:

```text
backend/docker/Dockerfile
.github/workflows/backend-deploy.yml
```

Nen sua:

```text
backend/src/main/resources/application.properties
backend/src/main/java/.../CorsConfig.java
backend/pom.xml
```

Trong `pom.xml`, hien co mot so dependency duplicate:

- `spring-boot-starter-security`.
- `spring-boot-starter-websocket`.
- `spring-boot-starter-data-jpa`.
- `spring-boot-starter-data-mongodb`.
- AWS SDK S3/Cognito.
- `java-jwt`.
- `jwks-rsa`.

Build co the van chay, nhung nen don de giam nhieu va tranh conflict.

## 26. Luong Tong Ket Tu Dau Den Cuoi

```text
1. Tao AWS Budget alert.
2. Rotate secrets dang nam trong repo.
3. Tao ECR repository wisdom-backend.
4. Tao EC2 Ubuntu t3.small/t4g.small.
5. Gan IAM role cho EC2 de pull ECR.
6. Mo Security Group: 22, 80, 443.
7. Cai Docker va Docker Compose tren EC2.
8. Tao ~/wisdom-social/docker-compose.yml.
9. Tao ~/wisdom-social/Caddyfile.
10. Tao ~/wisdom-social/.env.prod.
11. Them backend/docker/Dockerfile vao repo.
12. Them GitHub Actions workflow backend-deploy.yml.
13. Tao GitHub Secrets.
14. Push branch backend va tao PR vao main.
15. PR chay test backend.
16. Merge vao main.
17. GitHub Actions test lai.
18. Build Docker image backend.
19. Push image len ECR.
20. SSH vao EC2 va docker compose pull/up backend.
21. Caddy proxy HTTPS toi backend.
22. Frontend goi https://api.yourdomain.com.
```

## 27. Kien Truc Cuoi Cung Cho Giai Doan 2 Tuan

```text
Frontend web/mobile
        |
        v
https://api.yourdomain.com
        |
        v
EC2 Ubuntu
├─ Caddy container
│  └─ HTTPS + reverse_proxy backend:8080
├─ Backend Spring Boot container
│  ├─ MariaDB/TiDB remote
│  ├─ MongoDB remote
│  ├─ S3 remote
│  ├─ Cognito remote
│  └─ Redis container
└─ Redis container
   └─ redis_data volume + appendonly yes
```

Day la phuong an can bang nhat cho he thong hien tai: du sach, du de update qua Git, tiet kiem chi phi, co HTTPS/WebSocket, co rollback, va khong bi thua ha tang trong giai doan demo ngan.
