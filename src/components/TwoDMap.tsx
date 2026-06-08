import React, { useRef, useEffect, useState } from 'react';
import { Plot, PlotFilter } from '../types';
import { COORD_ROADS, AMENITIES_DATA } from '../defaultData';
import { Maximize2, Minimize2, Image as ImageIcon } from 'lucide-react';
import PlotStatusFilter from './PlotStatusFilter';
import ImageGalleryModal from './ImageGalleryModal';

interface TwoDMapProps {
  plots: Plot[];
  selectedPlot: Plot | null;
  onSelectPlot: (plot: Plot) => void;
  searchQuery: string;
  activeLayout?: 'demo' | 'custom';
  lastUpdated?: number;
  onReloadLayout?: () => void;
  popupEditingPreview?: { plotId: string; points: { x: number; y: number }[] } | null;
  isEditingMode: boolean;
  onPlotUpdate: (plot: Plot) => void;
  allPlotsOpacity: number;
  setAllPlotsOpacity: (opacity: number) => void;
  filter: PlotFilter;
  setFilter: (filter: PlotFilter) => void;
  isAdmin: boolean;
}

// Ray-casting algorithm for point-in-polygon test
function isPointInPolygon(point: { x: number; y: number }, vs: { x: number; y: number }[]) {
  const x = point.x, y = point.y;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].x, yi = vs[i].y;
    const xj = vs[j].x, yj = vs[j].y;
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Helper to get coordinates polygon vertices for any plot (fallback to rectangle bounding box)
export function getPlotVertices(plot: Plot): { x: number; y: number }[] {
  if (plot.points && plot.points.length >= 3) {
    return plot.points;
  }
  const { x, y, width, depth } = plot.coordinates;
  const halfW = width / 2;
  const halfD = depth / 2;
  return [
    { x: x - halfW, y: y - halfD },
    { x: x + halfW, y: y - halfD },
    { x: x + halfW, y: y + halfD },
    { x: x - halfW, y: y + halfD },
  ];
}

export default function TwoDMap({ 
  plots, 
  selectedPlot, 
  onSelectPlot, 
  searchQuery,
  activeLayout = 'custom',
  lastUpdated,
  onReloadLayout,
  popupEditingPreview,
  isEditingMode,
  onPlotUpdate,
  allPlotsOpacity,
  setAllPlotsOpacity,
  filter,
  setFilter,
  isAdmin
}: TwoDMapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fullscreen and Sizing States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // Pan and Zoom States
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.4);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [layoutImage, setLayoutImage] = useState<HTMLImageElement | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [draggingPlotId, setDraggingPlotId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredPlotId, setHoveredPlotId] = useState<string | null>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    if (draggingPlotId) {
      canvasRef.current.style.cursor = 'grabbing';
    } else if (isEditingMode && hoveredPlotId) {
      canvasRef.current.style.cursor = 'grab';
    } else {
      canvasRef.current.style.cursor = isEditingMode ? 'crosshair' : 'default';
    }
  }, [draggingPlotId, hoveredPlotId, isEditingMode]);

  const getActiveVertices = (plot: Plot) => {
    if (popupEditingPreview && popupEditingPreview.plotId === plot.id) {
      return popupEditingPreview.points;
    }
    return getPlotVertices(plot);
  };

  // Lock page scrolling when map is viewed in full screen
  useEffect(() => {
    if (isFullscreen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isFullscreen]);

  // Reactively track container dimensions to perfectly adjust the Canvas/Stage size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({ width: width || 800, height: height || 500 });
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, [isFullscreen]);

  // Status colors mapping matching Harmony Farms' visual theme style
  const colors = {
    available: { fill: 'rgba(34, 197, 94, 0.35)', stroke: '#22c55e' }, // Green = Available
    booked: { fill: 'rgba(239, 68, 68, 0.45)', stroke: '#ef4444' },    // Red = Booked
    ongoing: { fill: 'rgba(234, 179, 8, 0.4)', stroke: '#eab308' },    // Yellow = Ongoing
    sold: { fill: 'rgba(120, 113, 108, 0.4)', stroke: '#78716c' },     // Gray = Sold
  };

  // Pre-load layout image from server
  useEffect(() => {
    setIsImageLoading(true);
    const img = new Image();
    img.src = '/api/layout/image?' + Date.now(); // cache breaker
    img.onload = () => {
      setLayoutImage(img);
      setIsImageLoading(false);
    };
    img.onerror = () => {
      console.warn('Failed to load layout image, falling back to blueprint grid.');
      setLayoutImage(null);
      setIsImageLoading(false);
    };
  }, [activeLayout, lastUpdated]);

  // Convert map coordinates (centered on 0,0) to canvas pixel coordinates
  const getCanvasCoords = (mapX: number, mapY: number, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const canvasX = centerX + mapX * zoom + pan.x;
    const canvasY = centerY - mapY * zoom + pan.y; 
    return { x: canvasX, y: canvasY };
  };

  // Convert canvas pixel coordinates back to map coordinates
  const getMapCoords = (canvasX: number, canvasY: number, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const mapX = (canvasX - centerX - pan.x) / zoom;
    const mapY = (centerY - canvasY + pan.y) / zoom;
    return { x: mapX, y: mapY };
  };

  // Reset viewport zoom/pan
  const resetViewport = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1.4);
  };

  // Zoom Handler
  const handleZoom = (factor: number) => {
    setZoom(prev => Math.min(Math.max(prev * factor, 0.4), 5));
  };

  // Redraw Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use dimensions reactively tracked by our ResizeObserver
    const { width, height } = dimensions;
    
    // Support high density displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // 1. Draw Map Background
    if (layoutImage) {
      // Clear background with extremely clean canvas frame border
      ctx.fillStyle = '#0a0a0a'; 
      ctx.fillRect(0, 0, width, height);

      // Draw custom layout image centered at (0, 0)
      const center = getCanvasCoords(0, 0, width, height);
      // Map logical size to fit the viewport space nicely (width 600, height 400 default)
      const imgW = 600 * zoom;
      const imgH = 430 * zoom; 
      ctx.drawImage(layoutImage, center.x - imgW / 2, center.y - imgH / 2, imgW, imgH);

      // Subtle frame surrounding layout image
      ctx.strokeStyle = '#d6d3d1';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.strokeRect(center.x - imgW / 2, center.y - imgH / 2, imgW, imgH);
    } else {
      // Fallback: Stunning blueprint architectural grids
      ctx.fillStyle = '#0f172a'; // Glowing blueprint navy
      ctx.fillRect(0, 0, width, height);

      // Draw blueprint grid lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.5;
      const gridSpacing = 40 * zoom;
      const gridOffsetX = (width / 2 + pan.x) % gridSpacing;
      const gridOffsetY = (height / 2 + pan.y) % gridSpacing;

      for (let x = gridOffsetX; x < width; x += gridSpacing) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = gridOffsetY; y < height; y += gridSpacing) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isImageLoading ? 'Synthesizing layout image background...' : 'Please upload your Plot Layout Image to begin overlays mapping.', width / 2, height / 2);
    }

    // 2. DRAW PLOT OVERLAYS (POLYGON COMPLIANCE)
    plots.forEach(plot => {
      const isSelected = selectedPlot?.id === plot.id;
      ctx.save();
      ctx.globalAlpha = isSelected ? 1 : allPlotsOpacity;

      // Retrieve full polygon vertices
      const vertices = getActiveVertices(plot);

      // Determine highlights
      const isMatchedSearch = searchQuery && plot.plotNumber.toUpperCase().includes(searchQuery.toUpperCase().trim());

      // Status Styles
      const style = colors[plot.status] || colors.available;

      // Draw plot boundary path (supports rounding custom option)
      const baseRadii = plot.cornerRadius ?? 0;
      const rs = Array.isArray(baseRadii) ? baseRadii.map(r => r * zoom) : baseRadii * zoom;
      ctx.beginPath();
      
      const canvasVertices = vertices.map(v => getCanvasCoords(v.x, v.y, width, height));
      const hasRounding = Array.isArray(rs) ? rs.some(r => r > 0) : rs > 0;

      if (hasRounding && canvasVertices.length >= 3) {
        const len = canvasVertices.length;
        const pLast = canvasVertices[len - 1];
        const p0 = canvasVertices[0];
        
        ctx.moveTo((pLast.x + p0.x) / 2, (pLast.y + p0.y) / 2);
        
        for (let i = 0; i < len; i++) {
          const pPrev = canvasVertices[(i - 1 + len) % len];
          const pCurr = canvasVertices[i];
          const pNext = canvasVertices[(i + 1) % len];
          
          const len1 = Math.sqrt(Math.pow(pCurr.x - pPrev.x, 2) + Math.pow(pCurr.y - pPrev.y, 2));
          const len2 = Math.sqrt(Math.pow(pNext.x - pCurr.x, 2) + Math.pow(pNext.y - pCurr.y, 2));

          const vertexR = Array.isArray(rs) ? (rs[i] || 0) : rs;
          const currentRadius = Math.min(vertexR, len1 / 2, len2 / 2);
          ctx.arcTo(pCurr.x, pCurr.y, pNext.x, pNext.y, currentRadius);
        }
        ctx.closePath();
      } else if (canvasVertices.length > 0) {
        ctx.moveTo(canvasVertices[0].x, canvasVertices[0].y);
        for (let i = 1; i < canvasVertices.length; i++) {
          ctx.lineTo(canvasVertices[i].x, canvasVertices[i].y);
        }
        ctx.closePath();
      }

      // Search matching glow feedback
      if (isMatchedSearch) {
        ctx.save();
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();
      }

      // Fill Plot with status color
      ctx.fillStyle = isSelected ? 'rgba(59, 130, 246, 0.15)' : style.fill;
      ctx.fill();

      // Boundary outline stroking
      ctx.strokeStyle = isSelected ? '#3b82f6' : style.stroke;
      ctx.lineWidth = isSelected ? 3.5 : 1.5;
      ctx.setLineDash([]);

      if (isSelected) {
        ctx.save();
        ctx.shadowColor = '#60a5fa';
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.restore();
      }
      ctx.stroke();

      // Render selection vertices circles (helps manually verify precise boundaries)
      if (isSelected) {
        ctx.fillStyle = '#3b82f6';
        vertices.forEach(v => {
          const coord = getCanvasCoords(v.x, v.y, width, height);
          ctx.beginPath();
          ctx.arc(coord.x, coord.y, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }

      // Display Plot Number and Area size at map center of gravity (centroid)
      let cx = 0, cy = 0;
      vertices.forEach(v => { cx += v.x; cy += v.y; });
      cx /= vertices.length;
      cy /= vertices.length;

      const centerCoord = getCanvasCoords(cx, cy, width, height);

      // Label background card for contrast in case layout is busy
      ctx.fillStyle = '#f5f5f4c0';
      ctx.fillRect(centerCoord.x - 16, centerCoord.y - 8, 32, 16);
      ctx.strokeStyle = '#ffffff15';
      ctx.lineWidth = 1;
      ctx.strokeRect(centerCoord.x - 16, centerCoord.y - 8, 32, 16);

      ctx.fillStyle = isSelected ? '#1e40af' : '#1c1917';
      ctx.font = `bold ${Math.max(10, 8 * zoom)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(plot.plotNumber, centerCoord.x, centerCoord.y);

      ctx.restore();
    });

  }, [plots, selectedPlot, pan, zoom, searchQuery, layoutImage, activeLayout, isImageLoading, dimensions, isFullscreen]);

  // Mouse Listeners
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const mapCoords = getMapCoords(x, y, rect.width, rect.height);

    if (isAdmin && isEditingMode) {
       for (const plot of plots) {
         if (isPointInPolygon(mapCoords, getActiveVertices(plot))) {
           setDraggingPlotId(plot.id);
           setDragOffset({ x: mapCoords.x - plot.coordinates.x, y: mapCoords.y - plot.coordinates.y });
           return;
         }
       }
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Logic for hover
    if (isEditingMode && !draggingPlotId) {
       const rect = canvas.getBoundingClientRect();
       const x = e.clientX - rect.left;
       const y = e.clientY - rect.top;
       const mapCoords = getMapCoords(x, y, rect.width, rect.height);
       let foundHover = null;
       for (const plot of plots) {
         if (isPointInPolygon(mapCoords, getActiveVertices(plot))) {
           foundHover = plot.id;
           break;
         }
       }
       setHoveredPlotId(foundHover);
    }

    if (draggingPlotId) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const mapCoords = getMapCoords(x, y, rect.width, rect.height);
      
      const plotToMove = plots.find(p => p.id === draggingPlotId);
      if (plotToMove) {
         const newX = mapCoords.x - dragOffset.x;
         const newY = mapCoords.y - dragOffset.y;
         
         // Translate all points by the difference
         const dx = newX - plotToMove.coordinates.x;
         const dy = newY - plotToMove.coordinates.y;
         const newPoints = getActiveVertices(plotToMove).map(pt => ({ x: pt.x + dx, y: pt.y + dy }));

         const updatedPlot = { 
           ...plotToMove, 
           coordinates: { ...plotToMove.coordinates, x: newX, y: newY },
           points: newPoints
         };
         onPlotUpdate(updatedPlot);
      }
      return;
    }

    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingPlotId) {
      setDraggingPlotId(null);
      return;
    }
    setIsDragging(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const mapCoords = getMapCoords(clientX, clientY, rect.width, rect.height);

    for (const plot of plots) {
      const vertices = getActiveVertices(plot);
      if (isPointInPolygon(mapCoords, vertices)) {
        onSelectPlot(plot);
        break;
      }
    }
  };

  // Handle touch interactions
  const getTouchDistance = (t1: React.Touch, t2: React.Touch) => {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  };

  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      setLastTouchDistance(getTouchDistance(e.touches[0], e.touches[1]));
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - dragStart.x;
      const dy = e.touches[0].clientY - dragStart.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2 && lastTouchDistance !== null) {
      const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
      const zoomFactor = currentDistance / lastTouchDistance;
      setZoom(prev => Math.min(Math.max(prev * zoomFactor, 0.4), 5));
      setLastTouchDistance(currentDistance);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    setLastTouchDistance(null);
    
    // Tap-to-select for touch
    if (e.changedTouches.length === 1 && !isDragging) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.changedTouches[0].clientX - rect.left;
        const clientY = e.changedTouches[0].clientY - rect.top;
        const mapCoords = getMapCoords(clientX, clientY, rect.width, rect.height);
        for (const plot of plots) {
          const vertices = getActiveVertices(plot);
          if (isPointInPolygon(mapCoords, vertices)) {
            onSelectPlot(plot);
            break;
          }
        }
    }
  };

  // Attach a non-passive wheel listener natively to guarantee e.preventDefault() blocks global window/page scroll or zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const nativeWheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.88;
      setZoom(prev => Math.min(Math.max(prev * factor, 0.4), 5));
    };

    canvas.addEventListener('wheel', nativeWheelHandler, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', nativeWheelHandler);
    };
  }, []);

  return (
    <div 
      className={`${
        isFullscreen 
          ? "fixed inset-0 z-50 bg-black flex flex-col h-screen w-screen p-4 md:p-6" 
          : "relative w-full h-[600px] flex flex-col bg-black rounded-2xl border border-stone-800 overflow-hidden shadow-inner"
      } font-sans`}
      id="two-d-map-root-container"
    >
      <div ref={containerRef} className="w-full flex-1 touch-none relative">
        <PlotStatusFilter filter={filter} setFilter={setFilter} allPlotsOpacity={allPlotsOpacity} setAllPlotsOpacity={setAllPlotsOpacity} />
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setIsDragging(false); }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="cursor-grab active:cursor-grabbing w-full h-full block bg-black"
          id="master-canvas-2d"
        />
      </div>



      {/* Dedicated Fullscreen control in the top-right / move bottom on mobile */}
      <div className="absolute bottom-4 right-4 md:bottom-auto md:top-4 md:right-4 z-10 flex gap-2">
        <button
          onClick={() => setIsGalleryOpen(true)}
          className="p-2.5 bg-indigo-900/60 hover:bg-indigo-800/80 text-white backdrop-blur-md rounded-xl border border-indigo-700 shadow-md transition-colors flex items-center justify-center cursor-pointer"
          title="Gallery"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => setIsFullscreen(prev => !prev)}
          className="p-2.5 bg-white/95 hover:bg-stone-50 text-stone-800 backdrop-blur-md rounded-xl border border-stone-200 shadow-md transition-colors flex items-center justify-center cursor-pointer"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
          id="btn-2d-fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>

       <ImageGalleryModal isAdmin={isAdmin} isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} />


    </div>
  );
}
