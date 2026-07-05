import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useSetplayStore } from '../../../store/useSetplayStore';
import type { CameraView } from '../../../types';

// ============================================================
// SetplayCameraRig — 四種快速視角平滑過渡 + OrbitControls
//   仿 ReceiveCameraRig，讀 useSetplayStore。
//   top 用近俯視（網在畫面上方、我方半場在下方，配合鏡像）。
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
  top: {
    position: new THREE.Vector3(6, 18, 4.5),
    target: new THREE.Vector3(3.5, 0, 4.5),
  },
  baseline: {
    position: new THREE.Vector3(14.5, 3, 4.5),
    target: new THREE.Vector3(0, 1.5, 4.5),
  },
  side: {
    position: new THREE.Vector3(2.5, 8, 16.5),
    target: new THREE.Vector3(1, 1.2, 4.5),
  },
  coach: {
    position: new THREE.Vector3(13, 10, 12),
    target: new THREE.Vector3(1, 1, 4.5),
  },
};

// 配球分頁初始用教練 45° 視角（最利於同時看球飛越網與落點）
export const INITIAL_CAMERA_POSITION: [number, number, number] = [13, 10, 12];
const INITIAL_TARGET = PRESETS.coach.target;

const CAMERA_TAU = 0.35;
const ARRIVE_EPSILON = 0.03;

export function SetplayCameraRig({ controlsRef }: { controlsRef: ControlsRef }) {
  const cameraView = useSetplayStore(s => s.cameraView);
  const cameraViewNonce = useSetplayStore(s => s.cameraViewNonce);
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
