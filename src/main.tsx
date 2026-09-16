import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/cover.css';
import './styles/product.css';
import './styles/manual-order.css';
import './styles/banner.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
