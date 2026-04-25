import { useEffect, useState } from "react";
import { CascadeLogo3D } from "./CascadeLogo3D";

interface HeaderProps { onLogoClick: () => void; }

export function Header({ onLogoClick }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 40,
      display: "flex", alignItems: "center", padding: "12px 24px",
      background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(15,23,42,0.06)",
      boxShadow: scrolled ? "0 4px 24px rgba(15,23,42,0.04)" : "none",
      transition: "box-shadow 0.3s ease",
    }}>
      <button onClick={onLogoClick} style={{ display: "flex", alignItems: "center", gap: 10, padding: 0 }} aria-label="Go to homepage">
        <CascadeLogo3D />
        <span style={{
          fontSize: "1.2rem", fontWeight: 600, letterSpacing: "-0.02em",
          color: "#0F172A", textShadow: "0 1px 2px rgba(15,23,42,0.08)",
        }}>Cascade</span>
      </button>
    </header>
  );
}
