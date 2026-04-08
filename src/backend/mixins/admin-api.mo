import Principal "mo:core/Principal";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Time "mo:core/Time";
import AdminTypes "../types/admin";

// ─── Admin API Mixin ─────────────────────────────────────────────────────────
// Exposes all admin-only endpoints and the bootstrapped admin whitelist.
// State slices injected:
//   - adminWhitelist: Set of whitelisted admin principals
//   - riderVerificationsWithStatus: extended rider verifications with VerificationStatus
//   - senderVerificationsWithStatus: extended sender verifications with VerificationStatus
//   - userProfiles / riderRoutes / packages / deliveryRequests / shipmentTrackings
//     are passed in read-only for admin overview queries.

mixin (
  adminWhitelist : Set.Set<Principal>,
  riderVerificationsWithStatus : Map.Map<Principal, AdminTypes.RiderVerificationWithStatus>,
  senderVerificationsWithStatus : Map.Map<Principal, AdminTypes.SenderVerificationWithStatus>
) {

  // ─── Admin Management ───────────────────────────────────────────────────

  /// Add a new admin principal. Only callable by an existing admin.
  public shared (msg) func addAdmin(newAdmin : Principal) : async AdminTypes.AdminResult {
    Runtime.trap("not implemented");
  };

  /// Remove an admin principal. Only callable by an existing admin. Cannot remove yourself.
  public shared (msg) func removeAdmin(adminToRemove : Principal) : async AdminTypes.AdminResult {
    Runtime.trap("not implemented");
  };

  /// Returns the full list of admin principals. Admin only.
  public query (msg) func getAdminList() : async [Principal] {
    Runtime.trap("not implemented");
  };

  /// Returns whether the caller is an admin.
  public query (msg) func isAdminCaller() : async Bool {
    Runtime.trap("not implemented");
  };

  // ─── Rider Verification Admin ───────────────────────────────────────────

  /// Approve a rider's verification submission. Admin only.
  public shared (msg) func approveRiderVerification(riderPrincipal : Principal, notes : Text) : async AdminTypes.AdminResult {
    Runtime.trap("not implemented");
  };

  /// Reject a rider's verification submission. Admin only.
  public shared (msg) func rejectRiderVerification(riderPrincipal : Principal, reason : Text) : async AdminTypes.AdminResult {
    Runtime.trap("not implemented");
  };

  /// Get all rider verification submissions with their current status. Admin only.
  public query (msg) func getAllRiderVerifications() : async [AdminTypes.RiderVerificationWithStatus] {
    Runtime.trap("not implemented");
  };

  // ─── Sender Verification Admin ──────────────────────────────────────────

  /// Approve a sender's verification submission. Admin only.
  public shared (msg) func approveSenderVerification(senderPrincipal : Principal, notes : Text) : async AdminTypes.AdminResult {
    Runtime.trap("not implemented");
  };

  /// Reject a sender's verification submission. Admin only.
  public shared (msg) func rejectSenderVerification(senderPrincipal : Principal, reason : Text) : async AdminTypes.AdminResult {
    Runtime.trap("not implemented");
  };

  /// Get all sender verification submissions with their current status. Admin only.
  public query (msg) func getAllSenderVerifications() : async [AdminTypes.SenderVerificationWithStatus] {
    Runtime.trap("not implemented");
  };

}
