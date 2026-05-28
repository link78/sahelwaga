/**
 * Tiny in-process metrics registry.
 *
 * Exposes Prometheus-style counters/gauges without pulling in `prom-client`.
 * It is intentionally minimal — Phase 6 hardening just needs basic visibility
 * into HTTP traffic, error counts, audit writes and the expiry-scan worker.
 */

type Labels = Record<string, string | number>;

interface CounterEntry {
  name: string;
  help: string;
  values: Map<string, { labels: Labels; value: number }>;
}

interface GaugeEntry {
  name: string;
  help: string;
  values: Map<string, { labels: Labels; value: number }>;
}

const counters = new Map<string, CounterEntry>();
const gauges = new Map<string, GaugeEntry>();

function keyOf(labels: Labels): string {
  const keys = Object.keys(labels).sort();
  return keys.map((k) => `${k}=${labels[k]}`).join('|');
}

export function counter(name: string, help: string): {
  inc: (labels?: Labels, by?: number) => void;
} {
  let entry = counters.get(name);
  if (!entry) {
    entry = { name, help, values: new Map() };
    counters.set(name, entry);
  }
  return {
    inc(labels: Labels = {}, by = 1) {
      const k = keyOf(labels);
      const existing = entry!.values.get(k);
      if (existing) existing.value += by;
      else entry!.values.set(k, { labels, value: by });
    },
  };
}

export function gauge(name: string, help: string): {
  set: (value: number, labels?: Labels) => void;
} {
  let entry = gauges.get(name);
  if (!entry) {
    entry = { name, help, values: new Map() };
    gauges.set(name, entry);
  }
  return {
    set(value: number, labels: Labels = {}) {
      const k = keyOf(labels);
      entry!.values.set(k, { labels, value });
    },
  };
}

function formatLabels(labels: Labels): string {
  const keys = Object.keys(labels);
  if (keys.length === 0) return '';
  const parts = keys
    .sort()
    .map((k) => {
      // Prometheus label value escaping: backslash, double-quote, newline.
      const v = String(labels[k])
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n');
      return `${k}="${v}"`;
    });
  return `{${parts.join(',')}}`;
}

export function render(): string {
  const lines: string[] = [];
  for (const c of counters.values()) {
    lines.push(`# HELP ${c.name} ${c.help}`);
    lines.push(`# TYPE ${c.name} counter`);
    if (c.values.size === 0) {
      lines.push(`${c.name} 0`);
    } else {
      for (const v of c.values.values()) {
        lines.push(`${c.name}${formatLabels(v.labels)} ${v.value}`);
      }
    }
  }
  for (const g of gauges.values()) {
    lines.push(`# HELP ${g.name} ${g.help}`);
    lines.push(`# TYPE ${g.name} gauge`);
    if (g.values.size === 0) {
      lines.push(`${g.name} 0`);
    } else {
      for (const v of g.values.values()) {
        lines.push(`${g.name}${formatLabels(v.labels)} ${v.value}`);
      }
    }
  }
  return lines.join('\n') + '\n';
}

// Pre-register the well-known series so `/metrics` always lists them.
export const httpRequestsTotal = counter(
  'http_requests_total',
  'Total HTTP requests handled, labelled by method, route, status_class.',
);
export const httpErrorsTotal = counter(
  'http_errors_total',
  'HTTP responses with status >= 500.',
);
export const auditEntriesTotal = counter(
  'audit_entries_total',
  'Audit log entries written, labelled by entity/action.',
);
export const auditWriteFailuresTotal = counter(
  'audit_write_failures_total',
  'Audit log writes that threw and were swallowed.',
);
export const expiryScanRunsTotal = counter(
  'expiry_scan_runs_total',
  'Document expiry scans executed, labelled by trigger (scheduled|manual).',
);
export const expiryScanFailuresTotal = counter(
  'expiry_scan_failures_total',
  'Document expiry scan attempts that ended in error after all retries.',
);
export const authLoginTotal = counter(
  'auth_login_total',
  'Login attempts, labelled by outcome (success|invalid|inactive).',
);
export const authRefreshTotal = counter(
  'auth_refresh_total',
  'Refresh-token attempts, labelled by outcome (success|invalid|reused|expired|revoked).',
);
export const authRefreshReuseTotal = counter(
  'auth_refresh_reuse_total',
  'Refresh-token reuse incidents detected (session family revoked).',
);
export const csrfBlockedTotal = counter(
  'csrf_blocked_total',
  'Requests blocked by CSRF middleware.',
);
export const processStartTime = gauge(
  'process_start_time_seconds',
  'UNIX epoch (seconds) at which the API process started.',
);
processStartTime.set(Math.floor(Date.now() / 1000));
