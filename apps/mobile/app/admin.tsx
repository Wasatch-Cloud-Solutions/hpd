import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";
import { api } from "../src/api";
import { colors, styles } from "../src/theme";
import { useAuth } from "../src/store";

export default function AdministratorScreen() {
  const currentUser = useAuth((state) => state.user);
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const users = useQuery({ queryKey: ["employees"], queryFn: () => api.employees() });

  async function changeRole(id: string, role: "EMPLOYEE" | "MANAGER" | "ADMINISTRATOR") {
    try {
      await api.updateUserRole(id, role);
      await cache.invalidateQueries({ queryKey: ["employees"] });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Role could not be changed");
    }
  }

  async function toggleStatus(id: string, status: "ACTIVE" | "DEACTIVATED") {
    try {
      await api.updateAccountStatus(id, status);
      await cache.invalidateQueries({ queryKey: ["employees"] });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Account status could not be updated");
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Administrator</Text>
      <Text style={styles.subtitle}>Manage application accounts and roles.</Text>
      {users.error && <Text style={styles.error}>{users.error.message}</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {users.data?.map((user) => (
        <View key={user.id} style={styles.card}>
          <Text style={styles.cardTitle}>{user.fullName}</Text>
          <Text style={styles.body}>{user.email} · {user.role}</Text>
          <Text style={{ color: user.accountStatus === "ACTIVE" ? colors.success : colors.error }}>{user.accountStatus}</Text>
          <View style={styles.row}>
            <Text onPress={() => void changeRole(user.id, "EMPLOYEE")} style={styles.body}>Employee</Text>
            <Text onPress={() => void changeRole(user.id, "MANAGER")} style={styles.body}>Manager</Text>
            <Text onPress={() => void changeRole(user.id, "ADMINISTRATOR")} style={styles.body}>Admin</Text>
          </View>
          {user.id !== currentUser?.id && (
            <Text onPress={() => void toggleStatus(user.id, user.accountStatus === "ACTIVE" ? "DEACTIVATED" : "ACTIVE")} style={{ color: colors.error }}>
              {user.accountStatus === "ACTIVE" ? "Deactivate account" : "Reactivate account"}
            </Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}
