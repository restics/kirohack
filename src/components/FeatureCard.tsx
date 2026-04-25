import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useReducedMotion, useMobile } from "../hooks/useReducedMotion";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  index: number;
  phase: number;
  glowColor: string;
}

export function FeatureCard({ icon, title, description, index, phase, glowColor }: FeatureCardProps) {
  const reduced = useReducedMotion();
  const mobile = useMobile();
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-6, 6]);
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [6, -6]);
  const disableTilt = mobile || reduced;

  const handleMouse = (e: React.MouseEvent) => {
    if (disableTilt) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: reduced ? 0 : 0.7, delay: reduced ? 0 : 0.15 * index, ease: "easeOut" }}
      onMouseMove={handleMouse}
      onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}
      style={{
        ...(disableTilt ? {} : { rotateX: rotateX as unknown as number, rotateY: rotateY as unknown as number, transformPerspective: 1200 }),
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(15,23,42,0.06)",
        borderRadius: 16,
        padding: 32,
        boxShadow: "0 4px 24px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.06)",
        transition: "border-color 0.3s, box-shadow 0.3s",
        animation: reduced ? "none" : `cardFloat ${6 + phase}s ease-in-out infinite`,
        animationDelay: `${phase * 0.8}s`,
      }}
      whileHover={disableTilt ? {} : {
        borderColor: "rgba(59,130,246,0.2)",
        boxShadow: "0 20px 48px rgba(30,64,175,0.12), 0 8px 16px rgba(99,102,241,0.08)",
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: 12,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, rgba(59,130,246,0.06), rgba(99,102,241,0.06))",
        border: "1px solid rgba(59,130,246,0.12)",
        color: glowColor,
        boxShadow: `0 0 24px ${glowColor}30`,
        animation: reduced ? "none" : `iconPulse ${4 + phase}s ease-in-out infinite`,
      }}>
        {icon}
      </div>
      <h3 style={{ marginTop: 24, fontSize: "1.25rem", fontWeight: 600, color: "#0F172A" }}>{title}</h3>
      <p style={{ marginTop: 8, fontSize: "0.875rem", lineHeight: 1.7, color: "#475569" }}>{description}</p>
    </motion.div>
  );
}
