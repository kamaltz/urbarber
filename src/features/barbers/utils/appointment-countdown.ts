/**
 * Informational countdown to a booking's scheduled appointment time, shown
 * on the Service Workspace before the service actually starts. Purely
 * derived from (scheduledAt date, scheduledTime "HH:MM", now) -- never
 * gates any action, never shows a negative/nonsensical value.
 */

export interface AppointmentCountdown {
  minutesUntil: number;
  isLate: boolean;
  /** "Mulai dalam N menit" / "Terlambat N menit" / "Jadwal tidak valid". */
  label: string;
}

export function getAppointmentCountdown(
  scheduledAt: string | null | undefined,
  scheduledTime: string | null | undefined,
  nowMs: number = Date.now()
): AppointmentCountdown | null {
  if (!scheduledAt || !scheduledTime) return null;

  // scheduledAt may be a bare "YYYY-MM-DD" or a full ISO datetime -- take
  // just the date part and combine with scheduledTime "HH:MM" ourselves so
  // this doesn't depend on scheduledAt already carrying a time component.
  const datePart = scheduledAt.slice(0, 10);
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(scheduledTime.trim());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart) || !timeMatch) return null;

  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (hours > 23 || minutes > 59) return null;

  const scheduled = new Date(`${datePart}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
  const scheduledMs = scheduled.getTime();
  if (!isFinite(scheduledMs)) return null;

  const diffMinutes = Math.round((scheduledMs - nowMs) / 60000);

  if (diffMinutes >= 0) {
    return {
      minutesUntil: diffMinutes,
      isLate: false,
      label: diffMinutes === 0 ? 'Jadwal dimulai sekarang' : `Mulai dalam ${diffMinutes} menit`,
    };
  }

  const lateBy = Math.abs(diffMinutes);
  return {
    minutesUntil: diffMinutes,
    isLate: true,
    label: `Terlambat ${lateBy} menit`,
  };
}
