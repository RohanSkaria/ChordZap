import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Image, Button } from 'react-bootstrap';
import { useParams, Link } from 'react-router-dom';
import MovieDataService from '../../services/movies';
import moment from 'moment';
import './Movie.css';

const Movie = ({ user }) => {
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

    const deleteReview = (reviewId, index) => {
        MovieDataService.deleteReview(reviewId, user.googleId)
            .then(response => {
                setMovie((prevState) => {
                    prevState.reviews.splice(index, 1);
                    return ({
                        ...prevState
                    });
                });
            })
            .catch(e => {
                console.log("Error deleting review:", e);
            });
    };

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
                                { user &&
                                    <Link to={"/movies/" + id + "/review"}>
                                        Add Review
                                    </Link>
                                }
                            </Card.Body>
                        </Card>
                        <h2>Reviews</h2>
                        <br />
                        {movie.reviews && movie.reviews.length > 0 ? (
                            movie.reviews.map((review, index) => {
                                return (
                                    <div className="d-flex" key={index}>
                                        <div className="flex-shrink-0 reviewsText">
                                            <h5>{review.name + " reviewed on "} { moment(review.date).format("Do MMMM YYYY") }</h5>
                                            <p className="review">{review.review}</p>
                                            { user && user.googleId === review.user_id &&
                                                <Row>
                                                    <Col>
                                                        <Link to={{
                                                            pathname: "/movies/" + id + "/review/"
                                                        }}
                                                        state={{
                                                            currentReview: review
                                                        }}>
                                                            Edit
                                                        </Link>
                                                    </Col>
                                                    <Col>
                                                        <Button variant="link" onClick={() => {
                                                            deleteReview(review._id, index);
                                                        }}>
                                                            Delete
                                                        </Button>
                                                    </Col>
                                                </Row>
                                            }
                                        </div>
                                    </div>
                                )
                            })
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