import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollView, Text } from "react-native";
import { api } from "../src/api";
import { colors, styles } from "../src/theme";

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: api.notifications });
  async function markAllRead() {
    await api.markAllRead();
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Notifications</Text>
      <Text onPress={() => void markAllRead()} style={{ color: colors.olive, fontWeight: "700" }}>Mark all read</Text>
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
