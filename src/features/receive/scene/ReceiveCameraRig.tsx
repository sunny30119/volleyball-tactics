import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useReceiveStore } from '../../../store/useReceiveStore';
import type { CameraView } from '../../../types';

// ============================================================
// ReceiveCameraRig — 四種快速視角平滑過渡 + OrbitControls
// 讀 useReceiveStore（本功能獨立 store），仿功能一 CameraRig 寫法
// ============================================================

export type ControlsRef = { current: OrbitControlsImpl | null };

function dampFactor(tau: number, dt: number): number {
  return 1 - Math.exp(-dt / tau);
}

interface CameraPreset {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

const PRESETS: Record<CameraView, CameraPreset> = {
  // 接發球講解主要用上帝視角
  top: {
    position: new THREE.Vector3(1.6, 21, 4.5),
    target: new THREE.Vector3(0, 0, 4.5),
  },
  baseline: {
    position: new THREE.Vector3(14.5, 3, 4.5),
    target: new THREE.Vector3(0, 1.5, 4.5),
  },
  side: {
    position: new THREE.Vector3(2.5, 8, 16.5),
    target: new THREE.Vector3(1, 0, 4.5),
  },
  coach: {
    position: new THREE.Vector3(13, 10, 12),
    target: new THREE.Vector3(1, 0, 4.5),
  },
};

// 接發球初始視角用上帝視角（俯視最利於講解站位）
export const INITIAL_CAMERA_POSITION: [number, number, number] = [1.6, 21, 4.5];
const INITIAL_TARGET = PRESETS.top.target;

const CAMERA_TAU = 0.35;
const ARRIVE_EPSILON = 0.03;

export function ReceiveCameraRig({ controlsRef }: { controlsRef: ControlsRef }) {
  const cameraView = useReceiveStore(s => s.cameraView);
  const cameraViewNonce = useReceiveStore(s => s.cameraViewNonce);
  const animatingRef = useRef(false);

  useEffect(() => {
    animatingRef.current = true;
  }, [cameraView, cameraViewNonce]);

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
