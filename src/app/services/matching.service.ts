import { Injectable, computed, inject } from '@angular/core';

import type { AppUser, Movie, UserMatch } from '../models/cinematch.models';

import { AppDataService } from './app-data.service';

@Injectable({ providedIn: 'root' })
export class MatchingService {
  private readonly appData = inject(AppDataService);

  readonly matches = computed<UserMatch[]>(() => {
    const currentUser = this.appData.currentUser();
    if (!currentUser || currentUser.favorites.length === 0) {
      return [];
    }

    return this.appData
      .users()
      .filter((user) => user.id !== currentUser.id && user.role === 'user' && user.active && user.favorites.length > 0)
      .map((user) => this.calculateMatch(currentUser, user))
      .filter((match) => match.score > 75)
      .sort((a, b) => b.score - a.score);
  });

  calculateMatch(currentUser: AppUser, candidate: AppUser): UserMatch {
    const currentMovies = currentUser.favorites;
    const candidateMovies = candidate.favorites;
    const sharedMovies = currentMovies.filter((movie) =>
      candidateMovies.some((candidateMovie) => candidateMovie.id === movie.id),
    );
    const currentGenres = this.uniqueValues(currentMovies, 'genres');
    const candidateGenres = this.uniqueValues(candidateMovies, 'genres');
    const currentActors = this.uniqueValues(currentMovies, 'actors');
    const candidateActors = this.uniqueValues(candidateMovies, 'actors');

    const breakdown = {
      movies: this.jaccard(
        currentMovies.map((movie) => movie.id),
        candidateMovies.map((movie) => movie.id),
      ),
      genres: this.jaccard(currentGenres, candidateGenres),
      actors: this.jaccard(currentActors, candidateActors),
      releaseYears: this.releaseYearSimilarity(currentMovies, candidateMovies),
    };
    const score = Math.round(
      breakdown.movies * 0.45 + breakdown.genres * 0.25 + breakdown.actors * 0.2 + breakdown.releaseYears * 0.1,
    );

    return {
      user: candidate,
      score,
      breakdown,
      sharedMovies,
      sharedGenres: currentGenres.filter((genre) => candidateGenres.includes(genre)),
    };
  }

  private uniqueValues(movies: Movie[], key: 'genres' | 'actors'): string[] {
    return [...new Set(movies.flatMap((movie) => movie[key]))];
  }

  private jaccard(left: string[], right: string[]): number {
    const leftSet = new Set(left);
    const rightSet = new Set(right);
    const union = new Set([...leftSet, ...rightSet]);
    if (union.size === 0) {
      return 0;
    }
    const intersection = [...leftSet].filter((value) => rightSet.has(value)).length;
    return Math.round((intersection / union.size) * 100);
  }

  private releaseYearSimilarity(left: Movie[], right: Movie[]): number {
    const average = (movies: Movie[]): number =>
      movies.reduce((total, movie) => total + movie.releaseYear, 0) / movies.length;
    const yearDifference = Math.abs(average(left) - average(right));
    return Math.round(Math.max(0, 100 - yearDifference * 8));
  }
}
