export function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function seasonName(d = new Date()) {
  const m = d.getMonth();
  return m >= 2 && m <= 4 ? "Bright Spring" : m >= 5 && m <= 7 ? "Golden Summer" : m >= 8 && m <= 10 ? "Radiant Autumn" : "Quiet Winter";
}

export function timeAgo(iso: string) {
  const s = Math.max(1, (Date.now() - Date.parse(iso)) / 1000);
  const units: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.35, "week"],
    [12, "month"],
    [Infinity, "year"],
  ];
  let value = s;
  for (const [step, unit] of units) {
    if (value < step) return new Intl.RelativeTimeFormat(undefined, { numeric: "auto", style: "short" }).format(-Math.floor(value), unit);
    value /= step;
  }
  return "";
}

export const compact = (n: number) => new Intl.NumberFormat(undefined, { notation: n > 9999 ? "compact" : "standard" }).format(n);

/** Web Share API with a clipboard fallback. Returns a message for a toast. */
export async function shareText(title: string, text: string): Promise<string | null> {
  const url = window.location.origin;
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return null;
    } catch {
      return null; // user dismissed
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n\n— shared from Lumina ${url}`);
    return "Copied to your clipboard";
  } catch {
    return "Sharing isn’t available in this browser";
  }
}
