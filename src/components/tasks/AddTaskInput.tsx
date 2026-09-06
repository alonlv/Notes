"use client";

import { useState } from "react";
import { useCreateTask } from "@/hooks/use-tasks";
import { Plus, Tag } from "lucide-react";

export function AddTaskInput() {
  const [value, setValue] = useState("");
  const [tags, setTags] = useState("");
  const createTask = useCreateTask();

  function submit() {
    const title = value.trim();
    if (!title) return;
    const tagsArr = tags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    createTask.mutate({ title, tags: tagsArr });
    setValue("");
    setTags("");
  }

  return (
    <div className="flex items-center gap-0 rounded-lg border border-input bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-shadow overflow-hidden">
      <Plus className="ml-3 h-4 w-4 text-muted-foreground shrink-0" />
      <input
        className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
        placeholder="Add a task and press Enter…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        disabled={createTask.isPending}
      />
      <div className="w-px bg-border self-stretch" />
      <Tag className="ml-2.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <input
        className="w-36 bg-transparent px-2 py-2.5 text-xs outline-none placeholder:text-muted-foreground disabled:opacity-50"
        placeholder="tag, tag…"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        disabled={createTask.isPending}
      />
    </div>
  );
}
