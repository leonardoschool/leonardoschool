/**
 * Homepage test/admission data
 * Separated from UI components for easier maintenance
 */

import { TestCard as TestCardType } from '@/types';

export const ADMISSION_TESTS: TestCardType[] = [
  {
    id: 'medicina',
    title: 'Semestre Aperto',
    description: 'Medicina, Odontoiatria e Veterinaria in lingua Italiana',
    image: '/images/med.png',
    link: 'https://accessoprogrammato.mur.gov.it/2024/',
    dates: [
      { label: '1° appello', date: '20 novembre 2025 (iscrizioni 30 ottobre - 15 novembre 2025)' },
      { label: '2° appello', date: '10 dicembre 2025 (iscrizioni 21 novembre - 6 dicembre 2025)' },
      { label: 'Pubblicazione risultati 1° appello', date: 'entro il 3 dicembre 2025' },
      { label: 'Pubblicazione risultati 2° appello', date: 'entro il 23 dicembre 2025' },
      { label: 'Pubblicazione graduatorie nazionali', date: '12 gennaio 2026' },
      { label: '1a immatricolazione', date: '13-16 gennaio 2026' },
      { label: '1° scorrimento e scelta sedi vacanti', date: '21-23 gennaio 2026 (ore 17:00)' },
      { label: '2° scorrimento e 2a immatricolazione', date: '26-29 gennaio 2026' },
      { label: 'Chiusura graduatorie', date: '3 febbraio 2026' },
    ],
    documents: [
      { title: 'Decreto attuativo', url: 'https://www.mur.gov.it/sites/default/files/2025-06/Decreto%20MInisteriale%20n.%20418%20del%2030-05-2025.pdf' },
      { title: 'Procedure di iscrizione', url: 'https://www.mur.gov.it/sites/default/files/2025-06/Decreto%20MInisteriale%20n.%20418%20Allegato%201.pdf' },
      { title: 'Graduatoria nazionale', url: 'https://www.mur.gov.it/sites/default/files/2025-07/Decreto%20Ministeriale%20n.%20454%20del%2016-07-2025.pdf' },
      { title: 'Syllabus Chimica e Propedeutica Biochimica', url: 'https://www.mur.gov.it/sites/default/files/2025-06/Decreto%20MInisteriale%20n.%20418%20Syllabus%20Chimica%20e%20Propedeutica%20Biochimica.pdf' },
      { title: 'Syllabus Fisica', url: 'https://www.mur.gov.it/sites/default/files/2025-06/Decreto%20Ministeriale%20n.%20418%20Syllabus_fisica%20errata%20corrige%2024.06.2025.pdf' },
      { title: 'Syllabus Biologia', url: 'https://www.mur.gov.it/sites/default/files/2025-06/Decreto%20MInisteriale%20n.%20418%20Syllabus_BIOLOGIA.pdf' },
      { title: 'Linee guida', url: 'https://www.mur.gov.it/sites/default/files/2025-10/LineeGuida_semestre_aperto_brochure.pdf' },
      { title: 'Posti disponibili MEDICINA - UE', url: 'https://www.mur.gov.it/sites/default/files/2025-08/Decreto%20ministeriale%20n.%20600%20del%2007-08-2025%20-%20MEDICINA%20-%20UE%20-%20ITA.pdf' },
      { title: 'Posti disponibili ODONTOIATRIA - UE', url: 'https://www.mur.gov.it/sites/default/files/2025-08/Decreto%20ministeriale%20n.%20600%20del%2007-08-2025%20-%20ODONTOIATRIA%20-%20UE%20-%20ITA.pdf' },
      { title: 'Posti disponibili VETERINARIA - UE', url: 'https://www.mur.gov.it/sites/default/files/2025-08/Decreto%20ministeriale%20n.%20600%20del%2007-08-2025%20-%20VETERINARIA%20-%20UE%20-%20ITA.pdf' },
    ],
  },
  {
    id: 'imat',
    title: 'IMAT',
    description: 'Medicina, Odontoiatria e Veterinaria in lingua Inglese',
    image: '/images/imat.png',
    link: 'https://accessoprogrammato.mur.gov.it/2024/',
    dates: [
      { label: 'Test', date: '17 settembre 2025' },
      { label: 'Apertura iscrizioni', date: '26 agosto 2025' },
      { label: 'Chiusura iscrizioni', date: '9 settembre 2025' },
      { label: 'Pubblicazione risultati anonimi', date: '25 settembre 2025' },
      { label: 'Pubblicazione graduatoria', date: '13 ottobre 2025' },
    ],
    documents: [
      { title: 'Decreto ministeriale IMAT', url: 'https://www.mur.gov.it/sites/default/files/2025-08/Decreto%20ministeriale%20n.%20599%20del%2007-08-2025.pdf' },
      { title: 'Allegato A - Modalità e contenuti', url: 'https://www.mur.gov.it/sites/default/files/2025-08/Decreto%20ministeriale%20n.%20599%20del%2007-08-2025%20-%20Allegato%20A.pdf' },
      { title: 'Posti disponibili UE e non UE', url: 'https://www.mur.gov.it/sites/default/files/2025-08/Decreto%20ministeriale%20n.%20599%20del%2007-08-2025%20-%20Tabella%20B%20posti%20UE%20e%20non%20UE%20italia%20e%20posti%20extra%20UE%20rev.pdf' },
    ],
  },
  {
    id: 'sanitarie',
    title: 'Professioni Sanitarie',
    description: 'Professioni Sanitarie in lingua Italiana e in lingua Inglese',
    image: '/images/NEW_LOGO_2026/snticon.png',
    link: 'https://www.mur.gov.it/it/atti-e-normativa/decreto-ministeriale-n-1116-del-31-07-2024',
    dates: [
      { label: 'Test IT', date: '8 settembre 2025' },
      { label: 'Test ENG', date: '10 settembre 2025' },
      { label: 'Test LM', date: '25 settembre 2025' },
    ],
    documents: [
      { title: 'Decreto ministeriale L/SNT', url: 'https://www.mur.gov.it/sites/default/files/2025-08/Decreto%20ministeriale%20n.%20586%20del%2006-08-2025.pdf' },
      { title: 'Decreto ministeriale LM/SNT', url: 'https://www.mur.gov.it/sites/default/files/2025-08/Decreto%20Ministeriale%20n.%20605%20dell%208-8-2025.pdf' },
      { title: 'Syllabi L/SNT', url: 'https://www.mur.gov.it/sites/default/files/2025-08/Decreto%20ministeriale%20n.%20586%20del%2006-08-2025%20-%20Allegato%20A.pdf' },
      { title: 'Syllabi LM/SNT', url: 'https://www.mur.gov.it/sites/default/files/2025-08/Decreto%20Ministeriale%20n.%20605%20Allegato%201.pdf' },
      { title: 'Posti disponibili L/SNT UE', url: 'https://www.mur.gov.it/sites/default/files/2025-08/Decreto%20Ministeriale%20n.%20614%20Tabella%20A%20candidati%20UE%20e%20non%20UE%20Italia.pdf' },
    ],
  },
  {
    id: 'architettura',
    title: 'Test ARCHED',
    description: 'Architettura / Ingegneria edile-Architettura',
    image: '/images/arched.png',
    link: 'https://www.cisiaonline.it/area-tematica-architettura/test-arched-architettura-ingegneria-edile/struttura-della-prova-test-arched/',
    dates: [
      { label: 'Calendario CISIA', date: 'Consulta le date disponibili sul sito CISIA', url: 'https://www.cisiaonline.it/altri-test/test-arched/date' },
    ],
    documents: [
      { title: 'Decreto ministeriale', url: 'https://www.mur.gov.it/sites/default/files/2025-05/Decreto%20Ministeriale%20n.%20395%20del%2012-05-2025.pdf' },
      { title: 'Syllabi', url: 'https://www.mur.gov.it/sites/default/files/2025-05/Decreto%20Ministeriale%20n.%20395%20Allegato%20A.pdf' },
      { title: 'Posti disponibili UE', url: 'https://www.mur.gov.it/sites/default/files/2025-08/Decreto%20Ministeriale%20n.%20554%20del%204-8-2025.pdf%20-%20Tabella%20A%20posti%20UE%20e%20non%20UE%20residenti.pdf' },
    ],
  },
  {
    id: 'tolc-cent',
    title: 'TOLC & CEnT',
    description: 'Test On-Line CISIA / CISIA English Test',
    image: '/images/NEW_LOGO_2026/tolc_icon.png',
    link: 'https://www.cisiaonline.it/',
    dates: [
      { label: 'Calendario CISIA', date: 'Consulta le date disponibili sul sito CISIA', url: 'https://testcisia.it/calendario.php' },
    ],
    documents: [
      { title: 'Regolamento TOLC', url: 'https://www.cisiaonline.it/tolc/tutto-sul-TOLC/regolamento-tolc' },
      { title: 'Regolamento CEnT', url: 'https://www.cisiaonline.it/cent/tutto-sul-CEnT/regolamento-CEnT' },
      { title: 'Syllabus TOLC-AV (Scienze agrarie e veterinarie)', url: 'https://www.cisiaonline.it/tolc/tolc-av/struttura-della-prova-e-sillabo' },
      { title: 'Syllabus TOLC-B (Scienze biologiche e Biotecnologie)', url: 'https://www.cisiaonline.it/tolc/tolc-b/struttura-della-prova-e-sillabo' },
      { title: 'Syllabus TOLC-E (Economia, Statistica e Scienze sociali)', url: 'https://www.cisiaonline.it/tolc/tolc-e/struttura-della-prova-e-sillabo' },
      { title: 'Syllabus TOLC-F (Scienze farmaceutiche)', url: 'https://www.cisiaonline.it/tolc/tolc-f/struttura-della-prova-e-sillabo' },
      { title: 'Syllabus TOLC-I (Ingegneria)', url: 'https://www.cisiaonline.it/tolc/tolc-i/struttura-della-prova-e-sillabo' },
      { title: 'Syllabus TOLC-LP (Orientamento professionalizzante)', url: 'https://www.cisiaonline.it/tolc/tolc-lp/struttura-della-prova-e-sillabo' },
      { title: 'Syllabus TOLC-PSI (Scienze psicologiche)', url: 'https://www.cisiaonline.it/tolc/tolc-psi/struttura-della-prova-e-sillabo' },
      { title: 'Syllabus TOLC-S (Scienze chimiche, fisiche, matematiche, geologiche e naturali)', url: 'https://www.cisiaonline.it/tolc/tolc-s/struttura-della-prova-e-sillabo' },
      { title: 'Syllabus TOLC-SPS (Scienze politiche e sociali)', url: 'https://www.cisiaonline.it/tolc/tolc-sps/struttura-della-prova-e-sillabo' },
      { title: 'Syllabus TOLC-SU (Scienze umanistiche)', url: 'https://www.cisiaonline.it/tolc/tolc-su/struttura-della-prova-e-sillabo' },
      { title: 'English TOLC-E', url: 'https://www.cisiaonline.it/tolc/english-tolc-e/structure-and-syllabus' },
      { title: 'English TOLC-F', url: 'https://www.cisiaonline.it/tolc/english-tolc-f/structure-and-syllabus' },
      { title: 'English TOLC-I', url: 'https://www.cisiaonline.it/tolc/english-tolc-i/structure-and-syllabus' },
    ],
  },
];
