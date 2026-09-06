"use client";

import { useState } from "react";
import { useTasks, useTags } from "@/hooks/use-tasks";
import { TaskList } from "@/components/tasks/TaskList";
import { KanbanView } from "@/components/tasks/KanbanView";
import { AddTaskInput } from "@/components/tasks/AddTaskInput";
import { Button } from "@/components/ui/button";
import { List, LayoutGrid, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/types/api";
import { STATUS_LABELS, tagColor } from "@/lib/task-utils";

type View = "list" | "kanban";

const STATUS_FILTERS: Array<{ label: string; value: TaskStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: STATUS_LABELS.todo, value: "todo" },
  { label: STATUS_LABELS.in_progress, value: "in_progress" },
  { label: STATUS_LABELS.done, value: "done" },
];

const STATUS_ACTIVE = "bg-primary text-primary-foreground";
const STATUS_INACTIVE = "bg-secondary text-secondary-foreground hover:bg-secondary/80";

export default function TasksPage() {
  const { data: tasks = [], isLoading, error: tasksError } = useTasks();
  const { data: allTags = [] } = useTags();
  const [view, setView] = useState<View>("list");
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const [tagFilter, setTagFilter] = useState<string>("");

  const overdue = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done"
  );

  let filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);
  if (tagFilter.trim() !== "") {
    filtered = filtered.filter((t) => (t.tags ?? []).includes(tagFilter.trim()));
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setView("list")}
            title="List view"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "kanban" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setView("kanban")}
            title="Board view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error / overdue alerts */}
      {tasksError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {tasksError.message}
        </div>
      )}
      {overdue.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:border-red-900 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {overdue.length} task{overdue.length > 1 ? "s" : ""} overdue
        </div>
      )}

      {/* Add task */}
      <div className="mb-5">
        <AddTaskInput />
      </div>

      {/* Filters — two rows */}
      <div className="mb-4 space-y-2">
        {/* Status row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium w-10 shrink-0">Status</span>
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === value ? STATUS_ACTIVE : STATUS_INACTIVE
              )}
            >
              {label}
              {value !== "all" && (
                <span className="ml-1 opacity-60">
                  ({tasks.filter((t) => t.status === value).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tags row — only shown when there are tags */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium w-10 shrink-0">Tags</span>
            {allTags.map((tag) => {
              const active = tagFilter === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setTagFilter(active ? "" : tag)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors ring-offset-background",
                    active
                      ? "ring-2 ring-ring ring-offset-1 " + tagColor(tag)
                      : tagColor(tag)
                  )}
                >
                  #{tag}
                </button>
              );
            })}
            {/* Active tag that's no longer in allTags */}
            {tagFilter && !allTags.includes(tagFilter) && (
              <button
                onClick={() => setTagFilter("")}
                className="rounded-full px-3 py-1 text-xs font-medium bg-primary text-primary-foreground"
              >
                #{tagFilter} ×
              </button>
            )}
          </div>
        )}
      </div>

      {/* Task list / kanban */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : view === "kanban" ? (
        <KanbanView tasks={filtered} />
      ) : (
        <TaskList
          tasks={filtered}
          onTagClick={(tag) => setTagFilter(tagFilter === tag ? "" : tag)}
        />
      )}
    </div>
  );
}
