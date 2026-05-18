# Firebase Non-SQL Integration Plan

## Goal

Reduce Cloud SQL cost by moving **auth sessions** and **lightweight data** to Firebase
free-tier services (Firebase Auth + Firestore). SQL stays for complex relational data only.

---

## Why This Matters

Currently **43 files** hit SQL on every authenticated request (session lookups, user lookups).
Firebase Auth verifies tokens locally (no DB round-trip), eliminating this load entirely.

| Layer | Current | After |
|---|---|---|
| Session verification | SQL query on every request | Firebase ID token (local verify, free) |
| User preferences | SQL row | Firestore document (free tier: 50k reads/day) |
| Notification log | SQL rows | Firestore collection |
| Business listing metadata | SQL rows | Firestore (+ SQL for bookings/payments) |
| Core bookings/events/payments | SQL | SQL (stays — needs ACID + joins) |

---

## Architecture

```
Client
  │
  ├─ Firebase Auth SDK (client-side)
  │   ├─ signInWithEmailAndPassword()
  │   ├─ signInWithPopup(googleProvider)
  │   └─ getIdToken() → sent as Authorization: Bearer <token>
  │
  └─ API Routes
      ├─ Firebase Admin SDK verifyIdToken() → no SQL, local verify
      ├─ On first login: upsert minimal User row in SQL (id, email, firebaseUid)
      └─ Firestore: read/write user prefs, notifications, business metadata
```

---

## PR 1 — Firebase Auth as Session Layer (Highest Impact)

**Goal:** Replace NextAuth session SQL queries with Firebase ID token verification.

### Files to Create

**`apps/web/lib/firebase/admin.ts`**
```typescript
// Firebase Admin SDK — server-side token verification
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const app = getApps().length === 0
  ? initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID }) })
  : getApps()[0];

export const firebaseAdmin = getAuth(app);

export async function verifyFirebaseToken(token: string) {
  return firebaseAdmin.verifyIdToken(token);
}
```

**`apps/web/lib/firebase/session.ts`**
```typescript
// Drop-in replacement for getServerSession that uses Firebase token
// Returns same shape as existing session object so existing code works unchanged
export async function getFirebaseSession(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cookieToken = getCookieToken(req); // see below
  const token = authHeader?.replace("Bearer ", "") ?? cookieToken;
  if (!token) return null;

  const decoded = await verifyFirebaseToken(token);
  // Return shape matching existing { user: { id, email, name } }
  return { user: { firebaseUid: decoded.uid, email: decoded.email } };
}
```

**`apps/web/lib/firebase/auth-context.tsx`** (client)
```typescript
"use client";
// Provides Firebase auth state to React tree
// Exposes: user, signIn, signOut, loading
```

### Files to Modify

**`packages/prisma/schema.prisma`** — add `firebaseUid` to User model:
```prisma
model User {
  // ...existing fields
  firebaseUid String? @unique  // Firebase UID — null for legacy users
}
```

**`apps/web/modules/auth/login-view.tsx`** — wire Firebase Auth:
```typescript
// Replace signIn("credentials") with Firebase signInWithEmailAndPassword
// Replace signIn("google") with signInWithPopup(googleProvider)
// On success: get ID token → POST to /api/auth/firebase-session to set cookie
```

**`apps/web/app/api/auth/firebase-session/route.ts`** — exchange Firebase token for session cookie:
```typescript
// POST: verify Firebase token → upsert User in SQL → set encrypted session cookie
// DELETE: clear session cookie (logout)
```

### Migration Strategy

- **New signups**: Firebase Auth only, `firebaseUid` set on User row
- **Existing users**: On next login, Firebase ID + existing email → link account, set `firebaseUid`
- **Legacy fallback**: Keep NextAuth for 30 days, then remove

---

## PR 2 — Firestore for User Preferences & Notifications

**Goal:** Move high-frequency, non-relational reads out of SQL.

### What moves to Firestore

| Collection | Document key | Data |
|---|---|---|
| `userPreferences` | `firebaseUid` | theme, locale, notificationPrefs, timezone |
| `notifications` | `firebaseUid/notifications/{id}` | activity log, read/unread state |
| `businessListingMeta` | `listingId` | viewCount, lastViewed, featuredUntil |

### What stays in SQL

All bookings, event types, schedules, payments, teams, credentials, business listings (core data).

### Files to Create

**`apps/web/lib/firebase/firestore.ts`** — Firestore client wrapper:
```typescript
import { getFirestore } from "firebase/firestore";
import { app } from "./client";
export const db = getFirestore(app);
```

**`packages/features/user-prefs/FirestoreUserPrefsRepository.ts`**
**`packages/features/notifications/FirestoreNotificationRepository.ts`**

### Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /userPreferences/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    match /notifications/{uid}/{document=**} {
      allow read, write: if request.auth.uid == uid;
    }
    match /businessListingMeta/{listingId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## PR 3 — Remove NextAuth Session SQL (Cleanup)

After PRs 1 & 2 are stable in production (2 weeks):

- Remove `Session` table from Prisma schema
- Remove `Account` table (replaced by Firebase OAuth)
- Remove `VerificationToken` table (Firebase handles email verification)
- Drop 3 SQL tables → significant storage + query cost reduction

---

## Implementation Order for Agent (Claude Haiku 4.5)

### Prerequisites

```bash
# Install Firebase Admin SDK
yarn workspace @calcom/web add firebase-admin

# Install Firestore (already have firebase client)
# (firebase package already includes firestore)
```

### Step 1: Schema migration

```bash
# Add firebaseUid to User model in packages/prisma/schema.prisma
# Create migration:
npx prisma migrate dev --name add_firebase_uid_to_user --schema=packages/prisma/schema.prisma
yarn prisma generate
```

### Step 2: Firebase Admin setup

Create `apps/web/lib/firebase/admin.ts` using Application Default Credentials.
On Cloud Run, no service account JSON needed — ADC picks up the Cloud Run service account automatically.

```typescript
// Use ADC — works on Cloud Run, works locally with `gcloud auth application-default login`
initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
```

### Step 3: Session exchange route

Create `apps/web/app/api/auth/firebase-session/route.ts`:
1. POST: accept `{ idToken }` → verify → upsert User in SQL → set `__session` cookie (7 days)
2. DELETE: clear `__session` cookie

The cookie value = Firebase session cookie (created via `firebaseAdmin.createSessionCookie()`),
which is revocable and doesn't require a DB lookup to verify.

### Step 4: Update login view

Wire `apps/web/modules/auth/login-view.tsx`:
- Email/password: `signInWithEmailAndPassword(auth, email, password)` → `getIdToken()` → POST `/api/auth/firebase-session`
- Google: `signInWithPopup(auth, googleProvider)` → same exchange

### Step 5: Firestore user preferences

Create `apps/web/lib/firebase/userPrefs.ts`:
- `getUserPrefs(uid)` — reads from Firestore
- `setUserPrefs(uid, prefs)` — writes to Firestore
- Replace the SQL `User.theme`, `User.locale` reads in settings pages

### Step 6: Deploy Firestore security rules

```bash
firebase deploy --only firestore:rules --project=gobookme-app
```

---

## Verification Checklist

- [ ] `yarn type-check:ci --force` passes
- [ ] Login with email/password works
- [ ] Login with Google works
- [ ] Session persists across page refreshes
- [ ] Logout clears session
- [ ] Existing SQL users can still log in (account linking)
- [ ] User preferences save/load from Firestore
- [ ] `gcloud firestore databases list` shows documents being created

---

## Cost Impact

| Service | Current monthly cost | After |
|---|---|---|
| Cloud SQL connection pool | ~$15-30/mo (connection overhead) | Reduced — fewer concurrent connections |
| Cloud SQL queries | Billed per vCPU-hour | ~30% fewer queries (session lookups removed) |
| Firebase Auth | $0 | $0 (free tier: 10k users) |
| Firestore | $0 | $0 (free tier: 50k reads/day, 20k writes/day) |

---

## Key Files Reference

```
apps/web/lib/firebase/
  client.ts          # Firebase client SDK (already exists)
  admin.ts           # Firebase Admin SDK (CREATE)
  session.ts         # Session verification helper (CREATE)
  firestore.ts       # Firestore client wrapper (CREATE)
  auth-context.tsx   # React auth state context (CREATE)
  userPrefs.ts       # Firestore user prefs helpers (CREATE)

packages/prisma/schema.prisma          # Add firebaseUid to User
apps/web/app/api/auth/firebase-session/route.ts  # Session exchange (CREATE)
apps/web/modules/auth/login-view.tsx   # Wire Firebase signIn (MODIFY)
firestore.rules                        # Security rules (CREATE)
```
