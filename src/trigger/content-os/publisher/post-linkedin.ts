import { task } from "@trigger.dev/sdk";
import type { LinkedInPost, BrandInfo } from "../../../lib/types.js";

export const postLinkedin = task({
  id: "post-linkedin",
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 5000, maxTimeoutInMs: 30000 },
  run: async (payload: { post: LinkedInPost; brand: BrandInfo }) => {
    const token = process.env.LINKEDIN_ACCESS_TOKEN;
    const personUrn = process.env.LINKEDIN_PERSON_URN;
    if (!token) throw new Error("LINKEDIN_ACCESS_TOKEN is not set");
    if (!personUrn) throw new Error("LINKEDIN_PERSON_URN is not set");

    const { post } = payload;
    const text = [post.hook, post.body, post.cta, post.hashtags.join(" ")].join("\n\n");

    const response = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202411",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: personUrn,
        commentary: text,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LinkedIn API error ${response.status}: ${error}`);
    }

    const postId = response.headers.get("x-restli-id") ?? "unknown";
    console.log(`LinkedIn post published: ${postId}`);
    return { postId, platform: "linkedin" };
  },
});
