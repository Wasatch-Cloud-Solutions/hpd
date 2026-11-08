import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../../src/api";
import { colors, styles } from "../../src/theme";

export default function InventoryItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [adjustment, setAdjustment] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const itemQuery = useQuery({
    queryKey: ["inventory", "item", id],
    queryFn: () => api.inventoryItem(id),
  });
  const history = useQuery({
    queryKey: ["inventory", id, "history"],
    queryFn: () => api.inventoryHistory(id),
  });
  const item = itemQuery.data;
  const teamId = item?.teams[0]?.teamId;

  async function updateQuantity(value: number, exact = false, note?: string): Promise<boolean> {
    if (!item || !teamId) return false;
    setError("");
    try {
      if (exact || item.quantity === null) await api.setQuantity(item.id, teamId, value, note);
      else await api.adjustInventory(item.id, teamId, value, note);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory", "item", id] }),
        queryClient.invalidateQueries({ queryKey: ["inventory", id, "history"] }),
      ]);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Quantity update failed");
      return false;
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {itemQuery.isLoading && <Text style={styles.body}>Loading item…</Text>}
      {itemQuery.error && <Text style={styles.error}>{itemQuery.error.message}</Text>}
      {item && <>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.subtitle}>{item.teams.map((assignment) => assignment.team.name).join(" · ")}</Text>
        <View style={styles.card}>
          <Text style={styles.subtitle}>CURRENT QUANTITY</Text>
          <Text style={{ color: colors.text, fontSize: 32, fontWeight: "700" }}>
            {item.quantity === null ? "Not Counted" : `${item.quantity} ${item.unit}`}
          </Text>
        </View>
        {item.quantity === null
          ? <Text style={styles.body}>Record an initial count to begin tracking this item.</Text>
          : <View style={styles.row}>
            {[1, 5, 10].map((step) => <View key={step} style={[styles.button, { flex: 1 }]}>
              <Text onPress={() => void updateQuantity(step)} style={styles.buttonText}>+{step}</Text>
            </View>)}
          </View>}
        <View style={styles.row}>
          <View style={[styles.button, { flex: 1, backgroundColor: colors.darkOlive }]}>
            <Text onPress={() => void updateQuantity(-1)} style={styles.buttonText}>−1</Text>
          </View>
          <View style={[styles.button, { flex: 1 }]}>
            <Text onPress={() => void updateQuantity(1)} style={styles.buttonText}>+1</Text>
          </View>
        </View>
        <View style={styles.row}>
          <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Exact quantity" style={[styles.input, { flex: 1 }]} />
          <Text onPress={() => {
            const value = Number(amount);
            if (amount.trim() && Number.isFinite(value) && value >= 0) void updateQuantity(value, true, notes);
            else setError("Enter a quantity of zero or more.");
          }} style={{ color: colors.olive, fontWeight: "700", padding: 10 }}>Set</Text>
        </View>
        <TextInput value={adjustment} onChangeText={setAdjustment} keyboardType="decimal-pad" placeholder="Adjustment amount (use − to remove)" style={styles.input} />
        <TextInput value={notes} onChangeText={setNotes} placeholder="Optional adjustment note" style={styles.input} />
        <View style={styles.button}>
          <Text onPress={() => {
            const value = Number(adjustment);
            if (adjustment.trim() && Number.isFinite(value) && value !== 0) {
              void updateQuantity(value, false, notes).then((success) => {
                if (success) setAdjustment("");
              });
            } else {
              setError("Enter a non-zero adjustment amount.");
            }
          }} style={styles.buttonText}>Apply adjustment</Text>
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Text style={styles.cardTitle}>Recent activity</Text>
        {history.data?.map((transaction) => (
          <View key={transaction.id} style={styles.card}>
            <Text style={styles.cardTitle}>{transaction.transactionType.replace("_", " ")}</Text>
            <Text style={styles.body}>{transaction.previousQuantity ?? "Not Counted"} → {transaction.newQuantity ?? "Not Counted"} {item.unit} · {transaction.user.fullName}</Text>
            <Text style={{ color: colors.secondary, fontSize: 11 }}>{new Date(transaction.createdAt).toLocaleString()}</Text>
          </View>
        ))}
        {history.error && <Text style={styles.error}>{history.error.message}</Text>}
      </>}
    </ScrollView>
  );
}
