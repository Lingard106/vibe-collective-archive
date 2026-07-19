import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import localGuestsApi from './scripts/local-guests-api.js';

export default defineConfig({plugins:[react(),localGuestsApi()]});
