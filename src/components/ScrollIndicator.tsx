import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useReducedMotion } from "../hooks/useReducedMotion";

export function ScrollIndicator() {
  const [visible, setVisible] = useState(true);
  const reduced = useReducedMotion();

  useEffect(() => {
    const h = () => setVisible(window.scrollY < 100);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
      animation: reduced ? "none" : "bounceDown 2s ease-in-out infinite",
      opacity: 0.5, transition: "opacity 0.3s",
    }}>
      <ChevronDown size={24} color="#6366F1" />
    </div>
  );
}
