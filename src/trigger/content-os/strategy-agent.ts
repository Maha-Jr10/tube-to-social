import { task } from "@trigger.dev/sdk";
import { callClaudeJson } from "../../lib/claude.js";
import type {
  StrategyAgentInput,
  ContentStrategy,
  ContentPillar,
  HookLibrary,
  CalendarDay,
} from "../../lib/types.js";

type ClaudeStrategyOutput = {
  primaryTheme: string;
  viralAngles: string[];
  contentPillars: ContentPillar[];
  hookLibrary: HookLibrary;
  thirtyDayCalendar: CalendarDay[];
};

export const strategyAgent = task({
  id: "strategy-agent",
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 5000, maxTimeoutInMs: 30000 },
  run: async (payload: StrategyAgentInput): Promise<ContentStrategy> => {
    const { knowledgeBase: kb, brand } = payload;

    const coreIdeasList = kb.coreIdeas.map((c) => `- ${c.idea}`).join("\n");
    const contrarianList = kb.contrarianOpinions.map((c) => `- ${c}`).join("\n");
    const hooksList = kb.rawHooks.map((h) => `- ${h}`).join("\n");
    const statsList = kb.keyStats.length > 0 ? kb.keyStats.join(" | ") : "None mentioned";

    const system = `You are an expert content strategist. Design multi-platform 30-day content strategies grounded in specific source material. Return ONLY valid JSON matching the schema exactly — no markdown fences, no explanation, just the raw JSON object.`;

    const user = `Design a complete 30-day content strategy based on this KnowledgeBase.

BRAND: ${brand.name} (@${brand.handle}) | Tone: ${brand.tone} | Niche: ${brand.niche}
TARGET AUDIENCE: ${brand.targetAudience}
CTA: ${brand.ctaUrl}

VIDEO: ${kb.videoTitle}
SUMMARY: ${kb.summary}

CORE IDEAS:
${coreIdeasList}

CONTRARIAN OPINIONS:
${contrarianList}

KEY STATS: ${statsList}

RAW HOOKS (use as inspiration):
${hooksList}

Return this exact JSON (no markdown fences, raw JSON only):
{
  "primaryTheme": "The single overarching theme that ties all 30 days together",
  "viralAngles": [
    "Top predicted high-engagement angle 1",
    "Angle 2",
    "Angle 3",
    "Angle 4",
    "Angle 5"
  ],
  "contentPillars": [
    {
      "name": "Pillar name (2-4 words)",
      "description": "What this pillar covers and why it matters to ${brand.targetAudience}",
      "keyMessages": ["key message 1", "key message 2", "key message 3"],
      "postTypes": ["linkedin", "x"]
    }
  ],
  "hookLibrary": {
    "curiosity": [
      {
        "text": "The full hook sentence — specific to this video's content",
        "platform": "linkedin",
        "pillarAlignment": "Name of the pillar this supports",
        "variationTips": "One sentence on how to adapt this hook for different angles"
      }
    ],
    "authority": [ ... 5 hooks ],
    "controversy": [ ... 5 hooks ],
    "mistakes": [ ... 5 hooks ],
    "predictions": [ ... 5 hooks ]
  },
  "thirtyDayCalendar": [
    {
      "day": 1,
      "platform": "linkedin",
      "pillar": "Exact pillar name from contentPillars",
      "angle": "The specific angle or idea from the knowledge base this post covers",
      "format": "thought leadership post",
      "callToAction": "Subscribe to my newsletter at ${brand.ctaUrl}"
    }
  ]
}

Requirements:
- contentPillars: exactly 3 to 5 pillars
- hookLibrary: EXACTLY 5 hooks per category (25 total). Hooks must reference specific ideas, stats, or contrarian opinions from this video — not generic templates.
- thirtyDayCalendar: EXACTLY 30 entries. Suggested distribution: 15 linkedin, 12 x, 2 carousel, 1 newsletter. Each entry must reference a real pillar name and a specific angle grounded in the knowledge base.
- Assign calendar day 15 to newsletter and days 7, 21 to carousel (Phase 2 content types).`;

    const raw = await callClaudeJson<ClaudeStrategyOutput>(system, user);

    // Validate hook library has exactly 5 per category
    const categories = ["curiosity", "authority", "controversy", "mistakes", "predictions"] as const;
    for (const cat of categories) {
      const hooks = raw.hookLibrary[cat];
      if (!Array.isArray(hooks) || hooks.length === 0) {
        raw.hookLibrary[cat] = [];
      }
    }

    // Validate calendar has 30 entries
    if (!Array.isArray(raw.thirtyDayCalendar) || raw.thirtyDayCalendar.length !== 30) {
      console.warn(
        `Strategy agent returned ${raw.thirtyDayCalendar?.length ?? 0} calendar entries instead of 30`
      );
    }

    return {
      videoId: kb.videoId,
      primaryTheme: raw.primaryTheme,
      viralAngles: raw.viralAngles,
      contentPillars: raw.contentPillars,
      hookLibrary: raw.hookLibrary,
      thirtyDayCalendar: raw.thirtyDayCalendar,
    };
  },
});
