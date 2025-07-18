import { defineConfig } from 'vite'

export default defineConfig({
    root: '.',
    server: {
        port: 3000,
        open: true,
        hot: true
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        minify: 'terser',
        rollupOptions: {
            output: {
                manualChunks: {
                    gsap: ['gsap'],
                    lenis: ['@studio-freight/lenis']
                }
            }
        }
    }
})