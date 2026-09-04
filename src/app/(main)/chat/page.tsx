"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Md } from "@/components/ui/md";
import { cn } from "@/lib/utils";
import { useSelectedUser } from "@/context/user-context";
import { api } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  text: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { selectedUserId, selectedUserName } = useSelectedUser();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Load persisted conversation so it survives refreshes and reflects the same memory
  // the assistant uses on Telegram/WhatsApp (when WEB_OWNER_USER_ID is configured).
  useEffect(() => {
    let cancelled = false;
    api.chat
      .history(selectedUserId || undefined)
      .then((data) => {
        if (!cancelled && data.messages.length) setMessages(data.messages);
      })
      .catch(() => { /* no history yet / backend unavailable — start fresh */ });
    return () => { cancelled = true; };
  }, [selectedUserId]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const { reply } = await api.chat.send(text, selectedUserId || undefined);
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach the assistant.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen max-w-2xl mx-auto">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
        <Bot className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Assistant</h1>
        {selectedUserName && (
          <span className="ml-auto text-xs text-muted-foreground">
            as {selectedUserName}
          </span>
        )}
        {!selectedUserName && (
          <span className="ml-auto text-xs text-amber-500">
            No user selected — memory won&apos;t sync with Telegram
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-12">
            Ask me anything — I can manage your tasks, notes, set reminders, and search the web.
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            {msg.role === "assistant" && (
              <div className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center mt-0.5">
                <Bot className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div
              className={cn(
                "rounded-2xl px-4 py-2.5 max-w-[80%] text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              )}
            >
              {msg.role === "assistant" ? (
                <Md className="text-sm">{msg.text}</Md>
              ) : (
                <span className="whitespace-pre-wrap">{msg.text}</span>
              )}
            </div>
            {msg.role === "user" && (
              <div className="shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center mt-0.5">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
              <Bot className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-border">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message… (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-h-36 overflow-y-auto"
            style={{ height: "auto" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
          />
          <Button
            size="icon"
            onClick={send}
            disabled={!input.trim() || loading}
            className="shrink-0 rounded-xl h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
