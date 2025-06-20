import { Routes, Route, Link } from 'react-router-dom';
import "bootstrap/dist/css/bootstrap.min.css";
import Container from 'react-bootstrap/Container';
import { Navbar, Nav } from 'react-bootstrap';

import MoviesList from "./components/MoviesList";
import Movie from "./components/Movie";

import './App.css';

function App() {
  return (
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
        </Container>
      </Navbar>
      <Routes>
        <Route exact path="/" element={<MoviesList />} />
        <Route exact path="/movies" element={<MoviesList />} />
        <Route path="/movies/:id" element={<Movie />} />
      </Routes>
    </div>
  );
}

export default App;
