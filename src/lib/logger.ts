type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function serialize(data: unknown): Record<string, unknown> {
  if (data === undefined || data === null) return {};
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return { value: data };
}

export function log(level: LogLevel, event: string, data?: unknown): void {
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...serialize(data),
  };
  const out = JSON.stringify(payload);
  if (level === 'error') console.error(out);
  else if (level === 'warn') console.warn(out);
  else console.log(out);
}

export function info(event: string, data?: unknown): void {
  log('info', event, data);
}

export function warn(event: string, data?: unknown): void {
  log('warn', event, data);
}

export function error(event: string, data?: unknown): void {
  log('error', event, data);
}

export function debug(event: string, data?: unknown): void {
  log('debug', event, data);
}

export default { log, info, warn, error, debug };
