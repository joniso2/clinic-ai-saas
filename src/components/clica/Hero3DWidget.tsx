'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { HeroScene3D } from './HeroScene3D';

export function Hero3DWidget() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      className="absolute inset-0 size-full"
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 2, 4]} intensity={1.2} />
      <pointLight position={[-2, -1, 2]} intensity={0.8} color="#f5e6d3" />
      <Suspense fallback={null}>
        <HeroScene3D />
      </Suspense>
    </Canvas>
  );
}
