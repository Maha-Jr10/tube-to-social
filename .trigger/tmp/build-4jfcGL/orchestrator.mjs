import {
  schedulePosts
} from "./chunk-HZEQSPAG.mjs";
import {
  researchAgent
} from "./chunk-OYO5O7IE.mjs";
import {
  strategyAgent
} from "./chunk-DHYG4D5G.mjs";
import {
  copywriterAgent
} from "./chunk-HPCGOW43.mjs";
import "./chunk-PZR6WYVR.mjs";
import {
  external_exports,
  schemaTask,
  tasks
} from "./chunk-O2EOSSNY.mjs";
import "./chunk-QKPJMX6P.mjs";
import {
  __name,
  init_esm
} from "./chunk-GADV3JWJ.mjs";

// src/trigger/content-os/orchestrator.ts
init_esm();
import { promises as fs2 } from "fs";
import path2 from "path";

// src/lib/transcript.ts
init_esm();
var MAX_TRANSCRIPT_CHARS = 12e3;
function extractVideoId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.slice(1).split("?")[0];
      if (!id) throw new Error("Empty video ID in youtu.be URL");
      return id;
    }
    const v = parsed.searchParams.get("v");
    if (!v) throw new Error("No 'v' parameter found in YouTube URL");
    return v;
  } catch (err) {
    if (err instanceof Error && err.message.includes("Invalid URL")) {
      throw new Error(`Invalid YouTube URL: ${url}`);
    }
    throw err;
  }
}
__name(extractVideoId, "extractVideoId");
async function fetchTranscript(videoId) {
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) throw new Error("SUPADATA_API_KEY is not set");
  let res;
  try {
    res = await fetch(`https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=true`, {
      headers: { "x-api-key": apiKey }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Network error fetching transcript for ${videoId}: ${msg}`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Could not fetch transcript for video ${videoId}. The video may have no captions, be private, or age-restricted. Status: ${res.status}. ${body}`
    );
  }
  const data = await res.json();
  if (!data.content) {
    throw new Error(`No transcript returned for video ${videoId}`);
  }
  const full = data.content.replace(/\[.*?\]/g, "").replace(/\s+/g, " ").trim();
  if (full.length <= MAX_TRANSCRIPT_CHARS) return full;
  return full.slice(0, MAX_TRANSCRIPT_CHARS) + " [transcript truncated for length]";
}
__name(fetchTranscript, "fetchTranscript");
async function fetchVideoMeta(videoId) {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch%3Fv%3D${videoId}&format=json`;
    const res = await fetch(url);
    if (!res.ok) return { title: "Untitled", channelName: "Unknown" };
    const data = await res.json();
    return { title: data.title, channelName: data.author_name };
  } catch {
    return { title: "Untitled", channelName: "Unknown" };
  }
}
__name(fetchVideoMeta, "fetchVideoMeta");

// src/lib/content-db.ts
init_esm();
import { promises as fs } from "fs";
import path from "path";
var DB_PATH = path.resolve(process.cwd(), "data", "content-db.json");
async function readDb() {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { version: "1.0", lastUpdated: (/* @__PURE__ */ new Date()).toISOString(), entries: [] };
  }
}
__name(readDb, "readDb");
async function writeDb(db) {
  const dir = path.dirname(DB_PATH);
  await fs.mkdir(dir, { recursive: true });
  const tmpPath = DB_PATH + ".tmp";
  await fs.writeFile(tmpPath, JSON.stringify(db, null, 2), "utf-8");
  await fs.rename(tmpPath, DB_PATH);
}
__name(writeDb, "writeDb");
async function appendEntry(entry) {
  const db = await readDb();
  db.entries = db.entries.filter((e) => e.videoId !== entry.videoId);
  db.entries.push(entry);
  db.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
  await writeDb(db);
}
__name(appendEntry, "appendEntry");
function buildSearchIndex(kb, niche) {
  return {
    allIdeas: kb.coreIdeas.map((c) => c.idea),
    allFrameworkNames: kb.frameworks.map((f) => f.name),
    allQuotes: kb.quotes.map((q) => q.text),
    allHooks: kb.rawHooks,
    niche,
    keywords: [
      ...kb.coreIdeas.flatMap((c) => c.idea.split(" ").filter((w) => w.length > 5)),
      ...kb.keyStats
    ].filter(Boolean).slice(0, 20)
  };
}
__name(buildSearchIndex, "buildSearchIndex");

// src/trigger/content-os/orchestrator.ts
var BrandSchema = external_exports.object({
  name: external_exports.string().min(1),
  handle: external_exports.string().default(""),
  primaryColor: external_exports.string().default("#2563EB"),
  accentColor: external_exports.string().default("#F59E0B"),
  fontFamily: external_exports.string().default("Inter, sans-serif"),
  tone: external_exports.string().default("professional but approachable"),
  niche: external_exports.string().min(1),
  targetAudience: external_exports.string().min(1),
  ctaUrl: external_exports.string().default("")
});
var OrchestratorSchema = external_exports.object({
  videoUrl: external_exports.string().url(),
  brand: BrandSchema
});
async function ensureDir(dir) {
  await fs2.mkdir(dir, { recursive: true });
}
__name(ensureDir, "ensureDir");
async function writeFile(filePath, content) {
  await ensureDir(path2.dirname(filePath));
  await fs2.writeFile(filePath, content, "utf-8");
}
__name(writeFile, "writeFile");
var orchestrator = schemaTask({
  id: "content-os-orchestrator",
  schema: OrchestratorSchema,
  retry: { maxAttempts: 1 },
  run: /* @__PURE__ */ __name(async (payload) => {
    const outputBase = process.env.OUTPUT_DIR ?? "./output";
    const videoId = extractVideoId(payload.videoUrl);
    console.log(`Processing video: ${videoId}`);
    const { title, channelName } = await fetchVideoMeta(videoId);
    const videoMeta = {
      videoId,
      videoUrl: payload.videoUrl,
      title,
      channelName
    };
    const brand = payload.brand;
    console.log("Fetching transcript...");
    const transcript = await fetchTranscript(videoId);
    console.log(`Transcript: ${transcript.length} chars`);
    console.log("Running Research Agent...");
    const researchResult = await researchAgent.triggerAndWait({ transcript, videoMeta, brand });
    if (!researchResult.ok) throw new Error(`Research Agent failed: ${researchResult.error}`);
    const knowledgeBase = researchResult.output;
    console.log(`KnowledgeBase: ${knowledgeBase.coreIdeas.length} ideas, ${knowledgeBase.rawHooks.length} hooks`);
    console.log("Running Strategy Agent...");
    const strategyResult = await strategyAgent.triggerAndWait({ knowledgeBase, brand });
    if (!strategyResult.ok) throw new Error(`Strategy Agent failed: ${strategyResult.error}`);
    const strategy = strategyResult.output;
    console.log(`Strategy: ${strategy.contentPillars.length} pillars, ${strategy.thirtyDayCalendar.length} calendar days`);
    console.log("Running Copywriter Agent...");
    const copyResult = await copywriterAgent.triggerAndWait({ knowledgeBase, strategy, brand });
    if (!copyResult.ok) throw new Error(`Copywriter Agent failed: ${copyResult.error}`);
    const copy = copyResult.output;
    console.log(
      `Copy: ${copy.linkedinPosts.length} LinkedIn, ${copy.xPosts.length} X, 1 newsletter`
    );
    const outputDir = path2.join(outputBase, videoId);
    const writtenFiles = [];
    const track = /* @__PURE__ */ __name((p) => {
      writtenFiles.push(p);
      return p;
    }, "track");
    const metaPath = track(path2.join(outputDir, "meta.json"));
    await writeFile(
      metaPath,
      JSON.stringify(
        {
          videoId,
          videoUrl: payload.videoUrl,
          videoTitle: knowledgeBase.videoTitle,
          channelName,
          brand: brand.name,
          niche: brand.niche,
          processedAt: (/* @__PURE__ */ new Date()).toISOString(),
          stats: {
            linkedinPosts: copy.linkedinPosts.length,
            xPosts: copy.xPosts.length,
            newsletterSections: copy.newsletter.sections.length,
            contentPillars: strategy.contentPillars.length,
            hooks: 25,
            calendarDays: strategy.thirtyDayCalendar.length
          }
        },
        null,
        2
      )
    );
    await writeFile(
      track(path2.join(outputDir, "knowledge-base.json")),
      JSON.stringify(knowledgeBase, null, 2)
    );
    await writeFile(
      track(path2.join(outputDir, "content-strategy.json")),
      JSON.stringify(strategy, null, 2)
    );
    const nlLines = [
      `# ${copy.newsletter.subject}`,
      `**Preview:** ${copy.newsletter.previewText}`,
      `**Word count:** ${copy.newsletter.wordCount}`,
      "",
      "---",
      ""
    ];
    for (const section of copy.newsletter.sections) {
      nlLines.push(`## ${section.heading}`, "", section.body, "", "---", "");
    }
    await writeFile(
      track(path2.join(outputDir, "content", "newsletter.md")),
      nlLines.join("\n")
    );
    for (const post of copy.linkedinPosts) {
      const num = post.id.replace("li-", "");
      const lines = [
        post.hook,
        "",
        post.body,
        "",
        post.cta,
        "",
        post.hashtags.join(" "),
        "",
        `---`,
        `Pillar: ${post.pillar} | Calendar day: ${post.calendarDay} | Chars: ${post.characterCount}`
      ];
      await writeFile(
        track(path2.join(outputDir, "content", "linkedin", `post-${num}.txt`)),
        lines.join("\n")
      );
    }
    for (const post of copy.xPosts) {
      const num = post.id.replace("x-", "");
      let content;
      if (post.isThread && post.threadParts && post.threadParts.length > 0) {
        content = post.threadParts.join("\n\n---\n\n");
        content += `

---
Thread | ${post.threadParts.length} parts | Calendar day: ${post.calendarDay}`;
      } else {
        content = `${post.text}

---
Chars: ${post.characterCount} | Calendar day: ${post.calendarDay}`;
      }
      await writeFile(
        track(path2.join(outputDir, "content", "x-posts", `post-${num}.txt`)),
        content
      );
    }
    const hookLines = ["# Hook Library", "", `*From: ${knowledgeBase.videoTitle}*`, ""];
    const categories = [
      ["curiosity", "Curiosity"],
      ["authority", "Authority"],
      ["controversy", "Controversy"],
      ["mistakes", "Mistakes"],
      ["predictions", "Predictions"]
    ];
    for (const [key, label] of categories) {
      hookLines.push(`## ${label}`, "");
      for (const hook of strategy.hookLibrary[key]) {
        hookLines.push(
          `**${hook.text}**`,
          `- Platform: ${hook.platform}`,
          `- Pillar: ${hook.pillarAlignment}`,
          `- Tip: ${hook.variationTips}`,
          ""
        );
      }
    }
    await writeFile(
      track(path2.join(outputDir, "hook-library.md")),
      hookLines.join("\n")
    );
    await schedulePosts.trigger({ linkedinPosts: copy.linkedinPosts, xPosts: copy.xPosts, brand });
    const newsletterDate = /* @__PURE__ */ new Date();
    newsletterDate.setUTCDate(newsletterDate.getUTCDate() + 15);
    newsletterDate.setUTCHours(11, 0, 0, 0);
    await tasks.trigger(
      "post-newsletter",
      { newsletter: copy.newsletter, brand },
      { delay: newsletterDate }
    );
    console.log("Posts scheduled across LinkedIn, X, Facebook, and Instagram");
    await appendEntry({
      videoId,
      videoUrl: payload.videoUrl,
      videoTitle: knowledgeBase.videoTitle,
      processedAt: (/* @__PURE__ */ new Date()).toISOString(),
      brand,
      knowledgeBase,
      qaScore: 0,
      tags: [brand.niche, ...strategy.contentPillars.map((p) => p.name)],
      searchIndex: buildSearchIndex(knowledgeBase, brand.niche)
    });
    console.log(`Done. Output at: ${outputDir}`);
    console.log(`Files written: ${writtenFiles.length}`);
    return {
      videoId,
      outputDir,
      files: writtenFiles,
      processedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }, "run")
});
export {
  orchestrator
};
//# sourceMappingURL=orchestrator.mjs.map
