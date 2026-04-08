import Principal "mo:core/Principal";

module {

  // ─── Verification Status ─────────────────────────────────────────────────

  public type VerificationStatus = {
    #Pending;
    #Approved : { notes : Text };
    #Rejected : { reason : Text };
  };

  // ─── Extended Verification Types (with status) ───────────────────────────

  public type RiderVerificationWithStatus = {
    riderPrincipal : Principal;
    nationalIdNumber : Text;
    licenseNumber : Text;
    licenseType : Text;
    vehicleRegistrationNumber : Text;
    nationalIdDocUrl : ?Text;
    licenseDocUrl : ?Text;
    vehicleRegDocUrl : ?Text;
    verifiedAt : Int;
    status : VerificationStatus;
  };

  public type SenderVerificationWithStatus = {
    senderPrincipal : Principal;
    phoneNumber : Text;
    nationalIdNumber : Text;
    nationalIdDocUrl : ?Text;
    verifiedAt : Int;
    status : VerificationStatus;
  };

  // ─── Admin User Summary ──────────────────────────────────────────────────

  public type AdminUserSummary = {
    principal : Principal;
    displayName : Text;
    createdAt : Int;
  };

  // ─── Admin Result ────────────────────────────────────────────────────────

  public type AdminResult = { #ok : Text; #err : Text };

}
