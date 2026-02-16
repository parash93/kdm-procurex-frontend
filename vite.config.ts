import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  preview: {
    host: true, // listens on all network interfaces (0.0.0.0)
    port: 8080, // port DigitalOcean expects
    allowedHosts: ['creativeworld.info'], // allow your hostname
  },
});
