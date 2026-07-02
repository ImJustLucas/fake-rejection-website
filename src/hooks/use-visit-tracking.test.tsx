import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { useVisitTracking } from './use-visit-tracking';
import * as discord from '../lib/discord';

function Harness({ name, sneaky, id }: { name: string; sneaky: boolean; id?: string }) {
  useVisitTracking(name, sneaky, id);
  return null;
}

describe('useVisitTracking', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(discord, 'notifyVisit').mockResolvedValue();
    vi.spyOn(discord, 'notifyReturn').mockResolvedValue();
    vi.spyOn(discord, 'notifySneaky').mockResolvedValue();
  });
  afterEach(() => vi.restoreAllMocks());

  it('fires a visit on first mount and a return on the next', () => {
    render(<Harness name="Camille" sneaky={false} />);
    expect(discord.notifyVisit).toHaveBeenCalledWith('Camille', undefined);
    expect(discord.notifyReturn).not.toHaveBeenCalled();

    render(<Harness name="Camille" sneaky={false} />);
    expect(discord.notifyReturn).toHaveBeenCalledWith('Camille', undefined);
  });

  it('fires the sneaky webhook when sneaky is true', () => {
    render(<Harness name="Camille" sneaky={true} />);
    expect(discord.notifySneaky).toHaveBeenCalledWith('Camille', undefined);
  });

  it('forwards the id to the webhook calls', () => {
    render(<Harness name="Lou" sneaky={false} id="abcDEF12" />);
    expect(discord.notifyVisit).toHaveBeenCalledWith('Lou', 'abcDEF12');
  });

  it('fires exactly once under StrictMode', () => {
    render(
      <StrictMode>
        <Harness name="Camille" sneaky={false} />
      </StrictMode>,
    );
    expect(discord.notifyVisit).toHaveBeenCalledTimes(1);
  });
});
