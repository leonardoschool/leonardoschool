import TestCard from '@/components/ui/TestCard';
import { TestCard as TestCardType } from '@/types';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Test di ammissione | Leonardo School',
  description: 'Informazioni complete su prove accesso 2025-2026: test medicina, odontoiatria, veterinaria, professioni sanitarie, architettura. Date, documenti e graduatorie.',
  keywords: ['prove accesso università', 'test medicina 2026', 'test odontoiatria date', 'test veterinaria catania', 'professioni sanitarie prove', 'test architettura', 'date test medicina', 'graduatoria medicina'],
  openGraph: {
    title: 'Test di ammissione | Leonardo School',
    description: 'Tutte le informazioni sui test di accesso universitari 2025-2026',
    url: 'https://leonardoschool.it/test',
  },
};

const allTests: TestCardType[] = [
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
      { title: 'Syllabus TOLC-SU (Scienze umanistiche)', url: 'http://tolc-su/' },
      { title: 'English TOLC-E', url: 'https://www.cisiaonline.it/tolc/english-tolc-e/structure-and-syllabus' },
      { title: 'English TOLC-F', url: 'https://www.cisiaonline.it/tolc/english-tolc-f/structure-and-syllabus' },
      { title: 'English TOLC-I', url: 'https://www.cisiaonline.it/tolc/english-tolc-i/structure-and-syllabus' },
    ],
  },
];

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 bg-black text-white overflow-hidden">
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-black mb-6">
            TEST DI AMMISSIONE
          </h1>
          <div className="w-24 h-1.5 bg-gradient-to-r from-red-500 to-red-600 mx-auto rounded-full mb-8" />
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Scopri tutti i test di accesso per il tuo percorso di studi e ottieni informazioni dettagliate
            su date, modalità e contenuti.
          </p>
        </div>
      </section>

      {/* Tests Grid Section - Test Ministeriali */}
      <section className="py-20 relative overflow-hidden">

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-4">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              UNIVERSITÀ PUBBLICHE 
            </h2>
            <p className="text-lg text-gray-600 max-w-2xxl mx-auto">
              Informazioni ufficiali sui test di ammissione regolamentati a livello nazionale o locale
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 max-w-7xl mx-auto mb-20 items-start">
            {allTests.map((test) => (
              <TestCard key={test.id} test={test} expandable={true} />
            ))}
          </div>

          {/* Università Private Section */}
          <div className="mt-20">
            <div className="text-center mb-4">
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
                UNIVERSITÀ PRIVATE
              </h2>
              <p className="text-lg text-gray-600 max-w-2xxl mx-auto">
              Informazioni ufficiali sui test di ammisisone non direttamente regolamentati dal MUR
            </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {/* Hunimed */}
              <div className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 p-8 border-2 border-gray-100">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center shadow-lg">
                    <img src="/images/hunimed.png" alt="Hunimed" className="w-14 h-14 object-contain" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3 text-center">Test Hunimed</h3>
                <p className="text-sm text-gray-600 mb-6 text-center">Humanitas University</p>
                <div className="space-y-2">
                  <a href="https://www.hunimed.eu/wp-content/uploads/2025/11/2026_MEDEU_Bando_ITA-1.pdf" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicine and Surgery
                  </a>
                  <a href="https://www.hunimed.eu/wp-content/uploads/2025/06/2025_Professioni-Sanitarie.pdf" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Professioni Sanitarie
                  </a>
                </div>
              </div>

              {/* UCBM */}
              <div className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 p-8 border-2 border-gray-100">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center shadow-lg">
                    <img src="/images/ucbm.png" alt="UCBM" className="w-14 h-14 object-contain" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3 text-center">Test UBCM</h3>
                <p className="text-sm text-gray-600 mb-6 text-center">Università Campus Bio-Medico di Roma</p>
                <div className="space-y-2">
                  <a href="https://www.unicampus.it/ammissioni-trasferim/medicina-e-chirurgia-a-a-2026-2027/" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicina e Chirurgia
                  </a>
                  <a href="https://www.unicampus.it/ammissioni-trasferim/odontoiatria-e-protesi-dentaria-a-a-2026-2027/" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Odontoiatria e Protesi Dentaria
                  </a>
                  <a href="https://www.unicampus.it/ammissioni-trasferim/medicine-and-surgery-a-a-2026-2027-cittadini-italiani-europei-ed-equiparati/" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicine and Surgery
                  </a>
                  <a href="https://www.unicampus.it/ammissioni-trasferim/medicine-and-surgery-medtech-a-a-2026-2027-cittadini-italiani-europei-ed-equiparati/" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicine and Surgery "MedTech"
                  </a>
                </div>
              </div>

              {/* UniCamillus */}
              <div className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 p-8 border-2 border-gray-100">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center shadow-lg">
                    <img src="/images/uniCamillus.png" alt="UniCamillus" className="w-14 h-14 object-contain" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3 text-center">Test UniCamillus</h3>
                <p className="text-sm text-gray-600 mb-6 text-center">Saint Camillus International University</p>
                <div className="space-y-2">
                  <a href="https://unicamillus.org/wp-content/uploads/bandi_ammissione/2025-2026/dr_545_bando_medicina_italiano_eu_2025-2026_ottobre_2025.pdf?x46727" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicina e Chirurgia
                  </a>
                  <a href="https://unicamillus.org/wp-content/uploads/bandi_ammissione/2025-2026/dr_546_bando_odontoiatria_eu_2025-2026_roma_ottobre_2025.pdf?x46727" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Odontoiatria e Protesi Dentaria
                  </a>
                  <a href="https://unicamillus.org/wp-content/uploads/bandi_ammissione/2025-2026/dr_544_bando_medicina_inglese_eu_2025-2026_roma_ottobre_2025.pdf?x46727" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicine and Surgery
                  </a>
                  <a href="https://unicamillus.org/wp-content/uploads/bandi_ammissione/2025-2026/dr-559_bando_oste_biom_ue_ottobre_2025-2026.pdf?x46727" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Professioni Sanitarie
                  </a>
                </div>
              </div>

              {/* UniCatt */}
              <div className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 p-8 border-2 border-gray-100">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center shadow-lg">
                    <img src="/images/unicatt.png" alt="UniCatt" className="w-14 h-14 object-contain" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3 text-center">Test UniCatt</h3>
                <p className="text-sm text-gray-600 mb-6 text-center">Università Cattolica del Sacro Cuore</p>
                <div className="space-y-2">
                  <a href="https://www.unicatt.it/corsi/triennale/medicina-e-chirurgia-roma/ammissioni-e-iscrizioni.html" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicina e Chirurgia – Odontoiatria e Protesi Dentaria
                  </a>
                  <a href="https://www.unicatt.it/en/programmes/undergraduate-and-integrated-degree-programmes/medicine-and-surgery-it-rome/admissions-and-enrolment.html" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicine and Surgery – Dentistry and Dental Prosthodontics
                  </a>
                </div>
              </div>

              {/* UniLink */}
              <div className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 p-8 border-2 border-gray-100">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center shadow-lg">
                    <img src="/images/unilink.png" alt="UniLink" className="w-14 h-14 object-contain" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3 text-center">Test UniLink</h3>
                <p className="text-sm text-gray-600 mb-6 text-center">Link Campus University</p>
                <div className="space-y-2">
                  <a href="https://www.unilink.it/fileadmin/user_upload/offerta_formativa/18-12_BandoMED-ODONTO_25-26_tutte_le_sedi.pdf" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicina e Chirurgia – Odontoiatria e Protesi Dentaria
                  </a>
                  <a href="https://www2.unilink.it/test-ammissione.asp" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Professioni Sanitarie
                  </a>
                </div>
              </div>

              {/* UniSR */}
              <div className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 p-8 border-2 border-gray-100">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center shadow-lg">
                    <img src="/images/uniSR.jpeg" alt="UniSR" className="w-14 h-14 object-contain rounded-full" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3 text-center">Test UniSR</h3>
                <p className="text-sm text-gray-600 mb-6 text-center">Università Vita-Salute San Raffaele</p>
                <div className="space-y-2">
                  <a href="https://www.unisr.it/servizi/ammissioni/medicina-chirurgia" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicina e Chirurgia
                  </a>
                  <a href="https://www.unisr.it/servizi/ammissioni/odontoiatria" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Odontoiatria e Protesi Dentaria
                  </a>
                  <a href="https://www.unisr.it/servizi/ammissioni/international-medical-doctor-program" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Medicine and Surgery
                  </a>
                  <a href="https://www.unisr.it/servizi/ammissioni/professioni-sanitarie" target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-gray-700 hover:text-red-600 transition-colors">
                    <span className="text-red-600 mr-2">›</span> Professioni Sanitarie
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
