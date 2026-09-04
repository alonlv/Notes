import {
  Activity, AlertTriangle, Brain, Cpu, Database, FileText, Settings, Users, Zap,
  type LucideIcon,
} from "lucide-react";

// ─── Config shape ────────────────────────────────────────────────────────────

export interface LlmProvider {
  base_url: string;
  model: string;
  api_key: string;
  supports_text: boolean;
  supports_image: boolean;
  supports_voice: boolean;
  role: "user" | "background" | "any";
  voice_model: string;
  timeout_seconds: number;
}

export interface Config {
  agent_name: string;
  agent_timezone: string;
  agent_max_tool_rounds: number;
  agent_verbose_responses: boolean;
  organizer_name: string;
  organizer_email: string;
  news_provider: string;
  llm_providers: LlmProvider[];
  prompt_core: string;
  prompt_memory: string;
  prompt_proactive: string;
  prompt_notes: string;
}

export const DEFAULT_PROVIDER: LlmProvider = {
  base_url: "",
  model: "",
  api_key: "",
  supports_text: true,
  supports_image: false,
  supports_voice: false,
  role: "user",
  voice_model: "whisper-1",
  timeout_seconds: 60,
};

// ─── Toasts ──────────────────────────────────────────────────────────────────

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

/** Panels take the page's `toast` rather than calling `useToasts` themselves:
 *  a second instance has its own list, and only the page renders one. */
export type ToastFn = (message: string, type?: Toast["type"]) => void;

// ─── Navigation ──────────────────────────────────────────────────────────────

export type Tab = "general" | "prompt" | "providers" | "contacts" | "data" | "heartbeat" | "memory" | "background" | "errors";

export type Group = "settings" | "ai" | "system";

export interface NavTab { id: Tab; label: string; icon: LucideIcon }
export interface NavGroup { id: Group; label: string; icon: LucideIcon; tabs: NavTab[] }

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    tabs: [
      { id: "general",   label: "General",   icon: Settings },
      { id: "providers", label: "Providers", icon: Cpu },
      { id: "contacts",  label: "Contacts",  icon: Users },
    ],
  },
  {
    id: "ai",
    label: "AI",
    icon: Brain,
    tabs: [
      { id: "prompt",  label: "Prompts", icon: FileText },
      { id: "memory",  label: "Memory",  icon: Brain },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: Activity,
    tabs: [
      { id: "data",       label: "Data",       icon: Database },
      { id: "heartbeat",  label: "Heartbeat",  icon: Zap },
      { id: "background", label: "Background", icon: Activity },
      { id: "errors",     label: "Errors",     icon: AlertTriangle },
    ],
  },
];

export const ALL_TABS: Tab[] = NAV_GROUPS.flatMap((g) => g.tabs.map((t) => t.id));
