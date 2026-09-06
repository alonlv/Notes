import {
  Brain,
  CalendarDays,
  CheckSquare,
  FileText,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Ticket,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** The everyday sections. */
export const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/vouchers", label: "Wallet", icon: Ticket },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/feed", label: "Inbox", icon: Inbox },
];

/** What the assistant does on its own, and the knobs behind it. */
export const AGENT_NAV: NavItem[] = [
  { href: "/automations", label: "Automations", icon: Zap },
  { href: "/memories", label: "Memory", icon: Brain },
  { href: "/admin", label: "Admin", icon: Settings },
];

/** The bottom bar has no sections, so it shows the lot in one row. */
export const ALL_NAV: NavItem[] = [...MAIN_NAV, ...AGENT_NAV];

/** "/" only matches itself; everything else matches its subtree. */
export function isActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
