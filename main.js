// ===== 全域變數 =====
let scene, camera, renderer, logo, particlesMesh;
let cubeCamera, cubeRenderTarget;
let pointLight1, pointLight2;
let isHovering = false;
let currentRotationSpeed = 0.003;
const normalSpeed = 0.003;
const hoverSpeed = 0.02;
let loadingProgress = 0;

// FPS 監控變數
let frameCount = 0;
let lastTime = performance.now();
let currentFps = 60;

// DOM 元素
const canvasContainer = document.getElementById('canvas-container');
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const loadingPercent = document.getElementById('loading-percent');
const fpsDisplay = document.getElementById('fps-display');

// 將場景中的物件調整到畫面可見範圍內（適用於手機/窄螢幕）
function fitCameraToObject(camera, object, offset = 2) {
    if (!object) return;
    const boundingBox = new THREE.Box3().setFromObject(object);
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);

    const fov = camera.fov * (Math.PI / 180);
    const aspect = renderer ? (renderer.domElement.clientWidth / renderer.domElement.clientHeight) : (window.innerWidth / window.innerHeight);

    const distanceV = (maxSize / 2) / Math.tan(fov / 2);
    const horizontalFOV = 2 * Math.atan(Math.tan(fov / 2) * aspect);
    const distanceH = (maxSize / 2) / Math.tan(horizontalFOV / 2);

    const distance = Math.max(distanceV, distanceH) * offset;

    camera.position.x = center.x;
    camera.position.y = center.y;
    camera.position.z = center.z + distance;
    camera.lookAt(center);
    camera.updateProjectionMatrix();
}

// ===== 資訊面板響應式調整 =====
function adjustInfoPanels() {
    const info = document.querySelector('.info-panel');
    const features = document.querySelector('.features-panel');
    if (!info || !features) return;

    const w = window.innerWidth;
    if (w <= 600) {
        // 手機：面板置中並延伸為寬度友好顯示
        info.style.position = 'fixed';
        info.style.left = '50%';
        info.style.top = 'auto';
        info.style.bottom = '10px';
        info.style.transform = 'translateX(-50%)';
        info.style.width = 'calc(100% - 40px)';
        info.style.fontSize = '13px';
        info.style.padding = '12px';

        features.style.position = 'fixed';
        features.style.left = '50%';
        features.style.top = '10px';
        features.style.right = 'auto';
        features.style.bottom = 'auto';
        features.style.transform = 'translateX(-50%)';
        features.style.width = 'calc(100% - 40px)';
        features.style.fontSize = '13px';
        features.style.padding = '12px';
        // 更新提示文字為行動裝置友好
        const hint = document.querySelector('.info-hint');
        if (hint) hint.textContent = '點擊或長按 Logo 以加速旋轉';
    } else {
        // 桌面：恢復原始位置與樣式
        info.style.position = '';
        info.style.left = '20px';
        info.style.top = '20px';
        info.style.bottom = '';
        info.style.transform = '';
        info.style.width = '';
        info.style.fontSize = '';
        info.style.padding = '';

        features.style.position = '';
        features.style.right = '20px';
        features.style.bottom = '20px';
        features.style.left = '';
        features.style.top = '';
        features.style.transform = '';
        features.style.width = '';
        features.style.fontSize = '';
        features.style.padding = '';
        const hint = document.querySelector('.info-hint');
        if (hint) hint.textContent = '將滑鼠移到 Logo 上以加速旋轉';
    }
}

// ===== Loading 進度模擬 =====
const loadingInterval = setInterval(() => {
    loadingProgress += Math.random() * 15;
    if (loadingProgress >= 100) {
        loadingProgress = 100;
        clearInterval(loadingInterval);
    }
    progressBar.style.width = loadingProgress + '%';
    loadingPercent.textContent = Math.round(loadingProgress) + '%';
}, 100);

// ===== 初始化場景 =====
function init() {
    // 創建場景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    // 創建相機
    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 8;

    // 創建渲染器
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputEncoding = THREE.sRGBEncoding;
    canvasContainer.appendChild(renderer.domElement);

    // Prevent mobile long-press text selection / context menu on the canvas
    // - CSS handles most cases, but add JS fallbacks for legacy/other browsers
    // - Only prevent default on the canvas/container to avoid blocking page gestures
    try {
        renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
        renderer.domElement.addEventListener('selectstart', (e) => e.preventDefault());

        // Prevent contextmenu coming from touch long-press (covers some Android browsers)
        window.addEventListener('contextmenu', (e) => {
            if (e.target === renderer.domElement || canvasContainer.contains(e.target)) {
                e.preventDefault();
            }
        }, { passive: false });
    } catch (err) {
        // If renderer is not ready or browser blocks, silently ignore
        console.warn('Could not attach long-press prevention listeners:', err);
    }

    // 創建 Logo
    createLogo();

    // 初始調整，確保 logo 在各種裝置可見
    fitCameraToObject(camera, logo, 2);

    // 設置光源
    setupLights();

    // 創建粒子系統
    createParticles();

    // 添加事件監聽：使用 Pointer Events 支援桌面與行動裝置
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', onWindowResize);

    // 初次調整資訊面板
    adjustInfoPanels();

    // 延遲顯示場景（確保 loading 動畫可見）
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
        canvasContainer.classList.add('loaded');
    }, 1500);

    // 開始動畫循環
    animate();
}

// ===== 創建 Logo 模型 =====
function createLogo() {
    // 創建 M 字母形狀
    const shape = new THREE.Shape();

    shape.moveTo(0, 0);
    shape.lineTo(0, 3);
    shape.lineTo(0.5, 3);
    shape.lineTo(1.5, 1.3);
    shape.lineTo(2.5, 3);
    shape.lineTo(3, 3);
    shape.lineTo(3, 0);
    shape.lineTo(2.5, 0);
    shape.lineTo(2.5, 2);
    shape.lineTo(1.5, 0.2);
    shape.lineTo(0.5, 2);
    shape.lineTo(0.5, 0);
    shape.lineTo(0, 0);

    // 擠壓設置
    const extrudeSettings = {
        depth: 0.5,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.1,
        bevelSegments: 8,
        curveSegments: 1
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();

    // 創建環境貼圖以增強金屬反射
    cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
        format: THREE.RGBFormat,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter
    });

    cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);
    cubeCamera.position.set(0, 0, 0);
    scene.add(cubeCamera);

    // 金屬材質
    const material = new THREE.MeshStandardMaterial({
        color: 0x00ff88,
        metalness: 0.9,
        roughness: 0.15,
        emissive: 0x002211,
        emissiveIntensity: 0.3,
        envMapIntensity: 1.5,
        envMap: cubeRenderTarget.texture
    });

    logo = new THREE.Mesh(geometry, material);
    logo.castShadow = true;
    logo.receiveShadow = true;
    scene.add(logo);
}

// ===== 設置光源系統 =====
function setupLights() {
    // 環境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // 方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // 點光源 1（青色）
    pointLight1 = new THREE.PointLight(0x00ffff, 1.0, 20);
    pointLight1.position.set(-5, 3, 5);
    scene.add(pointLight1);

    // 點光源 2（粉紫色）
    pointLight2 = new THREE.PointLight(0xff00ff, 0.8, 15);
    pointLight2.position.set(5, -3, -5);
    scene.add(pointLight2);

    // 邊緣光源
    const rimLight = new THREE.DirectionalLight(0x88ffff, 0.6);
    rimLight.position.set(-3, 0, -5);
    scene.add(rimLight);
}

// ===== 創建粒子系統 =====
function createParticles() {
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 5000;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 20;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.02,
        color: 0x00ff88,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });

    particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);
}

// ===== 指標 / 觸控互動處理（Pointer Events） =====
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerIsDown = false;

function getPointerNormalized(event) {
    return {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1
    };
}

function onPointerMove(event) {
    // 對於滑鼠/筆，移動仍然會觸發 hover；對於 touch 我們只在按下時處理
    const p = getPointerNormalized(event);
    pointer.x = p.x;
    pointer.y = p.y;

    // 若是觸控而未按下，跳過 hover 檢測
    if (event.pointerType === 'touch' && !pointerIsDown) return;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(logo);

    if (intersects.length > 0) {
        if (!isHovering) {
            isHovering = true;
            document.body.style.cursor = event.pointerType === 'mouse' ? 'pointer' : 'default';
        }
    } else {
        if (isHovering && !pointerIsDown) {
            isHovering = false;
            document.body.style.cursor = 'default';
        }
    }
}

function onPointerDown(event) {
    pointerIsDown = true;
    const p = getPointerNormalized(event);
    pointer.x = p.x;
    pointer.y = p.y;
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(logo);
    if (intersects.length > 0) {
        isHovering = true; // 將觸控視為 hover/加速
    }
}

function onPointerUp(event) {
    pointerIsDown = false;
    // 觸控結束後停止加速
    if (event.pointerType === 'touch') {
        isHovering = false;
    }
}

// ===== 響應式處理 =====
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // 在改變大小時重新計算相機位置，手機或窄螢幕會使用較大的 offset
    const offset = window.innerWidth <= 600 ? 1.6 : 2;
    fitCameraToObject(camera, logo, offset);
    // 同步調整面板位置與大小
    adjustInfoPanels();
}

// ===== FPS 計算與顯示 =====
function updateFPS() {
    frameCount++;
    const currentTime = performance.now();

    if (currentTime >= lastTime + 1000) {
        currentFps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        fpsDisplay.textContent = currentFps;
        fpsDisplay.className = currentFps > 55 ? 'fps-good' : 'fps-warning';
        frameCount = 0;
        lastTime = currentTime;
    }
}

// ===== 動畫循環 =====
function animate() {
    requestAnimationFrame(animate);

    // 平滑過渡旋轉速度
    const targetSpeed = isHovering ? hoverSpeed : normalSpeed;
    currentRotationSpeed += (targetSpeed - currentRotationSpeed) * 0.1;

    // Logo 旋轉動畫
    logo.rotation.y += currentRotationSpeed;
    logo.rotation.x = Math.sin(Date.now() * 0.0005) * 0.1;

    // 粒子動畫
    particlesMesh.rotation.y += 0.0005;
    particlesMesh.rotation.x += 0.0002;

    // 動態光源動畫
    pointLight1.position.x = Math.sin(Date.now() * 0.001) * 5;
    pointLight1.position.z = Math.cos(Date.now() * 0.001) * 5;

    pointLight2.position.x = Math.cos(Date.now() * 0.0015) * 4;
    pointLight2.position.y = Math.sin(Date.now() * 0.0015) * 4;

    // 更新環境貼圖（每 10 幀更新一次以優化性能）
    if (Math.floor(Date.now()) % 10 === 0) {
        logo.visible = false;
        cubeCamera.update(renderer, scene);
        logo.visible = true;
    }

    // 渲染場景
    renderer.render(scene, camera);

    // 更新 FPS 顯示
    updateFPS();
}

// ===== 頁面載入後初始化 =====
window.addEventListener('DOMContentLoaded', init);