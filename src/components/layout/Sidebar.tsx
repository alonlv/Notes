"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { FileText, CheckSquare, MessageSquare, Zap, Brain, Settings, LogOut, Plus, Hash, Users, X, Moon, Sun, CalendarDays, LayoutDashboard, Inbox, Ticket } from "lucide-react";
import { useTheme } from "@/context/theme-context";
import { cn } from "@/lib/utils";
import { useTopics, useCreateTopic } from "@/hooks/use-topics";
import { useContacts } from "@/hooks/use-contacts";
import { TOPIC_DOT } from "@/components/notes/TopicFilter";
import { useState } from "react";
import { signOut } from "next-auth/react";

const MAIN_NAV = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/vouchers", label: "Wallet", icon: Ticket },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/feed", label: "Inbox", icon: Inbox },
];

const AGENT_NAV = [
  { href: "/automations", label: "Automations", icon: Zap },
  { href: "/memories", label: "Memory", icon: Brain },
  { href: "/admin", label: "Admin", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTopic = searchParams.get("topic");

  const { data: topics = [] } = useTopics();
  const { data: contacts = [] } = useContacts();
  const createTopic = useCreateTopic();

  const { theme, toggleTheme } = useTheme();
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");

  async function handleLogout() {
    await signOut({ redirectTo: "/login" });
  }

  async function handleCreateTopic() {
    const name = newTopicName.trim();
    if (!name) { setShowNewTopic(false); return; }
    await createTopic.mutateAsync({ name });
    setNewTopicName("");
    setShowNewTopic(false);
    router.push(`/notes?topic=${encodeURIComponent(name.toLowerCase())}`);
  }

  function navLink(href: string, label: string, Icon: React.ElementType) {
    const active = (href === "/" ? pathname === "/" : pathname.startsWith(href)) && !activeTopic;
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    );
  }

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen border-r border-border bg-background p-4 gap-1">
      <div className="mb-4 px-2">
        <h1 className="text-lg font-semibold tracking-tight">My Workspace</h1>
      </div>

      {MAIN_NAV.map(({ href, label, icon }) => navLink(href, label, icon))}

      {/* Topics */}
      <div className="mt-3">
        <div className="flex items-center justify-between px-3 mb-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Topics</span>
          <button onClick={() => setShowNewTopic(true)} className="text-muted-foreground hover:text-foreground transition-colors" title="New topic">
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {showNewTopic && (
          <div className="px-2 mb-1">
            <input
              autoFocus
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateTopic();
                if (e.key === "Escape") { setShowNewTopic(false); setNewTopicName(""); }
              }}
              onBlur={() => { if (!newTopicName.trim()) { setShowNewTopic(false); setNewTopicName(""); } }}
              placeholder="Topic name…"
              className="w-full h-7 rounded border border-input bg-transparent px-2 py-0.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        )}

        {topics.length === 0 && !showNewTopic && (
          <button
            onClick={() => setShowNewTopic(true)}
            className="flex items-center gap-2 px-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Hash className="h-3 w-3" />
            Add topic
          </button>
        )}

        {topics.map((topic) => {
          const isActive = activeTopic === topic.name && pathname.startsWith("/notes");
          return (
            <Link
              key={topic.id}
              href={`/notes?topic=${encodeURIComponent(topic.name)}`}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full shrink-0", TOPIC_DOT[topic.color] ?? "bg-gray-400")} />
              <span className="capitalize flex-1 truncate">{topic.name}</span>
              {topic.note_count > 0 && <span className="text-xs opacity-50">{topic.note_count}</span>}
            </Link>
          );
        })}
      </div>

      {/* Agent section */}
      <div className="mt-4">
        <div className="px-3 mb-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Agent</span>
        </div>
        {AGENT_NAV.map(({ href, label, icon }) => navLink(href, label, icon))}
      </div>

      <div className="mt-auto flex flex-col gap-1">
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
