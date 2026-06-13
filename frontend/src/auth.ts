import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setToken, getToken } from "./api";

export type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  verified: boolean;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    name: string,
    email: string,
    password: string,
    role?: string
  ) => Promise<{ pendingEmail: string }>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
};

const USER_KEY = "shravan_user";

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  hydrated: false,
  hydrate: async () => {
    const token = await getToken();
    const u = await AsyncStorage.getItem(USER_KEY);
    if (token && u) {
      try {
        set({ user: JSON.parse(u), hydrated: true });
        return;
      } catch {}
    }
    set({ hydrated: true });
  },
  login: async (email, password) => {
    set({ loading: true });
    try {
      const r = await api.login({ email, password });
      await setToken(r.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(r.user));
      set({ user: r.user, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
  signup: async (name, email, password, role) => {
    set({ loading: true });
    try {
      await api.signup({ name, email, password, role: role || "parent" });
      set({ loading: false });
      return { pendingEmail: email };
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
  verifyOtp: async (email, code) => {
    set({ loading: true });
    try {
      const r = await api.verifyOtp({ email, code });
      await setToken(r.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(r.user));
      set({ user: r.user, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
  logout: async () => {
    await setToken(null);
    await AsyncStorage.removeItem(USER_KEY);
    set({ user: null });
  },
}));
