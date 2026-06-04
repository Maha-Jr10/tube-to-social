import { YoutubeTranscript } from "youtube-transcript";

const MAX_TRANSCRIPT_CHARS = 12000;

export function extractVideoId(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.slice(1).split("?")[0];
      if (!id) throw new Error("Empty video ID in youtu.be URL");
      return id;
    }
    const v = parsed.searchParams.get("v");
    if (!v) throw new Error("No 'v' parameter found in YouTube URL");
    return v;
  } catch (err) {
    if (err instanceof Error && err.message.includes("Invalid URL")) {
      throw new Error(`Invalid YouTube URL: ${url}`);
    }
    throw err;
  }
}

export async function fetchTranscript(videoId: string): Promise<string> {
  let items;
  try {
    items = await YoutubeTranscript.fetchTranscript(videoId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not fetch transcript for video ${videoId}. ` +
        `The video may have no captions, be private, or age-restricted. Details: ${msg}`
    );
  }

  if (!items || items.length === 0) {
    throw new Error(`No transcript segments returned for video ${videoId}`);
  }

  const full = items
    .map((item) => item.text)
    .join(" ")
    .replace(/\[.*?\]/g, "") // strip caption annotations like [Music]
    .replace(/\s+/g, " ")
    .trim();

  if (full.length <= MAX_TRANSCRIPT_CHARS) return full;
  return full.slice(0, MAX_TRANSCRIPT_CHARS) + " [transcript truncated for length]";
}

export async function fetchVideoMeta(
  videoId: string
): Promise<{ title: string; channelName: string }> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch%3Fv%3D${videoId}&format=json`;
    const res = await fetch(url);
    if (!res.ok) return { title: "Untitled", channelName: "Unknown" };
    const data = (await res.json()) as { title: string; author_name: string };
    return { title: data.title, channelName: data.author_name };
  } catch {
    return { title: "Untitled", channelName: "Unknown" };
  }
}
