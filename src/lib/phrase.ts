// src/lib/phrase.ts
export function renderPhrase(phrase: string, name: string): string {
  const p = phrase.trim();
  if (!p) return `${name}, veux-tu venir en date avec moi ?`;
  return p.replace(/\{prenom\}/g, name);
}
