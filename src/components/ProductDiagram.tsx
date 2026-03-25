import { useMemo } from 'react';

// 10 predefined colors
export const COLOR_OPTIONS = [
  { value: 'bianco', label: 'Bianco', hex: '#F5F5F0' },
  { value: 'avorio', label: 'Avorio', hex: '#FFFFF0' },
  { value: 'grigio_chiaro', label: 'Grigio chiaro', hex: '#C0C0C0' },
  { value: 'grigio_antracite', label: 'Grigio antracite', hex: '#4A4A4A' },
  { value: 'marrone', label: 'Marrone', hex: '#6B4226' },
  { value: 'noce', label: 'Noce', hex: '#8B6914' },
  { value: 'verde_scuro', label: 'Verde scuro', hex: '#2E5735' },
  { value: 'blu_notte', label: 'Blu notte', hex: '#1B2A4A' },
  { value: 'rosso_mattone', label: 'Rosso mattone', hex: '#8B3A3A' },
  { value: 'nero', label: 'Nero', hex: '#2A2A2A' },
];

export function getColorHex(value: string): string {
  return COLOR_OPTIONS.find(c => c.value === value)?.hex || '#F5F5F0';
}

// Glass color - NEVER changes regardless of frame color
const GLASS_COLOR = 'rgba(200, 230, 255, 0.25)';
const GLASS_STROKE = 'rgba(160, 200, 230, 0.5)';

// Helper to darken/lighten a hex color for pantograph grooves
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xFF) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xFF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xFF) + amount));
  return `rgb(${r},${g},${b})`;
}

interface ProductDiagramProps {
  productType: string;
  widthMm: string;
  heightMm: string;
  depthMm: string;
  numPanels: string;
  panelType: string;
  openingDirection: string;
  handleType: string;
  glassType: string;
  frameType?: string;
  colorInternal?: string;
  colorExternal?: string;
  internalSpaceMm?: string;
  externalSpaceMm?: string;
  view?: 'internal' | 'external';
  doorColorHex?: string;
  doorHandleFinishId?: string;
  doorHandleModelId?: string;
  doorModelId?: string;
}

export default function ProductDiagram({
  productType,
  widthMm,
  heightMm,
  depthMm,
  numPanels,
  panelType,
  openingDirection,
  handleType,
  glassType,
  frameType = 'standard',
  colorInternal = '',
  colorExternal = '',
  internalSpaceMm = '',
  externalSpaceMm = '',
  view,
  doorColorHex,
  doorHandleFinishId,
  doorHandleModelId,
  doorModelId,
}: ProductDiagramProps) {
  const w = parseInt(widthMm) || 1200;
  const h = parseInt(heightMm) || 1400;
  const d = parseInt(depthMm) || 70;
  const panels = parseInt(numPanels) || 1;
  const intSpace = parseInt(internalSpaceMm) || 0;
  const extSpace = parseInt(externalSpaceMm) || 0;

  const colInt = getColorHex(colorInternal);
  const colExt = getColorHex(colorExternal);
  const frontColor = view === 'internal' ? colInt : colExt;
  const sideColor = view === 'internal' ? colExt : colInt;

  const frameThickness = frameType === 'ridotto' ? 4 : frameType === 'maggiorato' ? 10 : 7;

  const svgW = 420;
  const svgH = 500;
  const margin = 85;

  // 3D perspective offsets
  const depthScale = Math.min(d / 400, 0.3);
  const dxOff = 30 * depthScale + 10;
  const dyOff = 20 * depthScale + 8;

  const maxDrawW = svgW - margin * 2 - dxOff;
  const maxDrawH = svgH - margin * 2 - dyOff;
  const scale = Math.min(maxDrawW / w, maxDrawH / h);
  const drawW = w * scale;
  const drawH = h * scale;
  const offsetX = margin;
  const offsetY = margin + dyOff + 10;

  const panelWidth = drawW / panels;
  const handleY = offsetY + drawH * 0.55;

  const glassLabel = useMemo(() => {
    const map: Record<string, string> = {
      doppio: 'Doppio vetro',
      triplo: 'Triplo vetro',
      basso_emissivo: 'Basso emissivo',
      antisfondamento: 'Antisfondamento',
      satinato: 'Satinato',
      selettivo: 'Selettivo',
    };
    return map[glassType] || '';
  }, [glassType]);

  // Helper: 3D top face
  const topFace = (x: number, y: number, fw: number, dx: number, dy: number, fill: string) => (
    <polygon
      points={`${x},${y} ${x + fw},${y} ${x + fw + dx},${y - dy} ${x + dx},${y - dy}`}
      fill={fill} stroke="hsl(var(--foreground))" strokeWidth="1" opacity="0.85"
    />
  );
  // Helper: 3D right face
  const rightFace = (x: number, y: number, fh: number, dx: number, dy: number, fill: string) => (
    <polygon
      points={`${x},${y} ${x + dx},${y - dy} ${x + dx},${y - dy + fh} ${x},${y + fh}`}
      fill={fill} stroke="hsl(var(--foreground))" strokeWidth="1" opacity="0.7"
    />
  );

  // Space labels - positioned well away from dimension labels
  const spaceLabels = () => (
    <g>
      {intSpace > 0 && (
        <text x={offsetX} y={offsetY + drawH + 40} fontSize="8" fill="hsl(var(--accent))" fontFamily="monospace" textAnchor="start">
          Int. {intSpace}mm
        </text>
      )}
      {extSpace > 0 && (
        <text x={offsetX + drawW + dxOff + 18} y={offsetY + drawH * 0.8} fontSize="8" fill="hsl(var(--accent))" fontFamily="monospace" textAnchor="start">
          Est. {extSpace}mm
        </text>
      )}
    </g>
  );

  // Handle drawing
  const drawHandle = (hx: number, hy: number) => {
    if (handleType === 'design') {
      return (
        <g>
          <rect x={hx} y={hy} width={3} height={22} rx={1.5} fill="hsl(var(--foreground))" />
          <circle cx={hx + 1.5} cy={hy} r={3} fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
          <circle cx={hx + 1.5} cy={hy + 22} r={2} fill="hsl(var(--foreground))" />
        </g>
      );
    }
    if (handleType === 'con_chiave') {
      return (
        <g>
          <rect x={hx} y={hy} width={4} height={18} rx={2} fill="hsl(var(--foreground))" />
          <circle cx={hx + 2} cy={hy + 24} r={4} fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.2" />
          <line x1={hx + 2} y1={hy + 22} x2={hx + 2} y2={hy + 26} stroke="hsl(var(--foreground))" strokeWidth="1" />
          <line x1={hx + 0.5} y1={hy + 25} x2={hx + 3.5} y2={hy + 25} stroke="hsl(var(--foreground))" strokeWidth="0.8" />
        </g>
      );
    }
    return <rect x={hx} y={hy} width={4} height={18} rx={2} fill="hsl(var(--foreground))" />;
  };

  // Door handle (round knob for porta)
  const drawDoorHandle = (hx: number, hy: number) => {
    if (handleType === 'design') {
      return (
        <g>
          <rect x={hx} y={hy - 30} width={4} height={60} rx={2} fill="hsl(var(--foreground))" />
          <circle cx={hx + 2} cy={hy - 32} r={3} fill="hsl(var(--foreground))" />
        </g>
      );
    }
    if (handleType === 'con_chiave') {
      return (
        <g>
          <rect x={hx} y={hy - 25} width={4} height={50} rx={2} fill="hsl(var(--foreground))" />
          <circle cx={hx + 2} cy={hy + 30} r={4} fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.2" />
          <line x1={hx + 0.5} y1={hy + 30} x2={hx + 3.5} y2={hy + 30} stroke="hsl(var(--foreground))" strokeWidth="0.8" />
        </g>
      );
    }
    // Standard door handle - lever style
    return (
      <g>
        <rect x={hx} y={hy - 20} width={4} height={40} rx={2} fill="hsl(var(--foreground))" />
        <rect x={hx - 1} y={hy - 2} width={14} height={4} rx={2} fill="hsl(var(--foreground))" />
      </g>
    );
  };

  if (productType === 'zanzariera') {
    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-sm mx-auto">
        {topFace(offsetX, offsetY, drawW, dxOff, dyOff, '#E8E8E8')}
        {rightFace(offsetX + drawW, offsetY, drawH, dxOff, dyOff, '#D0D0D0')}
        <rect x={offsetX} y={offsetY} width={drawW} height={drawH} fill="#F0F0F0" stroke="hsl(var(--foreground))" strokeWidth="2" />
        <rect x={offsetX + 4} y={offsetY + 4} width={drawW - 8} height={drawH - 8} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeDasharray="4 2" />
        {Array.from({ length: Math.floor((drawW - 16) / 8) }).map((_, i) => (
          <line key={`v${i}`} x1={offsetX + 8 + i * 8} y1={offsetY + 8} x2={offsetX + 8 + i * 8} y2={offsetY + drawH - 8} stroke="hsl(var(--muted-foreground))" strokeWidth="0.3" opacity="0.4" />
        ))}
        {Array.from({ length: Math.floor((drawH - 16) / 8) }).map((_, i) => (
          <line key={`h${i}`} x1={offsetX + 8} y1={offsetY + 8 + i * 8} x2={offsetX + drawW - 8} y2={offsetY + 8 + i * 8} stroke="hsl(var(--muted-foreground))" strokeWidth="0.3" opacity="0.4" />
        ))}
        <DimensionH x={offsetX} y={offsetY - dyOff - 28} width={drawW} label={`${w}`} />
        <DimensionV x={offsetX - 32} y={offsetY} height={drawH} label={`${h}`} />
        <DepthDimLabel x={offsetX + drawW + 8} y={offsetY - 8} dx={dxOff} dy={dyOff} label={`${d}`} />
        {spaceLabels()}
      </svg>
    );
  }

  if (productType === 'persiana') {
    const slats = Math.floor(drawH / 12);
    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-sm mx-auto">
        {topFace(offsetX, offsetY, drawW, dxOff, dyOff, frontColor)}
        {rightFace(offsetX + drawW, offsetY, drawH, dxOff, dyOff, sideColor)}
        <rect x={offsetX} y={offsetY} width={drawW} height={drawH} fill={frontColor} stroke="hsl(var(--foreground))" strokeWidth="2.5" />
        {Array.from({ length: slats }).map((_, i) => (
          <line key={i} x1={offsetX + 4} y1={offsetY + 6 + i * (drawH / slats)} x2={offsetX + drawW - 4} y2={offsetY + 6 + i * (drawH / slats)} stroke="hsl(var(--foreground))" strokeWidth="1" opacity="0.5" />
        ))}
        <DimensionH x={offsetX} y={offsetY - dyOff - 28} width={drawW} label={`${w}`} />
        <DimensionV x={offsetX - 32} y={offsetY} height={drawH} label={`${h}`} />
        <DepthDimLabel x={offsetX + drawW + 8} y={offsetY - 8} dx={dxOff} dy={dyOff} label={`${d}`} />
        {spaceLabels()}
      </svg>
    );
  }

  if (productType === 'basculante') {
    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-sm mx-auto">
        {topFace(offsetX, offsetY, drawW, dxOff, dyOff, frontColor)}
        {rightFace(offsetX + drawW, offsetY, drawH, dxOff, dyOff, sideColor)}
        <rect x={offsetX} y={offsetY} width={drawW} height={drawH} fill={frontColor} stroke="hsl(var(--foreground))" strokeWidth="2.5" />
        <rect x={offsetX + 6} y={offsetY + 6} width={drawW - 12} height={drawH - 12} fill={GLASS_COLOR} stroke={GLASS_STROKE} strokeWidth="1.5" />
        {[1, 2, 3].map(i => (
          <line key={i} x1={offsetX + 6} y1={offsetY + 6 + i * ((drawH - 12) / 4)} x2={offsetX + drawW - 6} y2={offsetY + 6 + i * ((drawH - 12) / 4)} stroke="hsl(var(--muted-foreground))" strokeWidth="0.8" />
        ))}
        <rect x={offsetX + drawW / 2 - 15} y={offsetY + drawH - 30} width={30} height={4} rx={2} fill="hsl(var(--foreground))" />
        <DimensionH x={offsetX} y={offsetY - dyOff - 28} width={drawW} label={`${w}`} />
        <DimensionV x={offsetX - 32} y={offsetY} height={drawH} label={`${h}`} />
        <DepthDimLabel x={offsetX + drawW + 8} y={offsetY - 8} dx={dxOff} dy={dyOff} label={`${d}`} />
        {spaceLabels()}
      </svg>
    );
  }

  if (productType === 'porta') {
    const hasGlass = !!glassType && glassType !== 'cieca';
    const doorColor = doorColorHex || frontColor;
    const isScorrevole = panelType === 'scorrevole';
    
    // "Apertura sinistra" = hinges LEFT, handle RIGHT (external view)
    // "Apertura destra" = hinges RIGHT, handle LEFT (external view)
    const isInternal = view === 'internal';
    // External: sinistra => handle RIGHT, destra => handle LEFT
    const handleOnRight_ext = openingDirection === 'sinistra';
    // Internal view mirrors everything
    const effectiveHandleRight = isInternal ? !handleOnRight_ext : handleOnRight_ext;
    
    // Handle finish color
    const getHandleColor = () => {
      switch (doorHandleFinishId) {
        case 'cromo_satinato': return '#B8B8B8';
        case 'cromo_lucido': return '#E0E0E0';
        case 'bianco_optical': return '#F0F0EC';
        case 'nero': return '#2A2A2A';
        case 'grigio_alluminio': return '#A0A0A0';
        default: return '#B8B8B8';
      }
    };
    const handleColor = getHandleColor();

    // Door panel positions
    const handleX = effectiveHandleRight ? offsetX + drawW - 22 : offsetX + 18;
    const hingeX = effectiveHandleRight ? offsetX + 2 : offsetX + drawW - 6;
    // Lever points OUTWARD from the door edge (away from center)
    const leverDir = effectiveHandleRight ? 1 : -1;

    // Yncisa 70 specific pantograph pattern
    const renderYncisa70Pattern = () => {
      // The pattern has:
      // 1. Vertical lines on the right ~60% of the door from top to ~55%
      // 2. A large U-curve that goes down from the vertical lines area
      // 3. Concentric arcs below the U
      // 4. A smaller concentric pattern at bottom-right
      
      const isYncisa = doorModelId === 'yncisa_70';
      if (!isYncisa) {
        // Generic door - simple panels
        return (
          <g>
            <rect x={offsetX + 12} y={offsetY + 12} width={drawW - 24} height={(drawH - 24) * 0.28} rx={2} fill="none" stroke={doorColor} strokeWidth="0.8" opacity="0.2" filter="url(#pantograph)" />
            <rect x={offsetX + 12} y={offsetY + 12 + (drawH - 24) * 0.32} width={drawW - 24} height={(drawH - 24) * 0.63} rx={2} fill="none" stroke={doorColor} strokeWidth="0.8" opacity="0.2" filter="url(#pantograph)" />
          </g>
        );
      }

      // Yncisa 70 faithful rendering
      const doorL = offsetX;
      const doorT = offsetY;
      const doorR = offsetX + drawW;
      const doorB = offsetY + drawH;
      const dw = drawW;
      const dh = drawH;

      // Handle side is plain, lines are on the hinge side
      const linesOnLeft = !effectiveHandleRight;
      
      // Vertical lines region: about 5 lines spanning ~55% of width on the non-handle side
      const lineStartX = linesOnLeft ? doorL + dw * 0.12 : doorL + dw * 0.35;
      const lineEndX = linesOnLeft ? doorL + dw * 0.65 : doorL + dw * 0.88;
      const lineSpacing = (lineEndX - lineStartX) / 5;
      const lineTopY = doorT + 10;
      const lineBottomY = doorT + dh * 0.55;

      // U-curve center position (on the non-handle side)
      const curveBaseX = linesOnLeft ? doorL + dw * 0.38 : doorL + dw * 0.62;
      const curveCenterY = doorT + dh * 0.55;
      
      // Large arc center
      const arcCX = linesOnLeft ? doorL + dw * 0.38 : doorL + dw * 0.62;
      const arcCY = doorT + dh * 0.72;
      const arcR1 = dw * 0.22;
      const arcR2 = dw * 0.17;
      const arcR3 = dw * 0.12;
      const smallDotR = dw * 0.03;

      // Small pattern at bottom corner (opposite to handle)
      const smallCX = linesOnLeft ? doorL + dw * 0.15 : doorL + dw * 0.85;
      const smallCY = doorT + dh * 0.92;
      const smallR1 = dw * 0.12;
      const smallR2 = dw * 0.08;
      const smallDotR2 = dw * 0.025;

      // Darker shade for pantograph grooves - more visible
      const grooveColor = adjustColor(doorColor, -30);
      const grooveOpacity = 0.55;
      const grooveWidth = 1.5;

      return (
        <g>
          <defs>
            <filter id="pantograph" x="-2%" y="-2%" width="104%" height="104%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" />
              <feOffset dx="0.5" dy="0.5" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.25" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Vertical lines */}
          {Array.from({ length: 6 }).map((_, i) => (
            <line
              key={`vl-${i}`}
              x1={lineStartX + i * lineSpacing}
              y1={lineTopY}
              x2={lineStartX + i * lineSpacing}
              y2={lineBottomY}
              stroke={grooveColor}
              strokeWidth={grooveWidth}
              opacity={grooveOpacity}
              filter="url(#pantograph)"
            />
          ))}

          {/* U-shape curves */}
          <path
            d={`M ${lineStartX + 2 * lineSpacing} ${lineBottomY} 
                L ${lineStartX + 2 * lineSpacing} ${curveCenterY + dh * 0.02}
                Q ${lineStartX + 2 * lineSpacing} ${arcCY - arcR1 * 0.3} ${arcCX} ${arcCY - arcR1 * 0.3}`}
            fill="none" stroke={grooveColor} strokeWidth={grooveWidth} opacity={grooveOpacity} filter="url(#pantograph)"
          />
          <path
            d={`M ${lineStartX + 4 * lineSpacing} ${lineBottomY}
                L ${lineStartX + 4 * lineSpacing} ${curveCenterY + dh * 0.02}
                Q ${lineStartX + 4 * lineSpacing} ${arcCY - arcR1 * 0.3} ${arcCX + (linesOnLeft ? arcR1 * 0.6 : -arcR1 * 0.6)} ${arcCY - arcR1 * 0.1}`}
            fill="none" stroke={grooveColor} strokeWidth={grooveWidth} opacity={grooveOpacity} filter="url(#pantograph)"
          />

          {/* Large concentric arcs */}
          <path
            d={`M ${arcCX - arcR1} ${arcCY} A ${arcR1} ${arcR1} 0 0 ${linesOnLeft ? 0 : 1} ${arcCX + arcR1} ${arcCY}`}
            fill="none" stroke={grooveColor} strokeWidth={grooveWidth} opacity={grooveOpacity} filter="url(#pantograph)"
          />
          <path
            d={`M ${arcCX - arcR2} ${arcCY} A ${arcR2} ${arcR2} 0 0 ${linesOnLeft ? 0 : 1} ${arcCX + arcR2} ${arcCY}`}
            fill="none" stroke={grooveColor} strokeWidth={grooveWidth} opacity={grooveOpacity} filter="url(#pantograph)"
          />
          <path
            d={`M ${arcCX - arcR3} ${arcCY} A ${arcR3} ${arcR3} 0 0 ${linesOnLeft ? 0 : 1} ${arcCX + arcR3} ${arcCY}`}
            fill="none" stroke={grooveColor} strokeWidth={grooveWidth} opacity={grooveOpacity} filter="url(#pantograph)"
          />
          <circle cx={arcCX} cy={arcCY - smallDotR * 1.5} r={smallDotR} fill="none" stroke={grooveColor} strokeWidth="1.2" opacity={grooveOpacity} filter="url(#pantograph)" />

          {/* Small bottom pattern */}
          <path
            d={`M ${smallCX} ${doorB - 10} A ${smallR1} ${smallR1} 0 0 ${linesOnLeft ? 1 : 0} ${smallCX + (linesOnLeft ? smallR1 : -smallR1)} ${smallCY}`}
            fill="none" stroke={grooveColor} strokeWidth={grooveWidth} opacity={grooveOpacity * 0.8} filter="url(#pantograph)"
          />
          <path
            d={`M ${smallCX} ${doorB - 10} A ${smallR2} ${smallR2} 0 0 ${linesOnLeft ? 1 : 0} ${smallCX + (linesOnLeft ? smallR2 : -smallR2)} ${smallCY + (smallR1 - smallR2) * 0.5}`}
            fill="none" stroke={grooveColor} strokeWidth={grooveWidth} opacity={grooveOpacity * 0.8} filter="url(#pantograph)"
          />
          <circle cx={smallCX + (linesOnLeft ? smallDotR2 * 2 : -smallDotR2 * 2)} cy={smallCY + smallR1 * 0.3} r={smallDotR2} fill="none" stroke={grooveColor} strokeWidth="1" opacity={grooveOpacity * 0.8} filter="url(#pantograph)" />
        </g>
      );
    };

    // Lever handle for battente - with visible back plate
    const renderBattenteHandle = () => {
      const plateW = 14;
      const plateH = 50;
      const plateCX = handleX + 2;
      const plateX = plateCX - plateW / 2;
      const plateY = handleY - plateH / 2;
      return (
        <g>
          {/* Back plate (placca) */}
          <rect 
            x={plateX} y={plateY} width={plateW} height={plateH} rx={3} 
            fill={handleColor} stroke="hsl(var(--foreground))" strokeWidth="0.6" opacity="0.95" 
          />
          {/* Lever - extends OUTWARD from door edge */}
          <rect 
            x={leverDir > 0 ? plateCX : plateCX + leverDir * 24} 
            y={handleY - 2} 
            width={24} height={4} rx={2} 
            fill={handleColor} stroke="hsl(var(--foreground))" strokeWidth="0.5" 
          />
          {/* Lever tip curve */}
          <circle 
            cx={plateCX + leverDir * 24} cy={handleY} r={2.5} 
            fill={handleColor} stroke="hsl(var(--foreground))" strokeWidth="0.4" 
          />
          {/* Keyhole below */}
          <circle cx={plateCX} cy={handleY + 18} r={3.5} fill="none" stroke="hsl(var(--foreground))" strokeWidth="0.7" opacity="0.5" />
          <rect x={plateCX - 1} y={handleY + 16} width={2} height={4} fill="hsl(var(--foreground))" opacity="0.3" />
        </g>
      );
    };

    // Sliding handle (recessed/pomello)
    const renderScorrevoleHandle = () => (
      <g>
        <ellipse 
          cx={handleX + 4} cy={handleY} rx={6} ry={18} 
          fill={handleColor} stroke="hsl(var(--foreground))" strokeWidth="0.6" opacity="0.9"
        />
        <ellipse 
          cx={handleX + 4} cy={handleY} rx={3.5} ry={13} 
          fill="none" stroke="hsl(var(--foreground))" strokeWidth="0.4" opacity="0.4"
        />
      </g>
    );

    // Frame type label
    const frameLabel = (() => {
      const frames: Record<string, string> = {
        'evoluto_eleva': 'Evoluto Eleva', 'minimal_eleva': 'Minimal Eleva',
        'quality_eleva': 'Quality Eleva', 'dorico': 'Dorico', 'flat': 'Flat',
        'genius_eleva': 'Genius Eleva', 'oval_eleva': 'Oval Eleva',
        'a_filo': 'A Filo', 'concept': 'Concept',
      };
      return frameType ? (frames[frameType] || frameType) : '';
    })();

    return (
      <svg viewBox={`0 0 ${svgW} ${svgH + 30}`} className="w-full max-w-sm mx-auto">
        {/* Sliding track if scorrevole */}
        {isScorrevole && (
          <g>
            <defs>
              <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                <polygon points="0 0, 6 2, 0 4" fill="hsl(var(--accent))" />
              </marker>
            </defs>
            <rect x={offsetX - 10} y={offsetY - 8} width={drawW + 20} height={4} rx={1} fill="hsl(var(--muted-foreground))" opacity="0.6" />
            <rect x={offsetX - 10} y={offsetY + drawH + 4} width={drawW + 20} height={3} rx={1} fill="hsl(var(--muted-foreground))" opacity="0.5" />
            <line x1={offsetX + drawW / 2 - 20} y1={offsetY - 14} x2={offsetX + drawW / 2 + 20} y2={offsetY - 14} stroke="hsl(var(--accent))" strokeWidth="1" markerEnd="url(#arrowhead)" />
          </g>
        )}

        {/* Door frame (stipite) */}
        <rect x={offsetX - 5} y={offsetY - 5} width={drawW + 10} height={drawH + 10} fill="none" stroke="hsl(var(--foreground))" strokeWidth="2.5" />
        
        {/* Door body */}
        <rect x={offsetX} y={offsetY} width={drawW} height={drawH} fill={doorColor} stroke="hsl(var(--foreground))" strokeWidth="1.5" />

        {/* Pantograph pattern */}
        {renderYncisa70Pattern()}

        {/* Glass insert */}
        {hasGlass && (
          <>
            <rect x={offsetX + 16} y={offsetY + 16} width={drawW - 32} height={(drawH - 32) * 0.3} fill={GLASS_COLOR} stroke={GLASS_STROKE} strokeWidth="1" rx={glassType === 'stondato' ? 6 : 0} />
            {glassType === 'satinato' && <rect x={offsetX + 16} y={offsetY + 16} width={drawW - 32} height={(drawH - 32) * 0.3} fill="rgba(255,255,255,0.5)" />}
          </>
        )}

        {/* Handle */}
        {isScorrevole ? renderScorrevoleHandle() : renderBattenteHandle()}

        {/* 3 hinges - only for battente */}
        {!isScorrevole && (
          <>
            <rect x={hingeX} y={offsetY + drawH * 0.12} width={4} height={14} rx={2} fill="hsl(var(--foreground))" opacity="0.5" />
            <rect x={hingeX} y={offsetY + drawH * 0.48} width={4} height={14} rx={2} fill="hsl(var(--foreground))" opacity="0.5" />
            <rect x={hingeX} y={offsetY + drawH * 0.82} width={4} height={14} rx={2} fill="hsl(var(--foreground))" opacity="0.5" />
          </>
        )}

        {/* Threshold */}
        <rect x={offsetX - 6} y={offsetY + drawH + 5} width={drawW + 12} height={3} fill="hsl(var(--muted-foreground))" opacity="0.4" rx={1} />

        {/* Dimensions - moved up to avoid overlap */}
        <DimensionH x={offsetX} y={offsetY - 30} width={drawW} label={`${w}`} />
        <DimensionV x={offsetX - 32} y={offsetY} height={drawH} label={`${h}`} />

        {/* Opening type label - above dimensions */}
        <text x={offsetX + drawW / 2} y={offsetY - 44} textAnchor="middle" fontSize="7" fill="hsl(var(--accent))" fontFamily="monospace">
          {isScorrevole ? '↔ Scorrevole' : '⟳ Battente'}
        </text>

        {/* Labels below door: porta cieca → frame type → handle info */}
        <text x={offsetX + drawW / 2} y={offsetY + drawH + 24} textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
          {hasGlass ? 'Porta con vetro' : 'Porta cieca'}
        </text>

        {frameLabel && (
          <text x={offsetX + drawW / 2} y={offsetY + drawH + 36} textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
            Telaio: {frameLabel}
          </text>
        )}

        {doorHandleModelId && doorHandleFinishId && (
          <text x={offsetX + drawW / 2} y={offsetY + drawH + (frameLabel ? 48 : 36)} textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
            {doorHandleModelId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} — {doorHandleFinishId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </text>
        )}

        {view && (
          <text x={8} y={16} fontSize="9" fontWeight="600" fill="hsl(var(--foreground))" fontFamily="monospace">
            {view === 'internal' ? '🏠 Vista Interna' : '🌳 Vista Esterna'}
          </text>
        )}
      </svg>
    );
  }

  // Porta finestra - solid wood door by default, optional glass insert
  if (productType === 'porta_finestra') {
    const hasGlass = !!glassType && glassType !== 'cieca';
    const doorGlassLabel = (() => {
      const map: Record<string, string> = {
        trasparente: 'Vetro trasparente', satinato: 'Vetro satinato',
        a_quadri: 'Vetro a quadri', stondato: 'Vetro stondato',
        doppio: 'Doppio vetro', triplo: 'Triplo vetro',
      };
      return map[glassType] || '';
    })();

    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-sm mx-auto">
        {topFace(offsetX, offsetY, drawW, dxOff, dyOff, frontColor)}
        {rightFace(offsetX + drawW, offsetY, drawH, dxOff, dyOff, sideColor)}

        <rect x={offsetX} y={offsetY} width={drawW} height={drawH} fill={frontColor} stroke="hsl(var(--foreground))" strokeWidth="2.5" />
        <rect x={offsetX + frameThickness} y={offsetY + frameThickness} width={drawW - frameThickness * 2} height={drawH - frameThickness * 2} fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.5" />

        {Array.from({ length: panels }).map((_, i) => {
          const px = offsetX + frameThickness + i * ((drawW - frameThickness * 2) / panels);
          const pw = (drawW - frameThickness * 2) / panels;
          const panelInset = 6;

          return (
            <g key={i}>
              <rect x={px} y={offsetY + frameThickness} width={pw} height={drawH - frameThickness * 2} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" />

              {hasGlass ? (
                <>
                  <rect x={px + panelInset} y={offsetY + frameThickness + panelInset} width={pw - panelInset * 2} height={(drawH - frameThickness * 2) * 0.4 - panelInset} fill={GLASS_COLOR} stroke={GLASS_STROKE} strokeWidth="0.8" />
                  {glassType === 'a_quadri' && Array.from({ length: 3 }).map((_, qi) => (
                    <line key={qi} x1={px + panelInset + (qi + 1) * ((pw - panelInset * 2) / 4)} y1={offsetY + frameThickness + panelInset} x2={px + panelInset + (qi + 1) * ((pw - panelInset * 2) / 4)} y2={offsetY + frameThickness + (drawH - frameThickness * 2) * 0.4} stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" />
                  ))}
                  {glassType === 'a_quadri' && Array.from({ length: 2 }).map((_, qi) => (
                    <line key={`h${qi}`} x1={px + panelInset} y1={offsetY + frameThickness + panelInset + (qi + 1) * (((drawH - frameThickness * 2) * 0.4 - panelInset) / 3)} x2={px + pw - panelInset} y2={offsetY + frameThickness + panelInset + (qi + 1) * (((drawH - frameThickness * 2) * 0.4 - panelInset) / 3)} stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" />
                  ))}
                  {glassType === 'satinato' && (
                    <rect x={px + panelInset} y={offsetY + frameThickness + panelInset} width={pw - panelInset * 2} height={(drawH - frameThickness * 2) * 0.4 - panelInset} fill="rgba(255,255,255,0.4)" />
                  )}
                  {glassType === 'stondato' && (
                    <path d={`M${px + panelInset},${offsetY + frameThickness + panelInset + 20} Q${px + pw / 2},${offsetY + frameThickness + panelInset - 5} ${px + pw - panelInset},${offsetY + frameThickness + panelInset + 20}`} fill="none" stroke={GLASS_STROKE} strokeWidth="1.5" />
                  )}
                  {doorGlassLabel && (
                    <text x={px + pw / 2} y={offsetY + frameThickness + (drawH - frameThickness * 2) * 0.4 + 12} textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))" fontFamily="monospace">{doorGlassLabel}</text>
                  )}
                  <rect x={px + panelInset} y={offsetY + frameThickness + (drawH - frameThickness * 2) * 0.42} width={pw - panelInset * 2} height={(drawH - frameThickness * 2) * 0.58 - panelInset} fill={frontColor} stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" />
                  {Array.from({ length: 4 }).map((_, gi) => (
                    <line key={gi} x1={px + panelInset + 4} y1={offsetY + frameThickness + (drawH - frameThickness * 2) * 0.45 + gi * ((drawH - frameThickness * 2) * 0.5 / 5)} x2={px + pw - panelInset - 4} y2={offsetY + frameThickness + (drawH - frameThickness * 2) * 0.45 + gi * ((drawH - frameThickness * 2) * 0.5 / 5)} stroke="hsl(var(--foreground))" strokeWidth="0.3" opacity="0.2" />
                  ))}
                </>
              ) : (
                <>
                  <rect x={px + panelInset} y={offsetY + frameThickness + panelInset} width={pw - panelInset * 2} height={(drawH - frameThickness * 2) * 0.35 - panelInset} fill={frontColor} stroke="hsl(var(--muted-foreground))" strokeWidth="0.8" />
                  <rect x={px + panelInset} y={offsetY + frameThickness + (drawH - frameThickness * 2) * 0.38} width={pw - panelInset * 2} height={(drawH - frameThickness * 2) * 0.58 - panelInset} fill={frontColor} stroke="hsl(var(--muted-foreground))" strokeWidth="0.8" />
                  {Array.from({ length: 6 }).map((_, gi) => (
                    <line key={gi} x1={px + panelInset + 4} y1={offsetY + frameThickness + panelInset + 8 + gi * ((drawH - frameThickness * 2 - 20) / 7)} x2={px + pw - panelInset - 4} y2={offsetY + frameThickness + panelInset + 8 + gi * ((drawH - frameThickness * 2 - 20) / 7)} stroke="hsl(var(--foreground))" strokeWidth="0.3" opacity="0.15" />
                  ))}
                  <text x={px + pw / 2} y={offsetY + drawH - frameThickness - 8} textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))" fontFamily="monospace">Porta cieca</text>
                </>
              )}
            </g>
          );
        })}

        {panels >= 2
          ? drawHandle(offsetX + drawW / 2 - 2, handleY)
          : drawHandle(openingDirection === 'sinistra' ? offsetX + frameThickness + 10 : offsetX + drawW - frameThickness - 14, handleY)
        }

        <DimensionH x={offsetX} y={offsetY - dyOff - 28} width={drawW} label={`${w}`} />
        <DimensionV x={offsetX - 32} y={offsetY} height={drawH} label={`${h}`} />
        <DepthDimLabel x={offsetX + drawW + 8} y={offsetY - 8} dx={dxOff} dy={dyOff} label={`${d}`} />

        <text x={offsetX + drawW / 2} y={offsetY + drawH + 20} textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
          Telaio {frameType === 'ridotto' ? 'ridotto' : frameType === 'maggiorato' ? 'maggiorato' : 'standard'}
        </text>

        {view && (
          <text x={8} y={16} fontSize="9" fontWeight="600" fill="hsl(var(--foreground))" fontFamily="monospace">
            {view === 'internal' ? '🏠 Vista Interna' : '🌳 Vista Esterna'}
          </text>
        )}
        {view && (
          <text x={offsetX + drawW + dxOff + 18} y={offsetY + drawH / 2} fontSize="7" fill="hsl(var(--accent))" fontFamily="monospace" textAnchor="start">
            {view === 'internal' ? `Int: ${COLOR_OPTIONS.find(c => c.value === colorInternal)?.label || ''}` : `Est: ${COLOR_OPTIONS.find(c => c.value === colorExternal)?.label || ''}`}
          </text>
        )}

        <line x1={offsetX + drawW + dxOff + 35} y1={handleY} x2={offsetX + drawW + dxOff + 35} y2={offsetY + drawH} stroke="hsl(var(--muted-foreground))" strokeWidth="0.6" />
        <line x1={offsetX + drawW + dxOff + 32} y1={handleY} x2={offsetX + drawW + dxOff + 38} y2={handleY} stroke="hsl(var(--muted-foreground))" strokeWidth="0.6" />
        <line x1={offsetX + drawW + dxOff + 32} y1={offsetY + drawH} x2={offsetX + drawW + dxOff + 38} y2={offsetY + drawH} stroke="hsl(var(--muted-foreground))" strokeWidth="0.6" />
        <text x={offsetX + drawW + dxOff + 44} y={(handleY + offsetY + drawH) / 2} fontSize="8" fill="hsl(var(--muted-foreground))" fontFamily="monospace" dominantBaseline="middle">
          {Math.round((h * (drawH - (handleY - offsetY)) / drawH))}
        </text>

        {spaceLabels()}
      </svg>
    );
  }

  // Default: finestra
  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-sm mx-auto">
      {topFace(offsetX, offsetY, drawW, dxOff, dyOff, frontColor)}
      {rightFace(offsetX + drawW, offsetY, drawH, dxOff, dyOff, sideColor)}

      <rect x={offsetX} y={offsetY} width={drawW} height={drawH} fill={frontColor} stroke="hsl(var(--foreground))" strokeWidth="2.5" />

      <rect
        x={offsetX + frameThickness}
        y={offsetY + frameThickness}
        width={drawW - frameThickness * 2}
        height={drawH - frameThickness * 2}
        fill="none"
        stroke="hsl(var(--foreground))"
        strokeWidth="1.5"
      />

      <text x={offsetX + drawW / 2} y={offsetY + drawH + 20} textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
        Telaio {frameType === 'ridotto' ? 'ridotto' : frameType === 'maggiorato' ? 'maggiorato' : 'standard'}
      </text>

      {Array.from({ length: panels }).map((_, i) => {
        const px = offsetX + frameThickness + i * ((drawW - frameThickness * 2) / panels);
        const pw = (drawW - frameThickness * 2) / panels;
        const glassInset = 8;

        return (
          <g key={i}>
            <rect x={px} y={offsetY + frameThickness} width={pw} height={drawH - frameThickness * 2} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" />

            {/* Glass - ALWAYS light blue/transparent */}
            <rect
              x={px + glassInset}
              y={offsetY + frameThickness + glassInset}
              width={pw - glassInset * 2}
              height={drawH - frameThickness * 2 - glassInset * 2}
              fill={GLASS_COLOR}
              stroke={GLASS_STROKE}
              strokeWidth="0.8"
            />

            <line
              x1={px + glassInset + 6} y1={offsetY + frameThickness + glassInset + 8}
              x2={px + pw - glassInset - 6} y2={offsetY + drawH - frameThickness - glassInset - 8}
              stroke="rgba(200, 230, 255, 0.3)" strokeWidth="1"
            />

            {glassLabel && (
              <text
                x={px + pw / 2}
                y={offsetY + drawH - frameThickness - glassInset - (panelType === 'anta_ribalta' ? 22 : 4)}
                textAnchor="middle"
                fontSize="7"
                fill="hsl(var(--muted-foreground))"
                fontFamily="monospace"
              >
                {glassLabel}
              </text>
            )}

            {panelType === 'anta_ribalta' && (
              <>
                <line x1={px + pw / 2 - 15} y1={offsetY + drawH - frameThickness - 6} x2={px + pw / 2} y2={offsetY + drawH - frameThickness - 16} stroke="hsl(var(--accent))" strokeWidth="1" strokeDasharray="3 2" />
                <line x1={px + pw / 2 + 15} y1={offsetY + drawH - frameThickness - 6} x2={px + pw / 2} y2={offsetY + drawH - frameThickness - 16} stroke="hsl(var(--accent))" strokeWidth="1" strokeDasharray="3 2" />
              </>
            )}
          </g>
        );
      })}

      {panelType !== 'scorrevole' && panels >= 2 ? (
        drawHandle(offsetX + drawW / 2 - 2, handleY)
      ) : panelType !== 'scorrevole' ? (
        drawHandle(
          openingDirection === 'sinistra' ? offsetX + frameThickness + 10 : offsetX + drawW - frameThickness - 14,
          handleY
        )
      ) : null}

      <DimensionH x={offsetX} y={offsetY - dyOff - 28} width={drawW} label={`${w}`} />
      <DimensionV x={offsetX - 32} y={offsetY} height={drawH} label={`${h}`} />
      <DepthDimLabel x={offsetX + drawW + 8} y={offsetY - 8} dx={dxOff} dy={dyOff} label={`${d}`} />

      {view && (
        <text x={8} y={16} fontSize="9" fontWeight="600" fill="hsl(var(--foreground))" fontFamily="monospace">
          {view === 'internal' ? '🏠 Vista Interna' : '🌳 Vista Esterna'}
        </text>
      )}

      {view && (
        <text x={offsetX + drawW + dxOff + 18} y={offsetY + drawH / 2} fontSize="7" fill="hsl(var(--accent))" fontFamily="monospace" textAnchor="start">
          {view === 'internal'
            ? `Int: ${COLOR_OPTIONS.find(c => c.value === colorInternal)?.label || ''}`
            : `Est: ${COLOR_OPTIONS.find(c => c.value === colorExternal)?.label || ''}`}
        </text>
      )}
      {!view && colorExternal && (
        <text x={8} y={svgH - 8} fontSize="7" fill="hsl(var(--accent))" fontFamily="monospace">
          Est: {COLOR_OPTIONS.find(c => c.value === colorExternal)?.label || colorExternal}
        </text>
      )}
      {!view && colorInternal && (
        <text x={offsetX + drawW + dxOff + 18} y={offsetY + drawH / 2} fontSize="7" fill="hsl(var(--accent))" fontFamily="monospace" textAnchor="start">
          Int: {COLOR_OPTIONS.find(c => c.value === colorInternal)?.label || colorInternal}
        </text>
      )}

      {spaceLabels()}

      {productType === 'porta_finestra' && (
        <>
          <line x1={offsetX + drawW + dxOff + 35} y1={handleY} x2={offsetX + drawW + dxOff + 35} y2={offsetY + drawH} stroke="hsl(var(--muted-foreground))" strokeWidth="0.6" />
          <line x1={offsetX + drawW + dxOff + 32} y1={handleY} x2={offsetX + drawW + dxOff + 38} y2={handleY} stroke="hsl(var(--muted-foreground))" strokeWidth="0.6" />
          <line x1={offsetX + drawW + dxOff + 32} y1={offsetY + drawH} x2={offsetX + drawW + dxOff + 38} y2={offsetY + drawH} stroke="hsl(var(--muted-foreground))" strokeWidth="0.6" />
          <text x={offsetX + drawW + dxOff + 44} y={(handleY + offsetY + drawH) / 2} fontSize="8" fill="hsl(var(--muted-foreground))" fontFamily="monospace" dominantBaseline="middle">
            {Math.round((h * (drawH - (handleY - offsetY)) / drawH))}
          </text>
        </>
      )}
    </svg>
  );
}

// Accessory diagrams
export function AccessoryDiagram({ type, config }: { type: string; config: any }) {
  const svgW = 280;
  const svgH = 200;
  const cx = svgW / 2;

  if (type === 'mosquito_net') {
    const color = config.mosquito_color ? getColorHex(config.mosquito_color) : '#E8E8E8';
    const mType = config.mosquito_type || 'avvolgibile';
    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-[200px] mx-auto">
        <rect x={40} y={20} width={200} height={160} fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" />
        <rect x={44} y={24} width={192} height={152} fill={color} stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.3" />
        {Array.from({ length: 20 }).map((_, i) => (
          <line key={`v${i}`} x1={48 + i * 9.5} y1={28} x2={48 + i * 9.5} y2={172} stroke="hsl(var(--muted-foreground))" strokeWidth="0.3" opacity="0.5" />
        ))}
        {Array.from({ length: 16 }).map((_, i) => (
          <line key={`h${i}`} x1={48} y1={28 + i * 9.5} x2={232} y2={28 + i * 9.5} stroke="hsl(var(--muted-foreground))" strokeWidth="0.3" opacity="0.5" />
        ))}
        {mType === 'avvolgibile' && <rect x={cx - 30} y={18} width={60} height={8} rx={2} fill="hsl(var(--foreground))" opacity="0.6" />}
        {mType === 'laterale' && <rect x={38} y={cx - 40} width={6} height={80} rx={2} fill="hsl(var(--foreground))" opacity="0.6" />}
        {mType === 'plissettata' && Array.from({ length: 8 }).map((_, i) => (
          <line key={i} x1={48 + i * 24} y1={28} x2={48 + i * 24} y2={172} stroke="hsl(var(--foreground))" strokeWidth="1" opacity="0.4" />
        ))}
        <text x={cx} y={svgH - 2} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
          {mType === 'avvolgibile' ? 'Avvolgibile' : mType === 'laterale' ? 'Laterale' : mType === 'plissettata' ? 'Plissettata' : mType === 'fissa' ? 'Fissa' : 'Battente'}
        </text>
      </svg>
    );
  }

  if (type === 'shutter') {
    const color = config.shutter_color ? getColorHex(config.shutter_color) : '#D0D0D0';
    const op = config.shutter_operation || 'cinghia';
    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-[200px] mx-auto">
        <rect x={40} y={20} width={200} height={160} fill={color} stroke="hsl(var(--foreground))" strokeWidth="2" />
        {Array.from({ length: 14 }).map((_, i) => (
          <line key={i} x1={44} y1={28 + i * 11} x2={236} y2={28 + i * 11} stroke="hsl(var(--foreground))" strokeWidth="1" opacity="0.4" />
        ))}
        {op === 'cinghia' && (
          <g>
            <rect x={245} y={60} width={6} height={60} rx={2} fill="hsl(var(--foreground))" opacity="0.5" />
            <text x={258} y={92} fontSize="6" fill="hsl(var(--muted-foreground))" fontFamily="monospace">Cinghia</text>
          </g>
        )}
        {op === 'manovella' && (
          <g>
            <line x1={245} y1={90} x2={260} y2={90} stroke="hsl(var(--foreground))" strokeWidth="2" />
            <circle cx={264} cy={90} r={4} fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
            <text x={258} y={105} fontSize="6" fill="hsl(var(--muted-foreground))" fontFamily="monospace">Manovella</text>
          </g>
        )}
        {op === 'motorizzata' && (
          <g>
            <rect x={cx - 20} y={14} width={40} height={8} rx={3} fill="hsl(var(--foreground))" opacity="0.6" />
            <text x={cx} y={12} textAnchor="middle" fontSize="6" fill="hsl(var(--muted-foreground))" fontFamily="monospace">⚡ Motore</text>
          </g>
        )}
        <text x={cx} y={svgH - 2} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))" fontFamily="monospace">Tapparella</text>
      </svg>
    );
  }

  if (type === 'box') {
    const bType = config.box_type || 'standard';
    const insulated = config.box_insulated;
    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-[200px] mx-auto">
        {bType === 'sporgente' ? (
          <g>
            <rect x={40} y={20} width={200} height={50} fill="#D8D0C0" stroke="hsl(var(--foreground))" strokeWidth="2" />
            <rect x={40} y={70} width={200} height={4} fill="hsl(var(--foreground))" opacity="0.3" />
            <circle cx={cx} cy={45} r={18} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeDasharray="3 2" />
          </g>
        ) : bType === 'monoblocco' ? (
          <g>
            <rect x={30} y={20} width={220} height={60} rx={4} fill="#D8D0C0" stroke="hsl(var(--foreground))" strokeWidth="2" />
            <rect x={35} y={80} width={4} height={100} fill="hsl(var(--muted-foreground))" opacity="0.4" />
            <rect x={241} y={80} width={4} height={100} fill="hsl(var(--muted-foreground))" opacity="0.4" />
            <circle cx={cx} cy={50} r={16} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeDasharray="3 2" />
          </g>
        ) : bType === 'incassato' ? (
          <g>
            <rect x={50} y={30} width={180} height={40} fill="#C8C0B0" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeDasharray="4 2" />
            <rect x={40} y={20} width={200} height={55} fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" />
            <circle cx={cx} cy={48} r={14} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeDasharray="3 2" />
          </g>
        ) : (
          <g>
            <rect x={40} y={30} width={200} height={45} fill="#D8D0C0" stroke="hsl(var(--foreground))" strokeWidth="2" />
            <circle cx={cx} cy={52} r={16} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeDasharray="3 2" />
          </g>
        )}
        {insulated && (
          <g>
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={i} x1={55 + i * 24} y1={25} x2={55 + i * 24} y2={70} stroke="hsl(var(--accent))" strokeWidth="0.6" opacity="0.5" strokeDasharray="2 2" />
            ))}
            <text x={cx} y={svgH - 14} textAnchor="middle" fontSize="7" fill="hsl(var(--accent))" fontFamily="monospace">Coibentato</text>
          </g>
        )}
        {config.box_inspection === 'interna' && <text x={cx} y={100} textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))" fontFamily="monospace">↓ Ispezione interna</text>}
        {config.box_inspection === 'esterna' && <text x={cx} y={100} textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))" fontFamily="monospace">↑ Ispezione esterna</text>}
        <text x={cx} y={svgH - 2} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
          Cassonetto {bType}
        </text>
      </svg>
    );
  }

  if (type === 'motorization') {
    const hasRemote = config.motor_remote;
    const hasSensor = config.motor_sensor;
    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-[200px] mx-auto">
        <rect x={cx - 50} y={60} width={100} height={30} rx={6} fill="#B0B0B0" stroke="hsl(var(--foreground))" strokeWidth="2" />
        <rect x={cx - 40} y={65} width={80} height={20} rx={3} fill="#A0A0A0" stroke="hsl(var(--muted-foreground))" strokeWidth="0.8" />
        <line x1={cx + 50} y1={75} x2={cx + 80} y2={75} stroke="hsl(var(--foreground))" strokeWidth="3" />
        <circle cx={cx + 85} cy={75} r={5} fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
        <path d={`M${cx - 50},75 Q${cx - 70},75 ${cx - 70},95 Q${cx - 70},115 ${cx - 50},115`} fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
        <text x={cx} y={55} textAnchor="middle" fontSize="16" fill="hsl(var(--accent))">⚡</text>
        {hasRemote && (
          <g>
            <rect x={30} y={110} width={24} height={40} rx={4} fill="#888" stroke="hsl(var(--foreground))" strokeWidth="1" />
            <circle cx={42} cy={125} r={3} fill="hsl(var(--foreground))" />
            <circle cx={42} cy={135} r={3} fill="hsl(var(--foreground))" />
            <text x={42} y={160} textAnchor="middle" fontSize="6" fill="hsl(var(--muted-foreground))" fontFamily="monospace">Telecomando</text>
          </g>
        )}
        {hasSensor && (
          <g>
            <rect x={svgW - 60} y={110} width={30} height={20} rx={3} fill="#888" stroke="hsl(var(--foreground))" strokeWidth="1" />
            <line x1={svgW - 45} y1={108} x2={svgW - 45} y2={100} stroke="hsl(var(--foreground))" strokeWidth="1" />
            <text x={svgW - 45} y={142} textAnchor="middle" fontSize="6" fill="hsl(var(--muted-foreground))" fontFamily="monospace">Sensore</text>
          </g>
        )}
        <text x={cx} y={svgH - 2} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
          {config.motor_brand ? config.motor_brand : 'Motorizzazione'}
        </text>
      </svg>
    );
  }

  return null;
}

function DimensionH({ x, y, width, label }: { x: number; y: number; width: number; label: string }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x + width} y2={y} stroke="hsl(var(--foreground))" strokeWidth="0.8" />
      <line x1={x} y1={y - 4} x2={x} y2={y + 4} stroke="hsl(var(--foreground))" strokeWidth="0.8" />
      <line x1={x + width} y1={y - 4} x2={x + width} y2={y + 4} stroke="hsl(var(--foreground))" strokeWidth="0.8" />
      <text x={x + width / 2} y={y - 8} textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(var(--foreground))" fontFamily="monospace">
        {label}
      </text>
    </g>
  );
}

function DimensionV({ x, y, height, label }: { x: number; y: number; height: number; label: string }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + height} stroke="hsl(var(--foreground))" strokeWidth="0.8" />
      <line x1={x - 4} y1={y} x2={x + 4} y2={y} stroke="hsl(var(--foreground))" strokeWidth="0.8" />
      <line x1={x - 4} y1={y + height} x2={x + 4} y2={y + height} stroke="hsl(var(--foreground))" strokeWidth="0.8" />
      <text x={x - 12} y={y + height / 2} textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(var(--foreground))" fontFamily="monospace" transform={`rotate(-90, ${x - 12}, ${y + height / 2})`}>
        {label}
      </text>
    </g>
  );
}

function DepthDimLabel({ x, y, dx, dy, label }: { x: number; y: number; dx: number; dy: number; label: string }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x + dx} y2={y - dy} stroke="hsl(var(--foreground))" strokeWidth="0.8" />
      <line x1={x - 2} y1={y + 2} x2={x + 2} y2={y - 2} stroke="hsl(var(--foreground))" strokeWidth="0.8" />
      <line x1={x + dx - 2} y1={y - dy + 2} x2={x + dx + 2} y2={y - dy - 2} stroke="hsl(var(--foreground))" strokeWidth="0.8" />
      <text x={x + dx / 2 + 12} y={y - dy / 2 - 12} fontSize="9" fontWeight="600" fill="hsl(var(--foreground))" fontFamily="monospace">
        {label}
      </text>
    </g>
  );
}
