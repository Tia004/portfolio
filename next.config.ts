import type { NextConfig } from "next";

// When set (e.g. on Vercel: ASSETS_CDN_URL="https://assets.tiadesigns.it" or a
// pub-*.r2.dev URL), every /uploads/* request is served from the external
// asset CDN (Cloudflare R2) instead of the local public/ folder. URLs in the
// code stay untouched — no file paths need rewriting. When unset (local dev),
// files are served from public/ as usual.
const assetsCdn = process.env.ASSETS_CDN_URL?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // The upload route writes to `public/uploads` via process.cwd(), which makes
  // Next.js's output file-tracing bundle the ENTIRE `public/` tree (267MB+ of
  // images) into every function that touches it — blowing past Vercel's 250MB
  // per-function limit. Static assets in `public/` are served by Vercel's CDN
  // (or the R2 CDN via the rewrite below), never from inside a serverless
  // function, so they must be excluded from the trace. Writes at runtime still
  // work (fs.mkdir recursive creates the dir).
  outputFileTracingExcludes: {
    "/*": ["./public/**"],
  },
  // Domain-verification files live in public/.well-known/ (see
  // public/.well-known/discord): a static file has no routing edge cases and
  // is served by the CDN. They have no extension, so the server would guess
  // application/octet-stream; verification services expect the raw text, so the
  // type is pinned per file — and the cache is kept short so a re-verification
  // never reads a stale copy.
  async headers() {
    return [
      {
        source: "/.well-known/:file",
        headers: [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=300" },
        ],
      },
    ];
  },
  ...(assetsCdn
    ? {
        async rewrites() {
          return {
            // beforeFiles: evaluated BEFORE the filesystem, so these take
            // precedence over the files still shipped in public/ (which stay
            // there as the GitHub Actions sync source + local dev). Without
            // this, Vercel serves the local copy and the CDN is never used.
            beforeFiles: [
              {
                source: "/uploads/:path*",
                destination: `${assetsCdn}/uploads/:path*`,
              },
            ],
          };
        },
      }
    : {}),
};

export default nextConfig;
