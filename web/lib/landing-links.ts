export const REPO_URL = "https://github.com/101xAnshu/Recall";

// Published demo video. The hero and navbar buttons open this on YouTube and
// the page embeds it via the id derived below, so this is the single canonical
// link for the video across the app and the README.
export const YOUTUBE_URL = "https://youtu.be/F9H5nxtCiow";

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