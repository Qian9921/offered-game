import Phaser from 'phaser';

// StateSystem：玩家 8 项状态数值管理。
// 继承 EventEmitter，自身可 emit 事件；引擎共用模块，不写死剧情。
export class StateSystem extends Phaser.Events.EventEmitter {
  constructor() {
    super();

    // 初始值（写死）
    this.stats = {
      health: 80,
      energy: 100,
      san: 80,
      stress: 20,
      skill: 10,
      performance: 50,
      money: 0,
      passion: 70,
    };

    // 阈值预警用：记录上次是否已低于 20（仅 health/san/passion 三项）
    this._belowThreshold = {
      health: this.stats.health < 20,
      san: this.stats.san < 20,
      passion: this.stats.passion < 20,
    };
  }

  get(key) {
    return this.stats[key];
  }

  getAll() {
    return { ...this.stats };
  }

  set(key, value) {
    // money 不限上限，其余 clamp 在 0~100
    let newValue = value;
    if (key !== 'money') {
      newValue = Phaser.Math.Clamp(newValue, 0, 100);
    }
    this.stats[key] = newValue;

    this.emit('change', key, newValue);
    this._checkThreshold(key, newValue);

    return newValue;
  }

  change(key, delta) {
    // 在原值基础上加 delta，复用 set 的 clamp 逻辑
    return this.set(key, this.stats[key] + delta);
  }

  // 阈值预警：health/san/passion 从 >=20 跨到 <20 时触发，避免重复
  _checkThreshold(key, newValue) {
    const dangerKeys = ['health', 'san', 'passion'];
    if (!dangerKeys.includes(key)) return;

    const wasBelow = this._belowThreshold[key];
    const isBelow = newValue < 20;

    if (!wasBelow && isBelow) {
      this.emit('threshold', { key, value: newValue });
    }
    this._belowThreshold[key] = isBelow;
  }
}
