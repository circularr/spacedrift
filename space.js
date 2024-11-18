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

// Camera position
camera.position.z = 0;
let speed = 0;

// UI Elements
const ui = {
    speedGauge: document.querySelector('.speed-gauge'),
    speedValue: document.querySelector('.speed-value'),
    speedBars: document.querySelector('.speed-bars'),
    speedMarker: document.querySelector('.speed-marker'),
    hint: document.querySelector('.hint'),
    desktopHint: document.querySelector('.desktop-hint'),
    mobileHint: document.querySelector('.mobile-hint')
};

// Control state
const controls = {
    currentSpeed: 0,
    targetSpeed: 0,
    maxSpeed: 50,
    minSpeed: 0,
    acceleration: 0.05,
    touchSensitivity: 2.0,
    mouseSensitivity: 1.5,
    barCount: 20
};

// Create speed bars
function createSpeedBars() {
    for (let i = 0; i < controls.barCount; i++) {
        const bar = document.createElement('div');
        bar.className = 'speed-bar';
        ui.speedBars.appendChild(bar);
    }
}

// Show appropriate hints based on device
function updateHints() {
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    ui.desktopHint.style.display = isTouchDevice ? 'none' : 'inline';
    ui.mobileHint.style.display = isTouchDevice ? 'inline' : 'none';
    ui.hint.classList.add('visible');
}

// Hide hints after delay
function hideHintsAfterDelay() {
    setTimeout(() => ui.hint.classList.remove('visible'), 3000);
}

// Speed control
function setSpeed(newSpeed) {
    controls.targetSpeed = Math.max(controls.minSpeed, Math.min(controls.maxSpeed, newSpeed));
    updateSpeedDisplay();
}

function updateSpeedDisplay() {
    // Update digital display
    const displaySpeed = Math.abs(controls.currentSpeed).toFixed(1);
    ui.speedValue.textContent = displaySpeed;
    
    // Calculate speed percentage
    const speedPercent = (controls.currentSpeed / controls.maxSpeed);
    
    // Update marker position
    ui.speedMarker.style.setProperty('--marker-position', `${speedPercent * 100}%`);
    
    // Update speed bars
    const activeBars = Math.floor(speedPercent * controls.barCount);
    const bars = ui.speedBars.children;
    
    for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        const isActive = i < activeBars;
        bar.classList.toggle('active', isActive);
        
        // Dynamic height for bars
        const heightPercent = isActive ? 100 : 30;
        bar.style.transform = `scaleY(${heightPercent}%)`;
    }
    
    // Update visual effects based on speed
    const intensity = Math.abs(speedPercent);
    const hue = 180 + intensity * 40;
    const glow = 10 + intensity * 30;
    
    // Apply visual effects
    ui.speedGauge.style.boxShadow = `
        0 0 ${glow}px rgba(0, 255, 255, ${0.2 + intensity * 0.3}),
        inset 0 0 ${glow/2}px rgba(0, 255, 255, ${0.1 + intensity * 0.2})
    `;
    
    // Update speed value glow
    ui.speedValue.style.textShadow = `0 0 ${5 + intensity * 15}px rgba(0, 255, 255, 0.8)`;
}

// Input handling
let isDragging = false;
let startY = 0;
let startSpeed = 0;

function handleStart(e) {
    isDragging = true;
    startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    startSpeed = controls.targetSpeed;
    hideHintsAfterDelay();
}

function handleMove(e) {
    if (!isDragging) return;
    
    const currentY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    const deltaY = startY - currentY;
    const sensitivity = e.type.includes('touch') ? controls.touchSensitivity : controls.mouseSensitivity;
    const speedChange = (deltaY / window.innerHeight) * controls.maxSpeed * sensitivity;
    
    setSpeed(startSpeed + speedChange);
    e.preventDefault();
}

function handleEnd() {
    isDragging = false;
}

// Keyboard controls
window.addEventListener('keydown', (e) => {
    switch(e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
            setSpeed(controls.targetSpeed + 2);
            break;
        case 'arrowdown':
        case 's':
            setSpeed(controls.targetSpeed - 2);
            break;
        case ' ':
            setSpeed(controls.currentSpeed < 1 ? 25 : 0);
            break;
    }
    hideHintsAfterDelay();
    e.preventDefault();
});

// Touch and mouse events
ui.speedGauge.addEventListener('mousedown', handleStart);
ui.speedGauge.addEventListener('touchstart', handleStart, { passive: false });
window.addEventListener('mousemove', handleMove);
window.addEventListener('touchmove', handleMove, { passive: false });
window.addEventListener('mouseup', handleEnd);
window.addEventListener('touchend', handleEnd);

// Quick tap to stop
ui.speedGauge.addEventListener('click', (e) => {
    if (!isDragging) {
        setSpeed(0);
    }
});

// Animation loop
let lastTime = 0;
const fpsInterval = 1000 / 60;

function animate(currentTime) {
    requestAnimationFrame(animate);
    
    const elapsed = currentTime - lastTime;
    
    if (elapsed > fpsInterval) {
        lastTime = currentTime - (elapsed % fpsInterval);
        
        // Smooth speed transition
        controls.currentSpeed += (controls.targetSpeed - controls.currentSpeed) * controls.acceleration;
        speed = controls.currentSpeed;
        
        // Update stars and display
        stars.forEach(star => star.update(speed));
        updateStarVertices();
        updateSpeedDisplay();
        
        composer.render();
    }
}

// Initialize
createSpeedBars();
updateHints();
animate(0);

// Handle window resize
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
    composer.setSize(width, height);
});
