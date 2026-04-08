import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";

module {

  // ─── Old types (inline, from .old/src/backend/main.mo) ──────────────────

  type OldUserProfile = {
    displayName : Text;
    preferredCurrency : Text;
    language : Text;
    hideBalance : Bool;
    hideTransactions : Bool;
  };

  type OldHistoricalCache = {
    prices : [Float];
    fetchedAt : Int;
  };

  type OldWalletBalance = {
    currency : Text;
    amount : Float;
  };

  type OldWalletTransaction = {
    id : Text;
    txType : Text;
    currency : Text;
    amount : Float;
    date : Text;
    desc : Text;
    status : Text;
  };

  type OldVirtualAccount = {
    accountNumber : Text;
    bankName : Text;
    accountName : Text;
    expiresAt : Text;
    reference : Text;
  };

  type OldRiderRoute = {
    routeId : Text;
    riderPrincipal : Principal;
    vehicleType : Text;
    departureCity : Text;
    departureCountry : Text;
    destinationCity : Text;
    destinationCountry : Text;
    travelDate : Text;
    cargoSpace : Text;
    createdAt : Int;
  };

  type OldPackage = {
    packageId : Text;
    senderPrincipal : Principal;
    pickupLocation : Text;
    destinationCity : Text;
    destinationCountry : Text;
    size : Text;
    weightKg : Float;
    description : Text;
    createdAt : Int;
  };

  type OldAlert = {
    id : Text;
    assetType : Text;
    symbol : Text;
    condition : Text;
    targetPrice : Float;
    isActive : Bool;
    isTriggered : Bool;
    createdAt : Nat;
  };

  type OldDeliveryRequest = {
    requestId : Text;
    packageId : Text;
    senderPrincipal : Principal;
    riderPrincipal : Principal;
    routeId : Text;
    status : Text;
    createdAt : Int;
  };

  type OldTrackingEntry = {
    status : Text;
    timestamp : Int;
  };

  type OldShipmentTracking = {
    trackingCode : Text;
    requestId : Text;
    packageId : Text;
    entries : [OldTrackingEntry];
    currentStatus : Text;
  };

  // ─── OldActor / NewActor ─────────────────────────────────────────────────

  type OldActor = {
    var alerts : [OldAlert];
    var alertCounter : Nat;
    var userProfiles : [(Principal, OldUserProfile)];
    var historicalPriceCache : [(Text, OldHistoricalCache)];
    var walletBalances : [(Principal, [OldWalletBalance])];
    var walletTransactions : [(Principal, [OldWalletTransaction])];
    var virtualAccounts : [(Principal, OldVirtualAccount)];
    var riderRoutes : [(Principal, [OldRiderRoute])];
    var packages : [(Principal, [OldPackage])];
    var deliveryRequests : [OldDeliveryRequest];
    var routeCounter : Nat;
    var packageCounter : Nat;
    var requestCounter : Nat;
    var shipmentTrackings : [OldShipmentTracking];
    var trackingCounter : Nat;
  };

  type NewActor = {
    var alerts : [OldAlert];
    var alertCounter : Nat;
    userProfiles : Map.Map<Principal, OldUserProfile>;
    historicalPriceCache : Map.Map<Text, OldHistoricalCache>;
    walletBalances : Map.Map<Principal, [OldWalletBalance]>;
    walletTransactions : Map.Map<Principal, [OldWalletTransaction]>;
    virtualAccounts : Map.Map<Principal, OldVirtualAccount>;
    riderRoutes : Map.Map<Principal, [OldRiderRoute]>;
    packages : Map.Map<Principal, [OldPackage]>;
    var deliveryRequests : [OldDeliveryRequest];
    var routeCounter : Nat;
    var packageCounter : Nat;
    var requestCounter : Nat;
    var shipmentTrackings : [OldShipmentTracking];
    var trackingCounter : Nat;
  };

  // ─── Migration function ──────────────────────────────────────────────────

  func tupleArrayToMap<K, V>(arr : [(K, V)], compare : (K, K) -> {#less; #equal; #greater}) : Map.Map<K, V> {
    let m = Map.empty<K, V>();
    for ((k, v) in arr.vals()) {
      m.add(k, v);
    };
    m
  };

  public func run(old : OldActor) : NewActor {
    {
      var alerts = old.alerts;
      var alertCounter = old.alertCounter;
      userProfiles = tupleArrayToMap<Principal, OldUserProfile>(old.userProfiles, Principal.compare);
      historicalPriceCache = tupleArrayToMap<Text, OldHistoricalCache>(old.historicalPriceCache, Text.compare);
      walletBalances = tupleArrayToMap<Principal, [OldWalletBalance]>(old.walletBalances, Principal.compare);
      walletTransactions = tupleArrayToMap<Principal, [OldWalletTransaction]>(old.walletTransactions, Principal.compare);
      virtualAccounts = tupleArrayToMap<Principal, OldVirtualAccount>(old.virtualAccounts, Principal.compare);
      riderRoutes = tupleArrayToMap<Principal, [OldRiderRoute]>(old.riderRoutes, Principal.compare);
      packages = tupleArrayToMap<Principal, [OldPackage]>(old.packages, Principal.compare);
      var deliveryRequests = old.deliveryRequests;
      var routeCounter = old.routeCounter;
      var packageCounter = old.packageCounter;
      var requestCounter = old.requestCounter;
      var shipmentTrackings = old.shipmentTrackings;
      var trackingCounter = old.trackingCounter;
    }
  };

};
