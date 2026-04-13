import React, { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "@/constants";
import { CustomButton, CustomInput } from "@/components";
import { useAppContext } from "@/context/AppContext";
import { validateEmail, validatePassword, validateRequired } from "@/utils/validators";

export default function SignUpScreen() {
  const router = useRouter();
  const { signup, loadingAuth } = useAppContext();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async () => {
    setError("");

    if (!validateRequired(fullName) || !validateRequired(username)) {
      setError("Vui lòng nhập họ tên và username.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Email không hợp lệ.");
      return;
    }

    if (!validatePassword(password)) {
      setError("Mật khẩu tối thiểu 6 ký tự.");
      return;
    }

    const result = await signup({
      fullName,
      username,
      email,
      password,
    });

    if (!result.success) {
      setError(result.message ?? "Đăng ký thất bại.");
      return;
    }

    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Bắt đầu tạo tài khoản mới</Text>

        <CustomInput label="Full name" value={fullName} onChangeText={setFullName} />
        <CustomInput
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <CustomInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <CustomInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <CustomButton title="Sign Up" onPress={onSubmit} loading={loadingAuth} />

        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Đã có tài khoản? Log in</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
  },
  title: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    textAlign: "center",
    color: colors.textMuted,
  },
  error: {
    marginBottom: spacing.sm,
    color: colors.danger,
  },
  link: {
    marginTop: spacing.lg,
    textAlign: "center",
    color: colors.primary,
    fontWeight: "600",
  },
});
