import { TestBed } from '@angular/core/testing';

import { AppDataService } from './app-data.service';
import { MatchingService } from './matching.service';

describe('MatchingService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('uses multiple preference factors and keeps only matches above 75%', async () => {
    const appData = TestBed.inject(AppDataService);
    const matching = TestBed.inject(MatchingService);

    await appData.login('demo@cinematch.tn', 'demo123');
    const results = matching.matches();
    const linaMatch = results.find((match) => match.user.email === 'lina@cinematch.tn');

    expect(results.every((match) => match.score > 75)).toBe(true);
    expect(linaMatch).toBeTruthy();
    expect(linaMatch?.breakdown.movies).toBeGreaterThan(0);
    expect(linaMatch?.breakdown.genres).toBeGreaterThan(0);
    expect(linaMatch?.breakdown.actors).toBeGreaterThan(0);
    expect(linaMatch?.breakdown.releaseYears).toBeGreaterThan(0);
  });
});
