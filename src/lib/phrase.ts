// src/lib/phrase.ts
export function renderPhrase(phrase: string, name: string): string {
  const p = phrase.trim();
  if (!p) return `${name}, veux-tu venir en date avec moi\u00A0?`;
  return p.replace(/\{prenom\}/g, name);
}
