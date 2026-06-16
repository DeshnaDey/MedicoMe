import type { NextConfig } from "next";

// Baseline security headers applied to every response. Kept conservative on
// purpose — no strict CSP yet (it needs nonces to work with Next's inline
// styles), but these cover clickjacking, MIME sniffing, referrer leakage, and
// force HTTPS. HSTS is safe because the app is HTTPS-only on Vercel.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;