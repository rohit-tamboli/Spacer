import React, { useState, useEffect, useRef } from 'react';
import { Plot } from '../types';
import { X, Save, Edit2, ShieldAlert, CheckCircle2, RotateCcw, Box, HelpCircle } from 'lucide-react';
import { getPlotVertices } from './TwoDMap';

interface AdminPlotCustomizerPopupProps {
  plot: Plot;
  plots: Plot[];
  onSave: () => void;
  onClose: () => void;
  onPointsChange?: (points: { x: number; y: number }[]) => void;
}

export default function AdminPlotCustomizerPopup({
  plot,
  plots,
  onSave,
  onClose,
  onPointsChange
}: AdminPlotCustomizerPopupProps) {
  // Input fields state
  const [plotNumber, setPlotNumber] = useState(plot.plotNumber);
  const [status, setStatus] = useState(plot.status);
  const [nodeCustomizationEnabled, setNodeCustomizationEnabled] = useState(false);
  const [cornerRadiuses, setCornerRadiuses] = useState<number[]>(
    Array.isArray(plot.cornerRadius) ? plot.cornerRadius : Array(plot.points?.length || 4).fill(plot.cornerRadius || 0)
  );
  
  // Custom geometries state
  const [localPoints, setLocalPoints] = useState<{ x: number; y: number }[]>(getPlotVertices(plot));
  const [area, setArea] = useState(plot.area);
  const [widthSize, setWidthSize] = useState(plot.coordinates.width || 30);
  const [depthSize, setDepthSize] = useState(plot.coordinates.depth || 30);

  // Drag and hover states
  const [draggingNodeIdx, setDraggingNodeIdx] = useState<number | null>(null);
  const [hoveredNodeIdx, setHoveredNodeIdx] = useState<number | null>(null);
  const [isDraggingOverallShape, setIsDraggingOverallShape] = useState(false);
  const [dragStartCoords, setDragStartCoords] = useState<{ x: number; y: number } | null>(null);

  // Status/Error notifications
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Reference for the mini canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Stable anchor coordinate frame calculated once when the current plot is loaded
  const [anchor, setAnchor] = useState<{ centerX: number; centerY: number; scale: number }>({
    centerX: 0,
    centerY: 0,
    scale: 1,
  });

  // Reset states when the selected plot changes
  useEffect(() => {
    setPlotNumber(plot.plotNumber);
    setStatus(plot.status);
    const initialPts = getPlotVertices(plot);
    setLocalPoints(initialPts);
    setArea(plot.area);
    setWidthSize(plot.coordinates.width || 30);
    setDepthSize(plot.coordinates.depth || 30);
    if (Array.isArray(plot.cornerRadius)) {
      setCornerRadiuses(plot.cornerRadius);
    } else {
      setCornerRadiuses(Array(initialPts.length).fill(plot.cornerRadius || 0));
    }
    setHoveredNodeIdx(null);
    setError('');
    setSuccess(false);

    // Compute stable boundary anchor once for the current plot
    const ys = initialPts.map(pt => pt.y);
    const xs = initialPts.map(pt => pt.x);
    const minX = xs.length ? Math.min(...xs) : -20;
    const maxX = xs.length ? Math.max(...xs) : 20;
    const minY = ys.length ? Math.min(...ys) : -20;
    const maxY = ys.length ? Math.max(...ys) : 20;

    const bboxWidth = Math.max(1, maxX - minX);
    const bboxHeight = Math.max(1, maxY - minY);

    const canvasWidth = 280;
    const canvasHeight = 160;
    const padding = 20;

    const scaleX = (canvasWidth - padding * 2) / bboxWidth;
    const scaleY = (canvasHeight - padding * 2) / bboxHeight;
    const scale = Math.min(scaleX, scaleY) || 1;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setAnchor({ centerX, centerY, scale });
  }, [plot.id]);

  useEffect(() => {
    if (localPoints && localPoints.length >= 3) {
      onPointsChange?.(localPoints);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localPoints]);

  const canvasWidth = 280;
  const canvasHeight = 160;

  // Converts Map Space logical coordinates to mini-canvas pixels using the stable anchor
  const mapToCanvas = (mx: number, my: number) => {
    const dx = mx - anchor.centerX;
    const dy = my - anchor.centerY;
    const cx = canvasWidth / 2 + dx * anchor.scale;
    const cy = canvasHeight / 2 - dy * anchor.scale; // Invert Y as canvas coordinates grow top-to-bottom
    return { x: cx, y: cy };
  };

  // Converts canvas pixels straight to Map Space coordinate metrics using the stable anchor
  const canvasToMap = (cx: number, cy: number) => {
    const dx = (cx - canvasWidth / 2) / anchor.scale;
    const dy = -(cy - canvasHeight / 2) / anchor.scale;
    return { x: Number((anchor.centerX + dx).toFixed(1)), y: Number((anchor.centerY + dy).toFixed(1)) };
  };

  // Redraw plot corners preview on the interactive mini-canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || localPoints.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#1e1b4b'; // Deep Indigo background for beautiful professional grid styling
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Render schematic grids in background
    ctx.strokeStyle = '#312e81';
    ctx.lineWidth = 0.5;
    const gridSpacing = 20;
    for (let x = 0; x < canvasWidth; x += gridSpacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasHeight); ctx.stroke();
    }
    for (let y = 0; y < canvasHeight; y += gridSpacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasWidth, y); ctx.stroke();
    }

    // Render roads or border guide
    ctx.strokeStyle = '#3730a3';
    ctx.lineWidth = 1;
    ctx.strokeRect(4, 4, canvasWidth - 8, canvasHeight - 8);

    // Draw the active polygon path (supports rounded corners customized option)
    const rs = cornerRadiuses.map(cr => cr * anchor.scale);
    ctx.beginPath();
    
    const hasRounding = rs.some(r => r > 0);
    if (hasRounding && localPoints.length >= 3) {
      const canvasPts = localPoints.map(pt => mapToCanvas(pt.x, pt.y));
      const len = canvasPts.length;
      const pLast = canvasPts[len - 1];
      const p0 = canvasPts[0];
      
      ctx.moveTo((pLast.x + p0.x) / 2, (pLast.y + p0.y) / 2);
      
      for (let i = 0; i < len; i++) {
        const pPrev = canvasPts[(i - 1 + len) % len];
        const pCurr = canvasPts[i];
        const pNext = canvasPts[(i + 1) % len];
        
        const len1 = Math.sqrt(Math.pow(pCurr.x - pPrev.x, 2) + Math.pow(pCurr.y - pPrev.y, 2));
        const len2 = Math.sqrt(Math.pow(pNext.x - pCurr.x, 2) + Math.pow(pNext.y - pCurr.y, 2));

        const currentRadius = Math.min(rs[i] || 0, len1 / 2, len2 / 2);
        ctx.arcTo(pCurr.x, pCurr.y, pNext.x, pNext.y, currentRadius);
      }
      ctx.closePath();
    } else {
      const start = mapToCanvas(localPoints[0].x, localPoints[0].y);
      ctx.moveTo(start.x, start.y);
      for (let i = 1; i < localPoints.length; i++) {
        const pt = mapToCanvas(localPoints[i].x, localPoints[i].y);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();
    }

    // Fill with semi-transparent plot color based on status
    const fillColors = {
      available: 'rgba(34, 197, 94, 0.25)',
      booked: 'rgba(239, 68, 68, 0.35)',
      ongoing: 'rgba(234, 179, 8, 0.3)',
      sold: 'rgba(120, 113, 108, 0.3)'
    };
    ctx.fillStyle = fillColors[status] || fillColors.available;
    ctx.fill();

    // Outline path
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Render vertex circles for draggable actions
    localPoints.forEach((pt, idx) => {
      const coord = mapToCanvas(pt.x, pt.y);
      const isHovered = hoveredNodeIdx === idx;
      const isDragged = draggingNodeIdx === idx;
      const isSpecial = isHovered || isDragged;

      // Draw beautiful ambient glow ring for active node controls
      if (isSpecial) {
        ctx.beginPath();
        ctx.arc(coord.x, coord.y, 11, 0, Math.PI * 2);
        ctx.fillStyle = idx === 0 ? 'rgba(244, 63, 94, 0.22)' : 'rgba(245, 158, 11, 0.22)';
        ctx.fill();
        ctx.strokeStyle = idx === 0 ? '#f43f5e' : '#f59e0b';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(coord.x, coord.y, isSpecial ? 7.5 : 5.5, 0, Math.PI * 2);
      ctx.fillStyle = idx === 0 ? '#f43f5e' : '#f59e0b'; // First node highlighted as source
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isSpecial ? 2 : 1.5;
      ctx.stroke();

      // Inner white dot to make it look like a professional slider track/dial node
      ctx.beginPath();
      ctx.arc(coord.x, coord.y, isSpecial ? 2.2 : 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Display small numeric identification next to nodes
      ctx.fillStyle = isSpecial ? '#ffffff' : '#a5b4fc';
      ctx.font = isSpecial ? 'bold 10px monospace' : 'bold 9px monospace';
      ctx.fillText(`#${idx+1}`, coord.x + (isSpecial ? 10 : 8), coord.y + 3);
    });

    // Subtly state layout measurements in bottom corner with stable coordinates
    ctx.fillStyle = '#4f46e5';
    ctx.fillRect(8, canvasHeight - 20, 130, 14);
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    const ys = localPoints.map(pt => pt.y);
    const xs = localPoints.map(pt => pt.x);
    const minX = xs.length ? Math.min(...xs) : -20;
    const maxX = xs.length ? Math.max(...xs) : 20;
    const minY = ys.length ? Math.min(...ys) : -20;
    const maxY = ys.length ? Math.max(...ys) : 20;
    const currentCenterX = (minX + maxX) / 2;
    const currentCenterY = (minY + maxY) / 2;
    ctx.fillText(`📐 Centroid: (${currentCenterX.toFixed(1)}, ${currentCenterY.toFixed(1)})`, 12, canvasHeight - 10);

  }, [localPoints, status, anchor, hoveredNodeIdx, draggingNodeIdx, cornerRadiuses]);

  // Geometric presets loaders
  const handleApplyPreset = (type: 'rectangle' | 'trapezoid' | 'lshape') => {
    const cx = plot.coordinates.x;
    const cy = plot.coordinates.y;
    const w = widthSize;
    const d = depthSize;
    const hw = w / 2;
    const hd = d / 2;

    let pts: { x: number; y: number }[] = [];

    if (type === 'rectangle') {
      pts = [
        { x: cx - hw, y: cy - hd },
        { x: cx + hw, y: cy - hd },
        { x: cx + hw, y: cy + hd },
        { x: cx - hw, y: cy + hd }
      ];
    } else if (type === 'trapezoid') {
      const slant = hw * 0.3;
      pts = [
        { x: cx - hw + slant, y: cy - hd },
        { x: cx + hw - slant, y: cy - hd },
        { x: cx + hw, y: cy + hd },
        { x: cx - hw, y: cy + hd }
      ];
    } else if (type === 'lshape') {
      const nw = w * 0.4;
      const nd = d * 0.4;
      pts = [
        { x: cx - hw, y: cy - hd },
        { x: cx + hw - nw, y: cy - hd },
        { x: cx + hw - nw, y: cy + hd - nd },
        { x: cx + hw, y: cy + hd - nd },
        { x: cx + hw, y: cy + hd },
        { x: cx - hw, y: cy + hd }
      ];
    }

    setLocalPoints(pts);
    setCornerRadiuses(Array(pts.length).fill(0));
    calculateAreaForPoints(pts);
  };

  // Estimate SQ.M via standard surveyor shoelace formulas
  const calculateAreaForPoints = (pts: { x: number; y: number }[]) => {
    if (pts.length < 3) return;
    let sum = 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      sum += pts[i].x * pts[j].y;
      sum -= pts[j].x * pts[i].y;
    }
    const coordinateArea = Math.abs(sum / 2);
    // Multiply by standard multiplier factor matching default catalog plots density
    const estimated = Math.round(coordinateArea * 0.43);
    setArea(estimated > 0 ? estimated : 450);
  };

  // Mini canvas mouse interactions to track dragging
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - r.left;
    const mouseY = e.clientY - r.top;

    // Check if clicked near an existing node
    const nearbyIdx = localPoints.findIndex(pt => {
      const coord = mapToCanvas(pt.x, pt.y);
      const dist = Math.sqrt((coord.x - mouseX) ** 2 + (coord.y - mouseY) ** 2);
      return dist < 8; // threshold of 8 px clickable surface
    });

    if (nearbyIdx !== -1) {
      setDraggingNodeIdx(nearbyIdx);
    } else {
      // Begin overall shape translation drag
      setIsDraggingOverallShape(true);
      setDragStartCoords(canvasToMap(mouseX, mouseY));
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - r.left;
    const mouseY = e.clientY - r.top;

    // Real-time hover tracking over node handles
    const nearbyIdx = localPoints.findIndex(pt => {
      const coord = mapToCanvas(pt.x, pt.y);
      const dist = Math.sqrt((coord.x - mouseX) ** 2 + (coord.y - mouseY) ** 2);
      return dist < 8; // threshold of 8 px clickable surface
    });
    setHoveredNodeIdx(nearbyIdx !== -1 ? nearbyIdx : null);

    if (draggingNodeIdx === null && !isDraggingOverallShape) return;

    const currentMapSpace = canvasToMap(mouseX, mouseY);

    if (draggingNodeIdx !== null) {
      const updated = [...localPoints];
      updated[draggingNodeIdx] = currentMapSpace;
      setLocalPoints(updated);
      calculateAreaForPoints(updated);
    } else if (isDraggingOverallShape && dragStartCoords) {
      const dx = currentMapSpace.x - dragStartCoords.x;
      const dy = currentMapSpace.y - dragStartCoords.y;

      const updated = localPoints.map(v => ({
        x: Number((v.x + dx).toFixed(1)),
        y: Number((v.y + dy).toFixed(1))
      }));
      setLocalPoints(updated);
      setDragStartCoords(currentMapSpace);
      calculateAreaForPoints(updated);
    }
  };

  const handleCanvasMouseUpOrLeave = () => {
    setDraggingNodeIdx(null);
    setIsDraggingOverallShape(false);
    setDragStartCoords(null);
    setHoveredNodeIdx(null);
  };

  // API Call Submission
  const handleSaveChanges = async () => {
    if (!plotNumber.trim()) {
      setError('Please provide a valid plotted identification identifier.');
      return;
    }

    // Uniqueness validation check
    if (plotNumber.trim().toUpperCase() !== plot.plotNumber.toUpperCase()) {
      const isTaken = plots.some(p => p.id !== plot.id && p.plotNumber.toUpperCase() === plotNumber.trim().toUpperCase());
      if (isTaken) {
        setError(`Plot identity #${plotNumber.trim()} is currently reserved by another active parcel.`);
        return;
      }
    }

    if (localPoints.length < 3) {
      setError('A secure custom plot parcel requires at least 3 spatial points mapped.');
      return;
    }

    // Validate each vertex coordinate to ensure it is bounded and valid
    for (let i = 0; i < localPoints.length; i++) {
      const pt = localPoints[i];
      if (typeof pt.x !== 'number' || typeof pt.y !== 'number' || isNaN(pt.x) || isNaN(pt.y)) {
        setError('One or more shape vertex coordinate values are invalid numbers.');
        return;
      }
      if (Math.abs(pt.x) > 400 || Math.abs(pt.y) > 300) {
        setError(`A shape vertex coordinate (${pt.x}, ${pt.y}) lies outside reasonable master plan layout boundaries (-400 to 400). Please drag it back inside.`);
        return;
      }
    }

    setError('');
    setSaving(true);

    // Calculate dynamic coordinates centroid and bounding metrics
    let sx = 0, sy = 0;
    localPoints.forEach(pt => { sx += pt.x; sy += pt.y; });
    const cx = sx / localPoints.length;
    const cy = sy / localPoints.length;

    const maxCoordX = Math.max(...localPoints.map(p => p.x));
    const minCoordX = Math.min(...localPoints.map(p => p.x));
    const maxCoordY = Math.max(...localPoints.map(p => p.y));
    const minCoordY = Math.min(...localPoints.map(p => p.y));

    const finalWidth = maxCoordX - minCoordX;
    const finalDepth = maxCoordY - minCoordY;

    const payload = {
      plotNumber: plotNumber.trim(),
      status,
      coordinates: {
        x: Number(cx.toFixed(1)),
        y: Number(cy.toFixed(1)),
        z: plot.coordinates?.z || 0.5,
        width: Number(finalWidth.toFixed(1)),
        depth: Number(finalDepth.toFixed(1))
      },
      points: localPoints,
      area: Number(area),
      cornerRadius: cornerRadiuses
    };

    try {
      const res = await fetch(`/api/plots/${plot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to sync plot customization.');
      }

      setSuccess(true);
      setTimeout(() => {
        setSaving(false);
        onSave();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Fatal exception saving map changes.');
      setSaving(false);
    }
  };

  return (
    <div 
      className="bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200/90 p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 relative"
      id="customizer-popup-portal"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
        <div className="flex items-center gap-1.5 text-indigo-900">
          <span className="text-base">🛡️</span>
          <div>
            <h4 className="font-bold text-xs leading-none">Admin Modification Desk</h4>
            <span className="text-[10px] text-stone-400 mt-0.5 block">Configuring Plot {plot.plotNumber}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-stone-50 rounded-full text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
          title="Dismiss portal"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {error && (
        <div className="p-2 border border-red-200 bg-red-50 text-red-700 text-[10px] rounded-lg font-medium flex items-start gap-1">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="p-6 text-center flex flex-col items-center justify-center gap-2 text-green-700 py-8">
          <CheckCircle2 className="w-10 h-10 text-green-500 animate-bounce" />
          <h5 className="font-bold text-sm">Parcel Synced Successfully!</h5>
          <p className="text-[10px] text-stone-500 max-w-[240px]">
            Updating 2D and 3D maps automatically...
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          
          {/* Section: Basic parameters */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] uppercase tracking-wider font-bold text-stone-500 mb-1 block">Edit Plot Number</label>
              <input
                type="text"
                value={plotNumber}
                onChange={(e) => setPlotNumber(e.target.value)}
                className="w-full text-xs p-1.5 px-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold text-stone-800"
                id="popup-input-plot-number"
              />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider font-bold text-stone-500 mb-1 block">Change Plot Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full text-xs p-1.5 px-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-stone-700 cursor-pointer"
                id="popup-select-plot-status"
              >
                <option value="available">🟢 Available</option>
                <option value="booked">🔴 Booked</option>
                <option value="ongoing">Reserved</option>
                <option value="sold">⚫ Sold</option>
              </select>
            </div>
          </div>

          {/* Section ID Check shape customization toggle */}
          <div className="flex flex-col gap-3 border-t pt-3 border-stone-150 animate-in fade-in duration-300">
            {!nodeCustomizationEnabled ? (
              <div className="bg-stone-50/80 p-3 rounded-xl border border-stone-200 flex items-center justify-between gap-3 shadow-inner">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-stone-600 flex items-center gap-1.5">
                    📐 Plot Node Customization
                  </span>
                  <span className="text-[9px] text-stone-400 mt-0.5 leading-normal">
                    Adjust and customize the plot shape and corner coordinates interactively.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setNodeCustomizationEnabled(true)}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-[10px] font-bold shadow rounded-lg cursor-pointer transition-all whitespace-nowrap"
                >
                  Enable option
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="bg-indigo-50/90 p-3 rounded-xl border border-indigo-200 flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-900 flex items-center gap-1.5">
                      📐 Node Customizer Enabled
                    </span>
                    <span className="text-[9px] text-indigo-700 mt-0.5 leading-normal">
                      Adjust the plot corners smoothly below.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNodeCustomizationEnabled(false)}
                    className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-bold border border-stone-350 rounded-lg cursor-pointer transition-all whitespace-nowrap animate-pulse"
                  >
                    Disable
                  </button>
                </div>

                {/* Presets and sizing controllers */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">Custom Boundaries Presetter</span>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'rectangle', label: '🔳 Rect' },
                      { id: 'trapezoid', label: '📐 Slant' },
                      { id: 'lshape', label: '📁 L-Shape' }
                    ].map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset.id as any)}
                        className="py-1 text-[10px] bg-stone-50 border border-stone-200 rounded-lg hover:bg-stone-100 text-stone-700 font-semibold cursor-pointer transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic canvas interactives descriptor */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[9px] font-bold text-stone-500 uppercase">
                    <span>Interactive Map Boundaries Board</span>
                    <span className="text-[8px] text-indigo-500 font-normal normal-case flex items-center gap-0.5">
                      <HelpCircle className="w-2.5 h-2.5" /> Drag corners or polygon shape
                    </span>
                  </div>
                  
                  {/* Visual canvas map board */}
                  <div className="relative border border-indigo-900 rounded-xl overflow-hidden shadow-inner flex justify-center bg-indigo-950">
                    <canvas
                      ref={canvasRef}
                      width={canvasWidth}
                      height={canvasHeight}
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUpOrLeave}
                      onMouseLeave={handleCanvasMouseUpOrLeave}
                      className="cursor-crosshair block"
                      id="canvas-popup-shape-editor"
                    />
                  </div>
                </div>



                {/* Real-time area calculations */}
                <div className="flex items-center justify-between bg-stone-50 p-2 rounded-lg border border-stone-150 text-[10px] text-stone-600 font-mono">
                  <span>Calculated legal area:</span>
                  <span className="font-bold text-stone-900">{area} SQ.M</span>
                </div>

                {/* Round coordinate nodes controls list */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">Rounded Corner Node Customizer</span>
                  <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-1.5 bg-stone-50/60 rounded-xl border border-stone-200 shadow-inner">
                    {localPoints.map((pt, idx) => (
                      <div 
                        key={idx} 
                        className={`flex items-center gap-1.5 p-1 px-2.5 rounded-full border text-[11px] font-medium transition-all ${
                          hoveredNodeIdx === idx || draggingNodeIdx === idx
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm scale-102 font-bold' 
                            : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300 shadow-sm'
                        }`}
                        onMouseEnter={() => setHoveredNodeIdx(idx)}
                        onMouseLeave={() => setHoveredNodeIdx(null)}
                      >
                        {/* Round visual indicator */}
                        <span className={`w-3.5 h-3.5 rounded-full inline-flex items-center justify-center text-[8px] font-bold text-white shrink-0 shadow-sm ${
                          idx === 0 ? 'bg-rose-500' : 'bg-amber-500'
                        }`}>
                          {idx + 1}
                        </span>
                        
                        {/* X coordinate rounded controller */}
                        <div className="flex items-center gap-1">
                          <span className="text-stone-400 font-bold font-mono">X</span>
                          <input
                            type="number"
                            step="1"
                            value={Math.round(pt.x)}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const updated = [...localPoints];
                              updated[idx] = { ...updated[idx], x: val };
                              setLocalPoints(updated);
                              calculateAreaForPoints(updated);
                            }}
                            className="w-10 bg-transparent hover:bg-stone-50 focus:bg-stone-50 border-none outline-none text-center font-bold font-mono text-stone-850 p-0 text-[10px] rounded-full"
                          />
                        </div>

                        {/* Divider */}
                        <span className="text-stone-300">|</span>

                        {/* Y coordinate rounded controller */}
                        <div className="flex items-center gap-1">
                          <span className="text-stone-400 font-bold font-mono">Y</span>
                          <input
                            type="number"
                            step="1"
                            value={Math.round(pt.y)}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const updated = [...localPoints];
                              updated[idx] = { ...updated[idx], y: val };
                              setLocalPoints(updated);
                              calculateAreaForPoints(updated);
                            }}
                            className="w-10 bg-transparent hover:bg-stone-50 focus:bg-stone-50 border-none outline-none text-center font-bold font-mono text-stone-850 p-0 text-[10px] rounded-full"
                          />
                        </div>

                        {/* Divider */}
                        <span className="text-stone-300">|</span>

                        {/* R coordinate rounded controller */}
                        <div className="flex items-center gap-1" title="Node Corner Radius">
                          <span className="text-stone-400 font-bold font-mono">R</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={cornerRadiuses[idx] || 0}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              const updated = [...cornerRadiuses];
                              updated[idx] = val;
                              setCornerRadiuses(updated);
                            }}
                            className="w-10 bg-transparent hover:bg-stone-50 focus:bg-stone-50 border-none outline-none text-center font-bold font-mono text-stone-850 p-0 text-[10px] rounded-full"
                          />
                        </div>

                        {/* Rounded delete node control */}
                        {localPoints.length > 3 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = localPoints.filter((_, i) => i !== idx);
                              const updatedR = cornerRadiuses.filter((_, i) => i !== idx);
                              setLocalPoints(updated);
                              setCornerRadiuses(updatedR);
                              calculateAreaForPoints(updated);
                            }}
                            className="w-4 h-4 rounded-full bg-stone-100 hover:bg-rose-100 hover:text-rose-600 inline-flex items-center justify-center text-[10px] border border-stone-200 transition-colors cursor-pointer select-none ml-0.5 font-bold"
                            title="Remove Node"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Rounded append node control */}
                    <button
                      type="button"
                      onClick={() => {
                        const last = localPoints[localPoints.length - 1] || { x: plot.coordinates.x, y: plot.coordinates.y };
                        const updated = [...localPoints, { x: last.x + 8, y: last.y + 8 }];
                        const updatedR = [...cornerRadiuses, 0];
                        setLocalPoints(updated);
                        setCornerRadiuses(updatedR);
                        calculateAreaForPoints(updated);
                      }}
                      className="flex items-center gap-1 p-1 px-3.5 rounded-full border border-dashed border-stone-350 hover:border-indigo-500 bg-white hover:bg-indigo-50/50 text-[11px] text-stone-600 hover:text-indigo-750 font-bold cursor-pointer transition-all shadow-sm"
                    >
                      <span className="text-xs">+</span> Add Node
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action triggers */}
          <div className="flex items-center gap-2 border-t pt-3 border-stone-100">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-1.5 border border-stone-250 hover:bg-stone-50 text-stone-600 font-semibold rounded-xl text-xs text-center cursor-pointer disabled:opacity-50"
              id="popup-btn-cancel"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveChanges}
              disabled={saving}
              className="flex-1 py-1.5 bg-stone-900 hover:bg-stone-850 disabled:bg-stone-400 text-white font-bold rounded-xl text-xs text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              id="popup-btn-save"
            >
              {saving ? 'Syncing...' : 'Save Changes'} <Save className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
