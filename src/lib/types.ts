// ─── Shared ───────────────────────────────────────────────────────────────────

export interface BrandInfo {
  name: string;
  handle: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  tone: string;
  niche: string;
  targetAudience: string;
  ctaUrl: string;
}

export interface VideoMeta {
  videoId: string;
  videoUrl: string;
  title?: string;
  channelName?: string;
  channelId?: string;
  publishedAt?: string;
}

// ─── Agent 1: Research ────────────────────────────────────────────────────────

export interface ResearchAgentInput {
  transcript: string;
  videoMeta: VideoMeta;
  brand: BrandInfo;
}

export interface CoreIdea {
  idea: string;
  explanation: string;
  contentAngles: string[];
}

export interface Framework {
  name: string;
  steps: string[];
  oneLiner: string;
}

export interface Story {
  protagonist: string;
  challenge: string;
  resolution: string;
  lesson: string;
}

export interface Quote {
  text: string;
  context: string;
  attributedTo: string;
}

export interface KnowledgeBase {
  videoId: string;
  videoUrl: string;
  videoTitle: string;
  processedAt: string;
  summary: string;
  coreIdeas: CoreIdea[];
  frameworks: Framework[];
  stories: Story[];
  quotes: Quote[];
  contrarianOpinions: string[];
  rawHooks: string[];
  keyStats: string[];
}

// ─── Agent 2: Strategy ────────────────────────────────────────────────────────

export interface StrategyAgentInput {
  knowledgeBase: KnowledgeBase;
  brand: BrandInfo;
}

export interface ContentPillar {
  name: string;
  description: string;
  keyMessages: string[];
  postTypes: string[];
}

export interface Hook {
  text: string;
  platform: "linkedin" | "x" | "universal";
  pillarAlignment: string;
  variationTips: string;
}

export interface HookLibrary {
  curiosity: Hook[];
  authority: Hook[];
  controversy: Hook[];
  mistakes: Hook[];
  predictions: Hook[];
}

export interface CalendarDay {
  day: number;
  platform: "linkedin" | "x" | "newsletter" | "carousel" | "video";
  pillar: string;
  angle: string;
  format: string;
  callToAction: string;
}

export interface ContentStrategy {
  videoId: string;
  primaryTheme: string;
  viralAngles: string[];
  contentPillars: ContentPillar[];
  hookLibrary: HookLibrary;
  thirtyDayCalendar: CalendarDay[];
}

// ─── Agent 3: Copywriter ──────────────────────────────────────────────────────

export interface CopywriterAgentInput {
  knowledgeBase: KnowledgeBase;
  strategy: ContentStrategy;
  brand: BrandInfo;
}

export interface LinkedInPost {
  id: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  pillar: string;
  calendarDay: number;
  characterCount: number;
}

export interface XPost {
  id: string;
  text: string;
  isThread: boolean;
  threadParts: string[] | null;
  pillar: string;
  calendarDay: number;
  characterCount: number;
}

export interface NewsletterSection {
  type: "intro" | "main-insight" | "framework" | "story" | "cta";
  heading: string;
  body: string;
}

export interface Newsletter {
  subject: string;
  previewText: string;
  sections: NewsletterSection[];
  wordCount: number;
}

export interface ContentCopy {
  videoId: string;
  linkedinPosts: LinkedInPost[];
  xPosts: XPost[];
  newsletter: Newsletter;
  // Phase 2 additions:
  // carousels: Carousel[];
  // videoIdeas: VideoIdea[];
  // leadMagnets: LeadMagnet[];
}

// ─── Phase 2: Design Agent ───────────────────────────────────────────────────

export interface CarouselSlide {
  slideNumber: number;
  type: "cover" | "content" | "cta";
  headline: string;
  bodyText: string;
  visualNote: string;
}

export interface Carousel {
  id: string;
  title: string;
  slides: CarouselSlide[];
  pillar: string;
  calendarDay: number;
}

export interface DesignOutput {
  videoId: string;
  carouselTemplate: string;
  socialTemplate: string;
  landingPageHtml: string;
  cssVariables: {
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
    brandName: string;
  };
}

// ─── Phase 2: QA Agent ───────────────────────────────────────────────────────

export interface QAFinding {
  severity: "error" | "warning" | "suggestion";
  category: string;
  contentId: string;
  description: string;
  evidence: string;
}

export interface QACorrection {
  contentId: string;
  field: string;
  original: string;
  corrected: string;
  reason: string;
}

export interface QAReport {
  videoId: string;
  reviewedAt: string;
  overallScore: number;
  passed: boolean;
  categoryScores: {
    brandConsistency: number;
    factualAccuracy: number;
    toneAlignment: number;
    characterLimits: number;
    hookQuality: number;
    structuralCompleteness: number;
  };
  findings: QAFinding[];
  corrections: QACorrection[];
  approvedContent: {
    linkedinPostIds: string[];
    xPostIds: string[];
    newsletterApproved: boolean;
  };
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export interface OrchestratorOutput {
  videoId: string;
  outputDir: string;
  files: string[];
  qaScore?: number;
  processedAt: string;
}

// ─── Content Database ─────────────────────────────────────────────────────────

export interface SearchIndex {
  allIdeas: string[];
  allFrameworkNames: string[];
  allQuotes: string[];
  allHooks: string[];
  niche: string;
  keywords: string[];
}

export interface ContentDBEntry {
  videoId: string;
  videoUrl: string;
  videoTitle: string;
  processedAt: string;
  brand: BrandInfo;
  knowledgeBase: KnowledgeBase;
  qaScore: number;
  tags: string[];
  searchIndex: SearchIndex;
}

export interface ContentDatabase {
  version: "1.0";
  lastUpdated: string;
  entries: ContentDBEntry[];
}
