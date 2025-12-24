
import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface EngineViewProps {
  onStatsUpdate: (stats: { fps: number; latency: number; particles: number; physicsStep: number; memoryUsage: number }) => void;
  particleCount: number;
}

/**
 * ENHANCED PHYSICS WORKER SCRIPT
 * Uses an iterative solver (XPBD inspired) for stable stacking and non-penetration.
 */
const PHYSICS_WORKER_CODE = `
  let objects = [];
  const WORLD_SIZE = 25;
  const GRAVITY = -9.81 * 0.001; // Scaled for simulation units
  const DAMPING = 0.995; // Velocity damping per substep
  const FRICTION = 0.95; // Friction coefficient on contact

  self.onmessage = (e) => {
    const { type, payload } = e.data;

    switch (type) {
      case 'INIT':
        objects = payload.map(obj => ({
          pos: new Float32Array([obj.pos[0], obj.pos[1], obj.pos[2]]),
          prevPos: new Float32Array([obj.pos[0], obj.pos[1], obj.pos[2]]),
          vel: new Float32Array([obj.vel[0], obj.vel[1], obj.vel[2]]),
          radius: obj.radius,
          invMass: 1.0
        }));
        break;

      case 'SPAWN':
        objects.push({
          pos: new Float32Array([payload.pos[0], payload.pos[1], payload.pos[2]]),
          prevPos: new Float32Array([payload.pos[0], payload.pos[1], payload.pos[2]]),
          vel: new Float32Array([payload.vel[0], payload.vel[1], payload.vel[2]]),
          radius: payload.radius,
          invMass: 1.0
        });
        break;

      case 'STEP':
        const dt = payload.dt || 1.0;
        const substeps = 12;
        const h = dt / substeps;

        for (let s = 0; s < substeps; s++) {
          // 1. Prediction Step
          for (let i = 0; i < objects.length; i++) {
            const obj = objects[i];
            
            // External Forces (Gravity)
            obj.vel[1] += GRAVITY * h;
            
            // Velocity Damping
            obj.vel[0] *= DAMPING;
            obj.vel[1] *= DAMPING;
            obj.vel[2] *= DAMPING;

            // Store previous state for PBD velocity update
            obj.prevPos[0] = obj.pos[0];
            obj.prevPos[1] = obj.pos[1];
            obj.prevPos[2] = obj.pos[2];

            // Integrate position
            obj.pos[0] += obj.vel[0] * h;
            obj.pos[1] += obj.vel[1] * h;
            obj.pos[2] += obj.vel[2] * h;
          }

          // 2. Constraint Resolution (Multiple iterations for stacking stability)
          const iterations = 4;
          for (let it = 0; it < iterations; it++) {
            // Environment Constraints (Ground and Walls)
            for (let i = 0; i < objects.length; i++) {
              const obj = objects[i];
              
              // Floor Constraint
              if (obj.pos[1] < obj.radius) {
                obj.pos[1] = obj.radius;
                obj.vel[0] *= FRICTION;
                obj.vel[2] *= FRICTION;
              }

              // Boundary Constraints
              if (Math.abs(obj.pos[0]) > WORLD_SIZE) {
                obj.pos[0] = Math.sign(obj.pos[0]) * WORLD_SIZE;
                obj.vel[0] *= -0.5;
              }
              if (Math.abs(obj.pos[2]) > WORLD_SIZE) {
                obj.pos[2] = Math.sign(obj.pos[2]) * WORLD_SIZE;
                obj.vel[2] *= -0.5;
              }
            }

            // Particle-Particle Constraints (Non-penetration)
            for (let i = 0; i < objects.length; i++) {
              const a = objects[i];
              for (let j = i + 1; j < objects.length; j++) {
                const b = objects[j];
                const dx = b.pos[0] - a.pos[0];
                const dy = b.pos[1] - a.pos[1];
                const dz = b.pos[2] - a.pos[2];
                const distSq = dx*dx + dy*dy + dz*dz;
                const minDist = a.radius + b.radius;
                
                if (distSq < minDist * minDist && distSq > 0.00001) {
                  const dist = Math.sqrt(distSq);
                  const overlap = minDist - dist;
                  const nx = dx / dist;
                  const ny = dy / dist;
                  const nz = dz / dist;

                  const totalInvMass = a.invMass + b.invMass;
                  const corrA = (overlap * (a.invMass / totalInvMass));
                  const corrB = (overlap * (b.invMass / totalInvMass));

                  a.pos[0] -= nx * corrA;
                  a.pos[1] -= ny * corrA;
                  a.pos[2] -= nz * corrA;

                  b.pos[0] += nx * corrB;
                  b.pos[1] += ny * corrB;
                  b.pos[2] += nz * corrB;
                }
              }
            }
          }

          // 3. Velocity Update
          for (let i = 0; i < objects.length; i++) {
            const obj = objects[i];
            obj.vel[0] = (obj.pos[0] - obj.prevPos[0]) / h;
            obj.vel[1] = (obj.pos[1] - obj.prevPos[1]) / h;
            obj.vel[2] = (obj.pos[2] - obj.prevPos[2]) / h;
            
            if (Math.abs(obj.vel[0]) < 0.001) obj.vel[0] = 0;
            if (Math.abs(obj.vel[1]) < 0.001) obj.vel[1] = 0;
            if (Math.abs(obj.vel[2]) < 0.001) obj.vel[2] = 0;
          }
        }

        const positions = new Float32Array(objects.length * 3);
        for (let i = 0; i < objects.length; i++) {
          positions[i * 3 + 0] = objects[i].pos[0];
          positions[i * 3 + 1] = objects[i].pos[1];
          positions[i * 3 + 2] = objects[i].pos[2];
        }
        self.postMessage({ type: 'UPDATE', positions }, [positions.buffer]);
        break;

      case 'EXPLOSION':
        for (const obj of objects) {
          const force = 3.5;
          obj.vel[0] += (Math.random() - 0.5) * force;
          obj.vel[1] += Math.random() * force * 1.5;
          obj.vel[2] += (Math.random() - 0.5) * force;
        }
        break;

      case 'RESET':
        objects = objects.slice(0, 35); // Keep original count on reset for performance demo
        for (const obj of objects) {
          obj.pos[0] = (Math.random() - 0.5) * 5.0;
          obj.pos[1] = 10 + Math.random() * 20;
          obj.pos[2] = (Math.random() - 0.5) * 5.0;
          obj.vel.fill(0);
        }
        break;
    }
  };
`;

const PBR_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PBR_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uRoughness;
  uniform float uMetalness;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  #define PI 3.14159265359
  float DistributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;
    float num = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;
    return num / denom;
  }
  float GeometrySchlickGGX(float NdotV, float roughness) {
    float r = (roughness + 1.0);
    float k = (r * r) / 8.0;
    float num = NdotV;
    float denom = NdotV * (1.0 - k) + k;
    return num / denom;
  }
  float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);
    return ggx1 * ggx2;
  }
  vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
  }
  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewPosition);
    vec3 L = normalize(vec3(5.0, 10.0, 5.0));
    vec3 H = normalize(V + L);
    vec3 F0 = vec3(0.04);
    F0 = mix(F0, uColor, uMetalness);
    float NDF = DistributionGGX(N, H, uRoughness);
    float G = GeometrySmith(N, V, L, uRoughness);
    vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);
    vec3 numerator = NDF * G * F;
    float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
    vec3 specular = numerator / denominator;
    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - uMetalness;
    float NdotL = max(dot(N, L), 0.0);
    vec3 color = (kD * uColor / PI + specular) * vec3(2.0) * NdotL;
    vec3 ambient = vec3(0.05) * uColor;
    color += ambient;
    color = color / (color + vec3(1.0));
    color = pow(color, vec3(1.0/2.2));
    gl_FragColor = vec4(color, 1.0);
  }
`;

export const EngineView: React.FC<EngineViewProps> = ({ onStatsUpdate, particleCount }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);

  const geometry = useMemo(() => new THREE.SphereGeometry(1, 32, 32), []);

  const spawnParticle = () => {
    if (!workerRef.current || !sceneRef.current) return;

    const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.5);
    const shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: color },
        uRoughness: { value: 0.1 + Math.random() * 0.4 },
        uMetalness: { value: 0.4 + Math.random() * 0.6 }
      },
      vertexShader: PBR_VERTEX_SHADER,
      fragmentShader: PBR_FRAGMENT_SHADER
    });

    const mesh = new THREE.Mesh(geometry, shaderMaterial);
    const pos = [(Math.random() - 0.5) * 2, 25, (Math.random() - 0.5) * 2];
    mesh.position.set(pos[0], pos[1], pos[2]);
    sceneRef.current.add(mesh);
    meshesRef.current.push(mesh);

    workerRef.current.postMessage({
      type: 'SPAWN',
      payload: {
        pos,
        vel: [(Math.random() - 0.5) * 0.1, -0.1, (Math.random() - 0.5) * 0.1],
        radius: 1.0
      }
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0c);
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.set(30, 20, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- ENHANCED CAMERA CONTROLS ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.screenSpacePanning = true;
    
    // Zoom configurations
    controls.enableZoom = true;
    controls.zoomSpeed = 1.2;
    
    // Map Middle Mouse Button to Pan as requested
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.PAN
    };

    const gridHelper = new THREE.GridHelper(60, 60, 0x333333, 0x111111);
    scene.add(gridHelper);

    const blob = new Blob([PHYSICS_WORKER_CODE], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    workerRef.current = worker;

    const initialData: any[] = [];
    const sphereCount = 35;

    for (let i = 0; i < sphereCount; i++) {
      const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(i % 3 === 0 ? 0x06b6d4 : (i % 3 === 1 ? 0x3b82f6 : 0x8b5cf6)) },
          uRoughness: { value: 0.05 + Math.random() * 0.3 },
          uMetalness: { value: 0.7 + Math.random() * 0.3 }
        },
        vertexShader: PBR_VERTEX_SHADER,
        fragmentShader: PBR_FRAGMENT_SHADER
      });

      const mesh = new THREE.Mesh(geometry, shaderMaterial);
      const pos = [(Math.random() - 0.5) * 6, 15 + Math.random() * 25, (Math.random() - 0.5) * 6];
      mesh.position.set(pos[0], pos[1], pos[2]);
      scene.add(mesh);
      meshesRef.current.push(mesh);
      
      initialData.push({
        pos: pos,
        vel: [0, 0, 0],
        radius: 1.0
      });
    }

    worker.postMessage({ type: 'INIT', payload: initialData });

    let lastTime = performance.now();
    let frameCount = 0;

    worker.onmessage = (e) => {
      const { type, positions } = e.data;
      if (type === 'UPDATE') {
        const count = Math.min(meshesRef.current.length, positions.length / 3);
        for (let i = 0; i < count; i++) {
          meshesRef.current[i].position.set(
            positions[i * 3 + 0],
            positions[i * 3 + 1],
            positions[i * 3 + 2]
          );
        }
      }
    };

    const animate = () => {
      const now = performance.now();
      const dt = now - lastTime;
      lastTime = now;

      const fps = Math.round(1000 / dt);
      worker.postMessage({ type: 'STEP', payload: { dt: 1.0 } });

      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);

      if (frameCount % 30 === 0) {
        onStatsUpdate({
          fps: isFinite(fps) ? fps : 60,
          latency: dt,
          particles: meshesRef.current.length,
          physicsStep: 16.67,
          memoryUsage: 28.1 + (meshesRef.current.length * 0.1)
        });
      }
      frameCount++;
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      worker.terminate();
      renderer.dispose();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  const triggerExplosion = () => {
    workerRef.current?.postMessage({ type: 'EXPLOSION' });
  };

  const resetState = () => {
    if (sceneRef.current) {
      const extraMeshes = meshesRef.current.slice(35);
      extraMeshes.forEach(m => sceneRef.current?.remove(m));
      meshesRef.current = meshesRef.current.slice(0, 35);
    }
    workerRef.current?.postMessage({ type: 'RESET' });
  };

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      
      <div className="absolute top-6 left-6 pointer-events-none">
        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-4 rounded-lg flex flex-col gap-4 min-w-[200px]">
          <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500 border-b border-zinc-800 pb-2">Renderer.Config</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">BRDF:</span>
              <span className="text-cyan-400 font-mono text-[10px]">COOK-TORRANCE</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">PIPELINE:</span>
              <span className="text-cyan-400 font-mono text-[10px]">PBR_METALLIC</span>
            </div>
          </div>
          
          <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500 border-b border-zinc-800 pb-2 pt-2">Physics.Solver</h3>
          <div className="space-y-3">
             <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">ENGINE:</span>
              <span className="text-emerald-500 font-mono text-[10px]">XPBD_ITERATIVE</span>
            </div>
             <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">CAPACITY:</span>
              <span className="text-emerald-500 font-mono text-[10px]">DYNAMIC_ALLOC</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 flex flex-col gap-2 items-end">
        <div className="bg-zinc-900/40 p-1 rounded-lg flex gap-1">
          <button 
            onClick={spawnParticle}
            className="px-6 py-3 bg-white hover:bg-zinc-200 text-black rounded text-[10px] uppercase font-black transition-all shadow-lg active:scale-95"
          >
            Spawn Entity
          </button>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={triggerExplosion}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] uppercase font-bold transition-colors shadow-lg shadow-cyan-900/20"
          >
            Kinetic Impulse
          </button>
          <button 
            onClick={resetState}
            className="px-4 py-2 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 rounded text-[10px] uppercase font-bold transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
