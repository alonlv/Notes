"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useNotes, useCreateNote } from "@/hooks/use-notes";
import { useTopics, useUpdateTopic, useDeleteTopic } from "@/hooks/use-topics";
import { NoteList } from "@/components/notes/NoteList";
import { TopicFilter } from "@/components/notes/TopicFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Plus, Search } from "lucide-react";

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function NotesPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedTopic = searchParams.get("topic");

  const [search, setSearch] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [showTopicInput, setShowTopicInput] = useState(false);

  const { data: notes = [], isLoading, error: notesError } = useNotes();
  const { data: topics = [] } = useTopics();
  const createNote = useCreateNote();
  const updateTopic = useUpdateTopic();
  const deleteTopic = useDeleteTopic();

  function handleSelectTopic(topic: string | null) {
    if (topic) {
      router.push(`/notes?topic=${encodeURIComponent(topic)}`);
    } else {
      router.push("/notes");
    }
  }

  const filtered = notes.filter((n) => {
    const matchesTopic = !selectedTopic || n.topic === selectedTopic;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      n.title.toLowerCase().includes(q) ||
      stripHtml(n.content).includes(q) ||
      n.topic.toLowerCase().includes(q);
    return matchesTopic && matchesSearch;
  });

  async function handleCreate() {
    const topic = newTopic.trim() || selectedTopic || "general";
    const note = await createNote.mutateAsync({ content: "", topic });
    setShowTopicInput(false);
    setNewTopic("");
    router.push(`/notes/${note.id}`);
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notes</h1>
        </div>
        {!showTopicInput ? (
          <Button size="sm" onClick={() => setShowTopicInput(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              list="topic-suggestions"
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Topic (e.g. work)"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setShowTopicInput(false);
              }}
            />
            <datalist id="topic-suggestions">
              {topics.map((t) => <option key={t.id} value={t.name} />)}
            </datalist>
            <Button size="sm" onClick={handleCreate} disabled={createNote.isPending}>
              Create
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowTopicInput(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      {notesError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {notesError.message}
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {topics.length > 0 && (
        <div className="mb-4">
          <TopicFilter
            topics={topics}
            selected={selectedTopic}
            onSelect={handleSelectTopic}
            onEdit={(id, name, color) => updateTopic.mutate({ id, name, color })}
            onDelete={(id) => {
              if (confirm("Delete this topic and all its notes?")) {
                deleteTopic.mutate({ id });
                if (selectedTopic === topics.find(t => t.id === id)?.name) {
                  router.push("/notes");
                }
              }
            }}
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-lg border border-border bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {search && (
            <p className="text-xs text-muted-foreground mb-3">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
            </p>
          )}
          <NoteList notes={filtered} topics={topics} />
        </>
      )}
    </div>
  );
}

export default function NotesPage() {
  return (
    <Suspense>
      <NotesPageInner />
    </Suspense>
  );
}
