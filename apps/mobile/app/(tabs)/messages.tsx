import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text } from "react-native";
import { api } from "../../src/api";
import { styles } from "../../src/theme";

export default function MessagesScreen() {
  const teams = useQuery({ queryKey: ["teams"], queryFn: api.teams });
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Message boards</Text>
      <Text style={styles.subtitle}>Choose a team to see the latest updates.</Text>
      {teams.isLoading && <Text style={styles.body}>Loading teams…</Text>}
      {teams.error && <Text style={styles.error}>{teams.error.message}</Text>}
      {teams.data?.map((team) => (
        <Link key={team.id} href={{ pathname: "/messages/[teamId]", params: { teamId: team.id } }} style={styles.card}>
          <Text style={styles.cardTitle}>{team.name}</Text>
          <Text style={styles.body}>{team.description || "Open team message board"} →</Text>
        </Link>
      ))}
    </ScrollView>
  );
}
