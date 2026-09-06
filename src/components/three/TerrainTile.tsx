import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

// Point cloud visualization
function DataParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  
  const particleCount = 600;
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for(let i=0; i<particleCount; i++) {
      pos[i*3] = (Math.random() - 0.5) * 9.5; // X
      pos[i*3+1] = Math.random() * 4 + 0.2; // Y (hover)
      pos[i*3+2] = (Math.random() - 0.5) * 9.5; // Z
    }
    return pos;
  }, [particleCount]);

  useFrame((state) => {
    if(pointsRef.current) {
      // Gentle swirl
      pointsRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.2;
      pointsRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial 
        size={0.04} 
        color="#64ffda" 
        transparent 
        opacity={0.4} 
        sizeAttenuation={true} 
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function TerrainTile() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const noise2D = useMemo(() => createNoise2D(), []);
  const width = 10;
  const height = 10;
  const segments = 128; 

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, height, segments, segments);
    geo.rotateX(-Math.PI / 2); 
    
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      
      const base = noise2D(x * 0.15, z * 0.15) * 1.5;
      const detail = noise2D(x * 0.4, z * 0.4) * 0.4;
      const ridge = Math.abs(noise2D(x * 0.2 + 5, z * 0.2 + 5)) * 1.5;
      
      let elevation = base + detail - ridge + 1.2;
      
      const distToCorner = Math.sqrt(Math.pow(x - 5, 2) + Math.pow(z - 5, 2));
      const waterMask = 1.0 - Math.min(1.0, Math.max(0.0, distToCorner / 6.0));
      elevation = elevation * (1.0 - waterMask) - 0.2 * waterMask;

      const edgeFalloff = Math.max(0, 1 - Math.pow(Math.max(Math.abs(x) / (width / 2), Math.abs(z) / (height / 2)), 8));
      
      pos.setY(i, Math.max(0, elevation * edgeFalloff));
    }
    
    geo.computeVertexNormals();
    return geo;
  }, [noise2D, width, height, segments]);

  const scanMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const baseBlockMaterialRef = useRef<THREE.ShaderMaterial>(null);
  
  useFrame((state) => {
    if (scanMaterialRef.current) {
      scanMaterialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
    if (baseBlockMaterialRef.current) {
      baseBlockMaterialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  const customShader = useMemo(() => ({
    uniforms: {
      uScanColor: { value: new THREE.Color('#64ffda') },
      uTime: { value: 0.0 }
    },
    vertexShader: `
      varying vec3 vPosition;
      varying vec3 vNormal;
      void main() {
        vPosition = position;
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uScanColor;
      uniform float uTime;
      
      varying vec3 vPosition;
      varying vec3 vNormal;
      
      void main() {
        // Biome colors
        vec3 waterColor = vec3(0.05, 0.2, 0.3); 
        vec3 forestColor = vec3(0.1, 0.2, 0.1); 
        vec3 rockColor = vec3(0.3, 0.28, 0.25); 
        vec3 snowColor = vec3(0.8, 0.85, 0.9); 
        
        vec3 landColor = mix(forestColor, rockColor, smoothstep(0.2, 1.2, vPosition.y));
        landColor = mix(landColor, snowColor, smoothstep(1.5, 2.2, vPosition.y));
        vec3 solidBaseColor = mix(waterColor, landColor, smoothstep(-0.01, 0.05, vPosition.y));
        
        vec3 lightDir = normalize(vec3(1.0, 1.5, 1.0));
        float diff = max(0.0, dot(vNormal, lightDir)) * 0.7 + 0.3;
        
        // Grid lines (hologram base)
        float gridThickness = 0.04;
        float gridX = step(1.0 - gridThickness, fract(vPosition.x * 2.0));
        float gridZ = step(1.0 - gridThickness, fract(vPosition.z * 2.0));
        float isGrid = max(gridX, gridZ);
        
        // Contour lines
        float contourVal = fract(vPosition.y * 4.0);
        float isContour = smoothstep(0.95, 1.0, contourVal) + smoothstep(0.05, 0.0, contourVal);
        float contourMask = smoothstep(-0.05, 0.05, vPosition.y); 
        
        // Materialization Logic
        float distFromCenter = length(vPosition.xz);
        
        // Wave loops every 10 seconds
        float wavePhase = fract(uTime * 0.1); 
        float waveRadius = wavePhase * 15.0; 
        
        float isSolid = 1.0 - smoothstep(waveRadius - 2.0, waveRadius, distFromCenter);
        // Fade wave in/out for seamless loop
        isSolid *= smoothstep(0.0, 0.1, wavePhase); 
        isSolid *= 1.0 - smoothstep(0.9, 1.0, wavePhase); 
        
        float scanIntensity = smoothstep(1.5, 0.0, abs(distFromCenter - waveRadius)) * isSolid;
        
        vec3 hologramColor = uScanColor * (isGrid * 0.5 + isContour * contourMask * 0.8) * 0.5;
        vec3 solidColor = solidBaseColor * diff;
        
        vec3 finalColor = mix(hologramColor, solidColor, isSolid);
        finalColor += uScanColor * scanIntensity * 1.5;
        
        float alpha = mix(0.4 + (isGrid * 0.3) + (isContour * 0.3), 1.0, isSolid);
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `
  }), []);

  const baseBlockShader = useMemo(() => ({
    uniforms: {
      uScanColor: { value: new THREE.Color('#64ffda') },
      uTime: { value: 0.0 }
    },
    vertexShader: `
      varying vec3 vPosition;
      varying vec3 vNormal;
      void main() {
        vPosition = position;
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uScanColor;
      
      varying vec3 vPosition;
      varying vec3 vNormal;
      
      void main() {
        float h = vPosition.y + 0.5; 
        
        vec3 colorTop = vec3(0.15, 0.1, 0.05); 
        vec3 colorMid = vec3(0.1, 0.08, 0.06); 
        vec3 colorBot = vec3(0.04, 0.04, 0.05); 
        
        vec3 color = mix(colorBot, colorMid, smoothstep(0.0, 0.4, h));
        color = mix(color, colorTop, smoothstep(0.7, 1.0, h));
        
        float strata = fract(h * 15.0 + sin(vPosition.x * 5.0 + vPosition.z * 5.0) * 0.1);
        color *= (0.85 + 0.15 * strata);
        
        float diff = max(0.0, dot(vNormal, normalize(vec3(1.0, 1.5, 1.0)))) * 0.8 + 0.2;
        vec3 solidColor = color * diff;

        // Sync materialization with the surface
        float distFromCenter = length(vPosition.xz);
        float wavePhase = fract(uTime * 0.1); 
        float waveRadius = wavePhase * 15.0; 
        float isSolid = 1.0 - smoothstep(waveRadius - 2.0, waveRadius, distFromCenter);
        isSolid *= smoothstep(0.0, 0.1, wavePhase); 
        isSolid *= 1.0 - smoothstep(0.9, 1.0, wavePhase); 
        
        // Hologram wireframe for sides
        float gridY = step(0.95, fract(h * 10.0));
        vec3 hologramColor = uScanColor * gridY * 0.3;

        vec3 finalColor = mix(hologramColor, solidColor, isSolid);
        float alpha = mix(0.1 + (gridY * 0.2), 1.0, isSolid);

        gl_FragColor = vec4(finalColor, alpha);
      }
    `
  }), []);

  return (
    <group>
      <DataParticles />
      
      {/* Top surface */}
      <mesh ref={meshRef} geometry={geometry}>
        <shaderMaterial 
          ref={scanMaterialRef}
          args={[customShader]} 
          transparent={true}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Base block (thickness/strata) */}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[width, 1, height]} />
        <shaderMaterial 
          ref={baseBlockMaterialRef}
          args={[baseBlockShader]} 
          transparent={true}
        />
      </mesh>
      
      {/* Edge glow / outline */}
      <mesh position={[0, -0.01, 0]}>
        <boxGeometry args={[width + 0.05, 0.98, height + 0.05]} />
        <meshBasicMaterial color="#64ffda" wireframe={true} transparent opacity={0.05} />
      </mesh>
    </group>
  );
}
