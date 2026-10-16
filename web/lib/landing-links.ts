export const REPO_URL = "https://github.com/101xAnshu/Recall";

// Paste the published demo video URL here. Until this holds a real YouTube
// link the hero button scrolls to the on-page player and the player shows a
// placeholder plate instead of a dead iframe.
export const YOUTUBE_URL = "PASTE_URL_HERE";

export function youtubeVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?[^#]*v=([\w-]{6,})/,
    /youtube\.com\/embed\/([\w-]{6,})/,
    /youtu\.be\/([\w-]{6,})/,
    /youtube\.com\/shorts\/([\w-]{6,})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export const DEMO_VIDEO_ID = youtubeVideoId(YOUTUBE_URL);