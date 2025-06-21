import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import mockServer from '../__mocks__/mockServer';
import Movie from '../components/Movie';
import '@testing-library/jest-dom';

beforeAll(() => mockServer.listen());
afterEach(() => mockServer.resetHandlers());
afterAll(() => mockServer.close());

test('renders movie title and correct number of reviews', async () => {
    const MOVIE_TITLE = "Blacksmith Scene";
    const MOVIE_ID = "648cd926a64941686178ebfa";

    render(
        <MemoryRouter initialEntries={[`/movies/${MOVIE_ID}`]}>
            <Routes>
                <Route path="/movies/:id" element={<Movie />} />
            </Routes>
        </MemoryRouter>
    );

    // Wait for the movie title to appear
    await waitFor(() => screen.getByText(MOVIE_TITLE));
    
    // Check that the title is displayed
    expect(screen.getByText(MOVIE_TITLE)).toBeInTheDocument();
    
    // Check that "No reviews yet" is displayed (since our mock has 0 reviews)
    expect(screen.getByText("No reviews yet.")).toBeInTheDocument();
});