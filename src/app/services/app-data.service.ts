import { Injectable, computed, signal } from '@angular/core';
import type { FirebaseApp } from 'firebase/app';
import { initializeApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { collection, doc, getDoc, getDocs, getFirestore, setDoc, updateDoc } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

import { environment } from '../../environments/environment';
import { DEMO_CREDENTIALS, DEMO_USERS } from '../data/demo.data';
import type { AppUser, CustomMovieInput, Movie, RegisterInput } from '../models/cinematch.models';

@Injectable({ providedIn: 'root' })
export class AppDataService {
  private readonly usersKey = 'cinematch.demo.users.v1';
  private readonly credentialsKey = 'cinematch.demo.credentials.v1';
  private readonly moviesKey = 'cinematch.demo.custom-movies.v1';
  private readonly sessionKey = 'cinematch.demo.session.v1';

  private firebaseApp?: FirebaseApp;
  private firebaseAuth?: Auth;
  private firestore?: Firestore;
  private storage?: FirebaseStorage;
  private resolveReady!: () => void;
  private readonly readyPromise = new Promise<void>((resolve) => {
    this.resolveReady = resolve;
  });

  readonly currentUser = signal<AppUser | null>(null);
  readonly users = signal<AppUser[]>([]);
  readonly customMovies = signal<Movie[]>([]);
  readonly ready = signal(false);
  readonly firebaseEnabled =
    !environment.demoMode && Boolean(environment.firebase.apiKey && environment.firebase.projectId);
  readonly modeLabel = this.firebaseEnabled ? 'Firebase' : 'Demo';
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');
  readonly favoriteIds = computed(() => new Set(this.currentUser()?.favorites.map((movie) => movie.id) ?? []));

  constructor() {
    if (this.firebaseEnabled) {
      void this.initializeFirebase();
    } else {
      this.initializeDemo();
    }
  }

  waitUntilReady(): Promise<void> {
    return this.readyPromise;
  }

  async login(email: string, password: string): Promise<void> {
    await this.waitUntilReady();

    if (this.firebaseEnabled && this.firebaseAuth) {
      const credential = await signInWithEmailAndPassword(this.firebaseAuth, email.trim(), password);
      const profile = await this.getFirebaseUser(credential.user.uid);
      if (!profile?.active) {
        await signOut(this.firebaseAuth);
        throw new Error('This account has been disabled by an administrator.');
      }
      this.currentUser.set(profile);
      await this.refreshFirebaseData();
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const credentials = this.loadDemoCredentials();
    const user = this.users().find((candidate) => candidate.email.toLowerCase() === normalizedEmail);

    if (!user || credentials[normalizedEmail] !== password) {
      throw new Error('Incorrect email or password.');
    }
    if (!user.active) {
      throw new Error('This account has been disabled by an administrator.');
    }

    localStorage.setItem(this.sessionKey, user.id);
    this.currentUser.set(user);
  }

  async register(input: RegisterInput): Promise<void> {
    await this.waitUntilReady();

    if (this.firebaseEnabled && this.firebaseAuth && this.firestore) {
      const credential = await createUserWithEmailAndPassword(this.firebaseAuth, input.email.trim(), input.password);
      const photoUrl = await this.uploadProfilePhoto(credential.user.uid, input.photoUrl);
      const profile: AppUser = {
        id: credential.user.uid,
        email: input.email.trim().toLowerCase(),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        age: input.age,
        photoUrl,
        role: 'user',
        active: true,
        favorites: [],
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(this.firestore, 'users', profile.id), profile);
      this.currentUser.set(profile);
      await this.refreshFirebaseData();
      return;
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    if (this.users().some((user) => user.email.toLowerCase() === normalizedEmail)) {
      throw new Error('An account already exists with this email.');
    }

    const profile: AppUser = {
      id: this.createId(),
      email: normalizedEmail,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      age: input.age,
      photoUrl: input.photoUrl,
      role: 'user',
      active: true,
      favorites: [],
      createdAt: new Date().toISOString(),
    };
    const users = [...this.users(), profile];
    const credentials = { ...this.loadDemoCredentials(), [normalizedEmail]: input.password };
    this.users.set(users);
    this.persistDemoUsers(users);
    localStorage.setItem(this.credentialsKey, JSON.stringify(credentials));
    localStorage.setItem(this.sessionKey, profile.id);
    this.currentUser.set(profile);
  }

  async logout(): Promise<void> {
    if (this.firebaseEnabled && this.firebaseAuth) {
      await signOut(this.firebaseAuth);
    }
    localStorage.removeItem(this.sessionKey);
    this.currentUser.set(null);
  }

  isFavorite(movieId: string): boolean {
    return this.favoriteIds().has(movieId);
  }

  async toggleFavorite(movie: Movie): Promise<boolean> {
    const user = this.currentUser();
    if (!user) {
      throw new Error('Sign in before adding favorites.');
    }

    const alreadyFavorite = user.favorites.some((favorite) => favorite.id === movie.id);
    const favorites = alreadyFavorite
      ? user.favorites.filter((favorite) => favorite.id !== movie.id)
      : [...user.favorites, movie];
    const updated = { ...user, favorites };

    if (this.firebaseEnabled && this.firestore) {
      await updateDoc(doc(this.firestore, 'users', user.id), { favorites });
    }

    this.replaceUser(updated);
    return !alreadyFavorite;
  }

  async addCustomMovie(input: CustomMovieInput): Promise<Movie> {
    const movie: Movie = {
      id: this.createId(),
      title: input.title.trim(),
      overview: input.overview.trim(),
      posterUrl: input.posterUrl.trim(),
      releaseYear: input.releaseYear,
      genres: input.genres,
      actors: input.actors,
      rating: 0,
      source: 'custom',
    };

    if (this.firebaseEnabled && this.firestore) {
      const movieReference = doc(collection(this.firestore, 'movies'));
      movie.id = movieReference.id;
      await setDoc(movieReference, movie);
    }

    const movies = [movie, ...this.customMovies()];
    this.customMovies.set(movies);
    if (!this.firebaseEnabled) {
      localStorage.setItem(this.moviesKey, JSON.stringify(movies));
    }
    return movie;
  }

  async setUserActive(userId: string, active: boolean): Promise<void> {
    const user = this.users().find((candidate) => candidate.id === userId);
    if (!user || user.role === 'admin') {
      return;
    }

    if (this.firebaseEnabled && this.firestore) {
      await updateDoc(doc(this.firestore, 'users', userId), { active });
    }

    const updated = { ...user, active };
    this.replaceUser(updated);
  }

  resetDemoData(): void {
    if (this.firebaseEnabled) {
      return;
    }
    const users = this.clone(DEMO_USERS);
    this.users.set(users);
    this.customMovies.set([]);
    this.currentUser.set(null);
    localStorage.setItem(this.usersKey, JSON.stringify(users));
    localStorage.setItem(this.credentialsKey, JSON.stringify(DEMO_CREDENTIALS));
    localStorage.removeItem(this.moviesKey);
    localStorage.removeItem(this.sessionKey);
  }

  private initializeDemo(): void {
    const storedUsers = this.readJson<AppUser[]>(this.usersKey);
    const users = storedUsers?.length ? storedUsers : this.clone(DEMO_USERS);
    const customMovies = this.readJson<Movie[]>(this.moviesKey) ?? [];
    this.users.set(users);
    this.customMovies.set(customMovies);

    if (!localStorage.getItem(this.usersKey)) {
      this.persistDemoUsers(users);
    }
    if (!localStorage.getItem(this.credentialsKey)) {
      localStorage.setItem(this.credentialsKey, JSON.stringify(DEMO_CREDENTIALS));
    }

    const sessionId = localStorage.getItem(this.sessionKey);
    const sessionUser = users.find((user) => user.id === sessionId && user.active);
    this.currentUser.set(sessionUser ?? null);
    this.markReady();
  }

  private async initializeFirebase(): Promise<void> {
    try {
      this.firebaseApp = initializeApp(environment.firebase);
      this.firebaseAuth = getAuth(this.firebaseApp);
      this.firestore = getFirestore(this.firebaseApp);
      this.storage = getStorage(this.firebaseApp);

      onAuthStateChanged(this.firebaseAuth, (firebaseUser) => {
        void (async () => {
          if (firebaseUser) {
            const profile = await this.getFirebaseUser(firebaseUser.uid);
            if (profile?.active) {
              this.currentUser.set(profile);
              await this.refreshFirebaseData();
            } else {
              this.currentUser.set(null);
            }
          } else {
            this.currentUser.set(null);
          }
          this.markReady();
        })();
      });
    } catch (error) {
      this.markReady();
      throw error;
    }
  }

  private async refreshFirebaseData(): Promise<void> {
    if (!this.firestore) {
      return;
    }

    const [userSnapshot, movieSnapshot] = await Promise.all([
      getDocs(collection(this.firestore, 'users')),
      getDocs(collection(this.firestore, 'movies')),
    ]);
    this.users.set(
      userSnapshot.docs.map((snapshot) => ({
        ...(snapshot.data() as Omit<AppUser, 'id'>),
        id: snapshot.id,
      })),
    );
    this.customMovies.set(
      movieSnapshot.docs.map((snapshot) => ({
        ...(snapshot.data() as Omit<Movie, 'id'>),
        id: snapshot.id,
      })),
    );
  }

  private async getFirebaseUser(userId: string): Promise<AppUser | null> {
    if (!this.firestore) {
      return null;
    }
    const snapshot = await getDoc(doc(this.firestore, 'users', userId));
    if (!snapshot.exists()) {
      return null;
    }
    return { ...(snapshot.data() as Omit<AppUser, 'id'>), id: snapshot.id };
  }

  private async uploadProfilePhoto(userId: string, photoUrl: string): Promise<string> {
    if (!this.storage || !photoUrl) {
      return photoUrl;
    }
    const response = await fetch(photoUrl);
    const blob = await response.blob();
    const photoReference = ref(this.storage, `profiles/${userId}/avatar.jpg`);
    await uploadBytes(photoReference, blob, { contentType: blob.type || 'image/jpeg' });
    return getDownloadURL(photoReference);
  }

  private replaceUser(updated: AppUser): void {
    const users = this.users().map((user) => (user.id === updated.id ? updated : user));
    this.users.set(users);
    if (this.currentUser()?.id === updated.id) {
      this.currentUser.set(updated);
    }
    if (!this.firebaseEnabled) {
      this.persistDemoUsers(users);
    }
  }

  private persistDemoUsers(users: AppUser[]): void {
    localStorage.setItem(this.usersKey, JSON.stringify(users));
  }

  private loadDemoCredentials(): Record<string, string> {
    return (
      this.readJson<Record<string, string>>(this.credentialsKey) ?? {
        ...DEMO_CREDENTIALS,
      }
    );
  }

  private readJson<T>(key: string): T | null {
    try {
      const value = localStorage.getItem(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private createId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  }

  private markReady(): void {
    if (!this.ready()) {
      this.ready.set(true);
      this.resolveReady();
    }
  }
}
