import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { airConnector } from "@mocanetwork/airkit-connector";

// Get partner IDs from environment variables
const ISSUER_PARTNER_ID = import.meta.env.VITE_ISSUER_PARTNER_ID || "66811bd6-dab9-41ef-8146-61f29d038a45";
const VERIFIER_PARTNER_ID = import.meta.env.VITE_VERIFIER_PARTNER_ID || "66811bd6-dab9-41ef-8146-61f29d038a45";

// Define Moca Devnet chain
export const mocaDevnet = defineChain({
  id: 5151,
  name: 'Moca Devnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MOCA',
    symbol: 'MOCA',
  },
  rpcUrls: {
    default: {
      http: ['https://devnet-rpc.mocachain.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Moca Explorer',
      url: 'https://devnet-scan.mocachain.org',
    },
  },
  testnet: true,
});

// Create wagmi config with AirKit connector
export const wagmiConfig = createConfig({
  chains: [mocaDevnet],
  transports: {
    [mocaDevnet.id]: http(),
  },
  connectors: [
    airConnector({
      partnerId: ISSUER_PARTNER_ID, // Using issuer partner ID as default
      buildEnv: "sandbox",
      enableLogging: true,
    }),
  ],
});

// Export partner IDs for use in components
export { ISSUER_PARTNER_ID, VERIFIER_PARTNER_ID };