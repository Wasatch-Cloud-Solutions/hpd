import { useEffect, useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, TextInput, View } from "react-native";
import { api, connectTeamSocket } from "../../src/api";
import { colors, styles } from "../../src/theme";

export default function InventoryScreen() {
  const params = useLocalSearchParams<{ teamId?: string }>();
  const [search, setSearch] = useState("");
  const inventory = useQuery({
    queryKey: ["inventory", search, params.teamId],
    queryFn: () => api.inventory(search),
  });
  useEffect(() => {
    if (!params.teamId) return;
    const socket = connectTeamSocket();
    socket.emit("team.join", params.teamId);
    return () => {
      socket.emit("team.leave", params.teamId);
    };
  }, [params.teamId]);
  const items = inventory.data?.filter((item) =>
    !params.teamId || item.teams.some((assignment) => assignment.teamId === params.teamId),
  ) ?? [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.row}>
        <Text style={[styles.title, { flex: 1 }]}>Inventory</Text>
        <Link href="/inventory/new" style={{ color: colors.olive, fontWeight: "700" }}>+ Add item</Link>
      </View>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search inventory" style={styles.input} />
      {inventory.isLoading && <Text style={styles.body}>Loading inventory…</Text>}
      {inventory.error && <Text style={styles.error}>{inventory.error.message}</Text>}
      {items.map((item) => {
        const low = item.quantity !== null && item.minimumStock !== null && Number(item.quantity) <= Number(item.minimumStock);
        return (
          <Link key={item.id} href={{ pathname: "/inventory/[id]", params: { id: item.id } }} style={styles.card}>
            <View style={styles.row}>
              <Text style={[styles.cardTitle, { flex: 1 }]}>{item.name}</Text>
              {low && <Text style={{ color: colors.error, fontWeight: "700" }}>LOW</Text>}
            </View>
            <Text style={styles.body}>{item.quantity === null ? "Not Counted" : `${item.quantity} ${item.unit}`}</Text>
            <Text style={{ color: colors.secondary, fontSize: 12 }}>{item.teams.map((assignment) => assignment.team.name).join(" · ")}</Text>
          </Link>
        );
      })}
      {!inventory.isLoading && items.length === 0 && <Text style={styles.body}>No inventory items found.</Text>}
    </ScrollView>
  );
}
