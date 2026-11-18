import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/jetbrains-mono';
import './styles/globals.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/app';

const root = document.getElementById('root');
if (!root) throw new Error('Chybí kořenový element #root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
