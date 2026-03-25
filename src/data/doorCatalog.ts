// Database catalogo porte - Ferrero Legno
// Struttura modulare: ogni modello definisce i colori, telai e maniglie compatibili

export interface DoorColor {
  id: string;
  name: string;
  hex: string;
  finish: 'laccato_opaco' | 'laccato_ultra_opaco';
  green: boolean; // Certificazione GREEN
}

export interface DoorFrame {
  id: string;
  name: string;
  description?: string;
}

export interface DoorHandleModel {
  id: string;
  name: string;
  description?: string;
}

export interface DoorHandleFinish {
  id: string;
  name: string;
  hex: string; // colore visivo per il rendering
}

export interface DoorSpecialVariant {
  id: string;
  name: string;
  description: string;
}

export interface DoorModel {
  id: string;
  name: string;
  collection: string;
  brand: string;
  description: string;
  minWidth: number; // mm
  maxWidth: number; // mm
  minHeight: number; // mm
  maxHeight: number; // mm
  colors: DoorColor[];
  compatibleFrameIds: string[];
  compatibleHandleModelIds: string[];
  compatibleHandleFinishIds: string[];
  specialVariants: DoorSpecialVariant[];
  hasWindowVersion: boolean;
  openingTypes: string[]; // battente, scorrevole, etc.
}

// ========== TELAI (FRAMES) - Database generale ==========
export const ALL_FRAMES: DoorFrame[] = [
  { id: 'evoluto_eleva', name: 'Evoluto Eleva', description: 'Telaio a scomparsa con profilo sottile' },
  { id: 'minimal_eleva', name: 'Minimal Eleva', description: 'Telaio minimal con spessore ridotto' },
  { id: 'quality_eleva', name: 'Quality Eleva', description: 'Telaio classico con finiture di pregio' },
  { id: 'dorico', name: 'Dorico', description: 'Telaio tradizionale con profilo decorato' },
  { id: 'flat', name: 'Flat', description: 'Telaio piatto a filo muro' },
  { id: 'genius_eleva', name: 'Genius Eleva', description: 'Telaio innovativo con sistema di regolazione' },
  { id: 'oval_eleva', name: 'Oval Eleva', description: 'Telaio con profilo arrotondato' },
  { id: 'a_filo', name: 'A Filo', description: 'Telaio completamente a filo parete' },
  { id: 'concept', name: 'Concept', description: 'Telaio design contemporaneo' },
];

// ========== MODELLI MANIGLIA (HANDLE MODELS) ==========
export const ALL_HANDLE_MODELS: DoorHandleModel[] = [
  { id: 'minimal_design', name: 'Minimal Design', description: 'Maniglia a leva design minimale con rosetta quadrata' },
  { id: 'pure', name: 'Pure', description: 'Maniglia a leva dal design pulito e lineare' },
  { id: 'baar', name: 'Baar', description: 'Maniglia a leva dal design contemporaneo' },
];

// ========== FINITURE MANIGLIA (HANDLE FINISHES) ==========
export const ALL_HANDLE_FINISHES: DoorHandleFinish[] = [
  { id: 'cromo_satinato', name: 'Cromo Satinato', hex: '#B8B8B8' },
  { id: 'cromo_lucido', name: 'Cromo Lucido', hex: '#E0E0E0' },
  { id: 'bianco_optical', name: 'Bianco Optical', hex: '#F0F0EC' },
  { id: 'nero', name: 'Nero', hex: '#2A2A2A' },
  { id: 'grigio_alluminio', name: 'Grigio Alluminio', hex: '#A0A0A0' },
];

// ========== COLORI YNCISA 70 ==========
const YNCISA_70_COLORS: DoorColor[] = [
  // Laccato opaco (4 colori)
  { id: 'lo_bianco_optical', name: 'Bianco Optical', hex: '#F0F0EC', finish: 'laccato_opaco', green: false },
  { id: 'lo_bianco', name: 'Bianco', hex: '#FAFAF5', finish: 'laccato_opaco', green: false },
  { id: 'lo_grigio_lux', name: 'Grigio Lux', hex: '#B8B8B0', finish: 'laccato_opaco', green: false },
  { id: 'lo_tortora', name: 'Tortora', hex: '#C4B5A2', finish: 'laccato_opaco', green: false },

  // Laccato ULTRA opaco GREEN (26 colori)
  { id: 'uo_tortora', name: 'Tortora', hex: '#C4B5A2', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_bianco_optical', name: 'Bianco Optical', hex: '#F0F0EC', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_bianco', name: 'Bianco', hex: '#FAFAF5', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_grigio_lux', name: 'Grigio Lux', hex: '#B8B8B0', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_corallo_light', name: 'Corallo Light', hex: '#E8A090', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_corallo_pure', name: 'Corallo Pure', hex: '#D4756A', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_metallo_light', name: 'Metallo Light', hex: '#A8AEB4', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_metallo_pure', name: 'Metallo Pure', hex: '#8A9098', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_metallo_dark', name: 'Metallo Dark', hex: '#5A6068', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_laguna_light', name: 'Laguna Light', hex: '#7AAAB0', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_laguna_pure', name: 'Laguna Pure', hex: '#4A8A92', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_laguna_dark', name: 'Laguna Dark', hex: '#2A6A72', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_lichene_light', name: 'Lichene Light', hex: '#A8B8A0', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_lichene_pure', name: 'Lichene Pure', hex: '#7A9A70', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_terra_light', name: 'Terra Light', hex: '#C4A882', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_terra_pure', name: 'Terra Pure', hex: '#A08060', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_oliva_light', name: 'Oliva Light', hex: '#9AA87A', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_oliva_pure', name: 'Oliva Pure', hex: '#7A8A5A', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_oliva_dark', name: 'Oliva Dark', hex: '#4A5A32', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_ombra_light', name: 'Ombra Light', hex: '#A89890', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_ombra_pure', name: 'Ombra Pure', hex: '#887068', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_ombra_dark', name: 'Ombra Dark', hex: '#584840', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_malva_light', name: 'Malva Light', hex: '#C0A0B0', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_malva_pure', name: 'Malva Pure', hex: '#A07888', finish: 'laccato_ultra_opaco', green: true },
  { id: 'uo_nero_profondo', name: 'Nero Profondo', hex: '#1A1A1A', finish: 'laccato_ultra_opaco', green: true },
];

// ========== MODELLI PORTA ==========
export const DOOR_MODELS: DoorModel[] = [
  {
    id: 'yncisa_70',
    name: 'Yncisa 70',
    collection: 'CollezioniFL',
    brand: 'Ferrero Legno',
    description: "Porta per interni a battente o scorrevole cieca. L'anta, ideata e creata per celebrare il settantesimo anniversario dell'azienda, è disponibile in numerose finiture laccate. Questo modello si caratterizza per morbide pantografature che creano particolari e suggestivi decori.",
    minWidth: 600,
    maxWidth: 1000,
    minHeight: 1750,
    maxHeight: 2400,
    colors: YNCISA_70_COLORS,
    compatibleFrameIds: ['evoluto_eleva', 'minimal_eleva', 'quality_eleva', 'dorico'],
    compatibleHandleModelIds: ['minimal_design', 'pure', 'baar'],
    compatibleHandleFinishIds: ['cromo_satinato', 'cromo_lucido', 'bianco_optical', 'nero', 'grigio_alluminio'],
    specialVariants: [
      {
        id: 'modula',
        name: 'Sistema Modula',
        description: "Anta pieghevole composta da due ante asimmetriche (anta lato cerniera larghezza 1/3, anta lato maniglia 2/3). Consente di ridurre l'ingombro dell'apertura della porta.",
      },
      {
        id: 'indue',
        name: 'Sistema InDue',
        description: "Anta pieghevole composta da due ante simmetriche. Consente l'ottimizzazione degli spazi dimezzando l'ingombro dell'apertura della porta.",
      },
      {
        id: 'rolling_scrighi',
        name: 'Rolling Scrighi',
        description: "Il sistema rolling Scrighi è scorrevole interno muro ed è disponibile per tutti i modelli di porta.",
      },
      {
        id: 'rolling_magic',
        name: 'Rolling Magic',
        description: "Il sistema rolling Magic è scorrevole esterno muro: chiedete al vostro rivenditore di fiducia per quali modelli è disponibile.",
      },
      {
        id: 'rolling_prima',
        name: 'Rolling Prima',
        description: "Il sistema rolling Prima è scorrevole esterno muro ed è disponibile per tutti i modelli di porta.",
      },
    ],
    hasWindowVersion: true,
    openingTypes: ['battente', 'scorrevole'],
  },
];

// ========== HELPER FUNCTIONS ==========
export function getDoorModel(modelId: string): DoorModel | undefined {
  return DOOR_MODELS.find(m => m.id === modelId);
}

export function getCompatibleFrames(modelId: string): DoorFrame[] {
  const model = getDoorModel(modelId);
  if (!model) return ALL_FRAMES;
  return ALL_FRAMES.filter(f => model.compatibleFrameIds.includes(f.id));
}

export function getCompatibleHandleModels(modelId: string): DoorHandleModel[] {
  const model = getDoorModel(modelId);
  if (!model) return ALL_HANDLE_MODELS;
  return ALL_HANDLE_MODELS.filter(h => model.compatibleHandleModelIds.includes(h.id));
}

export function getCompatibleHandleFinishes(modelId: string): DoorHandleFinish[] {
  const model = getDoorModel(modelId);
  if (!model) return ALL_HANDLE_FINISHES;
  return ALL_HANDLE_FINISHES.filter(h => model.compatibleHandleFinishIds.includes(h.id));
}

export function getHandleFinishHex(finishId: string): string {
  return ALL_HANDLE_FINISHES.find(f => f.id === finishId)?.hex || '#B8B8B8';
}

export function getColorsByFinish(colors: DoorColor[], finish?: string): DoorColor[] {
  if (!finish) return colors;
  return colors.filter(c => c.finish === finish);
}
