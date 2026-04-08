import Runtime "mo:core/Runtime";
import Types "../types/user-profile";
import Map "mo:core/Map";
import Principal "mo:core/Principal";

mixin (userProfiles : Map.Map<Principal, Types.UserProfile>) {
  public query (msg) func getUserProfile() : async ?Types.UserProfile {
    Runtime.trap("not implemented");
  };

  public shared (msg) func saveUserProfile(
    displayName : Text,
    preferredCurrency : Text,
    language : Text,
    hideBalance : Bool,
    hideTransactions : Bool,
    avatarUrl : Text,
  ) : async Types.UserProfile {
    Runtime.trap("not implemented");
  };
};
