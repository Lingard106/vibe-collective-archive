import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import localGuestsApi from './scripts/local-guests-api.js';

export default defineConfig({plugins:[react(),localGuestsApi()],build:{rollupOptions:{output:{manualChunks:{'vendor-react':['react','react-dom','react-router-dom'],'vendor-motion':['framer-motion'],'vendor-icons':['lucide-react']}}}}});
