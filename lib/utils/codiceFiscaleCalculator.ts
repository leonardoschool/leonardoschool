/**
 * Utility per calcolare il codice fiscale italiano
 * Basato sull'algoritmo ufficiale dell'Agenzia delle Entrate
 */

// Tabelle di conversione per il calcolo del codice fiscale
const MESI_CODICI: Record<number, string> = {
  1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'H',
  7: 'L', 8: 'M', 9: 'P', 10: 'R', 11: 'S', 12: 'T'
};

const CARATTERI_PARI: Record<string, number> = {
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
  'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18,
  'T': 19, 'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
};

const CARATTERI_DISPARI: Record<string, number> = {
  '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
  'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
  'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
  'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
};

const CARATTERI_CONTROLLO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Codici catastali dei comuni italiani più comuni (versione ridotta)
// In produzione si dovrebbe usare un database completo
export const COMUNI_CATASTALI: Record<string, string> = {
  'ROMA': 'H501',
  'MILANO': 'F205',
  'NAPOLI': 'F839',
  'TORINO': 'L219',
  'PALERMO': 'G273',
  'GENOVA': 'D969',
  'BOLOGNA': 'A944',
  'FIRENZE': 'D612',
  'BARI': 'A662',
  'CATANIA': 'C351',
  'VENEZIA': 'L736',
  'VERONA': 'L781',
  'MESSINA': 'F158',
  'PADOVA': 'G224',
  'TRIESTE': 'L424',
  'BRESCIA': 'B157',
  'PARMA': 'G337',
  'PRATO': 'G999',
  'TARANTO': 'L049',
  'MODENA': 'F257',
  'REGGIO CALABRIA': 'H224',
  'REGGIO EMILIA': 'H223',
  'PERUGIA': 'G478',
  'RAVENNA': 'H199',
  'LIVORNO': 'E625',
  'CAGLIARI': 'B354',
  'FOGGIA': 'D643',
  'RIMINI': 'H294',
  'SALERNO': 'H703',
  'FERRARA': 'D548',
  'SASSARI': 'I452',
  'LATINA': 'E472',
  'GIUGLIANO IN CAMPANIA': 'E054',
  'MONZA': 'F704',
  'SIRACUSA': 'I754',
  'PESCARA': 'G482',
  'BERGAMO': 'A794',
  'FORLÌ': 'D704',
  'TRENTO': 'L378',
  'VICENZA': 'L840',
  'TERNI': 'L117',
  'BOLZANO': 'A952',
  'NOVARA': 'F952',
  'PIACENZA': 'G535',
  'ANCONA': 'A271',
  'ANDRIA': 'A285',
  'AREZZO': 'A390',
  'UDINE': 'L483',
  'CESENA': 'C573',
  'LECCE': 'E506',
  'PESARO': 'G479',
};

/**
 * Estrae le consonanti da una stringa
 */
function estraiConsonanti(str: string): string {
  return str.toUpperCase().replace(/[^BCDFGHJKLMNPQRSTVWXYZ]/g, '');
}

/**
 * Estrae le vocali da una stringa
 */
function estraiVocali(str: string): string {
  return str.toUpperCase().replace(/[^AEIOU]/g, '');
}

/**
 * Calcola il codice del cognome
 */
function calcolaCognome(cognome: string): string {
  const consonanti = estraiConsonanti(cognome);
  const vocali = estraiVocali(cognome);
  let codice = consonanti + vocali + 'XXX';
  return codice.substring(0, 3);
}

/**
 * Calcola il codice del nome
 */
function calcolaNome(nome: string): string {
  const consonanti = estraiConsonanti(nome);
  const vocali = estraiVocali(nome);
  
  // Se ci sono più di 3 consonanti, si prendono la 1°, 3° e 4°
  let codice: string;
  if (consonanti.length > 3) {
    codice = consonanti[0] + consonanti[2] + consonanti[3];
  } else {
    codice = consonanti + vocali + 'XXX';
  }
  
  return codice.substring(0, 3);
}

/**
 * Calcola il codice di data e sesso
 */
function calcolaDataSesso(dataNascita: Date, sesso: 'M' | 'F'): string {
  const anno = dataNascita.getFullYear().toString().substring(2, 4);
  const mese = MESI_CODICI[dataNascita.getMonth() + 1];
  let giorno = dataNascita.getDate();
  
  // Per le donne si aggiunge 40 al giorno
  if (sesso === 'F') {
    giorno += 40;
  }
  
  const giornoStr = giorno.toString().padStart(2, '0');
  
  return anno + mese + giornoStr;
}

/**
 * Calcola il carattere di controllo
 */
function calcolaCarattereControllo(codiceParziale: string): string {
  let somma = 0;
  
  for (let i = 0; i < codiceParziale.length; i++) {
    const char = codiceParziale[i];
    if (i % 2 === 0) {
      // Posizione dispari (1-indexed)
      somma += CARATTERI_DISPARI[char];
    } else {
      // Posizione pari (1-indexed)
      somma += CARATTERI_PARI[char];
    }
  }
  
  const resto = somma % 26;
  return CARATTERI_CONTROLLO[resto];
}

export interface DatiCodiceFiscale {
  nome: string;
  cognome: string;
  dataNascita: Date;
  sesso: 'M' | 'F';
  comuneNascita: string;
}

/**
 * Calcola il codice fiscale italiano
 * @param dati - Dati anagrafici della persona
 * @returns Il codice fiscale calcolato o null se i dati sono incompleti
 */
export function calcolaCodiceFiscale(dati: DatiCodiceFiscale): string | null {
  const { nome, cognome, dataNascita, sesso, comuneNascita } = dati;
  
  // Validazione dati
  if (!nome || !cognome || !dataNascita || !sesso || !comuneNascita) {
    return null;
  }
  
  // Cerca il codice catastale del comune
  const comuneUpper = comuneNascita.toUpperCase().trim();
  const codiceCatastale = COMUNI_CATASTALI[comuneUpper];
  
  if (!codiceCatastale) {
    // Se il comune non è nella lista, restituisce null
    // L'utente dovrà inserire manualmente il codice fiscale
    return null;
  }
  
  try {
    // Calcola le parti del codice fiscale
    const codiceCognome = calcolaCognome(cognome);
    const codiceNome = calcolaNome(nome);
    const codiceDataSesso = calcolaDataSesso(dataNascita, sesso);
    
    // Codice parziale (senza carattere di controllo)
    const codiceParziale = codiceCognome + codiceNome + codiceDataSesso + codiceCatastale;
    
    // Calcola il carattere di controllo
    const carattereControllo = calcolaCarattereControllo(codiceParziale);
    
    // Codice fiscale completo
    return codiceParziale + carattereControllo;
  } catch (error) {
    console.error('Errore nel calcolo del codice fiscale:', error);
    return null;
  }
}

/**
 * Verifica se un comune è supportato per il calcolo automatico
 */
export function isComuneSupportato(comune: string): boolean {
  return comune.toUpperCase().trim() in COMUNI_CATASTALI;
}

/**
 * Ottiene la lista dei comuni supportati
 */
export function getComuniSupportati(): string[] {
  return Object.keys(COMUNI_CATASTALI).sort();
}
