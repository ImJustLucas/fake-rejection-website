// src/server/messages.test.ts
import { describe, it, expect } from 'vitest';
import { buildMessage } from './messages';

describe('buildMessage', () => {
  it('builds each event with the right emoji and name', () => {
    expect(buildMessage('visit', 'Lou')).toContain('👀');
    expect(buildMessage('return', 'Lou')).toContain('🔁');
    expect(buildMessage('sneaky', 'Lou')).toContain('🕵️');
    expect(buildMessage('accepted', 'Lou')).toContain('✅');
    expect(buildMessage('visit', 'Lou')).toContain('Lou');
  });
  it('includes the sanitized note (mentions neutralized)', () => {
    const msg = buildMessage('note', 'Lou', '@everyone insta');
    expect(msg).toContain('💌');
    expect(msg).not.toContain('@everyone');
  });
});
