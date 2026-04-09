import React from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { AppHeader, CustomButton } from "@/components";
import { colors, spacing } from "@/constants";
import { useAppContext } from "@/context/AppContext";

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { logout } = useAppContext();

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Settings" leftAction={{ icon: "arrow-back", onPress: () => router.back() }} />
      <View style={styles.content}>
        <CustomButton title="Notification settings (mock)" variant="outline" onPress={() => {}} />
        <CustomButton title="Privacy settings (mock)" variant="outline" onPress={() => {}} style={styles.gap} />
        <CustomButton
          title="Logout"
          onPress={() => {
            logout();
            router.replace("/(auth)/login");
          }}
          style={styles.gap}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: {
    padding: spacing.lg,
  },
  gap: {
    marginTop: spacing.md,
  },
});
