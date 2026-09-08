import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Leaf, Waves, Mountain, Thermometer } from 'lucide-react';

interface MarkerProps {
  position: [number, number, number];
  title: string;
  value: string;
  icon: React.ElementType;
  delay?: number;
}

function Marker({ position, title, value, icon: Icon, delay = 0 }: MarkerProps) {
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
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
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
        <lineBasicMaterial color="#ffffff" transparent opacity={0.15} />
      </line>

      <group ref={htmlRef}>
        <Html position={[0, 0, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="flex flex-col rounded-md border border-white/10 bg-[#1a1e1b]/80 backdrop-blur-md px-2.5 py-1.5 text-white shadow-2xl min-w-[110px] transition-opacity duration-1000">
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="flex h-4 w-4 items-center justify-center rounded bg-white/5">
              <Icon className="h-2.5 w-2.5 text-[#c1d6cc]" strokeWidth={2} />
            </div>
            <span className="text-[8px] font-semibold uppercase tracking-widest text-white/60 whitespace-nowrap">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-0.5">
            <span className="font-serif text-base font-medium leading-none text-[#f2f4f2]">
              {value}
            </span>
            <div className="h-1 w-1 rounded-full bg-[#8fae9f] opacity-80" />
          </div>
        </div>
      </Html>
      </group>
    </group>
  );
}

export default function AnalysisMarkers() {
  return (
    <group>
      <Marker position={[-2, 4.5, -2]} title="Vegetation Index" value="87%" icon={Leaf} delay={0} />
      <Marker position={[3, 1.5, 2.5]} title="Flood Extent" value="12.4 km²" icon={Waves} delay={1.5} />
      <Marker position={[-3, 2.0, 3]} title="Elevation" value="342 m" icon={Mountain} delay={3.0} />
      <Marker position={[4, 1.0, -3]} title="Surface Temp" value="31.2°C" icon={Thermometer} delay={4.5} />
    </group>
  );
}
