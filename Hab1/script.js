import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 120.5, 3); // Aumentamos Y a 3.5 para elevar más la cámara

// Render con menor resolución para móviles
const isMobile = /Mobi|Android/i.test(navigator.userAgent);
const pixelRatio = isMobile ? 0.75 : 1;

const renderer = new THREE.WebGLRenderer({ antialias: !isMobile });
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controles móviles: botones de movimiento y touch para mirar
if (isMobile) {
    // Crear contenedor de botones
    const controlsDiv = document.createElement('div');
    controlsDiv.style.position = 'fixed';
    controlsDiv.style.bottom = '30px';
    controlsDiv.style.left = '50%';
    controlsDiv.style.transform = 'translateX(-50%)';
    controlsDiv.style.zIndex = '100';
    controlsDiv.style.display = 'flex';
    controlsDiv.style.gap = '18px';
    document.body.appendChild(controlsDiv);

    // Botones
    const btns = [
        { id: 'forward', label: '▲' },
        { id: 'left', label: '◀' },
        { id: 'back', label: '▼' },
        { id: 'right', label: '▶' }
    ];
    btns.forEach(({ id, label }) => {
        const btn = document.createElement('button');
        btn.id = id;
        btn.innerText = label;
        btn.style.fontSize = '2rem';
        btn.style.padding = '12px 18px';
        btn.style.borderRadius = '10px';
        btn.style.border = 'none';
        btn.style.background = '#222';
        btn.style.color = '#fff';
        btn.style.opacity = '0.85';
        btn.style.touchAction = 'none';
        controlsDiv.appendChild(btn);
    });

    // Estado de movimiento
    const moveState = { forward: false, back: false, left: false, right: false };
    const moveSpeed = 8.5; // velocidad rápida

    // Eventos de botones
    ['forward', 'back', 'left', 'right'].forEach(dir => {
        const btn = document.getElementById(dir);
        btn.addEventListener('touchstart', e => {
            e.preventDefault();
            moveState[dir] = true;
        });
        btn.addEventListener('touchend', e => {
            e.preventDefault();
            moveState[dir] = false;
        });
        btn.addEventListener('touchcancel', e => {
            e.preventDefault();
            moveState[dir] = false;
        });
    });

    // Touch para mirar
    let lastTouch = null;
    renderer.domElement.addEventListener('touchstart', e => {
        if (e.touches.length === 1) {
            lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    });
    renderer.domElement.addEventListener('touchmove', e => {
        if (e.touches.length === 1 && lastTouch) {
            const dx = e.touches[0].clientX - lastTouch.x;
            const dy = e.touches[0].clientY - lastTouch.y;
            controls.lon -= dx * 0.25; // sensibilidad horizontal
            controls.lat -= dy * 0.25; // sensibilidad vertical
            lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    });
    renderer.domElement.addEventListener('touchend', e => {
        lastTouch = null;
    });

    // Sobrescribir update para movimiento rápido
    const origUpdate = controls.update.bind(controls);
    controls.update = function (delta) {
        // Movimiento
        const direction = new THREE.Vector3();
        if (moveState.forward) direction.z -= 1;
        if (moveState.back) direction.z += 1;
        if (moveState.left) direction.x -= 1;
        if (moveState.right) direction.x += 1;
        if (direction.lengthSq() > 0) {
            direction.normalize();
            // Mover en la dirección de la cámara
            const move = new THREE.Vector3();
            camera.getWorldDirection(move);
            move.y = 0;
            move.normalize();
            // Lateral
            const right = new THREE.Vector3().crossVectors(camera.up, move).normalize();
            const moveVec = new THREE.Vector3();
            moveVec.addScaledVector(move, direction.z);
            moveVec.addScaledVector(right, direction.x);
            moveVec.normalize().multiplyScalar(moveSpeed * delta);
            camera.position.add(moveVec);
        }
        origUpdate(delta);
    };
}

// Luz direccional (más eficiente que muchas)
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(2, 4, 2);
scene.add(light);

// Luz ambiental (suave)
const ambient = new THREE.AmbientLight(0x404040, 0.6);
scene.add(ambient);

// Cargar modelo GLB
const loader = new GLTFLoader();
loader.load('model/room.glb', function (gltf) {
    gltf.scene.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
        }
    });
    scene.add(gltf.scene);
    console.log("Modelo cargado correctamente");
}, undefined, function (error) {
    console.error("Error al cargar modelo:", error);
});

// Controles
const controls = new FirstPersonControls(camera, renderer.domElement);
controls.lookSpeed = 0.08;
controls.movementSpeed = 2.5;
controls.lookVertical = true;

// FPS limitador manual (60fps)
const clock = new THREE.Clock();
let lastTime = 0;
const fpsLimit = 1 / 60;

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const now = clock.elapsedTime;

    if (now - lastTime >= fpsLimit) {
        controls.update(delta);
        renderer.render(scene, camera);
        lastTime = now;
    }
}
animate();

// Ajustar al redimensionar
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
