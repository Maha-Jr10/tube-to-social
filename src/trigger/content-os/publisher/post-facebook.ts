import { task } from "@trigger.dev/sdk";
import type { LinkedInPost, BrandInfo } from "../../../lib/types.js";

export const postFacebook = task({
  id: "post-facebook",
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 5000, maxTimeoutInMs: 30000 },
  run: async (payload: { post: LinkedInPost; brand: BrandInfo }) => {
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    if (!pageId) throw new Error("FACEBOOK_PAGE_ID is not set");
    if (!pageToken) throw new Error("FACEBOOK_PAGE_ACCESS_TOKEN is not set");

    const { post } = payload;
    const message = [post.hook, post.body, post.cta].join("\n\n");

    const response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, access_token: pageToken }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Facebook API error ${response.status}: ${error}`);
    }

    const data = (await response.json()) as { id: string };
    console.log(`Facebook post published: ${data.id}`);
    return { postId: data.id, platform: "facebook" };
  },
});
