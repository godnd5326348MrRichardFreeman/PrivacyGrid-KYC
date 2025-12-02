import { Shield, User } from "lucide-react";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Link, useLocation } from 'react-router-dom';

export const Header = () => {
  const { isConnected } = useAccount();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">PrivacyGrid KYC</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {isHomePage ? (
              <>
                <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </a>
                <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                  How It Works
                </a>
              </>
            ) : (
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
            )}
            {isConnected && (
              <Link
                to="/profile"
                className={`flex items-center gap-2 transition-colors ${
                  location.pathname === '/profile'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <User className="w-4 h-4" />
                My Profile
              </Link>
            )}
          </nav>

          {/* Connect Button */}
          <div className="flex items-center gap-4">
            {isConnected && (
              <Link
                to="/profile"
                className="md:hidden p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <User className="w-5 h-5" />
              </Link>
            )}
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
};
