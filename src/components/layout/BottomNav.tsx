"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { FileText, CheckSquare, MessageSquare, Brain, Zap, Settings, LogOut, Moon, Sun, CalendarDays, LayoutDashboard, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/theme-context";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/feed", label: "Inbox", icon: Inbox },
  { href: "/automations", label: "Automations", icon: Zap },
  { href: "/memories", label: "Memory", icon: Brain },
  { href: "/admin", label: "Admin", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  async function handleLogout() {
    await signOut({ redirectTo: "/login" });
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-background overflow-x-auto">
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors min-w-[3.5rem]",
            (href === "/" ? pathname === "/" : pathname.startsWith(href)) ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ))}
      <button
        onClick={toggleTheme}
        className="flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium text-muted-foreground min-w-[3.5rem]"
      >
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        Theme
      </button>
      <button
        onClick={handleLogout}
        className="flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium text-muted-foreground min-w-[3.5rem]"
      >
        <LogOut className="h-5 w-5" />
        Out
      </button>
    </nav>
  );
}
