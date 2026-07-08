import Phaser from 'phaser';

// StatusBarUI：左上角 8 项状态 HUD。
// 引擎共用 UI 模块，数值来自 StateSystem，监听 'change' 实时刷新。
const GROUPS = [
  {
    name: '生理组',
    stats: [
      { key: 'health', label: '健康' },
      { key: 'energy', label: '精力' },
    ],
  },
  {
    name: '心理组',
    stats: [
      { key: 'san', label: '心态' },
      { key: 'stress', label: '压力' },
    ],
  },
  {
    name: '职业组',
    stats: [
      { key: 'skill', label: '技能' },
      { key: 'performance', label: '绩效' },
      { key: 'money', label: '金钱' },
    ],
  },
  {
    name: '内在组',
    stats: [
      { key: 'passion', label: '热情' },
    ],
  },
];

const BAR_WIDTH = 120;
const BAR_HEIGHT = 10;
const BAR_X = 100; // 进度条左边缘 x
const FILL_COLOR = 0x4ec9b0; // 普通状态填充：青色
const BG_COLOR = 0x333344; // 进度条底条：深灰
const PASSION_COLOR = 0xff6b3d; // 热情填充：醒目橙红

export class StatusBarUI {
  constructor(scene, stateSystem) {
    this.scene = scene;
    this.state = stateSystem;
    this.rows = {};

    let y = 16;
    for (const group of GROUPS) {
      // 组标题
      this.scene.add.text(16, y, group.name, {
        fontSize: '12px',
        color: '#6a6a7a',
      }).setScrollFactor(0).setDepth(9998);
      y += 18;

      for (const s of group.stats) {
        const isPassion = s.key === 'passion';
        const value = stateSystem.get(s.key);

        // 文字标签：中文名 + 数值
        const text = this.scene.add.text(16, y, `${s.label} ${value}`, {
          fontSize: isPassion ? '16px' : '14px',
          color: '#e6e6e6',
          fontStyle: isPassion ? 'bold' : 'normal',
        }).setScrollFactor(0).setDepth(9998);

        // 进度条：底条 + 填充条，均左对齐（origin 0,0.5）
        const barCY = y + 8;
        this.scene.add.rectangle(BAR_X, barCY, BAR_WIDTH, BAR_HEIGHT, BG_COLOR).setOrigin(0, 0.5).setScrollFactor(0).setDepth(9998);
        const fillColor = isPassion ? PASSION_COLOR : FILL_COLOR;
        const fill = this.scene.add
          .rectangle(BAR_X, barCY, this._fillWidth(s.key, value), BAR_HEIGHT, fillColor)
          .setOrigin(0, 0.5).setScrollFactor(0).setDepth(9998);

        this.rows[s.key] = { text, fill, label: s.label };
        y += 20;
      }
      y += 10; // 组间空隙
    }

    // 监听数值变化，实时刷新对应行
    stateSystem.on('change', (key, value) => this._updateRow(key, value));
  }

  // 填充宽度：普通项 value/100，money value/1000 且不超过满格
  _fillWidth(key, value) {
    const ratio = key === 'money' ? value / 1000 : value / 100;
    return Phaser.Math.Clamp(ratio * BAR_WIDTH, 0, BAR_WIDTH);
  }

  _updateRow(key, value) {
    const row = this.rows[key];
    if (!row) return;
    row.text.setText(`${row.label} ${value}`);
    // setSize 改宽，origin (0,0.5) 保持左边缘固定，从左侧伸缩
    row.fill.setSize(this._fillWidth(key, value), BAR_HEIGHT);
  }
}
