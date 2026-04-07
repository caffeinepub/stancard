# Stancard — Bug Fixes

## Current State
The app has 5 specific bugs to fix. No feature logic or design changes are permitted.

## Requested Changes (Diff)

### Add
- Nothing new to add.

### Modify
1. **Duplicate Alerts button** (`AppHeader.tsx`): The bell button in the header navigates to the Alerts tab, creating a duplicate with the BottomNav Alerts tab on mobile. On mobile (`lg:hidden` screens), hide the bell button so it only appears on desktop where there is no BottomNav. The BottomNav Alerts tab is the canonical mobile navigation — the header bell is the duplicate on mobile.

2. **Alerts tab infinite loading** (`AlertsScreen.tsx`): Fix the `nothingLoaded` condition. Currently it requires `!actor` which means logged-in users whose fetches all time out never see the empty state. Fix: remove `!actor` from the `nothingLoaded` condition — it should be `allLoaded && alerts.length === 0 && !marketData && videos.length === 0`. The withTimeout and loadAll fast-path for logged-out users already exist and work correctly.

3. **Confirm & Register button disabled forever** (`MoveScreen.tsx` — `RouteRegistrationModal` component): The `reverseGeocode` call in `handleMapClick` uses a `try/finally` to clear `geocodingDep`/`geocodingDest`. However if Nominatim hangs and the utility's internal 8s timeout resolves to `null`, the `finally` block does run — but the issue is the utility `reverseGeocode` in `utils/geocode.ts` has an 8s timeout that returns `null`, so the finally block DOES fire eventually. The real issue: there is a race condition where `handleFormSubmit` at line 723 checks `!isGeocoding` before calling `onSubmit` — if `isGeocoding` is true at submit time, it silently does nothing. Fix: remove the `!isGeocoding` guard from `handleFormSubmit` so the button submits regardless. The button is already disabled while geocoding is true, so a user can only click when geocoding=false anyway. Also ensure the `handleRegisterRoute` null-actor check shows an inline error inside the modal rather than just a toast (set modal-level error state).

4. **Post Package button not responding** (`MoveScreen.tsx` — `PostPackageModal` component): The `handleConfirmPost` function at line 1397 calls `await onSubmit(form)` directly — no null actor check here. The null check is in `handlePostPackage` (parent) which fires a `toast.error`. The `actorError` state exists in the modal (line 1304) but is never set from this path. Fix: in `handleConfirmPost`, check if actor is available (pass actor as a prop to the modal OR use the existing `actorError` state mechanism). Simplest fix: ensure `handlePostPackage` sets modal-visible error instead of (or in addition to) toast — pass an `onActorError` callback to the modal that sets its `actorError` state.

5. **Move tab not scrolling on mobile** (`MoveScreen.tsx`): The `<main>` outermost container (line 4291) has `minHeight: "100%"` but no overflow. Add `overflowY: "auto"` to allow vertical scrolling. Also ensure the parent container in `App.tsx` that wraps the MoveScreen tab panel is not blocking scroll with `overflow: hidden`.

### Remove
- Nothing to remove.

## Implementation Plan
1. `AppHeader.tsx`: Add `hidden lg:flex` (or equivalent) to the bell button wrapper so it only shows on desktop.
2. `AlertsScreen.tsx`: Fix `nothingLoaded` — remove `!actor` from the condition.
3. `MoveScreen.tsx` RouteRegistrationModal: Remove the `!isGeocoding` guard from `handleFormSubmit`. Add an `onError` prop to pass error messages back to the modal.
4. `MoveScreen.tsx` PostPackageModal: Wire the `actorError` state so when actor is null, the modal shows the inline error div.
5. `MoveScreen.tsx` main container: Add `overflowY: "auto"` to the `<main>` element.
6. `App.tsx`: Verify tab panel wrapper does not have `overflow: hidden` blocking Move tab scroll.
