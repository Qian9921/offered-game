// SaveSystem：localStorage 存读档。纯浏览器存储，不依赖 Phaser。
// 支持 3 个存档槽位（wdwtb_save_1/2/3），向后兼容旧单槽 wdwtb_save。
//
// 存档结构（version 2，合并写保留旧字段）：
//   {
//     version: 2,
//     slot: 1,                        // 所在槽位号(1-3)
//     career: 'programmer',           // 当前职业
//     act: 3,                         // 当前幕次
//     subRole: 'dev' | null,          // 细分岗位
//     deep: true,                     // 旗舰/轻量
//     stats: { health, energy, ... }, // 8 项数值
//     updatedAt: 1234567890,          // 存档时间戳
//     ... (quests/choiceLog/thought/daySystem/segment/project/story/relations)
//   }
// 捏人画像单独存 wdwtb_profile（OpeningScene 维护，不与此处耦合）。

const SLOT_KEYS = ['wdwtb_save_1', 'wdwtb_save_2', 'wdwtb_save_3'];
const LEGACY_KEY = 'wdwtb_save';
const SLOT_COUNT = 3;

export class SaveSystem {
  // ===== 槽位级 API =====

  /** 存档到指定槽位（1-3），合并写保留旧字段。失败返回 false。 */
  static saveSlot(n, data) {
    try {
      const key = SLOT_KEYS[n - 1];
      if (!key) return false;
      const prev = SaveSystem.loadSlot(n) || {};
      const payload = { ...prev, ...data, version: 2, slot: n, updatedAt: Date.now() };
      localStorage.setItem(key, JSON.stringify(payload));
      return true;
    } catch (e) {
      return false;
    }
  }

  /** 读指定槽位。无档或出错返回 null。 */
  static loadSlot(n) {
    try {
      const key = SLOT_KEYS[n - 1];
      if (!key) return null;
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  /** 删除指定槽位。 */
  static clearSlot(n) {
    try {
      const key = SLOT_KEYS[n - 1];
      if (!key) return false;
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  }

  /** 指定槽位是否有存档。 */
  static hasSlot(n) {
    try {
      const key = SLOT_KEYS[n - 1];
      if (!key) return false;
      return localStorage.getItem(key) !== null;
    } catch (e) {
      return false;
    }
  }

  /** 槽位总数。 */
  static get slotCount() { return SLOT_COUNT; }

  /**
   * 列出所有槽位摘要（供标题存档面板显示）。
   * @returns {Array<{ slot:number, exists:boolean, career:?string, act:?number, day:?number, updatedAt:?number }>}
   */
  static listSlots() {
    SaveSystem._migrateLegacy();
    const out = [];
    for (let i = 1; i <= SLOT_COUNT; i++) {
      const s = SaveSystem.loadSlot(i);
      if (s) {
        out.push({
          slot: i,
          exists: true,
          career: s.career || null,
          subRole: s.subRole || null,
          act: Number.isFinite(s.act) ? s.act : null,
          day: s.daySystem ? s.daySystem.day : (s.day || null),
          updatedAt: s.updatedAt || null,
        });
      } else {
        out.push({ slot: i, exists: false });
      }
    }
    return out;
  }

  /**
   * 找最近更新的有存档的槽位号（标题"继续游戏"用）。
   * @returns {number|null} 槽位号(1-3)或 null(无任何存档)
   */
  static latestSlot() {
    SaveSystem._migrateLegacy();
    let best = null, bestTime = 0;
    for (let i = 1; i <= SLOT_COUNT; i++) {
      const s = SaveSystem.loadSlot(i);
      if (s && (s.updatedAt || 0) > bestTime) {
        bestTime = s.updatedAt || 0;
        best = i;
      }
    }
    return best;
  }

  /**
   * 找一个空槽位（开新游戏用）。优先槽1，全满返回 null。
   * @returns {number|null}
   */
  static firstEmptySlot() {
    SaveSystem._migrateLegacy();
    for (let i = 1; i <= SLOT_COUNT; i++) {
      if (!SaveSystem.hasSlot(i)) return i;
    }
    return null;
  }

  // ===== 旧单槽 API（向后兼容，代理到槽 1）=====

  /** 便捷存档：封装常用字段（career/act/stats）。其余字段可选经 extra 合并。 @deprecated 用 saveSlot */
  static saveProgress({ career, act, stats, extra }) {
    return SaveSystem.saveSlot(1, { career, act, stats, ...(extra || {}) });
  }

  /** @deprecated 用 saveSlot(1, data) */
  static save(data) {
    return SaveSystem.saveSlot(1, data);
  }

  /** @deprecated 用 loadSlot(1) */
  static load() {
    SaveSystem._migrateLegacy();
    return SaveSystem.loadSlot(1);
  }

  /** @deprecated 用 clearSlot(1) */
  static clear() {
    return SaveSystem.clearSlot(1);
  }

  /** @deprecated 用 hasSlot(1) */
  static has() {
    SaveSystem._migrateLegacy();
    return SaveSystem.hasSlot(1);
  }

  // ===== 内部：旧单槽迁移 =====

  /** 一次性迁移：旧 wdwtb_save → wdwtb_save_1（如果槽1为空且旧档存在）。幂等。 */
  static _migrateLegacy() {
    try {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy === null) return;
      const slot1 = localStorage.getItem(SLOT_KEYS[0]);
      if (slot1 === null) {
        const data = JSON.parse(legacy);
        data.slot = 1;
        data.version = data.version || 2;
        localStorage.setItem(SLOT_KEYS[0], JSON.stringify(data));
      }
      localStorage.removeItem(LEGACY_KEY);
    } catch (e) {
      // 迁移失败不影响游戏
    }
  }
}
