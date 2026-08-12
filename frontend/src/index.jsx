import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SiteProvider } from './context/SiteContext';
import './i18n';
import 'primereact/resources/themes/lara-light-cyan/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import './index.css';
// Chargee en dernier : ses regles transversales de confort tactile doivent
// l'emporter sur les feuilles de composants.
import './mobile.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <SiteProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </SiteProvider>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);
