function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDeadline(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function formatEstimate(minutes: number | null): string {
  return minutes === null ? 'Chưa ước lượng' : `${minutes} phút`;
}
