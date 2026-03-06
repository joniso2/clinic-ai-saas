'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, MeshTransmissionMaterial } from '@react-three/drei';
import type { Mesh } from 'three';

function Orb() {
  const meshRef = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.4}>
      <mesh ref={meshRef} scale={1.8}>
        <sphereGeometry args={[1, 32, 32]} />
        <MeshTransmissionMaterial
          backside
          samples={8}
          thickness={0.35}
          chromaticAberration={0.08}
          anisotropy={0.25}
          distortion={0.05}
          distortionScale={0.15}
          temporalDistortion={0.05}
          iridescence={0.35}
          iridescenceIOR={1}
          iridescenceThicknessRange={[0, 800]}
          clearcoat={0.7}
          clearcoatRoughness={0.15}
          color="#faf0e0"
        />
      </mesh>
    </Float>
  );
}

export function HeroScene3D() {
  return (
    <group position={[0, 0, -2]}>
      <Orb />
    </group>
  );
}
