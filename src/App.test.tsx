import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders pollerama app', () => {
  render(<App />);
  const appTitle = screen.getByText(/pollerama/i);
  expect(appTitle).toBeInTheDocument();
});
