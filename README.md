# 3D M Logo Demo — 技術說明

## 架構
- `index.html`：頁面骨架，包含 canvas 容器（`#canvas-container`）、載入遮罩與資訊面板（`.info-panel` / `.features-panel`）。
- `style.css`：UI 與響應式樣式（loading、面板、手機版優化）。
- `main.js`：單一入口的非模組 JS，負責建立 Three.js 場景、相機、渲染器、Logo 幾何、材質、光源、粒子系統、互動（raycasting / pointer events）與動畫迴圈。

## 動畫邏輯
- Logo 建模：使用 `THREE.Shape` 描述 M 字輪廓，透過 `THREE.ExtrudeGeometry` 擠出成 3D 形體；材質使用 `MeshStandardMaterial` 並搭配 cube-camera 產生簡易反射效果以呈現金屬感。
- 自轉機制：主動畫迴圈以 requestAnimationFrame 驅動；透過一個「目標角速度」(normal / hover) 與平滑過渡係數（ease）讓旋轉在慢速與加速間平滑插值。
- 互動處理：使用 `THREE.Raycaster` 搭配 Pointer Events（`pointermove` / `pointerdown` / `pointerup`）以同時支援桌面 hover 與行動裝置觸控（按下/長按視為加速）。
- 動態元素：粒子系統（`THREE.Points`）與多個動態光源，光源位置以時間函數驅動，增加視覺動感但不影響核心互動邏輯。

## 效能考量
- 限制像素比：設定 renderer pixel ratio 為 `Math.min(window.devicePixelRatio, 2)`，避免高 DPI 裝置造成過度渲染負擔。
- 限制 delta：在計算時間差時 cap 最大 delta（例如 0.05s）以減少 frame drop 對動畫造成的大跳動。
- 減少環境貼圖更新頻率：cube-camera 不每幀更新，而是每隔數幀/時間片段更新一次，以降低 GPU 負擔。
- 重用資源並在退出時釋放：geometry / material / textures 與 renderer 在不需要時呼叫 `.dispose()`，避免記憶體累積。
- 可調降品質：在低效能裝置可動態降低粒子數量、關閉 bevel 或降低光源數量以提升 FPS。

## 使用的 library 與理由
- **Three.js (UMD)**：提供成熟且跨瀏覽器的 WebGL 抽象，簡化幾何、材質與光源管理；選擇 UMD（`three.min.js`）以便無需額外打包工具直接部署到 GitHub Pages。
- **原生 Web APIs**：使用 Pointer Events、requestAnimationFrame、WebGL via Three.js 等原生 API，減少額外依賴並保持輕量。