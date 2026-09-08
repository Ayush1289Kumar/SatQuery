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
      const pulse = 0.6 + Math.sin(time * 3) * 0.4;
      
      const coneMaterial = lightConeRef.current.material as THREE.ShaderMaterial;
      if (coneMaterial.uniforms) {
        coneMaterial.uniforms.opacity.value = 0.8 * pulse; // adjusted baseline opacity
      }
      
      const glowMaterial = lensGlowRef.current.material as THREE.MeshBasicMaterial;
      glowMaterial.opacity = 1.0 * pulse;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 
        SATELLITE BODY
      */}
      <group>
        {/* Core Bus (Gold foil/metallic) */}
        <mesh>
          <boxGeometry args={[0.9, 0.9, 1.0]} />
          <meshStandardMaterial color="#cfae60" metalness={0.9} roughness={0.3} />
        </mesh>
        
        {/* Outer Dark Armor/Panels */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.95, 0.8, 0.8]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[0.8, 0.95, 0.8]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.4} />
        </mesh>
        
        {/* Antenna/Instruments on top */}
        <mesh position={[0, 0.6, -0.2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.4]} />
          <meshStandardMaterial color="#888888" metalness={1} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.8, -0.2]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.1} roughness={0.9} />
        </mesh>
      </group>

      {/* 
        SOLAR PANELS
      */}
      {/* Left Panel Array */}
      <group position={[-1.8, 0, 0]}>
        {/* Truss */}
        <mesh position={[0.9, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.9]} />
          <meshStandardMaterial color="#555555" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Panel Base */}
        <mesh>
          <boxGeometry args={[2.2, 0.05, 1.2]} />
          <meshStandardMaterial color="#0a1526" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Panel Grid Lines */}
        <mesh position={[0, 0.026, 0]}>
          <planeGeometry args={[2.1, 1.1]} />
          <meshBasicMaterial color="#0a1526" />
        </mesh>
        <lineSegments position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <edgesGeometry args={[new THREE.PlaneGeometry(2.1, 1.1, 6, 3)]} />
          <lineBasicMaterial color="#4a7eb0" transparent opacity={0.6} />
        </lineSegments>
      </group>

      {/* Right Panel Array */}
      <group position={[1.8, 0, 0]}>
        {/* Truss */}
        <mesh position={[-0.9, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 0.9]} />
          <meshStandardMaterial color="#555555" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Panel Base */}
        <mesh>
          <boxGeometry args={[2.2, 0.05, 1.2]} />
          <meshStandardMaterial color="#0a1526" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Panel Grid Lines */}
        <mesh position={[0, 0.026, 0]}>
          <planeGeometry args={[2.1, 1.1]} />
          <meshBasicMaterial color="#0a1526" />
        </mesh>
        <lineSegments position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <edgesGeometry args={[new THREE.PlaneGeometry(2.1, 1.1, 6, 3)]} />
          <lineBasicMaterial color="#4a7eb0" transparent opacity={0.6} />
        </lineSegments>
      </group>

      {/* 
        CAMERA / LENS (pointing forward/down towards the terrain)
        Since lookAt points the local Z-axis towards the target, the lens should be on the +Z face.
      */}
      <group position={[0, 0, 0.55]}>
        {/* Lens Housing */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.25, 0.3, 0.3, 32]} />
          <meshStandardMaterial color="#111111" metalness={0.9} roughness={0.2} />
        </mesh>
        
        {/* Glowing Lens Core */}
        <mesh ref={lensGlowRef} position={[0, 0, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.02, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={1.0} />
        </mesh>
        
        {/* Volumetric Scanning Beam (Cone) */}
        <mesh ref={lightConeRef} position={[0, 0, 6.16]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[3.5, 12, 32, 1, true]} />
          <shaderMaterial
            transparent={true}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            uniforms={{
              color: { value: new THREE.Color('#ffffff') },
              opacity: { value: 0.4 }
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
                
                // Fade out near the base (y=0) and be brightest near the tip (y=1)
                float fade = smoothstep(0.0, 0.6, y);
                
                // Make edges brighter to simulate volumetric scattering
                float dist = length(vPosition.xz);
                float radius = 3.5 * y; // radius is 0 at tip (y=1), wait!
                // Tip is at y=6 (normalized 1.0), base is at y=-6 (normalized 0.0).
                // At tip, radius is 0. At base, radius is 3.5.
                float currentRadius = 3.5 * (1.0 - y);
                float edge = smoothstep(currentRadius * 0.6, currentRadius, dist);
                
                float alpha = fade * (0.3 + edge * 0.7) * opacity;
                
                gl_FragColor = vec4(color, alpha);
              }
            `}
          />
        </mesh>
      </group>
    </group>
  );
}
