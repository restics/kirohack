import { useEffect, useRef, useState } from "react";
import { useMobile } from "../hooks/useReducedMotion";

export function CustomCursor() {
  const mobile = useMobile();
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const dotPos = useRef({ x: 0, y: 0 });
  const ringPos = useRef({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (mobile) return;
    const onMove = (e: MouseEvent) => { pos.current = { x: e.clientX, y: e.clientY }; };
    const onOver = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("button, a, [role=button]")) setHovering(true);
    };
    const onOut = () => setHovering(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    window.addEventListener("mouseout", onOut);

    let raf: number;
    const animate = () => {
      dotPos.current.x += (pos.current.x - dotPos.current.x) * 0.2;
      dotPos.current.y += (pos.current.y - dotPos.current.y) * 0.2;
      ringPos.current.x += (pos.current.x - ringPos.current.x) * 0.08;
      ringPos.current.y += (pos.current.y - ringPos.current.y) * 0.08;
      if (dotRef.current) dotRef.current.style.transform = `translate(${dotPos.current.x - 4}px, ${dotPos.current.y - 4}px)`;
      if (ringRef.current) {
        const s = hovering ? 1.5 : 1;
        ringRef.current.style.transform = `translate(${ringPos.current.x - 12}px, ${ringPos.current.y - 12}px) scale(${s})`;
        ringRef.current.style.opacity = hovering ? "0.5" : "0.3";
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseover", onOver); window.removeEventListener("mouseout", onOut); cancelAnimationFrame(raf); };
  }, [mobile, hovering]);

  if (mobile) return null;
  return (
    <>
      <div ref={dotRef} style={{ position: "fixed", top: 0, left: 0, width: 8, height: 8, borderRadius: "50%", background: "#0F172A", zIndex: 50, pointerEvents: "none", mixBlendMode: "difference" }} />
      <div ref={ringRef} style={{ position: "fixed", top: 0, left: 0, width: 24, height: 24, borderRadius: "50%", border: "1.5px solid rgba(30,64,175,0.4)", zIndex: 50, pointerEvents: "none", transition: "opacity 0.2s" }} />
    </>
  );
}
