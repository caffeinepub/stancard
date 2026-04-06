# Stancard Move — Map Integration

## Current State

The Stancard Move module (`MoveScreen.tsx`) is fully functional with:
- Rider registration modal (RouteModal) — 2-field city/country text inputs for departure/destination
- Sender package posting modal (PackageModal)
- MatchedRidersPanel — shows matched riders as cards only (no map)
- Active delivery lists (accepted deliveries for Rider, sender requests with status)
- All data stored in backend canister via Motoko
- No map or geocoding functionality exists yet
- Leaflet.js is NOT yet installed as a dependency

## Requested Changes (Diff)

### Add
- **Leaflet.js + leaflet-arc**: Install `leaflet`, `@types/leaflet`, and `leaflet-arc` (or draw curved arcs manually via SVG overlay) as frontend dependencies
- **RouteModal — Step 2 (Map Pin Step)**: After Step 1 (form fields), show Step 2 with an interactive Leaflet map. The rider clicks once to pin departure, once more to pin destination. Reverse geocode each pin via Nominatim (`https://nominatim.openstreetmap.org/reverse`) and auto-populate departureCity/departureCountry and destinationCity/destinationCountry. Show a loading spinner inside the input field while geocoding resolves. Rider can still manually edit the auto-populated text after geocoding.
- **MatchedRidersPanel — Map**: Above the rider cards list, show a Leaflet map plotting only the riders matched to the sender's package destination. Each rider has a gold marker pin. A curved arc (not straight line) is drawn between each rider's departure and destination coordinates (geocoded from their city/country text). Tapping a rider marker highlights their card below and auto-scrolls to it.
- **Active Delivery Map**: On the Rider's accepted deliveries list and Sender's request status view (Accepted state), show a small Leaflet map with two pins: pickup location and drop-off (destination). Geocode the text strings using Nominatim at display time. Cache geocoded coordinates in a React ref/state map (keyed by location string) to avoid repeat calls.
- **Geocoding cache**: Frontend-only geocode cache (React state/ref) to avoid redundant Nominatim calls across all map uses.

### Modify
- **RouteModal**: Add multi-step state (step 1 = form, step 2 = map). Add "Next: Pin on Map" button at bottom of Step 1. Add "Back" button at top of Step 2. Map step shows the CartoDB dark matter tile layer. After pinning, show the auto-populated city/country in an editable preview before final submit.
- **MatchedRidersPanel**: Add map above the cards list. Each card gets a ref for scroll-into-view. Tapping a map marker triggers card highlight + scroll.
- **RouteModal submit**: Only submits after Step 2 (map confirmation). The pin coordinates are stored as lat/lng in local state but do NOT need to be sent to the backend — they are for UX only. The canonical city/country text fields are what get saved.

### Remove
- Nothing is removed — this is additive only.

## Implementation Plan

1. **Install Leaflet**: Add `leaflet` and `@types/leaflet` to `src/frontend/package.json` dependencies. For curved arcs, implement them manually using a Leaflet custom SVG layer or a lightweight approach (compute a bezier midpoint offset, draw as a polyline with interpolated points).

2. **Create `useNominatimGeocode` hook**: Accepts a location string, returns `{lat, lng} | null`. Uses fetch to `https://nominatim.openstreetmap.org/reverse?lat=X&lon=Y&format=json` for reverse geocoding (pin → city/country) and `https://nominatim.openstreetmap.org/search?q=CITY+COUNTRY&format=json&limit=1` for forward geocoding (text → coordinates). Caches results in a module-level Map to avoid duplicate calls.

3. **Create `MoveMap` component**: Reusable Leaflet map wrapper. Props: `markers: {lat, lng, label, id}[]`, `arcs?: {from: {lat,lng}, to: {lat,lng}}[]`, `onMarkerClick?: (id: string) => void`, `height?: number`. Uses CartoDB dark matter tiles. Renders on mount via `useEffect`, cleaned up on unmount. Handles SSR/window safety.

4. **Update `RouteModal`**: Add `step: 1 | 2` state. Step 1 = existing form. Step 2 = `MoveMap` in pin mode (click to set departure pin, click again to set destination pin). Reverse geocode each pin → update form fields with loading indicator (spinner inside input). "Next: Pin on Map" advances to step 2. "Back" returns to step 1. Submit only available after pins set (or skippable if text fields already filled).

5. **Update `MatchedRidersPanel`**: Add Leaflet map above cards. Forward-geocode each matched rider's departure + destination cities. Draw curved arcs between them. Gold custom markers. On marker click: highlight card border in gold, scroll card into view using `cardRefs`.

6. **Add active delivery mini-maps**: In the Rider's accepted delivery view and Sender's Accepted request view, render a `MoveMap` with 2 pins (pickup geocoded, destination geocoded). Use the frontend geocode cache.

7. **Leaflet CSS**: Import `leaflet/dist/leaflet.css` in the map component or globally. Fix default marker icon paths (Leaflet webpack issue) with explicit icon configuration.

8. **Validate and fix**: Run typecheck + build, resolve any issues.
