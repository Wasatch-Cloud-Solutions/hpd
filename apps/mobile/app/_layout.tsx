import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { api, connectTeamSocket } from "../src/api";
import { useAuth } from "../src/store";
import { colors } from "../src/theme";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function RealtimeBridge() {
  const signedIn = useAuth((state) => state.signedIn);
  const cache = useQueryClient();
  useEffect(() => {
    if (!signedIn) return;
    const socket = connectTeamSocket();
    const refreshNotifications = () => void cache.invalidateQueries({ queryKey: ["notifications"] });
    const refreshInventory = () => void cache.invalidateQueries({ queryKey: ["inventory"] });
    socket.on("notification.created", refreshNotifications);
    socket.on("inventory.updated", refreshInventory);
    void api.teams().then((teams) => {
      teams.forEach((team) => socket.emit("team.join", team.id));
    }).catch(() => undefined);
    return () => {
      socket.off("notification.created", refreshNotifications);
      socket.off("inventory.updated", refreshInventory);
    };
  }, [signedIn, cache]);
  return null;
}

export default function RootLayout() {
  const hydrate = useAuth((state) => state.hydrate);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeBridge />
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerTintColor: colors.darkOlive }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="teams/[id]" options={{ title: "Team" }} />
        <Stack.Screen name="messages/[teamId]" options={{ title: "Team messages" }} />
        <Stack.Screen name="inventory/new" options={{ title: "Add inventory item", presentation: "modal" }} />
        <Stack.Screen name="inventory/[id]" options={{ title: "Inventory item" }} />
        <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      </Stack>
    </QueryClientProvider>
  );
}
