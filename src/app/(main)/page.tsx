"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CheckSquare, CalendarDays, Bell, Sparkles, ArrowRight, Send, Bot, AlertCircle,
} from "lucide-react";
import { useSelectedUser } from "@/context/user-context";
import { useTasks } from "@/hooks/use-tasks";
import { useAutomations } from "@/hooks/use-automations";
import { useCalendarConnection } from "@/hooks/use-calendar-connection";
import { useBackgroundStatus, notifyingRuns } from "@/hooks/use-background-status";
import { LatestApiError } from "@/components/system/ApiErrors";
import { api } from "@/lib/api";
import { Md } from "@/components/ui/md";
import { cn } from "@/lib/utils";
import { fmtTime, fmtWhen, jobLabel } from "@/lib/jobs";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function endOfToday() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 23, 59, 59);
}

export default function DashboardPage() {
  const { selectedUserId, selectedUserName } = useSelectedUser();

  const { data: tasks = [] } = useTasks(selectedUserId || undefined);
  const { data: reminders = [] } = useAutomations(selectedUserId || undefined, "reminder");
  const { data: calConn } = useCalendarConnection(selectedUserId || "api-user");
  const { data: status } = useBackgroundStatus();

  const now = new Date();
  const eod = endOfToday();
  const dueTasks = tasks
    .filter((t) => t.status !== "done" && t.due_date && new Date(t.due_date) <= eod)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1));

  const upcomingReminders = [...reminders]
    .filter((r) => !r.run_at || new Date(r.run_at) >= now || r.cron)
    .sort((a, b) => (a.run_at ?? "9").localeCompare(b.run_at ?? "9"))
    .slice(0, 5);

  const noticed = notifyingRuns(status?.jobs).slice(0, 4);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}{selectedUserName ? `, ${selectedUserName}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </header>

      <QuickAsk userId={selectedUserId || undefined} />

      {/* Only renders when something actually failed — silence means healthy. */}
      <LatestApiError className="mt-4" />

      <div className="grid gap-4 md:grid-cols-2 mt-4">
        {/* Agent noticed */}
        <Card title="Agent noticed" icon={Sparkles} href="/feed" action="Inbox">
          {noticed.length === 0 ? (
            <Empty>Nothing yet — the assistant will surface things here as it notices them.</Empty>
          ) : (
            <ul className="space-y-3">
              {noticed.map((r, i) => (
                <li key={i} className="text-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
                    <span className="font-medium text-foreground">{jobLabel(r.job_name)}</span>
                    <span>· {fmtWhen(r.started_at)}</span>
                  </div>
                  <div className="line-clamp-2 text-foreground/90"><Md className="text-sm">{r.message ?? ""}</Md></div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Due today */}
        <Card title="Due today" icon={CheckSquare} href="/tasks">
          {dueTasks.length === 0 ? (
            <Empty>No tasks due today. Nice.</Empty>
          ) : (
            <ul className="space-y-2">
              {dueTasks.slice(0, 6).map((t) => {
                const overdue = t.due_date ? new Date(t.due_date) < now : false;
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{t.title}</span>
                    <span className={cn("shrink-0 text-xs", overdue ? "text-red-500 font-medium" : "text-muted-foreground")}>
                      {overdue ? "Overdue" : t.due_date ? fmtTime(t.due_date) : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Calendar connection */}
        <Card title="Calendar" icon={CalendarDays} href="/calendar" action="Manage">
          {!calConn || (!calConn.google && !calConn.apple) ? (
            <Empty>No calendar connected. Connect Google or Apple so the assistant can manage your real schedule.</Empty>
          ) : (
            <ul className="space-y-2">
              <li className="flex items-center justify-between gap-3 text-sm">
                <span>Google Calendar</span>
                <span className={cn("shrink-0 text-xs", calConn.google ? "text-green-600" : "text-muted-foreground")}>
                  {calConn.google ? "Connected" : "Not connected"}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3 text-sm">
                <span>Apple Calendar</span>
                <span className={cn("shrink-0 text-xs", calConn.apple ? "text-green-600" : "text-muted-foreground")}>
                  {calConn.apple ? "Connected" : "Not connected"}
                </span>
              </li>
            </ul>
          )}
        </Card>

        {/* Reminders */}
        <Card title="Reminders" icon={Bell} href="/automations">
          {upcomingReminders.length === 0 ? (
            <Empty>No upcoming reminders.</Empty>
          ) : (
            <ul className="space-y-2">
              {upcomingReminders.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{r.content}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {r.cron ? "Recurring" : r.run_at ? fmtWhen(r.run_at) : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({
  title, icon: Icon, href, action, children,
}: {
  title: string;
  icon: React.ElementType;
  href?: string;
  action?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-background p-4 flex flex-col min-h-[8rem]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </h2>
        {href && (
          <Link href={href} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            {action ?? "Open"} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function QuickAsk({ userId }: { userId?: string }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [last, setLast] = useState<{ q: string; a: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);
    setLoading(true);
    setLast({ q: text, a: "" });
    try {
      const { reply } = await api.chat.send(text, userId);
      setLast({ q: text, a: reply });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach the assistant.");
      setLast(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-background p-4">
      <div className="flex gap-2 items-end">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
          placeholder="Ask me anything, or tell me what to do…"
          className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button
          onClick={ask}
          disabled={!input.trim() || loading}
          className="shrink-0 h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}

      {last && (
        <div className="mt-4 space-y-2 text-sm">
          <p className="text-muted-foreground">{last.q}</p>
          <div className="flex gap-2">
            <div className="shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center mt-0.5">
              <Bot className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 rounded-lg bg-muted px-3 py-2">
              {loading && !last.a ? (
                <span className="text-muted-foreground">Thinking…</span>
              ) : (
                <Md className="text-sm">{last.a}</Md>
              )}
            </div>
          </div>
          <Link href="/chat" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            Continue in chat <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </section>
  );
}
