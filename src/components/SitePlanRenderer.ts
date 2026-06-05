import { COORD_ROADS, AMENITIES_DATA } from '../defaultData';

export function drawHarmonyFarmsSitePlan(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  getCanvasCoords: (x: number, y: number, w: number, h: number) => { x: number; y: number },
  zoom: number
) {
  // 1. Deep sandy-ochre parchment masterplan base background
  ctx.fillStyle = '#cfc3b0';
  ctx.fillRect(0, 0, width, height);

  // 2. Draw Left Amenity Space
  const amCenter = getCanvasCoords(-225, -45, width, height);
  const amRad = 44 * zoom;
  ctx.fillStyle = '#bde5bc';
  ctx.strokeStyle = '#398b36';
  ctx.lineWidth = 1 * zoom;
  ctx.beginPath();
  ctx.arc(amCenter.x, amCenter.y, amRad, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Draw inner dotted border matching architectural visual styles
  ctx.strokeStyle = '#398b36a0';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(amCenter.x, amCenter.y, amRad - 4 * zoom, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#1e3f1e';
  ctx.font = `bold ${Math.max(9, 7 * zoom)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('AMENITY SPACE', amCenter.x, amCenter.y + 3 * zoom);

  // 3. Draw Right Open Space Enclave
  const osCenter = getCanvasCoords(225, -20, width, height);
  const osRad = 40 * zoom;
  ctx.fillStyle = '#bde5bc';
  ctx.strokeStyle = '#398b36';
  ctx.lineWidth = 1 * zoom;
  ctx.beginPath();
  ctx.arc(osCenter.x, osCenter.y, osRad, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner dash perimeter
  ctx.strokeStyle = '#398b36a0';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(osCenter.x, osCenter.y, osRad - 4 * zoom, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Blue Swimming Pool rendering (Twin kidneys)
  const poolCenter = getCanvasCoords(220, -12, width, height);
  const poolRad = 12 * zoom;
  
  // External sand pool deck border
  ctx.fillStyle = '#dfd3c0';
  ctx.strokeStyle = '#a69074';
  ctx.lineWidth = 1.5 * zoom;
  ctx.beginPath();
  ctx.arc(poolCenter.x, poolCenter.y, poolRad + 3 * zoom, 0, Math.PI * 2);
  ctx.arc(poolCenter.x + 13 * zoom, poolCenter.y - 8 * zoom, poolRad * 0.8 + 3 * zoom, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Water fill
  ctx.fillStyle = '#3bc2f2';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5 * zoom;
  ctx.beginPath();
  ctx.arc(poolCenter.x, poolCenter.y, poolRad, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(poolCenter.x + 13 * zoom, poolCenter.y - 8 * zoom, poolRad * 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Water ripple accents
  ctx.strokeStyle = '#ffffffa0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(poolCenter.x - 3 * zoom, poolCenter.y + 2 * zoom, poolRad * 0.5, -Math.PI / 3, Math.PI / 3);
  ctx.stroke();

  // Circular Resort Sun-Gazebo Umbrella
  const gzCenter = getCanvasCoords(238, -32, width, height);
  const gzSize = 10 * zoom;
  
  // Shadow
  ctx.fillStyle = '#0000001a';
  ctx.beginPath();
  ctx.arc(gzCenter.x + 2 * zoom, gzCenter.y + 2 * zoom, gzSize, 0, Math.PI * 2);
  ctx.fill();

  // Cover
  ctx.fillStyle = '#b08151';
  ctx.strokeStyle = '#5c3814';
  ctx.lineWidth = 1 * zoom;
  ctx.beginPath();
  ctx.arc(gzCenter.x, gzCenter.y, gzSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Radial segments spokes
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5;
    ctx.moveTo(gzCenter.x, gzCenter.y);
    ctx.lineTo(gzCenter.x + gzSize * Math.cos(angle), gzCenter.y + gzSize * Math.sin(angle));
  }
  ctx.stroke();

  ctx.fillStyle = '#1e3f1e';
  ctx.font = `bold ${Math.max(9, 7 * zoom)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('OPEN SPACE', osCenter.x, osCenter.y + 24 * zoom);


  // 4. Draw Roads (slate grey #828691)
  COORD_ROADS.forEach(road => {
    const rPos = getCanvasCoords(road.x, road.y, width, height);
    const rW = road.width * zoom;
    const rD = road.depth * zoom;

    ctx.fillStyle = '#828691';
    if (road.horizontal) {
      ctx.fillRect(rPos.x - rW / 2, rPos.y - rD / 2, rW, rD);
      
      // Parallel bounding curbs
      ctx.strokeStyle = '#ffffffb0';
      ctx.lineWidth = 1 * zoom;
      ctx.beginPath();
      ctx.moveTo(rPos.x - rW / 2, rPos.y - rD / 2);
      ctx.lineTo(rPos.x + rW / 2, rPos.y - rD / 2);
      ctx.moveTo(rPos.x - rW / 2, rPos.y + rD / 2);
      ctx.lineTo(rPos.x + rW / 2, rPos.y + rD / 2);
      ctx.stroke();

      // Street names label
      ctx.fillStyle = '#f0f3f5';
      ctx.font = `bold ${Math.max(6.5, 4.5 * zoom)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('9.00 M INTERNAL ROAD', rPos.x, rPos.y);
    } else {
      ctx.fillRect(rPos.x - rW / 2, rPos.y - rD / 2, rW, rD);

      ctx.strokeStyle = '#ffffffb0';
      ctx.lineWidth = 1 * zoom;
      ctx.beginPath();
      ctx.moveTo(rPos.x - rW / 2, rPos.y - rD / 2);
      ctx.lineTo(rPos.x - rW / 2, rPos.y + rD / 2);
      ctx.moveTo(rPos.x + rW / 2, rPos.y - rD / 2);
      ctx.lineTo(rPos.x + rW / 2, rPos.y + rD / 2);
      ctx.stroke();

      ctx.save();
      ctx.translate(rPos.x, rPos.y);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#f0f3f5';
      ctx.font = `bold ${Math.max(6.5, 4.5 * zoom)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('9.00 M INTERNAL ROAD', 0, 0);
      ctx.restore();
    }
  });


  // 5. Draw Dotted Orange-Green border Trees Rows (matching visual layout details)
  const treeList = [
    // Left boundary vertical alignment
    { x: -195, y: -78 }, { x: -195, y: -64 }, { x: -195, y: -50 }, { x: -195, y: -36 }, { x: -195, y: -22 }, { x: -195, y: -8 }, { x: -195, y: 6 },
    // Curves top artery alignment
    { x: -180, y: 3 }, { x: -164, y: 9 }, { x: -148, y: 15 }, { x: -132, y: 21 }, { x: -116, y: 27 }, { x: -100, y: 33 }, 
    { x: -84, y: 39 }, { x: -68, y: 44 }, { x: -52, y: 46 }, { x: -36, y: 48 }, { x: -20, y: 49 }, { x: -4, y: 50 },
    { x: 12, y: 51 }, { x: 28, y: 52 }, { x: 44, y: 53 }, { x: 60, y: 54 }, { x: 76, y: 55 }, { x: 92, y: 55 }, { x: 108, y: 55 }, { x: 124, y: 55 }, { x: 140, y: 54 },
    // Right boundary vertical
    { x: 140, y: -62 }, { x: 140, y: -48 }, { x: 140, y: -34 }, { x: 140, y: -20 }, { x: 140, y: -6 }, { x: 140, y: 8 },
    // Bottom boundary internal alignment
    { x: 30, y: -78 }, { x: 46, y: -78 }, { x: 62, y: -78 }, { x: 78, y: -78 }, { x: 94, y: -78 }, { x: 110, y: -78 }, { x: 126, y: -78 }, { x: 142, y: -78 }
  ];

  treeList.forEach(tree => {
    const tPos = getCanvasCoords(tree.x, tree.y, width, height);
    const radius = 4 * zoom;

    // Shadows
    ctx.fillStyle = '#00000010';
    ctx.beginPath();
    ctx.arc(tPos.x + 1 * zoom, tPos.y + 1 * zoom, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2d6a31'; 
    ctx.strokeStyle = '#e67e22'; // Dotted orange fruits border look
    ctx.lineWidth = 1 * zoom;
    ctx.beginPath();
    ctx.arc(tPos.x, tPos.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner bright leaves highlights
    ctx.fillStyle = '#4c9e47';
    ctx.beginPath();
    ctx.arc(tPos.x - radius * 0.25, tPos.y - radius * 0.25, radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
  });


  // 6. Black Site Plan Shield & Logo (Top Center-Left)
  const logoCenter = getCanvasCoords(-90, 115, width, height);
  const logoW = 56 * zoom;
  const logoH = 44 * zoom;

  // Solid black block
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(logoCenter.x - logoW / 2, logoCenter.y - logoH / 2, logoW, logoH);

  // Golden circular ring for goat mascot
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 1.2 * zoom;
  ctx.beginPath();
  ctx.arc(logoCenter.x, logoCenter.y - 4 * zoom, 11 * zoom, 0, Math.PI * 2);
  ctx.stroke();

  // Draw elegant stylized white goat symbol
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  // Goat head point
  ctx.moveTo(logoCenter.x, logoCenter.y);
  ctx.lineTo(logoCenter.x - 3 * zoom, logoCenter.y - 8 * zoom);
  ctx.lineTo(logoCenter.x - 6 * zoom, logoCenter.y - 11 * zoom); // Left horn
  ctx.lineTo(logoCenter.x - 4 * zoom, logoCenter.y - 6 * zoom);
  ctx.lineTo(logoCenter.x, logoCenter.y - 3 * zoom);
  ctx.lineTo(logoCenter.x + 4 * zoom, logoCenter.y - 6 * zoom);
  ctx.lineTo(logoCenter.x + 6 * zoom, logoCenter.y - 11 * zoom); // Right horn
  ctx.lineTo(logoCenter.x + 3 * zoom, logoCenter.y - 8 * zoom);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(logoCenter.x, logoCenter.y - 1.5 * zoom, 3 * zoom, 0, Math.PI * 2);
  ctx.fill();

  // Branding text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(5.5, 4.2 * zoom)}px serif`;
  ctx.textAlign = 'center';
  ctx.fillText('HARMONY FARMS', logoCenter.x, logoCenter.y + 11 * zoom);
  
  ctx.fillStyle = '#ca8a04';
  ctx.font = `${Math.max(3.8, 2.8 * zoom)}px sans-serif`;
  ctx.fillText('LEADING THE HERD...', logoCenter.x, logoCenter.y + 15 * zoom);

  // Label "site plan" under black shield block
  ctx.fillStyle = '#1c1917';
  ctx.font = `bold ${Math.max(11, 9 * zoom)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('site plan', logoCenter.x, logoCenter.y + logoH / 2 + 11 * zoom);


  // 7. Area Statement Table (Top Left)
  const tblCenter = getCanvasCoords(-200, 105, width, height);
  const tblW = 90 * zoom;
  const tblH = 104 * zoom;

  ctx.fillStyle = '#fdfcf7';
  ctx.strokeStyle = '#292524';
  ctx.lineWidth = 0.75 * zoom;
  ctx.fillRect(tblCenter.x - tblW / 2, tblCenter.y - tblH / 2, tblW, tblH);
  ctx.strokeRect(tblCenter.x - tblW / 2, tblCenter.y - tblH / 2, tblW, tblH);

  // Table heading title
  ctx.fillStyle = '#292524';
  ctx.font = `bold ${Math.max(6, 4 * zoom)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('PLOT AREA STATEMENT IN SQ.M', tblCenter.x, tblCenter.y - tblH / 2 + 7 * zoom);

  ctx.beginPath();
  ctx.moveTo(tblCenter.x - tblW / 2, tblCenter.y - tblH / 2 + 11 * zoom);
  ctx.lineTo(tblCenter.x + tblW / 2, tblCenter.y - tblH / 2 + 11 * zoom);
  ctx.stroke();

  // Column titles: PLOT NO | PLOT AREA | PLOT NO | PLOT AREA
  const cY = tblCenter.y - tblH / 2 + 16 * zoom;
  ctx.font = `bold ${Math.max(5.2, 3.6 * zoom)}px sans-serif`;
  ctx.fillText('PLOT NO', tblCenter.x - tblW * 0.38, cY);
  ctx.fillText('PLOT AREA', tblCenter.x - tblW * 0.13, cY);
  ctx.fillText('PLOT NO', tblCenter.x + tblW * 0.13, cY);
  ctx.fillText('PLOT AREA', tblCenter.x + tblW * 0.38, cY);

  ctx.beginPath();
  // Dividers
  ctx.moveTo(tblCenter.x - tblW / 2, tblCenter.y - tblH / 2 + 20 * zoom);
  ctx.lineTo(tblCenter.x + tblW / 2, tblCenter.y - tblH / 2 + 20 * zoom);
  ctx.moveTo(tblCenter.x, tblCenter.y - tblH / 2 + 11 * zoom);
  ctx.lineTo(tblCenter.x, tblCenter.y + tblH / 2);
  ctx.moveTo(tblCenter.x - tblW * 0.25, tblCenter.y - tblH / 2 + 11 * zoom);
  ctx.lineTo(tblCenter.x - tblW * 0.25, tblCenter.y + tblH / 2);
  ctx.moveTo(tblCenter.x + tblW * 0.25, tblCenter.y - tblH / 2 + 11 * zoom);
  ctx.lineTo(tblCenter.x + tblW * 0.25, tblCenter.y + tblH / 2);
  ctx.stroke();

  // Grid list data lines
  const dataList = [
    { n1: '01', v1: '438.34', n2: '11', v2: '545.83' },
    { n1: '02', v1: '416.28', n2: '12', v2: '446.53' },
    { n1: '03', v1: '493.58', n2: '13', v2: '453.23' },
    { n1: '04', v1: '511.41', n2: '14', v2: '422.51' },
    { n1: '05', v1: '509.49', n2: '15', v2: '444.26' },
    { n1: '06', v1: '575.07', n2: '16', v2: '401.77' },
    { n1: '07', v1: '500.83', n2: '17', v2: '412.74' },
    { n1: '08', v1: '500.11', n2: 'TOTAL PLOT', v2: 'AREA' },
    { n1: '09', v1: '500.87', n2: '8120.80', v2: 'SQ.M' },
    { n1: '10', v1: '547.95', n2: '', v2: '' }
  ];

  ctx.font = `${Math.max(5.2, 3.6 * zoom)}px monospace`;
  dataList.forEach((row, idx) => {
    const rowY = tblCenter.y - tblH / 2 + 26 * zoom + idx * 7 * zoom;
    ctx.fillText(row.n1, tblCenter.x - tblW * 0.38, rowY);
    ctx.fillText(row.v1, tblCenter.x - tblW * 0.13, rowY);
    
    if (row.n2 === 'TOTAL PLOT' || row.n2 === '8120.80') {
      ctx.font = `bold ${Math.max(4.8, 3.2 * zoom)}px sans-serif`;
      ctx.fillText(row.n2, tblCenter.x + tblW * 0.13, rowY);
      ctx.fillText(row.v2, tblCenter.x + tblW * 0.38, rowY);
      ctx.font = `${Math.max(5.2, 3.6 * zoom)}px monospace`;
    } else {
      ctx.fillText(row.n2, tblCenter.x + tblW * 0.13, rowY);
      ctx.fillText(row.v2, tblCenter.x + tblW * 0.38, rowY);
    }

    // Row lines
    ctx.strokeStyle = '#29252425';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(tblCenter.x - tblW / 2, rowY + 2 * zoom);
    ctx.lineTo(tblCenter.x + tblW / 2, rowY + 2 * zoom);
    ctx.stroke();
  });
}
