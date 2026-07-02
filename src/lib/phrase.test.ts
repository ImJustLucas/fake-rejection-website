// src/lib/phrase.test.ts
import { describe, it, expect } from 'vitest';
import { renderPhrase } from './phrase';

describe('renderPhrase', () => {
  it('replaces the {prenom} token', () => {
    expect(renderPhrase('{prenom}, un date ?', 'Lou')).toBe('Lou, un date ?');
  });
  it('replaces every occurrence', () => {
    expect(renderPhrase('{prenom} & {prenom}', 'Lou')).toBe('Lou & Lou');
  });
  it('returns the default question when the phrase is empty', () => {
    expect(renderPhrase('', 'Lou')).toBe('Lou, veux-tu venir en date avec moi\u00A0?');
  });
  it('returns the phrase as-is when there is no token', () => {
    expect(renderPhrase('On se voit ?', 'Lou')).toBe('On se voit ?');
  });
});
