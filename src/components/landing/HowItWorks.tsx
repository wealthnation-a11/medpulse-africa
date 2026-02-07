import { motion } from "framer-motion";
import { Users, Brain, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: Users,
    step: "01",
    title: "Community Reporting",
    description:
      "Volunteers submit health observations including symptoms, location, number of cases, and environmental conditions from across Africa.",
  },
  {
    icon: Brain,
    step: "02",
    title: "Risk & AI Analysis",
    description:
      "Rule-based logic and AI analyze patterns, predict possible diseases, and calculate risk levels with confidence scores.",
  },
  {
    icon: Bell,
    step: "03",
    title: "Alerts & Action",
    description:
      "Doctors validate reports, dashboards update in real time, and alerts are sent to responders to enable rapid intervention.",
  },
];

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-secondary/40">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">
            How It Works
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            From Observation to Action in Three Steps
          </h2>
          <p className="text-muted-foreground">
            MedPulse transforms grassroots health data into actionable intelligence through a simple, powerful pipeline.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              className="relative flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <div className="relative z-10 mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-lg shadow-primary/20">
                  <s.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground shadow-md">
                  {s.step}
                </span>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-3">
                {s.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                {s.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="text-center mt-14"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <Button size="lg" className="font-semibold" asChild>
            <Link to="/auth">Become a Volunteer</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
