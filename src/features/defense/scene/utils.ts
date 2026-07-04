import * as THREE from 'three';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Vec2 } from '../../../types';

// ============================================================
// 3D 場景共用工具
// ============================================================

/** OrbitControls ref 型別（由 Scene3D 建立，CameraRig / 拖曳共用） */
export type ControlsRef = { current: OrbitControlsImpl | null };

/** 指數平滑係數（時間常數 tau 秒） */
export function dampFactor(tau: number, dt: number): number {
  return 1 - Math.exp(-dt / tau);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** 射線與地面 y=0 平面的交點 */
export function rayToGround(ray: THREE.Ray): Vec2 | null {
  if (Math.abs(ray.direction.y) < 1e-8) return null;
  const t = -ray.origin.y / ray.direction.y;
  if (t < 0) return null;
  return {
    x: ray.origin.x + ray.direction.x * t,
    z: ray.origin.z + ray.direction.z * t,
  };
}

/**
 * 把地面多邊形（x,z 座標）轉成 ShapeGeometry。
 * Shape 位於 XY 平面；配合 mesh rotation=[-PI/2,0,0]，
 * 局部 (x, y) 會映射到世界 (x, -y)，因此以 -z 當作 shape 的 y。
 */
export function useGroundPolygonGeometry(points: Vec2[] | null): THREE.ShapeGeometry | null {
  const geometry = useMemo(() => {
    if (!points || points.length < 3) return null;
    const shape = new THREE.Shape();
    shape.moveTo(points[0].x, -points[0].z);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, -points[i].z);
    }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [points]);

  // 頂點變動會建立新 geometry，舊的必須釋放避免 GPU 記憶體洩漏
  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  return geometry;
}

interface GroundDragOptions {
  controlsRef: ControlsRef;
  /** 拖曳中的每次 pointermove（含 pointerdown 當下）都會呼叫 */
  onDrag: (p: Vec2) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * 地面拖曳 hook：
 * - pointerdown 後改用 window 層級的 pointermove / pointerup 監聽，
 *   手指快速移出模型或畫布也不會中斷拖曳（平板友善）
 * - 拖曳期間停用 OrbitControls
 * - 以 pointerId 過濾，支援多指同時拖曳不同物件
 */
export function useGroundDrag(options: GroundDragOptions): {
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  draggingRef: { readonly current: boolean };
} {
  const { camera, gl } = useThree();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const draggingRef = useRef(false);
  const teardownRef = useRef<(() => void) | null>(null);

  // 元件卸載時保證清掉 window 監聽
  useEffect(() => {
    return () => {
      teardownRef.current?.();
    };
  }, []);

  const onPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (draggingRef.current) return;
      e.stopPropagation();

      draggingRef.current = true;
      const controls = optionsRef.current.controlsRef.current;
      if (controls) controls.enabled = false;
      optionsRef.current.onStart?.();

      const pointerId = e.pointerId;
      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();

      const emitDragAt = (clientX: number, clientY: number) => {
        const rect = gl.domElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        ndc.set(
          ((clientX - rect.left) / rect.width) * 2 - 1,
          -((clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(ndc, camera);
        const p = rayToGround(raycaster.ray);
        if (p) optionsRef.current.onDrag(p);
      };

      const handleMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        emitDragAt(ev.clientX, ev.clientY);
      };

      const handleUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        teardown();
      };

      const teardown = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('pointercancel', handleUp);
        teardownRef.current = null;
        draggingRef.current = false;
        const c = optionsRef.current.controlsRef.current;
        if (c) c.enabled = true;
        optionsRef.current.onEnd?.();
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleUp);
      teardownRef.current = teardown;

      // pointerdown 當下即回報一次（點一下也會把攻擊點吸到手指位置）
      const ground = rayToGround(e.ray);
      if (ground) optionsRef.current.onDrag(ground);
    },
    [camera, gl],
  );

  return { onPointerDown, draggingRef };
}
