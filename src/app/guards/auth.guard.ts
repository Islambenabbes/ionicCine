import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';

import { AppDataService } from '../services/app-data.service';

export const authGuard: CanActivateFn = async () => {
  const appData = inject(AppDataService);
  const router = inject(Router);
  await appData.waitUntilReady();
  return appData.currentUser() ? true : router.createUrlTree(['/auth']);
};

export const adminGuard: CanActivateFn = async () => {
  const appData = inject(AppDataService);
  const router = inject(Router);
  await appData.waitUntilReady();
  return appData.isAdmin() ? true : router.createUrlTree(['/tabs/discover']);
};
