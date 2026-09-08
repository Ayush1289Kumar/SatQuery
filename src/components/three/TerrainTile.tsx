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
      uScanColor: { value: new THREE.Color('#c1d6cc') },
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
        // Biome colors based on realistic earth tones
        vec3 deepWater = vec3(0.1, 0.25, 0.35);
        vec3 shallowWater = vec3(0.2, 0.45, 0.55);
        vec3 sandColor = vec3(0.7, 0.65, 0.5);
        vec3 forestColor = vec3(0.15, 0.3, 0.15);
        vec3 rockColor = vec3(0.35, 0.3, 0.28);
        vec3 snowColor = vec3(0.9, 0.95, 1.0);
        
        // Elevation mapping
        float h = vPosition.y;
        vec3 color = mix(deepWater, shallowWater, smoothstep(-0.2, 0.0, h));
        color = mix(color, sandColor, smoothstep(0.0, 0.05, h));
        color = mix(color, forestColor, smoothstep(0.05, 0.3, h));
        color = mix(color, rockColor, smoothstep(0.9, 1.5, h));
        color = mix(color, snowColor, smoothstep(1.8, 2.4, h));
        
        // Add subtle noise texture variation (simplified)
        float noise = fract(sin(dot(vPosition.xz, vec2(12.9898, 78.233))) * 43758.5453);
        color *= 0.9 + noise * 0.1;
        
        // Lighting
        vec3 lightDir = normalize(vec3(1.0, 1.5, 1.0));
        float diff = max(0.0, dot(vNormal, lightDir));
        float ambient = 0.3;
        vec3 finalColor = color * (diff * 0.8 + ambient);
        
        // Additive scan effect passing over the terrain
        float distFromCenter = length(vPosition.xz);
        float scanPhase = fract(uTime * 0.1); 
        float scanRadius = scanPhase * 15.0; 
        
        // Scanning ring
        float scanIntensity = smoothstep(1.5, 0.0, abs(distFromCenter - scanRadius));
        // Fade out scan at the edges of the cycle
        scanIntensity *= smoothstep(0.0, 0.1, scanPhase) * (1.0 - smoothstep(0.9, 1.0, scanPhase));
        
        // Add glowing hex grid overlay only near the scan line
        float gridX = step(0.95, fract(vPosition.x * 4.0));
        float gridZ = step(0.95, fract(vPosition.z * 4.0));
        float isGrid = max(gridX, gridZ);
        
        finalColor += uScanColor * scanIntensity * (0.2 + isGrid * 0.5);
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `
  }), []);

  const baseBlockShader = useMemo(() => ({
    uniforms: {
      uScanColor: { value: new THREE.Color('#c1d6cc') },
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
        
        // Realistic soil strata colors
        vec3 soilTop = vec3(0.2, 0.16, 0.12); 
        vec3 soilMid = vec3(0.15, 0.12, 0.09); 
        vec3 soilBot = vec3(0.08, 0.06, 0.05); 
        
        vec3 color = mix(soilBot, soilMid, smoothstep(0.0, 0.5, h));
        color = mix(color, soilTop, smoothstep(0.7, 1.0, h));
        
        // Procedural strata lines
        float strata = fract(h * 20.0 + sin(vPosition.x * 2.0 + vPosition.z * 2.0) * 0.2);
        color *= (0.8 + 0.2 * smoothstep(0.4, 0.6, strata));
        
        // Lighting
        float diff = max(0.0, dot(vNormal, normalize(vec3(1.0, 1.5, 1.0))));
        vec3 finalColor = color * (diff * 0.6 + 0.4);

        // Scan line interacting with the sides
        float distFromCenter = length(vPosition.xz);
        float scanPhase = fract(uTime * 0.1); 
        float scanRadius = scanPhase * 15.0; 
        float scanIntensity = smoothstep(1.5, 0.0, abs(distFromCenter - scanRadius));
        scanIntensity *= smoothstep(0.0, 0.1, scanPhase) * (1.0 - smoothstep(0.9, 1.0, scanPhase));
        
        float gridY = step(0.95, fract(h * 10.0));
        finalColor += uScanColor * scanIntensity * gridY * 0.5;

        gl_FragColor = vec4(finalColor, 1.0);
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
