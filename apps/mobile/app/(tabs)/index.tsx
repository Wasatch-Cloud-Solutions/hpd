import { useState } from "react";
import { Link } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { api } from "../../src/api";
import { useAuth } from "../../src/store";
import { colors, styles } from "../../src/theme";

const quickActions = [
  { label: "Messages", detail: "Team boards", href: "/(tabs)/messages", icon: "✉", tone: colors.paleAccent },
  { label: "Inventory", detail: "Stock levels", href: "/(tabs)/inventory", icon: "▤", tone: colors.lightOlive },
  { label: "Teams", detail: "Your people", href: "/(tabs)/teams", icon: "♧", tone: "#E9EEF4" },
] as const;

export default function HomeScreen() {
  const user = useAuth((state) => state.user);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const teams = useQuery({ queryKey: ["teams"], queryFn: api.teams });
  const employees = useQuery({
    queryKey: ["employees"],
    queryFn: () => api.employees(),
    enabled: user?.role === "MANAGER" || user?.role === "ADMINISTRATOR",
  });
  const inventory = useQuery({ queryKey: ["inventory"], queryFn: () => api.inventory() });
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: api.notifications });
  const lowStock = inventory.data?.filter((item) =>
    item.quantity !== null &&
    item.minimumStock !== null &&
    Number(item.quantity) <= Number(item.minimumStock),
  ) ?? [];
  const unreadCount = notifications.data?.filter((item) => !item.isRead).length ?? 0;
  const firstName = user?.fullName?.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  async function refreshDashboard() {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["teams"] }),
        queryClient.invalidateQueries({ queryKey: ["employees"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  const stats = [
    { value: teams.data?.length ?? "—", label: "Your teams", tone: colors.lightOlive, icon: "♧" },
    { value: unreadCount, label: "New updates", tone: colors.paleAccent, icon: "✦" },
    { value: lowStock.length, label: "Stock alerts", tone: "#F8E8E4", icon: "!" },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { width: "100%", maxWidth: 920, alignSelf: "center", paddingBottom: 36 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void refreshDashboard()} tintColor={colors.olive} />
      }
    >
      <View style={{ gap: 5, marginTop: 6 }}>
        <Text style={{ color: colors.secondary, fontSize: 13, fontWeight: "700", letterSpacing: 1.1 }}>
          {today.toUpperCase()}
        </Text>
        <Text style={styles.title}>{greeting}{firstName ? `, ${firstName}` : ""}.</Text>
        <Text style={styles.subtitle}>Here’s what’s happening across your workspace.</Text>
      </View>

      <View style={{
        padding: 23,
        minHeight: 178,
        justifyContent: "space-between",
        overflow: "hidden",
        borderRadius: 24,
        backgroundColor: colors.darkOlive,
      }}>
        <View style={{ position: "absolute", right: -25, top: -50, width: 190, height: 190, borderRadius: 100, backgroundColor: "#FFFFFF", opacity: 0.06 }} />
        <View style={{ position: "absolute", right: 68, bottom: -74, width: 150, height: 150, borderRadius: 100, backgroundColor: colors.accent, opacity: 0.28 }} />
        <View style={{ gap: 8 }}>
          <Text style={{ color: "#DCE5D2", fontSize: 12, fontWeight: "700", letterSpacing: 1.4 }}>HIDDEN PEAK DINING</Text>
          <Text style={{ color: colors.white, fontSize: 23, fontWeight: "700", maxWidth: 300, lineHeight: 30 }}>
            A smoother shift starts here.
          </Text>
          <Text style={{ color: "#E1E7DB", fontSize: 14, lineHeight: 21, maxWidth: 340 }}>
            Keep your people, messages, and operations moving together.
          </Text>
        </View>
        <Link href="/notifications" asChild>
          <Pressable accessibilityRole="button" style={{ alignSelf: "flex-start", marginTop: 20, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: colors.darkOlive, fontWeight: "700", fontSize: 13 }}>
              {unreadCount ? `${unreadCount} updates to review` : "View your updates"}
            </Text>
            <Text style={{ color: colors.darkOlive, fontWeight: "700" }}>→</Text>
          </Pressable>
        </Link>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        {stats.map((stat) => (
          <View key={stat.label} style={{ flex: 1, minWidth: 0, padding: 14, gap: 10, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: stat.tone }}>
              <Text style={{ color: colors.darkOlive, fontSize: 16, fontWeight: "700" }}>{stat.icon}</Text>
            </View>
            <Text style={{ color: colors.text, fontSize: 23, fontWeight: "700" }}>{stat.value}</Text>
            <Text style={{ color: colors.secondary, fontSize: 11, fontWeight: "600" }}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 12 }}>
        <Text style={styles.cardTitle}>Jump back in</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href} asChild>
              <Pressable accessibilityRole="button" style={{ flex: 1, minWidth: 0, padding: 14, borderRadius: 18, backgroundColor: action.tone }}>
                <Text style={{ color: colors.darkOlive, fontSize: 19, marginBottom: 9 }}>{action.icon}</Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>{action.label}</Text>
                <Text style={{ color: colors.secondary, fontSize: 11, marginTop: 3 }}>{action.detail}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <View style={styles.row}>
          <Text style={[styles.cardTitle, { flex: 1 }]}>Your teams</Text>
          <Link href="/(tabs)/teams" style={{ color: colors.olive, fontWeight: "700" }}>See all →</Link>
        </View>
        {teams.isLoading && <Text style={styles.body}>Loading your teams…</Text>}
        {teams.error && <Text style={styles.error}>{teams.error.message}</Text>}
        {teams.data?.slice(0, 3).map((team, index) => (
          <Link key={team.id} href={{ pathname: "/teams/[id]", params: { id: team.id } }} asChild>
            <Pressable accessibilityRole="button" style={[styles.card, { flexDirection: "row", alignItems: "center" }]}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: index % 2 ? colors.paleAccent : colors.lightOlive, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: colors.darkOlive, fontWeight: "700", fontSize: 16 }}>{team.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.cardTitle}>{team.name}</Text>
                <Text style={styles.body} numberOfLines={1}>{team.description || "Team updates and operations"}</Text>
              </View>
              <Text style={{ color: colors.olive, fontSize: 20 }}>›</Text>
            </Pressable>
          </Link>
        ))}
        {!teams.isLoading && !teams.error && teams.data?.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your team will show up here</Text>
            <Text style={styles.body}>Once you’ve been added to a team, you can jump into its updates from this dashboard.</Text>
          </View>
        )}
      </View>

      {(user?.role === "MANAGER" || user?.role === "ADMINISTRATOR") && (
        <View style={{ gap: 12 }}>
          <Text style={styles.cardTitle}>Operations overview</Text>
          <View style={[styles.card, { flexDirection: "row", alignItems: "center" }]}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.body}>People on your roster</Text>
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: "700" }}>
                {employees.data?.length ?? (employees.isLoading ? "…" : "—")}
              </Text>
            </View>
            <View style={{ width: 1, height: 42, backgroundColor: colors.border, marginHorizontal: 16 }} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.body}>Items to restock</Text>
              <Text style={{ color: lowStock.length ? colors.error : colors.success, fontSize: 24, fontWeight: "700" }}>
                {lowStock.length}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={{ gap: 12 }}>
        <View style={styles.row}>
          <Text style={[styles.cardTitle, { flex: 1 }]}>Needs a closer look</Text>
          <Link href="/(tabs)/inventory" style={{ color: colors.olive, fontWeight: "700" }}>Inventory →</Link>
        </View>
        {inventory.error && <Text style={styles.error}>{inventory.error.message}</Text>}
        {lowStock.length === 0 && !inventory.error ? (
          <View style={{ padding: 17, borderRadius: 18, backgroundColor: colors.lightOlive, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={{ color: colors.darkOlive, fontSize: 20 }}>✓</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.darkOlive, fontWeight: "700" }}>All clear</Text>
              <Text style={{ color: colors.secondary, fontSize: 13, marginTop: 2 }}>No low-stock items need attention.</Text>
            </View>
          </View>
        ) : lowStock.slice(0, 4).map((item) => (
          <Link key={item.id} href={{ pathname: "/inventory/[id]", params: { id: item.id } }} asChild>
            <Pressable accessibilityRole="button" style={[styles.card, { borderLeftWidth: 4, borderLeftColor: colors.error }]}>
              <View style={styles.row}>
                <Text style={[styles.cardTitle, { flex: 1 }]}>{item.name}</Text>
                <Text style={{ color: colors.error, fontSize: 11, fontWeight: "700" }}>RESTOCK</Text>
              </View>
              <Text style={styles.body}>{item.quantity} {item.unit} remaining · minimum {item.minimumStock}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}
