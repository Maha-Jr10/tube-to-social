# AI Content Factory

A fully automated content engine that turns a single YouTube video into 30 days of scheduled social media posts and a newsletter broadcast — running as durable background jobs on Trigger.dev.

You give it a YouTube URL and a brand profile. It fetches the transcript, runs three AI agents (Research → Strategy → Copywriter), schedules LinkedIn and X posts across a 30-day calendar, and sends a newsletter to your Resend audience on day 15.

---

## What it produces (per video)

- **15 LinkedIn posts** — hook + body + CTA + hashtags, one every 3 days
- **30 X/Twitter posts** — mix of single tweets and threads
- **1 newsletter** — 5-section email broadcast sent via Resend on day 15
- **25-hook library** — categorised by type (curiosity, authority, controversy, mistakes, predictions)
- **30-day content calendar** — each day mapped to a pillar, angle, and format
- **All files saved locally** under `output/{videoId}/`

---

## How it works

```
YouTube URL + Brand Profile
        │
        ▼
┌──────────────────────┐
│     Orchestrator     │  Validates input, fetches transcript + video metadata
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│    Research Agent    │  Extracts ideas, hooks, quotes, stats, frameworks, contrarian opinions
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│    Strategy Agent    │  Builds content pillars, hook library, 30-day calendar
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Copywriter Agent   │  Writes all LinkedIn posts, X posts, and newsletter
└──────────┬───────────┘
           │
           ├──→ Writes output files to disk
           │
           ├──→ [Schedule Posts]    Queues LinkedIn + X + Facebook + Instagram with 3-day delays
           │
           └──→ [Post Newsletter]   Queues Resend broadcast for day 15 (15 days from now at 11am UTC)
```

Every step is a Trigger.dev task. Failures auto-retry with exponential backoff. The delayed post runs are checkpointed — they don't consume compute while waiting.

---

## Pipeline in detail

### Orchestrator (`content-os-orchestrator`)

Entry point. Validates the payload with Zod, extracts the YouTube video ID, fetches the transcript and video title via the oEmbed API, then calls each agent in sequence using `triggerAndWait`. After all agents complete, it writes output files and queues the publisher tasks.

### Research Agent (`research-agent`)

Sends the transcript (up to 12,000 chars) to the LLM and extracts a structured `KnowledgeBase`:

| Field | Description |
|---|---|
| `coreIdeas` (5–8) | Key insights, each with an explanation and 3 content angles |
| `frameworks` (0–5) | Step-by-step processes or methodologies mentioned |
| `stories` (0–3) | Protagonist, challenge, resolution, lesson |
| `quotes` (3–8) | Verbatim or near-verbatim quotable lines with attribution |
| `contrarianOpinions` (3–6) | Claims that challenge mainstream thinking |
| `rawHooks` (10–15) | Ready-to-use hook sentences grounded in the actual video |
| `keyStats` | Every number and data point mentioned |

### Strategy Agent (`strategy-agent`)

Takes the `KnowledgeBase` and the brand profile, produces a `ContentStrategy`:

| Field | Description |
|---|---|
| `contentPillars` (3–5) | Thematic buckets — each with key messages and post types |
| `hookLibrary` | 25 hooks across 5 categories: curiosity, authority, controversy, mistakes, predictions |
| `thirtyDayCalendar` | 30 entries, each with platform, pillar, angle, format, and CTA. Day 7 + 21 = carousel; day 15 = newsletter |

### Copywriter Agent (`copywriter-agent`)

Produces all copy in three parallel LLM calls:

**LinkedIn posts (15):** Each post has a hook, body, CTA, and hashtags. Tied to a specific calendar day and content pillar. Character count tracked.

**X posts (30):** Each post is either a single tweet or a thread (array of parts). The agent decides based on the content angle.

**Newsletter (1):** Five sections — intro, main insight, framework, story, CTA. Word count calculated after generation.

### Output files

```
output/{videoId}/
├── meta.json                      ← run summary (stats, timestamps, brand)
├── knowledge-base.json            ← full Research Agent output
├── content-strategy.json          ← full Strategy Agent output
├── hook-library.md                ← 25 hooks formatted for easy reading
├── content/
│   ├── newsletter.md              ← newsletter draft in Markdown
│   ├── linkedin/
│   │   └── li-01.md … li-15.md   ← one file per post
│   └── x/
│       └── x-01.md … x-30.md     ← one file per post
└── (content-db.json lives at data/content-db.json, shared across all runs)
```

### Schedule Posts (`schedule-posts`)

Triggers a delayed Trigger.dev run for each post:
- **First slot:** tomorrow at 11:00 UTC
- **Subsequent slots:** every 3 days
- LinkedIn, Facebook, and Instagram fire on the same slot (LinkedIn text is reused)
- X posts fire on the same slot independently
- Facebook and Instagram are skipped silently if their env vars are missing

### Post Newsletter (`post-newsletter`)

Fires 15 days from the run date at 11:00 UTC. Builds a responsive HTML email from the newsletter sections using the brand's primary and accent colors, then:
1. Creates a broadcast via `POST /broadcasts`
2. Sends it via `POST /broadcasts/{id}/send`

The unsubscribe link uses Resend's `{{unsubscribe_url}}` template variable, which Resend fills in automatically.

### Content Database

Every run appends an entry to `data/content-db.json` — a local searchable index of all processed videos, with full knowledge base, brand info, and a keyword search index. Used for deduplication and lookup across runs.

---

## Tech stack

| Layer | Technology |
|---|---|
| Task runtime | [Trigger.dev](https://trigger.dev) v4 — durable background jobs with retries, delays, checkpointing |
| Language | TypeScript (ESM modules, Node.js 20+) |
| LLM | [OpenRouter](https://openrouter.ai) — `google/gemma-4-31b-it:free` by default |
| HTTP client | Native `fetch` — no axios |
| Social — LinkedIn | LinkedIn REST API v2 (`/rest/posts`) |
| Social — X / Twitter | `twitter-api-v2` SDK (v2 API) |
| Social — Facebook | Meta Graph API v19 (`/{page-id}/feed`) |
| Social — Instagram | Meta Graph API v19 (container → publish flow) |
| Image generation | `sharp` — SVG template rendered to 1080×1080 JPEG |
| Image hosting | imgbb (Instagram requires a public image URL) |
| Email | [Resend](https://resend.com) Broadcasts API |
| JSON validation | `zod` (orchestrator payload) |
| JSON repair | `jsonrepair` (handles malformed LLM JSON output) |
| Transcript | `youtube-transcript` |

---

## Project structure

```
src/
├── lib/
│   ├── types.ts              ← all shared TypeScript interfaces
│   ├── claude.ts             ← OpenRouter client — callClaude() and callClaudeJson()
│   ├── transcript.ts         ← YouTube transcript fetch + oEmbed metadata
│   ├── content-db.ts         ← append / read / search content database
│   └── image-generator.ts   ← sharp-based SVG → JPEG (used by Instagram)
│
└── trigger/
    └── content-os/
        ├── orchestrator.ts         ← entry point, chains all agents
        ├── research-agent.ts       ← Agent 1: KnowledgeBase extraction
        ├── strategy-agent.ts       ← Agent 2: ContentStrategy + 30-day calendar
        ├── copywriter-agent.ts     ← Agent 3: LinkedIn + X posts + newsletter copy
        └── publisher/
            ├── schedule-posts.ts   ← queues delayed runs for all platforms
            ├── post-linkedin.ts    ← LinkedIn REST API post
            ├── post-x.ts          ← X/Twitter tweet or thread
            ├── post-facebook.ts   ← Facebook Page feed post
            ├── post-instagram.ts  ← Instagram image + caption (sharp + imgbb)
            └── post-newsletter.ts ← Resend broadcast (HTML email build + send)
```

---

## Environment variables

### Required — always

| Variable | Where to get it |
|---|---|
| `TRIGGER_SECRET_KEY` | cloud.trigger.dev → your project → Settings → API Keys |
| `TRIGGER_PROJECT_REF` | Same page |
| `OPENROUTER_API_KEY` | openrouter.ai → Keys → Create Key |

### Optional — LLM model

| Variable | Default | Notes |
|---|---|---|
| `OPENROUTER_MODEL` | `google/gemma-4-31b-it:free` | Any OpenRouter model ID. Append `:free` for free-tier models. Other confirmed free options: `moonshotai/kimi-k2.6:free`, `nvidia/nemotron-3-super-120b-a12b:free` |

### LinkedIn

| Variable | How to get it |
|---|---|
| `LINKEDIN_ACCESS_TOKEN` | developers.linkedin.com → your app → Auth → OAuth 2.0 tools → generate token with scope `w_member_social` |
| `LINKEDIN_PERSON_URN` | `GET https://api.linkedin.com/v2/userinfo` with your token → use the `sub` field → format as `urn:li:person:{sub}` |

### X / Twitter

| Variable | How to get it |
|---|---|
| `X_API_KEY` | developer.twitter.com → your app → Keys and Tokens |
| `X_API_SECRET` | Same |
| `X_ACCESS_TOKEN` | Same — app must have **Read and Write** permissions |
| `X_ACCESS_TOKEN_SECRET` | Same |

### Facebook (optional — leave blank to skip)

| Variable | How to get it |
|---|---|
| `FACEBOOK_PAGE_ID` | facebook.com/your-page → About → Page ID |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | developers.facebook.com → Graph API Explorer → select your page → Generate Token with scope `pages_manage_posts` |

### Instagram (optional — leave blank to skip, requires Facebook vars above)

| Variable | How to get it |
|---|---|
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Graph API Explorer → `GET /{page-id}?fields=instagram_business_account` → grab the nested `id` |
| `IMGBB_API_KEY` | imgbb.com → API → copy your key (free) |

### Newsletter — Resend

| Variable | How to get it |
|---|---|
| `RESEND_API_KEY` | resend.com → API Keys → Create Key (needs full access, not send-only) |
| `RESEND_AUDIENCE_ID` | resend.com → Audiences → your audience UUID. Or call `GET https://api.resend.com/audiences` with your key |
| `RESEND_FROM_EMAIL` | `"Brand Name <you@yourdomain.com>"` — domain must be verified in Resend under Domains |

### Output

| Variable | Default | Notes |
|---|---|---|
| `OUTPUT_DIR` | `./output` | Where output files are written locally. In Trigger.dev cloud, containers are ephemeral — use a mounted volume or cloud storage path for persistent output in production |

---

## Local setup

### Prerequisites

- Node.js 20+
- A Trigger.dev account (free tier is enough)
- API keys for the platforms you want to publish to

### Install

```bash
npm install
```

### Configure

Fill in `.env` with at minimum:

```
TRIGGER_SECRET_KEY=...
TRIGGER_PROJECT_REF=...
OPENROUTER_API_KEY=...
LINKEDIN_ACCESS_TOKEN=...
LINKEDIN_PERSON_URN=...
X_API_KEY=...
X_API_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_TOKEN_SECRET=...
RESEND_API_KEY=...
RESEND_AUDIENCE_ID=...
RESEND_FROM_EMAIL=...
```

Facebook and Instagram are optional — leave them blank to skip those platforms silently.

### Start the dev server

```bash
npm run dev
```

This starts the Trigger.dev local worker, connects to Trigger.dev cloud, and listens for runs to execute on your machine. Keep it running while you test.

---

## Triggering a run

Go to [cloud.trigger.dev](https://cloud.trigger.dev) → your project → **Tasks** → `content-os-orchestrator` → **Test**.

Paste this payload and fill in your values:

```json
{
  "videoUrl": "https://www.youtube.com/watch?v=YOUR_VIDEO_ID",
  "brand": {
    "name": "Your Brand",
    "handle": "@yourbrand",
    "niche": "AI tools / productivity",
    "targetAudience": "founders and indie developers",
    "tone": "professional but approachable",
    "ctaUrl": "https://yoursite.com",
    "primaryColor": "#2563EB",
    "accentColor": "#F59E0B"
  }
}
```

Click **Run test**. Watch the terminal running `npm run dev` for live logs. A full run takes roughly 5–8 minutes depending on LLM response times.

**The video must have captions enabled.** Private, age-restricted, and caption-free videos will fail at the transcript step.

---

## Viewing scheduled posts

**Trigger.dev dashboard** — Runs → filter by status **Delayed**. Each queued post appears as a separate run with its scheduled fire time and full payload (the post content).

**Local files** — `output/{videoId}/content/` contains every post as a plain `.md` file, readable without the dashboard.

---

## Deploying to production

> Always test locally with at least one successful run before deploying.

### Pre-deploy checklist

- [ ] Every env var from `.env` added to cloud.trigger.dev → your project → **Environment Variables** (add to both staging and production)
- [ ] At least one local run succeeded end-to-end
- [ ] `.env` is in `.gitignore` (never commit secrets)

### Deploy

Push to `master` — GitHub Actions runs `.github/workflows/deploy.yml` and deploys automatically:

```bash
git push origin master
```

### Verify

After deploying, go to Trigger.dev → Runs and trigger a test run from the dashboard. Check that the first run completes successfully and that delayed post runs appear in the queue.

---

## Rate limits

| Service | Free limit | Approx. runs/day |
|---|---|---|
| OpenRouter `:free` models | ~200 requests/day | ~25–40 pipeline runs |
| Trigger.dev | 50,000 task runs/month | Well above any normal usage |
| LinkedIn API | No hard limit | Token expires every 60 days — regenerate manually |
| X API (free) | 1,500 posts/month | ~50 full pipeline runs |
| Resend | 3,000 emails/month on free | ~200 newsletter broadcasts |
| imgbb | Unlimited | Free image hosting |

To lift the OpenRouter request limit, remove `:free` from the model name and add credits to your account. A full pipeline run costs a fraction of a cent with most models.

---

## Adding a new platform

1. Create `src/trigger/content-os/publisher/post-{platform}.ts` modelled on `post-linkedin.ts`
2. Export a task with `id: "post-{platform}"`
3. In `schedule-posts.ts`, add inside the slot loop:
   ```ts
   import type { postPlatform } from "./post-platform.js";
   // ...
   await tasks.trigger<typeof postPlatform>("post-platform", { post: li, brand }, { delay });
   ```
4. Add the required env vars to `.env` with comments explaining where to find them
5. In `schedule-posts.ts`, guard with a presence check so missing credentials skip silently:
   ```ts
   const hasPlatform = !!process.env.PLATFORM_KEY;
   if (hasPlatform) await tasks.trigger(...);
   ```

---

## License

MIT
