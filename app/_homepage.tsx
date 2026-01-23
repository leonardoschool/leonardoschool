import TestCard from '@/components/ui/TestCard';
import TestimonialsCarousel from '@/components/ui/TestimonialsCarousel';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import ScienceCanvasLight from '@/components/ui/ScienceCanvasLight';
import AnimatedStats from '@/components/ui/AnimatedStats';
import { TestCard as TestCardType, Testimonial } from '@/types';
import { STATS } from '@/lib/constants';

const tests: TestCardType[] = [
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
      { label: 'Pubblicazione graduatorie nazionali', date: '8 gennaio 2026' },
      { label: '1a immatricolazione', date: '8-14 gennaio 2026' },
      { label: '1° scorrimento e scelta sedi vacanti', date: '16-19 gennaio 2026 (ore 23:59)' },
      { label: '2° scorrimento e 2a immatricolazione', date: '21-24 gennaio 2026' },
      { label: 'Chiusura graduatorie', date: '28 febbraio 2026' },
    ],
    documents: [
      { title: 'Decreto attuativo', url: 'https://www.mur.gov.it/sites/default/files/2025-06/Decreto%20MInisteriale%20n.%20418%20del%2030-05-2025.pdf' },
      { title: 'Procedure di iscrizione', url: 'https://www.mur.gov.it/sites/default/files/2025-06/Decreto%20MInisteriale%20n.%20418%20Allegato%201.pdf' },
      { title: 'Graduatoria nazionale', url: 'https://www.mur.gov.it/sites/default/files/2025-07/Decreto%20Ministeriale%20n.%20454%20del%2016-07-2025.pdf' },
      { title: 'Graduatoria nazionale (ulteriori criteri)', url: 'https://www.mur.gov.it/sites/default/files/2025-12/Decreto%20Ministeriale%20n.%201115%20del%2022-12-2025.pdf' },
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
      { title: 'English CEnT-S', url: 'https://www.cisiaonline.it/tolc/english-tolc-e/structure-and-syllabus' }
    ],
  },
];

const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Noemi C.',
    course: 'Medicina e Chirurgia',
    university: 'Catania',
    image: '/images/1.jpeg',
    text: 'Il loro modo di lavorare, la loro gentilezza e il loro sostegno dato, mi hanno permesso di raggiungere il mio più grande sogno.',
  },
  {
    id: '2',
    name: 'Sara O.',
    course: 'Medicina e Chirurgia',
    university: 'Catania',
    image: '/images/2.jpeg',
    text: 'Grazie a loro accurato metodo di insegnamento e alla loro disponibilità sono finalmente riuscita a raggiungere il mio obiettivo.',
  },
  {
    id: '3',
    name: 'Francesco G.',
    course: 'Fisioterapia',
    university: 'Catania',
    image: '/images/3.jpeg',
    text: 'Grazie all\'ottima preparazione, al costante interesse, aiuto e ai semplici trucchetti dei miei tutor sono riuscito ad entrare nel corso di laurea di Fisioterapia. Lo consiglio a tutti!',
  },
  {
    id: '4',
    name: 'Vittoria G.',
    course: 'Medicina e Chirurgia',
    university: 'Catania',
    image: '/images/4.jpeg',
    text: 'Entusiata del percorso fatto con i tutor, i progressi sono stati incredibili e tutto grazie alla passione e alla dedizione che questi ragazzi mettono nel loro lavoro.',
  },
  {
    id: '5',
    name: 'Delia B.',
    course: 'Medicina e Chirurgia',
    university: 'Torino',
    image: '/images/5.jpeg',
    text: 'Mesi di duro lavoro direzionato dai tutor super competenti e costantemente disponibili possono determinare il resto della tua vita! Tornando indietro mi affiderei altre cento volte: è stata la mossa più intelligente che abbia mai fatto. Grazie!',
  },
  {
    id: '6',
    name: 'Giuliana L.',
    course: 'Medicina e Chirurgia',
    university: 'Catania',
    image: '/images/NEW_LOGO_2026/NEW_TESTIMONIALS/GiulianaL.jpg',
    text: 'Leonardo School è stata molto più di una semplice scuola di preparazione: è diventata una vera piccola famiglia. Lezioni chiare, spiegazioni precise, esercitazioni mirate e la costante disponibilità dei tutor: ecco il mix perfetto. Fino all’ultimo giorno, mi sono sentita motivata e supportata. Mi hanno insegnato a credere in me stessa e, grazie a questo, ho realizzato il mio sogno!',
  },
  {
    id: '7',
    name: 'Aurora Carmen U.',
    course: 'Medicina e Chirurgia',
    university: 'Catania',
    image: '/images/NEW_LOGO_2026/NEW_TESTIMONIALS/AuroraCarmen.jpg',
    text: "È stata la scelta migliore che potessi fare. Non è solo un percorso di preparazione eccezionale e funzionale al test, ma anche un'occasione di crescita personale, tra persone magnifiche e tutor straordinari. Consiglio questo percorso a tutti: per me Leonardo School è stata casa e rassicurazione.",
  },
  {
    id: '8',
    name: 'Adelaide F.',
    course: 'Dietistica',
    university: 'UniCT',
    image: '/images/NEW_LOGO_2026/NEW_TESTIMONIALS/Adelaide_F.png',
    text: "Ci vogliono sempre due pietre focaie per accendere un fuoco: una sei tu, e l'altra è Leonardo School. Qui ho trovato tutor davvero preparati, presenti e capaci di aiutarti a superare le difficoltà più disparate. Sanno essere sinceri, diretti e sono pronti a riportarti sui binari quando serve. Li ho incontrati in un momento di grande difficoltà e stanchezza, e sarò sempre grata per l'energia che mi hanno restituito. È grazie a loro se ho ritrovato la forza per il rush finale… concluso nel migliore dei modi.",
  },
  {
    id: '9',
    name: 'Walter G.',
    course: 'Fisioterapia',
    university: 'UniCT',
    image: '/images/NEW_LOGO_2026/NEW_TESTIMONIALS/Walter_G.png',
    text: "Leonardo School è davvero una realtà speciale: un team giovane, competente e sempre disponibile, capace di trasformare ogni lezione in un momento chiaro, stimolante e orientato al risultato. Ma ciò che fa davvero la differenza è l'atmosfera. Fin dal primo giorno ti senti accolto, seguito e motivato, in un ambiente che non ha nulla della classica scuola fredda e impersonale. Qui ti senti visto, ascoltato, valorizzato. Consiglio Leonardo School a chi vuole prepararsi seriamente e, allo stesso tempo, trovare un luogo dove sentirsi davvero sostenuto.",
  },
  {
    id: '10',
    name: 'Noemi Maria F.',
    course: 'Medicina e Chirurgia',
    university: 'UniCT',
    image: '/images/NEW_LOGO_2026/NEW_TESTIMONIALS/default-avatar.svg',
    text: "Mi sono trovata davvero bene con questo corso di preparazione: il metodo di insegnamento è stato chiaro, funzionale e completo. Oltre alle lezioni teoriche, avevamo a disposizione moltissimo materiale per studiare a casa e un numero incredibile di esercizi e simulazioni quotidiane che mi hanno permesso di acquisire sicurezza e un vero metodo di lavoro. Un altro grande punto di forza è la disponibilità dello staff: anche fuori dall'orario delle lezioni potevo contare su una risposta rapida a qualsiasi dubbio, e questo mi ha fatta sentire costantemente supportata. Consiglio davvero la Leonardo School: sono organizzati, preparati e competenti, ma soprattutto riescono a creare un ambiente accogliente, quasi una piccola famiglia. Un'esperienza che lascia qualcosa in più oltre alla preparazione.",
  },
  {
    id: '11',
    name: 'Liborio P.',
    course: 'Medicina e Chirurgia',
    university: 'UniCT',
    image: '/images/NEW_LOGO_2026/NEW_TESTIMONIALS/Liborio_P.png',
    text: 'Leonardo School mi ha accolto quando ero un alunno spaesato e impaurito, e mi ha visto crescere fino a diventare tutor e studente di Medicina consapevole. L\'unione tra competenza didattica e supporto umano è stata decisiva per la mia crescita personale, permettendomi di raggiungere i miei obiettivi nel modo più sereno e gratificante possibile.',
  },
];

export default function Home() {
  return (
    <>
      {/* Hero Section with Interactive Science Animation */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
        {/* Interactive Science Canvas Background */}
        <ScienceCanvasLight />

        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 z-10" />

        <div className="container mx-auto px-4 pt-32 pb-20 relative z-30">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-6xl font-bold text-white leading-tight font-bahnschrift" style={{ fontSize: 'clamp(3.75rem, 8vw, 6.5rem)' }}>
                LEONARDO SCHOOL
              </h1>
              <div className="h-1.5 w-32 bg-gradient-to-r from-red-500 to-red-600 mx-auto rounded-full" />
            </div>

            {/* Subheading */}
            <h2 className="text-2xl md:text-4xl text-white font-light">
              Il tuo successo inizia qui
            </h2>

            {/* Description */}
            <p className="text-lg md:text-xl text-gray-200 max-w-3xxl mx-auto leading-relaxed">
              Preparazione d&apos;eccellenza per l’ammissione ai corsi di laurea ad accesso programmato
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Link href="/didattica">
                <Button variant="primary" size="lg" className="min-w-[200px]">
                  Scopri i Corsi
                </Button>
              </Link>
              <Link href="/simulazione">
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  Esercitati con noi
                </Button>
              </Link>
            </div>

            {/* Quick Stats */}
            <AnimatedStats stats={STATS} />
          </div>
        </div>

        {/* Scroll Down Arrow */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce z-40">
          <a
            href="#about"
            className="block text-white opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Scorri verso il basso"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7M19 3l-7 7-7-7"
              />
            </svg>
          </a>
        </div>
      </section>

      {/* Tests Section */}
      <section id="about" className="py-20 bg-gradient-to-b from-white via-gray-50 to-white relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-red-100 rounded-full blur-3xl opacity-30 animate-float" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-red-50 rounded-full blur-3xl opacity-40 animate-float" style={{ animationDelay: '2s' }} />

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-10">
            <div className="inline-block mb-4">
              <span className="text-sm font-semibold text-red-600 bg-red-50 px-4 py-2 rounded-full uppercase tracking-wider">
                PROVE DI AMMISSIONE
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Quale test vuoi sostenere?
            </h1>
            <div className="w-24 h-1.5 bg-gradient-to-r from-red-500 to-red-600 mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-16 items-start">
            {tests.map((test) => (
              <TestCard key={test.id} test={test} expandable={true} />
            ))}
          </div>

          <div className="text-center">
            <Link href="/test">
              <Button variant="primary" size="lg" className="shadow-xl shadow-red-600/20 hover:shadow-2xl hover:shadow-red-600/30">
                Scopri di più
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section - Modern Cards with Icons */}
      <section className="bg-gradient-to-b from-white via-gray-50 to-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-red-100 rounded-full blur-3xl opacity-20 animate-float" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-50 rounded-full blur-3xl opacity-30 animate-float" style={{ animationDelay: '3s' }} />

        <div className="container mx-auto px-4 relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-block mb-4">
              <span className="text-sm font-semibold text-red-600 bg-red-50 px-4 py-2 rounded-full uppercase tracking-wider">
                LA NOSTRA FORMULA MAGICA PER IL SUCCESSO
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Il Metodo Leonardo
            </h2>
            <div className="w-24 h-1.5 bg-gradient-to-r from-red-500 to-red-600 mx-auto rounded-full mb-6" />
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Tutor giovani e competenti, piccoli gruppi classe e programmi didattici perfettamente in linea con i syllabi dei concorsi di ammissione.
            </p>
          </div>

          {/* 4 Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* Card 1 - Classi Non Numerose */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-500 border border-gray-100 hover:border-red-200 group hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-blue-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-red-600 transition-colors">
                Classi non numerose
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Aule raccolte che uniscono l’esclusività della lezione privata alla dinamicità e alla motivazione del lavoro di gruppo
              </p>
            </div>

            {/* Card 2 - Studenti per gli Studenti */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-500 border border-gray-100 hover:border-red-200 group hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 shadow-lg shadow-purple-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-red-600 transition-colors">
                Studenti per gli Studenti
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Tutor giovani, competenti e con esperienza diretta nei test di ammissione, per un supporto autentico ed efficace
              </p>
            </div>

            {/* Card 3 - Approccio Teorico-Pratico */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-500 border border-gray-100 hover:border-red-200 group hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-emerald-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-red-600 transition-colors">
                Approccio teorico-pratico
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Lezioni frontali chiare e strutturate integrate da esercitazioni tematiche e generali per trasformare la teoria in risultati
              </p>
            </div>

            {/* Card 4 - Offerta Formativa Flessibile */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-500 border border-gray-100 hover:border-red-200 group hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 shadow-lg shadow-orange-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-red-600 transition-colors">
                Offerta formativa flessibile
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Un percorso didattico base, intermedio, avanzato o totalmente personalizzato pensato per adattarsi ai tuoi obiettivi e alle tue esigenze di apprendimento
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center mt-12">
            <Link href="/contattaci">
              <Button variant="primary" size="lg" className="shadow-xl hover:shadow-2xl">
                Prenota un colloquio gratuito
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <TestimonialsCarousel testimonials={testimonials} />

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/+393516467873"
        className="fixed bottom-8 right-8 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full p-5 shadow-2xl hover:shadow-green-500/50 hover:scale-110 transition-all duration-300 z-50 group animate-bounce hover:animate-none"
        aria-label="Contattaci su WhatsApp"
      >
        <svg className="w-8 h-8 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      </a>
    </>
  );
}
