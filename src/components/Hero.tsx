import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useReducedMotion, useMobile } from "../hooks/useReducedMotion";
import { ScrollIndicator } from "./ScrollIndicator";

interface HeroProps { onStart: () => void; }

export function Hero({ onStart }: HeroProps) {
  const reduced = useReducedMotion();
  const mobile = useMobile();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [btnOffset, setBtnOffset] = useState({ x: 0, y: 0 });
  const [btnHover, setBtnHover] = useState(false);

  const handleBtnMouse = (e: React.MouseEvent) => {
    if (mobile || reduced) return;
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    setBtnOffset({
      x: ((e.clientX - rect.left) / rect.width - 0.5) * 12,
      y: ((e.clientY - rect.top) / rect.height - 0.5) * 12,
    });
  };

  const words = "Uncover the Hidden Impacts of Economic Events".split(" ");
  const gradientWords = new Set(["Hidden", "Impacts"]);

  return (
    <section style={{
      minHeight: "calc(100vh - 56px)", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", position: "relative",
      padding: mobile ? "40px 16px" : "80px 24px", textAlign: "center",
    }}>
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduced ? 0 : 0.5 }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "8px 20px", borderRadius: 9999,
          background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)",
          backdropFilter: "blur(8px)", fontSize: "0.75rem", fontWeight: 500,
          color: "#1E40AF", letterSpacing: "0.08em", marginBottom: 32,
        }}
      >
        <span style={{
          width: 8, height: 8, borderRadius: "50%", background: "#F97316",
          animation: reduced ? "none" : "pulse 2s ease-in-out infinite",
          boxShadow: "0 0 8px rgba(249,115,22,0.4)",
        }} />
        ECONOMIC ANALYSIS TOOL
      </motion.div>

      {/* Heading */}
      <h1 style={{
        fontSize: mobile ? "2.5rem" : "4.5rem", fontWeight: 500, lineHeight: 1.08,
        letterSpacing: "-0.03em", maxWidth: 900,
        fontFamily: "'Instrument Serif', Georgia, serif",
      }}>
        {words.map((word, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 0.08 * i }}
            style={{
              display: "inline-block", marginRight: "0.3em",
              ...(gradientWords.has(word) ? {
                background: "linear-gradient(110deg, #1E40AF 0%, #3B82F6 25%, #6366F1 50%, #8B5CF6 75%, #1E40AF 100%)",
                backgroundSize: "250% 100%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: reduced ? "none" : "shimmer 7s linear infinite",
                filter: "drop-shadow(0 2px 12px rgba(99,102,241,0.15))",
              } : { color: "#0F172A" }),
            }}
          >{word}</motion.span>
        ))}
      </h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : 0.6 }}
        style={{ marginTop: 24, maxWidth: 640, fontSize: mobile ? "1rem" : "1.15rem", lineHeight: 1.7, color: "#475569" }}
      >
        Analyze how news events cascade through interconnected economic sectors.
        Get AI-powered insights into direct and indirect impacts that traditional analysis misses.
      </motion.p>

      {/* CTA */}
      <motion.button
        ref={btnRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : 0.8 }}
        whileHover={reduced ? {} : { scale: 1.04 }}
        whileTap={{ scale: 0.98 }}
        onClick={onStart}
        onMouseMove={handleBtnMouse}
        onMouseEnter={() => setBtnHover(true)}
        onMouseLeave={() => { setBtnOffset({ x: 0, y: 0 }); setBtnHover(false); }}
        style={{
          marginTop: 40, display: "inline-flex", alignItems: "center", gap: 10,
          padding: "16px 32px", borderRadius: 12, border: "none",
          background: btnHover
            ? "linear-gradient(135deg, #1E40AF, #6366F1, #F97316)"
            : "linear-gradient(135deg, #1E40AF, #6366F1)",
          color: "#fff", fontSize: "1rem", fontWeight: 600, cursor: "pointer",
          boxShadow: btnHover
            ? "0 14px 48px rgba(30,64,175,0.3), 0 6px 16px rgba(99,102,241,0.25)"
            : "0 10px 40px rgba(30,64,175,0.25), 0 4px 12px rgba(99,102,241,0.2)",
          transform: `translate(${btnOffset.x}px, ${btnOffset.y}px)`,
          transition: "background 0.4s, box-shadow 0.3s, transform 0.15s ease-out",
        }}
      >
        Start Analysis
        <ArrowRight size={18} style={{ transform: btnHover ? "translateX(4px)" : "none", transition: "transform 0.2s" }} />
      </motion.button>

      {/* Trust line */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduced ? 0 : 1.2, duration: 0.5 }}
        style={{ marginTop: 20, fontSize: "0.85rem", color: "#94A3B8", fontStyle: "italic" }}
      >
        ✨ Trusted by analysts at top financial institutions
      </motion.p>

      <ScrollIndicator />
    </section>
  );
}
