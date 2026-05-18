import tailwindcss from '@tailwindcss/vite';
import vscode from '@tomjs/vite-plugin-vscode';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    vscode({
      extension: {
        sourcemap: 'inline',
      },
      // The plugin owns the production HTML (CSP meta + nonce + {{baseUri}}-rewritten
      // <script>/<link>). The `csp` value is inserted verbatim with
      // `insertAdjacentHTML('afterbegin', csp)`, so it MUST be the full <meta>
      // element — passing just directives renders them as visible text in <head>.
      webview: {
        csp: `<meta http-equiv="Content-Security-Policy" content="${[
          'default-src \'none\'',
          'img-src {{cspSource}} https: data: blob:',
          'style-src {{cspSource}} \'unsafe-inline\'',
          'script-src \'nonce-{{nonce}}\' \'unsafe-eval\'',
          'font-src {{cspSource}} data:',
          'connect-src {{cspSource}}',
        ].join('; ')}">`,
      },
    }),
  ],
});
