import { motion } from "framer-motion";
import { Shield, Globe, HeartPulse, Brain } from "lucide-react";

const values = [
  {
    icon: Brain,
    title: "AI-Powered Detection",
    description: "Advanced machine learning analyzes biomarkers, genetic data, and health patterns to detect disease risks years before symptoms appear.",
  },
  {
    icon: HeartPulse,
    title: "Comprehensive Screening",
    description: "Blood tests, genetic panels, and biomarker tracking work together to provide a complete picture of your health trajectory.",
  },
  {
    icon: Globe,
    title: "Pan-African Coverage",
    description: "Designed for Africa's healthcare needs with accessible screening tools and community-driven outbreak surveillance.",
  },
  {
    icon: Shield,
    title: "Expert-Validated",
    description: "Every AI prediction is reviewed by qualified doctors who validate findings and recommend personalized interventions.",
  },
];

export const AboutSection = () => {
  return (
    <section id="about" className="py-24">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">
              Our Mission
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-6">
              Preventing Disease Through Early Detection
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              MedPulse is building Africa's most advanced early disease detection platform —
              combining AI-powered biomarker analysis with community health surveillance to
              detect cancer, heart disease, and chronic conditions years before they become
              life-threatening.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We believe that everyone deserves access to predictive healthcare. By making
              advanced screening analysis accessible and connecting patients with medical
              experts, we're transforming how diseases are detected and prevented across
              the continent.
            </p>
          </motion.div>

          <div className="space-y-5">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                className="flex gap-4 p-5 rounded-xl border border-border bg-card hover:shadow-md transition-shadow"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <v.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground mb-1">{v.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
