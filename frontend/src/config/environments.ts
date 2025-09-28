import { BUILD_ENV } from "@mocanetwork/airkit";

export interface EnvironmentConfig {
  widgetUrl: string;
  apiUrl: string;
  contracts?: {
    poolFactory?: string;
    tokenFactory?: string;
  };
}

export const ENVIRONMENT_CONFIGS: Record<string, EnvironmentConfig> = {
  [BUILD_ENV.STAGING]: {
    widgetUrl: "https://credential-widget.test.air3.com",
    apiUrl: "https://credential.api.test.air3.com",
    contracts: {
      poolFactory: "0x0000000000000000000000000000000000000000", // Will be deployed in Session 3
      tokenFactory: "0x0000000000000000000000000000000000000000", // Will be deployed in Session 2
    },
  },
  [BUILD_ENV.SANDBOX]: {
    widgetUrl: "https://credential-widget.sandbox.air3.com",
    apiUrl: "https://credential.api.sandbox.air3.com",
    contracts: {
      poolFactory: "0x0000000000000000000000000000000000000000", // Will be deployed in Session 3
      tokenFactory: "0x0000000000000000000000000000000000000000", // Will be deployed in Session 2
    },
  },
};

export const getEnvironmentConfig = (env: string): EnvironmentConfig => {
  return ENVIRONMENT_CONFIGS[env] || ENVIRONMENT_CONFIGS[BUILD_ENV.SANDBOX];
};
