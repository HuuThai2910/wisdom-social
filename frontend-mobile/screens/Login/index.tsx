import React, { useMemo, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "@/constants";
import { useAppContext } from "@/context/AppContext";
import { validateEmail, validatePassword } from "@/utils/validators";
import { CustomButton, CustomInput } from "@/components";

export default function LoginScreen() {
  const router = useRouter();
  const { login, loadingAuth } = useAppContext();
  const [email, setEmail] = useState("jessie@example.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");

  const disabled = useMemo(() => !email || !password, [email, password]);

  const onSubmit = async () => {
    setError("");

    if (!validateEmail(email)) {
      setError("Email không hợp lệ.");
      return;
    }

    if (!validatePassword(password)) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    const result = await login(email, password);
    if (!result.success) {
      setError(result.message ?? "Đăng nhập thất bại.");
      return;
    }

    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.brand}>Instagram Clone</Text>
        <Text style={styles.subtitle}>Đăng nhập để tiếp tục</Text>

        <CustomInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <CustomInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <CustomButton
          title="Log In"
          onPress={onSubmit}
          loading={loadingAuth}
          disabled={disabled}
          style={styles.loginButton}
        />

        <Pressable onPress={() => router.push("/(auth)/signup")}>
          <Text style={styles.link}>Chưa có tài khoản? Sign up</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/(auth)/authorization")}>
          <Text style={styles.linkMuted}>Hoặc mở flow Authorization</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
  },
  brand: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
    color: colors.textMuted,
  },
  loginButton: {
    marginTop: spacing.sm,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  link: {
    marginTop: spacing.lg,
    textAlign: "center",
    color: colors.primary,
    fontWeight: "600",
  },
  linkMuted: {
    marginTop: spacing.md,
    textAlign: "center",
    color: colors.textMuted,
  },
});
