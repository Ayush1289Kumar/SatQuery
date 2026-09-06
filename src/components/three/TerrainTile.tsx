import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export default function TerrainTile() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Create noise function
  const noise2D = useMemo(() => createNoise2D(), []);

  // Geometry dimensions
  const width = 10;
  const height = 10;
  const segments = 128; // higher res for better mountains

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, height, segments, segments);
    geo.rotateX(-Math.PI / 2); // Lay flat
    
    // Apply noise displacement
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      
      // Complex noise for mountains and valleys
      // Math.abs creates sharp ridges when subtracted
      const base = noise2D(x * 0.15, z * 0.15) * 1.5;
      const detail = noise2D(x * 0.4, z * 0.4) * 0.4;
      const ridge = Math.abs(noise2D(x * 0.2 + 5, z * 0.2 + 5)) * 1.5;
      
      let elevation = base + detail - ridge + 1.2;
      
      // Force a water area (ocean/river) on the bottom right side (x > 1, z > 1)
      const distToCorner = Math.sqrt(Math.pow(x - 5, 2) + Math.pow(z - 5, 2));
      const waterMask = 1.0 - Math.min(1.0, Math.max(0.0, distToCorner / 6.0));
      elevation = elevation * (1.0 - waterMask) - 0.2 * waterMask;

      // Flatten edges to create a clean cut-out block look
      const edgeFalloff = Math.max(0, 1 - Math.pow(Math.max(Math.abs(x) / (width / 2), Math.abs(z) / (height / 2)), 8));
      
      // Ensure water is completely flat at y=0, land rises up
      pos.setY(i, Math.max(0, elevation * edgeFalloff));
    }
    
    geo.computeVertexNormals();
    return geo;
  }, [noise2D, width, height, segments]);

  // Scanning effect uniforms
  const scanMaterialRef = useRef<THREE.ShaderMaterial>(null);
  
  useFrame((state) => {
    if (scanMaterialRef.current) {
      // Move scan line back and forth diagonally
      const t = state.clock.elapsedTime * 0.4;
      const scanPosX = Math.sin(t) * (width / 1.5);
      const scanPosZ = Math.cos(t * 0.8) * (height / 1.5);
      scanMaterialRef.current.uniforms.uScanPosition.value.set(scanPosX, scanPosZ);
    }
  });

  const customShader = useMemo(() => ({
    uniforms: {
      uScanColor: { value: new THREE.Color('#64ffda') }, // cyan accent
      uScanPosition: { value: new THREE.Vector2(0, 0) },
      uScanWidth: { value: 0.3 }
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
      uniform vec2 uScanPosition;
      uniform float uScanWidth;
      
      varying vec3 vPosition;
      varying vec3 vNormal;
      
      void main() {
        // Base color based on height: distinct zones for water, lowlands, highlands
        vec3 waterColor = vec3(0.12, 0.35, 0.45); // Deep cyan/blue water
        vec3 forestColor = vec3(0.15, 0.28, 0.12); // Deep forest green
        vec3 rockColor = vec3(0.4, 0.38, 0.35); // Rocky/earthy grey-brown
        vec3 snowColor = vec3(0.85, 0.88, 0.9); // Snow peaks
        
        vec3 landColor = mix(forestColor, rockColor, smoothstep(0.2, 1.2, vPosition.y));
        landColor = mix(landColor, snowColor, smoothstep(1.5, 2.2, vPosition.y));
        vec3 baseColor = mix(waterColor, landColor, smoothstep(-0.01, 0.05, vPosition.y));
        
        // Scan line effect (diagonal line based on distance to point)
        // distance to a moving point to create a radial or sweeping scan
        float dist = distance(vPosition.xz, uScanPosition);
        float scanIntensity = smoothstep(uScanWidth, 0.0, abs(dist - 3.0));
        
        // Add subtle grid
        float gridX = mod(vPosition.x, 1.0) < 0.02 ? 0.1 : 0.0;
        float gridZ = mod(vPosition.z, 1.0) < 0.02 ? 0.1 : 0.0;
        
        // Contour lines (topographic effect)
        float contourVal = fract(vPosition.y * 4.0);
        float contour = smoothstep(0.9, 1.0, contourVal) + smoothstep(0.1, 0.0, contourVal);
        float contourMask = smoothstep(-0.05, 0.05, vPosition.y); // Only on land
        vec3 contourColor = vec3(0.6, 0.7, 0.6) * contour * contourMask * 0.1;
        
        // Scan highlights contours heavily
        vec3 scanGlow = (uScanColor * scanIntensity * 0.3) + (uScanColor * contour * scanIntensity * contourMask * 0.8);
        
        // Lighting
        vec3 lightDir = normalize(vec3(1.0, 1.5, 1.0));
        float diff = max(0.0, dot(vNormal, lightDir)) * 0.7 + 0.3; // Soft ambient
        
        vec3 finalColor = (baseColor + vec3(gridX + gridZ) + contourColor) * diff + scanGlow;
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `
  }), []);

  // Geological strata shader for the side walls
  const baseBlockShader = useMemo(() => ({
    uniforms: {},
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
      varying vec3 vPosition;
      varying vec3 vNormal;
      
      void main() {
        // vPosition.y goes from -0.5 to 0.5 for a box of height 1
        float h = vPosition.y + 0.5; // 0 to 1
        
        vec3 colorTop = vec3(0.2, 0.15, 0.1); // Soil brown
        vec3 colorMid = vec3(0.12, 0.1, 0.08); // Dark rock
        vec3 colorBot = vec3(0.05, 0.05, 0.06); // Deep bedrock
        
        vec3 color = mix(colorBot, colorMid, smoothstep(0.0, 0.4, h));
        color = mix(color, colorTop, smoothstep(0.7, 1.0, h));
        
        // Strata lines (horizontal banding)
        float strata = fract(h * 15.0 + sin(vPosition.x * 5.0 + vPosition.z * 5.0) * 0.1);
        color *= (0.85 + 0.15 * strata);
        
        // Lighting
        float diff = max(0.0, dot(vNormal, normalize(vec3(1.0, 1.5, 1.0)))) * 0.8 + 0.2;
        gl_FragColor = vec4(color * diff, 1.0);
      }
    `
  }), []);

  return (
    <group>
      {/* Top surface */}
      <mesh ref={meshRef} geometry={geometry}>
        <shaderMaterial 
          ref={scanMaterialRef}
          args={[customShader]} 
          wireframe={false}
        />
      </mesh>
      
      {/* Base block (thickness/strata) */}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[width, 1, height]} />
        <shaderMaterial args={[baseBlockShader]} />
      </mesh>
      
      {/* Edge glow / outline */}
      <mesh position={[0, -0.01, 0]}>
        <boxGeometry args={[width + 0.05, 0.98, height + 0.05]} />
        <meshBasicMaterial color="#2d4c54" wireframe={true} transparent opacity={0.15} />
      </mesh>
    </group>
  );
}
