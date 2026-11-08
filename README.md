# OLT Core Manager

Responsive OLT field-operations app based on the `smart olt - Copy` design, with Firebase Authentication, a role-aware login, 17 OLT sites, port/chassis management, core identification, maps, outage location, CSV export, and offline record caching.

## Run locally

1. Install Node.js 24.12 or newer.
2. Copy `.env.example` to `.env.local` and fill in the Firebase Web App values. These Firebase client settings are included in the built web app; they are identifiers, not access-control secrets.
3. In Firebase Console, enable **Authentication → Email/Password**. Operators can register their own accounts from the app; email verification is required before accessing site records.
4. Run:

   ```sh
   npm ci
   npm run dev
   ```

5. Run checks and build:

   ```sh
   npm test
   npm run lint
   npm run build
   ```

The production web build is written to `www/`. `npm run sync` copies that build into the Capacitor Android project.

## Firebase access, accounts, and roles

- New users register with their name, email, and password and must verify the email. Verified field accounts can add, edit, and delete OLT configurations.
- The designated verified administrator email is `kyambaddealex55@gmail.com`; only that account (or a user granted a trusted Firebase `admin: true` custom claim) can inspect account profiles and read the audit trail. The initial admin account must exist in Firebase Authentication. If it does not, register it through the app and verify its email.
- To bootstrap the designated admin, register that email in the app, verify it, and sign in using a newly chosen password. Never use a password exposed in chat or source code.
- Configuration edits, creations, and deletions are committed atomically with an append-only audit entry containing the authenticated operator identity, server timestamp, site, and record. The audit trail starts when the updated app is deployed; it cannot reconstruct changes made earlier.
- Publish [`database.rules.json`](./database.rules.json) to the existing Firebase Realtime Database (for example, `firebase deploy --only database --project olt-manager-app`). The rules lock down unauthenticated access and preserve the existing `/olts/{site}/configs` nodes. They do not migrate, seed, reset, or replace those records.
- Before applying new rules, export a database backup. This app's reader maps the existing legacy site/config record format in place, rather than copying the records to a different path.
- Configure Firebase Authentication's authorized domains to include your GitHub Pages domain (`<account>.github.io`).
- Old shared access codes are not accepted. Do not store passwords, Admin SDK credentials, or `.env.local` in source control. The Firebase web API key is public client configuration; security is enforced by authentication and database rules.

## Deploy to GitHub Pages

1. Create a GitHub repository and push this project to its `main` or `master` branch.
2. In **Settings → Pages**, choose **GitHub Actions** as the build and deployment source.
3. Add repository Actions variables named `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_DATABASE_URL`, and `FIREBASE_PROJECT_ID`. These values are public Firebase web-app configuration and will be embedded in the frontend bundle; secure access with Firebase Authentication and Realtime Database rules, not by hiding the API key.
4. Push to `main`/`master`. The workflow builds the app and deploys `www/`; its URL appears in the workflow run or Pages settings.

This workspace did not include Git repository metadata, so initialize/connect a GitHub repository before pushing.
