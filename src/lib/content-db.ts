import { promises as fs } from "fs";
import path from "path";
import type { ContentDatabase, ContentDBEntry, KnowledgeBase } from "./types.js";

const DB_PATH = path.resolve(process.cwd(), "data", "content-db.json");

export async function readDb(): Promise<ContentDatabase> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw) as ContentDatabase;
  } catch {
    return { version: "1.0", lastUpdated: new Date().toISOString(), entries: [] };
  }
}

async function writeDb(db: ContentDatabase): Promise<void> {
  const dir = path.dirname(DB_PATH);
  await fs.mkdir(dir, { recursive: true });
  const tmpPath = DB_PATH + ".tmp";
  await fs.writeFile(tmpPath, JSON.stringify(db, null, 2), "utf-8");
  await fs.rename(tmpPath, DB_PATH);
}

export async function appendEntry(entry: ContentDBEntry): Promise<void> {
  const db = await readDb();
  db.entries = db.entries.filter((e) => e.videoId !== entry.videoId);
  db.entries.push(entry);
  db.lastUpdated = new Date().toISOString();
  await writeDb(db);
}

export function searchEntries(
  db: ContentDatabase,
  query: string,
  niche?: string
): ContentDBEntry[] {
  const q = query.toLowerCase();
  return db.entries
    .filter((e) => {
      if (niche && !e.searchIndex.niche.toLowerCase().includes(niche.toLowerCase())) return false;
      const idx = e.searchIndex;
      return (
        e.videoTitle.toLowerCase().includes(q) ||
        idx.allIdeas.some((s) => s.toLowerCase().includes(q)) ||
        idx.allFrameworkNames.some((s) => s.toLowerCase().includes(q)) ||
        idx.allQuotes.some((s) => s.toLowerCase().includes(q)) ||
        idx.allHooks.some((s) => s.toLowerCase().includes(q)) ||
        idx.keywords.some((s) => s.toLowerCase().includes(q))
      );
    })
    .slice(0, 10);
}

export function buildSearchIndex(kb: KnowledgeBase, niche: string): ContentDBEntry["searchIndex"] {
  return {
    allIdeas: kb.coreIdeas.map((c) => c.idea),
    allFrameworkNames: kb.frameworks.map((f) => f.name),
    allQuotes: kb.quotes.map((q) => q.text),
    allHooks: kb.rawHooks,
    niche,
    keywords: [
      ...kb.coreIdeas.flatMap((c) => c.idea.split(" ").filter((w) => w.length > 5)),
      ...kb.keyStats,
    ]
      .filter(Boolean)
      .slice(0, 20),
  };
}
