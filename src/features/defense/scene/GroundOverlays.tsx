import { useMemo } from 'react';
import { useTacticsStore } from '../../../store/useTacticsStore';
import type { DefenseResult, Vec2, ZonePolygon } from '../../../types';
import { fanMaterial, blockShadowMaterial, zoneMaterials } from './assets';
import { useGroundPolygonGeometry } from './utils';

// ============================================================
// GroundOverlays — 地面圖形（即時跟隨 defenseResult 更新）
//   1. 攻擊扇形（半透明紅，y=0.02）
//   2. 六名球員責任區塊（六色，y=0.03）
//   3. 攔網影子（深灰，y=0.05，畫在區塊之上）
// 各層 y 遞增 + renderOrder 固定疊放順序，depthWrite 皆關閉
// ============================================================

const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];
const NO_RAYCAST = () => null;

const FAN_Y = 0.02;
const ZONE_Y = 0.035;
const SHADOW_Y = 0.05;

/** 攻擊扇形半徑：從對方攻擊點延伸過網深入我方場地 */
const FAN_RADIUS = 12;
const FAN_ARC_SEGMENTS = 24;

function AttackFan({ fan }: { fan: DefenseResult['attackFan'] }) {
  const points = useMemo<Vec2[]>(() => {
    const { origin, leftDir, rightDir } = fan;
    const angleLeft = Math.atan2(leftDir.z, leftDir.x);
    const angleRight = Math.atan2(rightDir.z, rightDir.x);
    const pts: Vec2[] = [{ x: origin.x, z: origin.z }];
    for (let i = 0; i <= FAN_ARC_SEGMENTS; i++) {
      const a = angleLeft + ((angleRight - angleLeft) * i) / FAN_ARC_SEGMENTS;
      pts.push({
        x: origin.x + FAN_RADIUS * Math.cos(a),
        z: origin.z + FAN_RADIUS * Math.sin(a),
      });
    }
    return pts;
  }, [fan]);

  const geometry = useGroundPolygonGeometry(points);
  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      material={fanMaterial}
      rotation={FLAT}
      position={[0, FAN_Y, 0]}
      renderOrder={1}
      raycast={NO_RAYCAST}
    />
  );
}

function Zone({ zone }: { zone: ZonePolygon }) {
  const geometry = useGroundPolygonGeometry(zone.points);
  if (!geometry) return null;

  const material = zoneMaterials[(zone.playerId - 1) % zoneMaterials.length];
  return (
    <mesh
      geometry={geometry}
      material={material}
      rotation={FLAT}
      position={[0, ZONE_Y, 0]}
      renderOrder={2}
      raycast={NO_RAYCAST}
    />
  );
}

function BlockShadow({ points }: { points: Vec2[] }) {
  const geometry = useGroundPolygonGeometry(points.length >= 3 ? points : null);
  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      material={blockShadowMaterial}
      rotation={FLAT}
      position={[0, SHADOW_Y, 0]}
      renderOrder={3}
      raycast={NO_RAYCAST}
    />
  );
}

export function GroundOverlays() {
  const defenseResult = useTacticsStore(s => s.defenseResult);
  if (!defenseResult) return null;

  return (
    <group>
      <AttackFan fan={defenseResult.attackFan} />
      {defenseResult.zones.map(zone => (
        <Zone key={zone.playerId} zone={zone} />
      ))}
      <BlockShadow points={defenseResult.blockShadow} />
    </group>
  );
}
