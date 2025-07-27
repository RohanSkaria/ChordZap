import React, { useState, useEffect, useCallback } from "react";
import { Container } from "react-bootstrap";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import DnDCard from "./DnDCard";
import MovieDataService from "../services/movies";
import "./favorites.css";

const Favorites = ({ user, favorites, setFavorites, saveFavorites }) => {
    const [favoriteMovies, setFavoriteMovies] = useState([]);
    const [hasLoaded, setHasLoaded] = useState(false);

    const loadFavoriteMovies = useCallback(async () => {
        if (!favorites || favorites.length === 0) {
            setFavoriteMovies([]);
            setHasLoaded(true);
            return;
        }

        try {
            const moviePromises = favorites.map(movieId => 
                MovieDataService.get(movieId)
            );
            
            const movieResponses = await Promise.all(moviePromises);
            const movies = movieResponses
                .filter(response => response && response.data)
                .map(response => response.data);
            
            setFavoriteMovies(movies);
            setHasLoaded(true);
        } catch (error) {
            console.log("Error loading favorite movies:", error);
            setFavoriteMovies([]);
            setHasLoaded(true);
        }
    }, [favorites]);

    const moveCard = useCallback((dragIndex, hoverIndex) => {
        setFavoriteMovies(prevCards => {
            const newCards = [...prevCards];
            const draggedCard = newCards[dragIndex];
            newCards.splice(dragIndex, 1);
            newCards.splice(hoverIndex, 0, draggedCard);
            return newCards;
        });
    }, []);


    const saveFavoritesOrder = useCallback(async () => {
        if (!user || !user.googleId || !hasLoaded || favoriteMovies.length === 0) return;
        
        const orderedIds = favoriteMovies.map(movie => movie._id);
        
        try {
            setFavorites(orderedIds);
            
            await MovieDataService.updateFavoritesOrder(user.googleId, orderedIds);
            console.log("Favorites order saved successfully");
        } catch (error) {
            console.log("Error saving favorites order:", error);
            saveFavorites(orderedIds);
        }
    }, [favoriteMovies, user, hasLoaded, setFavorites, saveFavorites]);

    useEffect(() => {
        loadFavoriteMovies();
    }, [loadFavoriteMovies]);


    useEffect(() => {
        if (!hasLoaded || favoriteMovies.length === 0) return;
        
        const timeoutId = setTimeout(saveFavoritesOrder, 500);
        return () => clearTimeout(timeoutId);
    }, [favoriteMovies, saveFavoritesOrder, hasLoaded]);

    if (!user || !user.googleId) {
        return (
            <div className="App">
                <Container className="main-container">
                    <h2>Please log in to view your favorites</h2>
                </Container>
            </div>
        );
    }

    if (!hasLoaded) {
        return (
            <div className="App">
                <Container className="main-container">
                    <h2>Loading your favorites...</h2>
                </Container>
            </div>
        );
    }

    if (favoriteMovies.length === 0) {
        return (
            <div className="App">
                <Container className="main-container">
                    <h2>No favorite movies yet</h2>
                    <p>Start adding movies to your favorites by clicking the stars on the movies page!</p>
                </Container>
            </div>
        );
    }

    return (
        <div className="App">
            <div className="favoritesContainer">
                <div className="favoritesPanel">
                    <h2>Drag your favorites</h2>
                    <h2>to rank them</h2>
                </div>
                <div style={{ flex: 1, padding: '2rem', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <DndProvider backend={HTML5Backend}>
                        {favoriteMovies.map((movie, index) => (
                            <DnDCard
                                key={movie._id}
                                index={index}
                                id={movie._id}
                                movie={movie}
                                moveCard={moveCard}
                            />
                        ))}
                    </DndProvider>
                </div>
            </div>
        </div>
    );
};

export default Favorites;