import { Html } from '@react-three/drei';

// ============================================================
// PlayerLabel — 球員頭上標籤
// 使用 drei <Html>（而非 <Text>）：drei Text 預設字型不含中文，
// 角色名（舉球 / 主攻 / 攔中…）需要 CSS 字型堆疊才能正確顯示。
// distanceFactor 讓標籤隨距離縮放，投影布幕上仍可讀。
// ============================================================

interface PlayerLabelProps {
  text: string;
  y?: number;
  color?: string;
  fontSize?: number;
}

export function PlayerLabel({ text, y = 2.15, color = '#ffffff', fontSize = 30 }: PlayerLabelProps) {
  return (
    <Html
      position={[0, y, 0]}
      center
      distanceFactor={10}
      zIndexRange={[40, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          fontFamily: '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif',
          fontSize,
          fontWeight: 800,
          lineHeight: 1,
          color,
          WebkitTextStroke: '1px rgba(0,0,0,0.85)',
          textShadow:
            '0 0 6px rgba(0,0,0,0.95), 0 2px 4px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,1)',
        }}
      >
        {text}
      </div>
    </Html>
  );
}
