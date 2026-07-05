import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useTacticsStore } from '../../../store/useTacticsStore';
import type { CameraView } from '../../../types';
import { dampFactor } from './utils';
import type { ControlsRef } from './utils';

// ============================================================
// CameraRig — OrbitControls + 四種快速視角平滑過渡
// - store.cameraView（含 nonce，重按同一顆按鈕也會觸發）變更後
//   在 useFrame 中 damp 相機位置與 controls.target 到預設點
// - 使用者手動開始旋轉（controls 'start'）即取消動畫
// - polar angle 限制不低於地面；支援觸控雙指縮放平移
// ============================================================

interface CameraPreset {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

// 我方半場中心約 (4.5, 0, 4.5)，整場中心 (0, 0, 4.5)
const PRESETS: Record<CameraView, CameraPreset> = {
  // 近俯視（講解佔位）：網在畫面上方、我方半場在下方。
  // 配合呈現層鏡像 worldZ=9−z，此視角下 screen-up≈−X（網在上）、
  // screen-right=−Z，使前排近網左→右＝4-3-2、後排左→右＝5-6-1。
  // 不用純正上方（避免 up 向量退化），略偏一角。
  top: {
    position: new THREE.Vector3(6, 18, 4.5),
    target: new THREE.Vector3(3.5, 0, 4.5),
  },
  // 我方底線後方低視角看向網子
  baseline: {
    position: new THREE.Vector3(14.5, 3, 4.5),
    target: new THREE.Vector3(0, 1.5, 4.5),
  },
  // 側面
  side: {
    position: new THREE.Vector3(2.5, 8, 16.5),
    target: new THREE.Vector3(1, 0, 4.5),
  },
  // 45 度教練視角（預設）
  coach: {
    position: new THREE.Vector3(13, 10, 12),
    target: new THREE.Vector3(1, 0, 4.5),
  },
};

/** 初始相機位置（與 coach 預設一致，供 Canvas camera prop 使用） */
export const INITIAL_CAMERA_POSITION: [number, number, number] = [13, 10, 12];
const INITIAL_TARGET = PRESETS.coach.target;

const CAMERA_TAU = 0.35;
const ARRIVE_EPSILON = 0.03;

export function CameraRig({ controlsRef }: { controlsRef: ControlsRef }) {
  const cameraView = useTacticsStore(s => s.cameraView);
  const cameraViewNonce = useTacticsStore(s => s.cameraViewNonce);
  const animatingRef = useRef(false);

  // 視角切換（含重按同一顆按鈕）→ 啟動過渡動畫
  useEffect(() => {
    animatingRef.current = true;
  }, [cameraView, cameraViewNonce]);

  // 使用者手動操作相機 → 立即取消動畫，避免搶控制權
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const cancel = () => {
      animatingRef.current = false;
    };
    controls.addEventListener('start', cancel);
    return () => controls.removeEventListener('start', cancel);
  }, [controlsRef]);

  useFrame(({ camera }, rawDt) => {
    if (!animatingRef.current) return;
    const controls = controlsRef.current;
    if (!controls) return;

    const preset = PRESETS[cameraView];
    const dt = Math.min(rawDt, 0.1);
    const k = dampFactor(CAMERA_TAU, dt);

    camera.position.lerp(preset.position, k);
    controls.target.lerp(preset.target, k);
    controls.update();

    if (
      camera.position.distanceTo(preset.position) < ARRIVE_EPSILON &&
      controls.target.distanceTo(preset.target) < ARRIVE_EPSILON
    ) {
      camera.position.copy(preset.position);
      controls.target.copy(preset.target);
      controls.update();
      animatingRef.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan
      enableZoom
      minDistance={4}
      maxDistance={45}
      maxPolarAngle={Math.PI / 2 - 0.05}
      target={[INITIAL_TARGET.x, INITIAL_TARGET.y, INITIAL_TARGET.z]}
    />
  );
}
