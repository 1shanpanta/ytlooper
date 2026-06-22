import { next } from '@vercel/functions';

// Run on the root path only. Shared clip links look like `/?v=VIDEO_ID&start=...`,
// so we inspect the query inside the handler (matcher is path-only on Vercel).
export const config = {
  matcher: '/',
};

const CANONICAL_ORIGIN = 'https://ytlooper.vercel.app';
const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const FETCH_TIMEOUT_MS = 2000;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Replace the content of a single <meta> tag without touching the rest of the HTML.
// Uses a function replacer so `$` characters in the value are never treated as
// regex replacement patterns. No-ops silently if the target tag is absent.
const setMeta = (
  html: string,
  selector: string,
  key: string,
  value: string,
): string =>
  html.replace(
    new RegExp(`(<meta ${selector}="${key}" content=")[^"]*(")`),
    (_match, open: string, close: string) => open + value + close,
  );

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const videoId = url.searchParams.get('v');

  // No clip in the link -> let the static homepage serve normally.
  if (!videoId || !YT_ID.test(videoId)) {
    return next();
  }

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`,
    )}&format=json`;
    const maxres = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    const hqdefault = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    // Fetch the static shell, the video metadata, and probe the high-res thumbnail
    // all in parallel, each bounded so a slow upstream can't hang the response.
    const [htmlRes, oembed, hasMaxres] = await Promise.all([
      fetch(new URL('/index.html', request.url), {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      }),
      fetch(oembedUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(maxres, { method: 'HEAD', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
        .then((r) => r.ok)
        .catch(() => false),
    ]);

    const title = typeof oembed?.title === 'string' ? oembed.title : null;
    const author = typeof oembed?.author_name === 'string' ? oembed.author_name : null;

    // If neither oEmbed nor a maxres thumbnail confirms the video exists (deleted /
    // private / bogus id), don't rewrite anything: hqdefault would 404 and produce a
    // broken card. Serve the static homepage + default og-image instead.
    if (!title && !hasMaxres) {
      return next();
    }

    // If the shell itself failed, degrade to the static homepage rather than 500
    // or cache an error body.
    if (!htmlRes.ok) {
      return next();
    }
    let html = await htmlRes.text();

    // oEmbed presence proves the video is live, so hqdefault is guaranteed; otherwise we
    // only reached here via a confirmed maxres thumbnail.
    const [imageUrl, imageWidth, imageHeight] = hasMaxres
      ? [maxres, '1280', '720']
      : [hqdefault, '480', '360'];

    const metaTitle = title
      ? `${escapeHtml(title)} · YouTube Looper`
      : 'YouTube Looper - Loop Any Section of a Video';

    const metaDescription = title
      ? escapeHtml(
          author
            ? `Loop this clip from ${author}. Set start and end times and replay any section on YouTube Looper.`
            : 'Loop this clip. Set start and end times and replay any section on YouTube Looper.',
        )
      : 'Loop any section of a YouTube video endlessly on YouTube Looper.';

    // Pin og:url to the canonical host (preview / branch deploys would otherwise
    // advertise a non-canonical, short-lived host) while keeping the clip's query params.
    const shareUrl = escapeHtml(`${CANONICAL_ORIGIN}/${url.search}`);

    html = setMeta(html, 'property', 'og:image', imageUrl);
    html = setMeta(html, 'name', 'twitter:image', imageUrl);
    html = setMeta(html, 'property', 'og:image:width', imageWidth);
    html = setMeta(html, 'property', 'og:image:height', imageHeight);
    html = setMeta(html, 'property', 'og:title', metaTitle);
    html = setMeta(html, 'name', 'twitter:title', metaTitle);
    html = setMeta(html, 'property', 'og:description', metaDescription);
    html = setMeta(html, 'name', 'twitter:description', metaDescription);
    html = setMeta(html, 'property', 'og:url', shareUrl);

    // Guard against silent drift: if index.html's tag format ever changes so the
    // image rewrite no-ops, serve the static homepage rather than a stale generic card.
    if (!html.includes(imageUrl)) {
      return next();
    }

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        // Cache per-URL at the edge so crawlers and repeat opens are instant; revalidate
        // in the background so a transiently-degraded card self-heals.
        'cache-control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400',
      },
    });
  } catch {
    // Any unexpected failure (timeout, network, parse): serve the static homepage
    // unmodified rather than returning a 500.
    return next();
  }
}
