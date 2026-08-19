/**
 * Service timer -- derives elapsed service time from the canonical
 * `startedAt` timestamp (set server-side by POST /api/barber/bookings/status
 * on accepted -> in_progress) rather than persisting a per-second counter.
 * Purely a function of (startedAt, now), so it recovers correctly across
 * remounts, app backgrounding, and multiple devices open on the same
 * booking -- there is no local state to lose or drift.
 */

export interface ElapsedTime {
  totalSeconds: number;
  formatted: string; // HH:MM:SS
}

/** Returns null when there is no valid startedAt yet (service hasn't started). */
export function getElapsedSeconds(startedAt: string | null | undefined, nowMs: number = Date.now()): number | null {
  if (!startedAt) return null;
  const startMs = new Date(startedAt).getTime();
  if (!isFinite(startMs)) return null;
  const diff = Math.floor((nowMs - startMs) / 1000);
  return diff < 0 ? 0 : diff;
}

export function formatElapsed(totalSeconds: number): string {
  const safe = isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function getElapsedTime(startedAt: string | null | undefined, nowMs: number = Date.now()): ElapsedTime | null {
  const totalSeconds = getElapsedSeconds(startedAt, nowMs);
  if (totalSeconds === null) return null;
  return { totalSeconds, formatted: formatElapsed(totalSeconds) };
}

/**
 * Informational only -- never gates completion. `true` once elapsed time
 * passes the service's estimated duration; callers must show this as
 * neutral copy ("melewati estimasi"), never as an error/failure state.
 */
export function hasExceededEstimate(elapsedSeconds: number, estimatedMinutes: number | null | undefined): boolean {
  if (!estimatedMinutes || estimatedMinutes <= 0) return false;
  return elapsedSeconds > estimatedMinutes * 60;
}
