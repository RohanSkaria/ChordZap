import axios from "axios";

class FavoritesDataService {
    getFavorites(userId) {
        return axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/v1/movies/favorites/${userId}`);
    }

    updateFavorites(userId, favorites) {
        return axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/v1/movies/favorites`, {
            userId: userId,
            favorites: favorites
        });
    }
}

export default new FavoritesDataService();