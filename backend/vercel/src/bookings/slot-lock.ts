export function getSlotLockId(barberId: string, date: string, startTime: string): string {
  const cleanDate = (date || '').trim();
  const cleanTime = (startTime || '').replace(':', '').trim();
  return `${barberId}_${cleanDate}_${cleanTime}`;
}
