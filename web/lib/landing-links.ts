export const REPO_URL = "https://github.com/101xAnshu/Recall";

// Where the landing page is served from. og:image needs an absolute URL, so
// this is the origin the poster is addressed under in link previews.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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

// Local poster for the click-to-load video facade, and the same file used as
// the og:image / twitter:image link preview. Replace web/public/demo-poster.jpg
// to change both at once, no code edit needed.
export const DEMO_POSTER = "/demo-poster.jpg";