import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Stethoscope, Building2 } from "lucide-react";

const audiences = [
  {
    icon: Users,
    title: "Volunteers & Citizens",
    description:
      "Help protect your community by reporting health observations. Your data powers early outbreak detection and saves lives.",
    cta: "Join as Volunteer",
    href: "/auth",
    color: "primary" as const,
  },
  {
    icon: Stethoscope,
    title: "Doctors & Health Experts",
    description:
      "Validate risks, support early detection, and guide responses. Your expertise strengthens our disease intelligence network.",
    cta: "Join as Doctor",
    href: "/auth?role=doctor",
    color: "accent" as const,
  },
  {
    icon: Building2,
    title: "NGOs & Health Authorities",
    description:
      "Access real-time insights, alerts, and outbreak reports to coordinate public health responses across the continent.",
    cta: "Partner with MedPulse",
    href: "#footer",
    color: "emerald-glow" as const,
  },
];

const iconBg: Record<string, string> = {
  primary: "bg-primary/10",
  accent: "bg-accent/10",
  "emerald-glow": "bg-emerald-glow/10",
};

const iconText: Record<string, string> = {
  primary: "text-primary",
  accent: "text-accent",
  "emerald-glow": "text-emerald-glow",
};

export const AudienceCards = () => {
  return (
    <section className="py-24 bg-secondary/40">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">
            Who It's For
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Built for Everyone in the Health Chain
          </h2>
          <p className="text-muted-foreground">
            Whether you're on the ground or in an office, MedPulse gives you the
            tools to make a difference.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {audiences.map((a, i) => (
            <motion.div
              key={a.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
            >
              <Card className="h-full border-border/60 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg[a.color]} mb-5`}>
                    <a.icon className={`h-6 w-6 ${iconText[a.color]}`} />
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground mb-3">
                    {a.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-grow">
                    {a.description}
                  </p>
                  <Button variant="outline" className="w-full font-medium" asChild>
                    <Link to={a.href}>{a.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
