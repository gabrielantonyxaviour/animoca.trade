import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./App.css";
import CredentialIssuance from "./components/issuance/CredentialIssuance";
import CredentialVerification from "./components/verification/CredentialVerification";
import TokenDashboard from "./components/tokens/TokenDashboard";
import TokenCreationForm from "./components/tokens/TokenCreationForm";
import TokenPortfolio from "./components/tokens/TokenPortfolio";
import ClaimTokensInterface from "./components/tokens/ClaimTokensInterface";
import SwapInterface from "./components/trading/SwapInterface";
import LiquidityProvider from "./components/trading/LiquidityProvider";
import PoolManagement from "./components/trading/PoolManagement";
import AnalyticsDashboard from "./components/analytics/AnalyticsDashboard";
import NavBarLogin from "./components/NavBarLogin";
import { ThemeProvider } from "./components/theme-provider";
import { ThemeToggle } from "./components/theme-toggle";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { AirService, BUILD_ENV, type AirEventListener, type BUILD_ENV_TYPE } from "@mocanetwork/airkit";
import { getEnvironmentConfig, type EnvironmentConfig } from "./config/environments";

// Get partner IDs from environment variables
const ISSUER_PARTNER_ID = import.meta.env.VITE_ISSUER_PARTNER_ID || "66811bd6-dab9-41ef-8146-61f29d038a45";
const VERIFIER_PARTNER_ID = import.meta.env.VITE_VERIFIER_PARTNER_ID || "66811bd6-dab9-41ef-8146-61f29d038a45";
const enableLogging = true;

const ENV_OPTIONS = [
  { label: "staging", value: BUILD_ENV.STAGING },
  { label: "sandbox", value: BUILD_ENV.SANDBOX },
];

// Component to get current flow title
const FlowTitle = () => {
  const location = useLocation();

  if (location.pathname === "/issue") {
    return <span className="text-brand-600">issuance</span>;
  } else if (location.pathname === "/verify") {
    return <span className="text-verify-600">verification</span>;
  } else if (location.pathname.startsWith("/tokens")) {
    return <span className="text-brand-600">token ecosystem</span>;
  } else if (location.pathname.startsWith("/trade") || location.pathname.startsWith("/pools")) {
    return <span className="text-brand-600">trading platform</span>;
  } else if (location.pathname.startsWith("/analytics")) {
    return <span className="text-brand-600">analytics dashboard</span>;
  }

  return <span>air credential demo</span>;
};

// Function to get default partner ID based on current route
const getDefaultPartnerId = (pathname: string): string => {
  if (pathname === "/issue") {
    return ISSUER_PARTNER_ID;
  } else if (pathname === "/verify") {
    return VERIFIER_PARTNER_ID;
  }
  return ISSUER_PARTNER_ID; // Default to issuer for root route
};

function AppRoutes({
  airService,
  isInitialized,
  isLoading,
  isLoggedIn,
  userAddress,
  handleLogin,
  handleLogout,
  currentEnv,
  setCurrentEnv,
  partnerId,
  setPartnerId,
  environmentConfig,
}: {
  airService: AirService | null;
  isInitialized: boolean;
  isLoading: boolean;
  isLoggedIn: boolean;
  userAddress: string | null;
  handleLogin: () => void;
  handleLogout: () => void;
  currentEnv: BUILD_ENV_TYPE;
  setCurrentEnv: (env: string) => void;
  partnerId: string;
  setPartnerId: (partnerId: string) => void;
  environmentConfig: EnvironmentConfig;
}) {
  const location = useLocation();

  // Update partner ID when route changes
  useEffect(() => {
    const defaultPartnerId = getDefaultPartnerId(location.pathname);
    setPartnerId(defaultPartnerId);
  }, [location.pathname, setPartnerId]);

  return (
    <div className="min-h-screen bg-black transition-colors">
      {/* Header */}
      <header className="bg-background border-b border-border shadow-sm transition-colors">
        <div className="max-w-full sm:max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center h-auto sm:h-16 gap-2 sm:gap-0 py-2 sm:py-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-6">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                <FlowTitle />
              </h1>
              <div className="flex items-center space-x-2">
                <Label htmlFor="partner-id" className="text-xs text-muted-foreground whitespace-nowrap">
                  partner id:
                </Label>
                <Input
                  id="partner-id"
                  type="text"
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value)}
                  className="text-xs font-mono min-w-[200px] h-8"
                  placeholder="enter partner id"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-8 w-full sm:w-auto">
              <nav className="flex flex-row space-x-2 sm:space-x-8 w-full sm:w-auto">
                <a
                  href="/issue"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted text-center"
                >
                  issuance
                </a>
                <a
                  href="/verify"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted text-center"
                >
                  verification
                </a>
                <a
                  href="/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted text-center"
                >
                  tokens
                </a>
                <a
                  href="/trade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted text-center"
                >
                  trade
                </a>
                <a
                  href="/pools"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted text-center"
                >
                  pools
                </a>
                <a
                  href="/analytics"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted text-center"
                >
                  analytics
                </a>
              </nav>
              <div className="flex items-center space-x-4">
                <ThemeToggle />
                <div className="w-full sm:w-auto">
                  <NavBarLogin
                    isLoading={isLoading}
                    isInitialized={isInitialized}
                    isLoggedIn={isLoggedIn}
                    userAddress={userAddress}
                    onLogin={handleLogin}
                    onLogout={handleLogout}
                    currentEnv={currentEnv}
                    setCurrentEnv={(env) => setCurrentEnv(env as BUILD_ENV_TYPE)}
                    envOptions={ENV_OPTIONS}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Routes>
          {/* Redirect root to /issue */}
          <Route path="/" element={<Navigate to="/issue" replace />} />

          {/* Issuance Flow */}
          <Route
            path="/issue"
            element={
              <CredentialIssuance
                airService={airService}
                isLoggedIn={isLoggedIn}
                partnerId={partnerId}
                environmentConfig={environmentConfig}
              />
            }
          />

          {/* Verification Flow */}
          <Route
            path="/verify"
            element={
              <CredentialVerification
                airService={airService}
                isLoggedIn={isLoggedIn}
                partnerId={partnerId}
                environmentConfig={environmentConfig}
              />
            }
          />

          {/* Token Management Routes */}
          <Route
            path="/tokens"
            element={
              <TokenDashboard
                airService={airService}
                isLoggedIn={isLoggedIn}
                userAddress={userAddress}
              />
            }
          />
          <Route
            path="/tokens/create"
            element={
              <TokenCreationForm
                airService={airService}
                isLoggedIn={isLoggedIn}
                userAddress={userAddress}
              />
            }
          />
          <Route
            path="/tokens/portfolio"
            element={
              <TokenPortfolio
                airService={airService}
                isLoggedIn={isLoggedIn}
                userAddress={userAddress}
              />
            }
          />
          <Route
            path="/tokens/claim"
            element={
              <ClaimTokensInterface
                airService={airService}
                isLoggedIn={isLoggedIn}
                userAddress={userAddress}
                environmentConfig={environmentConfig}
              />
            }
          />

          {/* Trading Routes */}
          <Route
            path="/trade"
            element={
              <SwapInterface
                airService={airService}
                isLoggedIn={isLoggedIn}
                userAddress={userAddress}
                environmentConfig={environmentConfig}
              />
            }
          />
          <Route
            path="/pools"
            element={
              <PoolManagement
                airService={airService}
                isLoggedIn={isLoggedIn}
                userAddress={userAddress}
                environmentConfig={environmentConfig}
              />
            }
          />
          <Route
            path="/pools/:poolId/liquidity"
            element={
              <LiquidityProvider
                airService={airService}
                isLoggedIn={isLoggedIn}
                userAddress={userAddress}
                environmentConfig={environmentConfig}
              />
            }
          />

          {/* Analytics Routes */}
          <Route
            path="/analytics"
            element={
              <AnalyticsDashboard
                environmentConfig={environmentConfig}
              />
            }
          />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-background border-t border-border transition-colors">
        <div className="max-w-full sm:max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6">
          <p className="text-center text-muted-foreground text-xs sm:text-sm">powered by air credential sdk</p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  const [airService, setAirService] = useState<AirService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [currentEnv, setCurrentEnv] = useState<BUILD_ENV_TYPE>(
    BUILD_ENV.SANDBOX
  );
  const [partnerId, setPartnerId] = useState<string>(ISSUER_PARTNER_ID);

  // Get environment config based on current environment
  const environmentConfig = getEnvironmentConfig(currentEnv);

  const initializeAirService = async (env: BUILD_ENV_TYPE = currentEnv, partnerIdToUse: string = partnerId) => {
    if (!partnerIdToUse || partnerIdToUse === "your-partner-id") {
      console.warn("No valid Partner ID configured for nav bar login");
      setIsInitialized(true); // Set to true to prevent infinite loading
      return;
    }

    try {
      const service = new AirService({ partnerId: partnerIdToUse });
      await service.init({ buildEnv: env as (typeof BUILD_ENV)[keyof typeof BUILD_ENV], enableLogging, skipRehydration: false });
      setAirService(service);
      setIsInitialized(true);
      setIsLoggedIn(service.isLoggedIn);

      if (service.isLoggedIn && service.loginResult) {
        const result = service.loginResult;
        console.log("result @ initializeAirService", result);
        if (result.abstractAccountAddress) {
          setUserAddress(result.abstractAccountAddress || null);
        } else {
          console.log("no abstractAccountAddress @ initializeAirService");
          const accounts = await airService?.provider.request({ method: "eth_accounts", params: [] });

          console.log("accounts @ initializeAirService", accounts, airService?.provider);
          setUserAddress(Array.isArray(accounts) && accounts.length > 0 ? accounts[0] : null);
        }
      }

      const eventListener: AirEventListener = async (data) => {
        if (data.event === "logged_in") {
          setIsLoggedIn(true);
          if (data.result.abstractAccountAddress) {
            setUserAddress(data.result.abstractAccountAddress || null);
          } else {
            const accounts = await airService?.provider.request({ method: "eth_accounts", params: [] });
            setUserAddress(Array.isArray(accounts) && accounts.length > 0 ? accounts[0] : null);
          }
        } else if (data.event === "logged_out") {
          setIsLoggedIn(false);
          setUserAddress(null);
        }
      };
      service.on(eventListener);
    } catch (err) {
      console.error("Failed to initialize AIRKit service in nav bar:", err);
      setIsInitialized(true); // Set to true to prevent infinite loading on error
    }
  };

  // Re-initialize AIRKit when partner ID or environment changes
  useEffect(() => {
    initializeAirService(currentEnv, partnerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEnv, partnerId]);

  useEffect(() => {
    // Only run on mount for initial load
    // (the above effect will handle env and partner ID changes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    initializeAirService(currentEnv, partnerId);
    return () => {
      if (airService) {
        airService.cleanUp();
      }
    };
  }, []);

  const handleLogin = async () => {
    if (!airService) return;
    setIsLoading(true);
    try {
      const loginResult = await airService.login();

      if (loginResult.abstractAccountAddress) {
        setUserAddress(loginResult.abstractAccountAddress || null);
      } else {
        const accounts = await airService?.provider.request({ method: "eth_accounts", params: [] });
        setUserAddress(Array.isArray(accounts) && accounts.length > 0 ? accounts[0] : null);
      }
    } catch (err) {
      console.error("Login failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!airService) return;
    try {
      await airService.logout();
      setUserAddress(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Router>
        <AppRoutes
          airService={airService}
          isInitialized={isInitialized}
          isLoading={isLoading}
          isLoggedIn={isLoggedIn}
          userAddress={userAddress}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
          currentEnv={currentEnv}
          setCurrentEnv={(env) => setCurrentEnv(env as BUILD_ENV_TYPE)}
          partnerId={partnerId}
          setPartnerId={setPartnerId}
          environmentConfig={environmentConfig}
        />
      </Router>
    </ThemeProvider>
  );
}

export default App;
