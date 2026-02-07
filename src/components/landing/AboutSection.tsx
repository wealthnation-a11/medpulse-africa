import { motion } from "framer-motion";
import { Shield, Globe, HeartPulse } from "lucide-react";

const values = [
  {
    icon: HeartPulse,
    title: "Community-Driven",
    description: "Every report from the ground strengthens our collective defense against outbreaks.",
  },
  {
    icon: Globe,
    title: "Pan-African Coverage",
    description: "Designed for the continent's diversity with flexible, location-agnostic data collection.",
  },
  {
    icon: Shield,
    title: "Expert-Validated",
    description: "Doctors and health professionals review and validate flagged observations.",
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
              Strengthening Africa's Health Defense
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              MedPulse strengthens Africa's public health systems by enabling early
              detection through community participation, intelligent data analysis,
              and expert validation — helping prevent outbreaks before they become
              crises.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We believe that the people closest to health events are the first line
              of defense. By empowering volunteers with simple reporting tools and
              connecting them with medical professionals, we create a responsive
              surveillance network that spans the continent.
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
                  <h3 className="font-display text-base font-bold text-foreground mb-1">
                    {v.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {v.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
