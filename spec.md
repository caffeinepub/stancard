# Stancard — Fix All Inactive Buttons & Broken Interactions

## Current State
Stancard is a full-stack financial super-app on ICP with Home, Markets, Pay, Alerts, Profile, and Move tabs. A full audit identified 17 broken, placeholder, or misleading buttons/interactions across 8 files.

## Requested Changes (Diff)

### Add
- Notification bell in AppHeader wires to navigate to Alerts tab (passed via onBellClick prop from App.tsx)
- Currency/forex alert type option in CreateAlertModal (3rd toggle: "💱 Currency"), with a FOREX_PAIRS symbol list (USD/NGN, EUR/NGN, GBP/NGN, CNY/NGN, JPY/NGN) and condition/target price fields
- `Set Alert` button in MarketsScreen expanded chart modal that navigates to Alerts tab (passed via onSetAlert prop)
- Geocoding 8-second timeout in `reverseGeocode` call within MoveScreen's `handleMapClick`

### Modify
- **AppHeader**: Add `onBellClick?: () => void` prop, wire Bell button onClick to it
- **App.tsx**: Pass `onBellClick={() => setActiveTab('alerts')}` to AppHeader; pass `identity` and `displayName` to AlertsScreen; pass `displayName` to MoveScreen
- **AlertsScreen**: Accept `identity` and `displayName` props; gate the "+" create button — if `actor` is null (not logged in), show a toast/inline message "Sign in to create alerts" instead of opening the modal silently. Add "currency" to assetType toggle. Pass `displayName` to AlertsScreen so it knows user is logged in.
- **HomeScreen**: 
  - Remove `hasFetchedRef` guard so news re-fetches every time the tab becomes active (or at minimum on each actor change). Keep 5-min interval.
  - Replace hardcoded `activityItems` with real data: fetch last 3 transactions from `actor.getWalletTransactions()` when logged in; show "Sign in to view recent activity" when logged out; show empty state if no transactions.
  - Replace hardcoded `+4.7% this month` badge with nothing (remove it entirely — no real data to compute this)
  - Pass wallet balances as props to DonutChart so it shows real currency allocation
- **DonutChart**: Accept `balances?: {currency: string, amount: number}[]` and `isLoggedIn?: boolean` props. When logged in and balances provided, compute currency allocation in USD using fixed rates (NGN/1600, EUR*1.09, GBP*1.27, CNY*0.138, USD*1) and render real segments. When logged out or no balances, show a placeholder state (e.g. "Sign in to view allocation" text inside the donut area).
- **PayScreen FundWalletModal**: Add `displayName?: string` prop; pass it to Flutterwave customer `name` field (fallback to "Stancard User"). Accept `userEmail?: string` prop — for now still use "user@stancard.space" since no email is stored, but use display name.
- **PayScreen ReceiveModal**: For non-NGN currencies, hide the amount input field and the "Confirm Receipt" button entirely (the section already shows "coming soon" messaging — the confirm button and amount field are redundant and misleading here). Only show close/done button for non-NGN.
- **AlertsScreen**: Remove silent `if (!actor) return` from handleSubmit; replace with visible error message set to state shown above the submit button.
- **TrackingPage**: When `actor` is null, instead of immediately setting `notFound=true`, show an informational message: "Connect your wallet or wait a moment for the app to load, then try again." with a retry button.
- **NewsSection ArticlePreviewModal**: When `hasValidUrl` is false (mock article with url="#"), show the "Read Full Article" button as disabled with text "Full article not available" (styled differently — muted gold border, greyed text) instead of hiding it entirely.
- **MarketsScreen**: Reset `hasFetchedOnce` when actor changes from null to a real value so market data re-fetches after login. Add `onSetAlert?: (symbol: string) => void` prop; add a "Set Alert" button to the expanded chart modal that calls this prop.
- **MoveScreen**: Accept `displayName?: string` prop. Use `displayName || "Stancard User"` in Flutterwave checkout customer name. Wrap both `reverseGeocode` calls in `handleMapClick` with a `Promise.race` against a 8-second timeout — if it times out, set `setGeocodingDep(false)` / `setGeocodingDest(false)` so the button re-enables.
- **ProfileScreen language pills**: Add a `(UI stays in English)` note directly inline next to the Chinese/French pills as small grey text, making it clear these are preference-only saves.
- **MoveScreen browse section**: Add a "Request Rider" button on each browse route card that (a) if logged out, shows sign-in prompt; (b) if logged in but no packages posted, shows "Post a package first to send a request"; (c) if logged in and has packages, opens a package-picker dropdown to select which package to request this rider for, then opens the payment modal.

### Remove
- Hardcoded `activityItems` array from HomeScreen
- Hardcoded `+4.7% this month` badge from portfolio card
- Hardcoded `segments` constant from DonutChart

## Implementation Plan
1. **geocode.ts**: Add 8s timeout wrapper to `reverseGeocode`
2. **DonutChart.tsx**: Accept real balance props, render real currency allocation or guest placeholder
3. **AppHeader.tsx**: Add `onBellClick` prop, wire bell button
4. **App.tsx**: Wire bell to alerts tab; pass `displayName` to MoveScreen; pass `identity`+`displayName` to AlertsScreen; pass `displayName` to AppHeader (already done)
5. **HomeScreen.tsx**: Remove `hasFetchedRef` one-shot guard (replace with tab-active refetch); fetch real transactions for Recent Activity; remove hardcoded activityItems and +4.7% badge; pass real balances to DonutChart
6. **AlertsScreen.tsx**: Add `identity`+`displayName` props; guard "+" button with login check; add currency asset type with forex pairs
7. **MarketsScreen.tsx**: Reset `hasFetchedOnce` on actor login; add Set Alert button to expanded chart modal; accept `onSetAlert` prop from App.tsx
8. **PayScreen.tsx**: Pass `displayName` to FundWalletModal; use it in Flutterwave customer name; hide amount+confirm in non-NGN Receive modal
9. **MoveScreen.tsx**: Accept `displayName`; use in Flutterwave checkout; add geocoding timeout; add Request Rider to browse cards
10. **TrackingPage.tsx**: Handle null actor with informational state instead of notFound
11. **NewsSection.tsx**: Show disabled "Full article not available" button instead of hiding it for mock articles
12. **ProfileScreen.tsx**: Add inline note on language pills
