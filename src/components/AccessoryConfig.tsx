import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { AccessoryDiagram, COLOR_OPTIONS } from '@/components/ProductDiagram';

export interface AccessoriesConfig {
  mosquito_type?: string;
  mosquito_color?: string;
  mosquito_operation?: string;
  mosquito_width_mm?: string;
  mosquito_height_mm?: string;
  shutter_material?: string;
  shutter_color?: string;
  shutter_operation?: string;
  box_type?: string;
  box_insulated?: boolean;
  box_inspection?: string;
  motor_brand?: string;
  motor_remote?: boolean;
  motor_sensor?: boolean;
  no_handle_mode?: 'none' | 'foro_maniglia' | 'foro_chiave' | 'foro_maniglia_chiave';
}

interface AccessoryConfigProps {
  type: 'mosquito_net' | 'shutter' | 'box' | 'motorization';
  config: AccessoriesConfig;
  onChange: (config: AccessoriesConfig) => void;
}

function ColorSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger>
          <div className="flex items-center gap-2">
            {value && <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: COLOR_OPTIONS.find(c => c.value === value)?.hex }} />}
            <SelectValue placeholder="Seleziona colore..." />
          </div>
        </SelectTrigger>
        <SelectContent>
          {COLOR_OPTIONS.map(c => (
            <SelectItem key={c.value} value={c.value}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: c.hex }} />
                {c.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function AccessoryConfig({ type, config, onChange }: AccessoryConfigProps) {
  const update = (key: keyof AccessoriesConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  if (type === 'mosquito_net') {
    return (
      <div className="ml-4 mt-3 space-y-3 rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm font-semibold text-foreground">Configurazione Zanzariera</p>
        <AccessoryDiagram type="mosquito_net" config={config} />
        <div className="space-y-2">
          <Label className="text-sm">Tipologia</Label>
          <Select value={config.mosquito_type || ''} onValueChange={v => update('mosquito_type', v)}>
            <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="avvolgibile">Avvolgibile verticale</SelectItem>
              <SelectItem value="laterale">Laterale scorrevole</SelectItem>
              <SelectItem value="plissettata">Plissettata</SelectItem>
              <SelectItem value="fissa">Fissa a telaio</SelectItem>
              <SelectItem value="battente">A battente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-sm">Larghezza (mm)</Label>
            <Input type="number" value={config.mosquito_width_mm || ''} onChange={e => update('mosquito_width_mm', e.target.value)} placeholder="1200" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Altezza (mm)</Label>
            <Input type="number" value={config.mosquito_height_mm || ''} onChange={e => update('mosquito_height_mm', e.target.value)} placeholder="1400" />
          </div>
        </div>
        <ColorSelect value={config.mosquito_color || ''} onChange={v => update('mosquito_color', v)} label="Colore telaio" />
        <div className="space-y-2">
          <Label className="text-sm">Azionamento</Label>
          <RadioGroup value={config.mosquito_operation || ''} onValueChange={v => update('mosquito_operation', v)} className="flex flex-wrap gap-3">
            {[
              { value: 'manuale', label: 'Manuale' },
              { value: 'molla', label: 'A molla' },
              { value: 'catena', label: 'A catena' },
              { value: 'motorizzata', label: 'Motorizzata' },
            ].map(opt => (
              <Label key={opt.value} htmlFor={`mq-op-${opt.value}`} className="flex items-center gap-2 cursor-pointer text-sm">
                <RadioGroupItem value={opt.value} id={`mq-op-${opt.value}`} /> {opt.label}
              </Label>
            ))}
          </RadioGroup>
        </div>
      </div>
    );
  }

  if (type === 'shutter') {
    return (
      <div className="ml-4 mt-3 space-y-3 rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm font-semibold text-foreground">Configurazione Tapparella</p>
        <AccessoryDiagram type="shutter" config={config} />
        <div className="space-y-2">
          <Label className="text-sm">Materiale</Label>
          <Select value={config.shutter_material || ''} onValueChange={v => update('shutter_material', v)}>
            <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pvc">PVC</SelectItem>
              <SelectItem value="alluminio">Alluminio</SelectItem>
              <SelectItem value="alluminio_coibentato">Alluminio coibentato</SelectItem>
              <SelectItem value="acciaio">Acciaio</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ColorSelect value={config.shutter_color || ''} onChange={v => update('shutter_color', v)} label="Colore" />
        <div className="space-y-2">
          <Label className="text-sm">Azionamento</Label>
          <RadioGroup value={config.shutter_operation || ''} onValueChange={v => update('shutter_operation', v)} className="flex flex-wrap gap-3">
            {[
              { value: 'cinghia', label: 'Cinghia' },
              { value: 'manovella', label: 'Manovella' },
              { value: 'motorizzata', label: 'Motorizzata' },
            ].map(opt => (
              <Label key={opt.value} htmlFor={`sh-op-${opt.value}`} className="flex items-center gap-2 cursor-pointer text-sm">
                <RadioGroupItem value={opt.value} id={`sh-op-${opt.value}`} /> {opt.label}
              </Label>
            ))}
          </RadioGroup>
        </div>
      </div>
    );
  }

  if (type === 'box') {
    return (
      <div className="ml-4 mt-3 space-y-3 rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm font-semibold text-foreground">Configurazione Cassonetto</p>
        <AccessoryDiagram type="box" config={config} />
        <div className="space-y-2">
          <Label className="text-sm">Tipologia</Label>
          <Select value={config.box_type || ''} onValueChange={v => update('box_type', v)}>
            <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="monoblocco">Monoblocco</SelectItem>
              <SelectItem value="sporgente">Sporgente</SelectItem>
              <SelectItem value="incassato">Incassato</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox id="box-ins" checked={config.box_insulated || false} onCheckedChange={v => update('box_insulated', v)} />
          <Label htmlFor="box-ins" className="text-sm">Coibentato</Label>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Ispezione</Label>
          <RadioGroup value={config.box_inspection || ''} onValueChange={v => update('box_inspection', v)} className="flex flex-wrap gap-3">
            {[
              { value: 'interna', label: 'Interna' },
              { value: 'esterna', label: 'Esterna' },
              { value: 'nessuna', label: 'Nessuna' },
            ].map(opt => (
              <Label key={opt.value} htmlFor={`bx-${opt.value}`} className="flex items-center gap-2 cursor-pointer text-sm">
                <RadioGroupItem value={opt.value} id={`bx-${opt.value}`} /> {opt.label}
              </Label>
            ))}
          </RadioGroup>
        </div>
      </div>
    );
  }

  if (type === 'motorization') {
    return (
      <div className="ml-4 mt-3 space-y-3 rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm font-semibold text-foreground">Configurazione Motorizzazione</p>
        <AccessoryDiagram type="motorization" config={config} />
        <div className="space-y-2">
          <Label className="text-sm">Marca preferita</Label>
          <Input value={config.motor_brand || ''} onChange={e => update('motor_brand', e.target.value)} placeholder="es. Somfy, Nice..." />
        </div>
        <div className="flex items-center gap-3">
          <Checkbox id="motor-remote" checked={config.motor_remote || false} onCheckedChange={v => update('motor_remote', v)} />
          <Label htmlFor="motor-remote" className="text-sm">Telecomando incluso</Label>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox id="motor-sensor" checked={config.motor_sensor || false} onCheckedChange={v => update('motor_sensor', v)} />
          <Label htmlFor="motor-sensor" className="text-sm">Sensore vento/sole</Label>
        </div>
      </div>
    );
  }

  return null;
}
