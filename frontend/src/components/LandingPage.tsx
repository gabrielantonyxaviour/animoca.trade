import { ArrowRight, TrendingUp, DollarSign, Users, Shield, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-black text-foreground">
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl sm:text-7xl font-bold mb-6 bg-gradient-to-r from-pink-500 to-pink-300 bg-clip-text text-transparent">
            animoca.trade
          </h1>
          <p className="text-2xl sm:text-3xl font-semibold mb-4 text-white">
            turn your moca credentials into liquid markets
          </p>
          <p className="text-xl sm:text-2xl mb-8 text-gray-300 max-w-4xl mx-auto">
            Liquid markets for professional reputation. Trade credentials like stocks and earn passive income from real utility.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-pink-600 hover:bg-pink-700 text-white border-2 border-pink-500 px-8 py-3 text-lg"
              onClick={() => window.location.href = '/creds'}
            >
              Start Trading
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-2 border-pink-500 text-pink-400 hover:bg-pink-500/10 px-8 py-3 text-lg"
              onClick={() => window.location.href = '/analytics'}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Value Proposition Cards */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-pink-400">
            Four Ways to Earn
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gray-900/50 border-2 border-pink-500/20 hover:border-pink-500/50 transition-all">
              <CardHeader className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-pink-500" />
                <CardTitle className="text-pink-400">Traders</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-center">
                  Speculate on credential value trends and market movements
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-2 border-pink-500/20 hover:border-pink-500/50 transition-all">
              <CardHeader className="text-center">
                <DollarSign className="w-12 h-12 mx-auto mb-4 text-pink-500" />
                <CardTitle className="text-pink-400">Token Holders</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-center">
                  Earn passive income from verification fees tied to real usage
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-2 border-pink-500/20 hover:border-pink-500/50 transition-all">
              <CardHeader className="text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-pink-500" />
                <CardTitle className="text-pink-400">Liquidity Providers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-center">
                  Earn trading fees from the automated market maker
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-2 border-pink-500/20 hover:border-pink-500/50 transition-all">
              <CardHeader className="text-center">
                <Shield className="w-12 h-12 mx-auto mb-4 text-pink-500" />
                <CardTitle className="text-pink-400">Credential Owners</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-center">
                  Generate tokens passively and earn from verification fees
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Revenue Model */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-pink-400">
              Revenue Flows
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Sustainable passive income tied to real utility. More valuable credentials generate higher verification fees.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="bg-black/50 border-2 border-pink-500/30">
              <CardHeader>
                <CardTitle className="text-pink-400 text-center">Token Holders</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-2xl font-bold text-pink-500 mb-2">% of Verification Fees</div>
                <p className="text-gray-300">
                  Minting, on-chain verification, and high-value credential charges
                </p>
              </CardContent>
            </Card>

            <Card className="bg-black/50 border-2 border-pink-500/30">
              <CardHeader>
                <CardTitle className="text-pink-400 text-center">Liquidity Providers</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-2xl font-bold text-pink-500 mb-2">Trading Fees</div>
                <p className="text-gray-300">
                  Automated market maker fees from all trading activity
                </p>
              </CardContent>
            </Card>

            <Card className="bg-black/50 border-2 border-pink-500/30">
              <CardHeader>
                <CardTitle className="text-pink-400 text-center">Platform</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-2xl font-bold text-pink-500 mb-2">Remaining Fees</div>
                <p className="text-gray-300">
                  Platform maintenance and development funding
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why It Works */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-pink-400">
              Self-Reinforcing Value
            </h2>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto">
              This model ties token value to actual credential utility rather than pure speculation.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-br from-gray-900/80 to-black/80 border-2 border-pink-500/50">
              <CardContent className="p-8">
                <div className="flex items-center justify-center mb-6">
                  <Activity className="w-16 h-16 text-pink-500" />
                </div>
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center space-x-4 text-lg">
                    <span className="text-gray-300">High-demand credentials</span>
                    <ArrowRight className="text-pink-500" />
                    <span className="text-gray-300">More verification revenue</span>
                  </div>
                  <div className="flex items-center justify-center space-x-4 text-lg">
                    <span className="text-gray-300">More verification revenue</span>
                    <ArrowRight className="text-pink-500" />
                    <span className="text-gray-300">More holder rewards</span>
                  </div>
                  <div className="flex items-center justify-center space-x-4 text-lg">
                    <span className="text-gray-300">More holder rewards</span>
                    <ArrowRight className="text-pink-500" />
                    <span className="text-gray-300">More buying pressure</span>
                  </div>
                  <div className="mt-6 text-xl font-semibold text-pink-400">
                    = Self-Reinforcing Value Cycle
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-t from-gray-900/50 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-pink-400">
            Ready to Start Trading Skills?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join the future of professional reputation markets
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-pink-600 hover:bg-pink-700 text-white border-2 border-pink-500 px-12 py-4 text-xl"
              onClick={() => window.location.href = '/creds'}
            >
              Get Started
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-2 border-pink-500 text-pink-400 hover:bg-pink-500/10 px-12 py-4 text-xl"
              onClick={() => window.location.href = '/pools'}
            >
              View Pools
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;