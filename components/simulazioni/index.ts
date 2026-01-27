/**
 * Simulation components exports
 * Contains statistics and UI components for simulations
 */

export { TemplateStatistics } from './TemplateStatistics';
export { AssignmentStatistics } from './AssignmentStatistics';
export { default as TolcInstructions } from './TolcInstructions';
export { default as TolcSimulationLayout } from './TolcSimulationLayout';
export { default as StudentWaitingRoom } from './StudentWaitingRoom';
export { default as InTestMessaging, MessagingButton } from './InTestMessaging';
export { default as SimulationStartScreen } from './SimulationStartScreen';
export { default as SimulationPreviewModal } from './SimulationPreviewModal';
export {
  SimulationLoadingState,
  SimulationKickedState,
  SimulationErrorState,
  SimulationMissingAssignmentState,
  AntiCheatWarningOverlay,
  StartSimulationButton,
} from './SimulationStates';

// Execution components
export { default as FeedbackModal } from './FeedbackModal';
export { default as SimulationHeader } from './SimulationHeader';
export { default as QuestionPanel } from './QuestionPanel';
export { default as NavigationSidebar } from './NavigationSidebar';
export {
  SubmitConfirmModal,
  SectionTransitionModal,
  SimpleSectionTransitionModal,
  SimpleSubmitModal,
} from './SimulationModals';
