import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

const ExplosionMaterial = shaderMaterial(
  {
    uProgress: 0,
    uTexture: new THREE.Texture(),
    uResolution: new THREE.Vector2(1920, 1080),
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
    precision mediump float;

    uniform float uProgress;
    uniform sampler2D uTexture;
    uniform vec2 uResolution;
    varying vec2 vUv;

    // Simple pseudo-random function
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    // 2D Noise based on Morgan McGuire @morgan3d
    float noise(in vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);

        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));

        vec2 u = f * f * (3.0 - 2.0 * f);

        return mix(a, b, u.x) +
                (c - a)* u.y * (1.0 - u.x) +
                (d - b) * u.x * u.y;
    }

    // Sobel filter for edge detection
    float sobel(sampler2D tex, vec2 uv, vec2 res) {
        float w = 1.0 / res.x;
        float h = 1.0 / res.y;

        // Sample offsets
        vec2 o00 = vec2(-w, -h);
        vec2 o10 = vec2(0.0, -h);
        vec2 o20 = vec2(w, -h);
        vec2 o01 = vec2(-w, 0.0);
        vec2 o21 = vec2(w, 0.0);
        vec2 o02 = vec2(-w, h);
        vec2 o12 = vec2(0.0, h);
        vec2 o22 = vec2(w, h);

        // Sample luminance values
        float l00 = dot(texture2D(tex, uv + o00).rgb, vec3(0.299, 0.587, 0.114));
        float l10 = dot(texture2D(tex, uv + o10).rgb, vec3(0.299, 0.587, 0.114));
        float l20 = dot(texture2D(tex, uv + o20).rgb, vec3(0.299, 0.587, 0.114));
        float l01 = dot(texture2D(tex, uv + o01).rgb, vec3(0.299, 0.587, 0.114));
        float l21 = dot(texture2D(tex, uv + o21).rgb, vec3(0.299, 0.587, 0.114));
        float l02 = dot(texture2D(tex, uv + o02).rgb, vec3(0.299, 0.587, 0.114));
        float l12 = dot(texture2D(tex, uv + o12).rgb, vec3(0.299, 0.587, 0.114));
        float l22 = dot(texture2D(tex, uv + o22).rgb, vec3(0.299, 0.587, 0.114));

        // Apply Sobel kernels (unrolled — avoids loop overhead on mobile GPUs)
        float valueX = -l00 + l20 - 2.0 * l01 + 2.0 * l21 - l02 + l22;
        float valueY = -l00 - 2.0 * l10 - l20 + l02 + 2.0 * l12 + l22;

        return sqrt(valueX * valueX + valueY * valueY);
    }

    // Zoom blur / Radial blur
    vec3 radialBlur(sampler2D tex, vec2 uv, vec2 center, float strength) {
        vec2 dir = center - uv;
        vec3 color = vec3(0.0);
        float total = 0.0;
        // Keep iteration count relatively low for performance
        for (float i = 0.0; i < 8.0; i++) {
            float f = i / 8.0;
            float weight = 1.0 - f;
            color += texture2D(tex, uv + dir * f * strength).rgb * weight;
            total += weight;
        }
        return color / total;
    }

    void main() {
        vec2 uv = vUv;
        vec2 center = vec2(0.5, 0.5);
        float distToCenter = distance(uv, center);

        // Pre-compute direction from center (used multiple times below)
        vec2 dirFromCenter = normalize(uv - center);

        // 1. Distort UVs (Shockwave ripple)
        float shockwave = sin(distToCenter * 15.0 - uProgress * 20.0) * smoothstep(0.8, 0.0, abs(distToCenter - (uProgress * 1.5)));
        vec2 distortedUV = uv + dirFromCenter * shockwave * uProgress * 0.1;
        
        // 2. Pixelation that ramps up
        float minGridSize = 30.0; 
        float currentGridSize = mix(uResolution.x, minGridSize, smoothstep(0.1, 0.8, uProgress));
        currentGridSize = max(currentGridSize, 1.0); 
        vec2 pixelatedUV = floor(distortedUV * currentGridSize) / currentGridSize;
        
        // Blend normal and pixelated UV
        vec2 finalUV = mix(distortedUV, pixelatedUV, smoothstep(0.0, 0.3, uProgress));

        // 3. Chromatic Aberration & Radial Blur
        float aberrationAmount = uProgress * 0.05 * distToCenter;
        float blurStrength = uProgress * 0.15;
        
        // Pre-compute the aberration offset direction (reuses dirFromCenter computed above)
        vec2 aberrationDir = normalize(finalUV - center);

        vec3 baseColor;
        baseColor.r = radialBlur(uTexture, finalUV + aberrationDir * aberrationAmount, center, blurStrength).r;
        baseColor.g = radialBlur(uTexture, finalUV, center, blurStrength).g;
        baseColor.b = radialBlur(uTexture, finalUV - aberrationDir * aberrationAmount, center, blurStrength).b;

        // 4. Enhanced Sobel Edges (Glowing fiery outlines)
        float edge = sobel(uTexture, finalUV, uResolution);
        vec3 fireGradient = mix(vec3(1.0, 0.2, 0.0), vec3(1.0, 0.8, 0.2), edge);
        vec3 edgeColor = fireGradient * edge * smoothstep(0.0, 0.6, uProgress) * 3.0;

        // 5. High Energy Core (Radial Burst)
        float coreRadius = smoothstep(0.2, 1.0, uProgress) * 1.2;
        float coreGlow = 1.0 - smoothstep(coreRadius - 0.4, coreRadius + 0.2, distToCenter);
        float halo = smoothstep(coreRadius + 0.1, coreRadius, distToCenter) * smoothstep(coreRadius - 0.1, coreRadius, distToCenter);
        
        vec3 coreColor = vec3(1.0, 0.9, 0.8) * pow(coreGlow, 2.0) * uProgress * 4.0;
        vec3 haloColor = vec3(1.0, 0.3, 0.0) * halo * uProgress * 3.0;

        // 6. Dynamic Embers / Sparkles
        vec2 noiseUV = pixelatedUV * 5.0 - dirFromCenter * (uProgress * 2.0);
        float n = noise(noiseUV * 10.0);
        float sparks = pow(smoothstep(0.7, 1.0, n), 3.0) * (edge + coreGlow);
        vec3 sparkColor = vec3(1.0, 0.7, 0.3) * sparks * smoothstep(0.2, 0.9, uProgress) * 5.0;

        // 7. Blend everything
        vec3 finalOutput = baseColor;
        finalOutput += edgeColor;      
        finalOutput += coreColor;      
        finalOutput += haloColor;      
        finalOutput += sparkColor;     
        
        // Burn out to pure white right at the end
        finalOutput = mix(finalOutput, vec3(1.0), smoothstep(0.9, 1.0, uProgress));

        gl_FragColor = vec4(finalOutput, 1.0);
    }
  `
);

// Mark as opaque — avoids unnecessary alpha blend pass
ExplosionMaterial.transparent = false;

// Register it so it can be used as <explosionMaterial /> in R3F
extend({ ExplosionMaterial });

export { ExplosionMaterial };
