import { task, tasks } from "@trigger.dev/sdk";
import type { LinkedInPost, XPost, BrandInfo } from "../../../lib/types.js";
import type { postLinkedin } from "./post-linkedin.js";
import type { postX } from "./post-x.js";
import type { postFacebook } from "./post-facebook.js";
import type { postInstagram } from "./post-instagram.js";

export const schedulePosts = task({
  id: "schedule-posts",
  run: async (payload: { linkedinPosts: LinkedInPost[]; xPosts: XPost[]; brand: BrandInfo }) => {
    const { linkedinPosts, xPosts, brand } = payload;

    // First slot: tomorrow at 11am UTC. Then every 3 days.
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + 1);
    start.setUTCHours(11, 0, 0, 0);

    const slotDate = (index: number): Date => {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + index * 3);
      return d;
    };

    const totalSlots = Math.max(linkedinPosts.length, xPosts.length);

    const hasFacebook = !!(process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN);
    const hasInstagram = !!(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN && process.env.IMGBB_API_KEY);

    if (!hasFacebook) console.log("Facebook credentials not set — skipping Facebook posts");
    if (!hasInstagram) console.log("Instagram credentials not set — skipping Instagram posts");

    for (let i = 0; i < totalSlots; i++) {
      const delay = slotDate(i);
      const li = linkedinPosts[i];
      const xp = xPosts[i];

      if (li) {
        await tasks.trigger<typeof postLinkedin>("post-linkedin", { post: li, brand }, { delay });
        if (hasFacebook) await tasks.trigger<typeof postFacebook>("post-facebook", { post: li, brand }, { delay });
        if (hasInstagram) await tasks.trigger<typeof postInstagram>("post-instagram", { post: li, brand }, { delay });
      }

      if (xp) {
        await tasks.trigger<typeof postX>("post-x", { post: xp, brand }, { delay });
      }

      console.log(`Slot ${i + 1}/${totalSlots} → ${delay.toUTCString()}`);
    }

    console.log(`Scheduled ${totalSlots} slots across all platforms`);
    return { totalSlots, firstPostAt: slotDate(0).toISOString() };
  },
});
