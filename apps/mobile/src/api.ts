import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { io, Socket } from "socket.io-client";
import type { InventoryItem, Message, Notification, Team, User } from "./types";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";
const ACCESS_KEY = "hidden-peak-access-token";
const REFRESH_KEY = "hidden-peak-refresh-token";
let accessToken: string | null = null;
let refreshToken: string | null = null;
let socket: Socket | null = null;
let refreshRequest: Promise<boolean> | null = null;

export async function restoreTokens(): Promise<boolean> {
  [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
  ]);
  return Boolean(accessToken);
}

export async function saveTokens(access: string, refresh: string): Promise<void> {
  accessToken = access;
  refreshToken = refresh;
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, access),
    SecureStore.setItemAsync(REFRESH_KEY, refresh),
  ]);
}

export async function clearTokens(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  socket?.disconnect();
  socket = null;
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
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
  setQuantity: (id: string, teamId: string, quantity: number) =>
    request<InventoryItem>(`/inventory/${id}/set-quantity`, {
      method: "POST",
      headers: { "Idempotency-Key": Crypto.randomUUID() },
      body: JSON.stringify({ teamId, quantity }),
    }),
  notifications: () => request<Notification[]>("/notifications"),
  markAllRead: () => request<{ updated: number }>("/notifications/read-all", { method: "POST" }),
  logout: async () => {
    if (refreshToken) {
      await request("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }).catch(() => undefined);
    }
    await clearTokens();
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
