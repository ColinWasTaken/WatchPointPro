import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Navigations and Server Actions (e.g. home-check autosaves) wait out a lost connection and
    // retry when it's back, instead of failing.
    useOffline: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Photography on the public website (Unsplash license: free for commercial use)
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/photo-*" },
    ],
  },
};

export default nextConfig;
