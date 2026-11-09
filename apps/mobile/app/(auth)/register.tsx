import { useState } from "react";
import { Link, router } from "expo-router";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../../src/api";
import { useAuth } from "../../src/store";
import { colors, styles } from "../../src/theme";

export default function RegisterScreen() {
  const signIn = useAuth((state) => state.signIn);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
        <View style={{ width: "100%", maxWidth: 460, alignSelf: "center", gap: 22 }}>
          <View style={{ alignItems: "center", gap: 12 }}>
            <View style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: colors.darkOlive, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: colors.white, fontSize: 26, fontWeight: "700" }}>H</Text>
            </View>
            <Text style={{ color: colors.olive, fontSize: 12, fontWeight: "700", letterSpacing: 1.8 }}>HIDDEN PEAK DINING</Text>
          </View>

          <View style={{ gap: 7, alignItems: "center" }}>
            <Text style={[styles.title, { textAlign: "center" }]}>Make room for good work.</Text>
            <Text style={[styles.subtitle, { textAlign: "center" }]}>Create your account and join your restaurant workspace.</Text>
          </View>

          <View style={[styles.card, { padding: 22, gap: 16, shadowColor: colors.darkOlive, shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 }]}>
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>Full name</Text>
              <TextInput
                autoComplete="name"
                placeholder="Your name"
                placeholderTextColor="#9AA094"
                returnKeyType="next"
                value={fullName}
                onChangeText={setFullName}
                style={styles.input}
              />
            </View>
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>Email address</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="you@restaurant.com"
                placeholderTextColor="#9AA094"
                returnKeyType="next"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
              />
            </View>
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>Password</Text>
              <TextInput
                autoComplete="new-password"
                secureTextEntry
                placeholder="At least 10 characters"
                placeholderTextColor="#9AA094"
                returnKeyType="go"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={() => void submit()}
                style={styles.input}
              />
            </View>
            {!!error && (
              <View accessibilityRole="alert" style={{ padding: 12, borderRadius: 12, backgroundColor: "#F8E8E4" }}>
                <Text style={styles.error}>{error}</Text>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void submit()}
              style={[styles.button, { marginTop: 2, opacity: busy ? 0.75 : 1 }]}
            >
              {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Create account</Text>}
            </Pressable>
          </View>

          <Text style={[styles.subtitle, { textAlign: "center" }]}>
            Already have an account?{" "}
            <Link href="/(auth)/login" style={{ color: colors.olive, fontWeight: "700" }}>Sign in</Link>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
