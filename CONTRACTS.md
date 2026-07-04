# 開發合約 — 排球戰術教練台

> 本文件是後續工程師的唯一真相來源。所有設計決策已在此確定，
> 除非透過 PR 審核並更新本文件，否則不得變更。

---

## 專案技術棧

| 項目 | 版本 / 選擇 |
|------|------------|
| React | 19.x |
| TypeScript | 5.x（strict 模式） |
| Vite | 6.x，base: `/volleyball-tactics/` |
| Three.js | @react-three/fiber + @react-three/drei |
| 狀態管理 | zustand |
| 部署 | GitHub Pages（repo: `volleyball-tactics`） |
| UI 語言 | 全繁體中文 |

---

## 座標系統

```
場地 18m × 9m，網子在 x = 0。
我方半場：x ∈ [0, 9]（靠近網子 x 較小，底線 x = 9）
對方半場：x ∈ [-9, 0]
z 軸：∈ [0, 9]，z = 0 是左邊線（從我方看），z = 9 是右邊線
Three.js Y 軸：向上（高度）
單位：公尺
```

### 我方六號位預設站位（輪轉零位）

| 號位 | 中文名 | x | z |
|------|--------|---|---|
| 1    | 右後   | 7.0 | 7.0 |
| 2    | 右前   | 1.5 | 7.0 |
| 3    | 中前   | 1.5 | 4.5 |
| 4    | 左前   | 1.5 | 2.0 |
| 5    | 左後   | 7.0 | 2.0 |
| 6    | 中後   | 7.0 | 4.5 |

---

## TypeScript 核心型別（`src/types.ts`）

```ts
export type Vec2 = { x: number; z: number };
export type Role = 'S' | 'OH1' | 'OH2' | 'MB1' | 'MB2' | 'OP' | 'L';
export type DefenseSystem = 'perimeter' | 'rotation';
export type LabelMode = 'number' | 'role';
export type CameraView = 'top' | 'baseline' | 'side' | 'coach';

export interface PlayerState {
  id: number;            // 1–6 號位
  role: Role;
  pos: Vec2;
  isBlocking: boolean;
}

export interface ZonePolygon {
  playerId: number;
  points: Vec2[];
}

export interface Attacker {
  id: string;
  pos: Vec2;
  isActive: boolean;
}

export interface DefenseResult {
  players: PlayerState[];
  zones: ZonePolygon[];
  blockShadow: Vec2[];
  attackFan: {
    origin: Vec2;
    leftDir: Vec2;
    rightDir: Vec2;
    angleDeg: number;
  };
}

export interface DefenseOptions {
  system: DefenseSystem;
  middleBlockMode: 'single' | 'double';
  fanAngleOverride: number | null;   // null = 自動
  netHeight: number;                  // 2.24 | 2.30 | 2.43
}

export interface CustomScenario {
  id: string;
  name: string;
  attackPos: Vec2;
  system: DefenseSystem;
  players: PlayerState[];
  zones: ZonePolygon[];
  createdAt: number;
}
```

---

## `src/logic/defense.ts` 合約

### 函式簽名

```ts
export function computeDefense(
  attackPos: Vec2,
  opts: DefenseOptions,
  customScenarios: CustomScenario[],
): DefenseResult
```

**純函式、無副作用。** 每次拖曳每 frame 呼叫，需高效。

### 攔網規則（完整邏輯待實作）

| 攻擊來源 | 主攔 | 補位 | 條件 |
|----------|------|------|------|
| 對方4號位（z > 6） | 我方2號位 | 我方3號位 | 雙人攔網 |
| 對方2號位（z < 3） | 我方4號位 | 我方3號位 | 雙人攔網 |
| 對方3號位快攻（z ≈ 4.5） | 我方3號位 | 我方2號位 | `middleBlockMode === 'double'` 才加2號位 |
| 後排攻擊（attackPos.x < -3） | 單人 | — | 根據z位置選2/3/4號位 |

### 扇形角度自動計算

- 靠邊線攻擊點（distFromCenter 大）→ 約 60°
- 中間攻擊點（z ≈ 4.5）→ 約 90°
- 線性插值：`angleDeg = 90 - (distFromCenter / 4.5) * 30`
- `fanAngleOverride !== null` 時直接使用覆蓋值

### 自訂情境內插

1. 過濾相同 `system` 的情境
2. 找距離 `attackPos` 最近的情境
3. 若距離 ≤ 4m → 距離加權內插球員座標（完整實作：多情境反距離加權）
4. 若距離 > 4m → 退回預設幾何計算

---

## 防守體系規則

### perimeter（邊線防守）
- 自由球員（L）替換**5號位**後排球員
- 後排三人呈弧形緊貼邊線與底線

### rotation（輪轉防守）
- 自由球員（L）站**6號位**中後
- 後排球員根據攻擊方向順時針或逆時針輪轉 1–2 公尺

---

## 3D 場景規格（`src/features/defense/Scene3D.tsx`）

### 球員模型
- 幾何：圓柱（radiusTop: 0.3, radiusBottom: 0.3, height: 1.8）+ 球體頭部（radius: 0.3）
- 我方球員顏色：`#1565C0`
- 對方攻擊手顏色：`#C62828`；持球攻擊者（isActive）：`#FF1744` + 點光圈（PointLight）
- 標籤：drei `<Html>` 或 `<Text>` Billboard，內容依 `labelMode` 顯示號位數字或角色縮寫

### 場地幾何
- 地板：PlaneGeometry 9×9（我方半場，綠色 `#2e5c1a`），對方半場（深紅 `#1a0a0a`）
- 邊線：LineSegments，白色
- 網子：BoxGeometry（x=0，高度依 netHeight），白色半透明

### 責任區塊
- ShapeGeometry 多邊形，六色半透明（opacity: 0.25）
- 顏色對應：`ZONE_COLORS` 陣列依球員 id-1 索引

### 攔網影子
- ShapeGeometry 多邊形，深灰半透明（`rgba(55,55,55,0.45)`）

### 攻擊扇形
- 線條（LineSegments）從攻擊點向我方場地延伸，黃色 `#FDD835`

### 拖曳互動
- Pointer Events（`onPointerDown`, `onPointerMove`, `onPointerUp`）
- 攻擊手拖曳範圍限制：`x ∈ [-9, -0.1]`（對方半場），`z ∈ [0, 9]`
- 拖曳中每 frame 呼叫 `store.moveAttacker(id, pos)`

### 快速視角（`CameraView`）

| 視角 | camera.position | camera.lookAt |
|------|-----------------|---------------|
| `top` | [4.5, 20, 4.5] | [4.5, 0, 4.5] |
| `baseline` | [4.5, 2, 16] | [4.5, 1.2, 0] |
| `side` | [14, 4, 4.5] | [0, 1, 4.5] |
| `coach` | [4.5, 12, 18] | [4.5, 0, 4.5] |

---

## 控制面板規格（`src/features/defense/ControlPanel.tsx`）

### 響應式佈局
- 寬螢幕（> 768px）：右側固定欄，寬 240px
- 窄螢幕（≤ 768px）：底部面板，可收合（`useState<boolean>(true)`）

### 控制項清單
1. 防守體系：邊線防守 / 輪轉防守（ToggleButton）
2. 攔中模式：單人攔網 / 雙人攔網（ToggleButton）
3. 網高：2.24m（女子）/ 2.30m（青年）/ 2.43m（男子）（RadioGroup）
4. 扇形角度：Slider（0–180°），null 時顯示「自動」
5. 標籤模式：號位 / 角色（ToggleButton）
6. 快速視角：上帝 / 底線 / 側面 / 教練（四個 Button）
7. 情境管理：儲存目前佔位（輸入名稱）、刪除、匯出 JSON、匯入 JSON

---

## Zustand Store 結構（`src/store/useTacticsStore.ts`）

### 狀態欄位

```ts
attackers: Attacker[]            // 攻擊手清單（預設3個）
activeAttackerId: string          // 目前拖曳的攻擊手 id
system: DefenseSystem             // 防守體系
middleBlockMode: 'single'|'double'
fanAngleOverride: number | null
netHeight: number
labelMode: LabelMode
cameraView: CameraView
editMode: boolean                 // 教練手動調整模式
editOverridePositions: Record<number, Vec2>  // 編輯模式下球員座標覆蓋
scenarios: CustomScenario[]
defenseResult: DefenseResult | null  // 由 recompute() 更新
```

### 重要約定
- `recompute()` 在每次影響防守結果的狀態變更後立即呼叫
- `defenseResult` 是衍生狀態，不應直接 `set`，只能透過 `recompute()` 更新
- 情境變更後同步呼叫 `saveScenarios()` 持久化到 localStorage

---

## localStorage

| Key | 型別 | 說明 |
|-----|------|------|
| `volleyball-tactics-scenarios` | `CustomScenario[]` JSON | 自訂情境清單 |

---

## 配色規格

| 用途 | 色碼 |
|------|------|
| 我方球員 | `#1565C0` |
| 對方球員 | `#C62828` |
| 持球攻擊者（active） | `#FF1744` |
| 攔網影子 | `rgba(55,55,55,0.45)` |
| 責任區塊 1（藍） | `#1E88E5` |
| 責任區塊 2（青） | `#00ACC1` |
| 責任區塊 3（綠） | `#43A047` |
| 責任區塊 4（黃） | `#FDD835` |
| 責任區塊 5（紫） | `#8E24AA` |
| 責任區塊 6（橙） | `#FB8C00` |
| 場地背景 | `#0a1628` |
| 面板背景 | `#0d1b2a` |
| 主色調（按鈕active） | `#1565C0` |
| 文字 accent | `#90caf9` |

---

## 字體規格

- 本文：`"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif`
- 分頁按鈕：`font-size: 1.05rem, font-weight: 700`
- 面板標題：`font-size: 1.3rem`
- 投影可讀最小字體：`0.85rem`（控制面板 label）

---

## 目錄結構

```
src/
  types.ts                  共用型別（唯一真相）
  index.css                 全域 reset
  main.tsx                  React 入口
  App.tsx                   三分頁骨架
  logic/
    court.ts                場地常數、號位座標、配色常數
    defense.ts              computeDefense() 純函式
    scenarios.ts            情境 CRUD + localStorage
  store/
    useTacticsStore.ts      zustand store
  features/
    defense/
      DefenseTab.tsx        功能一容器
      Scene3D.tsx           @react-three/fiber 場景
      ControlPanel.tsx      控制面板
  components/               未來共用元件（目前空）
```

---

## 已知待辦（邏輯工程師）

- [ ] `defense.ts`：實作完整 Voronoi 責任區塊（取代簡化正方形 stub）
- [ ] `defense.ts`：實作多情境反距離加權內插
- [ ] `Scene3D.tsx`：實作低多邊形球員模型 + Billboard 標籤
- [ ] `Scene3D.tsx`：實作 Pointer Events 拖曳（含邊界夾值）
- [ ] `Scene3D.tsx`：實作四種快速視角切換
- [ ] `Scene3D.tsx`：實作責任區塊多邊形渲染
- [ ] `Scene3D.tsx`：實作攔網影子渲染
- [ ] `Scene3D.tsx`：實作攻擊扇形線條渲染
- [ ] `ControlPanel.tsx`：實作響應式收合底部面板（窄螢幕）
- [ ] `ControlPanel.tsx`：實作情境儲存 UI（輸入名稱對話框）
- [ ] `ControlPanel.tsx`：實作匯出 / 匯入 JSON 按鈕
- [ ] `App.tsx`：實作「接發球站位」功能（Tab 2）
- [ ] `App.tsx`：實作「舉球參數」功能（Tab 3）
