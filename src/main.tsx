import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { db } from './services/storage'
import { setLanguage, t } from './services/i18n'

if (typeof window !== 'undefined') {
  (window as any).__gd_db = db;
  (window as any).db = db;
  (window as any).setLanguage = setLanguage;
  (window as any).t = t;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
