import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { initTheme } from './store/themeStore';
import './styles/globals.css';
import './styles/animations.css';
import './styles/landing.css';

// Apply the stored/OS theme BEFORE first paint — no flash of wrong theme.
initTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
