import { useState } from "react";
import { Link, router } from "expo-router";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import { api } from "../../src/api";
import { useAuth } from "../../src/store";
import { colors, styles } from "../../src/theme";

export default function LoginScreen() {
  const signIn = useAuth((state) => state.signIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const result = await api.login(email, password);
      await signIn(result.user, result.accessToken, result.refreshToken);
      router.replace("/(tabs)");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.screen, { justifyContent: "center", padding: 24 }]}>
      <View style={{ gap: 18 }}>
        <View style={{ gap: 6, marginBottom: 12 }}>
          <Text style={{ color: colors.olive, fontWeight: "700", fontSize: 13, letterSpacing: 1.4 }}>HIDDEN PEAK DINING</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your restaurant workspace.</Text>
        </View>
        <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="Email address" value={email} onChangeText={setEmail} style={styles.input} />
        <TextInput secureTextEntry placeholder="Password" value={password} onChangeText={setPassword} style={styles.input} />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.button}>
          {busy ? <ActivityIndicator color={colors.white} /> : <Text onPress={() => void submit()} style={styles.buttonText}>Sign in</Text>}
        </View>
        <Text style={[styles.subtitle, { textAlign: "center" }]}>New to Hidden Peak? <Link href="/(auth)/register" style={{ color: colors.olive, fontWeight: "700" }}>Create account</Link></Text>
      </View>
    </KeyboardAvoidingView>
  );
}
