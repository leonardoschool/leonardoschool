import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Termini e condizioni - Leonardo School',
  description: 'Informativa sulla privacy e termini di utilizzo del sito Leonardo School. Scopri come trattiamo i tuoi dati personali.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Hero Section */}
      <section className="relative bg-black text-white pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-black/60"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Termini e condizioni
            </h1>
            <div className="w-24 h-1.5 bg-gradient-to-r from-red-500 to-red-600 mx-auto rounded-full mb-6" />
            <p className="text-lg text-gray-300">
              Informativa sul trattamento dei dati personali e condizioni d&apos;uso del sito
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Termini e condizioni Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 mb-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Termini e condizioni</h2>
              </div>

              <div className="prose prose-gray max-w-none">
                <p className="text-gray-600 leading-relaxed mb-6">
                  La presente informativa descrive le modalità con cui <strong>Leonardo Formazione S.r.l.s.</strong> tratta i dati 
                  personali degli utenti in relazione all&apos;utilizzo del sito <strong>www.leonardoschool.it</strong>, ai sensi dell&apos;art. 13 e 
                  14 del Regolamento UE 2016/679 del Parlamento Europeo e del Consiglio del 27 aprile 2016, relativo alla protezione 
                  delle persone fisiche con riguardo al trattamento dei dati personali, nonché alla libera circolazione di tali dati 
                  (il &quot;GDPR&quot;) e al Decreto Legislativo del 10 agosto 2018 n. 101, di adeguamento del Codice in materia di protezione 
                  di dati personali ex Decreto Legislativo del 30 giugno 2003 n. 196, alla normativa nazionale delle disposizioni del GDPR.
                </p>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-sm font-bold">1</span>
                  Titolare del trattamento dei dati personali
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Il titolare del trattamento dei dati personali relativi al sito www.leonardoschool.it è <strong>Leonardo 
                  Formazione S.r.l.s.</strong> con sede in Corso Sicilia, 20 - Trecastagni (CT).
                </p>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-sm font-bold">2</span>
                  Finalità del trattamento dei dati
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Leonardo Formazione S.r.l.s. tratterà alcuni dati personali forniti dagli utenti che interagiscono con 
                  il sito web per le seguenti finalità:
                </p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
                  <li>Rispondere alle richieste di informazioni inviate tramite i form di contatto</li>
                  <li>Gestire le candidature ricevute tramite il form &quot;Lavora con noi&quot;</li>
                  <li>Fornire i servizi richiesti dall&apos;utente</li>
                  <li>Adempiere agli obblighi di legge</li>
                </ul>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-sm font-bold">3</span>
                  Dati di navigazione
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Si tratta di dati di navigazione che i sistemi informatici acquisiscono automaticamente durante 
                  l&apos;utilizzo del sito, quale l&apos;indirizzo IP, gli indirizzi in notazione URI, nonché i dettagli delle richieste 
                  inviate al server del Sito che ne rendono possibile la navigazione. Questi dati vengono utilizzati al solo fine 
                  di ricavare informazioni statistiche anonime sull&apos;uso del sito e per controllarne il corretto funzionamento.
                </p>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-sm font-bold">4</span>
                  Dati forniti dall&apos;utente
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Gli utenti sono liberi di fornire dati personali tramite gli appositi form per inviare richieste. 
                  L&apos;eventuale invio comporta l&apos;acquisizione dell&apos;indirizzo e-mail e degli ulteriori dati personali inseriti 
                  nel form. I dati saranno trattati esclusivamente per rispondere alla richiesta dell&apos;utente e non saranno 
                  comunicati a terzi senza previo consenso, salvo obblighi di legge.
                </p>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-sm font-bold">5</span>
                  Modalità di trattamento
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  I dati personali sono trattati con logiche strettamente correlate alle finalità stesse, e per il periodo 
                  di tempo strettamente necessario a conseguire gli scopi per cui sono stati raccolti. Il trattamento avviene 
                  mediante strumenti informatici e telematici, con modalità organizzative e logiche strettamente correlate 
                  alle finalità indicate, adottando le misure di sicurezza adeguate a garantire la riservatezza dei dati.
                </p>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-sm font-bold">6</span>
                  Diffusione dei dati
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  I dati personali non sono soggetti a diffusione né a trasferimento verso paesi terzi.
                </p>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-sm font-bold">7</span>
                  Cookie
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Il sito utilizza esclusivamente cookie tecnici e funzionali necessari per permettere il corretto funzionamento 
                  del sito e migliorare l&apos;esperienza di navigazione. Non vengono utilizzati cookie di profilazione.
                </p>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-sm font-bold">8</span>
                  Strumenti di analisi
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Il sito utilizza Google Search Console per analizzare alcune statistiche relative ai visitatori (es. il 
                  numero di persone che visualizzano il sito o come esse vi sono arrivate). Le informazioni sono 
                  raccolte in modo del tutto anonimo e aggregato, nel rispetto della privacy degli utenti.
                </p>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-sm font-bold">9</span>
                  Diritti dell&apos;interessato
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Ai sensi degli articoli 15-22 del GDPR, l&apos;interessato ha diritto di:
                </p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
                  <li>Accedere ai propri dati personali</li>
                  <li>Chiederne la rettifica o la cancellazione</li>
                  <li>Richiedere la limitazione del trattamento</li>
                  <li>Opporsi al trattamento</li>
                  <li>Richiedere la portabilità dei dati</li>
                  <li>Revocare il consenso in qualsiasi momento</li>
                  <li>Proporre reclamo all&apos;Autorità Garante per la protezione dei dati personali</li>
                </ul>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Per esercitare i propri diritti, l&apos;interessato può contattarci attraverso la pagina{' '}
                  <Link href="/contattaci" className="text-red-600 hover:text-red-700 font-semibold">
                    Contattaci
                  </Link>.
                </p>
              </div>
            </div>

            {/* Terms Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Condizioni d&apos;uso</h2>
              </div>

              <div className="prose prose-gray max-w-none">
                <p className="text-gray-600 leading-relaxed mb-6">
                  I contenuti e le informazioni del presente sito sono pubblicati a scopo esclusivamente informativo 
                  e divulgativo. Non possono essere considerati esaustivi, non costituiscono un parere legale o altro 
                  tipo di consulenza professionale, né sono volti a fini commerciali o all&apos;instaurazione di relazioni 
                  contrattuali con i visitatori.
                </p>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm font-bold">1</span>
                  Esclusione di responsabilità
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Leonardo Formazione S.r.l.s. declina ogni responsabilità in merito ad azioni o omissioni 
                  derivanti dall&apos;utilizzo delle informazioni e degli articoli contenuti nel presente sito. 
                  L&apos;utente è l&apos;unico responsabile dell&apos;uso delle informazioni fornite.
                </p>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm font-bold">2</span>
                  Proprietà intellettuale
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Tutti i contenuti presenti sul sito (testi, immagini, loghi, grafica) sono di proprietà di 
                  Leonardo Formazione S.r.l.s. o dei rispettivi titolari e sono protetti dalle leggi sul diritto d&apos;autore. 
                  È vietata la riproduzione, anche parziale, senza autorizzazione scritta.
                </p>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm font-bold">3</span>
                  Link esterni
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Il sito può contenere link a siti esterni. Leonardo Formazione S.r.l.s. non è responsabile 
                  dei contenuti, delle politiche sulla privacy o delle pratiche di tali siti terzi.
                </p>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm font-bold">4</span>
                  Modifiche
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Leonardo Formazione S.r.l.s. si riserva il diritto di modificare in qualsiasi momento i contenuti 
                  del sito e le presenti condizioni d&apos;uso, senza obbligo di preavviso. L&apos;utente è tenuto a verificare 
                  periodicamente eventuali aggiornamenti.
                </p>

                <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm font-bold">5</span>
                  Legge applicabile e foro competente
                </h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Le presenti condizioni sono regolate dalla legge italiana. Per qualsiasi controversia derivante 
                  dall&apos;utilizzo del sito sarà competente in via esclusiva il Foro di Catania.
                </p>
              </div>
            </div>

            {/* Company Info */}
            <div className="mt-12 text-center">
              <div className="bg-gray-100 rounded-2xl p-6 inline-block">
                <p className="text-gray-600 text-sm">
                  <strong>Leonardo Formazione S.r.l.s.</strong><br />
                  Corso Sicilia, 20 - Trecastagni (CT)<br />
                  P.IVA: 05944090876
                </p>
              </div>
              <p className="text-gray-500 text-sm mt-4">
                Ultimo aggiornamento: Novembre 2025
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
