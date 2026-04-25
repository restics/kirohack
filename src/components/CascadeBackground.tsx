import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useReducedMotion, useMobile } from "../hooks/useReducedMotion";

/* ── Flowing Ribbons ── */
function FlowingRibbon({ color, phase, yOffset }: { color: string; phase: number; yOffset: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const reduced = useReducedMotion();

  const { geometry } = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      pts.push(new THREE.Vector3(
        (i - 3.5) * 2.5,
        yOffset + Math.sin(i * 0.8 + phase) * 1.5,
        -3 + Math.sin(i * 0.5) * 1
      ));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 64, 0.15, 8, false);
    return { geometry: geo, curve, pts };
  }, [phase, yOffset]);

  useFrame(({ clock }) => {
    if (!ref.current || reduced) return;
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.15 + phase) * 0.05;
    ref.current.position.y = Math.sin(clock.elapsedTime * 0.2 + phase * 2) * 0.3;
  });

  return (
    <mesh ref={ref} geometry={geometry}>
      <meshBasicMaterial color={color} transparent opacity={0.1} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ── Particle Constellation ── */
function ParticleConstellation({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const reduced = useReducedMotion();

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const iris = new THREE.Color("#6366F1");
    const ocean = new THREE.Color("#1E40AF");
    const coral = new THREE.Color("#F97316");

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
      const r = Math.random();
      const c = r < 0.6 ? iris : r < 0.9 ? ocean : coral;
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    return { positions: pos, colors: col };
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current || reduced) return;
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] -= delta * 0.08;
      if (pos[i * 3 + 1] < -8) pos[i * 3 + 1] = 8;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} vertexColors transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

/* ── Soft Light Orbs ── */
function SoftOrb({ pos, color, speed }: { pos: [number, number, number]; color: string; speed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const reduced = useReducedMotion();

  useFrame(({ clock }) => {
    if (!ref.current || reduced) return;
    const t = clock.elapsedTime * speed;
    ref.current.position.x = pos[0] + Math.sin(t) * 0.8;
    ref.current.position.y = pos[1] + Math.cos(t * 0.7) * 0.6;
  });

  return (
    <mesh ref={ref} position={pos}>
      <sphereGeometry args={[1.5, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.06} />
    </mesh>
  );
}

/* ── Floating Data Nodes ── */
function DataNode({ pos, geo, color, speed }: {
  pos: [number, number, number]; geo: "ico" | "oct" | "dodec"; color: string; speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const reduced = useReducedMotion();

  useFrame(({ clock }) => {
    if (!ref.current || reduced) return;
    const t = clock.elapsedTime;
    ref.current.rotation.x = t * speed * 0.3;
    ref.current.rotation.y = t * speed * 0.5;
    ref.current.position.y = pos[1] + Math.sin(t * speed + pos[0]) * 0.3;
  });

  const Geo = geo === "ico"
    ? <icosahedronGeometry args={[0.25, 0]} />
    : geo === "oct"
    ? <octahedronGeometry args={[0.3, 0]} />
    : <dodecahedronGeometry args={[0.2, 0]} />;

  return (
    <mesh ref={ref} position={pos}>
      {Geo}
      <meshBasicMaterial color={color} wireframe transparent opacity={0.25} />
    </mesh>
  );
}

/* ── Mouse Parallax ── */
function MouseParallax() {
  const { camera } = useThree();
  const target = useRef({ x: 0, y: 0 });

  useFrame(() => {
    camera.position.x += (target.current.x - camera.position.x) * 0.04;
    camera.position.y += (target.current.y - camera.position.y) * 0.04;
  });

  useMemo(() => {
    const handler = (e: MouseEvent) => {
      target.current.x = ((e.clientX / window.innerWidth) - 0.5) * 0.6;
      target.current.y = -((e.clientY / window.innerHeight) - 0.5) * 0.3;
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return null;
}

/* ── Main Export ── */
export function CascadeBackground() {
  const mobile = useMobile();
  const particleCount = mobile ? 150 : 400;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.85 }}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 8], fov: 50 }}>
        {/* Ribbons */}
        <FlowingRibbon color="#1E40AF" phase={0} yOffset={2} />
        <FlowingRibbon color="#6366F1" phase={1.5} yOffset={-1} />
        <FlowingRibbon color="#3B82F6" phase={3} yOffset={0.5} />
        <FlowingRibbon color="#8B5CF6" phase={4.5} yOffset={-2.5} />

        {/* Particles */}
        <ParticleConstellation count={particleCount} />

        {/* Soft orbs */}
        <SoftOrb pos={[-4, 3, -4]} color="#1E40AF" speed={0.3} />
        <SoftOrb pos={[3, 0, -5]} color="#6366F1" speed={0.25} />
        <SoftOrb pos={[0, -3, -4]} color="#F97316" speed={0.2} />

        {/* Data nodes */}
        <DataNode pos={[-6, 2, -2]} geo="ico" color="#1E40AF" speed={0.4} />
        <DataNode pos={[6, 3, -3]} geo="oct" color="#6366F1" speed={0.35} />
        <DataNode pos={[-5, -3, -1]} geo="dodec" color="#8B5CF6" speed={0.45} />
        <DataNode pos={[5, -2, -2]} geo="ico" color="#3B82F6" speed={0.3} />
        <DataNode pos={[-3, 4, -3]} geo="oct" color="#6366F1" speed={0.5} />
        <DataNode pos={[4, 4, -2]} geo="dodec" color="#1E40AF" speed={0.38} />
        <DataNode pos={[-6, -1, -2]} geo="ico" color="#8B5CF6" speed={0.42} />
        <DataNode pos={[6, -4, -3]} geo="oct" color="#3B82F6" speed={0.33} />

        <MouseParallax />
      </Canvas>
    </div>
  );
}
