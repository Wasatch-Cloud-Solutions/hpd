import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FlatList, KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import { api, connectTeamSocket } from "../../src/api";
import type { Message } from "../../src/types";
import { colors, styles } from "../../src/theme";

export default function TeamMessagesScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const messages = useQuery({ queryKey: ["messages", teamId], queryFn: () => api.messages(teamId) });

  useEffect(() => {
    const socket = connectTeamSocket();
    socket.emit("team.join", teamId);
    const onMessage = () => void queryClient.invalidateQueries({ queryKey: ["messages", teamId] });
    socket.on("message.created", onMessage);
    return () => {
      socket.emit("team.leave", teamId);
      socket.off("message.created", onMessage);
    };
  }, [teamId, queryClient]);

  async function send() {
    const content = draft.trim();
    if (!content) return;
    setError("");
    try {
      setDraft("");
      await api.sendMessage(teamId, content);
      await queryClient.invalidateQueries({ queryKey: ["messages", teamId] });
    } catch (reason) {
      setDraft(content);
      setError(reason instanceof Error ? reason.message : "Message could not be sent");
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <FlatList
        data={messages.data ?? []}
        inverted
        contentContainerStyle={styles.content}
        keyExtractor={(item) => item.id}
        refreshing={messages.isRefetching}
        onRefresh={() => void messages.refetch()}
        ListEmptyComponent={<Text style={styles.body}>No messages yet. Start the conversation.</Text>}
        renderItem={({ item }: { item: Message }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={[styles.cardTitle, { flex: 1 }]}>{item.sender.fullName}</Text>
              {item.messageType !== "GENERAL" && <Text style={{ color: colors.olive, fontWeight: "700" }}>{item.messageType.replace("_", " ")}</Text>}
            </View>
            <Text style={styles.body}>{item.content}</Text>
            <Text style={{ color: colors.secondary, fontSize: 11 }}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        )}
      />
      <View style={{ padding: 14, gap: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white }}>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.row}>
          <TextInput value={draft} onChangeText={setDraft} placeholder="Write a team update…" multiline style={[styles.input, { flex: 1, maxHeight: 100 }]} />
          <Text onPress={() => void send()} style={{ color: colors.olive, fontWeight: "700", padding: 10 }}>Send</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
