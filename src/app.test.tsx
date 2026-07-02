import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './app';
import * as discord from './lib/discord';
import * as confettiLib from './lib/confetti';

describe('App happy path (name link)', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/?name=Camille&mode=grow');
    vi.spyOn(discord, 'notifyVisit').mockResolvedValue();
    vi.spyOn(discord, 'notifyAccepted').mockResolvedValue();
    vi.spyOn(discord, 'notifyNote').mockResolvedValue();
    vi.spyOn(confettiLib, 'firePinkConfetti').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows the personalized question, accepts, and sends a note', () => {
    render(<App />);
    expect(screen.getByText(/Camille, veux-tu venir en date/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Oui/ }));
    expect(discord.notifyAccepted).toHaveBeenCalledWith('Camille', undefined);
    expect(confettiLib.firePinkConfetti).toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText(/petit mot/), { target: { value: '@camille_insta' } });
    fireEvent.click(screen.getByRole('button', { name: /Envoyer/ }));
    expect(discord.notifyNote).toHaveBeenCalledWith('Camille', '@camille_insta', undefined);
    expect(screen.getByText(/C'est noté/)).toBeInTheDocument();
    expect(confettiLib.firePinkConfetti).toHaveBeenCalledTimes(2);
  });
});
