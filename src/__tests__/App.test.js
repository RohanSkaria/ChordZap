import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import mockServer from '../__mocks__/mockServer';
import App from '../App';

// Import the jest-dom matchers
import '@testing-library/jest-dom';

beforeAll(() => mockServer.listen());
afterEach(() => mockServer.resetHandlers());
afterAll(() => mockServer.close());

test('renders top-level application text', () => {
  const APP_TEXT = "MOVIE TIME";
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
  const textElement = screen.getByText(APP_TEXT);
  expect(textElement).toBeInTheDocument();
});