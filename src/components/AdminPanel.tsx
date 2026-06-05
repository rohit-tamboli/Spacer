import React, { useState, useRef, useEffect } from 'react';
import { Plot, Booking } from '../types';
import {
  FileCode,
  ShieldCheck,
  Lock,
  PlusCircle,
  TrendingUp,
  FileSpreadsheet,
  RefreshCw,
  Trash2,
  Edit,
  ClipboardList,
  Save,
  CheckCircle,
  XCircle,
  KeyRound,
  Download,
  UploadCloud,
  Wand2,
  MousePointer,
  Eraser,
  PenTool,
  CheckCheck,
  Compass
} from 'lucide-react';
import { getPlotVertices } from './TwoDMap';
import { drawHarmonyFarmsSitePlan } from './SitePlanRenderer';

interface AdminPanelProps {
  plots: Plot[];
  bookings: Booking[];
  onPlotsUpdated: (plots: Plot[]) => void;
  onBookingsUpdated: (bookings: Booking[]) => void;
  onReloadData: () => void;
  activeLayout?: 'demo' | 'custom';
  isAdminUnlocked?: boolean;
  onLock?: () => void;
  initialShapeEditingPlotId?: string | null;
  onClearInitialShapeEditingPlotId?: () => void;
  onSelectPlot: (plot: Plot) => void;
  allPlotsOpacity: number;
  onAllPlotsOpacityChange: (opacity: number) => void;
}

export default function AdminPanel({
  plots,
  bookings,
  onPlotsUpdated,
  onBookingsUpdated,
  onReloadData,
  activeLayout = 'demo',
  isAdminUnlocked,
  onLock,
  initialShapeEditingPlotId,
  onClearInitialShapeEditingPlotId,
  onSelectPlot,
  allPlotsOpacity,
  onAllPlotsOpacityChange
}: AdminPanelProps) {
  // Authentication states
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Synchronize authentication status with the top-level Admin password gate
  useEffect(() => {
    if (isAdminUnlocked) {
      setIsAdminLoggedIn(true);
    } else {
      setIsAdminLoggedIn(false);
    }
  }, [isAdminUnlocked]);

  // Plot modification form states
  const [editingPlotId, setEditingPlotId] = useState<string | null>(null);

  // --- SHAPE DESIGNER STATE ENGINES ---
  const [shapeEditingPlotId, setShapeEditingPlotId] = useState<string | null>(null);
  const [customPlotNumber, setCustomPlotNumber] = useState<string>('');
  const [customStatus, setCustomStatus] = useState<'available' | 'booked' | 'ongoing' | 'sold'>('available');
  const [customShapeType, setCustomShapeType] = useState<'rectangle' | 'trapezoid' | 'triangle' | 'lshape' | 'hexagon' | 'vertices'>('rectangle');
  const [customWidth, setCustomWidth] = useState<number>(30);
  const [customDepth, setCustomDepth] = useState<number>(40);
  const [customArea, setCustomArea] = useState<number>(1200);
  const [paramTrapezoidSlant, setParamTrapezoidSlant] = useState<number>(0);
  const [paramTrapezoidSkew, setParamTrapezoidSkew] = useState<number>(0);
  const [paramCutSizeX, setParamCutSizeX] = useState<number>(10);
  const [paramCutSizeY, setParamCutSizeY] = useState<number>(10);
  const [paramNotchW, setParamNotchW] = useState<number>(10);
  const [paramNotchD, setParamNotchD] = useState<number>(10);
  const [paramHexRadius, setParamHexRadius] = useState<number>(15);
  const [paramHexRotate, setParamHexRotate] = useState<number>(0);
  const [customVertices, setCustomVertices] = useState<{ x: number; y: number }[]>([]);
  const [draggingShapeNodeIdx, setDraggingShapeNodeIdx] = useState<number | null>(null);
  const [hoveredShapeNodeIdx, setHoveredShapeNodeIdx] = useState<number | null>(null);

  // Compute in-progress customized plot vertices
  const getShapePreviewPoints = (): { x: number; y: number }[] => {
    if (!shapeEditingPlotId) return [];
    const plot = plots.find(p => p.id === shapeEditingPlotId);
    if (!plot) return [];

    const cx = plot.coordinates.x;
    const cy = plot.coordinates.y;
    const w = customWidth;
    const d = customDepth;

    if (customShapeType === 'rectangle') {
      const hw = w / 2;
      const hd = d / 2;
      return [
        { x: cx - hw, y: cy - hd },
        { x: cx + hw, y: cy - hd },
        { x: cx + hw, y: cy + hd },
        { x: cx - hw, y: cy + hd }
      ];
    } else if (customShapeType === 'trapezoid') {
      const scaleBottom = paramTrapezoidSlant > 0 ? (1 - paramTrapezoidSlant) : 1;
      const scaleTop = paramTrapezoidSlant < 0 ? (1 + paramTrapezoidSlant) : 1;
      const hwFactorBottom = (w / 2) * scaleBottom;
      const hwFactorTop = (w / 2) * scaleTop;
      const hd = d / 2;
      const skewX = paramTrapezoidSkew * (w / 2);

      return [
        { x: cx - hwFactorBottom, y: cy - hd },
        { x: cx + hwFactorBottom, y: cy - hd },
        { x: cx + hwFactorTop + skewX, y: cy + hd },
        { x: cx - hwFactorTop + skewX, y: cy + hd }
      ];
    } else if (customShapeType === 'triangle') {
      const hw = w / 2;
      const hd = d / 2;
      const cutW = Math.min(paramCutSizeX, w - 1);
      const cutD = Math.min(paramCutSizeY, d - 1);

      return [
        { x: cx - hw, y: cy - hd },
        { x: cx + hw, y: cy - hd },
        { x: cx + hw, y: cy + hd - cutD },
        { x: cx + hw - cutW, y: cy + hd },
        { x: cx - hw, y: cy + hd }
      ];
    } else if (customShapeType === 'lshape') {
      const hw = w / 2;
      const hd = d / 2;
      const notchW = Math.min(paramNotchW, w - 1);
      const notchD = Math.min(paramNotchD, d - 1);

      return [
        { x: cx - hw, y: cy - hd },
        { x: cx + hw, y: cy - hd },
        { x: cx + hw, y: cy + hd - notchD },
        { x: cx + hw - notchW, y: cy + hd - notchD },
        { x: cx + hw - notchW, y: cy + hd },
        { x: cx - hw, y: cy + hd }
      ];
    } else if (customShapeType === 'hexagon') {
      const points = [];
      const R = paramHexRadius;
      const angleOffset = (paramHexRotate * Math.PI) / 180;
      for (let i = 0; i < 6; i++) {
        const theta = (i * Math.PI) / 3 + angleOffset;
        points.push({
          x: cx + R * Math.cos(theta),
          y: cy + R * Math.sin(theta)
        });
      }
      return points;
    } else {
      return customVertices;
    }
  };

  const handleInitShapeEditing = (id: string) => {
    const plot = plots.find(p => p.id === id);
    if (!plot) return;

    setShapeEditingPlotId(id);
    setStudioTab('shape');
    
    // Initialize standard values
    const w = plot.coordinates?.width || 20;
    const d = plot.coordinates?.depth || 35;
    setCustomWidth(w);
    setCustomDepth(d);
    setCustomArea(plot.area || (w * d));
    setCustomPlotNumber(plot.plotNumber);
    setCustomStatus(plot.status);

    if (plot.points && plot.points.length >= 3) {
      setCustomShapeType('vertices');
      setCustomVertices(plot.points);
    } else {
      setCustomShapeType('rectangle');
      setParamTrapezoidSlant(0);
      setParamTrapezoidSkew(0);
      setParamCutSizeX(w / 4);
      setParamCutSizeY(d / 4);
      setParamNotchW(w / 3);
      setParamNotchD(d / 3);
      setParamHexRadius(Math.max(w, d) / 2);
      setParamHexRotate(0);
    }
  };

  useEffect(() => {
    if (initialShapeEditingPlotId && plots && plots.length > 0) {
      handleInitShapeEditing(initialShapeEditingPlotId);
      if (onClearInitialShapeEditingPlotId) {
        onClearInitialShapeEditingPlotId();
      }
    }
  }, [initialShapeEditingPlotId, plots]);

  const handleSaveCustomShape = async () => {
    if (!shapeEditingPlotId) return;
    const plot = plots.find(p => p.id === shapeEditingPlotId);
    if (!plot) return;

    if (!customPlotNumber.trim()) {
      setStudioError('Plot number cannot be empty.');
      return;
    }

    // Verify plot number uniqueness if it was updated
    if (customPlotNumber.trim().toUpperCase() !== plot.plotNumber.toUpperCase()) {
      const isTaken = plots.some(p => p.id !== plot.id && p.plotNumber.toUpperCase() === customPlotNumber.trim().toUpperCase());
      if (isTaken) {
        setStudioError(`Plot number ${customPlotNumber} is already in use by another parcel.`);
        return;
      }
    }

    const previewPoints = getShapePreviewPoints();
    if (previewPoints.length < 3) {
      setStudioError('A shape must have at least 3 vertex coordinates.');
      return;
    }

    setStudioError('');
    setStudioStatusMsg('Updating parcel custom shape boundaries...');

    let sx = 0, sy = 0;
    previewPoints.forEach(pt => { sx += pt.x; sy += pt.y; });
    const cx = sx / previewPoints.length;
    const cy = sy / previewPoints.length;

    const xs = previewPoints.map(pt => pt.x);
    const ys = previewPoints.map(pt => pt.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const d = Math.max(...ys) - Math.min(...ys);

    const payload = {
      plotNumber: customPlotNumber.trim(),
      status: customStatus,
      coordinates: {
        x: Number(cx.toFixed(1)),
        y: Number(cy.toFixed(1)),
        z: plot.coordinates?.z || 0.5,
        width: Number(w.toFixed(1)),
        depth: Number(d.toFixed(1))
      },
      points: previewPoints,
      area: Number(customArea),
    };

    try {
      const res = await fetch(`/api/plots/${shapeEditingPlotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update custom plot shape.');
      }

      setStudioStatusMsg(`Successfully customized shape and info for Plot ${customPlotNumber}! Layout re-aligned instantly.`);
      setShapeEditingPlotId(null);
      onReloadData();
    } catch (err: any) {
      setStudioError(err.message);
    }
  };

  // --- ARCHITECTURAL STUDIO STATE ENGINES ---
  const [fileMime, setFileMime] = useState('');
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAiDetecting, setIsAiDetecting] = useState(false);
  const [studioStatusMsg, setStudioStatusMsg] = useState('');
  const [studioError, setStudioError] = useState('');
  const [aiDetectedPlots, setAiDetectedPlots] = useState<any[]>([]);
  const [studioTab, setStudioTab] = useState<'upload' | 'draw' | 'shape'>('upload');

  // Manual Coordinates polygon Drawing
  const [drawMode, setDrawMode] = useState<'inspect' | 'polygon'>('inspect');
  const [manualPoints, setManualPoints] = useState<{ x: number; y: number }[]>([]);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Manual Plot Metadata Values
  const [manualPlotNumber, setManualPlotNumber] = useState('');
  const [manualArea, setManualArea] = useState(450);
  const [manualPrice, setManualPrice] = useState(85000);
  const [manualFacing, setManualFacing] = useState<Plot['facing']>('North');
  const [manualLocation, setManualLocation] = useState('Central Enclave');

  // Draw Canvas references
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasBgImg, setCanvasBgImg] = useState<HTMLImageElement | null>(null);

  // Pre-load background image for local editor canvas
  useEffect(() => {
    if (activeLayout === 'custom') {
      const img = new Image();
      img.src = '/api/layout/image?' + Date.now();
      img.onload = () => {
        setCanvasBgImg(img);
      };
      img.onerror = () => {
        setCanvasBgImg(null);
      };
    } else {
      setCanvasBgImg(null);
    }
  }, [activeLayout, plots]);

  // Synchronize manual drawing updates to canvas
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // 1. Draw Background (Harmonized with the masterplan uploaded image styling!)
    if (canvasBgImg) {
      ctx.drawImage(canvasBgImg, 0, 0, w, h);
    } else {
      // Draw procedural Harmony Farms site plan as the fallback in administrative design traceboard!
      drawHarmonyFarmsSitePlan(ctx, w, h, (x, y) => {
        // Map logical map space (-300 to 300 x -215 to 215) to canvas pixel coordinates (0 to w x 0 to h)
        const cx = ((x + 300) / 600) * w;
        const cy = ((-y + 215) / 430) * h;
        return { x: cx, y: cy };
      }, w / 600); // Compute relative zoom ratio
    }

    // Centered coordinate mapping helpers
    const translateMapToCanvas = (mx: number, my: number) => {
      const cx = ((mx + 300) / 600) * w;
      const cy = ((-my + 215) / 430) * h;
      return { x: cx, y: cy };
    };

    // 2. Overlay existing plots
    plots.forEach(p => {
      const isEditingThisShape = p.id === shapeEditingPlotId;
      const vertices = isEditingThisShape ? getShapePreviewPoints() : getPlotVertices(p);
      if (vertices.length < 3) return;

      ctx.beginPath();
      const start = translateMapToCanvas(vertices[0].x, vertices[0].y);
      ctx.moveTo(start.x, start.y);
      for (let i = 1; i < vertices.length; i++) {
        const pt = translateMapToCanvas(vertices[i].x, vertices[i].y);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();

      if (isEditingThisShape) {
        // Glowing violet design overlay
        ctx.fillStyle = 'rgba(139, 92, 246, 0.35)';
        ctx.fill();
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Translucent cyan color for registered overlays
        ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(14, 165, 233, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw plot labels
      let sx = 0, sy = 0;
      vertices.forEach(v => { sx += v.x; sy += v.y; });
      const lc = translateMapToCanvas(sx / vertices.length, sy / vertices.length);

      if (isEditingThisShape) {
        ctx.fillStyle = '#8b5cf6';
        ctx.beginPath();
        ctx.arc(lc.x, lc.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      }
      ctx.font = 'bold 8.5px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.plotNumber, lc.x, lc.y);

      // Render vertex handle dots in shape designer mode
      if (isEditingThisShape) {
        vertices.forEach((v, idx) => {
          const coord = translateMapToCanvas(v.x, v.y);
          const isSpecial = hoveredShapeNodeIdx === idx || draggingShapeNodeIdx === idx;
          
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
          ctx.fillStyle = idx === 0 ? '#f43f5e' : '#f59e0b';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Inner white dot to make it look like a slider track/dial node
          ctx.beginPath();
          ctx.arc(coord.x, coord.y, isSpecial ? 2.2 : 1.2, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          ctx.fillStyle = isSpecial ? '#ffffff' : '#a5b4fc';
          ctx.font = isSpecial ? 'bold 10px monospace' : 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText((idx + 1).toString(), coord.x, coord.y - (isSpecial ? 10 : 8));
        });
      }
    });

    // 3. Draw active manual boundaries in progress
    if (manualPoints.length > 0) {
      ctx.beginPath();
      const startP = translateMapToCanvas(manualPoints[0].x, manualPoints[0].y);
      ctx.moveTo(startP.x, startP.y);
      for (let i = 1; i < manualPoints.length; i++) {
        const pt = translateMapToCanvas(manualPoints[i].x, manualPoints[i].y);
        ctx.lineTo(pt.x, pt.y);
      }

      if (cursorPos) {
        ctx.lineTo(cursorPos.x, cursorPos.y);
      }

      ctx.strokeStyle = '#f59e0b'; // Glowing Amber drawing polyline
      ctx.lineWidth = 2.5;
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw vector vertices circles
      manualPoints.forEach((p, idx) => {
        const coord = translateMapToCanvas(p.x, p.y);
        
        ctx.beginPath();
        ctx.arc(coord.x, coord.y, idx === 0 ? 6.5 : 5.5, 0, Math.PI * 2);
        ctx.fillStyle = idx === 0 ? '#f43f5e' : '#f59e0b';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(coord.x, coord.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });
    }

  }, [canvasBgImg, plots, manualPoints, cursorPos, drawMode, shapeEditingPlotId, customShapeType, customWidth, customDepth, paramTrapezoidSlant, paramTrapezoidSkew, paramCutSizeX, paramCutSizeY, paramNotchW, paramNotchD, paramHexRadius, paramHexRotate, customVertices, hoveredShapeNodeIdx, draggingShapeNodeIdx]);

  // Handle manual coordinate drawing clicks
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    // Convert pixel to map space coordinate
    const mx = (cx / rect.width) * 600 - 300;
    const my = -((cy / rect.height) * 430 - 215);

    if (drawMode !== 'inspect' && drawMode !== 'polygon') {
      return;
    }

    if (drawMode !== 'polygon') {
      // In Inspect / select mode, load shape customizer for clicked plot
      const clickedPlot = plots.find(p => {
        const vertices = getPlotVertices(p);
        const x = mx, y = my;
        let inside = false;
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
          const xi = vertices[i].x, yi = vertices[i].y;
          const xj = vertices[j].x, yj = vertices[j].y;
          const intersect = ((yi > y) !== (yj > y))
              && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        return inside;
      });

      if (clickedPlot) {
        handleInitShapeEditing(clickedPlot.id);
        setStudioStatusMsg(`🎯 Selected Plot ${clickedPlot.plotNumber} customization workspace.`);
      }
      return;
    }

    // Close polygon anchor click test limit
    if (manualPoints.length >= 3) {
      const first = manualPoints[0];
      const dist = Math.hypot(mx - first.x, my - first.y);
      if (dist < 18) {
        setStudioStatusMsg('Closed design polygon completed! Complete details and click save plot below.');
        return;
      }
    }

    setManualPoints(prev => [...prev, { x: mx, y: my }]);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    
    // Node hover & drag tracking for Shape Customizer
    if (drawMode === 'inspect' && shapeEditingPlotId) {
      const activeNodes = customShapeType === 'vertices' ? customVertices : getShapePreviewPoints();
      
      const hoveredIdx = activeNodes.findIndex(p => {
        const pcx = p.x + 300;
        const pcy = -p.y + 215;
        return Math.hypot(pcx - cx, pcy - cy) < 14; // click radius
      });
      setHoveredShapeNodeIdx(hoveredIdx !== -1 ? hoveredIdx : null);

      if (draggingShapeNodeIdx !== null) {
        const mx = cx - 300;
        const my = 215 - cy;
        
        let nodesToUpdate = activeNodes;
        if (customShapeType !== 'vertices') {
           nodesToUpdate = getShapePreviewPoints();
           setCustomShapeType('vertices');
        } else {
           nodesToUpdate = [...customVertices];
        }

        nodesToUpdate[draggingShapeNodeIdx] = { x: mx, y: my };
        setCustomVertices(nodesToUpdate);
        return; // Early return to avoid polygon drawing logic
      }
    }

    if (drawMode !== 'polygon' || manualPoints.length === 0) return;
    setCursorPos({ x: cx, y: cy });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawMode !== 'inspect' || !shapeEditingPlotId) return;

    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    const activeNodes = customShapeType === 'vertices' ? customVertices : getShapePreviewPoints();
    const nearbyIdx = activeNodes.findIndex(p => {
      const pcx = p.x + 300;
      const pcy = -p.y + 215;
      return Math.hypot(pcx - cx, pcy - cy) < 14;
    });

    if (nearbyIdx !== -1) {
      if (customShapeType !== 'vertices') {
         setCustomVertices(getShapePreviewPoints());
         setCustomShapeType('vertices');
      }
      setDraggingShapeNodeIdx(nearbyIdx);
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggingShapeNodeIdx(null);
  };

  // Switch layout mode on server
  const handleToggleLayout = async (type: 'demo' | 'custom') => {
    try {
      setStudioError('');
      setStudioStatusMsg('Toggling project active layout...');
      const res = await fetch('/api/layout/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeLayout: type,
          imageMimeType: type === 'custom' ? 'image/png' : '',
          width: 800,
          height: 500
        })
      });

      if (!res.ok) throw new Error('Failed to update active layout configurations.');
      
      onReloadData();
      setStudioStatusMsg(`Switched map layout base back to: ${type.toUpperCase()}`);
    } catch (err: any) {
      setStudioError(err.message);
    }
  };

  // Base64 layout image uploader
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdminLoggedIn) {
       setStudioError('Only admins can upload/replace images.');
       return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStudioError('');
    setStudioStatusMsg('Compiling layout file elements...');

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const payload = {
          image: reader.result as string,
          mimeType: file.type,
          filename: file.name
        };

        const res = await fetch('/api/layout/upload', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-token': 'mock-jwt-token-for-admin-spacer'
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to upload layout image.');
        }

        setStudioStatusMsg(`Architectural Map Layout [${file.name}] uploaded successfully! Custom layout is now active.`);
        onReloadData();
      } catch (err: any) {
        setStudioError(err.message || 'File upload failed.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setStudioError('Failed to read file from browser.');
      setIsUploading(false);
    };
  };

  // Trigger Gemini API for AI layout detection
  const handleAiAutoDetect = async () => {
    setIsAiDetecting(true);
    setStudioError('');
    setStudioStatusMsg('Reading architectural map via server-side Gemini vision API... (takes 5-8s)');
    setAiDetectedPlots([]);

    try {
      const res = await fetch('/api/layout/ai-detect', { method: 'POST' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gemini blueprint map analysis failed.');
      }

      const decoded = await res.json();
      if (decoded.plots && decoded.plots.length > 0) {
        // Map percentages from [0, -100] coordinates of image to map system
        const mappedList = decoded.plots.map((p: any) => {
          const points = p.polygonPercent.map((pt: any) => {
            const mx = (pt.x / 100) * 600 - 300;
            const my = -((pt.y / 100) * 430 - 215);
            return { x: mx, y: my };
          });

          // centroid calculation
          let sx = 0, sy = 0;
          points.forEach((pt: any) => { sx += pt.x; sy += pt.y; });
          const cx = sx / points.length;
          const cy = sy / points.length;

          const xs = points.map((pt: any) => pt.x);
          const ys = points.map((pt: any) => pt.y);
          const w = Math.max(...xs) - Math.min(...xs);
          const d = Math.max(...ys) - Math.min(...ys);

          return {
            plotNumber: p.plotNumber,
            area: Number(p.area || 450),
            price: Number(p.price || 55000),
            status: 'available',
            facing: p.facing || 'East',
            coordinates: {
              x: Number(cx.toFixed(1)),
              y: Number(cy.toFixed(1)),
              z: 0.5,
              width: Number(w.toFixed(1)),
              depth: Number(d.toFixed(1))
            },
            points: points,
            location: 'Sector Blueprints',
            roadWidth: 40,
            description: p.description || 'AI Auto-detected boundary from blueprint image.'
          };
        });

        setAiDetectedPlots(mappedList);
        setStudioStatusMsg(`🪄 Gemini auto-detected ${mappedList.length} plot boundaries successfully! Confirm lists below to import them.`);
      } else {
        setStudioStatusMsg('Completed analysis, but no individual plots were identified in layout canvas.');
      }
    } catch (err: any) {
      setStudioError(err.message || 'AI Auto-detection failed.');
    } finally {
      setIsAiDetecting(false);
    }
  };

  // Bulk import AI detected list to server
  const handleImportAiPlotsSubmit = async (replaceOption: boolean) => {
    if (aiDetectedPlots.length === 0) return;

    setStudioError('');
    setStudioStatusMsg('Importing AI boundaries to database...');

    try {
      if (replaceOption) {
        const clearRes = await fetch('/api/plots/reset', { method: 'POST' });
        if (!clearRes.ok) throw new Error('Failed to wipe database before clean import.');
      }

      const res = await fetch('/api/plots/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list: aiDetectedPlots })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Bulk-import upload failed.');
      }

      const info = await res.json();
      setAiDetectedPlots([]);
      setStudioStatusMsg(`Synced perfectly! ${info.message}`);
      
      // Auto toggle to custom setting
      await fetch('/api/layout/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeLayout: 'custom',
          imageMimeType: 'image/png',
          width: 800,
          height: 500
        })
      });

      onReloadData();
    } catch (err: any) {
      setStudioError(err.message);
    }
  };

  // Save manual path points drawn
  const handleSaveManualPolygon = async () => {
    if (!manualPlotNumber) {
      setStudioError('Please specify a Plot Number.');
      return;
    }
    if (manualPoints.length < 3) {
      setStudioError('A polygon must contain at least 3 vertices coordinates clicked on the map.');
      return;
    }

    setStudioError('');
    setStudioStatusMsg('Saving custom polygon plot...');

    let sx = 0, sy = 0;
    manualPoints.forEach((pt: any) => { sx += pt.x; sy += pt.y; });
    const cx = sx / manualPoints.length;
    const cy = sy / manualPoints.length;

    const xs = manualPoints.map((pt: any) => pt.x);
    const ys = manualPoints.map((pt: any) => pt.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const d = Math.max(...ys) - Math.min(...ys);

    const payload: Partial<Plot> = {
      plotNumber: manualPlotNumber,
      area: Number(manualArea),
      price: Number(manualPrice),
      status: 'available',
      facing: manualFacing,
      coordinates: {
        x: Number(cx.toFixed(1)),
        y: Number(cy.toFixed(1)),
        z: 0.5,
        width: Number(w.toFixed(1)),
        depth: Number(d.toFixed(1))
      },
      points: manualPoints,
      location: manualLocation,
      roadWidth: 30,
      description: 'Manually mapped vector polygon on custom layout overlay.'
    };

    try {
      const res = await fetch('/api/plots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save manual plot.');
      }

      setStudioStatusMsg(`Registered Plot ${manualPlotNumber} successfully! Changes are instantly live.`);
      setManualPlotNumber('');
      setManualPoints([]);
      setCursorPos(null);
      setDrawMode('inspect');
      onReloadData();
    } catch (err: any) {
      setStudioError(err.message);
    }
  };

  // New Plot data state
  const [newPlotNumber, setNewPlotNumber] = useState('');
  const [newArea, setNewArea] = useState(1200);
  const [newPrice, setNewPrice] = useState(50000);
  const [newStatus, setNewStatus] = useState<Plot['status']>('available');
  const [newFacing, setNewFacing] = useState<Plot['facing']>('East');
  const [newLocation, setNewLocation] = useState('Sector A: Park Avenue');
  const [newRoadWidth, setNewRoadWidth] = useState(30);
  const [newX, setNewX] = useState(0);
  const [newY, setNewY] = useState(0);
  const [newWidth, setNewWidth] = useState(20);
  const [newDepth, setNewDepth] = useState(35);
  const [newDescription, setNewDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Bulk import textbox state
  const [csvRawText, setCsvRawText] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');

  // Loader state
  const [formLoading, setFormLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Handle Admin Authorization Login
  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Authentication Failed');
      }

      setIsAdminLoggedIn(true);
      setUsername('');
      setPassword('');
    } catch (err: any) {
      setLoginError(err.message || 'Incorrect username or password.');
    }
  };

  // Create single plot
  const handleCreatePlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlotNumber) return;

    setFormLoading(true);
    setActionError('');

    const payload: Partial<Plot> = {
      plotNumber: newPlotNumber,
      area: Number(newArea),
      price: Number(newPrice),
      status: newStatus,
      facing: newFacing,
      coordinates: {
        x: Number(newX),
        y: Number(newY),
        z: 0.5,
        width: Number(newWidth),
        depth: Number(newDepth)
      },
      location: newLocation,
      roadWidth: Number(newRoadWidth),
      description: newDescription
    };

    try {
      const response = await fetch('/api/plots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errObj = await response.json();
        throw new Error(errObj.error || 'Failed to create plot.');
      }

      // Success reload
      onReloadData();
      
      // Reset creation form
      setNewPlotNumber('');
      setNewDesignationDefaults();
    } catch (err: any) {
      setActionError(err.message || 'Server error.');
    } finally {
      setFormLoading(false);
    }
  };

  const setNewDesignationDefaults = () => {
    setNewX(prev => prev + 25); // auto-increment coordinate to avoid overlaps
    setNewWidth(20);
    setNewDepth(35);
  };

  // Delete Plot
  const handleDeletePlot = async (id: string) => {
    console.log("Attempting to delete plot with id:", id);
    // if (!window.confirm('Are you absolute sure you want to delete this plot from database? This cannot be undone.')) return;
    try {
      const response = await fetch(`/api/plots/${id}`, { method: 'DELETE' });
      console.log("Delete response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete plot: ${response.status} ${errorText}`);
      }
      onReloadData();
    } catch (err: any) {
      console.error("Delete error:", err);
      alert(err.message);
    }
  };

  // Update existing plot status directly
  const handleUpdatePlotStatus = async (id: string, status: Plot['status']) => {
    try {
      const response = await fetch(`/api/plots/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Failed to update plot status');
      onReloadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Manage Bookings Holding Actions
  const handleUpdateBookingStatus = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Failed to change booking status');
      onReloadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!window.confirm('Delete this booking log row?')) return;
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete booking log');
      onReloadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Mass CSV Parser
  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError('');
    setBulkSuccess('');

    if (!csvRawText.trim()) {
      setBulkError('Please enter some comma separated coordinates to import.');
      return;
    }

    try {
      const lines = csvRawText.split('\n');
      const list: any[] = [];
      const headers = lines[0].toLowerCase().split(',');

      // Simple csv line parsing loop
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',');
        const rowObj: any = {};
        
        headers.forEach((header, index) => {
          rowObj[header.trim()] = values[index]?.trim();
        });

        if (rowObj.plotnumber) {
          list.push({
            plotNumber: rowObj.plotnumber,
            area: Number(rowObj.area || 1200),
            price: Number(rowObj.price || 48000),
            status: rowObj.status || 'available',
            facing: rowObj.facing || 'East',
            location: rowObj.location || 'Sector-A Imported',
            roadWidth: Number(rowObj.roadwidth || 30),
            description: rowObj.description || 'Imported via CSV template.'
          });
        }
      }

      if (list.length === 0) {
        throw new Error('No valid rows found. Check your heading column spelling: "plotNumber"');
      }

      const response = await fetch('/api/plots/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list })
      });

      if (!response.ok) {
        const errObj = await response.json();
        throw new Error(errObj.error || 'Failed to bulk-import.');
      }

      const result = await response.json();
      setBulkSuccess(result.message);
      setCsvRawText('');
      onReloadData();
    } catch (err: any) {
      setBulkError(err.message || 'Formatting error. Please verify spreadsheet alignment.');
    }
  };

  // Reset Master layout database
  const handleResetDB = async () => {
    if (!window.confirm('⚠️ WARNING: This will immediately delete ALL custom plots, wipes all bookings, and restore default layout settings. Proceed?')) return;
    
    try {
      const response = await fetch('/api/plots/reset', { method: 'POST' });
      if (!response.ok) throw new Error('Database reset failed');
      
      onReloadData();
      alert('Plots database reset successfully! Master Plan recovered.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!isAdminLoggedIn) {
    return (
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200 p-8 shadow-xl max-w-md mx-auto text-center animate-in fade-in duration-300" id="admin-login-lockscreen">
        <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-stone-200 text-stone-700">
          <Lock className="w-5 h-5 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 leading-none">Security Access Restricted</h2>
        <p className="text-xs text-stone-500 mt-2.5 max-w-xs mx-auto leading-normal">
          This system dashboard can only be unlocked by verified administrators. Please use the <strong>Admin</strong> security button located in the main header to authenticate.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200 p-6 shadow-xl flex flex-col gap-8" id="admin-authenticated-dashboard">
      
      
      <div className="flex justify-between items-center w-full px-2">
        <h2 className="text-xl font-bold text-stone-800">Admin Dashboard</h2>
        <div className="flex gap-4 items-center">
            <input
              type="file"
              ref={fileInputRef}
              accept=".png,.jpeg,.jpg"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-4 py-2 bg-stone-900 text-white font-bold cursor-pointer rounded-lg text-sm"
            >
                {isUploading ? 'Uploading...' : 'Upload Plot Layout Image'}
            </button>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">All Plots Opacity</span>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={allPlotsOpacity}
              onChange={(e) => onAllPlotsOpacityChange(parseFloat(e.target.value))}
              className="w-32 h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
          <button onClick={() => { localStorage.setItem('allPlotsOpacity', String(allPlotsOpacity)); alert('Opacity saved'); }} className="px-4 py-2 bg-indigo-600 text-white font-bold border border-indigo-700 cursor-pointer rounded-lg text-sm">Save</button>
          <button onClick={() => setIsAdminLoggedIn(false)} className="px-4 py-2 bg-stone-100 font-bold border border-stone-200 cursor-pointer rounded-lg text-sm">Lock Terminal</button>
        </div>
      </div>

      <div className="w-full">
        <h3 className="text-lg font-bold mb-4">Add New Plot</h3>
        <form onSubmit={handleCreatePlot} className="bg-stone-50 p-4 rounded-lg border border-stone-200">
          <input 
            type="text" 
            placeholder="Plot Number" 
            value={newPlotNumber}
            onChange={(e) => setNewPlotNumber(e.target.value)}
            className="w-full p-2 border rounded mb-2"
          />
          <button type="submit" className="w-full py-2 bg-green-600 text-white font-bold rounded">Create Plot</button>
        </form>
      </div>

      <div className="w-full">
        <h3 className="text-lg font-bold mb-4">Manage Plots ({plots.length})</h3>
        <div className="grid gap-2">
          {plots.map(plot => (
            <div key={plot.id} className="flex items-center justify-between bg-stone-50 p-3 rounded-lg border border-stone-200">
              <span className="font-mono font-bold text-stone-700">Plot {plot.plotNumber}</span>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); onSelectPlot(plot); }}
                  className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded hover:bg-indigo-200"
                >Customize</button>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleDeletePlot(plot.id); }}
                  className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded hover:bg-red-200"
                >Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
