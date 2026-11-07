import { useState } from "react";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../../src/api";
import { colors, styles } from "../../src/theme";

export default function NewInventoryItemScreen() {
  const queryClient = useQueryClient();
  const teams = useQuery({ queryKey: ["teams"], queryFn: api.teams });
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("Each");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState("");

  async function save() {
    setError("");
    try {
      await api.createInventory({
        name,
        unit,
        teamIds: selected,
        ...(quantity.trim() ? { quantity: Number(quantity) } : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      router.back();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Item could not be created");
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Add inventory item</Text>
      <TextInput placeholder="Item name" value={name} onChangeText={setName} style={styles.input} />
      <TextInput placeholder="Unit (Each, Cases, Pounds…)" value={unit} onChangeText={setUnit} style={styles.input} />
      <TextInput keyboardType="decimal-pad" placeholder="Starting quantity (optional)" value={quantity} onChangeText={setQuantity} style={styles.input} />
      <Text style={styles.subtitle}>No starting count? Leave quantity blank to show “Not Counted”.</Text>
      <Text style={styles.cardTitle}>Assign to teams</Text>
      {teams.data?.map((team) => {
        const active = selected.includes(team.id);
        return (
          <Text key={team.id} onPress={() => setSelected(active ? selected.filter((id) => id !== team.id) : [...selected, team.id])}
            style={[styles.card, { color: active ? colors.darkOlive : colors.text, borderColor: active ? colors.olive : colors.border }]}>
            {active ? "✓ " : ""}{team.name}
          </Text>
        );
      })}
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.button}><Text onPress={() => void save()} style={styles.buttonText}>Save item</Text></View>
    </ScrollView>
  );
}
