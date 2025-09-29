import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./App.css";
import CredentialIssuance from "./components/issuance/CredentialIssuance";
import CredentialVerification from "./components/verification/CredentialVerification";
import CredentialMarkets from "./components/credentials/CredentialMarkets-wagmi";
import CredentialTradingPage from "./components/credentials/CredentialTradingPage-wagmi";
import TokenCreationForm from "./components/tokens/TokenCreationForm";
import AnalyticsDashboard from "./components/analytics/AnalyticsDashboard";
import NavBarLogin from "./components/NavBarLogin";
import LandingPage from "./components/LandingPage";
import { ThemeProvider } from "./components/theme-provider";
import { Label } from "./components/ui/label";
import { wagmiConfig, ISSUER_PARTNER_ID, VERIFIER_PARTNER_ID } from "./config/wagmi";
import { getEnvironmentConfig } from "./config/environments";
import { BUILD_ENV } from "@mocanetwork/airkit";

// Create a client
const queryClient = new QueryClient();

// Component to get current flow title
const FlowTitle = () => {
  const navigate = useNavigate();
  return (
    <span
      className="text-pink-500 cursor-pointer"
      onClick={() => {
        navigate("/");
      }}
    >
      animoca.trade
    </span>
  );
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

function AppRoutes() {
  const location = useLocation();
  const partnerId = getDefaultPartnerId(location.pathname);
  const environmentConfig = getEnvironmentConfig(BUILD_ENV.SANDBOX);

  return (
    <div className="min-h-screen bg-black transition-colors">
      {/* Header */}
      <header className="bg-background border-b border-pink-500/20 shadow-sm transition-colors">
        <div className="max-w-full sm:max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center h-auto sm:h-16 gap-2 sm:gap-0 py-2 sm:py-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-6">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                <FlowTitle />
              </h1>
              <div className="flex items-center space-x-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">
                  partner id:
                </Label>
                <span className="text-xs font-mono text-foreground bg-muted px-2 py-1 rounded border min-w-[200px] h-8 flex items-center">
                  {partnerId}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-8 w-full sm:w-auto">
              <nav className="flex flex-row space-x-2 sm:space-x-8 w-full sm:w-auto">
                <a
                  href="/"
                  className="flex-1 sm:flex-none px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors text-muted-foreground hover:text-pink-400 hover:bg-muted border border-transparent hover:border-pink-500/30 text-center"
                >
                  home
                </a>
                <a
                  href="/creds"
                  className="flex-1 sm:flex-none px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors text-muted-foreground hover:text-pink-400 hover:bg-muted border border-transparent hover:border-pink-500/30 text-center"
                >
                  markets
                </a>
                <a
                  href="/analytics"
                  className="flex-1 sm:flex-none px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors text-muted-foreground hover:text-pink-400 hover:bg-muted border border-transparent hover:border-pink-500/30 text-center"
                >
                  analytics
                </a>
              </nav>
              <div className="flex items-center space-x-4">
                <div className="w-full sm:w-auto">
                  <NavBarLogin />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Credential Markets */}
          <Route
            path="/creds"
            element={<CredentialMarkets />}
          />

          {/* Create New Credential Token */}
          <Route
            path="/creds/create"
            element={<TokenCreationForm />}
          />

          {/* Individual Credential Trading Page */}
          <Route
            path="/creds/:id"
            element={<CredentialTradingPage />}
          />

          {/* Analytics Dashboard */}
          <Route
            path="/analytics"
            element={
              <AnalyticsDashboard
                environmentConfig={environmentConfig}
              />
            }
          />

          {/* Hidden Routes - Keep but don't show in navigation */}
          <Route
            path="/issue"
            element={
              <CredentialIssuance
                partnerId={partnerId}
                environmentConfig={environmentConfig}
              />
            }
          />
          <Route
            path="/verify"
            element={
              <CredentialVerification
                partnerId={partnerId}
                environmentConfig={environmentConfig}
              />
            }
          />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-background border-t border-pink-500/20 transition-colors">
        <div className="max-w-full sm:max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6">
          <p className="text-center text-muted-foreground text-xs sm:text-sm">animoca.trade - turn credentials into liquid markets</p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <Router>
            <AppRoutes />
          </Router>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;