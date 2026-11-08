import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollView, Switch, Text, View } from "react-native";
import { useState } from "react";
import { api } from "../src/api";
import { colors, styles } from "../src/theme";

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: api.notifications });
  const profile = useQuery({ queryKey: ["profile"], queryFn: api.me });
  const preferences = profile.data?.preferences ?? {};
  const rawNotifications = preferences.notifications;
  const notificationPreferences =
    rawNotifications && typeof rawNotifications === "object" && !Array.isArray(rawNotifications)
      ? rawNotifications as Record<string, unknown>
      : {};

  async function togglePreference(category: string) {
    setError("");
    try {
      const updated = await api.updateProfile({
        preferences: {
          ...preferences,
          notifications: {
            ...notificationPreferences,
            [category]: notificationPreferences[category] === false,
          },
        },
      });
      queryClient.setQueryData(["profile"], updated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Preference could not be saved");
    }
  }
  async function markAllRead() {
    setError("");
    try {
      await api.markAllRead();
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Notifications could not be updated");
    }
  }
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Notifications</Text>
      <Text onPress={() => void markAllRead()} style={{ color: colors.olive, fontWeight: "700" }}>Mark all read</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notification preferences</Text>
        {[
          ["messages", "Team messages"],
          ["announcements", "Announcements"],
          ["inventory", "Inventory changes"],
          ["lowStock", "Low-stock alerts"],
          ["teamMembership", "Team assignments"],
        ].map(([category, label]) => (
          <View key={category} style={styles.row}>
            <Text style={[styles.body, { flex: 1 }]}>{label}</Text>
            <Switch
              value={notificationPreferences[category] !== false}
              onValueChange={() => void togglePreference(category)}
              trackColor={{ true: colors.olive }}
            />
          </View>
        ))}
      </View>
      {notifications.error && <Text style={styles.error}>{notifications.error.message}</Text>}
      {notifications.data?.map((notification) => (
        <Text key={notification.id} style={[styles.card, { color: colors.text, opacity: notification.isRead ? 0.65 : 1 }]}>
          <Text style={styles.cardTitle}>{notification.title}{"\n"}</Text>
          <Text style={styles.body}>{notification.body}{"\n"}</Text>
          <Text style={{ color: colors.secondary, fontSize: 11 }}>{new Date(notification.createdAt).toLocaleString()}</Text>
        </Text>
      ))}
      {!notifications.isLoading && notifications.data?.length === 0 && <Text style={styles.body}>You're all caught up.</Text>}
    </ScrollView>
  );
}
