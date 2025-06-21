import { rest } from "msw";
import { setupServer } from "msw/node";

const mockRatingsResponse = ["AO", "APPROVED", "Approved", "G", "GP"];

const mockMoviesResponse = {
    "movies": [
        {
            "_id": "648cd926a64941686178ebfa",
            "plot": "Three men hammer on an anvil and pass a bottle of beer around",
            "title": "Blacksmith Scene",
            "fullplot": "A stationary camera looks at a large anvil",
            "rated": "UNRATED",
            "poster": "https://example.com/poster1"
        },
        {
            "_id": "648cd926a64941686178ebfb",
            "plot": "A man in a gorilla suit jumps around and growls",
            "title": "Gorilla Scene",
            "fullplot": "A man in a gorilla suit jumps around and growls",
            "rated": "TV-G",
            "poster": "https://example.com/poster2"
        }
    ],
    "page": 0,
    "filters": {},
    "entries_per_page": 20,
    "total_results": 2
};

const mockSingleMovie = {
    "_id": "648cd926a64941686178ebfa",
    "plot": "Three men hammer on an anvil and pass a bottle of beer around",
    "title": "Blacksmith Scene",
    "fullplot": "A stationary camera looks at a large anvil with detailed metalworking scenes",
    "rated": "UNRATED",
    "poster": "https://example.com/poster1",
    "reviews": []
};

const mockServer = setupServer(
    rest.get("http://localhost:5000/api/v1/movies/ratings", (_, res, ctx) => {
        return res(ctx.status(200), ctx.json(mockRatingsResponse));
    }),
    rest.get("http://localhost:5000/api/v1/movies", (_, res, ctx) => {
        return res(ctx.status(200), ctx.json(mockMoviesResponse));
    }),
    rest.get("http://localhost:5000/api/v1/movies/:id", (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(mockSingleMovie));
    })
);

export default mockServer;