/**
 * Single Seed Script
 * - Reset completo DB di sviluppo
 * - Cancella utenti seed da Firebase Auth (best-effort)
 * - Crea utenti seed (admin, collaboratori, studenti) su Firebase + PostgreSQL
 * - Popola materie, domande, classi, simulazioni demo
 *
 * Usage: pnpm seed
 */

import { config } from 'dotenv';
config({ path: '.env' });

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import {
  DifficultyLevel,
  PrismaClient,
  QuestionStatus,
  QuestionType,
  SimulationStatus,
  SimulationType,
  SimulationVisibility,
  UserRole,
} from '@prisma/client';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();
const TEST_PASSWORD = 'TestPassword123!';
const SEED_MARKER = 'Seed Demo Data';

// Firebase init
let serviceAccount: Record<string, unknown>;
const serviceAccountPath = join(process.cwd(), 'leonardo-school-1cd72-firebase-adminsdk-fbsvc-6c031d9728.json');
if (existsSync(serviceAccountPath)) {
  console.log('📄 Loading Firebase credentials from local JSON file...');
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.log('🔑 Loading Firebase credentials from environment variable...');
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} else {
  serviceAccount = {};
}

if (!serviceAccount.project_id) {
  console.error('❌ Firebase credentials not found!');
  console.error('   Put the JSON file or set FIREBASE_SERVICE_ACCOUNT_KEY');
  process.exit(1);
}

const adminApp = getApps().length === 0
  ? initializeApp({ credential: cert(serviceAccount as Parameters<typeof cert>[0]) })
  : getApps()[0];
const adminAuth = getAuth(adminApp);

// ===================== DATA =====================
const SEED_USERS = {
  admins: [
    { email: 'admin1@leonardoschool.test', name: 'Mario Rossi' },
    { email: 'admin2@leonardoschool.test', name: 'Laura Bianchi' },
    { email: 'admin3@leonardoschool.test', name: 'Giuseppe Verdi' },
  ],
  collaboratori: [
    { email: 'collab1@leonardoschool.test', name: 'Anna Ferrari', telefono: '3331234567', codiceFiscale: 'FRRNNA80A01H501Z' },
    { email: 'collab2@leonardoschool.test', name: 'Marco Ricci', telefono: '3332345678', codiceFiscale: 'RCCMRC85B02H501Z' },
    { email: 'collab3@leonardoschool.test', name: 'Giulia Marino', telefono: '3333456789', codiceFiscale: 'MRNGLI90C03H501Z' },
    { email: 'collab4@leonardoschool.test', name: 'Francesco Romano', telefono: '3334567890', codiceFiscale: 'RMNFNC88D04H501Z' },
    { email: 'collab5@leonardoschool.test', name: 'Sara Colombo', telefono: '3335678901', codiceFiscale: 'CLMSRA92E05H501Z' },
    { email: 'collab6@leonardoschool.test', name: 'Alessandro Bruno', telefono: '3336789012', codiceFiscale: 'BRNLSN87F06H501Z' },
    { email: 'collab7@leonardoschool.test', name: 'Elena Gallo', telefono: '3337890123', codiceFiscale: 'GLLLNE91G07H501Z' },
    { email: 'collab8@leonardoschool.test', name: 'Davide Costa', telefono: '3338901234', codiceFiscale: 'CSTDVD89H08H501Z' },
    { email: 'collab9@leonardoschool.test', name: 'Chiara Conti', telefono: '3339012345', codiceFiscale: 'CNTCHR93I09H501Z' },
    { email: 'collab10@leonardoschool.test', name: 'Luca Giordano', telefono: '3340123456', codiceFiscale: 'GRDLCU86L10H501Z' },
  ],
  studenti: [
    { email: 'studente1@leonardoschool.test', name: 'Matteo De Luca', telefono: '3341234567', codiceFiscale: 'DLCMTT02A01H501Z', dataNascita: '2002-01-15', luogoNascita: 'Roma', indirizzo: 'Via Roma 123', cap: '00100', citta: 'Roma', provincia: 'RM' },
    { email: 'studente2@leonardoschool.test', name: 'Sofia Esposito', telefono: '3342345678', codiceFiscale: 'SPSSFO03B02H501Z', dataNascita: '2003-02-20', luogoNascita: 'Milano', indirizzo: 'Via Milano 45', cap: '20100', citta: 'Milano', provincia: 'MI' },
    { email: 'studente3@leonardoschool.test', name: 'Lorenzo Fontana', telefono: '3343456789', codiceFiscale: 'FNTLRN02C03H501Z', dataNascita: '2002-03-25', luogoNascita: 'Napoli', indirizzo: 'Via Napoli 67', cap: '80100', citta: 'Napoli', provincia: 'NA' },
    { email: 'studente4@leonardoschool.test', name: 'Giulia Santoro', telefono: '3344567890', codiceFiscale: 'SNTGLI03D04H501Z', dataNascita: '2003-04-10', luogoNascita: 'Torino', indirizzo: 'Via Torino 89', cap: '10100', citta: 'Torino', provincia: 'TO' },
    { email: 'studente5@leonardoschool.test', name: 'Alessandro Moretti', telefono: '3345678901', codiceFiscale: 'MRTLSN02E05H501Z', dataNascita: '2002-05-15', luogoNascita: 'Bologna', indirizzo: 'Via Bologna 12', cap: '40100', citta: 'Bologna', provincia: 'BO' },
    { email: 'studente6@leonardoschool.test', name: 'Francesca Leone', telefono: '3346789012', codiceFiscale: 'LNEFNC03F06H501Z', dataNascita: '2003-06-20', luogoNascita: 'Firenze', indirizzo: 'Via Firenze 34', cap: '50100', citta: 'Firenze', provincia: 'FI' },
    { email: 'studente7@leonardoschool.test', name: 'Marco Benedetti', telefono: '3347890123', codiceFiscale: 'BNDMRC02G07H501Z', dataNascita: '2002-07-25', luogoNascita: 'Genova', indirizzo: 'Via Genova 56', cap: '16100', citta: 'Genova', provincia: 'GE' },
    { email: 'studente8@leonardoschool.test', name: 'Valentina Serra', telefono: '3348901234', codiceFiscale: 'SRRVNT03H08H501Z', dataNascita: '2003-08-30', luogoNascita: 'Palermo', indirizzo: 'Via Palermo 78', cap: '90100', citta: 'Palermo', provincia: 'PA' },
    { email: 'studente9@leonardoschool.test', name: 'Gabriele Vitale', telefono: '3349012345', codiceFiscale: 'VTLGBR02I09H501Z', dataNascita: '2002-09-05', luogoNascita: 'Catania', indirizzo: 'Via Catania 90', cap: '95100', citta: 'Catania', provincia: 'CT' },
    { email: 'studente10@leonardoschool.test', name: 'Martina Orlando', telefono: '3350123456', codiceFiscale: 'RLNMRT03L10H501Z', dataNascita: '2003-10-10', luogoNascita: 'Venezia', indirizzo: 'Via Venezia 23', cap: '30100', citta: 'Venezia', provincia: 'VE' },
    { email: 'studente11@leonardoschool.test', name: 'Andrea Ferri', telefono: '3351234567', codiceFiscale: 'FRRNDR02M11H501Z', dataNascita: '2002-11-15', luogoNascita: 'Verona', indirizzo: 'Via Verona 45', cap: '37100', citta: 'Verona', provincia: 'VR' },
    { email: 'studente12@leonardoschool.test', name: 'Beatrice Mancini', telefono: '3352345678', codiceFiscale: 'MNCBTR03N12H501Z', dataNascita: '2003-12-20', luogoNascita: 'Padova', indirizzo: 'Via Padova 67', cap: '35100', citta: 'Padova', provincia: 'PD' },
    { email: 'studente13@leonardoschool.test', name: 'Riccardo Greco', telefono: '3353456789', codiceFiscale: 'GRCRCC02A13H501Z', dataNascita: '2002-01-25', luogoNascita: 'Trieste', indirizzo: 'Via Trieste 89', cap: '34100', citta: 'Trieste', provincia: 'TS' },
    { email: 'studente14@leonardoschool.test', name: 'Camilla Russo', telefono: '3354567890', codiceFiscale: 'RSSCML03B14H501Z', dataNascita: '2003-02-28', luogoNascita: 'Bari', indirizzo: 'Via Bari 12', cap: '70100', citta: 'Bari', provincia: 'BA' },
    { email: 'studente15@leonardoschool.test', name: 'Tommaso Marchetti', telefono: '3355678901', codiceFiscale: 'MRCTMS02C15H501Z', dataNascita: '2002-03-10', luogoNascita: 'Brescia', indirizzo: 'Via Brescia 34', cap: '25100', citta: 'Brescia', provincia: 'BS' },
    { email: 'studente16@leonardoschool.test', name: 'Alice Monti', telefono: '3356789012', codiceFiscale: 'MNTLCA03D16H501Z', dataNascita: '2003-04-15', luogoNascita: 'Parma', indirizzo: 'Via Parma 56', cap: '43100', citta: 'Parma', provincia: 'PR' },
    { email: 'studente17@leonardoschool.test', name: 'Edoardo Barbieri', telefono: '3357890123', codiceFiscale: 'BRBRDR02E17H501Z', dataNascita: '2002-05-20', luogoNascita: 'Modena', indirizzo: 'Via Modena 78', cap: '41100', citta: 'Modena', provincia: 'MO' },
    { email: 'studente18@leonardoschool.test', name: 'Emma Silvestri', telefono: '3358901234', codiceFiscale: 'SLVMMA03F18H501Z', dataNascita: '2003-06-25', luogoNascita: 'Reggio Emilia', indirizzo: 'Via Reggio 90', cap: '42100', citta: 'Reggio Emilia', provincia: 'RE' },
    { email: 'studente19@leonardoschool.test', name: 'Nicolò Lombardi', telefono: '3359012345', codiceFiscale: 'LMBNCL02G19H501Z', dataNascita: '2002-07-30', luogoNascita: 'Piacenza', indirizzo: 'Via Piacenza 12', cap: '29100', citta: 'Piacenza', provincia: 'PC' },
    { email: 'studente20@leonardoschool.test', name: 'Greta Pellegrini', telefono: '3360123456', codiceFiscale: 'PLLGRT03H20H501Z', dataNascita: '2003-08-05', luogoNascita: 'Ravenna', indirizzo: 'Via Ravenna 34', cap: '48100', citta: 'Ravenna', provincia: 'RA' },
  ],
};

const SEED_SUBJECTS = [
  {
    name: 'Biologia',
    code: 'BIO',
    description: 'Strutture e processi della vita',
    topics: [
      {
        name: 'Cellula e metabolismo',
        difficulty: DifficultyLevel.MEDIUM,
        subTopics: [
          { name: 'Organuli cellulari', difficulty: DifficultyLevel.EASY },
          { name: 'Respirazione cellulare', difficulty: DifficultyLevel.MEDIUM },
        ],
      },
      {
        name: 'Genetica',
        difficulty: DifficultyLevel.MEDIUM,
        subTopics: [
          { name: 'DNA e replicazione', difficulty: DifficultyLevel.MEDIUM },
          { name: 'Mendel e ereditarietà', difficulty: DifficultyLevel.EASY },
        ],
      },
    ],
  },
  {
    name: 'Chimica',
    code: 'CHI',
    description: 'Fondamenti e reazioni chimiche',
    topics: [
      {
        name: 'Chimica generale',
        difficulty: DifficultyLevel.MEDIUM,
        subTopics: [
          { name: 'Legami chimici', difficulty: DifficultyLevel.MEDIUM },
          { name: 'Equilibri acido-base', difficulty: DifficultyLevel.HARD },
        ],
      },
      {
        name: 'Stechiometria',
        difficulty: DifficultyLevel.EASY,
        subTopics: [
          { name: 'Bilanciamento reazioni', difficulty: DifficultyLevel.MEDIUM },
          { name: 'Gas ideali', difficulty: DifficultyLevel.EASY },
        ],
      },
    ],
  },
  {
    name: 'Fisica',
    code: 'FIS',
    description: 'Meccanica, energia e onde',
    topics: [
      {
        name: 'Meccanica',
        difficulty: DifficultyLevel.MEDIUM,
        subTopics: [
          { name: 'Cinematica', difficulty: DifficultyLevel.EASY },
          { name: 'Dinamica', difficulty: DifficultyLevel.MEDIUM },
        ],
      },
      {
        name: 'Termodinamica',
        difficulty: DifficultyLevel.MEDIUM,
        subTopics: [
          { name: 'Primo principio', difficulty: DifficultyLevel.MEDIUM },
          { name: 'Gas perfetti', difficulty: DifficultyLevel.EASY },
        ],
      },
    ],
  },
  {
    name: 'Matematica',
    code: 'MAT',
    description: 'Algebra, analisi e geometria',
    topics: [
      {
        name: 'Algebra',
        difficulty: DifficultyLevel.MEDIUM,
        subTopics: [
          { name: 'Equazioni e disequazioni', difficulty: DifficultyLevel.MEDIUM },
          { name: 'Logaritmi ed esponenziali', difficulty: DifficultyLevel.MEDIUM },
        ],
      },
      {
        name: 'Geometria',
        difficulty: DifficultyLevel.EASY,
        subTopics: [
          { name: 'Trigonometria', difficulty: DifficultyLevel.MEDIUM },
          { name: 'Geometria analitica', difficulty: DifficultyLevel.MEDIUM },
        ],
      },
    ],
  },
  {
    name: 'Logica',
    code: 'LOG',
    description: 'Ragionamento e problem solving',
    topics: [
      {
        name: 'Logica verbale',
        difficulty: DifficultyLevel.EASY,
        subTopics: [
          { name: 'Comprensione testi', difficulty: DifficultyLevel.EASY },
          { name: 'Sinonimi e contrari', difficulty: DifficultyLevel.EASY },
        ],
      },
      {
        name: 'Logica numerica',
        difficulty: DifficultyLevel.MEDIUM,
        subTopics: [
          { name: 'Sequenze numeriche', difficulty: DifficultyLevel.MEDIUM },
          { name: 'Problemi combinatori', difficulty: DifficultyLevel.HARD },
        ],
      },
    ],
  },
  {
    name: 'Cultura Generale',
    code: 'CG',
    description: 'Attualità, storia e cultura',
    topics: [
      {
        name: 'Storia contemporanea',
        difficulty: DifficultyLevel.MEDIUM,
        subTopics: [
          { name: 'XX secolo', difficulty: DifficultyLevel.MEDIUM },
          { name: 'Unione Europea', difficulty: DifficultyLevel.EASY },
        ],
      },
      {
        name: 'Attualità e scienza',
        difficulty: DifficultyLevel.MEDIUM,
        subTopics: [
          { name: 'Innovazione tecnologica', difficulty: DifficultyLevel.MEDIUM },
          { name: 'Sostenibilità', difficulty: DifficultyLevel.MEDIUM },
        ],
      },
    ],
  },
];

const SEED_QUESTION_TAGS = {
  categories: [
    {
      name: 'Seed - Anno',
      description: 'Anno di riferimento della domanda',
      tags: ['Seed - Anno 2023', 'Seed - Anno 2024', 'Seed - Anno 2025'],
    },
    {
      name: 'Seed - Fonte',
      description: 'Fonte o ispirazione della domanda',
      tags: ['Seed - TOLC-MED', 'Seed - Alpha Test', 'Seed - Archivio interno'],
    },
    {
      name: 'Seed - Difficoltà',
      description: 'Livello di difficoltà percepita',
      tags: ['Seed - Facile', 'Seed - Medio', 'Seed - Difficile'],
    },
  ],
};

const SEED_QUESTIONS = [
  {
    subjectCode: 'BIO',
    topic: 'Cellula e metabolismo',
    subTopic: 'Organuli cellulari',
    difficulty: DifficultyLevel.EASY,
    text: 'Qual è la funzione principale dei mitocondri in una cellula eucariotica?',
    answers: [
      { text: 'Produrre ATP tramite respirazione cellulare', isCorrect: true },
      { text: 'Sintetizzare proteine', isCorrect: false },
      { text: 'Immagazzinare acqua e sali minerali', isCorrect: false },
      { text: 'Degradare rifiuti cellulari', isCorrect: false },
    ],
    correctExplanation: 'I mitocondri sono il sito principale della respirazione cellulare e producono ATP.',
    wrongExplanation: 'Altri organuli gestiscono sintesi proteica (ribosomi/RE) o degradazione (lisosomi).',
    year: 2024,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2024', 'Seed - TOLC-MED', 'Seed - Facile'],
  },
  {
    subjectCode: 'BIO',
    topic: 'Genetica',
    subTopic: 'DNA e replicazione',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Durante la replicazione del DNA, quale enzima separa i due filamenti originari?',
    answers: [
      { text: 'Elicasi', isCorrect: true },
      { text: 'Ligasi', isCorrect: false },
      { text: 'Primasi', isCorrect: false },
      { text: 'Topoisomerasi I', isCorrect: false },
    ],
    correctExplanation: "L'elicasi rompe i legami a idrogeno tra le basi separando i filamenti.",
    wrongExplanation: 'Ligasi unisce frammenti, primasi crea primer, topoisomerasi riduce le tensioni.',
    year: 2023,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2023', 'Seed - Alpha Test', 'Seed - Medio'],
  },
  {
    subjectCode: 'BIO',
    topic: 'Genetica',
    subTopic: 'Mendel e ereditarietà',
    difficulty: DifficultyLevel.EASY,
    text: 'Secondo le leggi di Mendel, come si esprime un allele recessivo?',
    answers: [
      { text: 'Solo in omozigosi', isCorrect: true },
      { text: 'Solo in eterozigosi', isCorrect: false },
      { text: "Sempre, indipendentemente dall'altro allele", isCorrect: false },
      { text: 'Solo nei maschi', isCorrect: false },
    ],
    correctExplanation: 'Un allele recessivo si manifesta solo quando presente in doppia copia.',
    wrongExplanation: "In eterozigosi prevale l'allele dominante.",
    year: 2025,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2025', 'Seed - Archivio interno', 'Seed - Facile'],
  },
  {
    subjectCode: 'CHI',
    topic: 'Chimica generale',
    subTopic: 'Legami chimici',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Quale tipo di legame tiene insieme gli atomi in una molecola di cloruro di sodio (NaCl)?',
    answers: [
      { text: 'Legame ionico', isCorrect: true },
      { text: 'Legame covalente polare', isCorrect: false },
      { text: 'Legame metallico', isCorrect: false },
      { text: 'Legame a idrogeno', isCorrect: false },
    ],
    correctExplanation: 'NaCl è formato da un catione Na+ e un anione Cl- legati da attrazione elettrostatica.',
    wrongExplanation: 'Non ci sono elettroni condivisi come nei legami covalenti.',
    year: 2024,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2024', 'Seed - TOLC-MED', 'Seed - Medio'],
  },
  {
    subjectCode: 'CHI',
    topic: 'Chimica generale',
    subTopic: 'Equilibri acido-base',
    difficulty: DifficultyLevel.HARD,
    text: "Per un acido debole HA con Ka = 1,0×10^-5 e concentrazione 0,1 M, quale pH è più vicino all'equilibrio?",
    answers: [
      { text: '3,0', isCorrect: true },
      { text: '1,0', isCorrect: false },
      { text: '5,0', isCorrect: false },
      { text: '7,0', isCorrect: false },
    ],
    correctExplanation: "Per acido debole pH ≈ 0,5(pKa - log C) = 0,5(5 - 1) ≈ 2,0; considerando approssimazioni il valore più vicino in opzioni è 3,0.",
    wrongExplanation: 'pH 1 indica acido forte; 5 o 7 sarebbero troppo basici per questa soluzione.',
    year: 2023,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2023', 'Seed - Alpha Test', 'Seed - Difficile'],
  },
  {
    subjectCode: 'CHI',
    topic: 'Stechiometria',
    subTopic: 'Bilanciamento reazioni',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Qual è il coefficiente stechiometrico di O2 nella reazione bilanciata: C3H8 + O2 -> CO2 + H2O?',
    answers: [
      { text: '5', isCorrect: false },
      { text: '4', isCorrect: false },
      { text: '3', isCorrect: false },
      { text: '5,0 (esatto: 5)', isCorrect: true },
    ],
    correctExplanation: 'La reazione bilanciata è C3H8 + 5 O2 -> 3 CO2 + 4 H2O.',
    wrongExplanation: 'Solo con 5 moli di O2 si conservano atomi di O, C e H.',
    year: 2024,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2024', 'Seed - Archivio interno', 'Seed - Medio'],
  },
  {
    subjectCode: 'FIS',
    topic: 'Meccanica',
    subTopic: 'Cinematica',
    difficulty: DifficultyLevel.EASY,
    text: 'Un’auto passa da 0 a 20 m/s in 5 s. Qual è l’accelerazione media?',
    answers: [
      { text: '4 m/s²', isCorrect: true },
      { text: '5 m/s²', isCorrect: false },
      { text: '2 m/s²', isCorrect: false },
      { text: '10 m/s²', isCorrect: false },
    ],
    correctExplanation: 'a = Δv / Δt = 20 / 5 = 4 m/s².',
    wrongExplanation: 'È un moto uniformemente accelerato semplice.',
    year: 2025,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2025', 'Seed - TOLC-MED', 'Seed - Facile'],
  },
  {
    subjectCode: 'FIS',
    topic: 'Meccanica',
    subTopic: 'Dinamica',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Un blocco di 2 kg è spinto su un piano orizzontale con forza orizzontale di 10 N. Coefficiente d’attrito dinamico 0,2. Qual è l’accelerazione?',
    answers: [
      { text: '3 m/s²', isCorrect: true },
      { text: '5 m/s²', isCorrect: false },
      { text: '0 m/s²', isCorrect: false },
      { text: '1 m/s²', isCorrect: false },
    ],
    correctExplanation: 'Fattr = μmg = 0,2·2·9,8 ≈ 3,92 N, Fnet ≈ 6,08 N, a ≈ 3 m/s².',
    wrongExplanation: 'Serve sottrarre l’attrito dalla forza applicata.',
    year: 2024,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2024', 'Seed - Archivio interno', 'Seed - Medio'],
  },
  {
    subjectCode: 'FIS',
    topic: 'Termodinamica',
    subTopic: 'Gas perfetti',
    difficulty: DifficultyLevel.EASY,
    text: 'Per un gas perfetto a temperatura costante, quale legge lega pressione e volume?',
    answers: [
      { text: 'p·V = costante (legge di Boyle)', isCorrect: true },
      { text: 'V/T = costante', isCorrect: false },
      { text: 'p/T = costante', isCorrect: false },
      { text: 'p·V/T = costante (PV=nRT)', isCorrect: false },
    ],
    correctExplanation: 'A temperatura costante vale Boyle: p è inversamente proporzionale a V.',
    wrongExplanation: 'Altre relazioni valgono con altre grandezze costanti.',
    year: 2023,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2023', 'Seed - Alpha Test', 'Seed - Facile'],
  },
  {
    subjectCode: 'FIS',
    topic: 'Termodinamica',
    subTopic: 'Primo principio',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Quale equazione esprime il primo principio della termodinamica?',
    answers: [
      { text: 'ΔU = Q - L', isCorrect: true },
      { text: 'ΔU = Q + L', isCorrect: false },
      { text: 'Q = m·c·ΔT', isCorrect: false },
      { text: 'L = F·s', isCorrect: false },
    ],
    correctExplanation: 'Il primo principio bilancia l’energia interna con calore fornito e lavoro compiuto.',
    wrongExplanation: 'Con il segno convenzionale, lavoro fatto dal sistema riduce ΔU.',
    year: 2024,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2024', 'Seed - TOLC-MED', 'Seed - Medio'],
  },
  {
    subjectCode: 'MAT',
    topic: 'Algebra',
    subTopic: 'Equazioni e disequazioni',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Qual è la soluzione reale dell’equazione 2x^2 - 8x + 6 = 0?',
    answers: [
      { text: 'x = 1 e x = 3', isCorrect: true },
      { text: 'x = -1 e x = -3', isCorrect: false },
      { text: 'x = 2 e x = 3', isCorrect: false },
      { text: 'Nessuna soluzione reale', isCorrect: false },
    ],
    correctExplanation: 'Δ = 64 - 48 = 16, radice 4; x = (8 ± 4)/4 = {1,3}.',
    wrongExplanation: 'L’equazione è risolvibile con formula quadratica.',
    year: 2024,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2024', 'Seed - Archivio interno', 'Seed - Medio'],
  },
  {
    subjectCode: 'MAT',
    topic: 'Algebra',
    subTopic: 'Logaritmi ed esponenziali',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Quanto vale log10(1000)?',
    answers: [
      { text: '3', isCorrect: true },
      { text: '2', isCorrect: false },
      { text: '1', isCorrect: false },
      { text: '0', isCorrect: false },
    ],
    correctExplanation: '10^3 = 1000, quindi il logaritmo in base 10 vale 3.',
    wrongExplanation: 'È un’applicazione diretta della definizione di logaritmo.',
    year: 2023,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2023', 'Seed - Alpha Test', 'Seed - Facile'],
  },
  {
    subjectCode: 'MAT',
    topic: 'Geometria',
    subTopic: 'Trigonometria',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Qual è il valore di sin(π/6)?',
    answers: [
      { text: '1/2', isCorrect: true },
      { text: '√2/2', isCorrect: false },
      { text: '√3/2', isCorrect: false },
      { text: '0', isCorrect: false },
    ],
    correctExplanation: 'sin(π/6) = 1/2 è un valore notevole.',
    wrongExplanation: 'È un triangolo 30-60-90.',
    year: 2025,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2025', 'Seed - TOLC-MED', 'Seed - Medio'],
  },
  {
    subjectCode: 'LOG',
    topic: 'Logica verbale',
    subTopic: 'Comprensione testi',
    difficulty: DifficultyLevel.EASY,
    text: 'Se tutte le A sono B e tutte le B sono C, allora tutte le A sono C. Questa è un’istanza di:',
    answers: [
      { text: 'Silogismo logico', isCorrect: true },
      { text: 'Fallacia ad hominem', isCorrect: false },
      { text: 'Paradosso', isCorrect: false },
      { text: 'Contraddizione', isCorrect: false },
    ],
    correctExplanation: 'È il classico silogismo transito delle appartenenze.',
    wrongExplanation: 'Non è un errore logico ma un ragionamento valido.',
    year: 2024,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2024', 'Seed - TOLC-MED', 'Seed - Facile'],
  },
  {
    subjectCode: 'CG',
    topic: 'Storia contemporanea',
    subTopic: 'XX secolo',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'In che anno è entrata in vigore la Costituzione italiana?',
    answers: [
      { text: '1948', isCorrect: true },
      { text: '1946', isCorrect: false },
      { text: '1950', isCorrect: false },
      { text: '1931', isCorrect: false },
    ],
    correctExplanation: 'La Costituzione entrò in vigore il 1° gennaio 1948.',
    wrongExplanation: 'Dopo il referendum del 1946, la Carta fu promulgata nel 1947 ed entrò in vigore nel 1948.',
    year: 2024,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2024', 'Seed - TOLC-MED', 'Seed - Medio'],
  },
];

// ===================== HELPERS =====================
type CreatedQuestion = { id: string; subjectCode: string; correctLabel: string };
type SeedStudent = Array<{ id: string }>;

function addDays(base: Date, days: number) {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function addMinutes(base: Date, minutes: number) {
  return new Date(base.getTime() + minutes * 60 * 1000);
}

async function deleteFirebaseSeedUsers() {
  for (const email of [
    ...SEED_USERS.admins.map((u) => u.email),
    ...SEED_USERS.collaboratori.map((u) => u.email),
    ...SEED_USERS.studenti.map((u) => u.email),
  ]) {
    try {
      const user = await adminAuth.getUserByEmail(email);
      await adminAuth.deleteUser(user.uid);
      console.log(`   🗑️  Deleted Firebase user ${email}`);
    } catch (error) {
      const err = error as { code?: string };
      if (err.code !== 'auth/user-not-found') {
        console.warn(`   ⚠️  Skipping delete for ${email}:`, err.code || err);
      }
    }
  }
}

async function createFirebaseUser(email: string, displayName: string) {
  try {
    const existing = await adminAuth.getUserByEmail(email).catch(() => null);
    if (existing) {
      console.log(`   ⚠️  Firebase user ${email} already exists (UID: ${existing.uid})`);
      return existing.uid;
    }

    const userRecord = await adminAuth.createUser({
      email,
      password: TEST_PASSWORD,
      displayName,
      emailVerified: true,
    });

    console.log(`   ✅ Created Firebase user: ${email} (UID: ${userRecord.uid})`);
    return userRecord.uid;
  } catch (error) {
    console.error(`   ❌ Failed to create Firebase user ${email}:`, error);
    return null;
  }
}

async function cleanSeedData() {
  console.log('🧹 Cleaning ALL data for dev reset...');

  // Simulations and related - DELETE ALL (full dev reset)
  await prisma.simulationResult.deleteMany({});
  await prisma.simulationSession.deleteMany({});
  await prisma.simulationAssignment.deleteMany({});
  await prisma.simulationQuestion.deleteMany({});
  await prisma.simulation.deleteMany({});

  // Questions - DELETE ALL
  await prisma.questionTagAssignment.deleteMany({});
  await prisma.questionFeedback.deleteMany({});
  await prisma.questionFavorite.deleteMany({});
  await prisma.questionKeyword.deleteMany({});
  await prisma.questionVersion.deleteMany({});
  await prisma.questionAnswer.deleteMany({});
  await prisma.question.deleteMany({});

  // Tags - DELETE ALL
  await prisma.questionTag.deleteMany({});
  await prisma.questionTagCategory.deleteMany({});

  // Classes detach and delete
  await prisma.student.updateMany({ data: { classId: null } });
  await prisma.class.deleteMany({});

  // Subjects hierarchy - DELETE ALL
  await prisma.subTopic.deleteMany({});
  await prisma.topic.deleteMany({});
  await prisma.customSubject.deleteMany({});

  // Users - DELETE ALL test users (still filter by domain for safety)
  await prisma.student.deleteMany({ where: { user: { email: { endsWith: '@leonardoschool.test' } } } });
  await prisma.collaborator.deleteMany({ where: { user: { email: { endsWith: '@leonardoschool.test' } } } });
  await prisma.admin.deleteMany({ where: { user: { email: { endsWith: '@leonardoschool.test' } } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: '@leonardoschool.test' } } });

  console.log('✅ Database cleaned');
}

async function seedSubjectsAndQuestions(adminId?: string, collaboratorId?: string): Promise<{ questions: CreatedQuestion[] }> {
  console.log('\n📚 Creating subjects, topics, subtopics...');

  const subjectMap = new Map<string, string>();
  const topicMap = new Map<string, string>();
  const subTopicMap = new Map<string, string>();

  for (const [subjectIndex, subjectData] of SEED_SUBJECTS.entries()) {
    const subject = await prisma.customSubject.create({
      data: {
        name: subjectData.name,
        code: subjectData.code,
        description: subjectData.description,
        order: subjectIndex,
        isActive: true,
      },
    });
    subjectMap.set(subjectData.code, subject.id);

    let topicOrder = 0;
    for (const topicData of subjectData.topics) {
      const topic = await prisma.topic.create({
        data: {
          name: topicData.name,
          difficulty: topicData.difficulty,
          order: topicOrder++,
          subjectId: subject.id,
          isActive: true,
        },
      });
      topicMap.set(`${subjectData.code}:${topicData.name}`, topic.id);

      let subOrder = 0;
      for (const subTopicData of topicData.subTopics) {
        const subTopic = await prisma.subTopic.create({
          data: {
            name: subTopicData.name,
            difficulty: subTopicData.difficulty,
            order: subOrder++,
            topicId: topic.id,
            isActive: true,
          },
        });
        subTopicMap.set(`${subjectData.code}:${topicData.name}:${subTopicData.name}`, subTopic.id);
      }
    }
  }

  console.log('🏷️  Creating question tags...');
  const tagMap = new Map<string, string>();
  for (const categoryData of SEED_QUESTION_TAGS.categories) {
    const category = await prisma.questionTagCategory.create({
      data: {
        name: categoryData.name,
        description: categoryData.description,
        order: 0,
        isActive: true,
      },
    });

    for (const tagName of categoryData.tags) {
      const tag = await prisma.questionTag.create({
        data: {
          name: tagName,
          categoryId: category.id,
          isActive: true,
        },
      });
      tagMap.set(tagName, tag.id);
    }
  }

  console.log('❓ Creating questions and answers...');
  const createdQuestions: CreatedQuestion[] = [];
  for (const questionData of SEED_QUESTIONS) {
    const subjectId = subjectMap.get(questionData.subjectCode);
    if (!subjectId) continue;

    const topicId = topicMap.get(`${questionData.subjectCode}:${questionData.topic}`);
    const subTopicId = subTopicMap.get(`${questionData.subjectCode}:${questionData.topic}:${questionData.subTopic}`);

    const question = await prisma.question.create({
      data: {
        type: QuestionType.SINGLE_CHOICE,
        status: QuestionStatus.PUBLISHED,
        text: questionData.text,
        difficulty: questionData.difficulty,
        subjectId,
        topicId: topicId ?? null,
        subTopicId: subTopicId ?? null,
        points: 1.5,
        negativePoints: -0.4,
        blankPoints: 0,
        shuffleAnswers: true,
        showExplanation: true,
        correctExplanation: questionData.correctExplanation,
        wrongExplanation: questionData.wrongExplanation,
        year: questionData.year,
        source: SEED_MARKER,
        createdById: adminId ?? collaboratorId ?? null,
        publishedAt: new Date(),
        answers: {
          create: questionData.answers.map((answer, index) => ({
            text: answer.text,
            isCorrect: answer.isCorrect,
            order: index,
            label: String.fromCharCode(65 + index),
          })),
        },
        questionTags: {
          create: questionData.tags
            .map((tagName) => tagMap.get(tagName))
            .filter(Boolean)
            .map((tagId) => ({
              tag: {
                connect: { id: tagId! },
              },
            })),
        },
      },
    });

    const correctIndex = questionData.answers.findIndex((answer) => answer.isCorrect);
    const correctLabel = correctIndex >= 0 ? String.fromCharCode(65 + correctIndex) : 'A';
    createdQuestions.push({ id: question.id, subjectCode: questionData.subjectCode, correctLabel });
  }

  console.log(`✅ Created ${createdQuestions.length} questions`);
  return { questions: createdQuestions };
}

async function seedClasses(students: SeedStudent) {
  console.log('\n🏫 Creating classes and assigning students...');
  const classA = await prisma.class.create({
    data: {
      name: 'Seed - Classe A',
      description: 'Classe demo per test',
      year: 2024,
      section: 'A',
      isActive: true,
    },
  });

  const classB = await prisma.class.create({
    data: {
      name: 'Seed - Classe B',
      description: 'Classe demo per test',
      year: 2024,
      section: 'B',
      isActive: true,
    },
  });

  if (!students.length) {
    console.log('⚠️  No students to assign to classes.');
    return [classA, classB];
  }

  const half = Math.ceil(students.length / 2);
  const firstHalf = students.slice(0, half);
  const secondHalf = students.slice(half);

  await Promise.all(
    firstHalf.map((student) =>
      prisma.student.update({ where: { id: student.id }, data: { classId: classA.id } }),
    ),
  );

  await Promise.all(
    secondHalf.map((student) =>
      prisma.student.update({ where: { id: student.id }, data: { classId: classB.id } }),
    ),
  );

  console.log(`✅ Assigned ${firstHalf.length} students to ${classA.name} and ${secondHalf.length} to ${classB.name}`);
  return [classA, classB];
}

async function seedSimulations(
  creatorId: string | undefined,
  creatorRole: 'ADMIN' | 'COLLABORATOR',
  classes: Awaited<ReturnType<typeof seedClasses>>,
  students: SeedStudent,
  questions: CreatedQuestion[],
) {
  console.log('\n🧪 Creating simulations...');

  if (!questions.length) {
    console.log('⚠️  Skipping simulations because there are no questions.');
    return;
  }

  const now = new Date();
  const sim1Questions = questions.slice(0, Math.min(12, questions.length));
  const sim1 = await prisma.simulation.create({
    data: {
      title: 'Seed - Simulazione TOLC-MED Base',
      description: 'Simulazione di pratica con domande miste.',
      type: SimulationType.PRACTICE,
      status: SimulationStatus.PUBLISHED,
      visibility: SimulationVisibility.CLASS,
  createdById: creatorId ?? null,
      creatorRole,
      durationMinutes: 60,
      totalQuestions: sim1Questions.length,
      startDate: now,
      endDate: addDays(now, 14),
      randomizeOrder: true,
      randomizeAnswers: true,
      allowReview: true,
      showResults: true,
      showCorrectAnswers: true,
      classId: classes[0]?.id,
      questions: {
        create: sim1Questions.map((question, index) => ({ questionId: question.id, order: index + 1 })),
      },
    },
  });

  if (classes[0]) {
    await prisma.simulationAssignment.create({
      data: {
        simulationId: sim1.id,
        classId: classes[0].id,
        assignedById: creatorId ?? null,
        dueDate: addDays(now, 14),
        notes: 'Assegnata automaticamente dal seed',
      },
    });
  }

  if (students[0]) {
    const answers = sim1Questions.map((question, index) => ({
      questionId: question.id,
      answer: question.correctLabel,
      isCorrect: true,
      timeSpent: 20 + index * 2,
    }));

    await prisma.simulationResult.create({
      data: {
        simulationId: sim1.id,
        studentId: students[0].id,
        totalQuestions: sim1Questions.length,
        correctAnswers: answers.length,
        wrongAnswers: 0,
        blankAnswers: 0,
        totalScore: answers.length * 1.5,
        percentageScore: 100,
        answers,
        subjectScores: {},
        startedAt: now,
        completedAt: addMinutes(now, 55),
        durationSeconds: 55 * 60,
      },
    });
  }

  const sim2Questions = questions.slice(-Math.min(10, questions.length));
  const sim2 = await prisma.simulation.create({
    data: {
      title: 'Seed - Quiz rapido 10 domande',
      description: 'Quiz rapido misto per esercitazione immediata.',
      type: SimulationType.QUICK_QUIZ,
      status: SimulationStatus.PUBLISHED,
      visibility: SimulationVisibility.PUBLIC,
  createdById: creatorId ?? null,
      creatorRole,
      durationMinutes: 20,
      totalQuestions: sim2Questions.length,
      startDate: now,
      endDate: addDays(now, 30),
      randomizeOrder: true,
      randomizeAnswers: true,
      isPublic: true,
      questions: {
        create: sim2Questions.map((question, index) => ({ questionId: question.id, order: index + 1 })),
      },
    },
  });

  if (classes[1]) {
    await prisma.simulationAssignment.create({
      data: {
        simulationId: sim2.id,
        classId: classes[1].id,
        assignedById: creatorId ?? null,
        dueDate: addDays(now, 7),
        notes: 'Quiz rapido assegnato dal seed',
      },
    });
  }

  if (students[1]) {
    const answers = sim2Questions.map((question, index) => ({
      questionId: question.id,
      answer: index % 2 === 0 ? question.correctLabel : 'A',
      isCorrect: index % 2 === 0,
      timeSpent: 15 + index,
    }));

    const correct = answers.filter((ans) => ans.isCorrect).length;
    const wrong = answers.length - correct;

    await prisma.simulationResult.create({
      data: {
        simulationId: sim2.id,
        studentId: students[1].id,
        totalQuestions: sim2Questions.length,
        correctAnswers: correct,
        wrongAnswers: wrong,
        blankAnswers: 0,
        totalScore: correct * 1.5 + wrong * -0.4,
        percentageScore: (correct / sim2Questions.length) * 100,
        answers,
        subjectScores: {},
        startedAt: now,
        completedAt: addMinutes(now, 18),
        durationSeconds: 18 * 60,
      },
    });
  }

  console.log(`✅ Created simulations: ${sim1.title} and ${sim2.title}`);
}

// ===================== MAIN =====================
async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('🚀 SINGLE SEED - Firebase + DB content');
  console.log('═'.repeat(60) + '\n');

  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Cannot seed database in production environment');
    process.exit(1);
  }

  // 1) Clean Firebase seed users (best-effort)
  await deleteFirebaseSeedUsers();

  // 2) Clean database
  await cleanSeedData();

  // 3) Create users (Firebase + DB)
  console.log('\n👑 Creating admins...');
  const createdAdmins: Array<{ userId: string; adminId?: string }> = [];
  for (const admin of SEED_USERS.admins) {
    const firebaseUid = await createFirebaseUser(admin.email, admin.name);
    if (!firebaseUid) continue;

    const user = await prisma.user.create({
      data: {
        firebaseUid,
        email: admin.email,
        name: admin.name,
        role: UserRole.ADMIN,
        isActive: true,
        profileCompleted: true,
        emailVerified: true,
        admin: { create: {} },
      },
      include: { admin: true },
    });
  if (user.admin) createdAdmins.push({ userId: user.id, adminId: user.admin.id });
    console.log(`   ✓ ${admin.name}`);
  }

  console.log('\n🤝 Creating collaborators...');
  const createdCollabs: Array<{ userId: string; collaboratorId?: string }> = [];
  for (const collab of SEED_USERS.collaboratori) {
    const firebaseUid = await createFirebaseUser(collab.email, collab.name);
    if (!firebaseUid) continue;

    const user = await prisma.user.create({
      data: {
        firebaseUid,
        email: collab.email,
        name: collab.name,
        role: UserRole.COLLABORATOR,
        isActive: true,
        profileCompleted: true,
        emailVerified: true,
        collaborator: {
          create: {
            phone: collab.telefono,
            fiscalCode: collab.codiceFiscale,
          },
        },
      },
      include: { collaborator: true },
    });
  if (user.collaborator) createdCollabs.push({ userId: user.id, collaboratorId: user.collaborator.id });
    console.log(`   ✓ ${collab.name}`);
  }

  console.log('\n👨‍🎓 Creating students...');
  const createdStudents: SeedStudent = [];
  const currentYear = new Date().getFullYear();
  let studentIndex = 1;
  for (const student of SEED_USERS.studenti) {
    const firebaseUid = await createFirebaseUser(student.email, student.name);
    if (!firebaseUid) continue;

    // Generate matricola: LS{year}{4-digit-progressive}
    const matricola = `LS${currentYear}${String(studentIndex).padStart(4, '0')}`;

    const user = await prisma.user.create({
      data: {
        firebaseUid,
        email: student.email,
        name: student.name,
        role: UserRole.STUDENT,
        isActive: true,
        profileCompleted: true,
        emailVerified: true,
        student: {
          create: {
            phone: student.telefono,
            fiscalCode: student.codiceFiscale,
            dateOfBirth: new Date(student.dataNascita),
            address: student.indirizzo,
            postalCode: student.cap,
            city: student.citta,
            province: student.provincia,
            matricola: matricola,
          },
        },
      },
      include: { student: true },
    });
    if (user.student) createdStudents.push({ id: user.student.id });
    console.log(`   ✓ ${student.name} - Matricola: ${matricola}`);
    studentIndex++;
  }

  // 4) Seed content
  const adminUserId = createdAdmins[0]?.userId;
  const collaboratorUserId = createdCollabs[0]?.userId;
  const { questions } = await seedSubjectsAndQuestions(adminUserId, collaboratorUserId);
  const classes = await seedClasses(createdStudents);
  const creatorId = adminUserId ?? collaboratorUserId;
  const creatorRole: 'ADMIN' | 'COLLABORATOR' = adminUserId ? 'ADMIN' : 'COLLABORATOR';
  await seedSimulations(creatorId, creatorRole, classes, createdStudents, questions);

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 SEEDING COMPLETE');
  console.log('═'.repeat(60));
  console.log(`👑 Admins:         ${createdAdmins.length}`);
  console.log(`🤝 Collaborators:  ${createdCollabs.length}`);
  console.log(`👨‍🎓 Students:       ${createdStudents.length}`);
  console.log(`📚 Subjects:       ${SEED_SUBJECTS.length}`);
  console.log(`❓ Questions:      ${questions.length}`);
  console.log('🏫 Classes:        2');
  console.log('🧪 Simulations:    2');
  console.log('═'.repeat(60));
  console.log(`\n🔐 Test password: ${TEST_PASSWORD}`);
  console.log('🔗 Login: http://localhost:3000/auth/login\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
