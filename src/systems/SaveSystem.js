// SaveSystem：localStorage 存读档。纯浏览器存储，不依赖 Phaser。
const SAVE_KEY = 'wdwtb_save';

export class SaveSystem {
  // 存档：JSON.stringify 后写入 localStorage；失败返回 false，不抛错
  static save(data) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  // 读档：返回解析后的对象；无存档或出错返回 null
  static load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  // 删除存档
  static clear() {
    try {
      localStorage.removeItem(SAVE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  // 是否存在存档
  static has() {
    try {
      return localStorage.getItem(SAVE_KEY) !== null;
    } catch (e) {
      return false;
    }
  }
}
