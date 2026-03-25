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
  hex: string;
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
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  colors: DoorColor[];
  compatibleFrameIds: string[];
  compatibleHandleModelIds: string[];
  compatibleHandleFinishIds: string[];
  specialVariants: DoorSpecialVariant[];
  hasWindowVersion: boolean;
  openingTypes: string[];
}

// ========== TELAI (FRAMES) ==========
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

// ========== MODELLI MANIGLIA ==========
export const ALL_HANDLE_MODELS: DoorHandleModel[] = [
  { id: 'minimal_design', name: 'Minimal Design', description: 'Maniglia a leva design minimale con rosetta quadrata' },
  { id: 'pure', name: 'Pure', description: 'Maniglia a leva dal design pulito e lineare' },
  { id: 'baar', name: 'Baar', description: 'Maniglia a leva dal design contemporaneo' },
];

// ========== FINITURE MANIGLIA ==========
export const ALL_HANDLE_FINISHES: DoorHandleFinish[] = [
  { id: 'cromo_satinato', name: 'Cromo Satinato', hex: '#B8B8B8' },
  { id: 'cromo_lucido', name: 'Cromo Lucido', hex: '#E0E0E0' },
  { id: 'bianco_optical', name: 'Bianco Optical', hex: '#F0F0EC' },
  { id: 'nero', name: 'Nero', hex: '#2A2A2A' },
  { id: 'grigio_alluminio', name: 'Grigio Alluminio', hex: '#A0A0A0' },
];

// ========== COLORI YNCISA 70 ==========
const YNCISA_70_COLORS: DoorColor[] = [
  { id: 'lo_bianco_optical', name: 'Bianco Optical', hex: '#F0F0EC', finish: 'laccato_opaco', green: false },
  { id: 'lo_bianco', name: 'Bianco', hex: '#FAFAF5', finish: 'laccato_opaco', green: false },
  { id: 'lo_grigio_lux', name: 'Grigio Lux', hex: '#B8B8B0', finish: 'laccato_opaco', green: false },
  { id: 'lo_tortora', name: 'Tortora', hex: '#C4B5A2', finish: 'laccato_opaco', green: false },
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

// ========== HELPERS ==========
const DEFAULT_FRAMES = ['evoluto_eleva', 'minimal_eleva', 'quality_eleva', 'dorico'];
const DEFAULT_HANDLES = ['minimal_design', 'pure', 'baar'];
const DEFAULT_HANDLE_FINISHES = ['cromo_satinato', 'cromo_lucido', 'bianco_optical', 'nero', 'grigio_alluminio'];
const DEFAULT_SPECIAL_VARIANTS: DoorSpecialVariant[] = [
  { id: 'modula', name: 'Sistema Modula', description: "Anta pieghevole composta da due ante asimmetriche (1/3 + 2/3)." },
  { id: 'indue', name: 'Sistema InDue', description: "Anta pieghevole composta da due ante simmetriche (50/50)." },
  { id: 'rolling_scrighi', name: 'Rolling Scrighi', description: "Scorrevole interno muro." },
  { id: 'rolling_magic', name: 'Rolling Magic', description: "Scorrevole esterno muro." },
  { id: 'rolling_prima', name: 'Rolling Prima', description: "Scorrevole esterno muro." },
];

function makeDoorModel(id: string, name: string, description: string, opts?: Partial<DoorModel>): DoorModel {
  return {
    id, name, collection: 'CollezioniFL', brand: 'Ferrero Legno', description,
    minWidth: 600, maxWidth: 1000, minHeight: 1750, maxHeight: 2400,
    colors: YNCISA_70_COLORS,
    compatibleFrameIds: DEFAULT_FRAMES,
    compatibleHandleModelIds: DEFAULT_HANDLES,
    compatibleHandleFinishIds: DEFAULT_HANDLE_FINISHES,
    specialVariants: DEFAULT_SPECIAL_VARIANTS,
    hasWindowVersion: false,
    openingTypes: ['battente', 'scorrevole'],
    ...opts,
  };
}

// ========== PORTE STANDARD (cieche) ==========
export const DOOR_MODELS: DoorModel[] = [
  makeDoorModel('yncisa_70', 'Yncisa 70', "Porta cieca con morbide pantografature decorative per il 70° anniversario."),
  makeDoorModel('yncisa_zig_1', 'Yncisa Zig/1', "Pantografatura a zig-zag singola, design geometrico."),
  makeDoorModel('yncisa_zig_2', 'Yncisa Zig/2', "Doppia pantografatura a zig-zag, effetto decorativo pronunciato."),
  makeDoorModel('yncisa_segni', 'Yncisa Segni', "Incisioni lineari orizzontali, stile contemporaneo."),
  makeDoorModel('yncisa_styla', 'Yncisa Styla', "Design elegante con pantografature stilizzate."),
  makeDoorModel('yncisa_tartan', 'Yncisa Tartan', "Motivo a intreccio ispirato al tartan."),
  makeDoorModel('yncisa_tratto', 'Yncisa Tratto', "Tratti lineari orizzontali, design minimalista."),
  makeDoorModel('yncisa_0', 'Yncisa/0', "Porta liscia senza pantografature, finitura uniforme."),
  makeDoorModel('yncisa_1', 'Yncisa/1', "Singola incisione orizzontale, stile essenziale."),
  makeDoorModel('yncisa_8', 'Yncisa/8', "Otto incisioni orizzontali equidistanti."),
  makeDoorModel('equa', 'Equa', "Suddivisione simmetrica delle pantografature."),
  makeDoorModel('equa_1', 'Equa/1', "Singola pantografatura centrale simmetrica."),
  makeDoorModel('equa_styla', 'Equa Styla', "Design simmetrico con finiture stilizzate."),
  makeDoorModel('exit', 'Exit', "Porta cieca dal design pulito."),
  makeDoorModel('lignum_exit', 'Lignum Exit', "Porta con inserti in legno, design premium."),
  makeDoorModel('lignum_exitlyne', 'Lignum Exitlyne', "Porta con linea decorativa e cornice in legno."),
  makeDoorModel('plisse', 'Plissè', "Pantografature plissettate orizzontali."),
  makeDoorModel('plisse_vario', 'Plissè Vario', "Pantografature plissettate a spaziatura variabile."),
  makeDoorModel('suite_4', 'Suite/4', "Quattro bugne decorative."),
  makeDoorModel('suite_6', 'Suite/6', "Sei bugne decorative."),
  makeDoorModel('suite_7', 'Suite/7', "Sette bugne decorative."),
  makeDoorModel('suite_8', 'Suite/8', "Otto bugne decorative."),
  makeDoorModel('suite_9', 'Suite/9', "Nove bugne in stile classico rivisitato."),
  makeDoorModel('suite_10', 'Suite/10', "Dieci bugne decorative."),
  makeDoorModel('suite_21', 'Suite/21', "Ventuno bugne decorative."),
  makeDoorModel('suite_22', 'Suite/22', "Ventidue bugne decorative."),
  makeDoorModel('suite_27', 'Suite/27', "Ventisette bugne decorative."),
  makeDoorModel('suite_29', 'Suite/29', "Ventinove bugne decorative."),
  makeDoorModel('suite_33', 'Suite/33', "Trentatré bugne decorative."),
  makeDoorModel('intaglio_0', 'Intaglio/0', "Porta con intaglio decorativo liscio."),
  makeDoorModel('intaglio_1', 'Intaglio/1', "Singolo intaglio decorativo."),
  makeDoorModel('intaglio_4', 'Intaglio/4', "Quattro intagli decorativi."),
  makeDoorModel('intaglio_8', 'Intaglio/8', "Otto intagli decorativi."),
  makeDoorModel('logica', 'Logica', "Pantografature geometriche logiche."),
  makeDoorModel('logica_1', 'Logica/1', "Singola pantografatura logica."),
  makeDoorModel('logica_4', 'Logica/4', "Quattro pantografature logiche."),
  makeDoorModel('logica_90', 'Logica/90', "Pantografature logiche a 90 gradi."),
  makeDoorModel('liss', 'Liss', "Porta liscia con venatura sottile."),
  makeDoorModel('liss_4', 'Liss/4', "Porta liscia con quattro incisioni."),
  makeDoorModel('liss_90', 'Liss/90', "Porta liscia con incisioni a 90 gradi."),
  makeDoorModel('mixy_1', 'Mixy/1', "Porta cieca con pantografatura singola mixy."),
  makeDoorModel('mixy_2', 'Mixy/2', "Porta cieca con doppia pantografatura mixy."),
  makeDoorModel('mixy_3', 'Mixy/3', "Porta cieca con tripla pantografatura mixy."),
  makeDoorModel('mixy_7', 'Mixy/7', "Porta cieca con sette pantografature mixy."),
  makeDoorModel('mixy_8', 'Mixy/8', "Porta cieca con otto pantografature mixy."),
  makeDoorModel('mixy_23', 'Mixy/23', "Porta cieca con ventitré pantografature mixy."),
  makeDoorModel('mixy_24', 'Mixy/24', "Porta cieca con ventiquattro pantografature mixy."),
  makeDoorModel('supernova', 'Supernova', "Legno massello con design contemporaneo."),
  makeDoorModel('nova', 'Nova', "Venatura a vista, stile naturale."),
  makeDoorModel('tratto', 'Tratto', "Incisioni lineari, design pulito."),
  makeDoorModel('segni', 'Segni', "Segni decorativi orizzontali."),
  makeDoorModel('bilico', 'Bilico', "Apertura pivotante centrale."),
];

// ========== PORTE FINESTRATE (con vetro/finestra) ==========
export const FINESTRATA_MODELS: DoorModel[] = [
  makeDoorModel('f_mixy_1', 'Mixy/1', "Porta finestrata con pannello vetro singolo."),
  makeDoorModel('f_mixy_2', 'Mixy/2', "Porta finestrata con doppio pannello vetro."),
  makeDoorModel('f_mixy_3', 'Mixy/3', "Porta finestrata con triplo pannello vetro."),
  makeDoorModel('f_mixy_7', 'Mixy/7', "Porta finestrata con sette riquadri vetro."),
  makeDoorModel('f_mixy_8', 'Mixy/8', "Porta finestrata con otto riquadri vetro."),
  makeDoorModel('f_mixy_23', 'Mixy/23', "Porta finestrata con ventitré riquadri."),
  makeDoorModel('f_mixy_24', 'Mixy/24', "Porta finestrata con ventiquattro riquadri."),
  makeDoorModel('f_equa_styla_vetro', 'Equa Styla Vetro', "Porta simmetrica con inserto vetro stilizzato."),
  makeDoorModel('f_equa_vetro', 'Equa Vetro', "Porta simmetrica con inserto vetro centrale."),
  makeDoorModel('f_exitlyne_vetro', 'Exitlyne Vetro', "Porta con linea di vetro verticale."),
  makeDoorModel('f_exit_vetro', 'Exit Vetro', "Porta con inserto vetro nella parte superiore."),
  makeDoorModel('f_yncisa_styla_vetro', 'Yncisa Styla Vetro', "Porta Yncisa con inserto vetro stilizzato."),
  makeDoorModel('f_suite_4', 'Suite/4', "Porta finestrata con quattro bugne e vetro."),
  makeDoorModel('f_suite_6', 'Suite/6', "Porta finestrata con sei bugne e vetro."),
  makeDoorModel('f_suite_7', 'Suite/7', "Porta finestrata con sette bugne e vetro."),
  makeDoorModel('f_suite_8', 'Suite/8', "Porta finestrata con otto bugne e vetro."),
  makeDoorModel('f_suite_21', 'Suite/21', "Porta finestrata con ventuno bugne e vetro."),
  makeDoorModel('f_suite_22', 'Suite/22', "Porta finestrata con ventidue bugne e vetro."),
  makeDoorModel('f_suite_27', 'Suite/27', "Porta finestrata con ventisette bugne e vetro."),
  makeDoorModel('f_suite_29', 'Suite/29', "Porta finestrata con ventinove bugne e vetro."),
  makeDoorModel('f_suite_33', 'Suite/33', "Porta finestrata con trentatré bugne e vetro."),
  makeDoorModel('f_intaglio_0', 'Intaglio/0', "Porta finestrata con intaglio e vetro."),
  makeDoorModel('f_intaglio_2', 'Intaglio/2', "Porta finestrata con due intagli e vetro."),
  makeDoorModel('f_intaglio_10_vetro', 'Intaglio/10 Vetro', "Porta finestrata con dieci intagli e vetro."),
  makeDoorModel('f_kevia_1', 'Kevia/1', "Porta classica finestrata con una bugna e vetro."),
  makeDoorModel('f_kevia_2', 'Kevia/2', "Porta classica finestrata con due bugne e vetro."),
  makeDoorModel('f_kevia_3', 'Kevia/3', "Porta classica finestrata con tre bugne e vetro."),
  makeDoorModel('f_kevia_4', 'Kevia/4', "Porta classica finestrata con quattro bugne e vetro."),
  makeDoorModel('f_kevia_5', 'Kevia/5', "Porta classica finestrata con cinque bugne e vetro."),
  makeDoorModel('f_kevia_6', 'Kevia/6', "Porta classica finestrata con sei bugne e vetro."),
  makeDoorModel('f_kevia_7', 'Kevia/7', "Porta classica finestrata con sette bugne e vetro."),
  makeDoorModel('f_kevia_8', 'Kevia/8', "Porta classica finestrata con otto bugne e vetro."),
  makeDoorModel('f_kevia_9', 'Kevia/9', "Porta classica finestrata con nove bugne e vetro."),
  makeDoorModel('f_kevia_10', 'Kevia/10', "Porta classica finestrata con dieci bugne e vetro."),
  makeDoorModel('f_kevia_11', 'Kevia/11', "Porta classica finestrata con undici bugne e vetro."),
  makeDoorModel('f_kevia_12', 'Kevia/12', "Porta classica finestrata con dodici bugne e vetro."),
  makeDoorModel('f_kevia_13', 'Kevia/13', "Porta classica finestrata con tredici bugne e vetro."),
  makeDoorModel('f_kevia_14', 'Kevia/14', "Porta classica finestrata con quattordici bugne e vetro."),
  makeDoorModel('f_logica_vetro', 'Logica Vetro', "Porta logica con inserto vetro."),
  makeDoorModel('f_liss_vetro', 'Liss Vetro', "Porta liscia con inserto vetro verticale."),
  makeDoorModel('f_liss_vetro_large', 'Liss Vetro Large', "Porta liscia con grande inserto vetro."),
  makeDoorModel('f_area', 'Area', "Porta finestrata con pannello vetro area."),
  makeDoorModel('f_area_1', 'Area/1', "Porta finestrata area con singolo inserto vetro."),
  makeDoorModel('f_area_2', 'Area/2', "Porta finestrata area con doppio inserto vetro."),
  makeDoorModel('f_area_2_simply', 'Area/2 Simply', "Porta finestrata area semplificata."),
  makeDoorModel('f_area_31', 'Area/31', "Porta finestrata area con trentuno riquadri."),
  makeDoorModel('f_diva', 'Diva', "Porta finestrata classica con vetro decorato."),
  makeDoorModel('f_epoca', 'Epoca', "Porta finestrata stile classico con vetro."),
  makeDoorModel('f_mito', 'Mito', "Porta finestrata con vetro ovale."),
  makeDoorModel('f_talento', 'Talento', "Porta finestrata dal design raffinato."),
  makeDoorModel('f_arca', 'Arca', "Porta finestrata con vetro ad arco."),
  makeDoorModel('f_magika', 'Magika', "Porta finestrata con vetro decorato magika."),
  makeDoorModel('f_musa', 'Musa', "Porta finestrata con vetro ovale basso."),
  makeDoorModel('f_tempora', 'Tempora', "Porta finestrata con vetro ad arco classico."),
  makeDoorModel('f_forma_2', 'Forma/2', "Porta finestrata con due pannelli forma."),
  makeDoorModel('f_forma_3', 'Forma/3', "Porta finestrata con tre pannelli forma."),
];

// ========== PORTE FILOMURO (telaio a scomparsa) ==========
export const FILOMURO_MODELS: DoorModel[] = [
  makeDoorModel('fm_yncisa_70_zero', 'Yncisa 70 Zero', "Porta filomuro con pantografature del 70° anniversario.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_yncisa_segni_zero', 'Yncisa Segni Zero', "Porta filomuro con incisioni lineari.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_yncisa_styla_zero', 'Yncisa Styla Zero', "Porta filomuro con pantografature stilizzate.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_yncisa_tartan_zero', 'Yncisa Tartan Zero', "Porta filomuro con motivo tartan.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_yncisa_tratto_zero', 'Yncisa Tratto Zero', "Porta filomuro con tratti lineari.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_yncisa_0_zero', 'Yncisa/0 Zero', "Porta filomuro liscia senza pantografature.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_yncisa_1_zero', 'Yncisa/1 Zero', "Porta filomuro con singola incisione.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_yncisa_8_zero', 'Yncisa/8 Zero', "Porta filomuro con otto incisioni.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_liss_zero', 'Liss Zero', "Porta filomuro liscia.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_logica_zero', 'Logica Zero', "Porta filomuro con pantografature logiche.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_exit_zero', 'Exit Zero', "Porta filomuro exit.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_exitlyne_zero', 'Exitlyne Zero', "Porta filomuro exitlyne.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_equa_zero', 'Equa Zero', "Porta filomuro con pantografature simmetriche.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_equa_styla_zero', 'Equa Styla Zero', "Porta filomuro con design simmetrico stilizzato.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_plisse_zero', 'Plissè Zero', "Porta filomuro con pantografature plissettate.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_plisse_vario_zero', 'Plissè Vario Zero', "Porta filomuro con plissettature a spaziatura variabile.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_suite_4_zero', 'Suite/4 Zero', "Porta filomuro con quattro bugne.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_suite_6_zero', 'Suite/6 Zero', "Porta filomuro con sei bugne.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_suite_7_zero', 'Suite/7 Zero', "Porta filomuro con sette bugne.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_suite_9_zero', 'Suite/9 Zero', "Porta filomuro con nove bugne.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_suite_10_zero', 'Suite/10 Zero', "Porta filomuro con dieci bugne.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_suite_21_zero', 'Suite/21 Zero', "Porta filomuro con ventuno bugne.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_suite_22_zero', 'Suite/22 Zero', "Porta filomuro con ventidue bugne.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_suite_27_zero', 'Suite/27 Zero', "Porta filomuro con ventisette bugne.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_suite_29_zero', 'Suite/29 Zero', "Porta filomuro con ventinove bugne.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_suite_33_zero', 'Suite/33 Zero', "Porta filomuro con trentatré bugne.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_mixy_1_zero', 'Mixy/1 Zero', "Porta filomuro mixy con singola pantografatura.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_mixy_2_zero', 'Mixy/2 Zero', "Porta filomuro mixy con doppia pantografatura.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_mixy_3_zero', 'Mixy/3 Zero', "Porta filomuro mixy con tripla pantografatura.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_mixy_7_zero', 'Mixy/7 Zero', "Porta filomuro mixy con sette pantografature.", { compatibleFrameIds: ['a_filo', 'concept'] }),
  makeDoorModel('fm_mixy_8_zero', 'Mixy/8 Zero', "Porta filomuro mixy con otto pantografature.", { compatibleFrameIds: ['a_filo', 'concept'] }),
];

// ========== HELPER: get correct model list by product type ==========
export function getModelsForProductType(productType: string): DoorModel[] {
  if (productType === 'porta_finestrata') return FINESTRATA_MODELS;
  if (productType === 'porta_filomuro') return FILOMURO_MODELS;
  return DOOR_MODELS;
}

// ========== HELPER FUNCTIONS ==========
export function getDoorModel(modelId: string): DoorModel | undefined {
  return DOOR_MODELS.find(m => m.id === modelId)
    || FINESTRATA_MODELS.find(m => m.id === modelId)
    || FILOMURO_MODELS.find(m => m.id === modelId);
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

export function isDoorType(productType: string): boolean {
  return productType === 'porta' || productType === 'porta_finestrata' || productType === 'porta_filomuro';
}
