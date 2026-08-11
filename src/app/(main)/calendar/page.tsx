"use client";

import { useState } from "react";
import { CalendarDays, Check, X, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useCalendarConnection } from "@/hooks/use-calendar-connection";

export default function CalendarConnectionsPage() {
  // Each person connects their own calendar; there is nobody else to manage.
  const { data: status, isLoading, refetch } = useCalendarConnection();

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [appleUser, setAppleUser] = useState("");
  const [applePass, setApplePass] = useState("");
  const [showAppleForm, setShowAppleForm] = useState(false);

  async function connectGoogle() {
    setError("");
    setBusy("google");
    try {
      const { auth_url } = await api.calendars.startGoogleAuth();
      window.location.href = auth_url;
    } catch {
      setError("Could not start Google authorization. Check that Google Calendar is configured on the backend.");
      setBusy(null);
    }
  }

  async function disconnectGoogle() {
    setBusy("google");
    try {
      await api.calendars.disconnectGoogle();
      await refetch();
    } finally {
      setBusy(null);
    }
  }

  async function connectApple() {
    setError("");
    setBusy("apple");
    try {
      await api.calendars.appleSetup({ username: appleUser.trim(), password: applePass.trim() });
      setAppleUser("");
      setApplePass("");
      setShowAppleForm(false);
      await refetch();
    } catch {
      setError("Could not connect Apple Calendar. Double-check the Apple ID and app-specific password.");
    } finally {
      setBusy(null);
    }
  }

  async function disconnectApple() {
    setBusy("apple");
    try {
      await api.calendars.disconnectApple();
      await refetch();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="flex items-center gap-3 mb-2">
        <CalendarDays className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Calendar</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        The assistant doesn&apos;t keep its own calendar — it works directly with the calendar you already use.
        Connect Google or Apple here and the assistant can read your schedule and add events for you.
      </p>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm px-3 py-2 mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking connections…
        </div>
      ) : (
        <div className="space-y-4">
          {/* Google */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium">Google Calendar</h2>
                <StatusBadge connected={!!status?.google} />
              </div>
              {status?.google ? (
                <Button size="sm" variant="outline" disabled={busy === "google"} onClick={disconnectGoogle}>
                  Disconnect
                </Button>
              ) : (
                <Button size="sm" disabled={busy === "google"} onClick={connectGoogle}>
                  {busy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Connect <ExternalLink className="h-3.5 w-3.5 ml-1" /></>}
                </Button>
              )}
            </div>
          </div>

          {/* Apple */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium">Apple Calendar (iCloud)</h2>
                <StatusBadge connected={!!status?.apple} detail={status?.apple_username} />
              </div>
              {status?.apple ? (
                <Button size="sm" variant="outline" disabled={busy === "apple"} onClick={disconnectApple}>
                  Disconnect
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowAppleForm((v) => !v)}>
                  Connect
                </Button>
              )}
            </div>

            {showAppleForm && !status?.apple && (
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  Use your Apple ID and an{" "}
                  <a href="https://support.apple.com/en-us/102654" target="_blank" rel="noreferrer" className="underline">
                    app-specific password
                  </a>{" "}
                  (not your normal password).
                </p>
                <input
                  value={appleUser}
                  onChange={(e) => setAppleUser(e.target.value)}
                  placeholder="Apple ID (email)"
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <input
                  value={applePass}
                  onChange={(e) => setApplePass(e.target.value)}
                  type="password"
                  placeholder="App-specific password"
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Button size="sm" disabled={busy === "apple" || !appleUser || !applePass} onClick={connectApple}>
                  {busy === "apple" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & verify"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ connected, detail }: { connected: boolean; detail?: string }) {
  return (
    <div className="mt-1 flex items-center gap-1.5 text-sm">
      {connected ? (
        <>
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-green-600">Connected{detail ? ` · ${detail}` : ""}</span>
        </>
      ) : (
        <>
          <X className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Not connected</span>
        </>
      )}
    </div>
  );
}
