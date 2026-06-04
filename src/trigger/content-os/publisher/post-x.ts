import { task } from "@trigger.dev/sdk";
import { TwitterApi } from "twitter-api-v2";
import type { XPost, BrandInfo } from "../../../lib/types.js";

export const postX = task({
  id: "post-x",
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 5000, maxTimeoutInMs: 30000 },
  run: async (payload: { post: XPost; brand: BrandInfo }) => {
    const apiKey = process.env.X_API_KEY;
    const apiSecret = process.env.X_API_SECRET;
    const accessToken = process.env.X_ACCESS_TOKEN;
    const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;
    if (!apiKey) throw new Error("X_API_KEY is not set");
    if (!apiSecret) throw new Error("X_API_SECRET is not set");
    if (!accessToken) throw new Error("X_ACCESS_TOKEN is not set");
    if (!accessSecret) throw new Error("X_ACCESS_TOKEN_SECRET is not set");

    const client = new TwitterApi({ appKey: apiKey, appSecret: apiSecret, accessToken, accessSecret });
    const { post } = payload;

    if (post.isThread && post.threadParts && post.threadParts.length > 0) {
      let previousId: string | undefined;
      const tweetIds: string[] = [];
      for (const part of post.threadParts) {
        const tweet = await client.v2.tweet({
          text: part,
          ...(previousId ? { reply: { in_reply_to_tweet_id: previousId } } : {}),
        });
        previousId = tweet.data.id;
        tweetIds.push(tweet.data.id);
      }
      console.log(`X thread posted: ${tweetIds.length} parts, first=${tweetIds[0]}`);
      return { tweetIds, platform: "x", isThread: true };
    }

    const tweet = await client.v2.tweet({ text: post.text });
    console.log(`X post published: ${tweet.data.id}`);
    return { tweetIds: [tweet.data.id], platform: "x", isThread: false };
  },
});
