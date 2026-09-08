import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Satellite() {
  const groupRef = useRef<THREE.Group>(null);
  const lightConeRef = useRef<THREE.Mesh>(null);
  const lensGlowRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Smooth orbit around the terrain
    const time = state.clock.elapsedTime;
    const radius = 8;
    const speed = 0.15;
    
    // Position the satellite
    groupRef.current.position.x = Math.sin(time * speed) * radius;
    groupRef.current.position.z = Math.cos(time * speed) * radius;
    groupRef.current.position.y = 8 + Math.sin(time * speed * 2) * 0.5;
    
    // Constantly point at the center of the terrain
    groupRef.current.lookAt(0, 0, 0);
    
    // Pulsating scanning beam and lens glow
    if (lightConeRef.current && lensGlowRef.current) {
      const pulse = 0.8 + Math.sin(time * 3) * 0.2;
      
      const coneMaterial = lightConeRef.current.material as THREE.ShaderMaterial;
      if (coneMaterial.uniforms) {
        coneMaterial.uniforms.opacity.value = 0.06 * pulse; // much lower opacity
      }
      
      const glowMaterial = lensGlowRef.current.material as THREE.MeshBasicMaterial;
      glowMaterial.opacity = 0.6 * pulse;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 
        SATELLITE BODY
      */}
      <group>
        {/* Core Bus (Bright Gold foil) */}
        <mesh>
          <boxGeometry args={[0.9, 0.9, 1.0]} />
          <meshStandardMaterial color="#ffd700" metalness={0.6} roughness={0.4} />
        </mesh>
        
        {/* Outer Silver Armor/Panels */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.95, 0.8, 0.8]} />
          <meshStandardMaterial color="#e0e0e0" metalness={0.5} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[0.8, 0.95, 0.8]} />
          <meshStandardMaterial color="#e0e0e0" metalness={0.5} roughness={0.2} />
        </mesh>
        
        {/* Antenna/Instruments on top */}
        <mesh position={[0, 0.6, -0.2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.6]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.9, -0.2]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.1} />
        </mesh>
      </group>

      {/* 
        SOLAR PANELS
      */}
      {/* Left Panel Array */}
      <group position={[-2.4, 0, 0]}>
        {/* Truss */}
        <mesh position={[1.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 1.0]} />
          <meshStandardMaterial color="#aaaaaa" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Panel Base */}
        <mesh>
          <boxGeometry args={[3.2, 0.04, 1.4]} />
          <meshStandardMaterial color="#0f2540" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Panel Grid Lines */}
        <mesh position={[0, 0.021, 0]}>
          <planeGeometry args={[3.1, 1.3]} />
          <meshBasicMaterial color="#0f2540" />
        </mesh>
        <lineSegments position={[0, 0.025, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <edgesGeometry args={[new THREE.PlaneGeometry(3.1, 1.3, 8, 3)]} />
          <lineBasicMaterial color="#64ffda" transparent opacity={0.7} />
        </lineSegments>
      </group>

      {/* Right Panel Array */}
      <group position={[2.4, 0, 0]}>
        {/* Truss */}
        <mesh position={[-1.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 1.0]} />
          <meshStandardMaterial color="#aaaaaa" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Panel Base */}
        <mesh>
          <boxGeometry args={[3.2, 0.04, 1.4]} />
          <meshStandardMaterial color="#0f2540" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Panel Grid Lines */}
        <mesh position={[0, 0.021, 0]}>
          <planeGeometry args={[3.1, 1.3]} />
          <meshBasicMaterial color="#0f2540" />
        </mesh>
        <lineSegments position={[0, 0.025, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <edgesGeometry args={[new THREE.PlaneGeometry(3.1, 1.3, 8, 3)]} />
          <lineBasicMaterial color="#64ffda" transparent opacity={0.7} />
        </lineSegments>
      </group>

      {/* 
        CAMERA / LENS (pointing forward/down towards the terrain)
      */}
      <group position={[0, 0, 0.55]}>
        {/* Lens Housing (Smaller so it doesn't look like a projector) */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.18, 0.15, 32]} />
          <meshStandardMaterial color="#888888" metalness={0.5} roughness={0.5} />
        </mesh>
        
        {/* Glowing Lens Core */}
        <mesh ref={lensGlowRef} position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.02, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
        
        {/* Volumetric Scanning Beam (Cone) */}
        <mesh ref={lightConeRef} position={[0, 0, 6.08]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[3.5, 12, 32, 1, true]} />
          <shaderMaterial
            transparent={true}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            uniforms={{
              color: { value: new THREE.Color('#ffffff') },
              opacity: { value: 0.06 } // Default low opacity
            }}
            vertexShader={`
              varying vec3 vPosition;
              void main() {
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              uniform vec3 color;
              uniform float opacity;
              varying vec3 vPosition;
              void main() {
                // vPosition.y goes from -6 (base) to +6 (tip)
                float y = (vPosition.y + 6.0) / 12.0; 
                
                // Very soft fade
                float fade = smoothstep(0.0, 0.8, y);
                
                // Subtle edge glow
                float dist = length(vPosition.xz);
                float currentRadius = 3.5 * (1.0 - y);
                float edge = smoothstep(currentRadius * 0.3, currentRadius, dist);
                
                float alpha = fade * (0.1 + edge * 0.9) * opacity;
                
                gl_FragColor = vec4(color, alpha);
              }
            `}
          />
        </mesh>
      </group>
    </group>
  );
}
