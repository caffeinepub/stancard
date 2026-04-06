# Stancard — Move Module Fixes

## Current State
- `reverseGeocode()` in `src/frontend/src/utils/geocode.ts` has a 6s timeout but when it fires the `null` result still passes through correctly — however the `isGeocoding` state in `RouteModal` sometimes stays true if the timeout fires mid-state-update. More importantly, the user reports the button stays permanently disabled.
- All city/country/pickup inputs in `RouteModal` (Step 1 and Step 2 editable fields) and `PackageModal` are plain `<input type="text">` with no autocomplete or suggestions.
- `PackageModal` is a single-step form; there is no map step. The submit handler (`handlePostPackage`) silently returns if `actor` is null — no error is shown.
- No search-as-you-type Nominatim forward-geocode integration exists anywhere in the Move module.

## Requested Changes (Diff)

### Add
- **`LocationSearchInput` component** (inside `MoveScreen.tsx`): a reusable controlled input that:
  - Accepts `value`, `onChange(value, coords?)`, `placeholder`, `required`, `style` props
  - After 3 characters typed, debounces 300ms then calls Nominatim forward-geocode search (`/search?q=...&format=json&limit=5&addressdetails=1`)
  - Shows a gold-themed dropdown of up to 5 results below the input
  - Each result shows `display_name` (truncated to 60 chars)
  - Selecting a result fills the input text AND calls `onChange` with both the display name and `{ lat, lng }` coordinates
  - If no results: shows "No locations found" in the dropdown (never closes silently)
  - Closes dropdown on outside click or Escape
  - Handles loading state with a small spinner inside the input
- **Two-step map flow in `PackageModal`**: identical two-step pattern to `RouteModal` — Step 1: form fields, Step 2: pin pickup and drop-off on the map with search-as-you-type fields
- **Actor null error in `handlePostPackage`**: if `actor` is null, show a visible red error message "Unable to connect. Please check your connection and try again." — store it as local state in `PackageModal` and render it above the submit button

### Modify
- **`reverseGeocode()` in `geocode.ts`**: increase timeout from 6s to 8s
- **`RouteModal` Step 1 — departure/destination city+country inputs**: replace all 4 plain `<input>` with `LocationSearchInput`. When a result is selected, set both the city AND country from the Nominatim result's `address.city`/`address.town`/`address.village` and `address.country`. The combined `display_name` fills the city field; country fills the country field separately.
- **`RouteModal` Step 2 — editable city/country inputs below the map**: replace the 4 plain `<input>` with `LocationSearchInput`. When a result is selected, also move the corresponding map pin to the selected coordinates (call `setDepPin` or `setDestPin` accordingly).
- **`handleMapClick` in `RouteModal`**: after `reverseGeocode` returns (or times out), the geocoding flags are set to false unconditionally — the fallback is already the existing field text. This is correct but must be verified to always clear both `setGeocodingDep(false)` and `setGeocodingDest(false)` even on timeout.
- **`PackageModal` — pickup and destination inputs**: replace with `LocationSearchInput` in Step 1; add Step 2 map with search fields for both pickup and destination. Selecting a location in Step 2 also moves the pin.

### Remove
- Nothing removed

## Implementation Plan

1. **`geocode.ts`**: Change timeout from 6000ms to 8000ms in `reverseGeocode`.

2. **`MoveScreen.tsx` — `LocationSearchInput` component**: Add as a new component near the top of the file (after `GeoSpinner`). It is self-contained with its own debounce timer ref, suggestion state, and loading state. The `onChange` callback signature: `(text: string, coords?: { lat: number; lng: number }) => void`.

3. **`RouteModal` — Step 1 inputs**: Replace the 4 plain city/country inputs with `LocationSearchInput`. When a location is selected from the dropdown, parse the Nominatim result to extract city and country separately and set both form fields (not just one). Use the `address.city || address.town || address.village || address.county` pattern for city and `address.country` for country.

   **Important**: Since city and country are two separate fields but `LocationSearchInput` is one component, each field gets its own `LocationSearchInput`. The departure search field fills both `departureCity` AND `departureCountry` when a result is selected. Same for destination. The input's `value` should show just the city; country is a separate `LocationSearchInput` that fills only the country.

   **Simpler approach**: Combine each departure/destination into a single `LocationSearchInput` that shows `city, country` as the value and sets both fields on selection. Replace the two-column city+country layout with a single full-width search field per location group (Departure search / Destination search).

4. **`RouteModal` — Step 2 editable fields**: Same `LocationSearchInput` for each. When a result is selected, additionally call `setDepPin({ lat, lng })` or `setDestPin({ lat, lng })` with the selected coordinates so the map pin moves.

5. **`PackageModal`**: 
   - Add `step` state (1 | 2), map pin state (`pickupPin`, `destPin`), geocoding states, pin step state (`PinStep`)
   - Step 1: form fields — replace pickup and destination city/country with `LocationSearchInput`. Add "Next: Pin on Map →" button.
   - Step 2: map with `onMapClick` handler (same reverse geocode + timeout pattern), editable search fields below for pickup and destination, "Confirm & Post" submit button. Back button returns to Step 1.
   - Add `actorError` state. In `handleSubmit` (which is called when the Step 2 button is pressed), if `actor` is null, set `actorError = 'Unable to connect. Please check your connection and try again.'` — show this error in the modal.
   - The `PackageModal` `onSubmit` prop already calls the actor from the parent; the parent's `handlePostPackage` also checks `if (!actor) return` — change that guard to call `toast.error('Unable to connect. Please check your connection and try again.')` instead of silently returning.

6. **Dropdown styling**: dark background `#0D0D0D`, border `1px solid #2A2A2A`, each item `padding: 10px 12px`, hover state `background: rgba(212,175,55,0.1)`, text `#E8E8E8`, font-size 13px. "No locations found" item uses `color: #6C6C6C`. Position absolute below the input, z-index 500, border-radius 8px, max-height 220px overflow-y auto.
