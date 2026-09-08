import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Leaf, Waves, Mountain, Thermometer } from 'lucide-react';

interface MarkerProps {
  position: [number, number, number];
  title: string;
  value: string;
  icon: React.ElementType<any>;
  delay?: number;
}

function Marker({ position, title, value, icon: Icon, delay = 0 }: MarkerProps) {
  const floatingGroupRef = useRef<THREE.Group>(null);
  const lineRef = useRef<THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>>(null);
  const startY = position[1];

  // Memoize geometry positions so they aren't reallocated every render
  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
      0, 0, 0,        // Top point (will hover)
      0, -startY, 0   // Bottom point (ground level Y = 0)
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [startY]);

  useFrame((state) => {
    const hoverY = Math.sin(state.clock.elapsedTime * 1.5 + delay) * 0.15;

    // 1. Move the floating card
    if (floatingGroupRef.current) {
      floatingGroupRef.current.position.y = hoverY;
    }

    // 2. Safely stretch top vertex of the line to match hover
    if (lineRef.current) {
      const positionAttr = lineRef.current.geometry.attributes.position as THREE.BufferAttribute;
      positionAttr.setY(0, hoverY);
      positionAttr.needsUpdate = true;
    }
  });

  return (
    <group position={position}>
      {/* Anchor dot resting at ground level (Y = 0) */}
      <mesh position={[0, -startY, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
      </mesh>

      {/* Connecting tether line */}
      <line ref={lineRef} geometry={lineGeometry}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.2} />
      </line>

      {/* Hovering UI card */}
      <group ref={floatingGroupRef}>
        <Html position={[0, 0, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="flex flex-col rounded-md border border-white/10 bg-[#1a1e1b]/80 backdrop-blur-md px-2.5 py-1.5 text-white shadow-2xl min-w-[110px] select-none">
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