import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useReceiveStore } from '../../../store/useReceiveStore';
import { getLegalZones, getSetterPath, type LegalZone } from '../../../logic/receive';
import { COLOR_SETTER } from './assets';
import {
  legalZoneFillMaterial,
  legalZoneLineMaterial,
} from './assets';

// ============================================================
// ReceiveOverlays — 地面圖形
//  - 合法站位範圍框（showLegalZones 開時）：半透明填色 + 邊線
//  - 舉球員插上虛線箭頭（後排輪轉才顯示）
// 座標→3D：地面 y≈0.01，矩形以 x/z 直接建 plane
// ============================================================

const FILL_Y = 0.012;
const LINE_Y = 0.02;
const PATH_Y = 0.03;

/** 由 LegalZone 建一個地面矩形 plane 幾何（置中在 mesh position） */
function LegalZoneBox({ zone }: { zone: LegalZone }) {
  const w = Math.max(zone.max.x - zone.min.x, 0.001); // x 方向
  const d = Math.max(zone.max.z - zone.min.z, 0.001); // z 方向
  const cx = (zone.min.x + zone.max.x) / 2;
  const cz = (zone.min.z + zone.max.z) / 2;

  const fillGeom = useMemo(() => new THREE.PlaneGeometry(w, d), [w, d]);
  const lineGeom = useMemo(() => {
    const hx = w / 2;
    const hz = d / 2;
    // 邊框：在 XZ 平面（y=0），用 4 條邊
    const v = [
      -hx, 0, -hz, hx, 0, -hz,
      hx, 0, -hz, hx, 0, hz,
      hx, 0, hz, -hx, 0, hz,
      -hx, 0, hz, -hx, 0, -hz,
    ];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    return g;
  }, [w, d]);

  useEffect(() => {
    return () => {
      fillGeom.dispose();
      lineGeom.dispose();
    };
  }, [fillGeom, lineGeom]);

  return (
    <group>
      <mesh
        geometry={fillGeom}
        material={legalZoneFillMaterial}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[cx, FILL_Y, cz]}
      />
      <lineSegments
        geometry={lineGeom}
        material={legalZoneLineMaterial}
        position={[cx, LINE_Y, cz]}
      />
    </group>
  );
}

function SetterPath() {
  const rotation = useReceiveStore(s => s.rotation);
  const path = useMemo(() => getSetterPath(rotation), [rotation]);

  const points = useMemo<[number, number, number][] | null>(() => {
    if (!path) return null;
    const { from, to } = path;
    return [
      [from.x, PATH_Y, from.z],
      [to.x, PATH_Y, to.z],
    ];
  }, [path]);

  const arrowPoints = useMemo<[number, number, number][] | null>(() => {
    if (!path) return null;
    const { from, to } = path;
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len;
    const uz = dz / len;
    const a = 0.5;      // 箭翼長
    const spread = 0.32; // 箭翼張開
    const b1x = to.x - ux * a - uz * spread;
    const b1z = to.z - uz * a + ux * spread;
    const b2x = to.x - ux * a + uz * spread;
    const b2z = to.z - uz * a - ux * spread;
    return [
      [b1x, PATH_Y, b1z],
      [to.x, PATH_Y, to.z],
      [b2x, PATH_Y, b2z],
    ];
  }, [path]);

  if (!points || !arrowPoints) return null;

  return (
    <group>
      <Line points={points} color={COLOR_SETTER} lineWidth={3} dashed dashSize={0.35} gapSize={0.25} />
      <Line points={arrowPoints} color={COLOR_SETTER} lineWidth={3} />
    </group>
  );
}

export function ReceiveOverlays() {
  const rotation = useReceiveStore(s => s.rotation);
  const showLegalZones = useReceiveStore(s => s.showLegalZones);

  const zones = useMemo(() => getLegalZones(rotation), [rotation]);

  return (
    <>
      {showLegalZones && zones.map(z => <LegalZoneBox key={z.positionNo} zone={z} />)}
      <SetterPath />
    </>
  );
}
