import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

interface MarkerProps {
  position: [number, number, number];
  title: string;
  value: string;
  delay?: number;
}

function Marker({ position, title, value, delay = 0 }: MarkerProps) {
  const htmlRef = useRef<THREE.Group>(null);
  const lineRef = useRef<THREE.Line>(null);
  const startY = position[1];
  
  useFrame((state) => {
    const hoverY = Math.sin(state.clock.elapsedTime * 1.5 + delay) * 0.15;
    
    if (htmlRef.current) {
      htmlRef.current.position.y = hoverY;
    }
    
    if (lineRef.current) {
      const positions = lineRef.current.geometry.attributes.position as THREE.BufferAttribute;
      positions.setY(0, hoverY);
      positions.setY(1, -startY);
      positions.needsUpdate = true;
    }
  });

  return (
    <group position={position}>
      {/* Small anchor dot on the terrain */}
      <mesh position={[0, -startY, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#64ffda" />
      </mesh>
      
      {/* Connecting line */}
      <line ref={lineRef as any}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            args={[new Float32Array([0, 0, 0, 0, -startY, 0]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#64ffda" transparent opacity={0.25} />
      </line>

      <group ref={htmlRef}>
        <Html position={[0, 0, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="flex flex-col rounded-lg border border-[rgba(100,255,218,0.2)] bg-[rgba(10,12,8,0.7)] backdrop-blur-md px-3 py-2 text-white shadow-xl min-w-[120px] transition-opacity duration-1000">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="h-1.5 w-1.5 rounded-full bg-[#64ffda] animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64ffda]/80">
              {title}
            </span>
          </div>
          <span className="font-display text-lg font-medium leading-none">
            {value}
          </span>
        </div>
      </Html>
      </group>
    </group>
  );
}

export default function AnalysisMarkers() {
  return (
    <group>
      <Marker position={[2, 1.5, -2]} title="Confidence" value="87%" delay={0} />
      <Marker position={[-2.5, 1.2, 1.5]} title="Flood Extent" value="12.4 km²" delay={2} />
      <Marker position={[1, 1.8, 2.5]} title="Resolution" value="10 m" delay={4} />
    </group>
  );
}
