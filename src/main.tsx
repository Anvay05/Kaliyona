import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ProgressProvider } from './store/progressStore.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ProgressProvider>
    <App />
  </ProgressProvider>
);

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Ignore service worker registration errors in restricted preview iframes
    });
  });
}
