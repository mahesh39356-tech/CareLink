import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TelemedicineProvider } from './state/telemedicineContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TelemedicineProvider>
      <App />
    </TelemedicineProvider>
  </React.StrictMode>
);
