import { useLocalSearchParams, Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";
import { api } from "../../src/api";
import { styles } from "../../src/theme";

export default function TeamDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const teams = useQuery({ queryKey: ["teams"], queryFn: api.teams });
  const team = teams.data?.find((item) => item.id === id);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{team?.name ?? "Team"}</Text>
      <Text style={styles.subtitle}>{team?.description}</Text>
      <Link href={{ pathname: "/messages/[teamId]", params: { teamId: id } }} style={styles.button}>
        <Text style={styles.buttonText}>Open message board</Text>
      </Link>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Team inventory</Text>
        <Text style={styles.body}>Shared stock and counts for this team.</Text>
        <Link href={{ pathname: "/(tabs)/inventory", params: { teamId: id } }} style={{ color: "#596B3D", fontWeight: "700" }}>Browse inventory →</Link>
      </View>
    </ScrollView>
  );
}
