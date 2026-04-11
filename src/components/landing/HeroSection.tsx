import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus } from "lucide-react";
import { AfricaMapSVG } from "./AfricaMapSVG";

export const HeroSection = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center gradient-hero overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <motion.div
            className="max-w-xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-6">
              <span className="h-2 w-2 rounded-full bg-risk-low animate-pulse" />
              <span className="text-xs font-medium text-primary">
                AI-Powered Early Disease Detection
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6">
              Detect Disease{" "}
              <span className="gradient-text">Years Before Symptoms</span>{" "}
              Appear
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-md">
              MedPulse combines advanced blood test analysis, genetic screening, and
              AI-powered biomarker detection to identify cancer, heart disease, and
              chronic conditions before they manifest — enabling early intervention
              that saves lives.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="font-semibold" asChild>
                <Link to="/auth">
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Get Started Free
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="font-semibold" asChild>
                <Link to="/auth">
                  <LogIn className="mr-1.5 h-4 w-4" />
                  Sign In
                </Link>
              </Button>
            </div>

            <div className="flex items-center gap-6 mt-10 pt-8 border-t border-border">
              <div>
                <p className="font-display text-2xl font-bold text-foreground">5,000+</p>
                <p className="text-xs text-muted-foreground">Screenings Analyzed</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="font-display text-2xl font-bold text-foreground">12</p>
                <p className="text-xs text-muted-foreground">Countries Active</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="font-display text-2xl font-bold text-foreground">95%</p>
                <p className="text-xs text-muted-foreground">Early Detection Rate</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="relative flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <AfricaMapSVG className="w-full max-w-md lg:max-w-lg" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};
