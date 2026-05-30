import { Suspense, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, PresentationControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

/* ─── 3-D Model ─────────────────────────────────────────── */
function Model({ gender }) {
  const url = gender === 'female' ? '/female.glb' : '/male.glb';
  const { scene, animations } = useGLTF(url);
  const mixer = useRef(null);
  const groupRef = useRef(null);

  // Synchronously clone, center and calculate scale of model
  const { clonedScene, scale } = useMemo(() => {
    const clone = scene.clone(true);
    
    // Enable shadows on meshes
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Compute bounding box
    const box = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Center model geometry so center is at (0, 0, 0)
    clone.position.set(-center.x, -center.y, -center.z);

    // Scale to standard height (e.g. 1.6 units)
    const desiredHeight = 1.6;
    const s = desiredHeight / (size.y || 1);

    return { clonedScene: clone, scale: s };
  }, [scene]);

  // Set up animation mixer
  useEffect(() => {
    if (animations && animations.length > 0) {
      mixer.current = new THREE.AnimationMixer(clonedScene);
      
      // Look for idle animations first
      const idleClip = 
        animations.find(a => a.name.toLowerCase().includes('idle_neutral')) ||
        animations.find(a => a.name.toLowerCase().includes('idle')) ||
        animations[0];

      const action = mixer.current.clipAction(idleClip);
      action.play();
    }
    return () => {
      if (mixer.current) {
        mixer.current.stopAllAction();
        mixer.current = null;
      }
    };
  }, [clonedScene, animations]);

  // Update animation mixer and add small idle rotation/bobbing
  useFrame((_, delta) => {
    if (mixer.current) {
      mixer.current.update(delta);
    }
    // Subtle idle float/bobbing
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(Date.now() * 0.001) * 0.03;
    }
  });

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      <primitive object={clonedScene} />
    </group>
  );
}

/* ─── Preload both models ─────────────────────────────────── */
useGLTF.preload('/male.glb');
useGLTF.preload('/female.glb');

/* ─── Fallback skeleton ──────────────────────────────────── */
function LoadingPlaceholder() {
  const meshRef = useRef(null);
  useFrame(() => {
    if (meshRef.current) meshRef.current.rotation.y += 0.01;
  });
  return (
    <mesh ref={meshRef}>
      <capsuleGeometry args={[0.3, 1.0, 8, 16]} />
      <meshStandardMaterial color="#f09070" wireframe opacity={0.4} transparent />
    </mesh>
  );
}

/* ─── Public component ───────────────────────────────────── */
export default function AvatarViewer({ gender = 'male', style = {} }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '20px',
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      {/* subtle gradient overlay at top/bottom so it blends into bg */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, rgba(253,240,234,0.55) 0%, transparent 18%, transparent 82%, rgba(249,226,213,0.7) 100%)',
        borderRadius: 'inherit',
      }} />

      <Canvas
        shadows
        camera={{ position: [0, 0, 2.4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[3, 6, 3]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-3, 2, -2]} intensity={0.4} color="#ffcdb2" />
        <pointLight position={[0, 3, 1]} intensity={0.6} color="#ff8c6b" />

        {/* Soft environment reflections */}
        <Environment preset="city" />

        {/* Allow drag-to-rotate but restrict axis */}
        <PresentationControls
          global
          snap
          rotation={[0, 0, 0]}
          polar={[-0.1, 0.1]}
          azimuth={[-Math.PI / 4, Math.PI / 4]}
          config={{ mass: 1, tension: 170, friction: 26 }}
        >
          <Suspense fallback={<LoadingPlaceholder />}>
            <Model gender={gender} />
          </Suspense>
        </PresentationControls>

        {/* Floor shadow-catcher */}
        {/* Since the model is scaled to 1.6 height and centered at (0,0,0), its bottom is at y = -0.8 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]} receiveShadow>
          <planeGeometry args={[6, 6]} />
          <shadowMaterial opacity={0.12} />
        </mesh>
      </Canvas>

      {/* Gender badge */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 3, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)',
        borderRadius: '999px', padding: '5px 16px', fontSize: '0.78rem', fontWeight: 700,
        color: gender === 'female' ? '#c0396e' : '#1e6fb5',
        border: '1px solid rgba(255,255,255,0.9)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {gender === 'female' ? '♀' : '♂'}
        {gender === 'female' ? 'Female Avatar' : 'Male Avatar'}
      </div>
    </div>
  );
}
