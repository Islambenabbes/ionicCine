import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cameraOutline, personAddOutline, shieldCheckmarkOutline } from 'ionicons/icons';

import type { RegisterInput } from '../models/cinematch.models';
import { AppDataService } from '../services/app-data.service';
import { ProfilePhotoService } from '../services/profile-photo.service';

@Component({
  selector: 'app-register',
  templateUrl: 'register.page.html',
  styleUrls: ['register.page.scss'],
  imports: [
    ReactiveFormsModule,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonNote,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
})
export class RegisterPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly appData = inject(AppDataService);
  private readonly photoService = inject(ProfilePhotoService);
  private readonly router = inject(Router);

  readonly photoUrl = signal('');
  readonly loading = signal(false);
  readonly cameraLoading = signal(false);
  readonly errorMessage = signal('');
  readonly registrationForm = this.formBuilder.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    age: [18, [Validators.required, Validators.min(13), Validators.max(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    addIcons({ cameraOutline, personAddOutline, shieldCheckmarkOutline });
  }

  async takePhoto(): Promise<void> {
    this.cameraLoading.set(true);
    this.errorMessage.set('');
    try {
      this.photoUrl.set(await this.photoService.takeProfilePhoto());
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!message.toLowerCase().includes('cancel')) {
        this.errorMessage.set('Camera access failed. Check the permission and try again.');
      }
    } finally {
      this.cameraLoading.set(false);
    }
  }

  async register(): Promise<void> {
    if (this.registrationForm.invalid || !this.photoUrl() || this.loading()) {
      this.registrationForm.markAllAsTouched();
      if (!this.photoUrl()) {
        this.errorMessage.set('Take a profile photo with the camera before registering.');
      }
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    try {
      const formValue = this.registrationForm.getRawValue();
      const input: RegisterInput = { ...formValue, photoUrl: this.photoUrl() };
      await this.appData.register(input);
      await this.router.navigateByUrl('/tabs/discover', { replaceUrl: true });
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Registration failed.');
    } finally {
      this.loading.set(false);
    }
  }
}
