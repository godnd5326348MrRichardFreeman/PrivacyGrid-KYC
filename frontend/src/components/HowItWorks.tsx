import { Wallet, FileCheck, Shield, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Wallet,
    title: "Connect Wallet",
    description: "Link your Web3 wallet securely using RainbowKit",
    step: "01"
  },
  {
    icon: FileCheck,
    title: "Submit Documents",
    description: "Upload your identity documents which are instantly encrypted",
    step: "02"
  },
  {
    icon: Shield,
    title: "FHE Verification",
    description: "Documents verified under encryption without exposing data",
    step: "03"
  },
  {
    icon: CheckCircle,
    title: "Get Verified",
    description: "Receive your on-chain credential and start using dApps",
    step: "04"
  }
];

export const HowItWorks = () => {
  return (
    <section className="py-24 px-6 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            How It <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Works</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Simple, secure, and lightning fast verification process
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connection line for desktop */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative flex flex-col items-center text-center group">
                {/* Step number badge */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm z-10 shadow-lg shadow-primary/30">
                  {step.step}
                </div>

                {/* Icon container */}
                <div className="w-32 h-32 rounded-2xl bg-card/50 backdrop-blur-sm border border-border group-hover:border-primary/50 flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20">
                  <Icon className="w-12 h-12 text-primary group-hover:text-secondary transition-colors" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">
                  {step.description}
                </p>

                {/* Arrow for mobile */}
                {index < steps.length - 1 && (
                  <div className="lg:hidden w-0.5 h-12 bg-gradient-to-b from-primary/50 to-transparent mt-8" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
