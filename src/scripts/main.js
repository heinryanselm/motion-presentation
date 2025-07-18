import { initializeAnimations } from './animations.js'
import { setupNavigation } from './navigation.js'
import { initPerformanceMonitoring } from './performance.js'
import { setupLenis } from './lenis.js'
import '../styles/main.scss'

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    setupLenis()
    initializeAnimations()
    setupNavigation()
    initPerformanceMonitoring()
})

// src/scripts/main.js
if (import.meta.hot) {
    import.meta.hot.accept('./animations.js', (newModule) => {
        // Re-initialize animations on hot reload
        newModule.initializeAnimations()
    })
}