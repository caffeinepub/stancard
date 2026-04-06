import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;

export interface Alert {
    id: string;
    assetType: string;
    symbol: string;
    condition: string;
    targetPrice: number;
    isActive: boolean;
    isTriggered: boolean;
    createdAt: bigint;
}

export interface YouTubeVideo {
    videoId: string;
    title: string;
    thumbnail: string;
    channelTitle: string;
}

export interface StockQuote {
    symbol: string;
    name: string;
    price: number;
    changesPercentage: number;
}

export interface ForexRate {
    symbol: string;
    rate: number;
}

export interface CryptoQuote {
    symbol: string;
    name: string;
    price: number;
    changesPercentage: number;
}

export interface MarketData {
    stocks: StockQuote[];
    forex: ForexRate[];
    crypto: CryptoQuote[];
    lastUpdated: bigint;
    success: boolean;
}

export interface NewsArticle {
    title: string;
    source: string;
    url: string;
    urlToImage: string;
    publishedAt: string;
    description: string;
}

export interface NewsData {
    articles: NewsArticle[];
    lastUpdated: bigint;
    success: boolean;
}

export interface UserProfile {
    displayName: string;
    preferredCurrency: string;
    language: string;
    hideBalance: boolean;
    hideTransactions: boolean;
}

export interface WalletBalance {
    currency: string;
    amount: number;
}

export interface WalletTransaction {
    id: string;
    txType: string;
    currency: string;
    amount: number;
    date: string;
    desc: string;
    status: string;
}

export interface VirtualAccount {
    accountNumber: string;
    bankName: string;
    accountName: string;
    expiresAt: string;
    reference: string;
}

export type VirtualAccountResult =
    | { ok: VirtualAccount }
    | { err: string };

export type SendMoneyResult =
    | { ok: { txId: string; reference: string; recipientId: string; amount: number; currency: string; timestamp: string } }
    | { err: string };

export type MoveResult =
    | { ok: string }
    | { err: string };

export interface RiderRoute {
    routeId: string;
    riderPrincipal: Principal;
    vehicleType: string;
    departureCity: string;
    departureCountry: string;
    destinationCity: string;
    destinationCountry: string;
    travelDate: string;
    cargoSpace: string;
    createdAt: bigint;
}

export interface Package {
    packageId: string;
    senderPrincipal: Principal;
    pickupLocation: string;
    destinationCity: string;
    destinationCountry: string;
    size: string;
    weightKg: number;
    description: string;
    createdAt: bigint;
}

export interface DeliveryRequest {
    requestId: string;
    packageId: string;
    senderPrincipal: Principal;
    riderPrincipal: Principal;
    routeId: string;
    status: string;
    createdAt: bigint;
}

export interface RequestWithPackage {
    requestId: string;
    packageId: string;
    senderPrincipal: Principal;
    routeId: string;
    status: string;
    createdAt: bigint;
    pickupLocation: string;
    destinationCity: string;
    destinationCountry: string;
    size: string;
    weightKg: number;
    description: string;
}

export interface backendInterface {
    _initializeAccessControlWithSecret: (adminToken: string) => Promise<void>;
    getMarketData: () => Promise<MarketData>;
    getNewsData: () => Promise<NewsData>;
    getYouTubeVideos: () => Promise<YouTubeVideo[]>;
    getYouTubeVideosByQuery: (query: string) => Promise<YouTubeVideo[]>;
    getHistoricalPrices: (symbol: string) => Promise<number[]>;
    addAlert: (assetType: string, symbol: string, condition: string, targetPrice: number) => Promise<Alert>;
    getAlerts: () => Promise<Alert[]>;
    updateAlert: (id: string, isActive: boolean) => Promise<boolean>;
    deleteAlert: (id: string) => Promise<boolean>;
    markAlertTriggered: (id: string) => Promise<boolean>;
    clearAlertTriggered: (id: string) => Promise<boolean>;
    getUserProfile: () => Promise<UserProfile | undefined>;
    saveUserProfile: (displayName: string, preferredCurrency: string, language: string, hideBalance: boolean, hideTransactions: boolean) => Promise<UserProfile>;
    getWalletBalances: () => Promise<WalletBalance[]>;
    getWalletTransactions: () => Promise<WalletTransaction[]>;
    updateWalletBalance: (currency: string, newAmount: number) => Promise<WalletBalance>;
    addWalletTransaction: (txType: string, currency: string, amount: number, date: string, desc: string, status: string) => Promise<WalletTransaction>;
    sendMoney: (recipientPrincipal: string, amount: number, currency: string, dateStr: string) => Promise<SendMoneyResult>;
    getVirtualAccount: () => Promise<VirtualAccount | undefined>;
    createVirtualAccount: (displayName: string) => Promise<VirtualAccountResult>;
    refreshVirtualAccount: (displayName: string) => Promise<VirtualAccountResult>;
    registerRoute: (vehicleType: string, departureCity: string, departureCountry: string, destinationCity: string, destinationCountry: string, travelDate: string, cargoSpace: string) => Promise<MoveResult>;
    updateRoute: (routeId: string, vehicleType: string, departureCity: string, departureCountry: string, destinationCity: string, destinationCountry: string, travelDate: string, cargoSpace: string) => Promise<MoveResult>;
    deleteRoute: (routeId: string) => Promise<MoveResult>;
    getRiderRoutes: () => Promise<RiderRoute[]>;
    getAllRoutes: () => Promise<RiderRoute[]>;
    postPackage: (pickupLocation: string, destinationCity: string, destinationCountry: string, size: string, weightKg: number, description: string) => Promise<MoveResult>;
    getSenderPackages: () => Promise<Package[]>;
    getMatchedRiders: (destinationCity: string, destinationCountry: string) => Promise<RiderRoute[]>;
    sendDeliveryRequest: (packageId: string, routeId: string, riderPrincipalText: string) => Promise<MoveResult>;
    getIncomingRequests: () => Promise<RequestWithPackage[]>;
    respondToRequest: (requestId: string, accept: boolean) => Promise<MoveResult>;
    getSenderRequests: () => Promise<DeliveryRequest[]>;
    getAcceptedDeliveries: () => Promise<DeliveryRequest[]>;
}
