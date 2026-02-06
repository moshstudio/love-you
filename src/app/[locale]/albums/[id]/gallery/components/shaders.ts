export const vertexShader = `
  uniform float uTime;
  uniform float uProgress;
  uniform float uParticleOpacity; // Controls particle fade out when image appears
  uniform vec3 uMouse;
  uniform float uPointSize;
  uniform float uPixelRatio; // 用于适配高分屏

  // Attributes provided by geometry
  attribute vec3 aTargetPosition;
  attribute vec3 aInitialPosition;
  attribute vec3 aColor;
  attribute vec3 aTargetColor;
  attribute float aSize;

  varying vec3 vColor;
  varying float vAlpha;

  // --- Noise Functions (Curl Noise) ---
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
    vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y
    i = mod289(i);
    vec4 p = permute( permute( permute( 
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  // Curl Noise logic (calculated from numerical gradient of simplex noise)
  vec3 curlNoise(vec3 p) {
    const float e = 0.1;
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);

    vec3 p_x0 = snoise(p - dx) * vec3(1.0, 1.0, 1.0); // Simplified for visual effect
    vec3 p_x1 = snoise(p + dx) * vec3(1.0, 1.0, 1.0);
    vec3 p_y0 = snoise(p - dy) * vec3(1.0, 1.0, 1.0);
    vec3 p_y1 = snoise(p + dy) * vec3(1.0, 1.0, 1.0);
    vec3 p_z0 = snoise(p - dz) * vec3(1.0, 1.0, 1.0);
    vec3 p_z1 = snoise(p + dz) * vec3(1.0, 1.0, 1.0);

    // This is a pseudo-curl for visual flow, not mathematically strict physics curl
    float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
    float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
    float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;

    return normalize(vec3(x, y, z));
  }

  void main() {
    // 1. Interpolation with ease functions
    float t = uProgress;
    
    // Ease-in-out quint for smoother start/end
    // t = t < 0.5 ? 16.0 * t * t * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 5.0) / 2.0;
    // Cubic ease out for responsiveness
    float easedT = 1.0 - pow(1.0 - t, 3.0);

    // 2. Mix positions
    vec3 currentPos = mix(position, aTargetPosition, easedT);

    // 3. Fluid Effect (Curl Noise)
    // Only apply during transition (sin(t * PI) creates a bell curve peaking at 0.5)
    float transitionIntensity = sin(t * 3.14159);
    float noiseFreq = 0.02;
    float noiseAmp = 30.0;
    
    // Time offset to make noise flow
    vec3 noiseVal = curlNoise(currentPos * noiseFreq + vec3(uTime * 0.2));
    
    // Apply noise offset
    vec3 newPos = currentPos + noiseVal * transitionIntensity * noiseAmp;

    // 4. Explosion/Disperse Effect from center on change
    // Make particles fly out slightly towards camera (Z) during transition
    float zOffset = sin(t * 3.14159) * 20.0 * (sin(position.x * 0.1) + 1.0);
    newPos.z += zOffset;

    // 5. Mouse Repulsion/Interaction (Simple Radial)
    // if mouse is active (assume 0,0,0 is center of screen world space)
    // For now, let's just do a subtle "breathing" or parallax with camera instead of expensive mouse raycast here
    // But we can add subtle wave based on position
    newPos.z += sin(newPos.x * 0.1 + uTime) * 2.0;

    // 6. Calculate Final Position
    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // 7. Point Size Logic
    // Scale by distance (standard attenuation)
    // Scale by original logic (brightness based size)
    // Scale by pixel ratio for density attribute
    gl_PointSize = (aSize * uPointSize * uPixelRatio) * (100.0 / -mvPosition.z);
    
    // Fade out tiny particles to avoid aliasing artifacts
    if (gl_PointSize < 2.0) {
        vAlpha = gl_PointSize / 2.0;
    } else {
        vAlpha = 1.0;
    }

    // 8. Color Mixing
    vColor = mix(aColor, aTargetColor, easedT);
    
    // Enhance brightness during transition (energy burst)
    vColor += vec3(0.2) * transitionIntensity;
  }
`;

export const fragmentShader = `
  uniform float uParticleOpacity;
  
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // 1. Circular Soft Particle
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    
    // Soft edge: use smoothstep
    float delta = fwidth(r);
    float alpha = 1.0 - smoothstep(1.0 - delta, 1.0 + delta, r);

    // Glowy center
    float glow = exp(-r * 2.0);

    // 2. Discard transparent pixels for performance
    if (alpha < 0.01) discard;

    // 3. Final Color
    // Combine base alpha, distance alpha (vAlpha), shape alpha, and global particle opacity
    gl_FragColor = vec4(vColor, vAlpha * alpha * glow * uParticleOpacity);
  }
`;
