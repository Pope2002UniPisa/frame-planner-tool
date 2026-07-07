import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export interface WeekStat {
  name: string;
  Bozza: number;
  Preventivo: number;
  Ordinato: number;
  Completato: number;
}

/**
 * Grafico attività ultime 12 settimane.
 * Estratto in un componente a sé e caricato in lazy: Recharts (~360 KB) non
 * entra più nel bundle iniziale della Dashboard, ma solo quando il grafico
 * viene effettivamente renderizzato.
 */
export default function WeeklyActivityChart({ data }: { data: WeekStat[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          {[['gradBozza', '#a09080'], ['gradPrev', '#C8874A'], ['gradOrd', '#7A9AB5'], ['gradComp', '#7AAF8A']].map(([id, color]) => (
            <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.45} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(25 10% 42%)' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 9, fill: 'hsl(25 10% 42%)' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{
          fontSize: 11, borderRadius: 10,
          background: 'hsl(30 9% 13%)',
          border: '1px solid hsl(30 9% 18%)',
          color: 'hsl(35 25% 85%)',
          boxShadow: '0 8px 24px -4px hsl(30 15% 3% / 0.6)',
        }} />
        <Area type="monotone" dataKey="Bozza" stroke="#a09080" fill="url(#gradBozza)" strokeWidth={1.5} />
        <Area type="monotone" dataKey="Preventivo" stroke="#C8874A" fill="url(#gradPrev)" strokeWidth={1.5} />
        <Area type="monotone" dataKey="Ordinato" stroke="#7A9AB5" fill="url(#gradOrd)" strokeWidth={1.5} />
        <Area type="monotone" dataKey="Completato" stroke="#7AAF8A" fill="url(#gradComp)" strokeWidth={1.5} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
