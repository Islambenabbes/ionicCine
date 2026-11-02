import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  heart,
  heartOutline,
  logOutOutline,
  personCircleOutline,
  searchOutline,
  settingsOutline,
  star,
} from 'ionicons/icons';

import type { Movie } from '../models/cinematch.models';
import { AppDataService } from '../services/app-data.service';
import { MovieService } from '../services/movie.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [
    IonBadge,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonSearchbar,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
})
export class Tab1Page {
  readonly appData = inject(AppDataService);
  readonly movieService = inject(MovieService);
  private readonly toastController = inject(ToastController);
  private readonly router = inject(Router);

  readonly updatingMovieId = signal('');

  constructor() {
    addIcons({
      heart,
      heartOutline,
      logOutOutline,
      personCircleOutline,
      searchOutline,
      settingsOutline,
      star,
    });
  }

  onSearch(event: Event): void {
    const searchbar = event.target as HTMLIonSearchbarElement;
    void this.movieService.search(searchbar.value ?? '');
  }

  async toggleFavorite(movie: Movie): Promise<void> {
    if (this.updatingMovieId()) {
      return;
    }
    this.updatingMovieId.set(movie.id);
    try {
      const enrichedMovie = await this.movieService.enrichMovie(movie);
      const added = await this.appData.toggleFavorite(enrichedMovie);
      const toast = await this.toastController.create({
        message: added ? `${movie.title} added to favorites` : `${movie.title} removed`,
        duration: 1500,
        position: 'top',
        color: added ? 'success' : 'medium',
      });
      await toast.present();
    } finally {
      this.updatingMovieId.set('');
    }
  }

  openAdmin(): void {
    void this.router.navigateByUrl('/admin');
  }

  async disconnect(): Promise<void> {
    await this.appData.logout();
    await this.router.navigateByUrl('/auth', { replaceUrl: true });
  }

  initials(): string {
    const user = this.appData.currentUser();
    return user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : '?';
  }
}
