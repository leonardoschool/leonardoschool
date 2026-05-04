import Link from 'next/link';
import Button from '@/components/ui/Button';

interface FeatureCard {
  title: string;
  description: string;
  iconColor: string;
  iconShadow: string;
  icon: React.ReactNode;
  rotate?: 'left' | 'right';
}

const FEATURE_CARDS: FeatureCard[] = [
  {
    title: 'Classi non numerose',
    description: "Aule raccolte che uniscono l'esclusività della lezione privata alla dinamicità e alla motivazione del lavoro di gruppo",
    iconColor: 'bg-gradient-to-br from-blue-500 to-blue-600',
    iconShadow: 'shadow-lg shadow-blue-500/30',
    rotate: 'right',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    title: 'Studenti per gli Studenti',
    description: 'Tutor giovani, competenti e con esperienza diretta nei test di ammissione, per un supporto autentico ed efficace',
    iconColor: 'bg-gradient-to-br from-purple-500 to-purple-600',
    iconShadow: 'shadow-lg shadow-purple-500/30',
    rotate: 'left',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    title: 'Approccio teorico-pratico',
    description: 'Lezioni frontali chiare e strutturate integrate da esercitazioni tematiche e generali per trasformare la teoria in risultati',
    iconColor: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    iconShadow: 'shadow-lg shadow-emerald-500/30',
    rotate: 'right',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    title: 'Offerta formativa flessibile',
    description: 'Un percorso didattico base, intermedio, avanzato o totalmente personalizzato pensato per adattarsi ai tuoi obiettivi e alle tue esigenze di apprendimento',
    iconColor: 'bg-gradient-to-br from-orange-500 to-orange-600',
    iconShadow: 'shadow-lg shadow-orange-500/30',
    rotate: 'left',
    icon: (
      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
];

/**
 * "Why Choose Us" / Method section for the homepage
 * Displays the Leonardo School methodology features
 */
export function MethodSection() {
  return (
    <section className="bg-gradient-to-b from-white via-gray-50 to-white relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-red-100 rounded-full blur-3xl opacity-20 animate-float" />
      <div 
        className="absolute bottom-0 left-0 w-96 h-96 bg-red-50 rounded-full blur-3xl opacity-30 animate-float" 
        style={{ animationDelay: '3s' }} 
      />

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
            Tutor giovani e competenti, piccoli gruppi classe e programmi didattici perfettamente in linea con i syllabi dei concorsi di ammissione.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {FEATURE_CARDS.map((card, index) => (
            <div 
              key={index}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-500 border border-gray-100 hover:border-red-200 group hover:-translate-y-2"
            >
              <div 
                className={`w-16 h-16 ${card.iconColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 ${
                  card.rotate === 'right' ? 'group-hover:rotate-3' : 'group-hover:-rotate-3'
                } transition-all duration-300 ${card.iconShadow}`}
              >
                {card.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-red-600 transition-colors">
                {card.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {card.description}
              </p>
            </div>
          ))}
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
  );
}

export default MethodSection;
