import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

// ============================================================
// Scene3D — 3D 場景 placeholder
// 完整實作待工程師依 CONTRACTS.md 開發：
//   - 低多邊形排球場地（18m × 9m）
//   - 六名我方球員（深藍圓柱+球體）
//   - 對方攻擊手（紅色，可拖曳，限對方半場）
//   - 責任區塊半透明多邊形
//   - 攔網影子多邊形
//   - 攻擊扇形
//   - Billboard 標籤（號位 or 角色）
//   - 快速視角切換（上帝/底線/側面/45度）
// ============================================================

export function Scene3D() {
  return (
    <Canvas
      camera={{ position: [4.5, 12, 18], fov: 50 }}
      style={{ width: '100%', height: '100%', background: '#1a2744' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />

      {/* 場地地板 placeholder */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4.5, 0, 4.5]}>
        <planeGeometry args={[9, 9]} />
        <meshStandardMaterial color="#2e5c1a" />
      </mesh>

      {/* 網子 placeholder */}
      <mesh position={[0, 1.2, 4.5]}>
        <boxGeometry args={[0.05, 2.43, 9]} />
        <meshStandardMaterial color="#ffffff" wireframe />
      </mesh>

      {/* 中心提示文字暫以白色方塊代替 */}
      <mesh position={[4.5, 0.05, 4.5]}>
        <boxGeometry args={[0.2, 0.1, 0.2]} />
        <meshStandardMaterial color="#ffcc00" />
      </mesh>

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        minDistance={5}
        maxDistance={30}
      />
    </Canvas>
  );
}
