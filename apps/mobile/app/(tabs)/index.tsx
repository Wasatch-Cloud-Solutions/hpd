import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";
import { api } from "../../src/api";
import { useAuth } from "../../src/store";
import { colors, styles } from "../../src/theme";

export default function HomeScreen() {
  const user = useAuth((state) => state.user);
  const teams = useQuery({ queryKey: ["teams"], queryFn: api.teams });
  const inventory = useQuery({ queryKey: ["inventory"], queryFn: () => api.inventory() });
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: api.notifications });
  const lowStock = inventory.data?.filter((item) =>
    item.quantity !== null &&
    item.minimumStock !== null &&
    Number(item.quantity) <= Number(item.minimumStock),
  ) ?? [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={{ gap: 4 }}>
        <Text style={styles.subtitle}>GOOD DAY</Text>
        <Text style={styles.title}>Welcome{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}</Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.lightOlive, borderColor: colors.lightOlive }]}>
        <Text style={styles.cardTitle}>Your shift at a glance</Text>
        <Text style={styles.body}>{teams.data?.length ?? 0} teams · {notifications.data?.filter((item) => !item.isRead).length ?? 0} unread notifications</Text>
        <Link href="/notifications" style={{ color: colors.darkOlive, fontWeight: "700" }}>View notifications →</Link>
      </View>
      <View style={styles.row}>
        <Text style={[styles.cardTitle, { flex: 1 }]}>Your teams</Text>
        <Link href="/(tabs)/teams" style={{ color: colors.olive }}>See all</Link>
      </View>
      {teams.isLoading && <Text style={styles.body}>Loading teams…</Text>}
      {teams.error && <Text style={styles.error}>{teams.error.message}</Text>}
      {teams.data?.map((team) => (
        <Link key={team.id} href={{ pathname: "/teams/[id]", params: { id: team.id } }} style={styles.card}>
          <Text style={styles.cardTitle}>{team.name}</Text>
          <Text style={styles.body}>{team.description || "Team updates and operations"}</Text>
        </Link>
      ))}
      <View style={styles.row}>
        <Text style={[styles.cardTitle, { flex: 1 }]}>Inventory alerts</Text>
        <Link href="/(tabs)/inventory" style={{ color: colors.olive }}>Open inventory</Link>
      </View>
      {lowStock.length === 0
        ? <Text style={styles.body}>No low-stock items right now.</Text>
        : lowStock.slice(0, 4).map((item) => (
          <Link key={item.id} href={{ pathname: "/inventory/[id]", params: { id: item.id } }} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: colors.error }]}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.body}>{item.quantity} {item.unit} remaining · minimum {item.minimumStock}</Text>
          </Link>
        ))}
    </ScrollView>
  );
}
