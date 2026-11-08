import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../src/api";
import { colors, styles } from "../../src/theme";

export default function TeamManagementScreen() {
  const cache = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [error, setError] = useState("");
  const teams = useQuery({ queryKey: ["teams"], queryFn: api.teams });
  const employees = useQuery({ queryKey: ["employees"], queryFn: () => api.employees() });
  const details = useQuery({
    queryKey: ["teams", selectedId],
    queryFn: () => api.team(selectedId),
    enabled: Boolean(selectedId),
  });
  const currentTeam = details.data;

  async function createTeam() {
    setError("");
    try {
      const team = await api.createTeam(newName, newDescription);
      setNewName("");
      setNewDescription("");
      setSelectedId(team.id);
      await cache.invalidateQueries({ queryKey: ["teams"] });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Team could not be created");
    }
  }

  async function updateTeam() {
    if (!currentTeam) return;
    setError("");
    try {
      await api.updateTeam(currentTeam.id, { name, description });
      await cache.invalidateQueries({ queryKey: ["teams"] });
      await cache.invalidateQueries({ queryKey: ["teams", currentTeam.id] });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Team could not be updated");
    }
  }

  async function assign(userId: string, membershipRole: "MEMBER" | "MANAGER") {
    if (!selectedId) return;
    setError("");
    try {
      await api.assignMember(selectedId, userId, membershipRole);
      await cache.invalidateQueries({ queryKey: ["teams", selectedId] });
      await cache.invalidateQueries({ queryKey: ["employees"] });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Assignment failed");
    }
  }

  async function remove(userId: string) {
    if (!selectedId) return;
    try {
      await api.removeMember(selectedId, userId);
      await cache.invalidateQueries({ queryKey: ["teams", selectedId] });
      await cache.invalidateQueries({ queryKey: ["employees"] });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Member could not be removed");
    }
  }

  function archiveSelected() {
    if (!currentTeam) return;
    Alert.alert("Archive team?", "Historical messages and inventory records will be preserved.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Archive",
        style: "destructive",
        onPress: () => void api.archiveTeam(currentTeam.id).then(async () => {
          setSelectedId("");
          await cache.invalidateQueries({ queryKey: ["teams"] });
        }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Team could not be archived")),
      },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Team management</Text>
      <Text style={styles.subtitle}>Create teams and maintain employee assignments.</Text>
      <Text style={styles.cardTitle}>Teams</Text>
      <View style={styles.row}>
        {teams.data?.map((team) => (
          <Text key={team.id} onPress={() => {
            setSelectedId(team.id);
            setName(team.name);
            setDescription(team.description);
          }} style={[styles.card, { color: selectedId === team.id ? colors.olive : colors.text }]}>
            {team.name}
          </Text>
        ))}
      </View>
      {currentTeam && <>
        <Text style={styles.cardTitle}>Edit {currentTeam.name}</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Team name" style={styles.input} />
        <TextInput value={description} onChangeText={setDescription} placeholder="Description" style={styles.input} />
        <View style={styles.button}><Text onPress={() => void updateTeam()} style={styles.buttonText}>Save changes</Text></View>
        <Text onPress={archiveSelected} style={{ color: colors.error, fontWeight: "700" }}>Archive this team</Text>
        <Text style={styles.cardTitle}>Assigned employees</Text>
        {currentTeam.memberships?.map((membership) => (
          <View key={membership.userId} style={[styles.card, styles.row]}>
            <Text style={[styles.body, { flex: 1 }]}>{membership.user?.fullName ?? membership.userId} · {membership.membershipRole}</Text>
            <Text onPress={() => void remove(membership.userId)} style={{ color: colors.error }}>Remove</Text>
          </View>
        ))}
        <Text style={styles.cardTitle}>Add a member</Text>
        {employees.data?.filter((employee) => !currentTeam.memberships?.some((member) => member.userId === employee.id)).map((employee) => (
          <Text key={employee.id} onPress={() => void assign(employee.id, employee.role === "MANAGER" ? "MANAGER" : "MEMBER")} style={styles.card}>
            <Text style={styles.cardTitle}>{employee.fullName}</Text>{"\n"}
            <Text style={styles.body}>{employee.email} · Tap to assign</Text>
          </Text>
        ))}
      </>}
      <Text style={styles.cardTitle}>Create team</Text>
      <TextInput value={newName} onChangeText={setNewName} placeholder="Team name" style={styles.input} />
      <TextInput value={newDescription} onChangeText={setNewDescription} placeholder="Description" style={styles.input} />
      <View style={styles.button}><Text onPress={() => void createTeam()} style={styles.buttonText}>Create team</Text></View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}
