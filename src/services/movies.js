import axios from 'axios';

console.log("API Base URL:", process.env.REACT_APP_API_BASE_URL);

class MovieDataService {
  getAll(page = 0) {
    return axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/v1/movies?page=${page}`);
  }

  get(id) {
    return axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/v1/movies/id/${id}`);
  }

  find(query, by = "title", page = 0) {
    return axios.get(
      `${process.env.REACT_APP_API_BASE_URL}/api/v1/movies?${by}=${query}&page=${page}`
    );
  }

  getRatings() {
    return axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/v1/movies/ratings`);
  }

  createReview(data) {
    console.log("Creating review with data:", data);
    return axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/v1/movies/review`, data);
  }

  updateReview(data) {
    console.log("Updating review with data:", data);
    return axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/v1/movies/review`, data);
  }

  deleteReview(reviewId, userId) {
    console.log("Deleting review:", reviewId, "for user:", userId);
    return axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/v1/movies/review`, {
      data: {
        review_id: reviewId,
        user_id: userId
      }
    });
  }
}

export default new MovieDataService();