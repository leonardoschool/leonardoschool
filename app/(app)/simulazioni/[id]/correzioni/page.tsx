import { redirect } from 'next/navigation';

interface SimulationCorrectionsRedirectPageProps {
  params: Promise<{ id: string }>;
}

export default async function SimulationCorrectionsRedirectPage({
  params,
}: SimulationCorrectionsRedirectPageProps) {
  const { id } = await params;
  redirect(`/simulazioni/risposte-aperte?simulationId=${id}`);
}