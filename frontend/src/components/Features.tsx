import { Shield, Eye, Database, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: Shield,
    title: "FHE Technology Demonstration",
    description: "Showcases how data remains encrypted during transmission, storage, and computation using Zama's fully homomorphic encryption protocol.",
    gradient: "from-primary/10 to-transparent"
  },
  {
    icon: Eye,
    title: "Functional Proof-of-Concept",
    description: "Demonstrates privacy-preserving verification workflows. Current implementation validates technical capabilities without real identity verification.",
    gradient: "from-secondary/10 to-transparent"
  },
  {
    icon: Database,
    title: "On-Chain Encrypted Data",
    description: "Illustrates how encrypted credentials can be stored on blockchain networks. This demo uses Sepolia testnet for educational purposes.",
    gradient: "from-primary/10 to-transparent"
  },
  {
    icon: Clock,
    title: "Future Roadmap",
    description: "Next phases will integrate authentic identity verification, enhanced data collection, and compliance with regional regulatory requirements.",
    gradient: "from-secondary/10 to-transparent"
  }
];

export const Features = () => {
  return (
    <section className="py-24 px-6 relative">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            About This <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Demo Project</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A technical showcase of FHE-powered identity verification capabilities
          </p>
          <div className="max-w-3xl mx-auto p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-blue-200/90">
              This is an <strong>educational demonstration</strong> of Zama's FHE technology.
              Real identity verification and compliance checks are not implemented in this version.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="group p-8 bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-8 h-8 text-primary group-hover:text-secondary transition-colors" />
                </div>
                <h3 className="text-2xl font-semibold text-foreground mb-4">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
