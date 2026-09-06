import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import TerrainTile from './TerrainTile';
import AnalysisMarkers from './AnalysisMarkers';

export default function EarthObservationScene() {
  return (
    <div className="h-full w-full relative">
      <Canvas
        camera={{ position: [12, 10, 15], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]} // limit dpr for performance
      >
        {/* Soft lighting */}
        <ambientLight intensity={0.2} />
        <directionalLight 
          position={[5, 10, -5]} 
          intensity={1.2} 
          color="#ffffff" 
        />
        {/* Cinematic rim light */}
        <directionalLight 
          position={[-10, 5, 10]} 
          intensity={1.5} 
          color="#64ffda" 
        />
        <directionalLight 
          position={[10, 5, 10]} 
          intensity={0.5} 
          color="#a0c0d0" 
        />
        
        <Suspense fallback={null}>
          <OrbitControls 
            enableZoom={false} 
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.5}
            maxPolarAngle={Math.PI / 2 - 0.1}
            minPolarAngle={Math.PI / 4}
          />
          <group position={[0, -0.5, 0]}>
            <TerrainTile />
            <AnalysisMarkers />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}
