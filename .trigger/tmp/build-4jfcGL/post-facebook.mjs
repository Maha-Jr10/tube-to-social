import {
  task
} from "./chunk-O2EOSSNY.mjs";
import "./chunk-QKPJMX6P.mjs";
import {
  __name,
  init_esm
} from "./chunk-GADV3JWJ.mjs";

// src/trigger/content-os/publisher/post-facebook.ts
init_esm();
var postFacebook = task({
  id: "post-facebook",
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 5e3, maxTimeoutInMs: 3e4 },
  run: /* @__PURE__ */ __name(async (payload) => {
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    if (!pageId) throw new Error("FACEBOOK_PAGE_ID is not set");
    if (!pageToken) throw new Error("FACEBOOK_PAGE_ACCESS_TOKEN is not set");
    const { post } = payload;
    const message = [post.hook, post.body, post.cta].join("\n\n");
    const response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, access_token: pageToken })
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Facebook API error ${response.status}: ${error}`);
    }
    const data = await response.json();
    console.log(`Facebook post published: ${data.id}`);
    return { postId: data.id, platform: "facebook" };
  }, "run")
});
export {
  postFacebook
};
//# sourceMappingURL=post-facebook.mjs.map
