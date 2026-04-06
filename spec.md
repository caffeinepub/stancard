# Stancard — Move Payment Wiring

## Current State

Stancard Move has a complete Rider/Sender matching and request flow, with package tracking. When a sender taps "Request Rider", the delivery request is sent directly to the rider with no payment step. There is no fee confirmation screen, no payment integration in the Move module, and no transaction recorded in Stancard Pay for Move deliveries.

The backend has:
- `sendDeliveryRequest(packageId, routeId, riderPrincipalText)` — sends request directly
- `getWalletBalances()` / `updateWalletBalance()` / `addWalletTransaction()` — wallet management
- `respondToRequest(requestId, accept)` — generates tracking code on accept

## Requested Changes (Diff)

### Add
- **Fee confirmation modal** in MoveScreen: shown before `sendDeliveryRequest` is called, displays package size, rider details, fee in NGN (Small ₦2,000 / Medium ₦5,000 / Large ₦10,000), USD equivalent from live forex data (fallback: 1 USD = ₦1,600)
- **Two payment paths**:
  - "Pay from Wallet" button — shown only if NGN wallet balance >= fee; deducts from canister wallet, records transaction, then sends request
  - "Pay via Flutterwave" button — always shown; opens Flutterwave checkout in NGN, on success sends request and records transaction
- **Backend: `recordMovePayment(packageId, routeId, riderPrincipalText, amount, currency, reference, method)`** — validates wallet balance for "wallet" method, deducts balance, calls sendDeliveryRequest atomically, writes transaction to Stancard Pay history with label "Move delivery fee — [packageId]"
- **Backend: `getWalletBalance(currency)`** — query returning caller's balance for a given currency
- Error state: stays on fee modal, inline error message, buttons remain active

### Modify
- `MoveScreen.tsx`: replace direct `sendDeliveryRequest` call with fee confirmation modal flow
- `MoveScreen.tsx`: add Flutterwave script initialization for NGN checkout
- `MoveScreen.tsx`: wallet balance check on modal open (canister call)

### Remove
- Direct "Request Rider" → `sendDeliveryRequest` without payment gate

## Implementation Plan

1. Add `getWalletBalance(currency)` query to backend
2. Add `recordMovePayment(packageId, routeId, riderPrincipalText, amount, currency, reference, method)` to backend with wallet deduction + tx recording + request sending
3. Update `backend.d.ts` with new function signatures
4. In `MoveScreen.tsx`, replace direct request call with fee confirmation modal showing NGN fee + USD equivalent, two payment buttons, inline error handling
