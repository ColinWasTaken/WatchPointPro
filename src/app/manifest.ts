import type { MetadataRoute } from "next";

// Lets WatchPointPro be added to a phone's home screen and open full-screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WatchPointPro",
    short_name: "WatchPointPro",
    description: "Digital home checks for home-watch companies and the homeowners they serve.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f1f1ee",
    theme_color: "#f1f1ee",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
