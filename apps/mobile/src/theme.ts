import { StyleSheet } from "react-native";

export const colors = {
  olive: "#596B3D",
  darkOlive: "#35452B",
  lightOlive: "#E8EDDF",
  background: "#F8F9F5",
  white: "#FFFFFF",
  text: "#20251D",
  secondary: "#73796D",
  border: "#E4E8DF",
  error: "#C74747",
  success: "#43865A",
};

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 14 },
  title: { color: colors.text, fontSize: 28, fontWeight: "700" },
  subtitle: { color: colors.secondary, fontSize: 15 },
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 7,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "600" },
  body: { color: colors.secondary, fontSize: 14, lineHeight: 20 },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    backgroundColor: colors.white,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: colors.olive,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  error: { color: colors.error },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
});
