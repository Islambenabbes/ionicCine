import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addCircleOutline,
  filmOutline,
  logOutOutline,
  peopleOutline,
  refreshOutline,
  videocamOutline,
} from 'ionicons/icons';

import type { AppUser, CustomMovieInput } from '../models/cinematch.models';
import { AppDataService } from '../services/app-data.service';

@Component({
  selector: 'app-admin',
  templateUrl: 'admin.page.html',
  styleUrls: ['admin.page.scss'],
  imports: [
    ReactiveFormsModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonTextarea,
    IonTitle,
    IonToggle,
    IonToolbar,
  ],
})
export class AdminPage {
  readonly appData = inject(AppDataService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);

  readonly activeSection = signal<'movies' | 'users'>('movies');
  readonly saving = signal(false);
  readonly disabledUserCount = computed(() => this.appData.users().filter((user) => !user.active).length);
  readonly movieForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    releaseYear: [new Date().getFullYear(), [Validators.required, Validators.min(1888)]],
    overview: ['', [Validators.required, Validators.minLength(10)]],
    genres: ['', [Validators.required]],
    actors: ['', [Validators.required]],
    posterUrl: [''],
  });

  constructor() {
    addIcons({
      addCircleOutline,
      filmOutline,
      logOutOutline,
      peopleOutline,
      refreshOutline,
      videocamOutline,
    });
  }

  async addMovie(): Promise<void> {
    if (this.movieForm.invalid || this.saving()) {
      this.movieForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const value = this.movieForm.getRawValue();
    const input: CustomMovieInput = {
      ...value,
      genres: this.splitList(value.genres),
      actors: this.splitList(value.actors),
    };
    await this.appData.addCustomMovie(input);
    this.movieForm.reset({
      title: '',
      releaseYear: new Date().getFullYear(),
      overview: '',
      genres: '',
      actors: '',
      posterUrl: '',
    });
    const toast = await this.toastController.create({
      message: `${input.title} added to the catalogue`,
      duration: 1600,
      position: 'top',
      color: 'success',
    });
    await toast.present();
    this.saving.set(false);
  }

  async updateUserStatus(user: AppUser, event: Event): Promise<void> {
    const toggle = event.target as HTMLIonToggleElement;
    await this.appData.setUserActive(user.id, toggle.checked);
  }

  async logout(): Promise<void> {
    await this.appData.logout();
    await this.router.navigateByUrl('/auth', { replaceUrl: true });
  }

  openCatalogue(): void {
    void this.router.navigateByUrl('/tabs/discover');
  }

  resetDemo(): void {
    this.appData.resetDemoData();
    void this.router.navigateByUrl('/auth', { replaceUrl: true });
  }

  initials(user: AppUser): string {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  }

  private splitList(value: string): string[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
