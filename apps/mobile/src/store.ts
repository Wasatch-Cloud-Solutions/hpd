import { create } from "zustand";
import { api, clearTokens, restoreTokens, saveTokens } from "./api";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  ready: boolean;
  signedIn: boolean;
  hydrate: () => Promise<void>;
  signIn: (user: User, access: string, refresh: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  ready: false,
  signedIn: false,
  hydrate: async () => {
    const signedIn = await restoreTokens();
    if (!signedIn) {
      set({ ready: true, signedIn: false, user: null });
      return;
    }
    try {
      const user = await api.me();
      set({ ready: true, signedIn: true, user });
    } catch {
      set({ ready: true, signedIn: true });
    }
  },
  signIn: async (user, access, refresh) => {
    await saveTokens(access, refresh);
    set({ user, ready: true, signedIn: true });
  },
  signOut: async () => {
    await clearTokens();
    set({ user: null, signedIn: false, ready: true });
  },
}));
