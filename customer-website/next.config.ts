
import type { NextConfig } from "next";
import {
  CSP_FONT_ORIGINS,
  CSP_FRAME_ORIGINS,
  CSP_SCRIPT_ORIGINS,
  CSP_STYLE_ORIGINS,
} from "./src/lib/ghl";

/*
 * Security headers.
 *
 * CSP_FRAME_ANCESTORS is a space-separated list of full origins allowed to
 * embed this website, for example:
 * https://your-ghl-domain.example
 *
 * Keep this list restricted to trusted origins.
 */

function originOf(url: string | undefined): string | null {
  if (!url) return null;

  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

const isDev = process.env.NODE_ENV === "development";
const dashboardOrigin = originOf(process.env.DASHBOARD_API_URL);

const ghlOrigins = [
  "https://*.leadconnectorhq.com",
  "https://*.msgsndr.com",
];

const extraFrames = (process.env.CSP_EXTRA_FRAME_SRC ?? "")
  .split(/\s+/)
  .map((s) => originOf(s))
  .filter((s): s is string => Boolean(s));

const frameAncestors = [
  "'self'",
  ...(process.env.CSP_FRAME_ANCESTORS ?? "")
    .split(/\s+/)
    .map((s) => originOf(s))
    .filter((s): s is string => Boolean(s)),
];

const httpImageOrigin =
  dashboardOrigin?.startsWith("http:")
    ? ` ${dashboardOrigin}`
    : "";

const upgradeInsecure =
  !isDev && Boolean(dashboardOrigin?.startsWith("https:"));

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://link.msgsndr.com ${CSP_SCRIPT_ORIGINS.join(" ")}`,
  `style-src 'self' 'unsafe-inline' ${CSP_STYLE_ORIGINS.join(" ")}`,
  `img-src 'self' data: blob: https:${httpImageOrigin}`,
  `font-src 'self' ${CSP_FONT_ORIGINS.join(" ")}`,
  `connect-src 'self' ${ghlOrigins.join(" ")}`,
  `frame-src ${[...ghlOrigins, ...CSP_FRAME_ORIGINS, ...extraFrames].join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  `frame-ancestors ${frameAncestors.join(" ")}`,
  ...(upgradeInsecure ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // Keep the app rooted in this project directory.
  turbopack: { root: process.cwd() },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), usb=(), browsing-topics=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
