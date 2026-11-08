import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, TextInput, View } from "react-native";
import { api } from "../src/api";
import { colors, styles } from "../src/theme";

export default function EmployeesScreen() {
  const [search, setSearch] = useState("");
  const employees = useQuery({ queryKey: ["employees", search], queryFn: () => api.employees(search) });
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Employee directory</Text>
      <Text style={styles.subtitle}>People assigned to your teams.</Text>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search employees" style={styles.input} />
      {employees.error && <Text style={styles.error}>{employees.error.message}</Text>}
      {employees.data?.map((employee) => (
        <View key={employee.id} style={styles.card}>
          <Text style={styles.cardTitle}>{employee.fullName}</Text>
          <Text style={styles.body}>{employee.email}</Text>
          <Text style={{ color: colors.olive, fontSize: 12, fontWeight: "700" }}>
            {employee.role.replace("_", " ")} · {employee.accountStatus ?? "ACTIVE"}
          </Text>
          <Text style={styles.body}>{employee.memberships?.map((membership) => membership.team.name).join(" · ") || "No team assignments"}</Text>
        </View>
      ))}
      {!employees.isLoading && employees.data?.length === 0 && <Text style={styles.body}>No employees found.</Text>}
    </ScrollView>
  );
}
