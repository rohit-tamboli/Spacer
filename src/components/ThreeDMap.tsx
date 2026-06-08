import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Plot, PlotFilter } from '../types';
import { COORD_ROADS, AMENITIES_DATA } from '../defaultData';
import { Sun, HelpCircle, Image as ImageIcon } from 'lucide-react';
import { getPlotVertices } from './TwoDMap';
import PlotStatusFilter from './PlotStatusFilter';
import ImageGalleryModal from './ImageGalleryModal';

interface ThreeDMapProps {
  plots: Plot[];
  selectedPlot: Plot | null;
  onSelectPlot: (plot: Plot) => void;
  searchQuery: string;
  activeLayout?: 'demo' | 'custom';
  popupEditingPreview?: { plotId: string; points: { x: number; y: number }[] } | null;
  allPlotsOpacity: number;
  setAllPlotsOpacity: (opacity: number) => void;
  filter: PlotFilter;
  setFilter: (filter: PlotFilter) => void;
  isAdmin: boolean;
}

// Color codes mapping matching status values
const statusColors = {
  available: '#22c55e', // Green
  booked: '#ef4444',    // Red
  ongoing: '#eab308',   // Yellow
  sold: '#6b7280',      // Gray
};

// Helper to draw rounded corner on THREE.Shape
function addRoundedCorner(shape: THREE.Shape, pPrev: {x:number, y:number}, pCurr: {x:number, y:number}, pNext: {x:number, y:number}, radius: number) {
  const vPrev = { x: pPrev.x - pCurr.x, y: pPrev.y - pCurr.y };
  const vNext = { x: pNext.x - pCurr.x, y: pNext.y - pCurr.y };
  
  const lenPrev = Math.sqrt(vPrev.x ** 2 + vPrev.y ** 2);
  const lenNext = Math.sqrt(vNext.x ** 2 + vNext.y ** 2);
  
  if (lenPrev === 0 || lenNext === 0) {
    shape.lineTo(pCurr.x, pCurr.y);
    return;
  }
  
  const r = Math.min(radius, lenPrev / 2, lenNext / 2);
  
  const pStart = {
    x: pCurr.x + (vPrev.x / lenPrev) * r,
    y: pCurr.y + (vPrev.y / lenPrev) * r
  };
  const pEnd = {
    x: pCurr.x + (vNext.x / lenNext) * r,
    y: pCurr.y + (vNext.y / lenNext) * r
  };
  
  shape.lineTo(pStart.x, pStart.y);
  shape.quadraticCurveTo(pCurr.x, pCurr.y, pEnd.x, pEnd.y);
}

// 1. Plot Extruded 3D Shape Component
function PlotBox({
  plot,
  isSelected,
  isSearchingMatch,
  onSelect,
  popupEditingPreview,
  allPlotsOpacity,
}: {
  plot: Plot;
  isSelected: boolean;
  isSearchingMatch: boolean;
  onSelect: (plot: Plot) => void;
  popupEditingPreview?: { plotId: string; points: { x: number; y: number }[] } | null;
  allPlotsOpacity: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const scaleDivisor = 10;
  const h = isSelected ? 1.6 : 1.0; // Selected blocks stand taller!

  // Retrieve vector polygon coordinates
  const vertices = (popupEditingPreview && popupEditingPreview.plotId === plot.id)
    ? popupEditingPreview.points
    : getPlotVertices(plot);

  // Calculate centroid for positioning Html tag
  let cx = 0, cy = 0;
  vertices.forEach(v => { cx += v.x; cy += v.y; });
  cx /= vertices.length;
  cy /= vertices.length;

  const centroidX = cx / scaleDivisor;
  const centroidZ = -cy / scaleDivisor;

  // Compile Three.Shape for extrusion
  const shape = React.useMemo(() => {
    const s = new THREE.Shape();
    if (vertices.length < 3) return s;
    
    // Scale points
    const scaledVertices = vertices.map(v => ({ x: v.x / scaleDivisor, y: v.y / scaleDivisor }));
    
    const baseRadii = plot.cornerRadius ?? 0;
    const radii = (Array.isArray(baseRadii) ? baseRadii : vertices.map(() => baseRadii)).map(r => r / scaleDivisor);

    const len = scaledVertices.length;
    const pStartFirst = scaledVertices[0];
    
    // Start at an arbitrary point for the first corner logic if needed, 
    // but quadraticCurveTo structure expects to be moving into the corner.
    // Simplifying: just move to the first point, then iterate.
    // If rounding is needed on the *first* point, we handle it specially.
    
    // For simplicity, let's start at a point that isn't a corner.
    // Or just treat the first point as a straight point if radius is 0,
    // or handle the wrapping.
    
    // Reconstruction from TwoDMap:
    // ctx.moveTo((pLast.x + p0.x) / 2, (pLast.y + p0.y) / 2);
    
    const pLast = scaledVertices[len - 1];
    s.moveTo((pLast.x + pStartFirst.x) / 2, (pLast.y + pStartFirst.y) / 2);
    
    for (let i = 0; i < len; i++) {
        const pPrev = scaledVertices[(i - 1 + len) % len];
        const pCurr = scaledVertices[i];
        const pNext = scaledVertices[(i + 1) % len];
        const r = radii[i] || 0;
        
        if (r > 0) {
            addRoundedCorner(s, pPrev, pCurr, pNext, r);
        } else {
            s.lineTo(pCurr.x, pCurr.y);
        }
    }
    
    s.closePath();
    return s;
  }, [vertices, plot.cornerRadius]);

  const extrudeSettings = React.useMemo(() => ({
    steps: 1,
    depth: h,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.02,
    bevelOffset: 0,
    bevelSegments: 2,
  }), [h]);

  const baseColor = statusColors[plot.status] || '#22c55e';
  
  // Pulse animation on active selected boundary
  useFrame((state) => {
    if (isSelected && meshRef.current) {
      const pulse = 1.0 + Math.sin(state.clock.getElapsedTime() * 4) * 0.04;
      meshRef.current.scale.set(pulse, 1.1, pulse);
    } else if (meshRef.current) {
      meshRef.current.scale.set(1, 1, 1);
    }
  });

  return (
    <group>
      {/* 
        Mesh placed flat. Since shape is on XY, rotating by -Math.PI / 2 on X 
        flaces it flat on the XZ ground plane. Local Z extrusion extends upwards as height.
      */}
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]} 
        onPointerOver={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(plot);
        }}
      >
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={0.2}
          metalness={0.1}
          opacity={isSearchingMatch ? 1.0 : (isSelected ? 1.0 : allPlotsOpacity)}
          transparent
          emissive={isSearchingMatch ? '#facc15' : (isSelected ? '#60a5fa' : '#000000')}
          emissiveIntensity={isSearchingMatch ? 0.7 : (isSelected ? 2.0 : 0)}
        />
      </mesh>

      {/* Numerical info label */}
      {(isSelected || isSearchingMatch) && (
        <Html position={[centroidX, h + 0.5, centroidZ]} center distanceFactor={14}>
          <div className="px-2 py-1 bg-stone-900/90 text-white font-mono text-[10px] font-bold rounded shadow-md border border-stone-700 whitespace-nowrap pointer-events-none">
            {plot.plotNumber}
          </div>
        </Html>
      )}
    </group>
  );
}

// 2. 3D Roads Visualizer Project (Demo Mode only)
function Roads() {
  const scaleDivisor = 10;
  return (
    <>
      {COORD_ROADS.map((road) => {
        const x = road.x / scaleDivisor;
        const z = -road.y / scaleDivisor;
        const w = road.width / scaleDivisor;
        const d = road.depth / scaleDivisor;
        const h = 0.02; // flat height

        return (
          <group key={road.id} position={[x, h / 2, z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[road.horizontal ? w : d, road.horizontal ? d : w]} />
              <meshStandardMaterial color="#2d2a29" roughness={0.9} />
            </mesh>
            
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
              <planeGeometry args={[road.horizontal ? w : d, 0.05]} />
              <meshBasicMaterial color="#78716c" />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

// 3. Landscape Amenities (Demo Mode only)
function Amenities() {
  const scaleDivisor = 10;
  return (
    <>
      {AMENITIES_DATA.map((am) => {
        const x = am.coordinates.x / scaleDivisor;
        const z = -am.coordinates.y / scaleDivisor;
        const r = am.radius / scaleDivisor;

        if (am.category === 'Park') {
          return (
            <group key={am.id} position={[x, 0.03, z]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[r, 32]} />
                <meshStandardMaterial color="#4ade80" roughness={0.8} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <circleGeometry args={[r * 0.3, 16]} />
                <meshStandardMaterial color="#bae6fd" roughness={0.1} metalness={0.5} />
              </mesh>
              {[-r*0.5, r*0.5].map((tx, idx) => (
                <group key={idx} position={[tx, 0.4, tx*0.4]}>
                  <mesh>
                    <cylinderGeometry args={[0.04, 0.06, 0.8, 8]} />
                    <meshStandardMaterial color="#78350f" />
                  </mesh>
                  <mesh position={[0, 0.5, 0]}>
                    <coneGeometry args={[0.25, 0.7, 8]} />
                    <meshStandardMaterial color="#15803d" />
                  </mesh>
                </group>
              ))}
            </group>
          );
        } else if (am.category === 'Clubhouse') {
          return (
            <group key={am.id} position={[x, 0, z]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <circleGeometry args={[r, 32]} />
                <meshStandardMaterial color="#fef08a" roughness={0.7} />
              </mesh>
              <mesh position={[0, 0.8, 0]}>
                <boxGeometry args={[r * 1.2, 1.6, r * 0.8]} />
                <meshStandardMaterial color="#d97706" roughness={0.5} metalness={0.3} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, r*0.4]}>
                <planeGeometry args={[r * 0.9, r * 0.4]} />
                <meshStandardMaterial color="#0284c7" roughness={0.1} metalness={0.5} />
              </mesh>
            </group>
          );
        } else {
          return (
            <group key={am.id} position={[x, 0.05, z]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[r, 16]} />
                <meshStandardMaterial color="#fed7aa" />
              </mesh>
              <mesh position={[0, 0.6, 0]}>
                <coneGeometry args={[0.15, 0.6, 8]} />
                <meshStandardMaterial color="#f97316" metalness={0.4} />
              </mesh>
            </group>
          );
        }
      })}
    </>
  );
}

// 4. Interactive 3D Canvas Plan
export default function ThreeDMap({ 
  plots, 
  selectedPlot, 
  onSelectPlot, 
  searchQuery,
  activeLayout = 'custom',
  popupEditingPreview,
  allPlotsOpacity,
  setAllPlotsOpacity,
  filter,
  setFilter,
  isAdmin
}: ThreeDMapProps) {
  
  const [backgroundTexture, setBackgroundTexture] = useState<THREE.Texture | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Generate a clean grid plate inside 3D ground canvas texture!
  const proceduralTexture = React.useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Solid dark slate background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 512, 512);

      // Grid lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;

      // Draw grid lines
      const grid = 32;
      for (let x = 0; x <= 512; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
      }
      for (let y = 0; y <= 512; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }

      // Guide indicators text
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Ground Blueprint Plane', 256, 236);
      ctx.font = '13px sans-serif';
      ctx.fillText('(Upload Layout Image to Bind Map Background)', 256, 268);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, []);

  // Load custom background layout from server if active
  useEffect(() => {
    if (activeLayout === 'custom') {
      const loader = new THREE.TextureLoader();
      loader.load(
        '/api/layout/image?' + Date.now(),
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          setBackgroundTexture(tex);
        },
        undefined,
        (err) => {
          console.warn('Failed to load ThreeJS custom background texture:', err);
          setBackgroundTexture(null);
        }
      );
    } else {
      setBackgroundTexture(null);
    }
  }, [activeLayout]);

  return (
    <div className="relative w-full h-[600px] bg-stone-950 rounded-2xl border border-stone-800 overflow-hidden shadow-2xl flex flex-col">
      <PlotStatusFilter filter={filter} setFilter={setFilter} allPlotsOpacity={allPlotsOpacity} setAllPlotsOpacity={setAllPlotsOpacity} />
      
      <div className="absolute bottom-4 right-4 md:bottom-auto md:top-4 md:right-4 z-10 flex gap-2">
         <button
          onClick={() => setIsGalleryOpen(true)}
          className="p-2.5 bg-indigo-900/60 hover:bg-indigo-800/80 text-white backdrop-blur-md rounded-xl border border-indigo-700 shadow-md transition-colors flex items-center justify-center cursor-pointer"
          title="Gallery"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
      </div>

       <ImageGalleryModal isAdmin={isAdmin} isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} />

      <div className="w-full flex-1">
        <Canvas
          camera={{ position: [0, 18, 22], fov: 45 }}
          shadows
          id="3d-master-plan-canvas"
        >
          <color attach="background" args={['#1c1917']} />
          <fog attach="fog" args={['#1c1917', 24, 60]} />

          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-10, 10, -10]} intensity={0.3} />

          {/* Starry environment */}
          <Stars radius={100} depth={50} count={1200} factor={4} saturation={0.5} fade speed={1} />

          <group position={[0, -0.1, 0]}>
            {/* Draw 3D Base layer (Harmony Farms site plan or uploaded custom background image) */}
            {activeLayout === 'custom' && backgroundTexture ? (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
                {/* Maps to the 2D layout aspect ratio bounds size of 60 wide x 43 deep */}
                <planeGeometry args={[60, 43]} />
                <meshStandardMaterial map={backgroundTexture} roughness={0.7} />
              </mesh>
            ) : (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
                {/* Maps to the 2D layout aspect ratio bounds size of 60 wide x 43 deep */}
                <planeGeometry args={[60, 43]} />
                <meshStandardMaterial map={proceduralTexture} roughness={0.8} />
              </mesh>
            )}

            {/* Extrude Plot Boundaries right on the background */}
            {plots.map((plot) => {
              const isSelected = selectedPlot?.id === plot.id;
              const isSearchingMatch = searchQuery
                ? plot.plotNumber.toUpperCase().includes(searchQuery.toUpperCase().trim())
                : false;

              return (
                <PlotBox
                  key={plot.id}
                  plot={plot}
                  isSelected={isSelected}
                  isSearchingMatch={isSearchingMatch}
                  onSelect={onSelectPlot}
                  popupEditingPreview={popupEditingPreview}
                  allPlotsOpacity={allPlotsOpacity}
                />
              );
            })}
          </group>

          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            maxPolarAngle={Math.PI / 2 - 0.04}
            minDistance={6}
            maxDistance={45}
            makeDefault
          />
        </Canvas>
      </div>

      {/* Floating details overlay */}
      <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-2">
        <div className="bg-stone-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-stone-800 shadow-lg flex items-center gap-1.5 text-xs text-stone-200 font-semibold" id="indicator-3d-gltf">
          <div className="w-5 h-5 rounded-full flex items-center justify-center border border-stone-600 bg-stone-900 font-bold text-[10px] text-red-400">
            3D
          </div>
          <span>{activeLayout === 'custom' ? 'Interactive Custom masterplan' : 'Simulated Estate sandbox'}</span>
        </div>
        <div className="bg-stone-950/80 backdrop-blur-md p-3 rounded-lg border border-stone-800 shadow-lg text-[10px] text-stone-400 flex flex-col gap-1 w-[205px]">
          <div className="font-bold text-stone-200 flex items-center gap-1 mb-1">
            🎮 View Navigator:
          </div>
          <div>🖱️ Hold Left-Click & Drag: Rotate Orbit</div>
          <div>🖱️ Hold Right-Click & Drag: Pan Scene</div>
          <div>✨ Hover/Click plots to verify bookings</div>
        </div>
      </div>


    </div>
  );
}
