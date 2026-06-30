// src/lib/sanitize.ts

/** Remove backticks + control chars, neutralize @ mentions, trim, truncate (code-point safe). */
export function sanitizeText(raw: string, max = 100): string {
  const cleaned = raw.replace(/[`\x00-\x1F]/g, ' ').trim();
  const truncated = [...cleaned].slice(0, max).join('');
  return truncated.replace(/@/g, '@​');
}

/** Sanitize a display/name string; fall back to "Toi" if nothing usable remains. */
export function sanitizeName(raw: string): string {
  const cleaned = sanitizeText(raw, 40);
  return cleaned || 'Toi';
}
