import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/source-sans-3/latin-400.css';
import '@fontsource/source-sans-3/latin-600.css';
import '@fontsource/source-sans-3/greek-400.css';
import '@fontsource/source-sans-3/greek-600.css';
import '@fontsource/source-serif-4/latin-500.css';
import '@fontsource/source-serif-4/greek-500.css';
import { App } from './ui/App.tsx';
import './ui/style.css';

const root = document.querySelector('#root');
if (!root) throw new Error('missing root');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
