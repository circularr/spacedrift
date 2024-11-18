import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    powerPreference: "high-performance"
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Stars
class Star {
    constructor() {
        this.x = THREE.MathUtils.randFloatSpread(2000);
        this.y = THREE.MathUtils.randFloatSpread(2000);
        this.z = THREE.MathUtils.randFloatSpread(2000);
        this.size = Math.random() * 3 + 0.5;
        this.velocity = Math.random() * 2 + 0.5;
    }

    update(speed) {
        this.z += speed * this.velocity;
        if (this.z > 1000) {
            this.z -= 2000;
            // Randomize position when recycling star
            this.x = THREE.MathUtils.randFloatSpread(2000);
            this.y = THREE.MathUtils.randFloatSpread(2000);
        }
    }
}

const starCount = 30000;
const stars = new Array(starCount).fill(null).map(() => new Star());

// Create star material
const starShape = new THREE.BufferGeometry();
const starMaterial = new THREE.PointsMaterial({
    size: 2,
    sizeAttenuation: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    depthWrite: false
});

// Create vertices and colors for stars
function updateStarVertices() {
    const vertices = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    
    stars.forEach((star, i) => {
        const i3 = i * 3;
        vertices[i3] = star.x;
        vertices[i3 + 1] = star.y;
        vertices[i3 + 2] = star.z;
        
        // Calculate color based on depth
        const depth = (1000 + star.z) / 2000;
        const color = new THREE.Color();
        color.setHSL(0.6, 0.2, depth);
        
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
        
        // Dynamic size based on depth and original star size
        sizes[i] = star.size * (depth * 3);
    });
    
    starShape.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    starShape.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starShape.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
}

updateStarVertices();
const starField = new THREE.Points(starShape, starMaterial);
scene.add(starField);

// Post-processing setup
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,  // bloom strength
    0.4,  // radius
    0.85  // threshold
);
composer.addPass(bloomPass);

// Camera position and movement
camera.position.z = 0;
let speed = 10;
let targetSpeed = speed;
const smoothing = 0.05;
const maxSpeed = 50;
const minSpeed = 0;

// Control state
const controls = {
    isMouseDown: false,
    touchStartY: 0,
    lastTouchY: 0,
    speedValue: document.querySelector('.speed-value'),
    dialMarker: document.querySelector('.dial-marker')
};

// Speed control functions
function increaseSpeed(amount = 5) {
    targetSpeed = Math.min(maxSpeed, targetSpeed + amount);
    updateSpeedDisplay();
}

function decreaseSpeed(amount = 5) {
    targetSpeed = Math.max(minSpeed, targetSpeed - amount);
    updateSpeedDisplay();
}

function updateSpeedDisplay() {
    // Update the speed value display
    const displaySpeed = Math.round((targetSpeed / maxSpeed) * 9.9);
    controls.speedValue.textContent = displaySpeed.toFixed(1);
    
    // Update the dial marker rotation
    const rotation = (targetSpeed / maxSpeed) * 360;
    controls.dialMarker.style.transform = `rotate(${rotation}deg)`;
    
    // Update the glow intensity based on speed
    const glowIntensity = 0.2 + (targetSpeed / maxSpeed) * 0.8;
    controls.dialMarker.style.opacity = glowIntensity;
}

// Keyboard controls
window.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowUp':
        case 'w':
            increaseSpeed();
            break;
        case 'ArrowDown':
        case 's':
            decreaseSpeed();
            break;
        case ' ': // Spacebar
            if (targetSpeed < 1) {
                targetSpeed = 25;
            } else {
                targetSpeed = 0;
            }
            updateSpeedDisplay();
            break;
    }
});

// Mouse controls
window.addEventListener('mousedown', (e) => {
    if (e.target.closest('.controls')) {
        controls.isMouseDown = true;
        controls.lastY = e.clientY;
    }
});

window.addEventListener('mouseup', () => {
    controls.isMouseDown = false;
});

window.addEventListener('mousemove', (e) => {
    if (controls.isMouseDown) {
        const deltaY = e.clientY - controls.lastY;
        targetSpeed = Math.max(minSpeed, Math.min(maxSpeed, targetSpeed - deltaY * 0.1));
        controls.lastY = e.clientY;
        updateSpeedDisplay();
    }
});

// Touch controls
window.addEventListener('touchstart', (e) => {
    if (e.target.closest('.controls')) {
        controls.touchStartY = e.touches[0].clientY;
        controls.lastTouchY = controls.touchStartY;
    }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
    if (e.target.closest('.controls')) {
        const touch = e.touches[0];
        const deltaY = touch.clientY - controls.lastTouchY;
        targetSpeed = Math.max(minSpeed, Math.min(maxSpeed, targetSpeed - deltaY * 0.1));
        controls.lastTouchY = touch.clientY;
        updateSpeedDisplay();
    }
}, { passive: true });

// Mouse wheel control
window.addEventListener('wheel', (e) => {
    if (e.deltaY > 0) {
        decreaseSpeed(2);
    } else {
        increaseSpeed(2);
    }
}, { passive: true });

// Initial speed display
updateSpeedDisplay();

// Handle window resize
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    renderer.setSize(width, height);
    composer.setSize(width, height);
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    bloomPass.setSize(width, height);
});

// Animation with frame timing
let lastTime = 0;
const fpsInterval = 1000 / 60;

function animate(currentTime) {
    requestAnimationFrame(animate);
    
    const elapsed = currentTime - lastTime;
    
    if (elapsed > fpsInterval) {
        lastTime = currentTime - (elapsed % fpsInterval);
        
        // Smooth speed transition
        speed += (targetSpeed - speed) * smoothing;
        
        // Update star positions
        stars.forEach(star => star.update(speed));
        updateStarVertices();
        
        // Render with post-processing
        composer.render();
    }
}

animate(0);
