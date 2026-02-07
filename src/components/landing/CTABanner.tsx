import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Stethoscope } from "lucide-react";

export const CTABanner = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 gradient-primary opacity-95" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--emerald-glow)/0.3),transparent_60%)]" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-primary-foreground mb-6 leading-tight">
            See Something. Report It.{" "}
            <span className="text-accent">Save Lives.</span>
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-10 max-w-lg mx-auto">
            Every observation you submit helps build a healthier, safer Africa. Join the MedPulse network today.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-base px-8"
              asChild
            >
              <Link to="/submit">
                <Stethoscope className="mr-2 h-4 w-4" />
                Submit Health Observation
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 font-semibold text-base px-8"
              asChild
            >
              <Link to="/auth">
                Join the Network
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
