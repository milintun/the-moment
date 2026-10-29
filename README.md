# The Moment

An online, publicly curated digital museum for contemporary art. Anyone can post art to week-long galleries, upvote what resonates, and nominate the galleries that open next. Past seasons are kept in the archive.

**Live app:** https://the-moment.mit-sdg.dev

## Project materials

- **[FINAL Video demo](https://youtu.be/js_cuW7_Skk)**
- **Design**
  - [FINAL Design doc](design/submit/design_doc.md)
  - [P1: problem framing and design](design/submit/P1_Design.md)
  - [P2: user journey](design/submit/P2_user_journey.md)
  - [Visual design study (PDF)](<design/submit/the moment visual design study.pdf>)
- **Specification**
  - Concepts: [Authenticating](design/concepts/Authenticating.md), [Sessioning](design/concepts/Sessioning.md), [Administrating](design/concepts/Administrating.md), [Posting](design/concepts/Posting.md), [Uploading](design/concepts/Uploading.md), [Upvoting](design/concepts/Upvoting.md), [Grouping](design/concepts/Grouping.md), [Cycling](design/concepts/Cycling.md), [Nominating](design/concepts/Nominating.md)
  - Compositions (the API): [Public](design/compositions/Public.md), [User](design/compositions/User.md), [Admin](design/compositions/Admin.md)
  - [Shared types](design/types.md)
- **Tests:** [manifest of what each test covers](tests/MANIFEST.md)

## Code layout

| Path | What's there |
| --- | --- |
| `design/` | the spec: change it before the code |
| `src/` | backend: concepts, compositions, and the server (`src/main.ts`) |
| `web/` | frontend: Vue 3 + Vite |
| `tests/`, `web/tests/`, `e2e/` | backend, frontend, and end-to-end tests |
| `scripts/` | seed data and maintenance scripts |

## Running locally

You'll need [Bun](https://bun.sh) and [Podman](https://podman.io) with `podman compose`. Podman runs MongoDB and RustFS (local S3 storage).

```sh
bun install
cp .env.example .env              # local defaults; works as is
bun run dev                       # MongoDB + storage, then backend :3000 and frontend :8080 in watch mode
```

Open http://127.0.0.1:8080.

**Optional seed data:**

```sh
bun scripts/seed-galleries.ts     # sample galleries with posts and votes
bun scripts/seed-nominations.ts   # sample accounts (password123) and nominations
```

**Admin access:** register an account in the app, then set `OWNER=<username>` in `.env` and restart. That account becomes the owner if there isn't one yet.

**Other commands:**

| Command | What it does |
| --- | --- |
| `bun run build` | builds the frontend into `web/dist` |
| `bun run preview` | builds, then serves the frontend and API together on :3000, the way it runs when deployed |
| `bun run up` / `bun run down` | runs or stops everything in containers |
| `bun run db:reset` | deletes all local data |

## Testing

Start the database first with `bun run db:up`. The first time you run the end-to-end tests, install the browser with `bunx playwright install chromium`.

| Command | What it runs |
| --- | --- |
| `bun run test` | backend tests, on a separate `themoment_test` database |
| `bun run test:web` | frontend component tests (Vitest) |
| `bun run test:e2e` | builds, then runs the end-to-end browser tests (Playwright) |
| `bun run test:all` | all three |
| `bun run check` | type and spec checks |

**When you change the design:** edit `design/` first, then run `bun run check:design`, `bun run generate`, and `bun run check`.

## Deploying

The `Dockerfile` builds the app; start it with `bun src/main.ts`. That one server serves the API, the built frontend, and `/health`.

Set `MONGODB_URL`, the `S3_*` variables from `.env.example`, and `PUBLIC_ORIGIN` (the app's public address; API requests from any other origin are refused). The health check passes only while MongoDB is reachable.
