import React, { useRef } from 'react';
import { useFrame, extend, useThree } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Define the shader material
const SwirlMaterial = shaderMaterial(
  {
    uTime: 0,
    uScale: 1.0,
    uRoughness: 0.5,
    uResolution: new THREE.Vector2(1, 1),
    uColorPrimary: new THREE.Color("#2F4F4F"), // Dark Slate Blue
    uColorSecondary: new THREE.Color("#E0F7FA"), // Light Cyan/White
    uIntensity: 1.0,
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform float uTime;
    uniform float uScale;
    uniform float uRoughness;
    uniform vec2 uResolution;
    uniform vec3 uColorPrimary;
    uniform vec3 uColorSecondary;
    uniform float uIntensity;

    varying vec2 vUv;

    // Simplex Noise 2D functions
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
               -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    // FBM (Fractal Brownian Motion)
    float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 0.0;
        // Increase loop for more detail, modulated by roughness
        for (int i = 0; i < 5; i++) {
            value += amplitude * snoise(st);
            st *= 2.0 + (uRoughness * 0.5); // Roughness impacts frequency jump
            amplitude *= 0.5;
        }
        return value;
    }

    void main() {
        // Correct aspect ratio
        vec2 st = vUv * uScale;
        st.x *= uResolution.x / uResolution.y;

        // Domain Warping for the "Swirl" effect
        vec2 q = vec2(0.);
        q.x = fbm( st + 0.00 * uTime);
        q.y = fbm( st + vec2(1.0));

        vec2 r = vec2(0.);
        r.x = fbm( st + 1.0 * q + vec2(1.7, 9.2) + 0.15 * uTime );
        r.y = fbm( st + 1.0 * q + vec2(8.3, 2.8) + 0.126 * uTime);

        // Calculate flow
        float f = fbm(st + r);

        // Impasto texture simulation (highlighting edges)
        float impasto = smoothstep(0.2, 0.8, f);
        // Add some noise grain for canvas texture
        float grain = snoise(st * 80.0) * 0.05;

        // Mixing colors
        vec3 color = mix(uColorPrimary, uColorSecondary, clamp((f*f)*4.0, 0.0, 1.0));
        
        // Add dynamic tension/contrast based on F
        color = mix(color, vec3(0.0, 0.1, 0.2), clamp(length(q), 0.0, 1.0));
        
        // Add brightness/glow based on interaction intensity
        color += grain;
        color *= uIntensity;

        // "Thick brush" lighting simulation
        // Create a fake normal based on the FBM gradient
        float d = 0.01;
        float fx = fbm(st + vec2(d, 0.0) + r);
        float fy = fbm(st + vec2(0.0, d) + r);
        vec3 normal = normalize(vec3(f - fx, f - fy, d * (2.0 - uRoughness))); 
        vec3 light = normalize(vec3(1.0, 1.0, 1.0));
        float diffuse = max(0.0, dot(normal, light));
        
        color += diffuse * 0.3 * (1.0 + uRoughness); // Highlights pop more with roughness

        gl_FragColor = vec4(color, 1.0);
    }
  `
);

// Register the material with R3F
extend({ SwirlMaterial });

// Add types for the custom material
declare global {
  namespace JSX {
    interface IntrinsicElements {
      swirlMaterial: any;
      [other: string]: any;
    }
  }
}

interface SwirlProps {
  zoom: number;
  rotationSpeed: number;
  roughness: number;
  isInteracting: boolean;
}

export const SwirlShader: React.FC<SwirlProps> = ({ zoom, rotationSpeed, roughness, isInteracting }) => {
  const materialRef = useRef<any>(null);
  const timeRef = useRef(0);
  // Get viewport dimensions from R3F to scale plane correctly
  const { viewport, size } = useThree();

  useFrame((state, delta) => {
    if (materialRef.current) {
      // Accumulate time based on rotation speed
      timeRef.current += delta * rotationSpeed;
      
      materialRef.current.uTime = timeRef.current;
      
      // Smoothly interpolate other values
      materialRef.current.uScale = THREE.MathUtils.lerp(materialRef.current.uScale, zoom, 0.1);
      materialRef.current.uRoughness = THREE.MathUtils.lerp(materialRef.current.uRoughness, roughness, 0.05);
      
      // Glow intensity: 1.2 normally, 1.5 when interacting
      const targetIntensity = isInteracting ? 1.5 : 1.1;
      materialRef.current.uIntensity = THREE.MathUtils.lerp(materialRef.current.uIntensity, targetIntensity, 0.1);

      // Update resolution to match canvas size (handles resize)
      materialRef.current.uResolution.set(size.width, size.height);
    }
  });

  return (
    <mesh>
      {/* Use viewport width/height to fill the camera view */}
      <planeGeometry args={[viewport.width, viewport.height]} />
      <swirlMaterial
        ref={materialRef}
        uResolution={new THREE.Vector2(size.width, size.height)}
        transparent={false}
      />
    </mesh>
  );
};
