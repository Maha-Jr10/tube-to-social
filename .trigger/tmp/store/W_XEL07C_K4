import {
  callClaudeJson
} from "./chunk-PZR6WYVR.mjs";
import {
  task
} from "./chunk-O2EOSSNY.mjs";
import {
  __name,
  init_esm
} from "./chunk-GADV3JWJ.mjs";

// src/trigger/content-os/research-agent.ts
init_esm();
var researchAgent = task({
  id: "research-agent",
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 5e3, maxTimeoutInMs: 3e4 },
  run: /* @__PURE__ */ __name(async (payload) => {
    const { transcript, videoMeta, brand } = payload;
    const system = `You are an expert content researcher. Extract structured knowledge from YouTube video transcripts. Return ONLY valid JSON matching the schema exactly — no markdown fences, no explanation, just the raw JSON object.`;
    const user = `Extract a complete KnowledgeBase from this YouTube video transcript.

VIDEO URL: ${videoMeta.videoUrl}
VIDEO TITLE: ${videoMeta.title ?? "Unknown"}
BRAND CONTEXT: ${brand.name} creates content for ${brand.targetAudience} in the ${brand.niche} space.

TRANSCRIPT:
${transcript}

Return this exact JSON (no markdown fences, raw JSON only):
{
  "videoTitle": "The actual video title or a descriptive title based on content",
  "summary": "Two paragraphs. Paragraph 1: what this video covers. Paragraph 2: why it matters to ${brand.targetAudience}.",
  "coreIdeas": [
    {
      "idea": "A specific insight or claim from the video",
      "explanation": "Why this matters in practice for the audience",
      "contentAngles": ["angle 1 for content creation", "angle 2", "angle 3"]
    }
  ],
  "frameworks": [
    {
      "name": "Framework or methodology name",
      "steps": ["step 1", "step 2", "step 3"],
      "oneLiner": "One sentence explaining what this framework achieves"
    }
  ],
  "stories": [
    {
      "protagonist": "Who the story is about",
      "challenge": "The problem or obstacle",
      "resolution": "How it resolved",
      "lesson": "The takeaway for ${brand.targetAudience}"
    }
  ],
  "quotes": [
    {
      "text": "Exact or near-verbatim quotable line",
      "context": "One sentence of context — when or why this was said",
      "attributedTo": "Speaker name or 'author'"
    }
  ],
  "contrarianOpinions": [
    "A specific claim that challenges mainstream thinking in ${brand.niche}"
  ],
  "rawHooks": [
    "A hook sentence specific to this video's actual content — not a generic template"
  ],
  "keyStats": [
    "A specific number, percentage, or data point from the transcript"
  ]
}

Quantities required:
- coreIdeas: 5 to 8 items
- frameworks: 0 to 5 (use empty array [] if none mentioned)
- stories: 0 to 3 (use empty array [] if none)
- quotes: 3 to 8 items
- contrarianOpinions: 3 to 6 items
- rawHooks: 10 to 15 items — these must reference specific content from the video
- keyStats: all stats and numbers mentioned

Only extract information present in the transcript. Do not invent facts.`;
    const raw = await callClaudeJson(system, user);
    return {
      videoId: videoMeta.videoId,
      videoUrl: videoMeta.videoUrl,
      videoTitle: raw.videoTitle || videoMeta.title || "Untitled",
      processedAt: (/* @__PURE__ */ new Date()).toISOString(),
      summary: raw.summary,
      coreIdeas: raw.coreIdeas,
      frameworks: raw.frameworks ?? [],
      stories: raw.stories ?? [],
      quotes: raw.quotes,
      contrarianOpinions: raw.contrarianOpinions,
      rawHooks: raw.rawHooks,
      keyStats: raw.keyStats
    };
  }, "run")
});

export {
  researchAgent
};
//# sourceMappingURL=chunk-OYO5O7IE.mjs.map
