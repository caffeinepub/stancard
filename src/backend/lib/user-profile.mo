import Runtime "mo:core/Runtime";
import Types "../types/user-profile";
import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  public type UserProfile = Types.UserProfile;

  public func getProfile(
    profiles : Map.Map<Principal, UserProfile>,
    caller : Principal,
  ) : ?UserProfile {
    Runtime.trap("not implemented");
  };

  public func saveProfile(
    profiles : Map.Map<Principal, UserProfile>,
    caller : Principal,
    displayName : Text,
    preferredCurrency : Text,
    language : Text,
    hideBalance : Bool,
    hideTransactions : Bool,
    avatarUrl : Text,
  ) : UserProfile {
    Runtime.trap("not implemented");
  };
};
