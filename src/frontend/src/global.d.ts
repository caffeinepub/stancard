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

// Flutterwave checkout type declarations
interface FlutterwaveConfig {
  public_key: string;
  tx_ref: string;
  amount: number;
  currency: string;
  customer: { email: string; name: string; phone_number?: string };
  customizations: { title: string; description: string; logo?: string };
  callback: (data: {
    status: string;
    transaction_id?: string;
    tx_ref: string;
  }) => void;
  onclose: () => void;
}

declare function FlutterwaveCheckout(config: FlutterwaveConfig): void;

declare global {
  interface Window {
    FlutterwaveCheckout: typeof FlutterwaveCheckout;
  }
}
