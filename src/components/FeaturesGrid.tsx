import { ShieldCheck, Network, Sparkles } from "lucide-react";
import { FeatureCard } from "./FeatureCard";
import { useMobile } from "../hooks/useReducedMotion";

const FEATURES = [
  {
    icon: <ShieldCheck size={24} />,
    title: "Multi-Source Verification",
    description: "Cross-reference facts across multiple news sources to identify consistent and contested information.",
    glowColor: "#1E40AF",
  },
  {
    icon: <Network size={24} />,
    title: "Cascade Analysis",
    description: "Trace how impacts ripple through agriculture, energy, finance, and other interconnected sectors.",
    glowColor: "#6366F1",
  },
  {
    icon: <Sparkles size={24} />,
    title: "Hidden Factor Detection",
    description: "Discover overlooked impacts like labor shifts, environmental debt, and regulatory risks.",
    glowColor: "#F97316",
  },
];

export function FeaturesGrid() {
  const mobile = useMobile();

  return (
    <section style={{
      maxWidth: 1280, margin: "0 auto",
      padding: mobile ? "40px 16px 80px" : "0 24px 120px",
    }}>
      {/* Section divider */}
      <div style={{
        height: 1, maxWidth: 200, margin: "0 auto 60px",
        background: "linear-gradient(to right, transparent, rgba(59,130,246,0.2), transparent)",
      }} />

      <div style={{
        display: "grid",
        gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)",
        gap: 24,
      }}>
        {FEATURES.map((f, i) => (
          <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.description} index={i} phase={i} glowColor={f.glowColor} />
        ))}
      </div>
    </section>
  );
}
