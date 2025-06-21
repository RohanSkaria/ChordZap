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

    await waitFor(() => screen.getByText(MOVIE_TITLE));
    
    expect(screen.getByText(MOVIE_TITLE)).toBeInTheDocument();
    
    expect(screen.getByText("No reviews yet.")).toBeInTheDocument();
});