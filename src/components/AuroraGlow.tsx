import { useReducedMotion } from "../hooks/useReducedMotion";

export function AuroraGlow() {
  const reduced = useReducedMotion();
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: "-15%", left: "-10%", width: "50%", height: "50%", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
        filter: "blur(80px)",
        animation: reduced ? "none" : "auroraFloat1 20s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: "-15%", right: "-10%", width: "50%", height: "50%", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
        filter: "blur(80px)",
        animation: reduced ? "none" : "auroraFloat2 25s ease-in-out infinite",
      }} />
    </div>
  );
}
