import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Satellite() {
  const groupRef = useRef<THREE.Group>(null);
  const lightConeRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Closer orbit
    const time = state.clock.elapsedTime;
    const radius = 6;
    const speed = 0.2;
    
    // Orbit equation (lower height)
    groupRef.current.position.x = Math.sin(time * speed) * radius;
    groupRef.current.position.z = Math.cos(time * speed) * radius;
    groupRef.current.position.y = 8 + Math.sin(time * speed * 2) * 0.8; // slight bobbing
    
    // Point the satellite towards the center (the terrain)
    groupRef.current.lookAt(0, 0, 0);
    
    // Pulsating light beam - much lower opacity
    if (lightConeRef.current) {
      const material = lightConeRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.05 + Math.sin(time * 4) * 0.03;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Satellite Body */}
      <mesh>
        <boxGeometry args={[0.8, 0.8, 1.2]} />
        <meshStandardMaterial color="#8fae9f" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Solar Panel Left */}
      <mesh position={[-1.5, 0, 0]}>
        <boxGeometry args={[2, 0.05, 0.8]} />
        <meshStandardMaterial color="#1a2530" metalness={0.9} roughness={0.1} />
        {/* Grid lines on solar panel */}
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(2, 0.05, 0.8)]} />
          <lineBasicMaterial color="#4a6580" />
        </lineSegments>
      </mesh>
      
      {/* Solar Panel Right */}
      <mesh position={[1.5, 0, 0]}>
        <boxGeometry args={[2, 0.05, 0.8]} />
        <meshStandardMaterial color="#1a2530" metalness={0.9} roughness={0.1} />
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(2, 0.05, 0.8)]} />
          <lineBasicMaterial color="#4a6580" />
        </lineSegments>
      </mesh>
      
      {/* Lens / Camera port pointing forward (Z is forward after lookAt) */}
      <mesh position={[0, 0, 0.65]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.1, 16]} />
        <meshStandardMaterial color="#000000" metalness={1} roughness={0} />
      </mesh>
      
      {/* Scanning Light Beam */}
      <mesh ref={lightConeRef} position={[0, 0, 8]} rotation={[Math.PI / 2, 0, 0]}>
        {/* Cylinder geometry with top radius 0.2, bottom radius 4, height 16 */}
        <cylinderGeometry args={[0.1, 4, 16, 32, 1, true]} />
        <meshBasicMaterial 
          color="#c1d6cc" 
          transparent={true} 
          opacity={0.08} 
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
