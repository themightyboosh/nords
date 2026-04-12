# [EPIC] 1: Auth & Identity

**Objective:** Implement Firebase Authentication with Google SSO + Email/Password, email verification gate, and protected routing.
**Invariant:** Unauthenticated users see ONLY auth screens. `email_verified: true` required for all write operations.
**Tech:** Firebase Auth SDK, React Router, JWT token extraction
**Mock Ref:** `client-alt/src/components/Auth/AuthScreen.tsx` (22KB), `AuthScreen.css` (19KB)

---

## [FEATURE] 1.1: Auth Screens UI

### [STORY] 1.1.1: Login Screen — Layout & Styling
* **Target:** `src/components/Auth/LoginScreen.tsx`, `LoginScreen.css`
* **Directive:** Port the login UI from `client-alt/Auth/AuthScreen.tsx`. Left panel: branding with Nords logo, tagline, gradient background. Right panel: login form with email/password fields, "Sign in with Google" button, "Forgot password?" link, "Create account" link.
* **Ref:** `client-alt/Auth/AuthScreen.tsx`, `AuthScreen.css`
* **AC:** Playwright screenshot matches mock layout. All interactive elements have unique `data-testid` attributes.

### [STORY] 1.1.2: Signup Screen — Layout & Styling
* **Target:** `src/components/Auth/SignupScreen.tsx`, `SignupScreen.css`
* **Directive:** Registration form: display name, email, password, confirm password. Password strength indicator. "Sign up with Google" button. Link back to login.
* **Ref:** `client-alt/Auth/AuthScreen.tsx` (signup mode)
* **AC:** Form renders with all fields. Password mismatch shows inline error. Playwright visual snapshot passes.

### [STORY] 1.1.3: Email Verification Pending Screen
* **Target:** `src/components/Auth/VerifyEmailScreen.tsx`
* **Directive:** Post-registration interstitial. Shows "Check your email" message, resend verification button, logout button. Auto-polls `currentUser.reload()` every 5s to detect verification.
* **Ref:** `10_technology_and_infrastructure.md` §3 — email validation requirement
* **AC:** User sees verification screen after signup. Clicking resend triggers `sendEmailVerification()`. After verifying, auto-redirects to app within 5s.

---

## [FEATURE] 1.2: Auth Logic & Firebase Integration

### [STORY] 1.2.1: Firebase SDK Initialization
* **Target:** `src/lib/firebase.ts`
> [!TIP] **GCP Architect Note:** For backend validation on Cloud Run, ensure you use the Firebase Admin SDK to cryptographically verify JWTs locally. Do not make network calls back to Google's Identity servers for token verification, as the latency will accumulate and violate the 50ms WebSocket latency budget.

* **Directive:** Initialize Firebase app from env vars. Export `auth` instance. Connect to Auth emulator when `VITE_USE_EMULATORS=true`. Export typed helper functions: `signInEmail()`, `signUpEmail()`, `signInGoogle()`, `signOut()`, `sendVerification()`.
* **AC:** Unit test: `signInEmail('test@test.com', 'password')` against emulator returns valid user. `signInGoogle()` opens popup provider.

### [STORY] 1.2.2: Auth Context Provider
* **Target:** `src/context/AuthContext.tsx`
* **Directive:** React Context wrapping `onAuthStateChanged` listener. Exposes: `user`, `loading`, `isAuthenticated`, `isEmailVerified`, `signOut()`. Persists auth state across page refreshes.
* **AC:** Unit test: mounting `<AuthProvider>` with mock user populates context. `useAuth()` hook returns correct `isEmailVerified` boolean.

### [STORY] 1.2.3: Protected Route Guard
* **Target:** `src/components/Auth/ProtectedRoute.tsx`
* **Directive:** Wrapper component. If `!isAuthenticated` → redirect to `/login`. If `isAuthenticated && !isEmailVerified` → redirect to `/verify-email`. Otherwise render children.
* **AC:** Unit test: unauthenticated render triggers redirect. Verified user renders children. Unverified user redirects to verification screen.

### [STORY] 1.2.4: App Router with Auth Gates
* **Target:** `src/App.tsx`
* **Directive:** React Router v6. Public routes: `/login`, `/signup`, `/verify-email`, `/forgot-password`. Protected routes: `/` (dashboard), `/project/:id` (canvas). Wrap protected routes in `<ProtectedRoute>`.
* **AC:** E2E: navigating to `/` while logged out redirects to `/login`. After login, redirects to `/`.

---

## [FEATURE] 1.3: Password Recovery & Edge Cases

### [STORY] 1.3.1: Forgot Password Flow
* **Target:** `src/components/Auth/ForgotPasswordScreen.tsx`
* **Directive:** Email input + "Send reset link" button. Calls `sendPasswordResetEmail()`. Success state shows confirmation message.
* **AC:** Submitting valid email calls Firebase API. Success message appears. Invalid email shows error.

### [STORY] 1.3.2: Auth Error Handling & User Feedback
* **Target:** `src/components/Auth/AuthError.tsx`
* **Directive:** Map Firebase error codes (`auth/wrong-password`, `auth/user-not-found`, `auth/email-already-in-use`, `auth/too-many-requests`) to user-friendly messages. Display as inline toast or form error.
* **AC:** Unit test: each Firebase error code maps to a human-readable string. No raw Firebase error codes leak to UI.

### [STORY] 1.3.3: Auth Loading & Skeleton States
* **Target:** `src/components/Auth/AuthLoading.tsx`
* **Directive:** Full-screen loading spinner shown during `onAuthStateChanged` resolution (the ~200ms where auth state is unknown). Prevents flash of login screen for authenticated users.
* **AC:** On initial load, loading spinner appears briefly before resolving to either auth screen or app shell.
