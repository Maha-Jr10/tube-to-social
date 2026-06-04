import { task } from "@trigger.dev/sdk";
import type { LinkedInPost, BrandInfo } from "../../../lib/types.js";

async function uploadToImgbb(imageBuffer: Buffer, apiKey: string): Promise<string> {
  const body = new URLSearchParams({ image: imageBuffer.toString("base64") });
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: "POST",
    body,
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`imgbb upload failed ${response.status}: ${error}`);
  }
  const data = (await response.json()) as { data: { url: string } };
  return data.data.url;
}

export const postInstagram = task({
  id: "post-instagram",
  retry: { maxAttempts: 3, factor: 2, minTimeoutInMs: 5000, maxTimeoutInMs: 30000 },
  run: async (payload: { post: LinkedInPost; brand: BrandInfo }) => {
    const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    const imgbbKey = process.env.IMGBB_API_KEY;
    if (!igUserId) throw new Error("INSTAGRAM_BUSINESS_ACCOUNT_ID is not set");
    if (!accessToken) throw new Error("FACEBOOK_PAGE_ACCESS_TOKEN is not set");
    if (!imgbbKey) throw new Error("IMGBB_API_KEY is not set");

    const { post, brand } = payload;
    const caption = [post.hook, post.body, post.cta, post.hashtags.join(" ")].join("\n\n");
    const imageText = `${post.hook}\n\n${post.body.slice(0, 200)}`;

    // Step 1: Generate branded image
    console.log("Instagram: generating image...");
    const { generatePostImage } = await import("../../../lib/image-generator.js");
    const imageBuffer = await generatePostImage(imageText, brand.name, brand.primaryColor, brand.accentColor);

    // Step 2: Upload to get a public URL
    console.log("Instagram: uploading image...");
    const imageUrl = await uploadToImgbb(imageBuffer, imgbbKey);

    // Step 3: Create media container
    const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
    });
    if (!containerRes.ok) {
      const error = await containerRes.text();
      throw new Error(`Instagram container error ${containerRes.status}: ${error}`);
    }
    const container = (await containerRes.json()) as { id: string };

    // Step 4: Publish container
    const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: container.id, access_token: accessToken }),
    });
    if (!publishRes.ok) {
      const error = await publishRes.text();
      throw new Error(`Instagram publish error ${publishRes.status}: ${error}`);
    }
    const published = (await publishRes.json()) as { id: string };
    console.log(`Instagram post published: ${published.id}`);
    return { postId: published.id, platform: "instagram" };
  },
});
