# CineMatch

CineMatch is an Ionic 9 and Angular 22 movie application created for the Ionic
mini-project. It uses Capacitor 8 for camera access and supports Firebase
Authentication, Cloud Firestore, Firebase Storage, and the TMDB API.

## Assignment coverage

- Registration with first name, last name, age, email, password, and a required
  photo captured through the phone camera
- Authentication with blocked-account handling
- TMDB starting catalogue with search, ratings, genres, and cast enrichment
- A personal favorite-movie playlist for every user
- An admin console that adds movies and enables/disables users without deleting
  their profiles
- Firebase-backed user, favorites, and custom-movie data plus Storage-backed
  profile photos
- Preference matching that only shows results above 75%

The matching score is deterministic and explainable:

| Criterion | Weight |
| --- | ---: |
| Exact favorite movies | 45% |
| Favorite genres | 25% |
| Actors in favorite movies | 20% |
| Average release-year proximity | 10% |

Movie, genre, and actor similarity use the Jaccard index. A candidate is shown
only when the final weighted score is strictly greater than 75%.

## Run the complete demo

Requirements: Node.js 22 or newer and npm.

```bash
npm install
npm start
```

Open `http://localhost:4200` and use one of these local demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| User | `demo@cinematch.tn` | `demo123` |
| Administrator | `admin@cinematch.tn` | `admin123` |

Demo mode stores changes locally so every required screen can be presented
before cloud credentials are configured.

## Connect Firebase and TMDB

1. Create a Firebase project and register a Web application.
2. Enable Email/Password in **Authentication → Sign-in method**.
3. Create a Cloud Firestore database and enable Firebase Storage.
4. Open `src/environments/environment.local.ts`, set `demoMode` to `false`,
   add the Firebase Web configuration, and add the TMDB API Read Access Token.
   This local file is ignored and must not be committed with credentials.
5. Deploy the included access rules:

   ```bash
   npx firebase-tools login
   npx firebase-tools use YOUR_FIREBASE_PROJECT_ID
   npx firebase-tools deploy --only firestore:rules,storage
   ```

6. Register the first account, then set its `role` field to `admin` from the
   Firestore console. Keep `active` set to `true`.

The relevant official setup references are the
[Firebase Web guide](https://firebase.google.com/docs/web/setup),
[TMDB authentication guide](https://developer.themoviedb.org/docs/authentication-application),
and [Capacitor Camera guide](https://capacitorjs.com/docs/apis/camera).

## Firestore model

```text
users/{uid}
  email, firstName, lastName, age, photoUrl
  role: "user" | "admin"
  active: boolean
  favorites: Movie[]

movies/{movieId}
  title, overview, posterUrl, releaseYear
  genres[], actors[], rating, source
```

The security rules prohibit document deletion, restrict movie writes and user
activation changes to administrators, and let ordinary users update only their
own profile and favorites.

## Verification

```bash
npm run build
npm run lint
npm run test:unit
npm run test:e2e
```

## Android packaging

### First-time setup and native Android generation

Ionic apps use Capacitor to connect the web app to native Android code. In this
project, “ejecting” means adding Capacitor's native Android project; it does not
remove Ionic or Angular. These commands were used from the project root. The
Android platform add command is needed only once:

```bash
npm install
npm install --save-exact @capacitor/android@8.6.0
npm run build
npx cap add android
npx cap sync android
```

`npm run build` compiles Angular into `www/`. `npx cap add android` creates the
native `android/` Gradle project. `npx cap sync android` copies the compiled
web assets and installed Capacitor plugins into that project. Repeat the build
and sync commands after web or plugin changes.

### Build the APK

The generated Android project requires JDK 21 and Android SDK API 36. Android
Studio provides both; the build also works with the Android command-line SDK.
From the project root:

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

Gradle compiles and packages the native shell with the web assets, then signs
the debug build with the standard debug key. The installable APK is written to
`android/app/build/outputs/apk/debug/app-debug.apk`. Install it on a connected
device with:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

The copy used for the project demo is `CineMatch-debug.apk` in the repository
root. The Capacitor application ID is `tn.tekup.cinematch`. A release APK for
distribution requires a release signing key and release build configuration.
