// ============================================================
// Settings store — client-side (localStorage) preferences for the
// AI assistant, chat personas and the user profile. Mockup-grade
// persistence (mirrors src/lib/branding.ts) with a reactive hook.
// ============================================================
import { useEffect, useState } from "react";

const EVENT = "sop-settings";

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

function useStore<T>(key: string, fallback: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(() => read(key, fallback));
  useEffect(() => {
    const sync = () => setVal(read(key, fallback));
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = (v: T) => { write(key, v); setVal(v); };
  return [val, set];
}

// ---- AI model ----
export type ModelOption = { id: string; label: string; note: string; group: string; active: boolean };
export const AI_MODELS: ModelOption[] = [
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", note: "Fast · default", group: "Google Gemini", active: true },
  { id: "gemini-3.5-pro", label: "Gemini 3.5 Pro", note: "Deeper reasoning", group: "Google Gemini", active: true },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", note: "Economical", group: "Google Gemini", active: true },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", note: "Most capable Gemini", group: "Google Gemini", active: true },
  { id: "claude-opus-4-8", label: "Claude Opus 4.8", note: "Connect an Anthropic key", group: "Anthropic", active: false },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", note: "Connect an Anthropic key", group: "Anthropic", active: false },
  { id: "gpt-5", label: "GPT-5", note: "Connect an OpenAI key", group: "OpenAI", active: false },
];
export const DEFAULT_MODEL = "gemini-3.5-flash";
export function useAiModel() { return useStore<string>("sop_ai_model", DEFAULT_MODEL); }
export function getAiModel(): string { return read<string>("sop_ai_model", DEFAULT_MODEL); }
export function modelLabel(id: string): string { return AI_MODELS.find((m) => m.id === id)?.label ?? id; }

// ---- Chat personas / profiles ----
export type ChatProfile = { id: string; name: string; icon: string; prompt: string };
export const DEFAULT_PROFILES: ChatProfile[] = [
  {
    id: "analyst", name: "Analyst", icon: "chart",
    prompt: "You are a sharp S&OP analyst. Lead with the numbers, quantify every gap in both units and value, and be precise. Prefer tight bullets and numbered steps over prose.",
  },
  {
    id: "advisor", name: "Advisor", icon: "sparkles",
    prompt: "You are a friendly planning advisor for a non-expert manager. Explain what the data means in plain language, then give 2–3 concrete recommended actions.",
  },
  {
    id: "board", name: "Board", icon: "file",
    prompt: "You brief the executive board. Give a tight summary: the decision needed, the value at stake, the key risk and your recommendation. No jargon.",
  },
];
export function useChatProfiles() { return useStore<ChatProfile[]>("sop_chat_profiles", DEFAULT_PROFILES); }
export function getChatProfiles(): ChatProfile[] { return read<ChatProfile[]>("sop_chat_profiles", DEFAULT_PROFILES); }

// ---- User profile ----
export type UserProfile = {
  avatar?: string | null;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  jobTitle?: string;
  company?: string;
  phone?: string;
  location?: string;
  bio?: string;
};
export function useUserProfile() { return useStore<UserProfile>("sop_user_profile", {}); }
export function getUserProfile(): UserProfile { return read<UserProfile>("sop_user_profile", {}); }
