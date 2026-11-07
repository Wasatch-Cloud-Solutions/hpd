import { Prisma } from "@prisma/client";

export type NotificationCategory =
  | "messages"
  | "announcements"
  | "inventory"
  | "lowStock"
  | "teamMembership";

function isJsonObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function notificationAllowed(
  preferences: Prisma.JsonValue,
  category: NotificationCategory,
): boolean {
  if (!isJsonObject(preferences)) return true;
  const notificationPreferences = preferences.notifications;
  if (!notificationPreferences || !isJsonObject(notificationPreferences)) return true;
  return notificationPreferences[category] !== false;
}
