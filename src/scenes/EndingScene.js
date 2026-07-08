import Phaser from 'phaser';

// EndingScene：结局"心之画像"报告 — 游戏高潮收尾，设计成适合截图的报告卡片。
// 最终报告由 AI/模板生成；内置默认示例先跑通。
const DEFAULT_PORTRAIT = {
  title: '你的心之画像',
  driveText: '你被一种"要把事做好"的内在标准推着走。不是外界要求，是你自己放不过那行代码。',
  drainText: '反复修改的需求和无休止的沟通，悄悄消耗了你的表达欲——你开始把话吞回去。',
  stressStyle: '你习惯内化压力，表面平静如水，内心却在编译自己。你的身体比你先知道累。',
  hiddenPattern: '你总是在别人开口前先自我怀疑。但那个说"你不行"的声音，其实从来不是你自己的——是环境塞给你的。',
  fitText: '程序员的逻辑思维与你的分析本能高度共振。你擅于在混沌中建立秩序，这是天赋。',
  oneLineForYou: '代码会跑，人也会累——但你不会一直累下去。',
};

export class EndingScene extends Phaser.Scene {
  constructor() {
    super('EndingScene');
  }

  init(data) {
    this.ending = data?.ending || 'backbone';
    this.stats = data?.stats || {
      health: 80, energy: 100, san: 80, stress: 20,
      skill: 10, performance: 50, money: 0, passion: 70,
    };
    this.portrait = data?.portrait || DEFAULT_PORTRAIT;
  }

  create() {
    this.cameras.main.setBackgroundColor('#15151f');
    const { width } = this.scale;
    const p = this.portrait;

    const ui = this.add.container(0, 0);

    // ---------- 卡片背景 ----------
    const cardW = 900, cardH = 500;
    const cardX = (width - cardW) / 2, cardY = 20;
    const innerL = cardX + 24, innerR = cardX + cardW - 24;
    const innerW = cardW - 48;

    ui.add(this.add.rectangle(width / 2, cardY + cardH / 2, cardW, cardH, 0x1e1e30));

    // 顶部金色装饰线
    ui.add(this.add.rectangle(width / 2, cardY, cardW, 3, 0xd4a353).setOrigin(0.5, 0));

    let y = cardY + 30;

    // ---------- 标题 ----------
    ui.add(this.add.text(width / 2, y, p.title, {
      fontSize: '28px', color: '#d4a353', fontStyle: 'bold',
    }).setOrigin(0.5));
    y += 34;

    // 结局名
    const endingNames = {
      backbone: '成为团队骨干',
      quit: '选择裸辞离开',
      health: '身体发出的警告',
      switch: '转行重新开始',
      light: '找到你的光',
    };
    ui.add(this.add.text(width / 2, y, `结局 · ${endingNames[this.ending] || this.ending}`, {
      fontSize: '16px', color: '#8b8ba0',
    }).setOrigin(0.5));
    y += 22;

    // 分割线
    y = this._divider(ui, width / 2, y, cardW - 120, 0x2a2a40);

    // ---------- 报告维度 ----------
    y = this._section(ui, innerL, y, innerW, '🟡 你的驱动力', p.driveText, '#d4a353');
    y = this._section(ui, innerL, y, innerW, '🔴 你的消耗源', p.drainText, '#e8735a');
    y = this._section(ui, innerL, y, innerW, '💙 你与压力的关系', p.stressStyle, '#7b9cd6');

    // 你没察觉的模式 —— 视觉突出
    ui.add(this.add.rectangle(width / 2, y + 16, innerW + 8, 44, 0x2a2a18, 0.7));
    y = this._section(ui, innerL, y, innerW, '✨ 你没察觉的模式 ✨', p.hiddenPattern, '#f0c060', true);

    y = this._section(ui, innerL, y, innerW, '🟢 职业契合度', p.fitText, '#6aaa6a');

    // ---------- 状态条形图 ----------
    y = this._divider(ui, width / 2, y, cardW - 200, 0x2a2a40);
    y = this._statsBar(ui, innerL, y, innerW);
    y = this._divider(ui, width / 2, y + 4, cardW - 120, 0x2a2a40);

    // ---------- 寄语 ----------
    ui.add(this.add.text(width / 2, y, `「 ${p.oneLineForYou} 」`, {
      fontSize: '18px', color: '#f0d080', fontStyle: 'bold',
      wordWrap: { width: innerW - 40 },
      align: 'center',
    }).setOrigin(0.5));
    y += 34;

    y = this._divider(ui, width / 2, y, cardW - 160, 0x2a2a40);

    // ---------- 按钮 ----------
    const btnY = y + 16;
    this._button(ui, width / 2 - 130, btnY, 200, 36, '再玩一次', 0x2a2a4a, () => {
      this.scene.start('HubScene');
    });
    this._button(ui, width / 2 + 130, btnY, 200, 36, '截图分享', 0x3a3a2a, () => {
      console.log('[Ending] 截图分享功能待接入');
    });
  }

  // ---------- 辅助 ----------
  _divider(parent, cx, y, w, color) {
    parent.add(this.add.rectangle(cx, y + 6, w, 1, color));
    return y + 14;
  }

  _section(parent, x, y, w, label, text, accent, highlight) {
    parent.add(this.add.text(x, y, label, {
      fontSize: '13px', color: accent, fontStyle: 'bold',
    }));
    parent.add(this.add.text(x, y + 14, text, {
      fontSize: '12px', color: '#b8b8c8',
      wordWrap: { width: w },
    }));
    return y + 36;
  }

  _statsBar(parent, x, y, w) {
    const items = [
      { key: '健康', value: this.stats.health, max: 100 },
      { key: '精力', value: this.stats.energy, max: 100 },
      { key: '心态', value: this.stats.san, max: 100 },
      { key: '压力', value: this.stats.stress, max: 100 },
      { key: '技能', value: this.stats.skill, max: 100 },
      { key: '绩效', value: this.stats.performance, max: 100 },
      { key: '金钱', value: this.stats.money, max: 1000 },
      { key: '热情', value: this.stats.passion, max: 100 },
    ];

    const barW = (w - 18) / 4; // 4 per row
    const barH = 6;
    items.forEach((it, i) => {
      const row = Math.floor(i / 4);
      const col = i % 4;
      const bx = x + col * (barW + 6);
      const by = y + row * 26;

      // label + value
      parent.add(this.add.text(bx, by, `${it.key} ${it.value}`, {
        fontSize: '10px', color: '#8b8ba0',
      }));

      // bg bar
      const fillW = Math.min(barW, (it.value / it.max) * barW);
      const isPassion = it.key === '热情';
      parent.add(this.add.rectangle(bx + barW / 2, by + 14, barW, barH, 0x2a2a3e).setOrigin(0.5));
      parent.add(this.add.rectangle(bx + fillW / 2, by + 14, fillW, barH, isPassion ? 0xff6b3d : 0x4ec9b0).setOrigin(0, 0.5));
    });

    return y + (items.length > 4 ? 52 : 28);
  }

  _button(parent, cx, cy, w, h, label, color, cb) {
    const btn = this.add.rectangle(cx, cy, w, h, color)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(cx, cy, label, {
      fontSize: '14px', color: '#e6e6e6',
    }).setOrigin(0.5);
    btn.on('pointerover', () => btn.setFillStyle(color + 0x101010));
    btn.on('pointerout', () => btn.setFillStyle(color));
    btn.on('pointerdown', cb);
    parent.add(btn);
    parent.add(txt);
  }
}
