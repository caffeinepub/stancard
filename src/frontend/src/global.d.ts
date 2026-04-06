import "./backend";

// Add platform-injected method to both the interface and the Backend class
declare module "./backend" {
  interface backendInterface {
    _initializeAccessControlWithSecret: (adminToken: string) => Promise<void>;
  }
  interface Backend {
    _initializeAccessControlWithSecret: (adminToken: string) => Promise<void>;
  }
}
