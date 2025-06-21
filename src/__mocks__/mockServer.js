import {rest} from "msw";
import {setupServer} from "msw/node";

console.log(`Mock server base URL: ${process.env.REACT_APP_API_BASE_URL}`);

const mockRatingsResponse = ["AO","APPROVED","Approved","G","GP"]
const mockMoviesResponse = {
    "movies": [
        {
            "_id": "648cd926a64941686178ebfa",
            "plot": "Three men hammer on an anvil and pass a bottle of beer around",
            "title": "Blacksmith Scene",
            "fullplot": "A stationary camera looks at a large anvil",
            "rated": "UNRATED",

        },
        {
            "_id": "648cd926a64941686178ebfb",
            "plot": "A man in a gorilla suit jumps around and growls",
            "title": "Gorilla Scene",
            "fullplot": "A man in a gorilla suit jumps around and growls",
            "rated": "TV-G",
        }],
        "page": 0,
        "filters": {},
        "entries_per_page": 20,
        "total_results": 2
    };

   const mockServer = setupServer(
    rest.get(`${process.env.REACT_APP_API_BASE_URL}/api/v1/movies/ratings`, (_, res, ctx) => {
        return res(ctx.status(200), ctx.json(mockRatingsResponse))
    }),
    rest.get(`${process.env.REACT_APP_API_BASE_URL}/api/v1/movies`, (
        _, res, ctx) => {
        return res(ctx.status(200), ctx.json(mockMoviesResponse))
    })
   );

   export default mockServer;