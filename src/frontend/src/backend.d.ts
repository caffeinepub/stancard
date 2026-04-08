import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type VirtualAccountResult = {
    __kind__: "ok";
    ok: VirtualAccount;
} | {
    __kind__: "err";
    err: string;
};
export interface WalletTransaction {
    id: string;
    status: string;
    date: string;
    desc: string;
    currency: string;
    txType: string;
    amount: number;
}
export interface DeliveryRequest {
    status: string;
    requestId: string;
    riderPrincipal: Principal;
    createdAt: bigint;
    senderPrincipal: Principal;
    routeId: string;
    packageId: string;
}
export type SendMoneyResult = {
    __kind__: "ok";
    ok: {
        txId: string;
        reference: string;
        currency: string;
        timestamp: string;
        amount: number;
        recipientId: string;
    };
} | {
    __kind__: "err";
    err: string;
};
export interface ShipmentTracking {
    trackingCode: string;
    requestId: string;
    entries: Array<TrackingEntry>;
    currentStatus: string;
    packageId: string;
}
export interface MarketData {
    forex: Array<ForexRate>;
    stocks: Array<StockQuote>;
    lastUpdated: bigint;
    crypto: Array<CryptoQuote>;
    success: boolean;
}
export interface ForexRate {
    rate: number;
    symbol: string;
}
export interface AcceptedDeliveryWithTracking {
    status: string;
    trackingCode: string;
    requestId: string;
    riderPrincipal: Principal;
    createdAt: bigint;
    senderPrincipal: Principal;
    routeId: string;
    trackingEntries: Array<TrackingEntry>;
    packageId: string;
}
export interface YouTubeVideo {
    title: string;
    channelTitle: string;
    thumbnail: string;
    videoId: string;
}
export interface Alert {
    id: string;
    createdAt: bigint;
    targetPrice: number;
    isActive: boolean;
    assetType: string;
    isTriggered: boolean;
    symbol: string;
    condition: string;
}
export interface SavingsGoal {
    id: string;
    isCompleted: boolean;
    name: string;
    createdAt: bigint;
    targetAmount: number;
    currency: string;
    lockedAmount: number;
}
export interface CryptoQuote {
    name: string;
    changesPercentage: number;
    price: number;
    symbol: string;
}
export type AdminResult = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "err";
    err: string;
};
export interface NewsData {
    articles: Array<NewsArticle>;
    lastUpdated: bigint;
    success: boolean;
}
export interface WalletBalance {
    currency: string;
    amount: number;
}
export interface SenderVerification {
    nationalIdDocUrl?: string;
    senderPrincipal: Principal;
    phoneNumber: string;
    verifiedAt: bigint;
    nationalIdNumber: string;
}
export interface RiderRoute {
    vehicleType: string;
    riderPrincipal: Principal;
    departureCountry: string;
    departureCity: string;
    createdAt: bigint;
    destinationCity: string;
    routeId: string;
    travelDate: string;
    destinationCountry: string;
    cargoSpace: string;
}
export type SavingsGoalResult = {
    __kind__: "ok";
    ok: SavingsGoal;
} | {
    __kind__: "err";
    err: string;
};
export interface Package {
    createdAt: bigint;
    size: string;
    description: string;
    destinationCity: string;
    weightKg: number;
    senderPrincipal: Principal;
    destinationCountry: string;
    packageId: string;
    pickupLocation: string;
}
export interface StockQuote {
    name: string;
    changesPercentage: number;
    price: number;
    symbol: string;
}
export interface RiderVerificationWithStatus {
    status: VerificationStatus;
    riderPrincipal: Principal;
    vehicleRegDocUrl?: string;
    licenseDocUrl?: string;
    nationalIdDocUrl?: string;
    licenseType: string;
    licenseNumber: string;
    vehicleRegistrationNumber: string;
    verifiedAt: bigint;
    nationalIdNumber: string;
}
export type MoveResult = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "err";
    err: string;
};
export type VerificationStatus = {
    __kind__: "Approved";
    Approved: {
        notes: string;
    };
} | {
    __kind__: "Rejected";
    Rejected: {
        reason: string;
    };
} | {
    __kind__: "Pending";
    Pending: null;
};
export type UnlockResult = {
    __kind__: "ok";
    ok: number;
} | {
    __kind__: "err";
    err: string;
};
export interface SenderVerificationWithStatus {
    status: VerificationStatus;
    nationalIdDocUrl?: string;
    senderPrincipal: Principal;
    phoneNumber: string;
    verifiedAt: bigint;
    nationalIdNumber: string;
}
export interface VirtualAccount {
    expiresAt: string;
    reference: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
}
export interface TrackingEntry {
    status: string;
    timestamp: bigint;
}
export interface RequestWithPackage {
    status: string;
    requestId: string;
    createdAt: bigint;
    size: string;
    description: string;
    destinationCity: string;
    weightKg: number;
    senderPrincipal: Principal;
    routeId: string;
    destinationCountry: string;
    packageId: string;
    pickupLocation: string;
}
export interface NewsArticle {
    url: string;
    title: string;
    source: string;
    urlToImage: string;
    publishedAt: string;
    description: string;
}
export interface UserProfile {
    hideBalance: boolean;
    hideTransactions: boolean;
    displayName: string;
    preferredCurrency: string;
    language: string;
}
export interface RiderVerification {
    riderPrincipal: Principal;
    vehicleRegDocUrl?: string;
    licenseDocUrl?: string;
    nationalIdDocUrl?: string;
    licenseType: string;
    licenseNumber: string;
    vehicleRegistrationNumber: string;
    verifiedAt: bigint;
    nationalIdNumber: string;
}
export interface backendInterface {
    addAdmin(newAdmin: Principal): Promise<AdminResult>;
    addAlert(assetType: string, symbol: string, condition: string, targetPrice: number): Promise<Alert>;
    addToSavingsGoal(goalId: string, amount: number): Promise<SavingsGoalResult>;
    addWalletTransaction(txType: string, currency: string, amount: number, date: string, desc: string, status: string): Promise<WalletTransaction>;
    approveRiderVerification(riderPrincipal: Principal, notes: string): Promise<AdminResult>;
    approveSenderVerification(senderPrincipal: Principal, notes: string): Promise<AdminResult>;
    clearAlertTriggered(id: string): Promise<boolean>;
    createSavingsGoal(name: string, targetAmount: number, initialDeposit: number, currency: string): Promise<SavingsGoalResult>;
    createVirtualAccount(displayName: string): Promise<VirtualAccountResult>;
    deleteAlert(id: string): Promise<boolean>;
    deleteRoute(routeId: string): Promise<MoveResult>;
    getAcceptedDeliveries(): Promise<Array<DeliveryRequest>>;
    getAcceptedDeliveriesWithTracking(): Promise<Array<AcceptedDeliveryWithTracking>>;
    getAdminList(): Promise<Array<Principal>>;
    getAlerts(): Promise<Array<Alert>>;
    getAllRiderVerifications(): Promise<Array<RiderVerificationWithStatus>>;
    getAllRoutes(): Promise<Array<RiderRoute>>;
    getAllSenderVerifications(): Promise<Array<SenderVerificationWithStatus>>;
    getHistoricalForex(symbol: string): Promise<Array<number>>;
    getHistoricalPrices(symbol: string): Promise<Array<number>>;
    getIncomingRequests(): Promise<Array<RequestWithPackage>>;
    getMarketData(): Promise<MarketData>;
    getMatchedRiders(destinationCity: string, destinationCountry: string): Promise<Array<RiderRoute>>;
    getNewsData(): Promise<NewsData>;
    getRiderRoutes(): Promise<Array<RiderRoute>>;
    getRiderVerification(): Promise<RiderVerification | null>;
    getSavingsGoals(): Promise<Array<SavingsGoal>>;
    getSenderPackages(): Promise<Array<Package>>;
    getSenderRequests(): Promise<Array<DeliveryRequest>>;
    getSenderTrackings(): Promise<Array<ShipmentTracking>>;
    getSenderVerification(): Promise<SenderVerification | null>;
    getTrackingByCode(code: string): Promise<ShipmentTracking | null>;
    getTrackingByRequestId(requestId: string): Promise<ShipmentTracking | null>;
    getUserProfile(): Promise<UserProfile | null>;
    getVirtualAccount(): Promise<VirtualAccount | null>;
    getWalletBalance(currency: string): Promise<number>;
    getWalletBalances(): Promise<Array<WalletBalance>>;
    getWalletTransactions(): Promise<Array<WalletTransaction>>;
    getYouTubeVideos(): Promise<Array<YouTubeVideo>>;
    getYouTubeVideosByQuery(searchQuery: string): Promise<Array<YouTubeVideo>>;
    isAdminCaller(): Promise<boolean>;
    markAlertTriggered(id: string): Promise<boolean>;
    postPackage(pickupLocation: string, destinationCity: string, destinationCountry: string, size: string, weightKg: number, description: string): Promise<MoveResult>;
    recordMovePayment(packageId: string, routeId: string, riderPrincipalText: string, amount: number, currency: string, _reference: string, method: string, dateStr: string): Promise<MoveResult>;
    refreshVirtualAccount(displayName: string): Promise<VirtualAccountResult>;
    registerRoute(vehicleType: string, departureCity: string, departureCountry: string, destinationCity: string, destinationCountry: string, travelDate: string, cargoSpace: string): Promise<MoveResult>;
    rejectRiderVerification(riderPrincipal: Principal, reason: string): Promise<AdminResult>;
    rejectSenderVerification(senderPrincipal: Principal, reason: string): Promise<AdminResult>;
    removeAdmin(adminToRemove: Principal): Promise<AdminResult>;
    respondToRequest(requestId: string, accept: boolean): Promise<MoveResult>;
    saveUserProfile(displayName: string, preferredCurrency: string, language: string, hideBalance: boolean, hideTransactions: boolean): Promise<UserProfile>;
    sendDeliveryRequest(packageId: string, routeId: string, riderPrincipalText: string): Promise<MoveResult>;
    sendMoney(recipientPrincipal: string, amount: number, currency: string, dateStr: string): Promise<SendMoneyResult>;
    submitRiderVerification(nationalIdNumber: string, licenseNumber: string, licenseType: string, vehicleRegistrationNumber: string, nationalIdDocUrl: string | null, licenseDocUrl: string | null, vehicleRegDocUrl: string | null): Promise<MoveResult>;
    submitSenderVerification(phoneNumber: string, nationalIdNumber: string, nationalIdDocUrl: string | null): Promise<MoveResult>;
    unlockSavingsGoal(goalId: string): Promise<UnlockResult>;
    updateAlert(id: string, isActive: boolean): Promise<boolean>;
    updateRoute(routeId: string, vehicleType: string, departureCity: string, departureCountry: string, destinationCity: string, destinationCountry: string, travelDate: string, cargoSpace: string): Promise<MoveResult>;
    updateShipmentStatus(requestId: string, newStatus: string): Promise<MoveResult>;
    updateWalletBalance(currency: string, newAmount: number): Promise<WalletBalance>;
}
