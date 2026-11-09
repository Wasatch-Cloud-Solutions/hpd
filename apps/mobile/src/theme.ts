import { StyleSheet } from "react-native";

export const colors = {
  olive: "#627447",
  darkOlive: "#293A2C",
  lightOlive: "#E9EEDD",
  background: "#F5F6F0",
  white: "#FFFFFF",
  text: "#20291F",
  secondary: "#737B6E",
  border: "#E3E7DC",
  accent: "#D98C62",
  paleAccent: "#F8EDE5",
  error: "#B94E43",
  success: "#43865A",
};

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 22, gap: 16 },
  title: { color: colors.text, fontSize: 30, fontWeight: "700", letterSpacing: -0.7 },
  subtitle: { color: colors.secondary, fontSize: 15, lineHeight: 22 },
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  body: { color: colors.secondary, fontSize: 14, lineHeight: 20 },
  input: {
    minHeight: 54,
    paddingHorizontal: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    backgroundColor: colors.white,
    fontSize: 15,
  },
  button: {
    minHeight: 54,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: colors.olive,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  error: { color: colors.error },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
});
