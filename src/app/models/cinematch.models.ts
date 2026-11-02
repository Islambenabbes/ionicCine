export type UserRole = 'user' | 'admin';
export type MovieSource = 'tmdb' | 'custom';

export interface Movie {
  id: string;
  title: string;
  overview: string;
  posterUrl: string;
  releaseYear: number;
  genres: string[];
  actors: string[];
  rating: number;
  source: MovieSource;
}

export interface AppUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  age: number;
  photoUrl: string;
  role: UserRole;
  active: boolean;
  favorites: Movie[];
  createdAt: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  age: number;
  photoUrl: string;
}

export interface CustomMovieInput {
  title: string;
  overview: string;
  posterUrl: string;
  releaseYear: number;
  genres: string[];
  actors: string[];
}

export interface MatchBreakdown {
  movies: number;
  genres: number;
  actors: number;
  releaseYears: number;
}

export interface UserMatch {
  user: AppUser;
  score: number;
  breakdown: MatchBreakdown;
  sharedMovies: Movie[];
  sharedGenres: string[];
}
