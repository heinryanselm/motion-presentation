import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function initializeAnimations() {
    // Move all animation logic here
    createParticles()
    setupInteractiveElements()
    setupScrollTriggers()
}

export function createParticles() {
    // Particle system logic
}

// Export individual animation functions
export { setupScrollTriggers, setupMicrointeractions }