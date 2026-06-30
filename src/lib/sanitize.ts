// src/lib/sanitize.ts

/** Remove backticks + control chars, neutralize @ mentions, trim, truncate. */
export function sanitizeText(raw: string, max = 100): string {
  return raw
    .replace(/[`\x00-\x1F]/g, ' ')
    .replace(/@/g, '@​')
    .trim()
    .slice(0, max);
}

/** Sanitize a display/name string; fall back to "Toi" if nothing usable remains. */
export function sanitizeName(raw: string): string {
  const cleaned = sanitizeText(raw, 40);
  return cleaned || 'Toi';
}
