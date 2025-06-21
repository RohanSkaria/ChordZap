import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Image } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import MovieDataService from '../services/movies';
import './Movie.css';

const Movie = () => {
    const { id } = useParams();
    const [movie, setMovie] = useState({
        id: null,
        title: "",
        rated: "",
        reviews: []
    });

    useEffect(() => {
        const getMovie = (id) => {
            MovieDataService.get(id)
                .then(response => {
                    console.log("Movie data received:", response.data);
                    setMovie(response.data);
                })
                .catch(e => {
                    console.log("Error fetching movie, using mock data:", e);
                    const mockMovie = {
                        _id: id,
                        title: "Blacksmith Scene",
                        plot: "Three men hammer on an anvil and pass a bottle of beer around. A stationary camera looks at a large anvil.",
                        rated: "UNRATED",
                        poster: null,
                        reviews: []
                    };
                    setMovie(mockMovie);
                });
        };

        getMovie(id);
    }, [id]);

    return (
        <div className="App">
            <Container className="main-container">
                <Row>
                    <Col>
                        <div className="poster">
                            <Image
                                className="bigPicture"
                                src={movie.poster ? movie.poster + "/100px250" : "/images/NoPosterAvailable-crop.jpg"}
                                alt={movie.title || "No poster available"}
                                fluid
                                onError={(e) => {
                                    e.target.src = "/images/NoPosterAvailable-crop.jpg";
                                }}
                            />
                        </div>
                    </Col>
                    <Col>
                        <Card>
                            <Card.Header as="h5">{movie.title}</Card.Header>
                            <Card.Body>
                                <Card.Text>
                                    {movie.plot}
                                </Card.Text>
                            </Card.Body>
                        </Card>
                        <h2>Reviews</h2>
                        <br />
                        {movie.reviews && movie.reviews.length > 0 ? (
                            movie.reviews.map((review, index) => (
                                <div key={index}>
                                    <div className="d-flex">
                                        <div className="flex-shrink-0 reviewsText">
                                            <h5>{review.name + " reviewed on "}</h5>
                                            <p className="review">{review.review}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p>No reviews yet.</p>
                        )}
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Movie;