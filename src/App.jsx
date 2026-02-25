import React, { useRef, useEffect, useState, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, useGLTF } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three'; 

// --- 1. MODELLER ---
function CarModel() {
  const { scene } = useGLTF('/araba2.glb');
  return <primitive object={scene} scale={[1, 1, 1]} rotation={[0, (-90 * Math.PI) / 180, 0]} position={[0, 0, 0]} />;
}

function ObstacleModel() {
  const { scene } = useGLTF('/engel.glb');
  return <primitive object={scene.clone()} scale={[1, 1, 1]} position={[0, 0, 0]} />;
}

// --- 2. TOZ/DUMAN EFEKTİ ---
function DustTrail({ playerRef, gameStarted, gameOver }) {
  const particles = useMemo(() => Array.from({ length: 30 }).map(() => React.createRef()), []);
  const spawnIndex = useRef(0);
  const frameCount = useRef(0);

  const dustMaterial = useMemo(() => new THREE.MeshBasicMaterial({ 
    color: '#888888', 
    transparent: true, 
    opacity: 0.4 
  }), []);

  useFrame((state, delta) => {
    if (!playerRef.current || !gameStarted || gameOver) return;
    const carPos = playerRef.current.translation();

    if (frameCount.current % 3 === 0) {
      const i = spawnIndex.current;
      const particle = particles[i].current;
      
      if (particle) {
        particle.position.set(carPos.x + (Math.random() - 0.5) * 0.5, carPos.y + 0.2, carPos.z + 1.5);
        particle.scale.set(1, 1, 1);
        particle.visible = true;
      }
      spawnIndex.current = (spawnIndex.current + 1) % particles.length;
    }
    frameCount.current++;

    particles.forEach((ref) => {
      const particle = ref.current;
      if (!particle || !particle.visible) return;
      particle.scale.multiplyScalar(0.95);
      particle.position.y += delta * 0.5;
      if (particle.scale.x < 0.1) particle.visible = false;
    });
  });

  return (
    <group>
      {particles.map((ref, i) => (
        <mesh key={i} ref={ref} material={dustMaterial} visible={false}>
          <sphereGeometry args={[0.25, 8, 8]} />
        </mesh>
      ))}
    </group>
  );
}

// --- 3. OYUNCU BİLEŞENİ ---
 
function Player({ gameOver, setGameOver, scoreRef, bodyRef, gameStarted, currentScoreRef }) {
  useEffect(() => {
    const moveLeft = () => {
      if (!gameStarted || gameOver || !bodyRef.current) return;
      const pos = bodyRef.current.translation();
      if (pos.x > -2) bodyRef.current.setTranslation({ x: pos.x - 2, y: pos.y, z: pos.z }, true);
    };

    const moveRight = () => {
      if (!gameStarted || gameOver || !bodyRef.current) return;
      const pos = bodyRef.current.translation();
      if (pos.x < 2) bodyRef.current.setTranslation({ x: pos.x + 2, y: pos.y, z: pos.z }, true);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') moveLeft();
      if (e.key === 'ArrowRight') moveRight();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('moveLeft', moveLeft);
    window.addEventListener('moveRight', moveRight);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('moveLeft', moveLeft);
      window.removeEventListener('moveRight', moveRight);
    };
  }, [gameOver, gameStarted, bodyRef]); 

  useFrame((state) => {
    if (!bodyRef.current) return;
    
    if (!gameStarted || gameOver) {
      bodyRef.current.setLinvel({ x: 0, y: bodyRef.current.linvel().y, z: 0 }, true);
      return; 
    }

    const pos = bodyRef.current.translation();
    const currentScore = Math.floor(Math.abs(pos.z));
    
    // SKORU METİNDEN DEĞİL, DOĞRUDAN DEĞİŞKENDEN KAYDEDİYORUZ
    currentScoreRef.current = currentScore; 
    
    const speed = 15 + (currentScore / 500);

    const vel = bodyRef.current.linvel();
    bodyRef.current.setLinvel({ x: vel.x, y: vel.y, z: -speed }, true);

    state.camera.position.set(pos.x, pos.y + 5, pos.z + 10);
    state.camera.lookAt(pos.x, pos.y, pos.z);

    if (scoreRef.current) {
      scoreRef.current.innerText = `Skor: ${currentScore}`;
    }
  });

  return (
    <RigidBody 
      ref={bodyRef} position={[0, 5, 0]} colliders={false} type="dynamic" lockRotations
      onCollisionEnter={({ other }) => {
        if (other.rigidBodyObject.name === "obstacle") setGameOver(true);
      }}
    >
      <CuboidCollider args={[0.6, 0.4, 1.2]} position={[0, 0.4, 0]} />
      <CarModel />
    </RigidBody>
  );
}

// --- 4. SONSUZ YOL ---
function Ground({ playerRef }) {
  const g1 = useRef();
  const g2 = useRef();

  useFrame(() => {
    if (!playerRef.current || !g1.current || !g2.current) return;
    const pZ = playerRef.current.translation().z;

    [g1, g2].forEach((gRef) => {
      const gZ = gRef.current.translation().z;
      if (pZ < gZ - 500) {
        gRef.current.setTranslation({ x: 0, y: -1, z: gZ - 2000 }, true);
      }
    });
  });

  return (
    <>
      <RigidBody ref={g1} type="fixed" position={[0, -1, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[10, 1, 1000]} />
          <meshStandardMaterial color="#2c3e50" />
        </mesh>
      </RigidBody>
      <RigidBody ref={g2} type="fixed" position={[0, -1, -1000]}>
        <mesh receiveShadow>
          <boxGeometry args={[10, 1, 1000]} />
          <meshStandardMaterial color="#2c3e50" />
        </mesh>
      </RigidBody>
    </>
  );
}

// --- 5. SONSUZ ENGELLER ---
function Obstacles({ playerRef }) {
  const obsRefs = useRef([]);
  const count = 40;
  const spacing = 30;

  const initialPositions = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const z = -(i + 2) * spacing;
      const x = [-2, 0, 2][Math.floor(Math.random() * 3)];
      return { x, z };
    });
  }, []);

  useFrame(() => {
    if (!playerRef.current) return;
    const pZ = playerRef.current.translation().z;

    obsRefs.current.forEach((obs) => {
      if (!obs) return;
      const obsZ = obs.translation().z;

      if (obsZ > pZ + 20) {
        const newZ = obsZ - (count * spacing);
        const newX = [-2, 0, 2][Math.floor(Math.random() * 3)];
        obs.setTranslation({ x: newX, y: 0.5, z: newZ }, true);
      }
    });
  });

  return (
    <>
      {initialPositions.map((pos, i) => (
        <RigidBody
          key={i} ref={(el) => (obsRefs.current[i] = el)} position={[pos.x, 0.5, pos.z]} type="fixed" colliders={false} name="obstacle"
        >
          <CuboidCollider args={[1, 0.6, 0.3]} position={[0, 0.4, 0]} />
          <ObstacleModel />
        </RigidBody>
      ))}
    </>
  );
}

// --- 6. OYUN SAHNESİ ---
function GameScene({ gameOver, setGameOver, scoreRef, gameStarted, currentScoreRef }) {
  const playerRef = useRef();
  return (
    <>
      <Player gameOver={gameOver} setGameOver={setGameOver} scoreRef={scoreRef} bodyRef={playerRef} gameStarted={gameStarted} currentScoreRef={currentScoreRef} />
      <Ground playerRef={playerRef} />
      <Obstacles playerRef={playerRef} />
      <DustTrail playerRef={playerRef} gameStarted={gameStarted} gameOver={gameOver} />
    </>
  );
}

// --- 7. ANA UYGULAMA ---
export default function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  
 
  const currentScoreRef = useRef(0); 
  const scoreRef = useRef(); 
  
  // Rekoru çekerken güvenli olması için parseInt ekledik
  const [highScore, setHighScore] = useState(parseInt(localStorage.getItem('rekor')) || 0);

  const engineAudio = useRef(typeof Audio !== "undefined" ? new Audio('/motor.mp3') : null);
  const crashAudio = useRef(typeof Audio !== "undefined" ? new Audio('/carpisma.mp3') : null);

  useEffect(() => {
    if (!gameStarted) return; 

    if (gameOver) {
   
      const finalScore = currentScoreRef.current;
      
      if (finalScore > highScore) {
        setHighScore(finalScore);
        localStorage.setItem('rekor', finalScore);  
      }
      
      if (engineAudio.current && crashAudio.current) {
        engineAudio.current.pause();
        crashAudio.current.currentTime = 0;
        crashAudio.current.play();
      }
    } else {
      if (engineAudio.current) {
        engineAudio.current.loop = true;
        engineAudio.current.volume = 0.3;
        engineAudio.current.play().catch(e => console.log("Ses için tıklayın"));
      }
    }
    return () => {
      if (engineAudio.current) engineAudio.current.pause();
    }
  }, [gameOver, highScore, gameStarted]);

  const restartGame = () => window.location.reload();

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', userSelect: 'none', WebkitUserSelect: 'none' }}>
      
      {gameStarted && !gameOver && (
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 5, color: 'white', fontFamily: 'Arial' }}>
          <div ref={scoreRef} style={{ fontSize: '2rem', fontWeight: 'bold', textShadow: '2px 2px 4px #000' }}>Skor: 0</div>
          <div style={{ fontSize: '1.2rem', opacity: 0.8 }}>En Yüksek: {highScore}</div>
        </div>
      )}

      {gameStarted && !gameOver && (
        <div style={{ 
          position: 'absolute', bottom: 30, left: 0, width: '100%', 
          display: 'flex', justifyContent: 'space-between', padding: '0 30px', 
          boxSizing: 'border-box', zIndex: 10, pointerEvents: 'none' 
        }}>
          <button 
            onPointerDown={(e) => { e.preventDefault(); window.dispatchEvent(new Event('moveLeft')); }}
            style={{ 
              width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.2)', 
              border: '3px solid rgba(255,255,255,0.5)', color: 'white', fontSize: '2.5rem', 
              backdropFilter: 'blur(5px)', pointerEvents: 'auto', touchAction: 'none'
            }}
          >
            &#10094;
          </button>
          <button 
            onPointerDown={(e) => { e.preventDefault(); window.dispatchEvent(new Event('moveRight')); }}
            style={{ 
              width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.2)', 
              border: '3px solid rgba(255,255,255,0.5)', color: 'white', fontSize: '2.5rem', 
              backdropFilter: 'blur(5px)', pointerEvents: 'auto', touchAction: 'none'
            }}
          >
            &#10095;
          </button>
        </div>
      )}

      {!gameStarted && !gameOver && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white', fontFamily: 'Arial', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(2.5rem, 10vw, 5rem)', margin: '0 0 10px 0', textShadow: '4px 4px 0px #e74c3c' }}>HUMVEE RUSH</h1>
          <p style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)', marginBottom: '30px', backgroundColor: 'rgba(0,0,0,0.5)', padding: '10px 20px', borderRadius: '10px' }}>
            Bilgisayarda sağ/sol tuşu, Telefonda butonlar!
          </p>
          <button 
            onClick={() => setGameStarted(true)} 
            style={{ padding: '15px 40px', fontSize: 'clamp(1.2rem, 5vw, 2rem)', cursor: 'pointer', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold', boxShadow: '0 6px 0 #27ae60' }}
          >
            OYUNA BAŞLA
          </button>
        </div>
      )}

      {gameOver && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'white', fontFamily: 'Arial' }}>
          <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', marginBottom: '10px' }}>KAZA YAPTIN!</h1>
          <p style={{ fontSize: '2rem', marginBottom: '30px' }}>Skorun: {currentScoreRef.current}</p>
          <button onClick={restartGame} style={{ padding: '15px 40px', fontSize: '1.5rem', cursor: 'pointer', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '50px', fontWeight: 'bold' }}>Tekrar Dene</button>
        </div>
      )}

      <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
        <color attach="background" args={['#87ceeb']} />
        <fog attach="fog" args={['#87ceeb', 30, 150]} />
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.5} />
        <directionalLight castShadow position={[10, 10, 10]} intensity={1.5} shadow-mapSize={[1024, 1024]} />
        
        <Suspense fallback={null}>
          <Physics>
            <GameScene gameOver={gameOver} setGameOver={setGameOver} scoreRef={scoreRef} gameStarted={gameStarted} currentScoreRef={currentScoreRef} />
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  );
}