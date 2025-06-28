import React, { useState, useEffect } from 'react';
import MovieDataService from "../services/movies";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Alert from 'react-bootstrap/Alert';

const AddReview = ({ user }) => {
    const navigate = useNavigate();
    const params = useParams();
    const location = useLocation();


    const currentReview = location.state?.currentReview;
    const editing = currentReview ? true : false;
    const initialReviewState = editing ? currentReview.review : "";

    const [review, setReview] = useState(initialReviewState);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);


    if (!user) {
        return (
            <Container className="main-container">
                <Alert variant="warning">
                    Please log in to add a review.
                </Alert>
            </Container>
        );
    }

    const onChangeReview = e => {
        const reviewText = e.target.value;
        setReview(reviewText);

        if (error) setError("");
    }

    const saveReview = () => {

        if (!review.trim()) {
            setError("Please enter a review before submitting.");
            return;
        }

        setIsSubmitting(true);
        setError("");

        if (editing) {
            const data = {
                review_id: currentReview._id,
                review: review.trim(),
                user_id: user.googleId
            };

            MovieDataService.updateReview(data)
                .then(response => {
                    console.log("Review updated successfully:", response);
                    navigate("/movies/" + params.id);
                })
                .catch(e => {
                    console.log("Error updating review:", e);
                    setError(e.response?.data?.error || "Failed to update review. Please try again.");
                    setIsSubmitting(false);
                });
        } else {
            const data = {
                review: review.trim(),
                name: user.name,
                user_id: user.googleId,
                movie_id: params.id
            };

            MovieDataService.createReview(data)
                .then(response => {
                    console.log("Review created successfully:", response);
                    navigate("/movies/" + params.id);
                })
                .catch(e => {
                    console.log("Error creating review:", e);
                    setError(e.response?.data?.error || "Failed to create review. Please try again.");
                    setIsSubmitting(false);
                });
        }
    }

    return (
        <Container className="main-container">
            <Form>
                <Form.Group className="mb-3">
                    <Form.Label>{ editing ? "Edit" : "Create" } Review</Form.Label>
                    <Form.Control
                        as="textarea"
                        type="text"
                        required
                        value={review}
                        onChange={onChangeReview}
                        placeholder="Write your review here..."
                        rows={4}
                    />
                </Form.Group>
                {error && (
                    <Alert variant="danger" className="mb-3">
                        {error}
                    </Alert>
                )}
                <Button 
                    variant="primary" 
                    onClick={saveReview}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Submitting..." : (editing ? "Update" : "Submit")}
                </Button>
            </Form>
        </Container>
    )
}

export default AddReview;