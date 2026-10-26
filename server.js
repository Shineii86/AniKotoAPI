/*
 * ======= • ======= • ======= • ======= • =======• =======
 * AniKotoAPI — server.js
 * Repository: https://github.com/Shineii86/AniKotoAPI
 *
 * @description
 *   Main entry point for the AniKotoAPI Express server. Wires the middleware
 *   stack (compression, request IDs, CORS, security headers, cache scope,
 *   rate limiting, attribution, timeout), mounts the route modules and starts
 *   the server on the configured port.
 *
 *   Middleware lives in src/middleware/* and route groups in src/routes/* —
 *   this file is only the composition root.
 *
 * @exports
 *   None (side-effect: starts Express server)
 *
 * @author  Shinei Nouzen
 * @license MIT
 * ======= • ======= • ======= • ======= • =======• =======
 */

// WARNING: This import must stay first. Static imports are evaluated before the
// module body runs, so a dotenv.config() call down there fires only after every
// helper has already been evaluated — and helpers that read process.env at their
// top level (mirror, cache, proxy, streamProxy) would silently keep their
// defaults. Importing dotenv/config runs config() as an import side effect, so
// .env is populated before any of those modules load.
import "dotenv/config";
import express from "express";
import compression from "compression";
import path from "path";
import fs from "fs";

import { createApiRoutes } from "./src/routes/apiRoutes.js";
import { addCreatorInfo } from "./src/middleware/creatorInfo.js";
import { sanitizeJson } from "./src/middleware/sanitizeJson.middleware.js";
import { assignRequestId } from "./src/middleware/requestId.middleware.js";
import { createCorsMiddleware } from "./src/middleware/cors.middleware.js";
import { addSecurityHeaders } from "./src/middleware/securityHeaders.middleware.js";
import { createRateLimiter } from "./src/middleware/rateLimit.middleware.js";
import { requestTimeout } from "./src/middleware/timeout.middleware.js";
import { runWithCacheScope } from "./src/helper/cache.helper.js";
import { jsonResponse, jsonError } from "./src/helper/response.helper.js";

// ══════════════════════════════════════════════════════════════
// SERVER CONFIGURATION
// ══════════════════════════════════════════════════════════════

const app = express();
const PORT = process.env.PORT || 4444;
const publicDir = path.join(process.cwd(), "public");
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",");

// ---- FEATURE: Reverse-proxy trust (needed for correct per-client IPs) ----
// NOTE: Render/Vercel/nginx put the real client IP in X-Forwarded-For. Without
// this setting Express sees only the proxy's address, so every visitor would
// share a single rate-limit bucket. TRUST_PROXY=false disables it for
// directly-exposed deployments (where a client could otherwise spoof XFF).
const parseTrustProxy = (raw) => {
  if (raw === undefined || raw === "") return 1;
  const value = String(raw).trim().toLowerCase();
  if (["false", "0", "no", "off"].includes(value)) return false;
  if (["true", "yes", "on"].includes(value)) return true;
  const asNumber = Number(value);
  return Number.isNaN(asNumber) ? value : asNumber;
};
app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));

// ---- FEATURE: Response compression ----
app.use(compression({
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) return false;
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
}));

// ---- FEATURE: Request body size limits ----
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

// ══════════════════════════════════════════════════════════════
// CORE MIDDLEWARE
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Unique request ID for debugging ----
app.use(assignRequestId);

// ---- FEATURE: CORS (origin allowlist + preflight) ----
app.use(createCorsMiddleware(allowedOrigins));

// ---- FEATURE: Security headers ----
app.use(addSecurityHeaders);

// ---- FEATURE: Request cache scope (?refresh=1 bypasses the cache) ----
// NOTE: The scope is AsyncLocalStorage-backed, so every getCache() call made
// while handling this request can honour the bypass without the controller
// having to receive `req`. It also carries `res` for the X-Cache header.
app.use((req, res, next) => {
  const refresh = req.query?.refresh;
  runWithCacheScope({ bypass: refresh === "1" || refresh === "true", res }, next);
});

// ══════════════════════════════════════════════════════════════
// STATIC FILES
// ══════════════════════════════════════════════════════════════

// NOTE: redirect: false prevents automatic redirects to index.html
app.use(express.static(publicDir, { redirect: false }));

// ══════════════════════════════════════════════════════════════
// CLEAN URL ROUTES
// ══════════════════════════════════════════════════════════════

// Serve HTML files without .html extension
app.get("/tos", (req, res) => {
  res.sendFile(path.join(publicDir, "tos.html"));
});

app.get("/privacy", (req, res) => {
  res.sendFile(path.join(publicDir, "privacy.html"));
});

// ══════════════════════════════════════════════════════════════
// API MIDDLEWARE
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Creator info middleware (injects attribution into all responses) ----
// NOTE: Registered before the rate limiter so 429 responses carry the
// creator envelope too — a limiter reply must look like every other reply.
app.use(addCreatorInfo);

// ---- FEATURE: Response sanitizer (HTML entities + numeric id normalization) ----
// NOTE: Upstream titles/descriptions ship raw entities (&amp;, &nbsp, &#39; …)
// and stringified numeric ids. This runs once at the JSON boundary so every
// endpoint returns clean, consistent payloads.
app.use(sanitizeJson);

// ---- FEATURE: Rate limiting (configurable, default 100 requests per minute per IP) ----
// NOTE: /api/health and /api/openapi are unauthenticated read-only probes —
// monitoring and spec readers must not be throttled out of the window.
app.use(createRateLimiter({
  skip: (req) => req.path === "/api/health" || req.path === "/api/openapi",
}));

// ---- FEATURE: Request timeout middleware (30 seconds) ----
app.use(requestTimeout);

// ══════════════════════════════════════════════════════════════
// API ROUTES
// ══════════════════════════════════════════════════════════════

createApiRoutes(app, jsonResponse, jsonError);

// ══════════════════════════════════════════════════════════════
// 404 HANDLER
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Global error handler ----
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.id} ${err.message}`, err.stack);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: "Request entity too large" });
  }
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? "Internal server error" : err.message
  });
});

// ---- FEATURE: Catch-all 404 handler for undefined routes ----
app.use((req, res) => {
  // NOTE: API consumers get JSON, never the HTML error page — otherwise
  // clients parsing res.json() crash on "<!DOCTYPE html>"
  if (req.path.startsWith("/api")) {
    return res.status(404).json({
      success: false,
      message: "Endpoint not found",
    });
  }
  const filePath = path.join(publicDir, "404.html");
  if (fs.existsSync(filePath)) {
    res.status(404).sendFile(filePath);
  } else {
    res.status(404).json({
      success: false,
      message: "Endpoint not found",
      availableEndpoints: [
        "/", "/search", "/search/suggest", "/info", "/watch",
        "/episodes/:id", "/episodes-ajax/:id", "/stream", "/servers",
        "/mapper-servers", "/download", "/stream/resolve",
        "/stream/qualities", "/stream/proxy", "/stream/ts-proxy",
        "/stream/embeds", "/anilist/:id", "/anilist/season",
        "/spotlight", "/trending", "/top-ten", "/suggestions",
        "/random", "/most-popular", "/upcoming", "/top-rankings",
        "/recently-updated", "/completed", "/new-release",
        "/newly-added", "/latest-updated", "/trending-sidebar",
        "/seasons/:id", "/watch-order/:id", "/az-list/:letter",
        "/filter", "/genre/:genre", "/type/:type", "/status/:status",
        "/schedule", "/health", "/stats", "/cache/stats",
        "/mirrors", "/openapi"
      ]
    });
  }
});

// ══════════════════════════════════════════════════════════════
// SERVER START
// ══════════════════════════════════════════════════════════════

const server = app.listen(PORT, () => {
  console.info(`AniKotoAPI listening at ${PORT}`);
});

// ══════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ══════════════════════════════════════════════════════════════

// ---- FEATURE: Graceful shutdown handling ----
const gracefulShutdown = (signal) => {
  console.info(`\n[SHUTDOWN] Received ${signal}. Starting graceful shutdown...`);
  server.close(() => {
    console.info("[SHUTDOWN] Server closed. Goodbye.");
    process.exit(0);
  });
  setTimeout(() => {
    console.error("[SHUTDOWN] Forced shutdown after timeout.");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason, promise) => {
  console.error("[UNHANDLED] Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[UNCAUGHT] Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

// ══════════════════════════════════════════════════════════════ END: server.js
