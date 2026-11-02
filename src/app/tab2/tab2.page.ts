import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { heartDislikeOutline, logOutOutline, sparklesOutline, star } from 'ionicons/icons';

import type { Movie } from '../models/cinematch.models';
import { AppDataService } from '../services/app-data.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [RouterLink, IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar],
})
export class Tab2Page {
  readonly appData = inject(AppDataService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);

  readonly removingId = signal('');

  constructor() {
    addIcons({ heartDislikeOutline, logOutOutline, sparklesOutline, star });
  }

  async removeFavorite(movie: Movie): Promise<void> {
    this.removingId.set(movie.id);
    await this.appData.toggleFavorite(movie);
    const toast = await this.toastController.create({
      message: `${movie.title} removed from your playlist`,
      duration: 1400,
      position: 'top',
      color: 'medium',
    });
    await toast.present();
    this.removingId.set('');
  }

  async logout(): Promise<void> {
    await this.appData.logout();
    await this.router.navigateByUrl('/auth', { replaceUrl: true });
  }

  initials(): string {
    const user = this.appData.currentUser();
    return user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : '?';
  }
}
