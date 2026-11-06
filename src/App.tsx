import React from 'react';
import { MobileFrame } from './components/common/MobileFrame';
import { PatientRegisterScreen } from './components/screens/PatientRegisterScreen';
import { VitalsCaptureScreen } from './components/screens/VitalsCaptureScreen';
import { MediaCaptureScreen } from './components/screens/MediaCaptureScreen';
import { OutboxSyncScreen } from './components/screens/OutboxSyncScreen';
import { SuccessScreen } from './components/screens/SuccessScreen';
import { DoctorDashboardScreen } from './components/screens/DoctorDashboardScreen';
import { PatientPrescriptionsScreen } from './components/screens/PatientPrescriptionsScreen';
import { PatientLoginScreen } from './components/screens/PatientLoginScreen';
import { DoctorLoginScreen } from './components/screens/DoctorLoginScreen';
import { LoginSelectionScreen } from './components/screens/LoginSelectionScreen';
import { useTelemedicine } from './state/telemedicineContext';

export const AppContent: React.FC = () => {
  const { currentScreen } = useTelemedicine();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'portal-select':
        return <LoginSelectionScreen />;
      case 'patient-login':
        return <PatientLoginScreen />;
      case 'doctor-login':
        return <DoctorLoginScreen />;
      case 'register':
        return <PatientRegisterScreen />;
      case 'vitals':
        return <VitalsCaptureScreen />;
      case 'media':
        return <MediaCaptureScreen />;
      case 'outbox':
        return <OutboxSyncScreen />;
      case 'success':
        return <SuccessScreen />;
      case 'doctor':
        return <DoctorDashboardScreen />;
      case 'prescriptions':
        return <PatientPrescriptionsScreen />;
      default:
        return <LoginSelectionScreen />;
    }
  };

  return <MobileFrame>{renderScreen()}</MobileFrame>;
};

export const App: React.FC = () => {
  return <AppContent />;
};

export default App;
