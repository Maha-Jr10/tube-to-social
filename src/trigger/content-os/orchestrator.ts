import { schemaTask } from "@trigger.dev/sdk";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { extractVideoId, fetchTranscript, fetchVideoMeta } from "../../lib/transcript.js";
import { appendEntry, buildSearchIndex } from "../../lib/content-db.js";
import { researchAgent } from "./research-agent.js";
import { strategyAgent } from "./strategy-agent.js";
import { copywriterAgent } from "./copywriter-agent.js";
import type { BrandInfo, VideoMeta, OrchestratorOutput } from "../../lib/types.js";
import { schedulePosts } from "./publisher/schedule-posts.js";
import type { postNewsletter } from "./publisher/post-newsletter.js";
import { tasks } from "@trigger.dev/sdk";

// ─── Zod schema for payload validation ───────────────────────────────────────

const BrandSchema = z.object({
  name: z.string().min(1),
  handle: z.string().default(""),
  primaryColor: z.string().default("#2563EB"),
  accentColor: z.string().default("#F59E0B"),
  fontFamily: z.string().default("Inter, sans-serif"),
  tone: z.string().default("professional but approachable"),
  niche: z.string().min(1),
  targetAudience: z.string().min(1),
  ctaUrl: z.string().default(""),
});

const OrchestratorSchema = z.object({
  videoUrl: z.string().url(),
  brand: BrandSchema,
});

// ─── File writing helpers ─────────────────────────────────────────────────────

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function writeFile(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, "utf-8");
}

// ─── Main orchestrator task ───────────────────────────────────────────────────

export const orchestrator = schemaTask({
  id: "content-os-orchestrator",
  schema: OrchestratorSchema,
  retry: { maxAttempts: 1 },
  run: async (payload): Promise<OrchestratorOutput> => {
    const outputBase = process.env.OUTPUT_DIR ?? "./output";

    // ── Step 1: Extract video ID and fetch metadata ──────────────────────────
    const videoId = extractVideoId(payload.videoUrl);
    console.log(`Processing video: ${videoId}`);

    const { title, channelName } = await fetchVideoMeta(videoId);
    const videoMeta: VideoMeta = {
      videoId,
      videoUrl: payload.videoUrl,
      title,
      channelName,
    };
    const brand = payload.brand as BrandInfo;

    // ── Step 2: Fetch transcript ─────────────────────────────────────────────
    console.log("Fetching transcript...");
    const transcript = await fetchTranscript(videoId);
    console.log(`Transcript: ${transcript.length} chars`);

    // ── Step 3: Research Agent ───────────────────────────────────────────────
    console.log("Running Research Agent...");
    const researchResult = await researchAgent.triggerAndWait({ transcript, videoMeta, brand });
    if (!researchResult.ok) throw new Error(`Research Agent failed: ${researchResult.error}`);
    const knowledgeBase = researchResult.output;
    console.log(`KnowledgeBase: ${knowledgeBase.coreIdeas.length} ideas, ${knowledgeBase.rawHooks.length} hooks`);

    // ── Step 4: Strategy Agent ───────────────────────────────────────────────
    console.log("Running Strategy Agent...");
    const strategyResult = await strategyAgent.triggerAndWait({ knowledgeBase, brand });
    if (!strategyResult.ok) throw new Error(`Strategy Agent failed: ${strategyResult.error}`);
    const strategy = strategyResult.output;
    console.log(`Strategy: ${strategy.contentPillars.length} pillars, ${strategy.thirtyDayCalendar.length} calendar days`);

    // ── Step 5: Copywriter Agent ─────────────────────────────────────────────
    console.log("Running Copywriter Agent...");
    const copyResult = await copywriterAgent.triggerAndWait({ knowledgeBase, strategy, brand });
    if (!copyResult.ok) throw new Error(`Copywriter Agent failed: ${copyResult.error}`);
    const copy = copyResult.output;
    console.log(
      `Copy: ${copy.linkedinPosts.length} LinkedIn, ${copy.xPosts.length} X, 1 newsletter`
    );

    // ── Step 6: Write output files ───────────────────────────────────────────
    const outputDir = path.join(outputBase, videoId);
    const writtenFiles: string[] = [];

    const track = (p: string) => { writtenFiles.push(p); return p; };

    // meta.json
    const metaPath = track(path.join(outputDir, "meta.json"));
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
          processedAt: new Date().toISOString(),
          stats: {
            linkedinPosts: copy.linkedinPosts.length,
            xPosts: copy.xPosts.length,
            newsletterSections: copy.newsletter.sections.length,
            contentPillars: strategy.contentPillars.length,
            hooks: 25,
            calendarDays: strategy.thirtyDayCalendar.length,
          },
        },
        null,
        2
      )
    );

    // knowledge-base.json
    await writeFile(
      track(path.join(outputDir, "knowledge-base.json")),
      JSON.stringify(knowledgeBase, null, 2)
    );

    // content-strategy.json
    await writeFile(
      track(path.join(outputDir, "content-strategy.json")),
      JSON.stringify(strategy, null, 2)
    );

    // Newsletter
    const nlLines: string[] = [
      `# ${copy.newsletter.subject}`,
      `**Preview:** ${copy.newsletter.previewText}`,
      `**Word count:** ${copy.newsletter.wordCount}`,
      "",
      "---",
      "",
    ];
    for (const section of copy.newsletter.sections) {
      nlLines.push(`## ${section.heading}`, "", section.body, "", "---", "");
    }
    await writeFile(
      track(path.join(outputDir, "content", "newsletter.md")),
      nlLines.join("\n")
    );

    // LinkedIn posts
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
        `Pillar: ${post.pillar} | Calendar day: ${post.calendarDay} | Chars: ${post.characterCount}`,
      ];
      await writeFile(
        track(path.join(outputDir, "content", "linkedin", `post-${num}.txt`)),
        lines.join("\n")
      );
    }

    // X posts
    for (const post of copy.xPosts) {
      const num = post.id.replace("x-", "");
      let content: string;
      if (post.isThread && post.threadParts && post.threadParts.length > 0) {
        content = post.threadParts.join("\n\n---\n\n");
        content += `\n\n---\nThread | ${post.threadParts.length} parts | Calendar day: ${post.calendarDay}`;
      } else {
        content = `${post.text}\n\n---\nChars: ${post.characterCount} | Calendar day: ${post.calendarDay}`;
      }
      await writeFile(
        track(path.join(outputDir, "content", "x-posts", `post-${num}.txt`)),
        content
      );
    }

    // Hook library as a browsable markdown file
    const hookLines: string[] = ["# Hook Library", "", `*From: ${knowledgeBase.videoTitle}*`, ""];
    const categories = [
      ["curiosity", "Curiosity"],
      ["authority", "Authority"],
      ["controversy", "Controversy"],
      ["mistakes", "Mistakes"],
      ["predictions", "Predictions"],
    ] as const;
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
      track(path.join(outputDir, "hook-library.md")),
      hookLines.join("\n")
    );

    // ── Step 7: Schedule posts to all platforms ──────────────────────────────
    await schedulePosts.trigger({ linkedinPosts: copy.linkedinPosts, xPosts: copy.xPosts, brand });

    // Newsletter fires on calendar day 15 — 15 days from tomorrow at 11am UTC
    const newsletterDate = new Date();
    newsletterDate.setUTCDate(newsletterDate.getUTCDate() + 15);
    newsletterDate.setUTCHours(11, 0, 0, 0);
    await tasks.trigger<typeof postNewsletter>(
      "post-newsletter",
      { newsletter: copy.newsletter, brand },
      { delay: newsletterDate }
    );

    console.log("Posts scheduled across LinkedIn, X, Facebook, and Instagram");

    // ── Step 8: Save to content database ────────────────────────────────────
    await appendEntry({
      videoId,
      videoUrl: payload.videoUrl,
      videoTitle: knowledgeBase.videoTitle,
      processedAt: new Date().toISOString(),
      brand,
      knowledgeBase,
      qaScore: 0,
      tags: [brand.niche, ...strategy.contentPillars.map((p) => p.name)],
      searchIndex: buildSearchIndex(knowledgeBase, brand.niche),
    });

    console.log(`Done. Output at: ${outputDir}`);
    console.log(`Files written: ${writtenFiles.length}`);

    return {
      videoId,
      outputDir,
      files: writtenFiles,
      processedAt: new Date().toISOString(),
    };
  },
});
