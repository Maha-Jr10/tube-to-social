import {
  task,
  tasks
} from "./chunk-O2EOSSNY.mjs";
import {
  __name,
  init_esm
} from "./chunk-GADV3JWJ.mjs";

// src/trigger/content-os/publisher/schedule-posts.ts
init_esm();
var schedulePosts = task({
  id: "schedule-posts",
  run: /* @__PURE__ */ __name(async (payload) => {
    const { linkedinPosts, xPosts, brand } = payload;
    const start = /* @__PURE__ */ new Date();
    start.setUTCDate(start.getUTCDate() + 1);
    start.setUTCHours(11, 0, 0, 0);
    const slotDate = /* @__PURE__ */ __name((index) => {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + index * 3);
      return d;
    }, "slotDate");
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
        await tasks.trigger("post-linkedin", { post: li, brand }, { delay });
        if (hasFacebook) await tasks.trigger("post-facebook", { post: li, brand }, { delay });
        if (hasInstagram) await tasks.trigger("post-instagram", { post: li, brand }, { delay });
      }
      if (xp) {
        await tasks.trigger("post-x", { post: xp, brand }, { delay });
      }
      console.log(`Slot ${i + 1}/${totalSlots} → ${delay.toUTCString()}`);
    }
    console.log(`Scheduled ${totalSlots} slots across all platforms`);
    return { totalSlots, firstPostAt: slotDate(0).toISOString() };
  }, "run")
});

export {
  schedulePosts
};
//# sourceMappingURL=chunk-HZEQSPAG.mjs.map
