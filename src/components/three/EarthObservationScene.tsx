import { Canvas, useFrame } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import { Suspense, useRef, useEffect } from 'react';
import TerrainTile from './TerrainTile';
import AnalysisMarkers from './AnalysisMarkers';

function SceneSetup() {
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (controlsRef.current) {
      // Start camera zoomed out and high up
      controlsRef.current.setLookAt(30, 25, 30, 0, 0, 0, false);
      
      // Cinematic zoom in
      setTimeout(() => {
        controlsRef.current.setLookAt(12, 10, 15, 0, 0, 0, true);
      }, 300);
    }
  }, []);

  useFrame((_, delta) => {
    if (controlsRef.current) {
      // Gentle auto-rotation
      controlsRef.current.azimuthAngle += 0.1 * delta;
    }
  });

  return (
    <CameraControls 
      ref={controlsRef} 
      maxPolarAngle={Math.PI / 2 - 0.1}
      minPolarAngle={Math.PI / 4}
      mouseButtons={{ left: 1, middle: 0, right: 0, wheel: 0 }} // 1=Rotate
      touches={{ one: 32, two: 0, three: 0 }} // 32=Touch Rotate
    />
  );
}

export default function EarthObservationScene() {
  return (
    <div className="h-full w-full relative">
      <Canvas
        camera={{ position: [30, 25, 30], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]} 
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
          <SceneSetup />
          <group position={[0, -0.5, 0]}>
            <TerrainTile />
            <AnalysisMarkers />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}
