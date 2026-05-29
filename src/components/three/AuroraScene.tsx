import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere } from "@react-three/drei";
import * as THREE from "three";

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function FloatingOrb({
  position,
  color,
  scale = 1,
  speed = 1,
}: {
  position: [number, number, number];
  color: string;
  scale?: number;
  speed?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current || prefersReducedMotion) return;
    const t = state.clock.getElapsedTime();
    ref.current.position.y = position[1] + Math.sin(t * speed) * 0.3;
    ref.current.rotation.x = t * 0.15 * speed;
    ref.current.rotation.y = t * 0.2 * speed;
  });
  return (
    <Float speed={2 * speed} rotationIntensity={0.4} floatIntensity={0.6}>
      <Sphere ref={ref} args={[1, 64, 64]} position={position} scale={scale}>
        <MeshDistortMaterial
          color={color}
          distort={0.45}
          speed={1.5}
          roughness={0.15}
          metalness={0.6}
          emissive={color}
          emissiveIntensity={0.35}
        />
      </Sphere>
    </Float>
  );
}

function MouseParallax() {
  const { camera } = useThreeMouse();
  return null;
}

function useThreeMouse() {
  const ref = useRef({ x: 0, y: 0 });
  useFrame((state) => {
    if (prefersReducedMotion) return;
    const { mouse, camera } = state;
    ref.current.x += (mouse.x * 0.5 - ref.current.x) * 0.05;
    ref.current.y += (mouse.y * 0.3 - ref.current.y) * 0.05;
    camera.position.x = ref.current.x;
    camera.position.y = ref.current.y;
    camera.lookAt(0, 0, 0);
  });
  return { camera: null as unknown as THREE.Camera };
}

const AuroraScene = () => {
  const orbs = useMemo(
    () =>
      [
        { position: [-2.4, 0.6, -1] as [number, number, number], color: "#a78bfa", scale: 1.2, speed: 0.9 },
        { position: [2.2, -0.4, -0.6] as [number, number, number], color: "#4ade80", scale: 1.0, speed: 1.1 },
        { position: [0, 1.6, -2] as [number, number, number], color: "#60a5fa", scale: 1.6, speed: 0.6 },
        { position: [-0.6, -1.4, 0.4] as [number, number, number], color: "#f0abfc", scale: 0.7, speed: 1.3 },
      ],
    []
  );

  return (
    <Canvas
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 6], fov: 50 }}
      style={{ pointerEvents: "none" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} color="#a78bfa" />
        <directionalLight position={[-5, -3, 2]} intensity={0.6} color="#4ade80" />
        <pointLight position={[0, 0, 4]} intensity={1.2} color="#60a5fa" />
        {orbs.map((o, i) => (
          <FloatingOrb key={i} {...o} />
        ))}
        <Environment_Removed />
        <MouseParallax />
      </Suspense>
    </Canvas>
  );
};

export default AuroraScene;
