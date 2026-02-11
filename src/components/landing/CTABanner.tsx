import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Stethoscope, Users, ShieldCheck } from "lucide-react";

export const CTABanner = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 gradient-primary opacity-95" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--emerald-glow)/0.3),transparent_60%)]" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-primary-foreground mb-6 leading-tight">
            See Something. Report It.{" "}
            <span className="text-accent">Save Lives.</span>
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-12 max-w-lg mx-auto">
            Every observation you submit helps build a healthier, safer Africa. Join the MedPulse network today.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <motion.div
            className="rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 backdrop-blur-sm p-8 text-center"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-foreground/15 mx-auto mb-4">
              <Users className="h-7 w-7 text-primary-foreground" />
            </div>
            <h3 className="font-display text-xl font-bold text-primary-foreground mb-2">
              I'm a Volunteer
            </h3>
            <p className="text-primary-foreground/70 text-sm mb-6">
              Report health observations from your community and help detect outbreaks early.
            </p>
            <Button
              size="lg"
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
              asChild
            >
              <Link to="/auth?role=volunteer">
                <Stethoscope className="mr-2 h-4 w-4" />
                Join as Volunteer
              </Link>
            </Button>
          </motion.div>

          <motion.div
            className="rounded-2xl border border-accent/30 bg-accent/10 backdrop-blur-sm p-8 text-center"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/20 mx-auto mb-4">
              <ShieldCheck className="h-7 w-7 text-accent" />
            </div>
            <h3 className="font-display text-xl font-bold text-primary-foreground mb-2">
              I'm a Doctor
            </h3>
            <p className="text-primary-foreground/70 text-sm mb-6">
              Validate reports, support early detection, and guide public health responses.
            </p>
            <Button
              size="lg"
              className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold"
              asChild
            >
              <Link to="/auth?role=doctor">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Join as Doctor
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
