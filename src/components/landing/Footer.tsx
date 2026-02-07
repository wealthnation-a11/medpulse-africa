import { Link } from "react-router-dom";
import { Activity, Mail, Twitter, Github } from "lucide-react";

export const Footer = () => {
  return (
    <footer id="footer" className="border-t border-border bg-card py-12">
      <div className="container mx-auto px-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                <Activity className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold text-foreground">
                MedPulse
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              AI-powered disease detection and outbreak intelligence for a healthier Africa.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-display font-bold text-foreground text-sm mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/submit" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Submit Report
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display font-bold text-foreground text-sm mb-4">
              Company
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-bold text-foreground text-sm mb-4">
              Connect
            </h4>
            <div className="flex items-center gap-3 mb-3">
              <a
                href="mailto:hello@medpulse.africa"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted hover:bg-primary/10 transition-colors"
              >
                <Mail className="h-4 w-4 text-muted-foreground" />
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted hover:bg-primary/10 transition-colors"
              >
                <Twitter className="h-4 w-4 text-muted-foreground" />
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted hover:bg-primary/10 transition-colors"
              >
                <Github className="h-4 w-4 text-muted-foreground" />
              </a>
            </div>
            <p className="text-sm text-muted-foreground">hello@medpulse.africa</p>
          </div>
        </div>

        <div className="border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} MedPulse. All rights reserved. Protecting communities across Africa.
          </p>
        </div>
      </div>
    </footer>
  );
};
