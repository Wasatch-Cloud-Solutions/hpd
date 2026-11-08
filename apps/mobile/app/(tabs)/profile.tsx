import { useEffect } from "react";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Alert, Text, View } from "react-native";
import { api } from "../../src/api";
import { useAuth } from "../../src/store";
import { styles } from "../../src/theme";

export default function ProfileScreen() {
  const signOut = useAuth((state) => state.signOut);
  const user = useAuth((state) => state.user);
  const profile = useQuery({ queryKey: ["profile"], queryFn: api.me });

  useEffect(() => {
    if (profile.data && !user) useAuth.setState({ user: profile.data });
  }, [profile.data, user]);

  async function logout() {
    const serverRevoked = await api.logout();
    await signOut();
    router.replace("/(auth)/login");
    if (!serverRevoked) {
      Alert.alert("Signed out on this device", "The server could not revoke the session. It will expire automatically.");
    }
  }

  const currentUser = profile.data ?? user;
  return (
    <View style={[styles.screen, styles.content]}>
      <Text style={styles.title}>Your profile</Text>
      {profile.error && <Text style={styles.error}>{profile.error.message}</Text>}
      {currentUser && <>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{currentUser.fullName}</Text>
          <Text style={styles.body}>{currentUser.email}</Text>
          <Text style={styles.body}>{currentUser.role.replace("_", " ")}</Text>
        </View>
        <Text onPress={() => router.push("/notifications")} style={styles.cardTitle}>Notifications →</Text>
        {(currentUser.role === "MANAGER" || currentUser.role === "ADMINISTRATOR") && <>
          <Text onPress={() => router.push("/employees")} style={styles.cardTitle}>Employee directory →</Text>
          <Text onPress={() => router.push("/teams/manage")} style={styles.cardTitle}>Team management →</Text>
        </>}
        {currentUser.role === "ADMINISTRATOR" && (
          <Text onPress={() => router.push("/admin")} style={styles.cardTitle}>Administrator tools →</Text>
        )}
      </>}
      <View style={styles.button}><Text onPress={() => void logout()} style={styles.buttonText}>Sign out</Text></View>
    </View>
  );
}
