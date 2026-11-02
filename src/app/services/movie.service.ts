import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { DEMO_MOVIES } from '../data/demo.data';
import type { Movie } from '../models/cinematch.models';

import { AppDataService } from './app-data.service';

interface TmdbMovieResult {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date?: string;
  genre_ids?: number[];
  vote_average: number;
}

interface TmdbMovieResponse {
  results: TmdbMovieResult[];
}

interface TmdbMovieDetails extends TmdbMovieResult {
  genres: { id: number; name: string }[];
  credits?: { cast: { name: string }[] };
}

@Injectable({ providedIn: 'root' })
export class MovieService {
  private readonly http = inject(HttpClient);
  private readonly appData = inject(AppDataService);
  private readonly tmdbBaseUrl = 'https://api.themoviedb.org/3';
  private readonly posterBaseUrl = 'https://image.tmdb.org/t/p/w500';
  private readonly token = environment.tmdbReadToken.trim();
  private readonly genreNames = new Map<number, string>([
    [28, 'Action'],
    [12, 'Adventure'],
    [16, 'Animation'],
    [35, 'Comedy'],
    [80, 'Crime'],
    [99, 'Documentary'],
    [18, 'Drama'],
    [10751, 'Family'],
    [14, 'Fantasy'],
    [36, 'History'],
    [27, 'Horror'],
    [10402, 'Music'],
    [9648, 'Mystery'],
    [10749, 'Romance'],
    [878, 'Science Fiction'],
    [53, 'Thriller'],
    [10752, 'War'],
    [37, 'Western'],
  ]);

  private readonly baseMovies = signal<Movie[]>(this.clone(DEMO_MOVIES));
  readonly loading = signal(false);
  readonly usingTmdb = Boolean(this.token);
  readonly movies = computed(() => {
    const allMovies = [...this.appData.customMovies(), ...this.baseMovies()];
    return allMovies.filter((movie, index) => allMovies.findIndex((candidate) => candidate.id === movie.id) === index);
  });

  constructor() {
    if (this.usingTmdb) {
      void this.loadPopular();
    }
  }

  async loadPopular(): Promise<void> {
    if (!this.token) {
      this.baseMovies.set(this.clone(DEMO_MOVIES));
      return;
    }
    await this.loadFromTmdb(`${this.tmdbBaseUrl}/movie/popular`);
  }

  async search(query: string): Promise<void> {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      await this.loadPopular();
      return;
    }

    if (!this.token) {
      this.baseMovies.set(
        this.clone(DEMO_MOVIES).filter(
          (movie) =>
            movie.title.toLowerCase().includes(normalizedQuery) ||
            movie.genres.some((genre) => genre.toLowerCase().includes(normalizedQuery)),
        ),
      );
      return;
    }

    await this.loadFromTmdb(`${this.tmdbBaseUrl}/search/movie`, query.trim());
  }

  async enrichMovie(movie: Movie): Promise<Movie> {
    if (!this.token || movie.source !== 'tmdb' || movie.actors.length > 0) {
      return movie;
    }

    const details = await firstValueFrom(
      this.http.get<TmdbMovieDetails>(`${this.tmdbBaseUrl}/movie/${movie.id}`, {
        headers: this.authHeaders(),
        params: new HttpParams().set('append_to_response', 'credits'),
      }),
    );

    return {
      ...movie,
      genres: details.genres.map((genre) => genre.name),
      actors: details.credits?.cast.slice(0, 6).map((actor) => actor.name) ?? [],
    };
  }

  private async loadFromTmdb(url: string, query?: string): Promise<void> {
    this.loading.set(true);
    try {
      let params = new HttpParams().set('language', 'en-US').set('include_adult', 'false');
      if (query) {
        params = params.set('query', query);
      }
      const response = await firstValueFrom(
        this.http.get<TmdbMovieResponse>(url, { headers: this.authHeaders(), params }),
      );
      this.baseMovies.set(response.results.slice(0, 20).map((movie) => this.mapMovie(movie)));
    } catch {
      this.baseMovies.set(this.clone(DEMO_MOVIES));
    } finally {
      this.loading.set(false);
    }
  }

  private mapMovie(movie: TmdbMovieResult): Movie {
    return {
      id: String(movie.id),
      title: movie.title,
      overview: movie.overview,
      posterUrl: movie.poster_path ? `${this.posterBaseUrl}${movie.poster_path}` : '',
      releaseYear: Number(movie.release_date?.slice(0, 4)) || 0,
      genres: (movie.genre_ids ?? [])
        .map((genreId) => this.genreNames.get(genreId))
        .filter((genre): genre is string => Boolean(genre)),
      actors: [],
      rating: Math.round(movie.vote_average * 10) / 10,
      source: 'tmdb',
    };
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.token}` });
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
