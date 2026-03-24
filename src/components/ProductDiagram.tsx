import { useMemo } from 'react';

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
}: ProductDiagramProps) {
  const w = parseInt(widthMm) || 1200;
  const h = parseInt(heightMm) || 1400;
  const d = parseInt(depthMm) || 0;
  const panels = parseInt(numPanels) || 1;

  // Scale to fit SVG viewport
  const svgW = 360;
  const svgH = 400;
  const margin = 50;
  const maxDrawW = svgW - margin * 2;
  const maxDrawH = svgH - margin * 2;
  const scale = Math.min(maxDrawW / w, maxDrawH / h);
  const drawW = w * scale;
  const drawH = h * scale;
  const offsetX = (svgW - drawW) / 2;
  const offsetY = (svgH - drawH) / 2 + 10;

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

  if (productType === 'zanzariera') {
    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-sm mx-auto">
        {/* Frame */}
        <rect x={offsetX} y={offsetY} width={drawW} height={drawH} fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" />
        <rect x={offsetX + 4} y={offsetY + 4} width={drawW - 8} height={drawH - 8} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeDasharray="4 2" />
        {/* Mesh pattern */}
        {Array.from({ length: Math.floor((drawW - 16) / 8) }).map((_, i) => (
          <line key={`v${i}`} x1={offsetX + 8 + i * 8} y1={offsetY + 8} x2={offsetX + 8 + i * 8} y2={offsetY + drawH - 8} stroke="hsl(var(--muted-foreground))" strokeWidth="0.3" opacity="0.4" />
        ))}
        {Array.from({ length: Math.floor((drawH - 16) / 8) }).map((_, i) => (
          <line key={`h${i}`} x1={offsetX + 8} y1={offsetY + 8 + i * 8} x2={offsetX + drawW - 8} y2={offsetY + 8 + i * 8} stroke="hsl(var(--muted-foreground))" strokeWidth="0.3" opacity="0.4" />
        ))}
        {/* Dimensions */}
        <DimensionH x={offsetX} y={offsetY - 15} width={drawW} label={`${w}`} />
        <DimensionV x={offsetX - 15} y={offsetY} height={drawH} label={`${h}`} />
      </svg>
    );
  }

  if (productType === 'persiana') {
    const slats = Math.floor(drawH / 12);
    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-sm mx-auto">
        <rect x={offsetX} y={offsetY} width={drawW} height={drawH} fill="none" stroke="hsl(var(--foreground))" strokeWidth="2.5" />
        {Array.from({ length: slats }).map((_, i) => (
          <line key={i} x1={offsetX + 4} y1={offsetY + 6 + i * (drawH / slats)} x2={offsetX + drawW - 4} y2={offsetY + 6 + i * (drawH / slats)} stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" />
        ))}
        <DimensionH x={offsetX} y={offsetY - 15} width={drawW} label={`${w}`} />
        <DimensionV x={offsetX - 15} y={offsetY} height={drawH} label={`${h}`} />
      </svg>
    );
  }

  if (productType === 'basculante') {
    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-sm mx-auto">
        {/* Outer frame */}
        <rect x={offsetX} y={offsetY} width={drawW} height={drawH} fill="none" stroke="hsl(var(--foreground))" strokeWidth="2.5" />
        {/* Inner frame */}
        <rect x={offsetX + 6} y={offsetY + 6} width={drawW - 12} height={drawH - 12} fill="hsl(var(--accent) / 0.08)" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" />
        {/* Horizontal sections */}
        {[1, 2, 3].map(i => (
          <line key={i} x1={offsetX + 6} y1={offsetY + 6 + i * ((drawH - 12) / 4)} x2={offsetX + drawW - 6} y2={offsetY + 6 + i * ((drawH - 12) / 4)} stroke="hsl(var(--muted-foreground))" strokeWidth="0.8" />
        ))}
        {/* Handle */}
        <rect x={offsetX + drawW / 2 - 15} y={offsetY + drawH - 30} width={30} height={4} rx={2} fill="hsl(var(--foreground))" />
        <DimensionH x={offsetX} y={offsetY - 15} width={drawW} label={`${w}`} />
        <DimensionV x={offsetX - 15} y={offsetY} height={drawH} label={`${h}`} />
      </svg>
    );
  }

  // Default: finestra / porta_finestra
  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-sm mx-auto">
      {/* Wall opening (outer frame) */}
      <rect x={offsetX} y={offsetY} width={drawW} height={drawH} fill="none" stroke="hsl(var(--foreground))" strokeWidth="2.5" />
      
      {/* Frame (inner) */}
      <rect x={offsetX + 5} y={offsetY + 5} width={drawW - 10} height={drawH - 10} fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.5" />

      {/* Panels */}
      {Array.from({ length: panels }).map((_, i) => {
        const px = offsetX + 5 + i * panelWidth;
        const pw = panelWidth - (panels > 1 ? 2 : 0);
        const glassInset = 10;

        return (
          <g key={i}>
            {/* Panel frame */}
            <rect x={px + (i > 0 ? 2 : 0)} y={offsetY + 5} width={pw} height={drawH - 10} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" />
            
            {/* Glass */}
            <rect
              x={px + glassInset + (i > 0 ? 2 : 0)}
              y={offsetY + 5 + glassInset}
              width={pw - glassInset * 2}
              height={drawH - 10 - glassInset * 2}
              fill="hsl(var(--accent) / 0.08)"
              stroke="hsl(var(--accent) / 0.3)"
              strokeWidth="0.8"
            />

            {/* Glass reflection lines */}
            <line
              x1={px + glassInset + 8 + (i > 0 ? 2 : 0)}
              y1={offsetY + 5 + glassInset + 10}
              x2={px + pw - glassInset - 8 + (i > 0 ? 2 : 0)}
              y2={offsetY + drawH - 15 - glassInset - 10}
              stroke="hsl(var(--accent) / 0.15)"
              strokeWidth="1"
            />
            <line
              x1={px + glassInset + 18 + (i > 0 ? 2 : 0)}
              y1={offsetY + 5 + glassInset + 10}
              x2={px + pw - glassInset + 2 + (i > 0 ? 2 : 0)}
              y2={offsetY + drawH - 15 - glassInset - 10}
              stroke="hsl(var(--accent) / 0.1)"
              strokeWidth="0.8"
            />

            {/* Glass label */}
            {glassLabel && (
              <text
                x={px + pw / 2 + (i > 0 ? 2 : 0)}
                y={offsetY + drawH - 20}
                textAnchor="middle"
                fontSize="7"
                fill="hsl(var(--muted-foreground))"
                fontFamily="monospace"
              >
                {glassLabel}
              </text>
            )}

            {/* Handle */}
            {(panelType !== 'scorrevole') && (
              <rect
                x={
                  openingDirection === 'sinistra'
                    ? px + 12 + (i > 0 ? 2 : 0)
                    : px + pw - 16 + (i > 0 ? 2 : 0)
                }
                y={handleY}
                width={4}
                height={18}
                rx={2}
                fill="hsl(var(--foreground))"
              />
            )}

            {/* Opening direction arrows for anta-ribalta */}
            {panelType === 'anta_ribalta' && (
              <>
                {/* Bottom tilt indicator */}
                <line
                  x1={px + pw / 2 - 15 + (i > 0 ? 2 : 0)}
                  y1={offsetY + drawH - 12}
                  x2={px + pw / 2 + (i > 0 ? 2 : 0)}
                  y2={offsetY + drawH - 22}
                  stroke="hsl(var(--accent))"
                  strokeWidth="1"
                  strokeDasharray="3 2"
                />
                <line
                  x1={px + pw / 2 + 15 + (i > 0 ? 2 : 0)}
                  y1={offsetY + drawH - 12}
                  x2={px + pw / 2 + (i > 0 ? 2 : 0)}
                  y2={offsetY + drawH - 22}
                  stroke="hsl(var(--accent))"
                  strokeWidth="1"
                  strokeDasharray="3 2"
                />
              </>
            )}
          </g>
        );
      })}

      {/* Dimension annotations */}
      <DimensionH x={offsetX} y={offsetY - 15} width={drawW} label={`${w}`} />
      <DimensionV x={offsetX - 15} y={offsetY} height={drawH} label={`${h}`} />

      {/* Depth label if set */}
      {d > 0 && (
        <text x={offsetX + drawW + 8} y={offsetY + drawH / 2} fontSize="9" fill="hsl(var(--muted-foreground))" fontFamily="monospace" textAnchor="start" dominantBaseline="middle">
          Prof. {d}
        </text>
      )}

      {/* Handle height dimension for porta_finestra */}
      {productType === 'porta_finestra' && (
        <>
          <line x1={offsetX + drawW + 5} y1={handleY} x2={offsetX + drawW + 5} y2={offsetY + drawH} stroke="hsl(var(--muted-foreground))" strokeWidth="0.6" />
          <line x1={offsetX + drawW + 2} y1={handleY} x2={offsetX + drawW + 8} y2={handleY} stroke="hsl(var(--muted-foreground))" strokeWidth="0.6" />
          <line x1={offsetX + drawW + 2} y1={offsetY + drawH} x2={offsetX + drawW + 8} y2={offsetY + drawH} stroke="hsl(var(--muted-foreground))" strokeWidth="0.6" />
          <text x={offsetX + drawW + 12} y={(handleY + offsetY + drawH) / 2} fontSize="8" fill="hsl(var(--muted-foreground))" fontFamily="monospace" dominantBaseline="middle">
            {Math.round((h * (drawH - (handleY - offsetY)) / drawH))}
          </text>
        </>
      )}
    </svg>
  );
}

function DimensionH({ x, y, width, label }: { x: number; y: number; width: number; label: string }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x + width} y2={y} stroke="hsl(var(--foreground))" strokeWidth="0.8" />
      <line x1={x} y1={y - 4} x2={x} y2={y + 4} stroke="hsl(var(--foreground))" strokeWidth="0.8" />
      <line x1={x + width} y1={y - 4} x2={x + width} y2={y + 4} stroke="hsl(var(--foreground))" strokeWidth="0.8" />
      <text x={x + width / 2} y={y - 5} textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(var(--foreground))" fontFamily="monospace">
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
      <text x={x - 8} y={y + height / 2} textAnchor="middle" fontSize="11" fontWeight="600" fill="hsl(var(--foreground))" fontFamily="monospace" transform={`rotate(-90, ${x - 8}, ${y + height / 2})`}>
        {label}
      </text>
    </g>
  );
}
