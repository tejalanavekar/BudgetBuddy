import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom fakes just enough of a browser (DOM, localStorage, etc.) for component
    // tests to run in Node — there's no real browser involved.
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true
  }
})
