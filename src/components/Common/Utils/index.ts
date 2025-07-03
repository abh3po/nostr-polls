export function isEmbeddableYouTubeUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const pathname = parsedUrl.pathname;
    const searchParams = parsedUrl.searchParams;

    if (hostname === "youtu.be") {
      // youtu.be short link always has video ID directly after slash
      return /^\/[a-zA-Z0-9_-]{11}$/.test(pathname);
    }

    if (hostname.includes("youtube.com")) {
      // watch?v=... form
      if (pathname === "/watch" && searchParams.has("v")) {
        return /^[a-zA-Z0-9_-]{11}$/.test(searchParams.get("v") || "");
      }

      // embed/... form
      if (/^\/embed\/[a-zA-Z0-9_-]{11}$/.test(pathname)) {
        return true;
      }

      // shorts/... form
      if (/^\/shorts\/[a-zA-Z0-9_-]{11}$/.test(pathname)) {
        return true;
      }
    }

    return false;
  } catch {
    return false; // in case URL constructor fails on invalid URLs
  }
}
