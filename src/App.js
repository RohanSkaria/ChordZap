import {useState,useEffect,useCallback} from 'react';
import {GoogleOAuthProvider} from '@react-oauth/google';
import { Routes, Route, Link } from 'react-router-dom';
import "bootstrap/dist/css/bootstrap.min.css";
import Container from 'react-bootstrap/Container';
import { Navbar, Nav } from 'react-bootstrap';

import MoviesList from "./components/MoviesList";
import Login from "./components/Login";
import Logout from "./components/Logout";
import Movie from "./components/Movie";
import AddReview from "./components/AddReview";
import FavoritesDataService from "./services/favorites";

import './App.css';

const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

function App() {
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  
  const loadFavorites = useCallback(async () => {
    if (user && user.googleId) {
      console.log("Loading favorites for user:", user.googleId);
      try {
        const response = await FavoritesDataService.getFavorites(user.googleId);
        console.log("Response from server:", response.data); 
        if (response.data && response.data.favorites) {
          setFavorites(response.data.favorites);
        } else {
          setFavorites([]);
        }
      } catch (error) {
        console.log("Error loading favorites:", error);
        setFavorites([]);
      }
      setFavoritesLoaded(true);
    }
  }, [user]);

  const saveFavorites = useCallback(async (favoritesList) => {
    if (user && user.googleId && favoritesLoaded) {
      console.log("Saving favorites:", favoritesList, "for user:", user.googleId);
      try {
        await FavoritesDataService.updateFavorites(user.googleId, favoritesList);
        console.log("Favorites saved successfully");
      } catch (error) {
        console.log("Error saving favorites:", error);
      }
    }
  }, [user, favoritesLoaded]);

  const addFavorite = (movieId) => {
    const newFavorites = [...favorites, movieId];
    setFavorites(newFavorites);
    saveFavorites(newFavorites);
  }
  
  const deleteFavorite = (movieId) => {
    const newFavorites = favorites.filter(f => f !== movieId);
    setFavorites(newFavorites);
    saveFavorites(newFavorites);
  }

  console.log(clientId);

  useEffect(() => {
    let loginData = JSON.parse(localStorage.getItem('login'));
    if (loginData) {
      let loginExp = loginData.exp;
      let now = Date.now() / 1000;
      if (now<loginExp) {
        setUser(loginData);
      } else{
        localStorage.setItem('login', null);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadFavorites();
    } else {
      setFavorites([]);
      setFavoritesLoaded(false);
    }
  }, [user, loadFavorites]);


  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="App">
        <Navbar bg="primary" expand="lg" sticky="top" variant="dark">
          <Container className="container-fluid">
            <Navbar.Brand href="/">
              <img src="/images/movies-logo.png" alt="movies logo" className="moviesLogo"/>
              MOVIE TIME
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="responsive-navbar-nav">
              <Nav className="ml-auto">
                <Nav.Link as={Link} to="/movies">
                  Movies
                </Nav.Link>
              </Nav>
            </Navbar.Collapse>
            {user ? <Logout setUser={setUser} clientId={clientId} /> : <Login setUser={setUser} />}
          </Container>
        </Navbar>
        <Routes>
          <Route exact path="/" element={
            <MoviesList 
              user={user}
              favorites={favorites}
              addFavorite={addFavorite}
              deleteFavorite={deleteFavorite}
          />} />
          <Route exact path="/movies" element={
            <MoviesList 
              user={user}
              favorites={favorites}
              addFavorite={addFavorite}
              deleteFavorite={deleteFavorite}
          />} />
          <Route path="/movies/:id" element={<Movie user={user} />} />
        </Routes>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
