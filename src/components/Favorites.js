import React, { useState, useEffect, useCallback } from "react";
import { Container } from "react-bootstrap";
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import DnDCard from "./DnDCard";
import MovieDataService from "../services/movies";
import "./favorites.css";

const Favorites = ({ user }) => {
    const [favoriteMovies, setFavoriteMovies] = useState([]);
    const [hasLoaded, setHasLoaded] = useState(false);
    
    const retrieveFavorites = useCallback(async () => {
        if (!user || !user.id) return;

        MovieDataService.getFavorites(user.id)
            .then(response => {
                setFavoriteMovies(response.data);
                setHasLoaded(true);
            })
            .catch(e => {
                console.error("Error retrieving favorites:", e);
            });
    }, [user]);

    const moveCard = useCallback((dragIndex, hoverIndex) => {
        setFavoriteMovies(prevCards => {
            const newCards = [...prevCards];
            const draggedCard = newCards[dragIndex];
            newCards.splice(dragIndex, 1);
            newCards.splice(hoverIndex, 0, draggedCard);
            return newCards;
        });
    }, []);

    useEffect(() => {
        retrieveFavorites();
    }, [retrieveFavorites]);

    useEffect(() => {
        if(!hasLoaded || favoriteMovies.length === 0) return;

        const timeoutId = setTimeout(saveFavoritesOrder, 500);
        return () => clearTimeout(timeoutId);
    }, [favoriteMovies, saveFavoritesOrder, hasLoaded]);

    if(!user || !user.id) {
        return (
            <div className="App">
                <Container className="main-container">
                    <h2>Please login to view your favorites</h2>
                </Container>
            </div>
        );
    }

    if(!hasLoaded) {
        return (
            <div className="App">
                <Container className="main-container">
                    <h2>Loading favorites...</h2>
                </Container>
            </div>
        )
    }

    if(favoriteMovies.length === 0) {
        return (
            <div className="App">
                <Container className="main-container">
                    <h2>No favorites yet</h2>
                    <p>Add some movies to your favorites list</p>
                </Container>
            </div>
        );
    }

    return (
        <div className="App">
            <Container className="main-container">
                <div className="favoritesContainer">
                    <div className="favoritesPanel">
                        <h2>My Favorites</h2>
                        <p>Drag and drop to reorder your favorites</p>
                        <DndProvider backend={HTML5Backend}>
                            {favoriteMovies.map((movie, index) => (
                                <DnDCard
                                    key={movie._id}
                                    movie={movie}
                                    id = {movie._id}
                                    index={index}
                                    moveCard={moveCard}
                                />
                            ))}
                        </DndProvider>
                    </div>
                </div>
            </Container>
        </div>
    );
};

export default Favorites;