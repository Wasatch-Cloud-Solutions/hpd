import { useState } from "react";
import { router } from "expo-router";
import { ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../../src/api";
import { useAuth } from "../../src/store";
import { styles } from "../../src/theme";

export default function RegisterScreen() {
  const signIn = useAuth((state) => state.signIn);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const result = await api.register(fullName, email, password);
      await signIn(result.user, result.accessToken, result.refreshToken);
      router.replace("/(tabs)");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.content, { flexGrow: 1, justifyContent: "center" }]}>
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Join your Hidden Peak team.</Text>
      <TextInput placeholder="Full name" value={fullName} onChangeText={setFullName} style={styles.input} />
      <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="Email address" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput secureTextEntry placeholder="Password (10+ characters)" value={password} onChangeText={setPassword} style={styles.input} />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.button}><Text onPress={() => !busy && void submit()} style={styles.buttonText}>{busy ? "Creating account…" : "Create account"}</Text></View>
    </ScrollView>
  );
}
