/**
 * Database Seed Script
 * Popola il database con dati di test in ambiente di sviluppo
 * 
 * Usage: pnpm prisma:seed
 */

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

const prisma = new PrismaClient();

const SEED_MARKER = 'Seed Demo Data';

// Dati seed per Firebase (usare questi per creare account in Firebase)
// Password di test: "TestPassword123!" per tutti gli account
const SEED_USERS = {
  admins: [
    { email: 'admin1@leonardoschool.test', name: 'Mario Rossi' },
    { email: 'admin2@leonardoschool.test', name: 'Laura Bianchi' },
    { email: 'admin3@leonardoschool.test', name: 'Giuseppe Verdi' },
  ],
  collaboratori: [
    { email: 'collab1@leonardoschool.test', name: 'Anna Ferrari', phone: '3331234567', fiscalCode: 'FRRNNA80A01H501Z' },
    { email: 'collab2@leonardoschool.test', name: 'Marco Ricci', phone: '3332345678', fiscalCode: 'RCCMRC85B02H501Z' },
    { email: 'collab3@leonardoschool.test', name: 'Giulia Marino', phone: '3333456789', fiscalCode: 'MRNGLI90C03H501Z' },
    { email: 'collab4@leonardoschool.test', name: 'Francesco Romano', phone: '3334567890', fiscalCode: 'RMNFNC88D04H501Z' },
    { email: 'collab5@leonardoschool.test', name: 'Sara Colombo', phone: '3335678901', fiscalCode: 'CLMSRA92E05H501Z' },
    { email: 'collab6@leonardoschool.test', name: 'Alessandro Bruno', phone: '3336789012', fiscalCode: 'BRNLSN87F06H501Z' },
    { email: 'collab7@leonardoschool.test', name: 'Elena Gallo', phone: '3337890123', fiscalCode: 'GLLLNE91G07H501Z' },
    { email: 'collab8@leonardoschool.test', name: 'Davide Costa', phone: '3338901234', fiscalCode: 'CSTDVD89H08H501Z' },
    { email: 'collab9@leonardoschool.test', name: 'Chiara Conti', phone: '3339012345', fiscalCode: 'CNTCHR93I09H501Z' },
    { email: 'collab10@leonardoschool.test', name: 'Luca Giordano', phone: '3340123456', fiscalCode: 'GRDLCU86L10H501Z' },
  ],
  studenti: [
    { email: 'studente1@leonardoschool.test', name: 'Matteo De Luca', phone: '3341234567', fiscalCode: 'DLCMTT02A01H501Z', dateOfBirth: '2002-01-15', address: 'Via Roma 123', postalCode: '00100', city: 'Roma', province: 'RM' },
    { email: 'studente2@leonardoschool.test', name: 'Sofia Esposito', phone: '3342345678', fiscalCode: 'SPSSFO03B02H501Z', dateOfBirth: '2003-02-20', address: 'Via Milano 45', postalCode: '20100', city: 'Milano', province: 'MI' },
    { email: 'studente3@leonardoschool.test', name: 'Lorenzo Fontana', phone: '3343456789', fiscalCode: 'FNTLRN02C03H501Z', dateOfBirth: '2002-03-25', address: 'Via Napoli 67', postalCode: '80100', city: 'Napoli', province: 'NA' },
    { email: 'studente4@leonardoschool.test', name: 'Giulia Santoro', phone: '3344567890', fiscalCode: 'SNTGLI03D04H501Z', dateOfBirth: '2003-04-10', address: 'Via Torino 89', postalCode: '10100', city: 'Torino', province: 'TO' },
    { email: 'studente5@leonardoschool.test', name: 'Alessandro Moretti', phone: '3345678901', fiscalCode: 'MRTLSN02E05H501Z', dateOfBirth: '2002-05-15', address: 'Via Bologna 12', postalCode: '40100', city: 'Bologna', province: 'BO' },
    { email: 'studente6@leonardoschool.test', name: 'Francesca Leone', phone: '3346789012', fiscalCode: 'LNEFNC03F06H501Z', dateOfBirth: '2003-06-20', address: 'Via Firenze 34', postalCode: '50100', city: 'Firenze', province: 'FI' },
    { email: 'studente7@leonardoschool.test', name: 'Marco Benedetti', phone: '3347890123', fiscalCode: 'BNDMRC02G07H501Z', dateOfBirth: '2002-07-25', address: 'Via Genova 56', postalCode: '16100', city: 'Genova', province: 'GE' },
    { email: 'studente8@leonardoschool.test', name: 'Valentina Serra', phone: '3348901234', fiscalCode: 'SRRVNT03H08H501Z', dateOfBirth: '2003-08-30', address: 'Via Palermo 78', postalCode: '90100', city: 'Palermo', province: 'PA' },
    { email: 'studente9@leonardoschool.test', name: 'Gabriele Vitale', phone: '3349012345', fiscalCode: 'VTLGBR02I09H501Z', dateOfBirth: '2002-09-05', address: 'Via Catania 90', postalCode: '95100', city: 'Catania', province: 'CT' },
    { email: 'studente10@leonardoschool.test', name: 'Martina Orlando', phone: '3350123456', fiscalCode: 'RLNMRT03L10H501Z', dateOfBirth: '2003-10-10', address: 'Via Venezia 23', postalCode: '30100', city: 'Venezia', province: 'VE' },
    { email: 'studente11@leonardoschool.test', name: 'Andrea Ferri', phone: '3351234567', fiscalCode: 'FRRNDR02M11H501Z', dateOfBirth: '2002-11-15', address: 'Via Verona 45', postalCode: '37100', city: 'Verona', province: 'VR' },
    { email: 'studente12@leonardoschool.test', name: 'Beatrice Mancini', phone: '3352345678', fiscalCode: 'MNCBTR03N12H501Z', dateOfBirth: '2003-12-20', address: 'Via Padova 67', postalCode: '35100', city: 'Padova', province: 'PD' },
    { email: 'studente13@leonardoschool.test', name: 'Riccardo Greco', phone: '3353456789', fiscalCode: 'GRCRCC02A13H501Z', dateOfBirth: '2002-01-25', address: 'Via Trieste 89', postalCode: '34100', city: 'Trieste', province: 'TS' },
    { email: 'studente14@leonardoschool.test', name: 'Camilla Russo', phone: '3354567890', fiscalCode: 'RSSCML03B14H501Z', dateOfBirth: '2003-02-28', address: 'Via Bari 12', postalCode: '70100', city: 'Bari', province: 'BA' },
    { email: 'studente15@leonardoschool.test', name: 'Tommaso Marchetti', phone: '3355678901', fiscalCode: 'MRCTMS02C15H501Z', dateOfBirth: '2002-03-10', address: 'Via Brescia 34', postalCode: '25100', city: 'Brescia', province: 'BS' },
    { email: 'studente16@leonardoschool.test', name: 'Alice Monti', phone: '3356789012', fiscalCode: 'MNTLCA03D16H501Z', dateOfBirth: '2003-04-15', address: 'Via Parma 56', postalCode: '43100', city: 'Parma', province: 'PR' },
    { email: 'studente17@leonardoschool.test', name: 'Edoardo Barbieri', phone: '3357890123', fiscalCode: 'BRBRDR02E17H501Z', dateOfBirth: '2002-05-20', address: 'Via Modena 78', postalCode: '41100', city: 'Modena', province: 'MO' },
    { email: 'studente18@leonardoschool.test', name: 'Emma Silvestri', phone: '3358901234', fiscalCode: 'SLVMMA03F18H501Z', dateOfBirth: '2003-06-25', address: 'Via Reggio 90', postalCode: '42100', city: 'Reggio Emilia', province: 'RE' },
    { email: 'studente19@leonardoschool.test', name: 'Nicolò Lombardi', phone: '3359012345', fiscalCode: 'LMBNCL02G19H501Z', dateOfBirth: '2002-07-30', address: 'Via Piacenza 12', postalCode: '29100', city: 'Piacenza', province: 'PC' },
    { email: 'studente20@leonardoschool.test', name: 'Greta Pellegrini', phone: '3360123456', fiscalCode: 'PLLGRT03H20H501Z', dateOfBirth: '2003-08-05', address: 'Via Ravenna 34', postalCode: '48100', city: 'Ravenna', province: 'RA' },
  ],
};

const SEED_SUBJECTS = [
  {
    name: 'Biologia',
    code: 'BIO',
    description: 'Strutture e processi della vita',
    color: '#22c55e', // green-500
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
    color: '#f97316', // orange-500
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
    color: '#3b82f6', // blue-500
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
    color: '#8b5cf6', // violet-500
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
    color: '#eab308', // yellow-500
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
    color: '#ec4899', // pink-500
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
    correctExplanation: 'L’elicasi rompe i legami a idrogeno tra le basi separando i filamenti.',
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
      { text: 'Sempre, indipendentemente dall’altro allele', isCorrect: false },
      { text: 'Solo nei maschi', isCorrect: false },
    ],
    correctExplanation: 'Un allele recessivo si manifesta solo quando presente in doppia copia.',
    wrongExplanation: 'In eterozigosi prevale l’allele dominante.',
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
    text: "Qual è il coefficiente stechiometrico di O2 nella reazione bilanciata: C3H8 + O2 -> CO2 + H2O?",
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
    correctExplanation: 'Il seno di 30° vale 1/2.',
    wrongExplanation: 'Usa i valori notevoli della trigonometria.',
    year: 2025,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2025', 'Seed - TOLC-MED', 'Seed - Facile'],
  },
  {
    subjectCode: 'MAT',
    topic: 'Geometria',
    subTopic: 'Geometria analitica',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Qual è la distanza tra i punti A(0,0) e B(3,4) nel piano cartesiano?',
    answers: [
      { text: '5', isCorrect: true },
      { text: '4', isCorrect: false },
      { text: '3', isCorrect: false },
      { text: '√10', isCorrect: false },
    ],
    correctExplanation: 'Distanza = √(3² + 4²) = 5 (triangolo 3-4-5).',
    wrongExplanation: 'È un’applicazione del teorema di Pitagora.',
    year: 2024,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2024', 'Seed - Archivio interno', 'Seed - Facile'],
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
    subjectCode: 'LOG',
    topic: 'Logica verbale',
    subTopic: 'Sinonimi e contrari',
    difficulty: DifficultyLevel.EASY,
    text: "Qual è il contrario di 'abbondante' tra le opzioni?",
    answers: [
      { text: 'Scarso', isCorrect: true },
      { text: 'Copioso', isCorrect: false },
      { text: 'Ricco', isCorrect: false },
      { text: 'Generoso', isCorrect: false },
    ],
    correctExplanation: "Scarso è l'opposto di abbondante.",
    wrongExplanation: 'Le altre opzioni sono sinonimi o affini.',
    year: 2023,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2023', 'Seed - Alpha Test', 'Seed - Facile'],
  },
  {
    subjectCode: 'LOG',
    topic: 'Logica numerica',
    subTopic: 'Sequenze numeriche',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Completa la sequenza: 2, 6, 18, 54, ...',
    answers: [
      { text: '162', isCorrect: true },
      { text: '108', isCorrect: false },
      { text: '81', isCorrect: false },
      { text: '72', isCorrect: false },
    ],
    correctExplanation: 'Ogni termine è moltiplicato per 3.',
    wrongExplanation: 'La regola di moltiplicare per 3 porta a 162.',
    year: 2025,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2025', 'Seed - TOLC-MED', 'Seed - Medio'],
  },
  {
    subjectCode: 'LOG',
    topic: 'Logica numerica',
    subTopic: 'Problemi combinatori',
    difficulty: DifficultyLevel.HARD,
    text: 'Quante parole di 3 lettere (anche non di senso) si possono formare con le lettere A, B, C senza ripetizioni?',
    answers: [
      { text: '6', isCorrect: true },
      { text: '9', isCorrect: false },
      { text: '3', isCorrect: false },
      { text: '27', isCorrect: false },
    ],
    correctExplanation: 'Permutazioni di 3 elementi presi 3 a 3: 3! = 6.',
    wrongExplanation: 'Senza ripetizioni le disposizioni sono 6.',
    year: 2024,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2024', 'Seed - Archivio interno', 'Seed - Difficile'],
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
  {
    subjectCode: 'CG',
    topic: 'Storia contemporanea',
    subTopic: 'Unione Europea',
    difficulty: DifficultyLevel.EASY,
    text: 'Quanti sono attualmente gli Stati membri dell’Unione Europea (2024)?',
    answers: [
      { text: '27', isCorrect: true },
      { text: '25', isCorrect: false },
      { text: '28', isCorrect: false },
      { text: '30', isCorrect: false },
    ],
    correctExplanation: 'Dopo la Brexit i membri sono 27.',
    wrongExplanation: 'Dal 2020 non ci sono stati nuovi ingressi.',
    year: 2024,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2024', 'Seed - Alpha Test', 'Seed - Facile'],
  },
  {
    subjectCode: 'CG',
    topic: 'Attualità e scienza',
    subTopic: 'Innovazione tecnologica',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Quale tecnologia è alla base delle valute digitali decentralizzate come Bitcoin?',
    answers: [
      { text: 'Blockchain', isCorrect: true },
      { text: 'Cloud computing', isCorrect: false },
      { text: 'Intelligenza artificiale', isCorrect: false },
      { text: 'Machine learning', isCorrect: false },
    ],
    correctExplanation: 'La blockchain è il registro distribuito che garantisce sicurezza e trasparenza.',
    wrongExplanation: 'Le altre tecnologie sono correlate ma non la base del protocollo Bitcoin.',
    year: 2025,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2025', 'Seed - Archivio interno', 'Seed - Medio'],
  },
  {
    subjectCode: 'CG',
    topic: 'Attualità e scienza',
    subTopic: 'Sostenibilità',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Quale gas è il principale responsabile dell’effetto serra antropico?',
    answers: [
      { text: 'Anidride carbonica (CO2)', isCorrect: true },
      { text: 'Ossigeno (O2)', isCorrect: false },
      { text: 'Elio (He)', isCorrect: false },
      { text: 'Azoto (N2)', isCorrect: false },
    ],
    correctExplanation: 'La CO2 è il gas serra più abbondante tra quelli prodotti dalle attività umane.',
    wrongExplanation: 'Altri gas incidono ma in quantità inferiori.',
    year: 2023,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2023', 'Seed - TOLC-MED', 'Seed - Medio'],
  },
  {
    subjectCode: 'MAT',
    topic: 'Algebra',
    subTopic: 'Equazioni e disequazioni',
    difficulty: DifficultyLevel.HARD,
    text: 'Risolvi il sistema: { x + y = 7; x - y = 1 }',
    answers: [
      { text: 'x = 4, y = 3', isCorrect: true },
      { text: 'x = 3, y = 4', isCorrect: false },
      { text: 'x = 7, y = 1', isCorrect: false },
      { text: 'x = 1, y = 7', isCorrect: false },
    ],
    correctExplanation: 'Somma e sottrazione delle equazioni danno x = 4 e y = 3.',
    wrongExplanation: 'Sistema lineare risolto con metodi base.',
    year: 2025,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2025', 'Seed - Archivio interno', 'Seed - Difficile'],
  },
  {
    subjectCode: 'BIO',
    topic: 'Cellula e metabolismo',
    subTopic: 'Respirazione cellulare',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'In quale fase della respirazione cellulare si produce la maggior parte di ATP?',
    answers: [
      { text: 'Fosforilazione ossidativa', isCorrect: true },
      { text: 'Glicolisi', isCorrect: false },
      { text: 'Ciclo di Krebs', isCorrect: false },
      { text: 'Fermentazione lattica', isCorrect: false },
    ],
    correctExplanation: 'La catena di trasporto degli elettroni genera la maggior parte di ATP.',
    wrongExplanation: 'Glicolisi e Krebs producono meno ATP direttamente.',
    year: 2024,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2024', 'Seed - Alpha Test', 'Seed - Medio'],
  },
  {
    subjectCode: 'CHI',
    topic: 'Stechiometria',
    subTopic: 'Gas ideali',
    difficulty: DifficultyLevel.EASY,
    text: 'A temperatura e pressione costante, quale grandezza è proporzionale al numero di moli di un gas ideale?',
    answers: [
      { text: 'Volume', isCorrect: true },
      { text: 'Pressione', isCorrect: false },
      { text: 'Temperatura', isCorrect: false },
      { text: 'Massa molare', isCorrect: false },
    ],
    correctExplanation: "Secondo la legge di Avogadro, V è proporzionale alle moli a T e p costanti.",
    wrongExplanation: 'Pressione e temperatura sono fissate, non variano con le moli in questo caso.',
    year: 2025,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2025', 'Seed - Archivio interno', 'Seed - Facile'],
  },
  {
    subjectCode: 'FIS',
    topic: 'Meccanica',
    subTopic: 'Cinematica',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Un proiettile è lanciato orizzontalmente a 30 m/s da un’altezza di 45 m. Quanto tempo impiega a toccare terra (trascurando attrito)?',
    answers: [
      { text: '≈ 3 s', isCorrect: true },
      { text: '≈ 1 s', isCorrect: false },
      { text: '≈ 6 s', isCorrect: false },
      { text: '≈ 9 s', isCorrect: false },
    ],
    correctExplanation: 'Caduta libera: t = √(2h/g) ≈ √(90/9,8) ≈ 3,0 s.',
    wrongExplanation: 'La velocità orizzontale non influisce sul tempo di caduta.',
    year: 2024,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2024', 'Seed - TOLC-MED', 'Seed - Medio'],
  },
  {
    subjectCode: 'LOG',
    topic: 'Logica numerica',
    subTopic: 'Problemi combinatori',
    difficulty: DifficultyLevel.MEDIUM,
    text: 'Quante combinazioni di 2 lettere si possono formare scegliendo da A, B, C, D senza ripetizione e senza ordine?',
    answers: [
      { text: '6', isCorrect: true },
      { text: '12', isCorrect: false },
      { text: '4', isCorrect: false },
      { text: '24', isCorrect: false },
    ],
    correctExplanation: 'Combinazioni semplici C(4,2) = 6.',
    wrongExplanation: 'Le combinazioni senza ordine sono meno delle permutazioni.',
    year: 2023,
    source: 'Seed Demo',
    tags: ['Seed - Anno 2023', 'Seed - Archivio interno', 'Seed - Medio'],
  },
];

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Check environment
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Cannot seed database in production environment!');
    process.exit(1);
  }

  console.log('⚠️  IMPORTANTE: Questo script crea SOLO i record PostgreSQL.');
  console.log('⚠️  Devi PRIMA creare gli account in Firebase Auth con la stessa email.');
  console.log('⚠️  Oppure usa Firebase Admin SDK per creare gli account automaticamente.\n');

  // Pulisci database esistente (opzionale - commenta se vuoi preservare dati)
  console.log('🗑️  Cleaning existing seed data...');
  await prisma.student.deleteMany({
    where: {
      user: {
        email: {
          endsWith: '@leonardoschool.test',
        },
      },
    },
  });
  await prisma.collaborator.deleteMany({
    where: {
      user: {
        email: {
          endsWith: '@leonardoschool.test',
        },
      },
    },
  });
  await prisma.admin.deleteMany({
    where: {
      user: {
        email: {
          endsWith: '@leonardoschool.test',
        },
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      email: {
        endsWith: '@leonardoschool.test',
      },
    },
  });

  // Cleanup seed-specific domain entities
  await prisma.simulationAssignment.deleteMany({
    where: { simulation: { title: { startsWith: 'Seed -' } } },
  });
  await prisma.simulationQuestion.deleteMany({
    where: { simulation: { title: { startsWith: 'Seed -' } } },
  });
  await prisma.simulationResult.deleteMany({
    where: { simulation: { title: { startsWith: 'Seed -' } } },
  });
  await prisma.simulationSessionParticipant.deleteMany({
    where: { session: { simulation: { title: { startsWith: 'Seed -' } } } },
  });
  await prisma.simulationSession.deleteMany({
    where: { simulation: { title: { startsWith: 'Seed -' } } },
  });
  await prisma.simulation.deleteMany({
    where: { title: { startsWith: 'Seed -' } },
  });

  await prisma.questionTagAssignment.deleteMany({
    where: { tag: { name: { startsWith: 'Seed -' } } },
  });
  await prisma.question.deleteMany({ where: { source: SEED_MARKER } });
  await prisma.questionTag.deleteMany({ where: { name: { startsWith: 'Seed -' } } });
  await prisma.questionTagCategory.deleteMany({ where: { name: { startsWith: 'Seed -' } } });

  await prisma.subTopic.deleteMany({ where: { topic: { subject: { code: { in: SEED_SUBJECTS.map((s) => s.code) } } } } });
  await prisma.topic.deleteMany({ where: { subject: { code: { in: SEED_SUBJECTS.map((s) => s.code) } } } });
  await prisma.customSubject.deleteMany({ where: { code: { in: SEED_SUBJECTS.map((s) => s.code) } } });
  await prisma.class.deleteMany({ where: { name: { startsWith: 'Seed -' } } });

  console.log('✅ Extended cleanup complete\n');

  console.log('✅ Cleanup complete\n');

  // Create Admins
  console.log('👑 Creating 3 admin accounts...');
  for (const admin of SEED_USERS.admins) {
    await prisma.user.create({
      data: {
        firebaseUid: `seed-admin-${admin.email}`, // Placeholder - sostituire con vero UID Firebase
        email: admin.email,
        name: admin.name,
        role: UserRole.ADMIN,
        isActive: true,
        profileCompleted: true,
        emailVerified: true,
        admin: {
          create: {},
        },
      },
    });
    console.log(`  ✓ ${admin.name} (${admin.email})`);
  }

  // Create Collaboratori
  console.log('\n🤝 Creating 10 collaborator accounts...');
  for (const collab of SEED_USERS.collaboratori) {
    await prisma.user.create({
      data: {
        firebaseUid: `seed-collab-${collab.email}`, // Placeholder
        email: collab.email,
        name: collab.name,
        role: UserRole.COLLABORATOR,
        isActive: true,
        profileCompleted: true,
        emailVerified: true,
        collaborator: {
          create: {
            phone: collab.phone,
            fiscalCode: collab.fiscalCode,
          },
        },
      },
    });
    console.log(`  ✓ ${collab.name} (${collab.email})`);
  }

  // Create Studenti
  console.log('\n🎓 Creating 20 student accounts...');
  for (const student of SEED_USERS.studenti) {
    await prisma.user.create({
      data: {
        firebaseUid: `seed-student-${student.email}`, // Placeholder
        email: student.email,
        name: student.name,
        role: UserRole.STUDENT,
        isActive: true,
        profileCompleted: true,
        emailVerified: true,
        student: {
          create: {
            phone: student.phone,
            fiscalCode: student.fiscalCode,
            dateOfBirth: new Date(student.dateOfBirth),
            address: student.address,
            postalCode: student.postalCode,
            city: student.city,
            province: student.province,
          },
        },
      },
    });
    console.log(`  ✓ ${student.name} (${student.email})`);
  }

  const admins = await prisma.user.findMany({ where: { role: UserRole.ADMIN, email: { endsWith: '@leonardoschool.test' } } });
  const collaborators = await prisma.user.findMany({ where: { role: UserRole.COLLABORATOR, email: { endsWith: '@leonardoschool.test' } }, include: { collaborator: true } });
  const students = await prisma.student.findMany({ where: { user: { email: { endsWith: '@leonardoschool.test' } } }, include: { user: true } });

  const { questions: createdQuestions } = await seedSubjectsAndQuestions(admins[0]?.id, collaborators[0]?.id);
  const createdClasses = await seedClasses(students);
  await seedSimulations(admins[0]?.id, createdClasses, students, createdQuestions);

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📋 Summary:');
  console.log(`   • 3 Admins`);
  console.log(`   • 10 Collaborators`);
  console.log(`   • 20 Students`);
  console.log(`   • ${SEED_SUBJECTS.length} Materie con argomenti e sotto-argomenti`);
  console.log(`   • ${createdQuestions.length} Domande con risposte e tag`);
  console.log(`   • ${createdClasses.length} Classi e 2 simulazioni di esempio`);
  console.log('\n🔐 Test credentials:');
  console.log(`   Email: Use any email above`);
  console.log(`   Password: TestPassword123! (if created in Firebase)`);
  console.log('\n⚠️  NEXT STEPS:');
  console.log('   1. Create corresponding Firebase Auth accounts with the same emails');
  console.log('   2. Update firebaseUid in database with real Firebase UIDs');
  console.log('   3. Or use the Firebase Admin SDK script to automate this\n');
}

type CreatedQuestion = {
  id: string;
  subjectCode: string;
  correctLabel: string;
};

function addDays(base: Date, days: number) {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function addMinutes(base: Date, minutes: number) {
  return new Date(base.getTime() + minutes * 60 * 1000);
}

async function seedSubjectsAndQuestions(adminId?: string, collaboratorId?: string): Promise<{ questions: CreatedQuestion[] }> {
  console.log('\n📚 Creating subjects, topics, and subtopics...');

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

type SeedStudent = Array<{ id: string }>;

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
      prisma.student.update({
        where: { id: student.id },
        data: { classId: classA.id },
      }),
    ),
  );

  await Promise.all(
    secondHalf.map((student) =>
      prisma.student.update({
        where: { id: student.id },
        data: { classId: classB.id },
      }),
    ),
  );

  console.log(`✅ Assigned ${firstHalf.length} students to ${classA.name} and ${secondHalf.length} to ${classB.name}`);
  return [classA, classB];
}

async function seedSimulations(
  adminId: string | undefined,
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
  const creatorRole = adminId ? 'ADMIN' : 'COLLABORATOR';

  const sim1Questions = questions.slice(0, Math.min(12, questions.length));
  const sim1 = await prisma.simulation.create({
    data: {
      title: 'Seed - Simulazione TOLC-MED Base',
      description: 'Simulazione di pratica con domande miste.',
      type: SimulationType.PRACTICE,
      status: SimulationStatus.PUBLISHED,
      visibility: SimulationVisibility.CLASS,
      createdById: adminId ?? null,
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
        create: sim1Questions.map((question, index) => ({
          questionId: question.id,
          order: index + 1,
        })),
      },
    },
  });

  if (classes[0]) {
    await prisma.simulationAssignment.create({
      data: {
        simulationId: sim1.id,
        classId: classes[0].id,
        assignedById: adminId ?? null,
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
      createdById: adminId ?? null,
      creatorRole,
      durationMinutes: 20,
      totalQuestions: sim2Questions.length,
      startDate: now,
      endDate: addDays(now, 30),
      randomizeOrder: true,
      randomizeAnswers: true,
      isPublic: true,
      questions: {
        create: sim2Questions.map((question, index) => ({
          questionId: question.id,
          order: index + 1,
        })),
      },
    },
  });

  if (classes[1]) {
    await prisma.simulationAssignment.create({
      data: {
        simulationId: sim2.id,
        classId: classes[1].id,
        assignedById: adminId ?? null,
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

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
