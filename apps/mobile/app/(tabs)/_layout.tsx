import { Tabs } from "expo-router";
import { colors } from "../../src/theme";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: colors.background },
      headerShadowVisible: false,
      headerTintColor: colors.darkOlive,
      tabBarActiveTintColor: colors.olive,
      tabBarInactiveTintColor: colors.secondary,
      tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border },
    }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarLabel: "Home" }} />
      <Tabs.Screen name="messages" options={{ title: "Messages", tabBarLabel: "Messages" }} />
      <Tabs.Screen name="inventory" options={{ title: "Inventory", tabBarLabel: "Inventory" }} />
      <Tabs.Screen name="teams" options={{ title: "Teams", tabBarLabel: "Teams" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarLabel: "Profile" }} />
    </Tabs>
  );
}
