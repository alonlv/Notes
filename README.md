# Notes

Front-end web app for the AI assistant. Provides a browser UI for notes, tasks, reminders, proactive monitors, memories, and admin configuration.

Built with Next.js 16 / React 19, TanStack Query v5, Tiptap editor, and Tailwind CSS.

## Quick Start

```bash
npm install
npm run dev   # http://localhost:3000
```

Set the backend URL and API token in `.env.local`:

```env
ASSISTANT_API_URL=http://localhost:8000
ASSISTANT_API_TOKEN=your-token
```

## Features

### Notes
Rich-text note editor (Tiptap). Notes are grouped by topic. Filter by topic using the pill selector; search by title, content, or topic. Create a new note with an optional topic pre-selected.

### Tasks
Task list with priorities, statuses (`todo` / `in_progress` / `done`), and optional due dates. Switch between list view and Kanban board. Overdue tasks are highlighted.

### Reminders
One-time or recurring (cron) reminders sent to any configured platform channel. Each reminder can be scoped to one or more contacts.

### Monitors (Proactive Tasks)
Background tasks the agent runs on a schedule and reports only when there is something worth saying. Configure with a plain-language instruction and a cron schedule.

### Memories
Semantic memory entries with optional category. Full text search against the backend's memory
store. Two views of the same store, switchable from the header:

- **List** — search, add, edit and delete entries, filtered by topic. *Group by context*
  gathers the rows under the subjects the backend's memory graph found, colour-matched to the
  map; switch it off for the plain flat list of everything stored.
- **Graph** — the memory graph drawn as a force-directed map (`react-force-graph-2d`), one
  colour per context. Node size is how connected a memory is; link colour is *why* two
  memories are linked — similar meaning, same topic, or naming the same thing. Click a node
  to read it and see everything it connects to; click a context chip to focus on it.

Both read the same store and the same contexts, so a subject is the same colour and the same
grouping whichever way you look at it.

### Admin
Runtime configuration for the AI backend:
- **General** — agent name, timezone, tool rounds, organizer info
- **Prompt** — override system prompts without redeploying
- **Providers** — add / edit / reorder LLM providers with drag-and-drop
- **Contacts** — view the contact registry; expand a contact to set a per-user LLM override (stored in `contact.attributes.llm_providers`)
- **Data** — per-user data summary (notes, tasks, topics, memories, reminders, monitors)

## User Selector

The sidebar shows a **People** section listing every contact in the registry. Clicking a contact filters all notes and tasks to show only that person's data (items they own or are shared with). A "Viewing [name]'s ..." indicator appears on the notes and tasks pages.

Click the contact again (or the × button) to clear the filter and return to the full view.

This filter is passed as a `user_id` query parameter to the backend. Data visibility is enforced server-side using the ACL filter (`owner_id` / `authorized_ids`).

## Per-User LLM Override

Inside the **Contacts** tab, expand any contact and use the **Model override** section to assign a different LLM provider to that person. Fields: `base_url`, `model`, `api_key`. The override is saved in `contact.attributes.llm_providers` and picked up by the backend for every message from that contact.

## API Routes

All backend calls go through Next.js API route handlers under `/api/` to keep the API token server-side:

| Route | Description |
|---|---|
| `/api/notes` | List / create notes |
| `/api/notes/[id]` | Get / update / delete a note |
| `/api/tasks` | List / create tasks |
| `/api/tasks/[id]` | Update / delete a task |
| `/api/topics` | List / create / update / delete topics |
| `/api/reminders` | List / create reminders |
| `/api/reminders/[id]` | Update / delete a reminder |
| `/api/proactive-tasks` | List / create monitors |
| `/api/proactive-tasks/[id]` | Update / delete a monitor |
| `/api/memories` | List / create memories |
| `/api/memories/[id]` | Update / delete a memory |
| `/api/memories/graph` | The memory graph: nodes, links, clusters and stats |
| `/api/admin/config` | Get / update runtime config |
| `/api/admin/contacts` | List contacts |
| `/api/admin/contacts/[id]/data` | Update contact attributes |

## Project Structure

```
src/
├── app/
│   ├── (main)/           Pages (notes, tasks, reminders, proactive-tasks, memories, admin)
│   └── api/              Next.js API route handlers
├── components/
│   ├── layout/           Sidebar, header
│   ├── notes/            NoteList, NoteCard, TopicFilter
│   ├── tasks/            TaskList, KanbanView, AddTaskInput
│   └── ui/               Shared UI primitives + ScheduledItemForm
├── context/
│   └── user-context.tsx  Global selected-user state (UserProvider)
├── hooks/                TanStack Query hooks (use-notes, use-tasks, use-contacts, …)
├── lib/
│   └── api.ts            Typed API client (apiFetch exported for shared use)
└── types/
    └── api.ts            Shared TypeScript types (Note, Task, Contact, …)
```
