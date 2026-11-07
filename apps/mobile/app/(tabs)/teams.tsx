import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text } from "react-native";
import { api } from "../../src/api";
import { styles } from "../../src/theme";

export default function TeamsScreen() {
  const teams = useQuery({ queryKey: ["teams"], queryFn: api.teams });
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Your teams</Text>
      <Text style={styles.subtitle}>Team updates and shared operations.</Text>
      {teams.isLoading && <Text style={styles.body}>Loading teams…</Text>}
      {teams.error && <Text style={styles.error}>{teams.error.message}</Text>}
      {teams.data?.map((team) => (
        <Link key={team.id} href={{ pathname: "/teams/[id]", params: { id: team.id } }} style={styles.card}>
          <Text style={styles.cardTitle}>{team.name}</Text>
          <Text style={styles.body}>{team.description || "No description"}</Text>
        </Link>
      ))}
      {!teams.isLoading && teams.data?.length === 0 && <Text style={styles.body}>You are not assigned to a team yet.</Text>}
    </ScrollView>
  );
}
