import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Shield, Lock, Zap } from "lucide-react";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { KYCForm } from './KYCForm';

export const Hero = () => {
  const [showKYCForm, setShowKYCForm] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-background via-background to-background/95">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="container relative z-10 px-6 mx-auto max-w-7xl">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-sm border border-primary/20">
            <Lock className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">FHE Technology Demo Project</span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-bold leading-tight max-w-4xl">
            <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradient">
              FHE-Powered KYC
            </span>
            <br />
            <span className="text-foreground">Demonstration Platform</span>
          </h1>

          {/* Description */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl">
            A technical demonstration of fully homomorphic encryption in identity verification.
            This is a functional proof-of-concept showcasing FHE capabilities.
          </p>

          {/* Demo Notice */}
          <div className="max-w-3xl mx-auto p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 backdrop-blur-sm">
            <p className="text-sm text-amber-200/90 leading-relaxed">
              <strong className="font-semibold">Demo Project Notice:</strong> This platform demonstrates FHE encryption technology for KYC processes.
              Due to regional compliance and regulatory considerations, real identity verification is not yet implemented.
              Current version performs functional validation only. Future phases will integrate authentic verification and expanded data collection.
            </p>
          </div>

          {/* Features */}
          <div className="flex flex-wrap justify-center gap-6 pt-4">
            <div className="flex items-center gap-2 text-foreground">
              <Shield className="w-5 h-5 text-primary" />
              <span>FHE Encryption Demo</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <Lock className="w-5 h-5 text-secondary" />
              <span>Functional Validation</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <Zap className="w-5 h-5 text-primary" />
              <span>Technology Showcase</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openConnectModal,
                mounted,
              }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      style: {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <Button
                            onClick={openConnectModal}
                            size="lg"
                            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold px-8 py-6 text-lg shadow-lg hover:shadow-[var(--shadow-glow-green)] transition-all"
                          >
                            Connect Wallet
                          </Button>
                        );
                      }

                      return (
                        <Button
                          onClick={() => setShowKYCForm(true)}
                          size="lg"
                          className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-semibold px-8 py-6 text-lg shadow-lg hover:shadow-[var(--shadow-glow-green)] transition-all"
                        >
                          Start KYC Verification
                        </Button>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>

            <Button
              variant="outline"
              size="lg"
              className="border-primary/30 text-foreground hover:bg-primary/10 hover:border-primary font-semibold px-8 py-6 text-lg backdrop-blur-sm transition-all"
            >
              Learn More
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-8 pt-12 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Zama FHE Protocol</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span>Sepolia Testnet</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Educational Purpose</span>
            </div>
          </div>
        </div>
      </div>

      <KYCForm open={showKYCForm} onOpenChange={setShowKYCForm} />
    </section>
  );
};
