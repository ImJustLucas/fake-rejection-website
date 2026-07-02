// src/server/ids.ts
import { customAlphabet } from 'nanoid';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nano = customAlphabet(ALPHABET, 8);

export function generateId(): string {
  return nano();
}

export function isValidId(id: string): boolean {
  return /^[0-9A-Za-z]{8}$/.test(id);
}
