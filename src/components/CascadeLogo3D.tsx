import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function SpinningIco() {
  const wireRef = useRef<THREE.Mesh>(null);
  const solidRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (wireRef.current) { wireRef.current.rotation.x = t * 0.4; wireRef.current.rotation.y = t * 0.6; }
    if (solidRef.current) { solidRef.current.rotation.x = t * 0.4; solidRef.current.rotation.y = t * 0.6; }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[2, 2, 2]} intensity={0.8} color="#3B82F6" />
      <mesh ref={solidRef}>
        <icosahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color="#1E40AF" emissive="#1E40AF" emissiveIntensity={0.15} transparent opacity={0.5} />
      </mesh>
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[0.65, 0]} />
        <meshBasicMaterial color="#6366F1" wireframe transparent opacity={0.5} />
      </mesh>
    </>
  );
}

export function CascadeLogo3D() {
  return (
    <div style={{ width: 32, height: 32 }}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 2], fov: 50 }}>
        <SpinningIco />
      </Canvas>
    </div>
  );
}
