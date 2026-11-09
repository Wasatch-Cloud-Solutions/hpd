import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "../../src/theme";

const tabIcons: Record<string, string> = {
  index: "⌂",
  messages: "✉",
  inventory: "▤",
  teams: "♧",
  profile: "◉",
};

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: colors.background },
      headerShadowVisible: false,
      headerTintColor: colors.darkOlive,
      tabBarActiveTintColor: colors.olive,
      tabBarInactiveTintColor: colors.secondary,
      tabBarStyle: {
        height: 72,
        paddingTop: 8,
        paddingBottom: 8,
        backgroundColor: colors.white,
        borderTopColor: colors.border,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
    }}>
      <Tabs.Screen name="index" options={{
        title: "Home",
        tabBarLabel: "Home",
        tabBarIcon: ({ color, focused }) => <Text style={{ color, fontSize: focused ? 23 : 21, fontWeight: "700" }}>{tabIcons.index}</Text>,
      }} />
      <Tabs.Screen name="messages" options={{
        title: "Messages",
        tabBarLabel: "Messages",
        tabBarIcon: ({ color, focused }) => <Text style={{ color, fontSize: focused ? 23 : 21, fontWeight: "700" }}>{tabIcons.messages}</Text>,
      }} />
      <Tabs.Screen name="inventory" options={{
        title: "Inventory",
        tabBarLabel: "Inventory",
        tabBarIcon: ({ color, focused }) => <Text style={{ color, fontSize: focused ? 23 : 21, fontWeight: "700" }}>{tabIcons.inventory}</Text>,
      }} />
      <Tabs.Screen name="teams" options={{
        title: "Teams",
        tabBarLabel: "Teams",
        tabBarIcon: ({ color, focused }) => <Text style={{ color, fontSize: focused ? 23 : 21, fontWeight: "700" }}>{tabIcons.teams}</Text>,
      }} />
      <Tabs.Screen name="profile" options={{
        title: "Profile",
        tabBarLabel: "Profile",
        tabBarIcon: ({ color, focused }) => <Text style={{ color, fontSize: focused ? 23 : 21, fontWeight: "700" }}>{tabIcons.profile}</Text>,
      }} />
    </Tabs>
  );
}
