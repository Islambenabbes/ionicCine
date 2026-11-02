import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonProgressBar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { filmOutline, peopleOutline, personOutline, sparkles, ticketOutline } from 'ionicons/icons';

import { AppDataService } from '../services/app-data.service';
import { MatchingService } from '../services/matching.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  imports: [RouterLink, IonButton, IonChip, IonContent, IonHeader, IonIcon, IonProgressBar, IonTitle, IonToolbar],
})
export class Tab3Page {
  readonly appData = inject(AppDataService);
  readonly matchingService = inject(MatchingService);

  constructor() {
    addIcons({ filmOutline, peopleOutline, personOutline, sparkles, ticketOutline });
  }

  initials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  }
}
