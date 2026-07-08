import Phaser from 'phaser';

// OpeningScene：开场"认识你"——捏人 + 情境测评。
// 占位框架，测评真题 JSON 稍后提供。引擎共用，不写死最终题目。
const CUSTOMIZE = 'customize';
const QUIZ = 'quiz';

export class OpeningScene extends Phaser.Scene {
  constructor() {
    super('OpeningScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // 自定义选项数据
    this.hairColors = [
      { name: '黑', color: 0x1a1a2e },
      { name: '棕', color: 0x8B6914 },
      { name: '金', color: 0xDAA520 },
      { name: '粉', color: 0xFF69B4 },
    ];
    this.skinColors = [
      { name: '浅', color: 0xF5D6C6 },
      { name: '麦', color: 0xD4A574 },
      { name: '深', color: 0x8D6E63 },
    ];
    this.shirtColors = [
      { name: '蓝', color: 0x4a6a8a },
      { name: '紫', color: 0x6a4a6a },
      { name: '绿', color: 0x4a8a6a },
      { name: '棕', color: 0x8a6a4a },
    ];

    this.avatar = { hairIdx: 0, skinIdx: 0, shirtIdx: 0 };
    this.answers = [];
    this.step = CUSTOMIZE;
    this.ui = null;

    this._buildCustomize();
  }

  // ---------- 公用 ----------
  _clearUI() {
    if (this.ui) { this.ui.destroy(true); this.ui = null; }
  }

  _button(x, y, w, h, label, cb, optColor = 0x333344) {
    const c = this.ui;
    const btn = this.add.rectangle(x, y, w, h, optColor).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, { fontSize: '16px', color: '#e6e6e6' }).setOrigin(0.5);
    btn.on('pointerover', () => btn.setFillStyle(0x4a4a5a));
    btn.on('pointerout', () => btn.setFillStyle(optColor));
    btn.on('pointerdown', cb);
    c.add(btn);
    c.add(txt);
  }

  // ---------- 阶段A：捏人 ----------
  _buildCustomize() {
    this._clearUI();
    this.ui = this.add.container(0, 0);
    const c = this.ui;

    // 标题
    c.add(this.add.text(480, 36, '你是谁？', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5));

    // ---- 角色预览（中央像素小人）----
    const cx = 480, cy = 190;
    // 头发条
    this.hairGfx = this.add.rectangle(cx, cy - 45, 48, 16, this.hairColors[0].color);
    // 头
    this.headGfx = this.add.circle(cx, cy - 20, 22, this.skinColors[0].color);
    // 身体
    this.shirtGfx = this.add.rectangle(cx, cy + 12, 36, 44, this.shirtColors[0].color);
    c.add([this.hairGfx, this.headGfx, this.shirtGfx]);

    // ---- 自定义选项区 ----
    const rows = [
      { y: 280, label: '发色', arr: this.hairColors, key: 'hairIdx', gfx: this.hairGfx },
      { y: 325, label: '肤色', arr: this.skinColors, key: 'skinIdx', gfx: this.headGfx },
      { y: 370, label: '上衣', arr: this.shirtColors, key: 'shirtIdx', gfx: this.shirtGfx },
    ];

    rows.forEach(r => {
      // 标签（收入容器）
      c.add(this.add.text(300, r.y, `${r.label}:`, { fontSize: '16px', color: '#cccccc' }).setOrigin(0.5));
      // 箭头按钮
      this._arrowBtn(420, r.y, '◀', -1, r);
      const nameTxt = this.add.text(480, r.y, r.arr[0].name, { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
      c.add(nameTxt);
      this._arrowBtn(540, r.y, '▶', 1, r);
      r.nameTxt = nameTxt;
    });
    this._customRows = rows;

    // "下一步" 按钮
    this._button(480, 440, 180, 40, '下一步 →', () => this._showQuiz());
  }

  _arrowBtn(x, y, char, dir, row) {
    const btn = this.add.text(x, y, char, { fontSize: '18px', color: '#9aa0a6' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor('#ffd24d'));
    btn.on('pointerout', () => btn.setColor('#9aa0a6'));
    btn.on('pointerdown', () => {
      const len = row.arr.length;
      this.avatar[row.key] = (this.avatar[row.key] + dir + len) % len;
      const opt = row.arr[this.avatar[row.key]];
      row.gfx.setFillStyle(opt.color);
      row.nameTxt.setText(opt.name);
    });
    this.ui.add(btn);
  }

  // ---------- 阶段B：情境测评 ----------
  _showQuiz() {
    this.step = QUIZ;
    this._clearUI();
    this.ui = this.add.container(0, 0);
    const c = this.ui;

    // 标题
    c.add(this.add.text(480, 50, '情境测评', { fontSize: '28px', color: '#ffffff' }).setOrigin(0.5));

    // 占位题
    const questionText = '入职第一天，你更希望：';
    c.add(this.add.text(480, 140, questionText, { fontSize: '18px', color: '#e6e6e6' }).setOrigin(0.5));

    const choices = [
      '主动介绍自己，认识同事',
      '先观察环境，再慢慢融入',
      '直接开始学习工作任务',
    ];
    let answered = false;
    const self = this;

    choices.forEach((text, i) => {
      self._button(480, 210 + i * 56, 420, 44, text, () => {
        if (answered) return;
        answered = true;
        self.answers.push({ question: questionText, choiceIdx: i, choice: text });

        // 隐藏所有选项按钮（destroy 当前 UI 重建）
        self._clearUI();
        self.ui = self.add.container(0, 0);

        // 显示"开始你的职场故事"
        self.ui.add(self.add.text(480, 180, '你的回答已记录', { fontSize: '16px', color: '#9aa0a6' }).setOrigin(0.5));
        self._button(480, 260, 240, 48, '开始你的职场故事', () => {
          const result = {
            avatar: {
              hairColor: self.hairColors[self.avatar.hairIdx].name,
              skinColor: self.skinColors[self.avatar.skinIdx].name,
              shirtColor: self.shirtColors[self.avatar.shirtIdx].name,
            },
            answers: self.answers,
          };
          console.log('[Opening]', result);
          // 切 HubScene 职业选择大厅
          self.scene.start('HubScene');
        });
      }, (i === 0 ? 0x2a4a3e : (i === 1 ? 0x3e3a4a : 0x4a3a3e)));
    });
  }
}
