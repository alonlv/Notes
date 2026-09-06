# Household Assistant — web app

Browser UI for the household assistant: notes, tasks, the voucher wallet, automations,
memories, calendar connections and admin configuration.

Built with Next.js 16 / React 19, Auth.js, TanStack Query v5, Tiptap editor, and Tailwind CSS.

## Quick Start

```bash
npm install
npm run dev   # http://localhost:3000
```

Set the backend and auth configuration in `.env.local`:

```env
# Where the FastAPI backend lives, and the token used to reach it.
BACKEND_URL=http://localhost:8000
# BACKEND_INTERNAL_URL=…        # optional: private URL for server-to-server calls
APP_API_TOKEN=your-token

# Google sign-in. AUTH_SECRET: openssl rand -base64 32
AUTH_SECRET=…
AUTH_GOOGLE_ID=…
AUTH_GOOGLE_SECRET=…
```

Who may sign in is configured on the **backend** (`GOOGLE_EMAIL_MAP`), not here — see below.

## Authentication

Sign-in is Google via Auth.js. There is no password and no shared secret.

On sign-in the app posts the Google account to the backend's `/contacts/link-google`, which
decides whether that email is allowed and returns the canonical person id (`person:alon`). The
backend holds the only allowlist, so the two halves cannot drift out of agreement about who is
allowed in. A rejected account lands back on `/login` with an explanation.

The resolved person id rides on the signed session. Every proxied API call sends it as
`X-Person-Id`, which is the **only** thing the backend trusts to say who the caller is —
nothing reads an identity out of the request itself, so a browser cannot ask for another
person's data.

Middleware gates every page and API route on a valid session: pages redirect to `/login`,
API routes answer `401` so the client can handle it.

## Features

### Notes
Rich-text note editor (Tiptap). Notes are grouped by topic. Filter by topic using the pill
selector; search by title, content, or topic.

### Tasks
Task list with priorities, statuses (`todo` / `in_progress` / `done`), and optional due dates.
Switch between list view and Kanban board. Overdue tasks are highlighted.

### Wallet
Gift cards, store credit and coupons. Paste what the voucher says and the backend parses it into
structured fields and files it under a category — no form-filling. Tracks remaining balance,
warns on imminent expiry, and copies codes to the clipboard.

Vouchers default to **household** scope (both members see them); the add form has a toggle for a
private one.

### Automations
Reminders (one-off or cron) and monitors — background tasks the agent runs on a schedule and
reports on only when there is something worth saying.

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

### Calendar
Connect your own Google or Apple calendar. Each person connects their own; there is no shared
household calendar — a household event goes on its creator's calendar and invites the other member.

### Admin
Runtime configuration for the backend:
- **General** — agent name, timezone, tool rounds, organizer info
- **Prompt** — override system prompts without redeploying
- **Providers** — add / edit / reorder LLM providers with drag-and-drop
- **Contacts** — view the contact registry; set a per-user LLM override
- **Background** — job status and the cloud/local router split

## Scope

What you see is your own data plus anything the household shares with you. That is enforced
server-side by the ACL (`owner_id` / `authorized_ids`), not by the UI.

Items created here are **private** to you — the web is a private surface, like a DM. Shared items
come from the Telegram group chat (or from the wallet, which is shared by default).

There is no way to view or act as another person. That used to exist as a sidebar contact
switcher and was removed: it let any signed-in browser read anyone's data.

## Per-User LLM Override

Inside the **Contacts** tab, expand any contact and use the **Model override** section to assign a
different LLM provider to that person. Fields: `base_url`, `model`, `api_key`. The override is
saved in `contact.attributes.llm_providers` — encrypted at rest, since it carries an API key — and
picked up by the backend for every message from that contact.

## API Routes

All backend calls go through Next.js route handlers under `/api/` so the API token stays
server-side and `X-Person-Id` is set from the session rather than the request:

| Route | Description |
|---|---|
| `/api/auth/[...nextauth]` | Auth.js sign-in / sign-out / session |
| `/api/notes`, `/api/notes/[id]` | Notes CRUD |
| `/api/tasks`, `/api/tasks/[id]`, `/api/tasks/tags` | Tasks CRUD |
| `/api/topics`, `/api/topics/[id]` | Topics CRUD |
| `/api/vouchers`, `/api/vouchers/[id]` | Wallet: list / add / remove |
| `/api/vouchers/[id]/spend` | Record a partial or full redemption |
| `/api/vouchers/rules` | Regex recognition rules |
| `/api/automations`, `/api/automations/[id]` | Reminders and monitors |
| `/api/memories`, `/api/memories/[id]` | Memory CRUD |
| `/api/memories/graph` | The memory graph: nodes, links, clusters and stats |
| `/api/chat`, `/api/chat/history` | Browser chat |
| `/api/calendars/connection-status` | Which calendar is connected |
| `/api/calendars/google-auth`, `/api/calendars/google/disconnect` | Google Calendar |
| `/api/calendars/apple/setup`, `/api/calendars/apple/disconnect` | Apple Calendar |
| `/api/admin/*` | Runtime config, contacts, background status |

## Project Structure

```
src/
├── app/
│   ├── (main)/           Pages (notes, tasks, vouchers, automations, memories, calendar, admin)
│   ├── login/            Google sign-in
│   └── api/              Next.js route handlers (proxy to the backend)
├── components/
│   ├── layout/           Sidebar, bottom nav, app shell
│   ├── notes/            NoteList, NoteCard, TopicFilter
│   ├── tasks/            TaskList, KanbanView, AddTaskInput
│   ├── vouchers/         VoucherCard, AddVoucherForm
│   └── ui/               Shared UI primitives + ScheduledItemForm
├── context/
│   └── user-context.tsx  useCurrentPerson — reads the signed-in person from the session
├── hooks/                TanStack Query hooks (use-notes, use-tasks, use-vouchers, …)
├── lib/
│   ├── auth.ts           Auth.js config; links Google accounts to canonical persons
│   ├── proxy.ts          Server-side fetch that attaches the bearer + X-Person-Id
│   └── api.ts            Typed API client
└── types/
    └── api.ts            Shared TypeScript types (Note, Task, Voucher, …)
```

## Tests

```bash
npm run typecheck
npx playwright test      # hermetic: the backend is stubbed at the network layer
```

The E2E suite mints a genuine signed Auth.js session cookie rather than stubbing the session, so
the middleware check under test is the real one — only the trip to Google is bypassed.
