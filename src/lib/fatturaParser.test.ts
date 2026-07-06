import { describe, it, expect } from 'vitest';
import { parseFatturaXML } from './fatturaParser';
import { scritturaFatturaPassiva, verificaQuadratura, chiaveFattura } from './accounting';

const ROMANIA = `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2">
  <FatturaElettronicaHeader>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA><IdPaese>RO</IdPaese><IdCodice>RO12345678</IdCodice></IdFiscaleIVA>
        <Anagrafica><Denominazione>ROMANIA COMPONENTS SRL</Denominazione></Anagrafica>
      </DatiAnagrafici>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici><Anagrafica><Denominazione>LA NOSTRA AZIENDA SRL</Denominazione></Anagrafica></DatiAnagrafici>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali><DatiGeneraliDocumento>
      <TipoDocumento>TD01</TipoDocumento><Data>2026-02-18</Data>
      <Numero>INV-2026-77</Numero><ImportoTotaleDocumento>3000.00</ImportoTotaleDocumento>
    </DatiGeneraliDocumento></DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee><Descrizione>Acquisto componenti</Descrizione></DettaglioLinee>
      <DatiRiepilogo><AliquotaIVA>0.00</AliquotaIVA><Natura>N3.2</Natura><ImponibileImporto>3000.00</ImponibileImporto><Imposta>0.00</Imposta></DatiRiepilogo>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;

const ITALIA = `<?xml version="1.0"?>
<p:FatturaElettronica versione="FPR12" xmlns:p="http://x">
  <FatturaElettronicaHeader>
    <CedentePrestatore><DatiAnagrafici>
      <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>01122334455</IdCodice></IdFiscaleIVA>
      <Anagrafica><Denominazione>ENEL ENERGIA SPA</Denominazione></Anagrafica>
    </DatiAnagrafici></CedentePrestatore>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali><DatiGeneraliDocumento><Data>2026-01-05</Data><Numero>10</Numero><ImportoTotaleDocumento>1220.00</ImportoTotaleDocumento></DatiGeneraliDocumento></DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee><Descrizione>Fornitura energia elettrica</Descrizione></DettaglioLinee>
      <DatiRiepilogo><AliquotaIVA>22.00</AliquotaIVA><ImponibileImporto>1000.00</ImponibileImporto><Imposta>220.00</Imposta></DatiRiepilogo>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;

describe('parseFatturaXML — Romania (reverse charge)', () => {
  const inv = parseFatturaXML(ROMANIA);
  it('estrae i campi correttamente', () => {
    expect(inv.fornitore).toBe('ROMANIA COMPONENTS SRL');
    expect(inv.paese_fornitore).toBe('RO');
    expect(inv.piva_fornitore).toBe('RO12345678');
    expect(inv.imponibile).toBe(3000);
    expect(inv.imposta).toBe(0);
    expect(inv.totale).toBe(3000);
    expect(inv.natura).toBe('N3.2');
    expect(inv.numero).toBe('INV-2026-77');
    expect(inv.data).toBe('2026-02-18');
  });
  it('rileva intra_ue e genera reverse charge che quadra e azzera l\'IVA', () => {
    expect(inv.intra_ue).toBe(true);
    const lines = scritturaFatturaPassiva(inv, '60');
    const q = verificaQuadratura(lines);
    expect(q.ok).toBe(true);
    const iva18 = lines.find(l => l.account_code === '18')!.dare;
    const iva45 = lines.find(l => l.account_code === '45')!.avere;
    expect(iva18).toBe(660);       // 3000 * 22%
    expect(iva18 - iva45).toBe(0); // saldo IVA zero
    expect(chiaveFattura(inv)).toBe('RO12345678|INV-2026-77|2026-02-18');
  });
});

describe('parseFatturaXML — Italia (con IVA)', () => {
  it('estrae imponibile/imposta e NON è intra_ue', () => {
    const inv = parseFatturaXML(ITALIA);
    expect(inv.fornitore).toBe('ENEL ENERGIA SPA');
    expect(inv.paese_fornitore).toBe('IT');
    expect(inv.imponibile).toBe(1000);
    expect(inv.imposta).toBe(220);
    expect(inv.intra_ue).toBe(false);
    const lines = scritturaFatturaPassiva(inv, '61');
    expect(verificaQuadratura(lines).ok).toBe(true);
  });
});
