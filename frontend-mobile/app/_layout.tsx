import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../contexts/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="verify-otp" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="create-post"
          options={{
            headerShown: true,
            presentation: 'modal',
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
