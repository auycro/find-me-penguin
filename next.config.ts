import type { NextConfig } from "next";

// Basic hardening. No Content-Security-Policy on purpose: the HEIC decoder (heic-to) needs
// relaxed script rules, and a strict CSP would silently break iPhone photos.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera is left alone: phone photos come through the camera file input, and a stricter
  // policy there is not worth the risk of breaking it.
  { key: "Permissions-Policy", value: "microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
