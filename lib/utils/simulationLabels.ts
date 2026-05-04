/**
 * Simulation Type Labels - Italian translations
 * Centralizes all simulation type labels for consistent UI
 */

import type { SimulationType } from '../validations/simulationValidation';

/**
 * Maps simulation types to Italian labels
 */
export const SIMULATION_TYPE_LABELS: Record<SimulationType, string> = {
  OFFICIAL: 'Simulazione Ufficiale',
  PRACTICE: 'Test di Pratica',
  CUSTOM: 'Simulazione Personalizzata',
  QUICK_QUIZ: 'Quiz Veloce',
};

/**
 * Get Italian label for simulation type
 */
export function getSimulationTypeLabel(type: SimulationType | string): string {
  return SIMULATION_TYPE_LABELS[type as SimulationType] || type;
}

/**
 * Color schemes for simulation type badges
 */
export const SIMULATION_TYPE_COLORS: Record<SimulationType, { bg: string; text: string }> = {
  OFFICIAL: { 
    bg: 'bg-red-100 dark:bg-red-900/30', 
    text: 'text-red-700 dark:text-red-400' 
  },
  PRACTICE: { 
    bg: 'bg-blue-100 dark:bg-blue-900/30', 
    text: 'text-blue-700 dark:text-blue-400' 
  },
  CUSTOM: { 
    bg: 'bg-purple-100 dark:bg-purple-900/30', 
    text: 'text-purple-700 dark:text-purple-400' 
  },
  QUICK_QUIZ: { 
    bg: 'bg-green-100 dark:bg-green-900/30', 
    text: 'text-green-700 dark:text-green-400' 
  },
};

/**
 * Get color scheme for simulation type
 */
export function getSimulationTypeColors(type: SimulationType | string) {
  return SIMULATION_TYPE_COLORS[type as SimulationType] || SIMULATION_TYPE_COLORS.PRACTICE;
}
