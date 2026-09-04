import Link from "next/link";
import type { Note } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TOPIC_DOT } from "@/components/notes/TopicFilter";

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function NoteCard({ note, topicColor }: { note: Note; topicColor?: string }) {
  const preview = stripHtml(note.content).slice(0, 100);
  const date = new Date(note.updated_at || note.created_at).toLocaleDateString();
  const displayTitle = note.title || "Untitled";
  const owner = note.owner_id || note.user_id || note.owner_id || null;

  return (
    <Link href={`/notes/${note.id}`} className="block group">
      <div className="rounded-lg border border-border bg-card p-4 hover:bg-accent/50 transition-colors h-full flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {displayTitle}
          </h3>
          <Badge variant="secondary" className="capitalize shrink-0 text-xs flex items-center gap-1">
            {topicColor && (
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", TOPIC_DOT[topicColor] ?? "bg-gray-400")} />
            )}
            {note.topic}
          </Badge>
        </div>
        {preview && (
          <p className="text-xs text-muted-foreground line-clamp-3 flex-1">{preview}</p>
        )}
        <div className="flex items-center justify-between mt-auto">
          <p className="text-xs text-muted-foreground/60">{date}</p>
          {owner && (
            <p className="text-xs text-muted-foreground/50 truncate max-w-[50%] text-right" title={owner}>
              {owner.startsWith("person:") ? owner.slice(7) : owner}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
