import { useMemo } from 'react';
import { isDoorType, getDoorModel, ALL_HANDLE_MODELS, ALL_HANDLE_FINISHES } from '@/data/doorCatalog';

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
  doorSpecialVariant?: string;
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
  doorSpecialVariant,
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

  if (isDoorType(productType)) {
    const hasGlass = !!glassType && glassType !== 'cieca';
    const doorColor = doorColorHex || frontColor;
    const isScorrevole = panelType === 'scorrevole';
    const isRolling = doorSpecialVariant?.startsWith('rolling_');
    const isFolding = doorSpecialVariant === 'modula' || doorSpecialVariant === 'indue';
    
    // Parse opening direction: spingere_destra, spingere_sinistra, tirare_destra, tirare_sinistra
    // Also support legacy: destra, sinistra
    const dirParts = openingDirection.split('_');
    const isRight = dirParts.includes('destra');
    const isPush = dirParts.includes('spingere') || dirParts[0] === 'destra';
    const isTirare = dirParts.includes('tirare');
    
    // For the diagram: handle on the side indicated by destra/sinistra
    const isInternal = view === 'internal';
    const effectiveHandleRight = isInternal ? !isRight : isRight;
    
    const getHandleColor = () => {
      const finishMap: Record<string, string> = {
        'cromo_satinato': '#B8B8B8', 'cromo_lucido': '#E0E0E0', 'bianco_optical': '#F0F0EC',
        'nero': '#2A2A2A', 'grigio_alluminio': '#A0A0A0', 'grafite_satinato': '#6A6A6A',
        'oro_satinato': '#C5A55A', 'oro_24k': '#D4A017', 'oro_antico_lucido': '#C8A070',
        'ottone_lucido': '#C8A040', 'nikel_lucido': '#D0C8C0', 'bronzo_satinato': '#8B6E50',
        'cromo_lucido_satinato': '#D0D0D0', 'cromo_lucido_bianco': '#E8E8E4',
        'cromo_lucido_nero': '#808080', 'bianco': '#FAFAF5',
      };
      return finishMap[doorHandleFinishId || ''] || '#B8B8B8';
    };
    const handleColor = getHandleColor();

    // Positions
    const handleX = effectiveHandleRight ? offsetX + drawW - 24 : offsetX + 20;
    const hingeX = effectiveHandleRight ? offsetX + 2 : offsetX + drawW - 6;
    // Lever points INWARD (toward door center)
    const leverDir = effectiveHandleRight ? -1 : 1;

    // Model name to display
    const doorModelName = (() => {
      if (!doorModelId) return '';
      const model = doorModelId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).replace(/\//g, '/');
      // Special formatting
      const map: Record<string, string> = {
        'yncisa_70': 'Yncisa 70', 'yncisa_zig_1': 'Yncisa Zig/1', 'yncisa_zig_2': 'Yncisa Zig/2',
        'yncisa_segni': 'Yncisa Segni', 'yncisa_styla': 'Yncisa Styla', 'yncisa_tartan': 'Yncisa Tartan',
        'yncisa_tratto': 'Yncisa Tratto', 'yncisa_0': 'Yncisa/0', 'yncisa_1': 'Yncisa/1', 'yncisa_8': 'Yncisa/8',
        'equa_styla': 'Equa Styla', 'equa': 'Equa', 'equa_1': 'Equa/1',
        'lignum_exit': 'Lignum Exit', 'lignum_exitlyne': 'Lignum Exitlyne',
        'exit': 'Exit', 'plisse': 'Plissè', 'plisse_vario': 'Plissè Vario',
        'suite_9': 'Suite/9', 'suite_10': 'Suite/10',
        'intaglio_1': 'Intaglio/1', 'intaglio_4': 'Intaglio/4', 'intaglio_8': 'Intaglio/8',
        'supernova': 'Supernova', 'nova': 'Nova', 'tratto': 'Tratto', 'segni': 'Segni',
        'logica': 'Logica', 'logica_1': 'Logica/1', 'logica_4': 'Logica/4', 'logica_90': 'Logica/90',
        'liss': 'Liss', 'liss_4': 'Liss/4', 'liss_90': 'Liss/90', 'bilico': 'Bilico',
      };
      return map[doorModelId] || model;
    })();

    // Opening direction label
    const openingLabel = (() => {
      const labels: Record<string, string> = {
        'spingere_destra': 'Spingere DX',
        'spingere_sinistra': 'Spingere SX',
        'tirare_destra': 'Tirare DX',
        'tirare_sinistra': 'Tirare SX',
        'destra': 'Destra',
        'sinistra': 'Sinistra',
      };
      return labels[openingDirection] || openingDirection;
    })();

    // Handle rendering per model
    const renderBattenteHandle = () => {
      const rosetteCX = handleX + 2;
      const rosetteR = 5;
      const leverLen = 26;
      
      if (doorHandleModelId === 'pure') {
        return (
          <g>
            <circle cx={rosetteCX} cy={handleY} r={rosetteR} fill={handleColor} stroke="hsl(var(--foreground))" strokeWidth="0.5" />
            <rect 
              x={leverDir > 0 ? rosetteCX : rosetteCX - leverLen} 
              y={handleY - 1.5} width={leverLen} height={3} rx={1.5} 
              fill={handleColor} stroke="hsl(var(--foreground))" strokeWidth="0.4" 
            />
            <circle cx={rosetteCX} cy={handleY + 22} r={4} fill={handleColor} stroke="hsl(var(--foreground))" strokeWidth="0.5" />
            <rect x={rosetteCX - 0.8} y={handleY + 20} width={1.6} height={4} fill="hsl(var(--foreground))" opacity="0.4" />
          </g>
        );
      }
      
      if (doorHandleModelId === 'baar') {
        return (
          <g>
            <rect x={rosetteCX - rosetteR} y={handleY - rosetteR} width={rosetteR * 2} height={rosetteR * 2} rx={1} fill={handleColor} stroke="hsl(var(--foreground))" strokeWidth="0.5" />
            <rect 
              x={leverDir > 0 ? rosetteCX : rosetteCX - leverLen} 
              y={handleY - 2} width={leverLen} height={4} rx={1} 
              fill={handleColor} stroke="hsl(var(--foreground))" strokeWidth="0.4" 
            />
            <rect 
              x={rosetteCX + leverDir * leverLen - 2} y={handleY - 2} 
              width={4} height={10} rx={1} 
              fill={handleColor} stroke="hsl(var(--foreground))" strokeWidth="0.4" 
            />
            <rect x={rosetteCX - 4} y={handleY + 18} width={8} height={8} rx={1} fill={handleColor} stroke="hsl(var(--foreground))" strokeWidth="0.5" />
            <rect x={rosetteCX - 0.8} y={handleY + 20} width={1.6} height={4} fill="hsl(var(--foreground))" opacity="0.4" />
          </g>
        );
      }
      
      // Minimal Design (default)
      return (
        <g>
          <circle cx={rosetteCX} cy={handleY} r={rosetteR} fill={handleColor} stroke="hsl(var(--foreground))" strokeWidth="0.5" />
          <path 
            d={`M ${rosetteCX} ${handleY} 
                L ${rosetteCX + leverDir * 12} ${handleY} 
                Q ${rosetteCX + leverDir * 20} ${handleY} ${rosetteCX + leverDir * leverLen} ${handleY - 4}`}
            fill="none" stroke={handleColor} strokeWidth="4" strokeLinecap="round"
          />
          <path 
            d={`M ${rosetteCX} ${handleY} 
                L ${rosetteCX + leverDir * 12} ${handleY} 
                Q ${rosetteCX + leverDir * 20} ${handleY} ${rosetteCX + leverDir * leverLen} ${handleY - 4}`}
            fill="none" stroke="hsl(var(--foreground))" strokeWidth="0.4" strokeLinecap="round"
          />
          <circle cx={rosetteCX} cy={handleY + 22} r={4} fill={handleColor} stroke="hsl(var(--foreground))" strokeWidth="0.5" />
          <rect x={rosetteCX - 0.8} y={handleY + 20} width={1.6} height={4} fill="hsl(var(--foreground))" opacity="0.4" />
        </g>
      );
    };

    // Sliding handle (recessed pomello)
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

    // Special variant label
    const variantLabel = (() => {
      const variants: Record<string, string> = {
        'modula': 'Sistema Modula',
        'indue': 'Sistema InDue',
        'rolling_scrighi': 'Rolling Scrighi',
        'rolling_magic': 'Rolling Magic',
        'rolling_prima': 'Rolling Prima',
      };
      return doorSpecialVariant ? (variants[doorSpecialVariant] || '') : '';
    })();

    // ===== FOLDING DOOR RENDERING (Modula / InDue) =====
    if (isFolding) {
      const isModula = doorSpecialVariant === 'modula';
      const isInDue = doorSpecialVariant === 'indue';
      // Modula: 1/3 + 2/3, InDue: 50/50
      const leftRatio = isModula ? 0.33 : 0.5;
      const rightRatio = 1 - leftRatio;
      const leftW = drawW * leftRatio;
      const rightW = drawW * rightRatio;
      const foldGap = 3;

      // InDue: handle is centered on the fold line, Modula: handle on the bigger panel
      const indueHandleX = offsetX + leftW - 2; // centered on fold
      const modulaHandleX = effectiveHandleRight ? offsetX + drawW - 24 : offsetX + 20;

      return (
        <svg viewBox={`0 0 ${svgW} ${svgH + 50}`} className="w-full max-w-sm mx-auto">
          {/* Door frame */}
          <rect x={offsetX - 5} y={offsetY - 5} width={drawW + 10} height={drawH + 10} fill="none" stroke="hsl(var(--foreground))" strokeWidth="2.5" />
          
          {/* Left panel (hinged to frame) - slightly angled */}
          <g transform={`skewY(${effectiveHandleRight ? -2 : 2})`}>
            <rect x={offsetX} y={offsetY} width={leftW - foldGap} height={drawH} fill={doorColor} stroke="hsl(var(--foreground))" strokeWidth="1.5" />
          </g>
          
          {/* Right panel - slightly angled other way */}
          <g transform={`skewY(${effectiveHandleRight ? 2 : -2})`}>
            <rect x={offsetX + leftW + foldGap} y={offsetY} width={rightW - foldGap} height={drawH} fill={doorColor} stroke="hsl(var(--foreground))" strokeWidth="1.5" />
          </g>

          {/* Fold line / hinge between panels */}
          <line x1={offsetX + leftW} y1={offsetY} x2={offsetX + leftW} y2={offsetY + drawH} stroke="hsl(var(--foreground))" strokeWidth="1.5" strokeDasharray="4 3" />

          {/* Handle: InDue = centered handle on fold, Modula = standard handle on bigger panel */}
          {isInDue ? (
            <g>
              {/* Centered handle (lever style) at the fold line */}
              <circle cx={indueHandleX + 2} cy={handleY} r={5} fill={handleColor} stroke="hsl(var(--foreground))" strokeWidth="0.5" />
              <rect 
                x={indueHandleX + 2 - 13} 
                y={handleY - 1.5} width={26} height={3} rx={1.5} 
                fill={handleColor} stroke="hsl(var(--foreground))" strokeWidth="0.4" 
              />
            </g>
          ) : (
            renderBattenteHandle()
          )}

          {/* Hinges on frame side */}
          <rect x={hingeX} y={offsetY + drawH * 0.12} width={4} height={14} rx={2} fill="hsl(var(--foreground))" opacity="0.5" />
          <rect x={hingeX} y={offsetY + drawH * 0.48} width={4} height={14} rx={2} fill="hsl(var(--foreground))" opacity="0.5" />
          <rect x={hingeX} y={offsetY + drawH * 0.82} width={4} height={14} rx={2} fill="hsl(var(--foreground))" opacity="0.5" />

          {/* Threshold */}
          <rect x={offsetX - 6} y={offsetY + drawH + 5} width={drawW + 12} height={3} fill="hsl(var(--muted-foreground))" opacity="0.4" rx={1} />

          {/* Ratio indicator */}
          <text x={offsetX + leftW / 2} y={offsetY + drawH + 16} textAnchor="middle" fontSize="6" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
            {isModula ? '1/3' : '1/2'}
          </text>
          <text x={offsetX + leftW + rightW / 2} y={offsetY + drawH + 16} textAnchor="middle" fontSize="6" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
            {isModula ? '2/3' : '1/2'}
          </text>

          {/* Dimensions */}
          <DimensionH x={offsetX} y={offsetY - 22} width={drawW} label={`${w}`} />
          <DimensionV x={offsetX - 32} y={offsetY} height={drawH} label={`${h}`} />

          {/* Opening info - well above dimension */}
          <text x={offsetX + drawW / 2} y={offsetY - 48} textAnchor="middle" fontSize="7" fill="hsl(var(--accent))" fontFamily="monospace">
            {variantLabel} — {openingLabel}
          </text>

          {/* Labels below door */}
          {doorModelName && (
            <text x={offsetX + drawW / 2} y={offsetY + drawH + 28} textAnchor="middle" fontSize="9" fontWeight="600" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
              {doorModelName}
            </text>
          )}
          <text x={offsetX + drawW / 2} y={offsetY + drawH + 40} textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
            Porta cieca — {variantLabel}
          </text>
          {frameLabel && (
            <text x={offsetX + drawW / 2} y={offsetY + drawH + 52} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
              Telaio: {frameLabel}
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

    // ===== ROLLING DOOR RENDERING (Scrighi / Magic / Prima) =====
    if (isRolling) {
      const isScrighi = doorSpecialVariant === 'rolling_scrighi'; // inside wall
      const isMagic = doorSpecialVariant === 'rolling_magic';
      const isPrima = doorSpecialVariant === 'rolling_prima';
      const isInsideWall = isScrighi;

      // Wall representation
      const wallThickness = 18;
      const wallX = effectiveHandleRight ? offsetX + drawW + 6 : offsetX - wallThickness - 6;
      const trackLen = drawW + 20;
      
      // Sliding direction: door slides into/along wall
      const slideDir = effectiveHandleRight ? 1 : -1;

      return (
        <svg viewBox={`0 0 ${svgW + 60} ${svgH + 50}`} className="w-full max-w-sm mx-auto">
          {/* Wall */}
          <rect x={wallX} y={offsetY - 10} width={wallThickness} height={drawH + 20} fill="hsl(var(--muted))" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
          {/* Wall hatching */}
          {Array.from({ length: Math.floor((drawH + 20) / 8) }).map((_, i) => (
            <line key={i} x1={wallX + 2} y1={offsetY - 10 + i * 8} x2={wallX + wallThickness - 2} y2={offsetY - 10 + i * 8 + 6} stroke="hsl(var(--foreground))" strokeWidth="0.3" opacity="0.3" />
          ))}

          {isInsideWall ? (
            <>
              {/* Pocket in wall for Scrighi - door slides inside */}
              <rect x={wallX + wallThickness} y={offsetY - 5} width={drawW + 10} height={wallThickness * 0.4} fill="hsl(var(--muted))" stroke="hsl(var(--foreground))" strokeWidth="0.8" />
              <rect x={wallX + wallThickness} y={offsetY + drawH - wallThickness * 0.4 + 5} width={drawW + 10} height={wallThickness * 0.4} fill="hsl(var(--muted))" stroke="hsl(var(--foreground))" strokeWidth="0.8" />
              {/* Door partially inside wall */}
              <rect x={wallX + wallThickness + 4} y={offsetY} width={drawW - 10} height={drawH} fill={doorColor} stroke="hsl(var(--foreground))" strokeWidth="1" opacity="0.5" strokeDasharray="3 2" />
              {/* Visible portion of door */}
              <rect x={offsetX} y={offsetY} width={drawW * 0.3} height={drawH} fill={doorColor} stroke="hsl(var(--foreground))" strokeWidth="1.5" />
              {/* Recessed handle on visible part */}
              <ellipse cx={offsetX + drawW * 0.15} cy={handleY} rx={5} ry={14} fill={handleColor} stroke="hsl(var(--foreground))" strokeWidth="0.5" />
            </>
          ) : (
            <>
              {/* Track above door for Magic/Prima */}
              <rect x={offsetX - 10} y={offsetY - 10} width={drawW + 40} height={5} rx={1} fill="hsl(var(--muted-foreground))" opacity="0.6" />
              {/* Door panel */}
              <rect x={offsetX} y={offsetY} width={drawW} height={drawH} fill={doorColor} stroke="hsl(var(--foreground))" strokeWidth="1.5" />
              {/* Recessed handle */}
              <ellipse cx={offsetX + (effectiveHandleRight ? drawW - 16 : 16)} cy={handleY} rx={5} ry={14} fill={handleColor} stroke="hsl(var(--foreground))" strokeWidth="0.5" />
              {/* Sliding arrow */}
              <defs>
                <marker id="slide-arrow" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                  <polygon points="0 0, 6 2, 0 4" fill="hsl(var(--accent))" />
                </marker>
              </defs>
              <line x1={offsetX + drawW / 2 - 20} y1={offsetY - 16} x2={offsetX + drawW / 2 + 20} y2={offsetY - 16} stroke="hsl(var(--accent))" strokeWidth="1" markerEnd="url(#slide-arrow)" />
            </>
          )}

          {/* Threshold */}
          <rect x={offsetX - 10} y={offsetY + drawH + 5} width={drawW + 20} height={3} fill="hsl(var(--muted-foreground))" opacity="0.4" rx={1} />

          {/* Dimensions */}
          <DimensionH x={offsetX} y={offsetY - 28} width={drawW} label={`${w}`} />
          <DimensionV x={offsetX - 32} y={offsetY} height={drawH} label={`${h}`} />

          {/* Opening info */}
          <text x={offsetX + drawW / 2} y={offsetY - 50} textAnchor="middle" fontSize="7" fill="hsl(var(--accent))" fontFamily="monospace">
            {variantLabel}
          </text>

          {/* Labels below door */}
          {doorModelName && (
            <text x={offsetX + drawW / 2} y={offsetY + drawH + 22} textAnchor="middle" fontSize="9" fontWeight="600" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
              {doorModelName}
            </text>
          )}
          <text x={offsetX + drawW / 2} y={offsetY + drawH + 34} textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
            Porta cieca — {variantLabel}
          </text>
          {frameLabel && (
            <text x={offsetX + drawW / 2} y={offsetY + drawH + 46} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
              Telaio: {frameLabel}
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

    // ===== STANDARD DOOR RENDERING (Battente / Scorrevole) =====
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

        {/* Dimensions */}
        <DimensionH x={offsetX} y={offsetY - 22} width={drawW} label={`${w}`} />
        <DimensionV x={offsetX - 32} y={offsetY} height={drawH} label={`${h}`} />

        {/* Opening type label - well above dimension line */}
        <text x={offsetX + drawW / 2} y={offsetY - 48} textAnchor="middle" fontSize="7" fill="hsl(var(--accent))" fontFamily="monospace">
          {isScorrevole ? '↔ Scorrevole' : `⟳ Battente — ${openingLabel}`}
        </text>

        {/* Labels below door */}
        {doorModelName && (
          <text x={offsetX + drawW / 2} y={offsetY + drawH + 18} textAnchor="middle" fontSize="9" fontWeight="600" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
            {doorModelName}
          </text>
        )}

        <text x={offsetX + drawW / 2} y={offsetY + drawH + (doorModelName ? 30 : 18)} textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
          {hasGlass ? 'Porta con vetro' : 'Porta cieca'}
        </text>

        {frameLabel && (
          <text x={offsetX + drawW / 2} y={offsetY + drawH + (doorModelName ? 42 : 30)} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
            Telaio: {frameLabel}
          </text>
        )}

        {doorHandleModelId && doorHandleFinishId && (
          <text x={offsetX + drawW / 2} y={offsetY + drawH + (doorModelName ? (frameLabel ? 54 : 42) : (frameLabel ? 42 : 30))} textAnchor="middle" fontSize="7" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
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
