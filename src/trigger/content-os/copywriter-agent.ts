import { task } from "@trigger.dev/sdk";
import { callClaudeJson } from "../../lib/claude.js";
import type {
  CopywriterAgentInput,
  ContentCopy,
  LinkedInPost,
  XPost,
  Newsletter,
  NewsletterSection,
} from "../../lib/types.js";

const SYSTEM = `You are an expert copywriter specializing in LinkedIn, X (Twitter), and email newsletters. Write high-converting content grounded in specific source material. Return ONLY valid JSON matching the schema exactly — no markdown fences, no preamble, just the raw JSON object.`;

// ─── Call 1: 15 LinkedIn posts ────────────────────────────────────────────────

async function generateLinkedInPosts(
  payload: CopywriterAgentInput
): Promise<LinkedInPost[]> {
  const { knowledgeBase: kb, strategy, brand } = payload;

  const pillars = strategy.contentPillars.map((p) => `${p.name}: ${p.description}`).join("\n");
  const allHooks = [
    ...strategy.hookLibrary.curiosity,
    ...strategy.hookLibrary.authority,
    ...strategy.hookLibrary.controversy,
    ...strategy.hookLibrary.mistakes,
    ...strategy.hookLibrary.predictions,
  ]
    .map((h) => `[${h.platform}] ${h.text}`)
    .join("\n");

  const coreIdeasSummary = kb.coreIdeas
    .slice(0, 6)
    .map((c) => `- ${c.idea}: ${c.explanation}`)
    .join("\n");

  const calendarLinkedIn = strategy.thirtyDayCalendar
    .filter((d) => d.platform === "linkedin")
    .slice(0, 15);

  const user = `Write exactly 15 LinkedIn posts for ${brand.name}.

BRAND: ${brand.name} (@${brand.handle}) | Tone: ${brand.tone}
AUDIENCE: ${brand.targetAudience} in ${brand.niche}
CTA: ${brand.ctaUrl}

VIDEO: ${kb.videoTitle}
KNOWLEDGE BASE SUMMARY: ${kb.summary}

CORE IDEAS:
${coreIdeasSummary}

KEY STATS: ${kb.keyStats.join(" | ") || "None"}
CONTRARIAN OPINIONS: ${kb.contrarianOpinions.slice(0, 4).join(" | ")}

CONTENT PILLARS:
${pillars}

HOOK LIBRARY (pick and adapt relevant ones):
${allHooks}

30-DAY CALENDAR (LinkedIn slots):
${calendarLinkedIn.map((d) => `Day ${d.day}: pillar="${d.pillar}", angle="${d.angle}"`).join("\n")}

Return a JSON object:
{
  "posts": [
    {
      "id": "li-01",
      "hook": "The exact opening line that stops the scroll (≤25 words)",
      "body": "The full post body — 150 to 250 words, can use bullets or short paragraphs",
      "cta": "One CTA line ending with ${brand.ctaUrl}",
      "hashtags": ["#tag1", "#tag2", "#tag3"],
      "pillar": "Exact pillar name from the content pillars above",
      "calendarDay": 1,
      "characterCount": 0
    }
  ]
}

Rules:
- Exactly 15 posts with ids li-01 through li-15
- Map each post to a LinkedIn calendar day above (day field)
- NEVER start a post body with "I " as the first word
- No weak openers: "In today's world", "Are you...", "Today I want to share"
- Vary formats: some bullet lists (3-5 bullets), some pure prose, some numbered frameworks
- Use specific numbers, stats, and ideas from the knowledge base — no generic advice
- Each post covers a different angle; no two posts should feel repetitive
- characterCount: leave as 0 (calculated after)`;

  const raw = await callClaudeJson<{ posts: LinkedInPost[] }>(SYSTEM, user);
  const posts = raw.posts;

  // Calculate character counts programmatically
  for (const post of posts) {
    post.characterCount = [post.hook, post.body, post.cta, post.hashtags.join(" ")]
      .join("\n\n")
      .length;
  }

  return posts;
}

// ─── Call 2: 30 X posts ───────────────────────────────────────────────────────

async function generateXPosts(payload: CopywriterAgentInput): Promise<XPost[]> {
  const { knowledgeBase: kb, strategy, brand } = payload;

  const calendarX = strategy.thirtyDayCalendar
    .filter((d) => d.platform === "x")
    .slice(0, 30);

  const hooksFlat = [
    ...strategy.hookLibrary.curiosity,
    ...strategy.hookLibrary.controversy,
    ...strategy.hookLibrary.predictions,
  ]
    .map((h) => h.text)
    .slice(0, 15)
    .join("\n");

  const user = `Write exactly 30 X (Twitter) posts for ${brand.name}.

BRAND: ${brand.name} (@${brand.handle}) | Niche: ${brand.niche}
CTA: ${brand.ctaUrl}

VIDEO: ${kb.videoTitle}
CORE IDEAS: ${kb.coreIdeas.map((c) => c.idea).join(" | ")}
KEY STATS: ${kb.keyStats.join(" | ") || "None"}
CONTRARIAN OPINIONS: ${kb.contrarianOpinions.join(" | ")}
RAW HOOKS: ${kb.rawHooks.slice(0, 10).join("\n")}

ADDITIONAL HOOKS:
${hooksFlat}

30-DAY CALENDAR (X slots):
${calendarX.map((d) => `Day ${d.day}: angle="${d.angle}"`).join("\n")}

Return a JSON object:
{
  "posts": [
    {
      "id": "x-01",
      "text": "The post text — MUST be ≤280 characters",
      "isThread": false,
      "threadParts": null,
      "pillar": "Content pillar name",
      "calendarDay": 2,
      "characterCount": 0
    }
  ]
}

Rules:
- Exactly 30 posts with ids x-01 through x-30
- ALL single posts must be ≤280 characters — count carefully
- For threads: set isThread=true, text=first tweet, threadParts=array of all tweets (each ≤280 chars)
- Make 6 to 8 posts threads (3 to 5 parts each)
- Mix types: punchy single stat, contrarian take, mini-framework, numbered list thread, question
- No hashtags (they reduce reach on X)
- Do not include the CTA URL in every post — only in 5 to 8 posts
- characterCount: leave as 0 (calculated after)`;

  const raw = await callClaudeJson<{ posts: XPost[] }>(SYSTEM, user);
  const posts = raw.posts;

  // Calculate character counts and warn on over-limit single posts
  for (const post of posts) {
    post.characterCount = post.text.length;
    if (!post.isThread && post.characterCount > 280) {
      console.warn(`X post ${post.id} exceeds 280 chars (${post.characterCount}). Will need editing.`);
    }
  }

  return posts;
}

// ─── Call 3: 1 Newsletter ────────────────────────────────────────────────────

async function generateNewsletter(payload: CopywriterAgentInput): Promise<Newsletter> {
  const { knowledgeBase: kb, brand } = payload;

  const frameworksText =
    kb.frameworks.length > 0
      ? kb.frameworks
          .map((f) => `${f.name}: ${f.steps.join(" → ")}. ${f.oneLiner}`)
          .join("\n")
      : "None mentioned";

  const storiesText =
    kb.stories.length > 0
      ? kb.stories.map((s) => `${s.protagonist}: ${s.lesson}`).join("\n")
      : "None mentioned";

  const user = `Write a newsletter issue for ${brand.name} based on this video.

BRAND: ${brand.name} | Tone: ${brand.tone}
AUDIENCE: ${brand.targetAudience} in ${brand.niche}
CTA: ${brand.ctaUrl}

VIDEO: ${kb.videoTitle}
SUMMARY: ${kb.summary}

CORE IDEAS:
${kb.coreIdeas.map((c) => `- ${c.idea}: ${c.explanation}`).join("\n")}

KEY STATS: ${kb.keyStats.join(" | ") || "None"}

FRAMEWORKS:
${frameworksText}

STORIES:
${storiesText}

QUOTES:
${kb.quotes
  .slice(0, 4)
  .map((q) => `"${q.text}" — ${q.attributedTo}`)
  .join("\n")}

Return a JSON object:
{
  "newsletter": {
    "subject": "Email subject line — 50 to 60 chars, curiosity or value-driven, no clickbait",
    "previewText": "Preview text shown in inbox — 80 to 100 chars, teases the main insight",
    "sections": [
      {
        "type": "intro",
        "heading": "Short heading for this section",
        "body": "150 to 200 word opener. Hook the reader, establish what they'll learn, set up the value. Reference a surprising stat or counterintuitive idea."
      },
      {
        "type": "main-insight",
        "heading": "...",
        "body": "200 to 250 words on the single most important insight from the video. Explain it clearly for ${brand.targetAudience}."
      },
      {
        "type": "framework",
        "heading": "...",
        "body": "150 to 200 words. Present the key framework or process from the video step-by-step. If no framework exists, present the core ideas as a numbered list."
      },
      {
        "type": "story",
        "heading": "...",
        "body": "150 to 200 words on the most compelling story or example from the transcript. Show, don't tell."
      },
      {
        "type": "cta",
        "heading": "...",
        "body": "100 to 150 word wrap-up with a clear next step. Point to ${brand.ctaUrl}."
      }
    ],
    "wordCount": 0
  }
}

Rules:
- Tone matches '${brand.tone}' throughout — consistent voice across all 5 sections
- Every section must have a heading
- Use specific facts, stats, and examples from the knowledge base — no vague generalities
- wordCount: leave as 0 (calculated after)`;

  const raw = await callClaudeJson<{ newsletter: Newsletter }>(SYSTEM, user);
  const nl = raw.newsletter;

  // Calculate word count
  nl.wordCount = nl.sections
    .flatMap((s) => [s.heading, s.body])
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

  return nl;
}

// ─── Main task ───────────────────────────────────────────────────────────────

export const copywriterAgent = task({
  id: "copywriter-agent",
  retry: { maxAttempts: 2, factor: 2, minTimeoutInMs: 10000, maxTimeoutInMs: 60000 },
  run: async (payload: CopywriterAgentInput): Promise<ContentCopy> => {
    console.log("Copywriter: generating 15 LinkedIn posts...");
    const linkedinPosts = await generateLinkedInPosts(payload);
    console.log(`Copywriter: generated ${linkedinPosts.length} LinkedIn posts`);

    console.log("Copywriter: generating 30 X posts...");
    const xPosts = await generateXPosts(payload);
    console.log(`Copywriter: generated ${xPosts.length} X posts`);

    console.log("Copywriter: generating newsletter...");
    const newsletter = await generateNewsletter(payload);
    console.log("Copywriter: newsletter done");

    return {
      videoId: payload.knowledgeBase.videoId,
      linkedinPosts,
      xPosts,
      newsletter,
    };
  },
});
