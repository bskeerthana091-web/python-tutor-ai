// Environment-adaptive API Configuration
// - In Vite development mode (localhost:3000), routes to http://localhost:8000
// - In Production (unified FastAPI server, public tunnel, or custom domain), routes to same-origin relative path ''
// - Can also be overridden with VITE_API_BASE_URL / VITE_WS_BASE_URL if hosted on separate cloud domains

const isViteDev = typeof window !== 'undefined' && window.location.port === '3000';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL !== undefined
  ? import.meta.env.VITE_API_BASE_URL
  : (isViteDev ? 'http://localhost:8000' : '');

export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL !== undefined
  ? import.meta.env.VITE_WS_BASE_URL
  : (isViteDev
      ? 'ws://localhost:8000'
      : (typeof window !== 'undefined'
          ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
          : 'ws://localhost:8000'));
