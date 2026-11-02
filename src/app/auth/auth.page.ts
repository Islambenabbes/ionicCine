import type { OnInit } from '@angular/core';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonInput, IonNote, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { filmOutline, lockClosedOutline, mailOutline, sparklesOutline } from 'ionicons/icons';

import { AppDataService } from '../services/app-data.service';

@Component({
  selector: 'app-auth',
  templateUrl: 'auth.page.html',
  styleUrls: ['auth.page.scss'],
  imports: [ReactiveFormsModule, RouterLink, IonButton, IonContent, IonIcon, IonInput, IonNote, IonSpinner],
})
export class AuthPage implements OnInit {
  readonly appData = inject(AppDataService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    addIcons({ filmOutline, lockClosedOutline, mailOutline, sparklesOutline });
  }

  async ngOnInit(): Promise<void> {
    await this.appData.waitUntilReady();
    if (this.appData.currentUser()) {
      await this.openApplication();
    }
  }

  useDemoAccount(role: 'user' | 'admin'): void {
    this.loginForm.setValue({
      email: role === 'admin' ? 'admin@cinematch.tn' : 'demo@cinematch.tn',
      password: role === 'admin' ? 'admin123' : 'demo123',
    });
    this.errorMessage.set('');
  }

  async login(): Promise<void> {
    if (this.loginForm.invalid || this.loading()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    try {
      const { email, password } = this.loginForm.getRawValue();
      await this.appData.login(email, password);
      await this.openApplication();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      this.loading.set(false);
    }
  }

  private async openApplication(): Promise<void> {
    const destination = this.appData.isAdmin() ? '/admin' : '/tabs/discover';
    await this.router.navigateByUrl(destination, { replaceUrl: true });
  }
}
