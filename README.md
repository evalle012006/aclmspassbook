# AmberCash Client App

React Native (Expo, TypeScript) client app for AmberCash loan clients — view
profile, loans, payment history, withdrawals, LAF applications, and account
documents. Built against Expo **SDK 57** (New Architecture only). The
project was originally scaffolded on SDK 51 and migrated later — if you're
holding onto notes from that era, versions, Babel/Metro config, and Node
requirements have all changed; trust this file and the actual `package.json`
over anything older.

Talks to the `lms` backend's `/api/mobile/*` routes exclusively — never
Hasura/GraphQL directly. See that repo's mobile-related files under
`src/pages/api/mobile/`, `src/lib/mobile-graph.fields.js`, and
`src/services/client-*` for the server side of everything described here.

## What's built

**Auth**
- Phone number → OTP login/enrollment, handling three server-driven flows:
  a returning number (login), a single-match new number (auto-enroll), and
  a number shared by multiple client records (second-factor disambiguation
  via last name + birthdate)
- 3-attempt lockout: on login, the account is suspended server-side after 3
  wrong codes and needs staff to reactivate (Account Profile has no
  self-service unlock — this is intentional). On enrollment, it points to
  staff activation instead, since there's no account yet to lock
- 300-second resend cooldown, enforced server-side and reflected as a live
  countdown on the OTP screen
- Refresh tokens (30 min access / 30 day refresh, rotated on use) — a
  merely-expired access token refreshes silently; only an invalid/expired/
  reused refresh token bounces the user back to login
- Self-registration (ID photo + selfie for a client with no record at all)
  is **not implemented** — `login.tsx` shows the message path but there's no
  camera/upload flow. Still the single biggest known gap.

**Home**
- Profile summary: photo (signed URL, refetched before the 1hr expiry),
  address, member-since date, group-leader badge
- MCBU shown to everyone; CSF only when `profile.groupLeader` is true
- Guarantor-on-file card, resolved from the client's **latest CI-approved**
  loan application specifically (not just any application)
- Current loan snapshot (balance, daily payment, released amount, term,
  payments made, transfer note if applicable) — tapping it opens the same
  payment-history screen as the Loans tab

**Loans**
- Sorted server-side: active status first, then most recently modified,
  then highest loan cycle as a tiebreak
- `status === 'closed'` (an early offset/close) shows `loanRelease` and the
  offset `remarks.label` instead of the normal balance/daily-payment layout
  — this is a different case from `'completed'` (a loan that simply
  finished its term normally)
- Transfer indicator when `transferId` is set, using whichever of
  `transferredDate`/`transferDate` is populated (only one ever is — see
  `getTransferDate()` in `useClientData.ts` for why)
- Every card shows bad-debt-payment count, past-due count, and mispayment
  count (defaults to 0, not blank)
- Tapping a loan opens its payment history (`cashCollections`, latest
  first), with `insertedBy`/`modifiedBy` resolved server-side (falls back
  to a `loId → users` lookup when empty, and `modifiedBy` falls back to
  `insertedBy` — not a separate lookup)

**Withdrawals** — MCBU/CSF withdrawal request history.

**Applications** — LAF applications (matched via `existingClientId` OR
`promotedClientId`, since a prospect's first application links differently
than a returning client's) with their linked CI investigation status
nested underneath (decision, business/address verification, decline
reason, reference code).

**My QR** — the same QR value the staff app's existing scanner reads
(`{webAppOrigin}/transactions/cash-collection/qr-collect/{qrToken}`),
rendered client-side via `react-native-qrcode-svg`.

**Account Profile** — personal details, government ID (type, number, and
both ID photos via signed URLs), and enrolled programs with pictures.

**Everywhere**
- Sign-out lives in the header (all tabs), not on a specific screen
- Tab bar icons via `@expo/vector-icons`'s `Ionicons`
- React Query cache is cleared on sign-in, sign-out, *and* forced logout —
  not just sign-out — so switching accounts on the same app session never
  shows a previous client's cached data

## Known gaps (not hidden, just not built)

- Self-registration camera/upload flow
- No in-app way to reactivate a locked account — that's by design (staff
  does it), but worth knowing before you go looking for it
- The bottom tab bar is at 6 items (Home, Loans, Withdrawals, Applications,
  My QR, Profile) — genuinely crowded on a phone-width screen; worth
  revisiting whether QR and/or Profile belong behind a header icon instead

## Tech stack

- Expo SDK 57 (New Architecture), Expo Router (file-based routing)
- TypeScript
- NativeWind (Tailwind for RN) — v4, paired with Tailwind v3 syntax, **not**
  Tailwind v4's CSS-first config. Don't "upgrade" `tailwind.config.js` to
  v4's `@theme` approach without also moving NativeWind to whatever major
  version actually supports it for this RN/architecture combination.
- React Query (`@tanstack/react-query`) for all server state — no separate
  loading/error state management per screen
- `expo-secure-store` for the auth token (native), with a `localStorage`
  fallback for the web preview only (**not** a security-equivalent path —
  see the comment in `auth-storage.ts`)
- `react-native-qrcode-svg` + `react-native-svg` for the QR screen
- `@expo/vector-icons` for tab icons

## Project structure

```
app/                          Expo Router file-based routes
  _layout.tsx                  Root: QueryClientProvider + AuthProvider
  index.tsx                    Boot redirect (auth vs signed-in)
  (auth)/
    login.tsx                   Phone entry, company logo
    disambiguate.tsx              Shared-number second factor
    verify-otp.tsx                  OTP entry + lockout screen + resend countdown
  (app)/
    _layout.tsx                    Tab navigator, header logout button, signed-out guard
    home.tsx                        Profile + guarantor + current loan snapshot
    loans/index.tsx                   Loans list (sorted, closed/transfer handling)
    loans/[loanId]/payments.tsx         Payment history for one loan
    withdrawals.tsx                       Withdrawal history
    applications.tsx                        LAF + CI investigation status
    qr.tsx                                    Client's own scan QR
    profile.tsx                                Account Profile — details, ID docs, programs

src/
  services/
    api.ts                      Axios instance, token injection, silent refresh on 401
    auth-storage.ts              SecureStore (native) / localStorage (web-only fallback)
    auth-service.ts               request-otp / verify-otp / self-register / logout calls
  hooks/
    useClientData.ts              React Query hooks, one per backend endpoint,
                                    plus getCurrentLoan()/getTransferDate() helpers
    useCountdown.ts                 Shared countdown for the OTP resend cooldown
  context/
    AuthContext.tsx                Sign-in state; clears the query cache on
                                     sign-in/sign-out/forced-logout
  components/
    HeaderLogoutButton.tsx           Confirm-then-sign-out, used in every tab's header
    ListSkeleton.tsx                  Loading state
    StatusViews.tsx                    Error banner + empty state
  types/
    api.ts                             Mirrors the backend's curated mobile field lists
                                         field-for-field — check this file before assuming
                                         a field exists on a response
```

## Setup

1. **Node version.** SDK 57's toolchain needs Node `^22.13.0 || ^24.3.0 ||
   >=26.0.0` — check `node -v` and switch via `nvm` if needed. (This is the
   opposite of SDK 51's requirement, if you're comparing against old notes
   from that scaffold.)

2. **Install dependencies:**
   ```bash
   npm install
   npx expo install --fix   # reconciles everything against SDK 57's compatibility matrix
   ```

3. **`app.json`** needs two values under `expo.extra`, not just one:
   ```json
   "extra": {
     "apiBaseUrl": "http://<your-lan-ip>:3000/api/mobile",
     "webAppOrigin": "https://lms.ambercashph.com"
   }
   ```
   `apiBaseUrl` is the mobile API this app calls. `webAppOrigin` is a
   **different** origin — the LMS staff web app — used only to build the QR
   screen's scan URL; this app never calls it directly. For local testing,
   `apiBaseUrl` needs your machine's LAN IP (not `localhost` — the phone
   can't reach that), found via `ipconfig getifaddr en0` on Mac.

4. **Logo asset.** Both the login screen and Home's footer `require()` a
   local file at `assets/images/logo.png`. This is a hard bundle-time
   dependency — if the file doesn't exist, those screens fail to build
   entirely (not a graceful fallback; `require()` can't be wrapped in
   try/catch for this). Drop your actual logo there; a transparent PNG
   works at both 96×96 and 40×40.

5. **Run it:**
   ```bash
   npx expo start --clear
   ```
   Scan the QR with **Expo Go** (must match SDK 57 — Expo Go on the app
   stores only ever supports the current SDK, so an older Expo Go build
   pinned to a different SDK won't open this project), or press `i`/`a` for
   a simulator/emulator.

6. **Testing OTP without a live SMS account.** Set `MOBILE_OTP_DEBUG_LOG=true`
   in the **backend's** `.env` (not this project's) and restart the backend
   server (env vars are read at process startup, not on save). The OTP
   prints to the backend's terminal instead of sending a real SMS. Leave
   this unset in staging/production.

## Troubleshooting

A few real issues hit during development, kept here so they don't get
re-debugged from scratch:

- **`EMFILE: too many open files, watch`** on macOS — install Watchman
  (`brew install watchman`), which Metro strongly prefers over Node's
  native file watcher for exactly this reason.
- **`ERR_PACKAGE_PATH_NOT_EXPORTED` mentioning `metro`/`TerminalReporter`**
  — almost always a Node version mismatch with whatever Expo SDK is
  actually installed, not a dependency bug. Check `node -v` against the
  SDK's actual requirement before changing any package versions.
- **NativeWind styles not applying / plain white screen with unstyled
  text** — first check `babel.config.js`, `metro.config.js`, and root
  `global.css` are all present and match NativeWind v4's setup exactly
  (see git history for the working versions). If those are correct, the
  usual fix is a full cache-cleared restart, not another config change:
  ```bash
  watchman watch-del-all
  rm -rf node_modules/.cache .expo
  npx expo start --clear
  ```
- **"Text strings must be rendered within a `<Text>` component"** — check
  for `{someLegacyField && <Component/>}` where the field is a number that
  can be `0` (not a real boolean). `0 && x` evaluates to `0`, and React
  Native renders that bare `0` as an invalid text node. Coerce with `!!` or
  compare explicitly (`field > 0`, `field === 'active'`) instead of relying
  on raw truthiness — this bit `loan.activeLoan` (which is a daily-payment
  amount, not a flag) more than once during development.
- **A missing local asset (`require("../../assets/...")`) breaks the whole
  screen** — this is a bundle-time resolution, not a runtime one, so no
  try/catch or conditional logic can make it fail gracefully. The file has
  to actually exist on disk.