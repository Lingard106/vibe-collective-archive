import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import localGuestsApi from './scripts/local-guests-api.js';
import localMemberAdmin from './scripts/local-member-admin.js';

export default defineConfig(({mode})=>{const env=loadEnv(mode,process.cwd(),'');return{plugins:[react(),localGuestsApi(),localMemberAdmin({adminKey:env.ADMIN_MASTER_KEY})],build:{rollupOptions:{output:{manualChunks:{'vendor-react':['react','react-dom','react-router-dom'],'vendor-motion':['framer-motion'],'vendor-icons':['lucide-react']}}}}}});