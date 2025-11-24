import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ContactForm from '@/components/ui/ContactForm';

type Props = {
  params: Promise<{
    materia: string;
  }>;
};

const materiaMap: Record<string, string> = {
  'medicina-veterinaria': 'Medicina, Odontoiatria e Veterinaria',
  'professioni-sanitarie': 'Professioni Sanitarie',
  'architettura': 'Architettura',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { materia } = await params;
  const materiaName = materiaMap[materia];
  
  if (!materiaName) {
    return {
      title: 'Simulazione Non Trovata',
    };
  }

  return {
    title: `Prenota Simulazione ${materiaName}`,
    description: `Richiedi la tua simulazione del test di ammissione per ${materiaName}`,
  };
}

export default async function SimulazioneMateria({ params }: Props) {
  const { materia } = await params;
  const materiaName = materiaMap[materia];

  if (!materiaName) {
    notFound();
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Prenota Simulazione
          </h1>
          <p className="text-xl text-gray-700 mb-4">
            {materiaName}
          </p>
          <p className="text-lg text-gray-600">
            Compila il form per richiedere la tua simulazione
          </p>
        </div>

        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <ContactForm 
            defaultSubject={`Richiesta Simulazione: ${materiaName}`}
            subjectReadonly={true}
          />
        </div>
      </div>
    </div>
  );
}
