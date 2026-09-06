const crypto = require("crypto");

// Optional error aggregation — no-op unless SENTRY_DSN is set AND @sentry/node
// is installed. Keeps the dependency optional.
let Sentry = null;
if (process.env.SENTRY_DSN) {
  try {
    Sentry = require("@sentry/node");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "production",
      tracesSampleRate: Number(process.env.SENTRY_TRACES_RATE || 0),
    });
    console.log(JSON.stringify({ level: "info", msg: "sentry initialised" }));
  } catch {
    console.warn(
      JSON.stringify({ level: "warn", msg: "SENTRY_DSN set but @sentry/node not installed" })
    );
  }
}

// short, sortable-ish request id
function requestId(req, res, next) {
  req.id =
    req.headers["x-request-id"] ||
    crypto.randomBytes(8).toString("hex");
  res.setHeader("x-request-id", req.id);
  next();
}

// one JSON line per request, after the response finishes
function accessLog(req, res, next) {
  if (req.path === "/health") return next();
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    process.stdout.write(
      JSON.stringify({
        level: res.statusCode >= 500 ? "error" : "info",
        ts: new Date().toISOString(),
        type: "access",
        reqId: req.id,
        method: req.method,
        path: req.originalUrl?.split("?")[0],
        status: res.statusCode,
        ms: Math.round(ms),
        ip: req.ip,
        org: req.user?.organization_id,
        user: req.user?.id,
      }) + "\n"
    );
  });
  next();
}

// structured error line + Sentry (if configured)
function logError(err, req) {
  process.stderr.write(
    JSON.stringify({
      level: "error",
      ts: new Date().toISOString(),
      type: "exception",
      reqId: req?.id,
      method: req?.method,
      path: req?.originalUrl?.split("?")[0],
      org: req?.user?.organization_id,
      user: req?.user?.id,
      name: err?.name,
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
    }) + "\n"
  );
  if (Sentry) {
    Sentry.withScope((scope) => {
      if (req) {
        scope.setTag("reqId", req.id);
        scope.setContext("request", {
          method: req.method,
          path: req.originalUrl,
          org: req.user?.organization_id,
          user: req.user?.id,
        });
      }
      Sentry.captureException(err);
    });
  }
}

module.exports = { requestId, accessLog, logError, Sentry };
