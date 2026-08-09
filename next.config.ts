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
  ...(assetsCdn
    ? {
        async rewrites() {
          return [
            {
              source: "/uploads/:path*",
              destination: `${assetsCdn}/uploads/:path*`,
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;
