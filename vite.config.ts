import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' : NCP Object Storage 정적 호스팅에서 하위 경로로 올려도 동작
export default defineConfig({ base: './', plugins: [react(), tailwindcss()] });
