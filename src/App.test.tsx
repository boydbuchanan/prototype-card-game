import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import App from './App';

// App fetches cards.csv, cardTemplates.json and scenario.json on mount; all three
// have a .catch, so a rejecting stub exercises the no-data path without network.
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
  // The rejection is the point of the test; don't print its stack.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

test('renders the app header', async () => {
  render(<App />);
  expect(await screen.findByText(/Prototyping Card Game/i)).toBeInTheDocument();
});
