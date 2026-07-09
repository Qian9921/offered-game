import Phaser from 'phaser';
import { Juice } from '../systems/JuiceKit.js';
import { AudioSystem } from '../systems/AudioSystem.js';

// DebugGameScene：程序员专属动作小游戏「Debug 找茬」。
// 不再是"读代码选ABC"，而是：给一段真实有 bug 的代码，玩家用鼠标/手指
// 在代码上"点出 bug 所在的那一行"——像 code review 时定位问题。
// 找对 → 该行绿色高亮 + 粒子 + 成功音；找错 → 该行红闪 + 屏震 + 扣时间。
//
// 数据来源 public/data/debug_puzzles.json，按 act 抽对应难度关卡。
// 深色 IDE 风格（复用 MinigameScene 的 960×540 + zoom2 坐标策略，1080 屏原生锐利）。
export class DebugGameScene extends Phaser.Scene {
  constructor() { super('DebugGameScene'); }

  init(data) {
    this.act = data?.act || 1;
    this.onComplete = data?.onComplete || null;
    this.fromScene = data?.fromScene || null;
    this.puzzles = null;      // 本局关卡（按 act 抽 2 关）
    this.idx = 0;
    this.solved = 0;
    this.timeLeft = 40;
    this.answered = false;
    this.timerEvent = null;
    this.ui = null;
    this.rowZones = [];
  }

  create() {
    this.cameras.main.setBackgroundColor('#0d1117');
    this.cameras.main.setZoom(2);
    this.cameras.main.centerOn(480, 270);
    this._buildChrome();
    this._loadPuzzles();
  }

  _buildChrome() {
    this.progressText = this.add.text(30, 18, '', { fontSize: '15px', color: '#8b949e' });
    this.timerText = this.add.text(930, 18, '', { fontSize: '15px', color: '#e6e6e6' }).setOrigin(1, 0);
    this.titleText = this.add.text(480, 20, '🐛 Debug 找茬', { fontSize: '17px', color: '#58a6ff', fontStyle: 'bold' }).setOrigin(0.5, 0);
  }

  _loadPuzzles() {
    this.loadingText = this.add.text(480, 270, '加载代码…', { fontSize: '16px', color: '#8b949e' }).setOrigin(0.5);
    fetch('./data/debug_puzzles.json')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        const all = data.puzzles || [];
        // 抽当前 act 的关卡；不足则用相邻 act 兜底。取最多 2 关。
        let pool = all.filter(p => p.act === this.act);
        if (pool.length === 0) pool = all.filter(p => Math.abs(p.act - this.act) <= 1);
        if (pool.length === 0) pool = all;
        this.puzzles = pool.slice(0, 2);
        if (this.loadingText) { this.loadingText.destroy(); this.loadingText = null; }
        this._showPuzzle();
      })
      .catch(err => {
        console.warn('[DebugGame] 关卡加载失败:', err.message);
        this._finish(); // 加载失败直接结束，不卡住玩家
      });
  }

  _showPuzzle() {
    this._clearUI();
    this.ui = this.add.container(0, 0);
    const c = this.ui;
    const pz = this.puzzles[this.idx];
    this.answered = false;
    this.timeLeft = 40;
    this.rowZones = [];

    this.progressText.setText(`第 ${this.idx + 1}/${this.puzzles.length} 段`);
    this._updateTimer();

    // 关卡标题 + 提示"点出有 bug 的那一行"
    c.add(this.add.text(480, 52, pz.title || '找出 bug', { fontSize: '16px', color: '#c9d1d9' }).setOrigin(0.5, 0));
    c.add(this.add.text(480, 76, '👆 点击你认为有 bug 的那一行', { fontSize: '13px', color: '#8b949e' }).setOrigin(0.5, 0));

    // 代码区：每行一个可点击行（行号 + 代码），点击定位 bug
    const lines = pz.lines || [];
    const codeTop = 104;
    const rowH = 26;
    const codeLeft = 120, codeW = 720;
    lines.forEach((line, i) => {
      const ry = codeTop + i * rowH;
      // 行背景（可点击）
      const rowBg = this.add.rectangle(480, ry + rowH / 2, codeW, rowH - 2, 0x161b22)
        .setInteractive({ useHandCursor: true });
      // 行号
      const numT = this.add.text(codeLeft, ry + 4, String(i + 1).padStart(2, ' '), {
        fontFamily: 'monospace', fontSize: '14px', color: '#484f58',
      });
      // 代码文字
      const codeT = this.add.text(codeLeft + 40, ry + 4, line || ' ', {
        fontFamily: 'monospace', fontSize: '14px', color: '#c9d1d9',
      });
      rowBg.on('pointerover', () => { if (!this.answered) rowBg.setFillStyle(0x1f2733); });
      rowBg.on('pointerout', () => { if (!this.answered) rowBg.setFillStyle(0x161b22); });
      rowBg.on('pointerdown', () => this._pick(i, rowBg));
      c.add(rowBg); c.add(numT); c.add(codeT);
      this.rowZones.push({ bg: rowBg, index: i, y: ry + rowH / 2 });
    });

    // 计时
    this._clearTimer();
    this.timerEvent = this.time.addEvent({
      delay: 1000, repeat: 39,
      callback: () => { this.timeLeft--; this._updateTimer(); if (this.timeLeft <= 0) this._timeout(); },
    });
  }

  _updateTimer() {
    this.timerText.setText(`⏱ ${this.timeLeft}s`);
    this.timerText.setColor(this.timeLeft <= 10 ? '#f85149' : '#e6e6e6');
  }

  // 点击某一行判定
  _pick(index, rowBg) {
    if (this.answered) return;
    const pz = this.puzzles[this.idx];
    if (index === pz.bugLine) {
      // 找对：绿色高亮 + 粒子 + 成功音
      this.answered = true;
      this._clearTimer();
      rowBg.setFillStyle(0x1a3a1a);
      const wz = this.rowZones[index];
      Juice.burst(this, 480, wz.y, 0x3fb950, 14);
      AudioSystem.success();
      this.solved++;
      this._showExplain(true, pz.explain);
    } else {
      // 找错：红闪 + 屏震 + 扣 8 秒（不结束，继续找）
      rowBg.setFillStyle(0x3a1a1a);
      this.time.delayedCall(300, () => { if (!this.answered) rowBg.setFillStyle(0x161b22); });
      Juice.shake(this, 0.01, 180);
      AudioSystem.error();
      this.timeLeft = Math.max(1, this.timeLeft - 8);
      this._updateTimer();
      // 冒一句提示
      this._flashHint(pz.hint || '再看看别的行……');
    }
  }

  _timeout() {
    if (this.answered) return;
    this.answered = true;
    this._clearTimer();
    const pz = this.puzzles[this.idx];
    // 超时：高亮正确行，算未解出
    const wz = this.rowZones[pz.bugLine];
    if (wz) wz.bg.setFillStyle(0x3a2a1a);
    this._showExplain(false, '⏰ 时间到！\n' + pz.explain);
  }

  _flashHint(msg) {
    const t = this.add.text(480, 470, msg, {
      fontSize: '13px', color: '#f0c060', backgroundColor: '#00000099', padding: { x: 8, y: 4 },
      wordWrap: { width: 700, useAdvancedWrap: true }, align: 'center',
    }).setOrigin(0.5).setDepth(50);
    this.time.delayedCall(1600, () => t.destroy());
  }

  // 解释页（找对/超时后）
  _showExplain(solved, explain) {
    const icon = this.add.text(480, 430, solved ? '✓ 修复成功' : '✗ 没找到', {
      fontSize: '18px', color: solved ? '#3fb950' : '#f85149', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.ui.add(icon);
    Juice.pop(this, icon, 1);
    const ex = this.add.text(480, 462, explain, {
      fontSize: '13px', color: '#8b949e', wordWrap: { width: 700, useAdvancedWrap: true }, align: 'center', lineSpacing: 3,
    }).setOrigin(0.5, 0);
    this.ui.add(ex);
    const cont = this.add.text(480, 520, '点击继续', { fontSize: '12px', color: '#484f58' }).setOrigin(0.5);
    this.ui.add(cont);
    // 点击推进（一次性，防泄漏：advance 里先 off）
    const advance = () => {
      this.input.off('pointerdown', advance);
      this.idx++;
      if (this.idx < this.puzzles.length) this._showPuzzle();
      else this._finish();
    };
    this.time.delayedCall(150, () => this.input.on('pointerdown', advance));
  }

  _finish() {
    this._clearUI();
    this._clearTimer();
    const total = this.puzzles ? this.puzzles.length : 0;
    const result = { correct: this.solved, total, ratio: total ? Math.round(this.solved / total * 100) : 0 };
    if (this.onComplete) this.onComplete(result);
    if (this.fromScene) this.scene.start(this.fromScene);
  }

  _clearUI() { if (this.ui) { this.ui.destroy(true); this.ui = null; } }
  _clearTimer() { if (this.timerEvent) { this.timerEvent.remove(); this.timerEvent = null; } }
}
