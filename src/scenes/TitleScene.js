import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { makeButton } from '../systems/UI.js';
import { buildWorldResumeData } from '../systems/Resume.js';

const VERSION = 'v0.1.0';

const TIPS = [
  '💡 ESC 随时打开任务日志，查看下一步该做什么。',
  '💡 走近头顶有 ❗ 的同事按 E，他会给你派活。',
  '💡 Tab 键展开完整状态面板，看看你的身心数据。',
  '💡 累了就去窗边看看风景，或给家里打个电话。',
  '💡 同一个职业可以试不同细分方向——开发 vs 测试是完全不同的一天。',
  '💡 通关一个职业会生成专属结局画像，多试几个对比。',
  '💡 周一到周五的心情不同，发薪日会有特别的氛围。',
  '💡 多跟同事聊天，关系变熟后台词会不一样。',
  '💡 💗 叙事辅助模式可以在设置里开启，让旅程更轻松。',
  '💡 你的绿植会随你的职业旅程一起生长。',
];

const CAREER_NAMES = {
  programmer: '程序员', product: '产品经理', admin: '高校行政',
  designer: '设计师', operation: '运营', teacher: '教师',
  doctor: '医生／护士', civilservant: '公务员', sales: '销售', lawyer: '律师',
};

// TitleScene：完整标题界面（天际线 + 多按钮 + 存档/设置/制作组面板）
export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  _drawSkyline(W, H) {
    const sky = this.add.graphics().setDepth(-10);
    sky.fillGradientStyle(0x141026, 0x1a1430, 0x6e3550, 0xb0603e, 1);
    sky.fillRect(0, 0, W, H);
    sky.fillStyle(0xffb673, 0.10); sky.fillRect(0, H * 0.60, W, H * 0.16);
    this.add.circle(W * 0.80, H * 0.19, 72, 0xf6e8c8, 0.10).setDepth(-9);
    this.add.circle(W * 0.80, H * 0.19, 44, 0xf6e8c8, 0.92).setDepth(-9);
    const layers = [
      { base: H * 0.70, col: 0x241d3a, wmin: 70, wmax: 150, hmin: 60, hmax: 150, lit: 0.22, tint: 0xffd27a, depth: -8 },
      { base: H * 0.77, col: 0x191430, wmin: 60, wmax: 130, hmin: 120, hmax: 260, lit: 0.48, tint: 0xffcf7a, depth: -6 },
      { base: H * 0.85, col: 0x100c1e, wmin: 84, wmax: 176, hmin: 170, hmax: 360, lit: 0.72, tint: 0xffe08a, depth: -4 },
    ];
    for (const L of layers) {
      let x = -40;
      while (x < W + 40) {
        const bw = Phaser.Math.Between(L.wmin, L.wmax);
        const bh = Phaser.Math.Between(L.hmin, L.hmax);
        const by = L.base - bh;
        this.add.rectangle(x, by, bw, H - by + 40, L.col).setOrigin(0, 0).setDepth(L.depth);
        for (let wy = by + 16; wy < L.base - 10; wy += 20) {
          for (let wx = x + 12; wx < x + bw - 12; wx += 16) {
            if (Math.random() < L.lit) {
              const a = Phaser.Math.FloatBetween(0.5, 0.95);
              const win = this.add.rectangle(wx, wy, 7, 9, L.tint, a).setOrigin(0, 0).setDepth(L.depth + 0.5);
              if (Math.random() < 0.16) this.tweens.add({
                targets: win, alpha: 0.12, duration: Phaser.Math.Between(1600, 3600),
                yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 3000),
              });
            }
          }
        }
        x += bw + Phaser.Math.Between(4, 16);
      }
    }
  }

  create() {
    const { width: W, height: H } = this.scale;
    this.cameras.main.fadeIn(700, 10, 8, 20);
    AudioSystem.playBgm('title');
    SaveSystem._migrateLegacy();
    this._drawSkyline(W, H);

    for (let i = 0; i < 16; i++) {
      const c = this.add.circle(
        Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
        Phaser.Math.Between(2, 5), 0xf5c86b, Phaser.Math.FloatBetween(0.06, 0.18)
      ).setDepth(-2);
      this.tweens.add({ targets: c, y: c.y - Phaser.Math.Between(30, 80), alpha: 0,
        duration: Phaser.Math.Between(3000, 6000), repeat: -1, delay: Phaser.Math.Between(0, 3000) });
    }
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a16, 0.30).setDepth(-1);

    this.add.text(W / 2, H * 0.22, '腾讯云黑客松 · 由 WorkBuddy × 混元 hy3 打造', {
      fontSize: '24px', color: '#8a8aa0', letterSpacing: 3,
    }).setOrigin(0.5);

    const title = this.add.text(W / 2, H * 0.36, '你 想 成 为 谁', {
      fontSize: '84px', color: '#ffffff', fontStyle: 'bold', letterSpacing: 10,
    }).setOrigin(0.5);
    title.setShadow(0, 4, '#d4a35388', 16, false, true);
    this.tweens.add({ targets: title, scale: 1.02, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.add.text(W / 2, H * 0.49, '「 你不是要成为一个正确的人，\n而是要认出那个本来的你。 」', {
      fontSize: '26px', color: '#c8b88a', align: 'center', lineSpacing: 12,
      wordWrap: { width: W - 200, useAdvancedWrap: true },
    }).setOrigin(0.5);

    // ===== 按钮区 =====
    const latest = SaveSystem.latestSlot();
    const hasSave = latest !== null;
    const btns = [];
    if (hasSave) btns.push({ label: '▶  继续游戏', fill: 0x2a4a3e, stroke: 0xd4a353, color: '#ffe08a', action: 'resume' });
    btns.push({ label: '📂  读取存档', fill: 0x23232f, stroke: 0x555577, color: '#b8b8c8', action: 'load' });
    btns.push({ label: '✨  重新开始', fill: 0x23232f, stroke: 0x555577, color: '#b8b8c8', action: 'newgame' });
    btns.push({ label: '⚙️  设置', fill: 0x23232f, stroke: 0x555577, color: '#b8b8c8', action: 'settings' });
    btns.push({ label: '🎬  制作组', fill: 0x23232f, stroke: 0x555577, color: '#b8b8c8', action: 'credits' });

    const btnSpacing = 56;
    const startY = H * 0.60;
    this._menuButtons = [];
    btns.forEach((b, i) => {
      const cy = startY + i * btnSpacing;
      const btn = makeButton(this, {
        x: W / 2, y: cy, label: b.label, fill: b.fill, stroke: b.stroke, color: b.color,
        fontSize: 26, minW: 300, padX: 40, padY: 16, letterSpacing: 4,
        sound: () => AudioSystem.uiClick(), onClick: () => this._handleAction(b.action),
      });
      this._menuButtons.push(btn);
    });

    this._selectedBtn = hasSave ? 0 : btns.findIndex(b => b.action === 'newgame');
    if (this._selectedBtn < 0) this._selectedBtn = 0;
    this.input.keyboard.on('keydown-DOWN', () => this._navButton(1));
    this.input.keyboard.on('keydown-UP', () => this._navButton(-1));
    this.input.keyboard.on('keydown-ENTER', () => {
      if (this._overlayActive) return;
      const b = btns[this._selectedBtn];
      if (b) this._handleAction(b.action);
    });
    if (hasSave) {
      this.input.keyboard.once('keydown-SPACE', () => { if (!this._overlayActive) this._handleAction('resume'); });
    } else {
      this.input.keyboard.once('keydown-SPACE', () => { if (!this._overlayActive) this._handleAction('newgame'); });
    }
    this._highlightSelected();

    // 底部
    const tip = TIPS[Phaser.Math.Between(0, TIPS.length - 1)];
    this.add.text(W / 2, H * 0.92, tip, { fontSize: '17px', color: '#6a6a82' }).setOrigin(0.5);
    this.add.text(20, H - 10, VERSION, { fontSize: '14px', color: '#4a4a5e' }).setOrigin(0, 1);

    const fsBtn = this.add.text(W - 20, 18, '⛶ 全屏', { fontSize: '20px', color: '#8a8a9e' })
      .setOrigin(1, 0).setInteractive({ useHandCursor: true });
    fsBtn.on('pointerover', () => fsBtn.setColor('#e6e6e6'));
    fsBtn.on('pointerout', () => fsBtn.setColor('#8a8a9e'));
    fsBtn.on('pointerdown', () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen();
    });

    this.add.text(W - 12, H - 8, 'Built with WorkBuddy · Art: LimeZu · Kenney · AI: 腾讯混元 hy3', {
      fontSize: '16px', color: '#5a5a6e',
    }).setOrigin(1, 1);
  }

  _highlightSelected() {
    if (!this._menuButtons || !this._menuButtons.length) return;
    this._menuButtons.forEach((b, i) => {
      const rect = b.rect;
      if (!rect) return;
      if (i === this._selectedBtn) { rect.setStrokeStyle(3, 0xf0d68a, 1); rect.setFillStyle(0x2a3a4a); }
      else { rect.setStrokeStyle(2, 0x555577, 0.8); }
    });
  }
  _navButton(dir) {
    if (this._overlayActive || !this._menuButtons || !this._menuButtons.length) return;
    this._selectedBtn = (this._selectedBtn + dir + this._menuButtons.length) % this._menuButtons.length;
    this._highlightSelected();
    AudioSystem.blip && AudioSystem.blip('导航');
  }
  _handleAction(action) {
    if (this._overlayActive) return;
    switch (action) {
      case 'resume': this._doResume(); break;
      case 'load': this._showLoadPanel(); break;
      case 'newgame': this._showNewGamePanel(); break;
      case 'settings': this._showSettingsPanel(); break;
      case 'credits': this._showCreditsPanel(); break;
    }
  }
  _doResume() {
    const latest = SaveSystem.latestSlot();
    if (latest === null) { this._showNewGamePanel(); return; }
    const save = SaveSystem.loadSlot(latest);
    const data = buildWorldResumeData(save);
    if (!data) { this._showNewGamePanel(); return; }
    this.cameras.main.fadeOut(500, 10, 8, 20);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('WorldScene', data));
  }

  _openOverlay() {
    this._overlayActive = true;
    const { width: W, height: H } = this.scale;
    const c = this.add.container(0, 0).setDepth(20000);
    c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x06060c, 0.92).setInteractive());
    const pw = 620, ph = 600, px = W / 2, py = H / 2;
    c.add(this.add.rectangle(px, py, pw, ph, 0x12121e, 0.98).setStrokeStyle(2, 0xd4a353, 0.6));
    this._overlay = c;
    this.input.keyboard.once('keydown-ESC', () => this._closeOverlay());
    return { c, pw, ph, px, py };
  }
  _closeOverlay() { this._overlayActive = false; if (this._overlay) { this._overlay.destroy(true); this._overlay = null; } }
  _overlayTitle(text) {
    const px = this.scale.width / 2, py = this.scale.height / 2, ph = 600;
    this._overlay.add(this.add.text(px, py - ph / 2 + 36, text, { fontSize: '28px', color: '#ffd24d', fontStyle: 'bold' }).setOrigin(0.5));
  }
  _overlayCloseButton() {
    const { width: W, height: H } = this.scale; const pw = 620;
    const btn = this.add.text(W / 2 + pw / 2 - 20, H / 2 - 600 / 2 + 18, '✕', { fontSize: '22px', color: '#8a8a9e' })
      .setOrigin(1, 0).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor('#ff9a9a'));
    btn.on('pointerout', () => btn.setColor('#8a8a9e'));
    btn.on('pointerdown', () => this._closeOverlay());
    this._overlay.add(btn);
  }

  _showLoadPanel() {
    this._openOverlay(); this._overlayTitle('📂 读取存档'); this._overlayCloseButton();
    const { width: W, height: H } = this.scale;
    const slots = SaveSystem.listSlots();
    const cardW = 520, cardH = 120, gap = 16, startY = H / 2 - 170;
    slots.forEach((s) => {
      const cy = startY + (s.slot - 1) * (cardH + gap), cx = W / 2;
      const card = this.add.rectangle(cx, cy, cardW, cardH, s.exists ? 0x1a1a2e : 0x0e0e18, 0.95)
        .setStrokeStyle(2, s.exists ? 0x4a4a6a : 0x2a2a3e);
      if (s.exists) {
        const name = CAREER_NAMES[s.career] || s.career || '未知';
        const act = s.act ? `第 ${s.act} 幕` : '';
        const day = s.day ? ` · 第 ${s.day} 天` : '';
        const time = s.updatedAt ? this._fmtTime(s.updatedAt) : '';
        this._overlay.add(this.add.text(cx - cardW / 2 + 20, cy - 40, `槽位 ${s.slot}　${name}`, { fontSize: '22px', color: '#ffe08a', fontStyle: 'bold' }));
        this._overlay.add(this.add.text(cx - cardW / 2 + 20, cy - 8, `${act}${day}　${time}`, { fontSize: '16px', color: '#9a9ab0' }));
        const loadBtn = this.add.text(cx + cardW / 2 - 130, cy + 18, '读取 ▶', { fontSize: '18px', color: '#7eff9a', backgroundColor: '#1a3a2aee', padding: { x: 12, y: 6 } })
          .setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
        loadBtn.on('pointerover', () => loadBtn.setBackgroundColor('#2a5a3aee'));
        loadBtn.on('pointerout', () => loadBtn.setBackgroundColor('#1a3a2aee'));
        loadBtn.on('pointerdown', () => {
          this._closeOverlay();
          const save = SaveSystem.loadSlot(s.slot);
          const data = buildWorldResumeData(save);
          if (data) { this.cameras.main.fadeOut(500, 10, 8, 20); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('WorldScene', data)); }
        });
        const delBtn = this.add.text(cx + cardW / 2 - 40, cy + 18, '🗑', { fontSize: '18px', color: '#ff9a9a', backgroundColor: '#3a1a1aee', padding: { x: 10, y: 6 } })
          .setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
        delBtn.on('pointerover', () => delBtn.setBackgroundColor('#5a2a2aee'));
        delBtn.on('pointerout', () => delBtn.setBackgroundColor('#3a1a1aee'));
        delBtn.on('pointerdown', () => { SaveSystem.clearSlot(s.slot); this._closeOverlay(); this._showLoadPanel(); });
        this._overlay.add([loadBtn, delBtn]);
      } else {
        this._overlay.add(this.add.text(cx, cy, `槽位 ${s.slot}　— 空 —`, { fontSize: '20px', color: '#4a4a5e' }).setOrigin(0.5));
      }
      this._overlay.add(card);
    });
  }

  _showNewGamePanel() {
    this._openOverlay(); this._overlayTitle('✨ 新的旅程'); this._overlayCloseButton();
    const { width: W, height: H } = this.scale;
    this._overlay.add(this.add.text(W / 2, H / 2 - 200, '选择一个存档槽位开始', { fontSize: '18px', color: '#9a9ab0' }).setOrigin(0.5));
    const slots = SaveSystem.listSlots();
    const cardW = 520, cardH = 110, gap = 14, startY = H / 2 - 140;
    slots.forEach((s) => {
      const cy = startY + (s.slot - 1) * (cardH + gap), cx = W / 2;
      const card = this.add.rectangle(cx, cy, cardW, cardH, s.exists ? 0x2a1a1e : 0x1a2a1e, 0.95)
        .setStrokeStyle(2, s.exists ? 0x8a4a4a : 0x4a8a4a).setInteractive({ useHandCursor: true });
      const label = s.exists ? `槽位 ${s.slot}　${CAREER_NAMES[s.career] || s.career}（将被覆盖）` : `槽位 ${s.slot}　— 空 —`;
      const txt = this.add.text(cx, cy, label, { fontSize: '20px', color: s.exists ? '#ffaaaa' : '#aaffaa' }).setOrigin(0.5);
      this._overlay.add([card, txt]);
      card.on('pointerover', () => card.setFillStyle(0x3a3a4e));
      card.on('pointerout', () => card.setFillStyle(s.exists ? 0x2a1a1e : 0x1a2a1e));
      card.on('pointerdown', () => {
        SaveSystem.clearSlot(s.slot); this._closeOverlay();
        this.cameras.main.fadeOut(500, 10, 8, 20);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('OpeningScene', { newGameSlot: s.slot }));
      });
    });
  }

  _showSettingsPanel() {
    this._openOverlay(); this._overlayTitle('⚙️ 设置'); this._overlayCloseButton();
    const { width: W, height: H } = this.scale;
    let settings = { bgm: 70, sfx: 80 };
    try { settings = { ...settings, ...JSON.parse(localStorage.getItem('wdwtb_settings') || '{}') }; } catch (e) {}
    const save = () => { try { localStorage.setItem('wdwtb_settings', JSON.stringify(settings)); } catch (e) {} };
    const slider = (y, label, key) => {
      const trackX = W / 2 - 60, trackW = 220;
      this._overlay.add(this.add.text(W / 2 - 200, y, label, { fontSize: '18px', color: '#c8c8dc' }).setOrigin(0, 0.5));
      this._overlay.add(this.add.rectangle(trackX, y, trackW, 6, 0x2a2a3e).setOrigin(0, 0.5));
      const fill = this.add.rectangle(trackX, y, trackW * settings[key] / 100, 6, 0x4ec9b0).setOrigin(0, 0.5);
      const knob = this.add.circle(trackX + trackW * settings[key] / 100, y, 10, 0xf0d68a).setInteractive({ useHandCursor: true, draggable: true });
      const valTxt = this.add.text(trackX + trackW + 24, y, `${settings[key]}`, { fontSize: '16px', color: '#9aa0c0' }).setOrigin(0, 0.5);
      this._overlay.add([fill, knob, valTxt]); this.input.setDraggable(knob);
      knob.on('drag', (p, dx) => {
        const nx = Phaser.Math.Clamp(dx, trackX, trackX + trackW); knob.x = nx;
        const val = Math.round((nx - trackX) / trackW * 100); settings[key] = val; fill.width = trackW * val / 100; valTxt.setText(`${val}`);
        AudioSystem.setVolume(key, val); save();
      });
      knob.on('dragend', () => { if (key === 'sfx') AudioSystem.uiClick(); });
    };
    slider(H / 2 - 160, '背景音乐', 'bgm');
    slider(H / 2 - 100, '音效', 'sfx');
    const SPEED_NAMES = ['慢', '中', '快(瞬显)'];
    const speedVal = () => settings.textSpeed ?? 1;
    const speedBtn = this.add.text(W / 2, H / 2 - 30, `💬  文字速度：${SPEED_NAMES[speedVal()]}`, { fontSize: '20px', color: '#e8e8f4', backgroundColor: '#232338', padding: { x: 20, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    speedBtn.on('pointerover', () => speedBtn.setBackgroundColor('#33334e')); speedBtn.on('pointerout', () => speedBtn.setBackgroundColor('#232338'));
    speedBtn.on('pointerdown', () => { settings.textSpeed = (speedVal() + 1) % 3; save(); speedBtn.setText(`💬  文字速度：${SPEED_NAMES[speedVal()]}`); AudioSystem.uiClick(); });
    this._overlay.add(speedBtn);
    const assistOn = () => !!settings.assist;
    const assistBtn = this.add.text(W / 2, H / 2 + 30, '', { fontSize: '20px', color: '#e8e8f4', padding: { x: 20, y: 10 }, backgroundColor: assistOn() ? '#2a4436' : '#232338' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const updateAssist = () => { assistBtn.setText(`💗  叙事辅助：${assistOn() ? '开' : '关'}（减轻状态消耗）`); assistBtn.setBackgroundColor(assistOn() ? '#2a4436' : '#232338'); };
    updateAssist();
    assistBtn.on('pointerover', () => assistBtn.setBackgroundColor(assistOn() ? '#3a5a46' : '#33334e'));
    assistBtn.on('pointerout', () => assistBtn.setBackgroundColor(assistOn() ? '#2a4436' : '#232338'));
    assistBtn.on('pointerdown', () => { settings.assist = !settings.assist; save(); updateAssist(); AudioSystem.uiClick(); });
    this._overlay.add(assistBtn);
    const fsBtn = this.add.text(W / 2, H / 2 + 90, '⛶  全屏 / 退出全屏', { fontSize: '20px', color: '#e8e8f4', backgroundColor: '#232338', padding: { x: 20, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    fsBtn.on('pointerover', () => fsBtn.setBackgroundColor('#33334e')); fsBtn.on('pointerout', () => fsBtn.setBackgroundColor('#232338'));
    fsBtn.on('pointerdown', () => { if (this.scale.isFullscreen) this.scale.stopFullscreen(); else this.scale.startFullscreen(); AudioSystem.uiClick(); });
    this._overlay.add(fsBtn);
  }

  _showCreditsPanel() {
    this._openOverlay(); this._overlayTitle('🎬 制作组'); this._overlayCloseButton();
    const { width: W, height: H } = this.scale;
    const lines = [
      { t: '———— 你想成为谁 ————', c: '#ffd24d', s: '22px' },
      { t: '', c: '#888' },
      { t: '🤖  AI 开发引擎', c: '#8fd08f', s: '20px' },
      { t: 'WorkBuddy — 腾讯 AI 办公智能体', c: '#ffe08a', s: '18px' },
      { t: '从代码到内容，全程 AI 驱动开发', c: '#c8c8dc' },
      { t: '', c: '#888' },
      { t: '🧠  AI 内容引擎', c: '#8fd08f', s: '18px' },
      { t: '腾讯混元 hy3 — 结局画像 / NPC 个性化台词', c: '#c8c8dc' },
      { t: '10 职业 × 5 幕叙事，AI 实时生成专属结局', c: '#9a9ab0' },
      { t: '', c: '#888' },
      { t: '🎮  游戏设计', c: '#8fd08f', s: '18px' },
      { t: '职场疗愈叙事 RPG · 10 职业世界', c: '#c8c8dc' },
      { t: '任务链 / 好感 / 事件 / 五结局', c: '#9a9ab0' },
      { t: '', c: '#888' },
      { t: '🎨  像素美术', c: '#8fd08f', s: '18px' },
      { t: 'LimeZu — Modern Office tileset', c: '#c8c8dc' },
      { t: 'Kenney — Roguelike characters', c: '#c8c8dc' },
      { t: 'SkyOffice — Office map (MIT)', c: '#c8c8dc' },
      { t: '', c: '#888' },
      { t: '⚙️  技术栈', c: '#8fd08f', s: '18px' },
      { t: 'Phaser 3.80 · Vite 5', c: '#c8c8dc' },
      { t: '纯 WebAudio 程序化音频（零音频素材）', c: '#9a9ab0' },
      { t: 'Fusion Pixel 12px 字体 (OFL)', c: '#9a9ab0' },
      { t: '', c: '#888' },
      { t: '🏗️  部署', c: '#8fd08f', s: '18px' },
      { t: '腾讯云 EdgeOne Pages', c: '#c8c8dc' },
      { t: '', c: '#888' },
      { t: '💡  致每一位毕业生', c: '#ffd24d', s: '20px' },
      { t: '你不是要成为一个正确的人，', c: '#c8b88a' },
      { t: '而是要认出那个本来的你。', c: '#c8b88a' },
      { t: '', c: '#888' },
      { t: '腾讯云黑客松 · 2026 · WorkBuddy 出品', c: '#6a6a82' },
    ];
    const startY = H / 2 - 230;
    lines.forEach((line, i) => {
      this._overlay.add(this.add.text(W / 2, startY + i * 32, line.t, {
        fontSize: line.s || '16px', color: line.c || '#c8c8dc', fontStyle: line.s ? 'bold' : 'normal',
      }).setOrigin(0.5));
    });
  }

  _fmtTime(ts) {
    try {
      const d = new Date(ts);
      return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch (e) { return ''; }
  }
}
