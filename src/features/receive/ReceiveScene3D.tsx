import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Court } from '../defense/scene/Court';
import { ReceiveNet } from './scene/ReceiveNet';
import { ReceivePlayers } from './scene/ReceivePlayers';
import { ReceiveOverlays } from './scene/ReceiveOverlays';
import { ReceiveCameraRig, INITIAL_CAMERA_POSITION } from './scene/ReceiveCameraRig';
import type { ControlsRef } from './scene/ReceiveCameraRig';

// ============================================================
// ReceiveScene3D — 功能二 3D 接發球站位場景
//   場地            → 重用 defense/scene/Court（與 store 無耦合）
//   球網（固定 2.30）→ ReceiveNet
//   六名球員         → ReceivePlayers（換輪轉平滑移動）
//   合法框 / 插上路徑 → ReceiveOverlays
//   相機（四視角）   → ReceiveCameraRig（讀 useReceiveStore）
// ============================================================

export function ReceiveScene3D() {
  const controlsRef: ControlsRef = useRef(null);

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: INITIAL_CAMERA_POSITION, fov: 50, near: 0.1, far: 120 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      shadows={false}
      style={{ width: '100%', height: '100%', background: '#0a1628', touchAction: 'none' }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[6, 14, 5]} intensity={1.6} />

      <Court />
      <ReceiveNet />
      <ReceiveOverlays />
      <ReceivePlayers controlsRef={controlsRef} />
      <ReceiveCameraRig controlsRef={controlsRef} />
    </Canvas>
  );
}
