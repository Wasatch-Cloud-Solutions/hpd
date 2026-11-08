import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { io, Socket } from "socket.io-client";
import type { InventoryItem, Message, Notification, Team, User } from "./types";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";
const ACCESS_KEY = "hidden-peak-access-token";
const REFRESH_KEY = "hidden-peak-refresh-token";
const tokenStorage = Platform.OS === "web"
  ? {
      getItem: async (key: string) => globalThis.sessionStorage.getItem(key),
      setItem: async (key: string, value: string) => globalThis.sessionStorage.setItem(key, value),
      deleteItem: async (key: string) => globalThis.sessionStorage.removeItem(key),
    }
  : {
      getItem: SecureStore.getItemAsync,
      setItem: SecureStore.setItemAsync,
      deleteItem: SecureStore.deleteItemAsync,
    };
let accessToken: string | null = null;
let refreshToken: string | null = null;
let socket: Socket | null = null;
let refreshRequest: Promise<boolean> | null = null;

export async function restoreTokens(): Promise<boolean> {
  [accessToken, refreshToken] = await Promise.all([
    tokenStorage.getItem(ACCESS_KEY),
    tokenStorage.getItem(REFRESH_KEY),
  ]);
  return Boolean(accessToken);
}

export function hasSession(): boolean {
  return Boolean(accessToken && refreshToken);
}

export async function saveTokens(access: string, refresh: string): Promise<void> {
  accessToken = access;
  refreshToken = refresh;
  await Promise.all([
    tokenStorage.setItem(ACCESS_KEY, access),
    tokenStorage.setItem(REFRESH_KEY, refresh),
  ]);
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  socket?.disconnect();
  socket = null;
  await Promise.all([
    tokenStorage.deleteItem(ACCESS_KEY),
    tokenStorage.deleteItem(REFRESH_KEY),
  ]);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const send = async (): Promise<Response> => {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(`${API_URL}${path}`, { ...options, headers });
  };
  let response = await send();
  if (response.status === 401 && refreshToken && !path.startsWith("/auth/")) {
    refreshRequest ??= fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).then(async (refreshResponse) => {
      if (!refreshResponse.ok) return false;
      const tokens = await refreshResponse.json() as { accessToken: string; refreshToken: string };
      await saveTokens(tokens.accessToken, tokens.refreshToken);
      return true;
    }).finally(() => {
      refreshRequest = null;
    });
    if (await refreshRequest) response = await send();
    else await clearTokens();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const detail = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    throw new Error(detail ?? `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User; accessToken: string; refreshToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (fullName: string, email: string, password: string) =>
    request<{ user: User; accessToken: string; refreshToken: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ fullName, email, password }),
    }),
  me: () => request<User>("/users/me"),
  teams: () => request<Team[]>("/teams"),
  team: (id: string) => request<Team>(`/teams/${id}`),
  createTeam: (name: string, description: string) =>
    request<Team>("/teams", { method: "POST", body: JSON.stringify({ name, description }) }),
  updateTeam: (id: string, data: { name?: string; description?: string }) =>
    request<Team>(`/teams/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  archiveTeam: (id: string) => request<Team>(`/teams/${id}`, { method: "DELETE" }),
  assignMember: (teamId: string, userId: string, membershipRole = "MEMBER") =>
    request(`/teams/${teamId}/members`, {
      method: "POST",
      body: JSON.stringify({ userId, membershipRole }),
    }),
  removeMember: (teamId: string, userId: string) =>
    request(`/teams/${teamId}/members/${userId}`, { method: "DELETE" }),
  employees: (search = "") =>
    request<User[]>(`/users${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  updateProfile: (data: { fullName?: string; preferences?: Record<string, unknown> }) =>
    request<User>("/users/me", { method: "PATCH", body: JSON.stringify(data) }),
  updateAccountStatus: (id: string, accountStatus: "ACTIVE" | "SUSPENDED" | "DEACTIVATED") =>
    request(`/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ accountStatus }) }),
  updateUserRole: (id: string, role: User["role"]) =>
    request(`/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  messages: (teamId: string) => request<Message[]>(`/teams/${teamId}/messages`),
  sendMessage: (teamId: string, content: string, messageType = "GENERAL") =>
    request<Message>(`/teams/${teamId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content, messageType }),
    }),
  inventory: (search = "") =>
    request<InventoryItem[]>(`/inventory${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  inventoryItem: async (id: string) =>
    request<InventoryItem>(`/inventory/${id}`),
  inventoryHistory: (id: string) =>
    request<InventoryTransaction[]>(`/inventory/${id}/history`),
  createInventory: (data: {
    name: string;
    unit: string;
    teamIds: string[];
    quantity?: number;
  }) =>
    request<InventoryItem>("/inventory", { method: "POST", body: JSON.stringify(data) }),
  adjustInventory: (id: string, teamId: string, amount: number, notes?: string) =>
    request<InventoryItem>(`/inventory/${id}/adjust`, {
      method: "POST",
      headers: { "Idempotency-Key": Crypto.randomUUID() },
      body: JSON.stringify({ teamId, amount, notes }),
    }),
  setQuantity: (id: string, teamId: string, quantity: number, notes?: string) =>
    request<InventoryItem>(`/inventory/${id}/set-quantity`, {
      method: "POST",
      headers: { "Idempotency-Key": Crypto.randomUUID() },
      body: JSON.stringify({ teamId, quantity, notes }),
    }),
  notifications: () => request<Notification[]>("/notifications"),
  markAllRead: () => request<{ updated: number }>("/notifications/read-all", { method: "POST" }),
  logout: async (): Promise<boolean> => {
    let serverRevoked = true;
    if (refreshToken) {
      try {
        await request("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        serverRevoked = false;
      }
    }
    await clearTokens();
    return serverRevoked;
  },
};

export interface InventoryTransaction {
  id: string;
  transactionType: string;
  previousQuantity: number | string | null;
  newQuantity: number | string | null;
  createdAt: string;
  user: { fullName: string };
}

export function connectTeamSocket(): Socket {
  if (!socket) {
    const socketUrl = API_URL.replace(/\/api\/?$/, "");
    socket = io(socketUrl, { auth: { token: accessToken }, transports: ["websocket"] });
  }
  return socket;
}
