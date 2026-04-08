import Principal "mo:core/Principal";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Time "mo:core/Time";
import AdminTypes "../types/admin";

module {

  // ─── Admin Whitelist Helpers ─────────────────────────────────────────────

  public func isAdmin(
    adminWhitelist : Set.Set<Principal>,
    caller : Principal
  ) : Bool {
    adminWhitelist.contains(caller)
  };

  public func addAdmin(
    adminWhitelist : Set.Set<Principal>,
    caller : Principal,
    newAdmin : Principal
  ) : AdminTypes.AdminResult {
    if (not isAdmin(adminWhitelist, caller)) {
      return #err("Unauthorized: admin access required.");
    };
    adminWhitelist.add(newAdmin);
    #ok("Admin added.")
  };

  public func removeAdmin(
    adminWhitelist : Set.Set<Principal>,
    caller : Principal,
    adminToRemove : Principal
  ) : AdminTypes.AdminResult {
    if (not isAdmin(adminWhitelist, caller)) {
      return #err("Unauthorized: admin access required.");
    };
    if (Principal.equal(caller, adminToRemove)) {
      return #err("You cannot remove yourself from the admin list.");
    };
    adminWhitelist.remove(adminToRemove);
    #ok("Admin removed.")
  };

  public func getAdminList(
    adminWhitelist : Set.Set<Principal>,
    caller : Principal
  ) : [Principal] {
    if (not isAdmin(adminWhitelist, caller)) {
      return [];
    };
    adminWhitelist.toArray()
  };

  // ─── Rider Verification Admin Operations ─────────────────────────────────

  public func approveRiderVerification(
    riderVerificationsWithStatus : Map.Map<Principal, AdminTypes.RiderVerificationWithStatus>,
    adminWhitelist : Set.Set<Principal>,
    caller : Principal,
    riderPrincipal : Principal,
    notes : Text
  ) : AdminTypes.AdminResult {
    if (not isAdmin(adminWhitelist, caller)) {
      return #err("Unauthorized: admin access required.");
    };
    switch (riderVerificationsWithStatus.get(riderPrincipal)) {
      case null { #err("Rider verification record not found.") };
      case (?record) {
        riderVerificationsWithStatus.add(
          riderPrincipal,
          { record with status = #Approved { notes } }
        );
        #ok("Rider verification approved.")
      };
    }
  };

  public func rejectRiderVerification(
    riderVerificationsWithStatus : Map.Map<Principal, AdminTypes.RiderVerificationWithStatus>,
    adminWhitelist : Set.Set<Principal>,
    caller : Principal,
    riderPrincipal : Principal,
    reason : Text
  ) : AdminTypes.AdminResult {
    if (not isAdmin(adminWhitelist, caller)) {
      return #err("Unauthorized: admin access required.");
    };
    switch (riderVerificationsWithStatus.get(riderPrincipal)) {
      case null { #err("Rider verification record not found.") };
      case (?record) {
        riderVerificationsWithStatus.add(
          riderPrincipal,
          { record with status = #Rejected { reason } }
        );
        #ok("Rider verification rejected.")
      };
    }
  };

  public func getAllRiderVerifications(
    riderVerificationsWithStatus : Map.Map<Principal, AdminTypes.RiderVerificationWithStatus>,
    adminWhitelist : Set.Set<Principal>,
    caller : Principal
  ) : [AdminTypes.RiderVerificationWithStatus] {
    if (not isAdmin(adminWhitelist, caller)) {
      return [];
    };
    var out : [AdminTypes.RiderVerificationWithStatus] = [];
    for ((_, record) in riderVerificationsWithStatus.entries()) {
      out := out.concat([record]);
    };
    out
  };

  // ─── Sender Verification Admin Operations ────────────────────────────────

  public func approveSenderVerification(
    senderVerificationsWithStatus : Map.Map<Principal, AdminTypes.SenderVerificationWithStatus>,
    adminWhitelist : Set.Set<Principal>,
    caller : Principal,
    senderPrincipal : Principal,
    notes : Text
  ) : AdminTypes.AdminResult {
    if (not isAdmin(adminWhitelist, caller)) {
      return #err("Unauthorized: admin access required.");
    };
    switch (senderVerificationsWithStatus.get(senderPrincipal)) {
      case null { #err("Sender verification record not found.") };
      case (?record) {
        senderVerificationsWithStatus.add(
          senderPrincipal,
          { record with status = #Approved { notes } }
        );
        #ok("Sender verification approved.")
      };
    }
  };

  public func rejectSenderVerification(
    senderVerificationsWithStatus : Map.Map<Principal, AdminTypes.SenderVerificationWithStatus>,
    adminWhitelist : Set.Set<Principal>,
    caller : Principal,
    senderPrincipal : Principal,
    reason : Text
  ) : AdminTypes.AdminResult {
    if (not isAdmin(adminWhitelist, caller)) {
      return #err("Unauthorized: admin access required.");
    };
    switch (senderVerificationsWithStatus.get(senderPrincipal)) {
      case null { #err("Sender verification record not found.") };
      case (?record) {
        senderVerificationsWithStatus.add(
          senderPrincipal,
          { record with status = #Rejected { reason } }
        );
        #ok("Sender verification rejected.")
      };
    }
  };

  public func getAllSenderVerifications(
    senderVerificationsWithStatus : Map.Map<Principal, AdminTypes.SenderVerificationWithStatus>,
    adminWhitelist : Set.Set<Principal>,
    caller : Principal
  ) : [AdminTypes.SenderVerificationWithStatus] {
    if (not isAdmin(adminWhitelist, caller)) {
      return [];
    };
    var out : [AdminTypes.SenderVerificationWithStatus] = [];
    for ((_, record) in senderVerificationsWithStatus.entries()) {
      out := out.concat([record]);
    };
    out
  };

}
