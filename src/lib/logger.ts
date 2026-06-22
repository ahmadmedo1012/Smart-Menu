type LogLevel = "debug" | "info" | "warn" | "error";

const isDev = process.env.NODE_ENV !== "production";

const colors: Record<LogLevel, string> = {
  debug: "\x1b[36m",
  info: "\x1b[32m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
};

const reset = "\x1b[0m";
const bold = "\x1b[1m";

function timestamp(): string {
  return new Date().toISOString();
}

function requestId(): string {
  return ((globalThis as Record<string, unknown>).__requestId as string) ?? crypto.randomUUID().slice(0, 8);
}

export function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const ts = timestamp();
  const rid = requestId();

  if (isDev) {
    const c = colors[level] ?? "";
    const prefix = `${c}${bold}[${level.toUpperCase()}]${reset}`;
    const line = `${prefix} ${ts} [${rid}] ${message}`;
    const args: unknown[] = [line];
    if (meta) args.push(meta);
    (level === "error" ? console.error : console.log)(...args);
  } else {
    const entry = { timestamp: ts, level, message, requestId: rid, ...meta };
    (level === "error" ? console.error : console.log)(JSON.stringify(entry));
  }
}

export function debug(message: string, meta?: Record<string, unknown>): void {
  log("debug", message, meta);
}

export function info(message: string, meta?: Record<string, unknown>): void {
  log("info", message, meta);
}

export function warn(message: string, meta?: Record<string, unknown>): void {
  log("warn", message, meta);
}

export function error(message: string, meta?: Record<string, unknown>): void {
  log("error", message, meta);
}
