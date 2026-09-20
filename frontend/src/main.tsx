// Self-hosted fonts: no render-blocking round trip to Google, no user IP leaving the app.
// Must come before tailwind.css so the @font-face rules land above the theme layer.
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './app/tailwind.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppProviders } from '@app/providers/app-providers';
import { AppRouter } from '@app/router/app-router';
import { reportWebVitals } from '@lib/vitals/report-web-vitals';
import { applyTheme, readStoredTheme } from '@lib/theme';

applyTheme(readStoredTheme());

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </StrictMode>,
);

reportWebVitals();
