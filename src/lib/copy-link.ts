// src/lib/copy-link.ts
import { toast } from 'sonner';

/** Build the shareable URL for a stored link id. */
export function linkUrl(id: string): string {
  return `${window.location.origin}/?id=${id}`;
}

/** Copy text to the clipboard and toast the outcome. */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Lien copié !', { description: text });
  } catch {
    toast.error('Copie impossible (permissions du navigateur ?)');
  }
}
