import { describe, it, expect, beforeEach } from 'vitest';

// node 測試環境無 localStorage，提供最小記憶體版 shim（僅本測試檔需要）。
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string): string | null {
    return this.store.has(k) ? this.store.get(k)! : null;
  }
  setItem(k: string, v: string): void {
    this.store.set(k, String(v));
  }
  removeItem(k: string): void {
    this.store.delete(k);
  }
  clear(): void {
    this.store.clear();
  }
}
(globalThis as unknown as { localStorage: Storage }).localStorage =
  new MemoryStorage() as unknown as Storage;

import { exportAllJSON, importAllJSON, BACKUP_VERSION, backupFileName } from './backup';
import { saveScenarios } from './scenarios';
import { persistSlots } from './receiveSlots';
import type { CustomScenario } from '../types';
import type { ReceiveSlot } from './receiveSlots';

function makeDefenseSlot(id: string): CustomScenario {
  return {
    id,
    name: `防守${id}`,
    attackPos: { x: -2, z: 7 },
    system: 'perimeter',
    players: [1, 2, 3, 4, 5, 6].map(pid => ({
      id: pid,
      role: 'S' as const,
      pos: { x: pid, z: pid },
      isBlocking: false,
    })),
    zones: [],
    createdAt: 123,
  };
}

function makeReceiveSlot(id: string): ReceiveSlot {
  const positions: Record<number, { x: number; z: number }> = {};
  for (const p of [1, 2, 3, 4, 5, 6]) positions[p] = { x: p, z: p };
  return { id, name: `接發${id}`, rotation: 1, positions, createdAt: 456 };
}

describe('backup — 全域匯出/匯入', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('exportAllJSON 產生含版本與兩組槽的結構', () => {
    saveScenarios([makeDefenseSlot('d1'), ...Array(9).fill(null)]);
    persistSlots([makeReceiveSlot('r1'), ...Array(9).fill(null)]);

    const json = exportAllJSON();
    const obj = JSON.parse(json);
    expect(obj.version).toBe(BACKUP_VERSION);
    expect(typeof obj.exportedAt).toBe('string');
    expect(obj.defenseSlots).toHaveLength(10);
    expect(obj.receiveSlots).toHaveLength(10);
    expect(obj.defenseSlots[0].id).toBe('d1');
    expect(obj.receiveSlots[0].id).toBe('r1');
  });

  it('importAllJSON 還原兩組槽並回傳筆數', () => {
    const payload = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      defenseSlots: [makeDefenseSlot('d1'), makeDefenseSlot('d2'), ...Array(8).fill(null)],
      receiveSlots: [makeReceiveSlot('r1'), ...Array(9).fill(null)],
    };
    const res = importAllJSON(JSON.stringify(payload));
    expect(res.ok).toBe(true);
    expect(res.defenseCount).toBe(2);
    expect(res.receiveCount).toBe(1);
    // 已寫回 localStorage
    expect(localStorage.getItem('volleyball-tactics-scenarios')).toContain('d1');
    expect(localStorage.getItem('volleyball-receive-slots')).toContain('r1');
  });

  it('export → import 往返一致', () => {
    saveScenarios([makeDefenseSlot('dx'), ...Array(9).fill(null)]);
    persistSlots([makeReceiveSlot('rx'), makeReceiveSlot('ry'), ...Array(8).fill(null)]);
    const json = exportAllJSON();
    localStorage.clear();
    const res = importAllJSON(json);
    expect(res.ok).toBe(true);
    expect(res.defenseCount).toBe(1);
    expect(res.receiveCount).toBe(2);
  });

  it('壞 JSON / 非物件 回傳錯誤', () => {
    expect(importAllJSON('not json').ok).toBe(false);
    expect(importAllJSON('[]').ok).toBe(false);
    expect(importAllJSON('{"foo":1}').ok).toBe(false);
  });

  it('缺其中一項時該項視為全空、另一項仍還原', () => {
    const res = importAllJSON(
      JSON.stringify({ defenseSlots: [makeDefenseSlot('d1'), ...Array(9).fill(null)] }),
    );
    expect(res.ok).toBe(true);
    expect(res.defenseCount).toBe(1);
    expect(res.receiveCount).toBe(0);
  });

  it('backupFileName 格式為 排球戰術備份_YYYYMMDD.json', () => {
    const name = backupFileName(new Date(2026, 6, 5)); // 2026-07-05
    expect(name).toBe('排球戰術備份_20260705.json');
  });
});
