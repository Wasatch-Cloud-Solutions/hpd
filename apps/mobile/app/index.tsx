import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { colors } from "../src/theme";
import { useAuth } from "../src/store";

export default function Index() {
  const { ready, signedIn } = useAuth();
  if (!ready) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}><ActivityIndicator color={colors.olive} /></View>;
  }
  return <Redirect href={signedIn ? "/(tabs)" : "/(auth)/login"} />;
}
