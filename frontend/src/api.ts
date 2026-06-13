import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";
const TOKEN_KEY = "shravan_token";

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}
export async function setToken(t: string | null) {
  if (t) await AsyncStorage.setItem(TOKEN_KEY, t);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request(path: string, opts: RequestInit = {}) {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || `Error ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

export const api = {
  signup: (body: any) =>
    request("/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  verifyOtp: (body: any) =>
    request("/auth/verify-otp", { method: "POST", body: JSON.stringify(body) }),
  login: (body: any) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/auth/me"),
  listStories: () => request("/stories"),
  getStory: (id: string) => request(`/stories/${id}`),
  createFromText: (body: any) =>
    request("/stories/create-from-text", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  speechMatch: (body: any) =>
    request("/speech/match", { method: "POST", body: JSON.stringify(body) }),
  saveProgress: (body: any) =>
    request("/sessions/progress", { method: "POST", body: JSON.stringify(body) }),
  analytics: () => request("/sessions/analytics"),
  listChildren: () => request("/children"),
  createChild: (body: any) =>
    request("/children", { method: "POST", body: JSON.stringify(body) }),
  subscriptionStatus: () => request("/subscriptions/status"),
  startSubscription: (plan_id: string) =>
    request("/subscriptions/start", {
      method: "POST",
      body: JSON.stringify({ plan_id }),
    }),
  listClasses: () => request("/classes"),
  createClass: (body: any) =>
    request("/classes", { method: "POST", body: JSON.stringify(body) }),
  getClass: (id: string) => request(`/classes/${id}`),
  addStudent: (id: string, body: any) =>
    request(`/classes/${id}/students`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  createAssignment: (id: string, body: any) =>
    request(`/classes/${id}/assignments`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  classAnalytics: (id: string) => request(`/classes/${id}/analytics`),
  uploadPdf: async (uri: string, name: string) => {
    const token = await getToken();
    const form = new FormData();
    // @ts-ignore
    form.append("file", { uri, name, type: "application/pdf" });
    const res = await fetch(`${BASE}/api/stories/upload-pdf`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form as any,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Upload failed");
    return data;
  },
  transcribeAudio: async (uri: string) => {
    const token = await getToken();
    const form = new FormData();
    // @ts-ignore
    form.append("file", { uri, name: "rec.m4a", type: "audio/m4a" });
    const res = await fetch(`${BASE}/api/speech/transcribe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form as any,
    });
    return res.json();
  },
};
