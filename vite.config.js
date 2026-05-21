import { cloudflare } from '@cloudflare/vite-plugin';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [cloudflare()],
  environments: {
    client: {
      build: {
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'index.html'),
            responses: resolve(__dirname, 'responses.html'),
          },
        },
      },
    },
  },
});
