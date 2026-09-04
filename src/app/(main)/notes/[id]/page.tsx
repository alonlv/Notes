"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useNote, useDeleteNote, useUpdateNote } from "@/hooks/use-notes";
import { useContacts } from "@/hooks/use-contacts";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: note, isLoading } = useNote(id);
  const deleteNote = useDeleteNote();
  const updateNote = useUpdateNote();
  const { data: contacts = [] } = useContacts();
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Delete this note?")) return;
    await deleteNote.mutateAsync(id);
    router.push("/notes");
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <div className="h-8 w-32 rounded bg-muted animate-pulse mb-8" />
        <div className="h-10 w-3/4 rounded bg-muted animate-pulse mb-6" />
        <div className="space-y-3">
          {/* Fixed widths, not random ones: a skeleton that renders differently
              on the server and the client is a hydration mismatch. */}
          {[92, 78, 85, 71, 88].map((width, i) => (
            <div key={i} className="h-4 rounded bg-muted animate-pulse" style={{ width: `${width}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 text-center">
        <p className="text-muted-foreground mb-4">Note not found.</p>
        <Button variant="outline" onClick={() => router.push("/notes")}>
          Back to Notes
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-6 py-3 border-b border-border bg-background/95 backdrop-blur">
        <Button variant="ghost" size="sm" onClick={() => router.push("/notes")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Notes
        </Button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="capitalize">{note.topic}</span>
          {contacts.length > 0 && (
            <select
              value={note.user_id || ""}
              onChange={(e) => updateNote.mutate({ id, user_id: e.target.value || undefined })}
              className="h-7 rounded border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              title="Assign note to person"
            >
              <option value="">No person</option>
              {contacts.map((c) => (
                <option key={c.canonical_id} value={c.canonical_id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <NoteEditor noteId={id} initialTitle={note.title} initialContent={note.content} />
    </div>
  );
}
