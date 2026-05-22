export type ContractPlaceholderTarget = 'STUDENT' | 'COLLABORATOR';

export interface ContractPlaceholder {
  tag: string;
  desc: string;
}

export const baseContractPlaceholders: ContractPlaceholder[] = [
  { tag: '{{NOME_COMPLETO}}', desc: 'Nome e cognome' },
  { tag: '{{EMAIL}}', desc: 'Email' },
  { tag: '{{CODICE_FISCALE}}', desc: 'Codice fiscale' },
  { tag: '{{DATA_NASCITA}}', desc: 'Data di nascita' },
  { tag: '{{COMUNE_NASCITA}}', desc: 'Comune di nascita' },
  { tag: '{{TELEFONO}}', desc: 'Numero di telefono' },
  { tag: '{{INDIRIZZO}}', desc: 'Via e numero civico' },
  { tag: '{{CITTA}}', desc: 'Citta' },
  { tag: '{{PROVINCIA}}', desc: 'Sigla provincia' },
  { tag: '{{CAP}}', desc: 'CAP' },
  { tag: '{{INDIRIZZO_COMPLETO}}', desc: 'Indirizzo completo' },
  { tag: '{{DATA_ODIERNA}}', desc: 'Data odierna (es: 21 maggio 2026)' },
  { tag: '{{ANNO}}', desc: 'Solo anno corrente (es: 2026)' },
  { tag: '{{FIRMA}}', desc: 'Riquadro firma (canvas interattivo per utente/collaboratore)' },
];

export const collaboratorContractPlaceholders: ContractPlaceholder[] = [
  { tag: '{{DATA_INIZIO}}', desc: 'Data inizio collaborazione' },
  { tag: '{{DATA_FINE}}', desc: 'Data fine collaborazione' },
  { tag: '{{COMPENSO}}', desc: 'Compenso pattuito' },
  { tag: '{{SPECIALIZZAZIONE}}', desc: 'Area di competenza' },
];

export function getContractPlaceholders(target: ContractPlaceholderTarget): ContractPlaceholder[] {
  return target === 'COLLABORATOR'
    ? [...baseContractPlaceholders, ...collaboratorContractPlaceholders]
    : baseContractPlaceholders;
}