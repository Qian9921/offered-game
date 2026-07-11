import Phaser from 'phaser';

// SceneBackdrop：程序化像素场景背景——用纯 Graphics 几何绘制，零 emoji、零外部素材。
// 设计理念：抽象色块 + 渐变营造氛围，道具用极简像素矩形/圆形画出，
// 整体偏暖偏亮——毕业生看到的不是"又一拳"，而是"前路上有光"。
//
// 钉屏 + UI 相机层，depth 在办公室世界之上(700)、对话框之下(10000)。

const OFFICE_BGS = new Set([
  'office', 'office_day', 'office_night', 'office_996', 'office_corridor',
  'office_morning', 'office_dusk', 'office_evening', 'office_window',
  'office_desk', 'office_pantry', 'corridor', 'corridor_dusk',
]);

// 用 Graphics 画像素块（每个"像素"= PX 个真实像素），风格统一、NEAREST 锐利。
const PX = 4;

export class SceneBackdrop {
  constructor(scene) {
    this.scene = scene;
    this.container = null;
    this.currentBg = null;
    this.SW = scene.scale.width;
    this.SH = scene.scale.height;
  }

  show(bgKey) {
    if (bgKey === this.currentBg) return;
    this.currentBg = bgKey;
    if (!bgKey || OFFICE_BGS.has(bgKey)) { this.hide(); return; }

    this._clear();
    const c = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(700);
    this.container = c;

    const draw = {
      street_morning: () => this._street(c),
      street_night: () => this._streetNight(c),
      subway_night: () => this._subway(c),
      office_lobby: () => this._lobby(c),
      lobby: () => this._lobby(c),
      home: () => this._home(c, false),
      home_night: () => this._home(c, true),
      apartment_night: () => this._home(c, true),
      hospital: () => this._hospital(c),
      pantry: () => this._pantry(c),
      window: () => this._window(c),
      desk: () => this._desk(c),
      meeting_room: () => this._meetingRoom(c),
      campus_night: () => this._campus(c),
      gym_evening: () => this._gym(c),
      archive_room: () => this._archive(c),
      transition_dark: () => this._transition(c),
    }[bgKey] || (() => this._generic(c, bgKey));
    draw();

    if (typeof this.scene.attachToUICamera === 'function') this.scene.attachToUICamera(c);
    c.setAlpha(0);
    this.scene.tweens.add({ targets: c, alpha: 1, duration: 500, ease: 'Sine.inOut' });
  }

  hide() {
    if (!this.container) return;
    const c = this.container; this.container = null;
    this.scene.tweens.add({
      targets: c, alpha: 0, duration: 400,
      onComplete: () => c.destroy(true),
    });
  }

  _clear() {
    if (this.container) { this.container.destroy(true); this.container = null; }
  }

  destroy() { this._clear(); }

  // ============ 绘制工具 ============

  _rect(c, x, y, w, h, color, alpha = 1) {
    const r = this.scene.add.rectangle(x, y, w, h, color, alpha).setOrigin(0, 0);
    c.add(r);
    return r;
  }

  _vGradient(c, x, y, w, h, topColor, botColor, steps = 28) {
    const tr = (topColor >> 16) & 255, tg = (topColor >> 8) & 255, tb = topColor & 255;
    const br = (botColor >> 16) & 255, bg = (botColor >> 8) & 255, bb = botColor & 255;
    const bandH = h / steps;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = Math.round(tr + (br - tr) * t);
      const g = Math.round(tg + (bg - tg) * t);
      const b = Math.round(tb + (bb - tb) * t);
      this._rect(c, x, y + i * bandH, w, bandH + 1, (r << 16) | (g << 8) | b);
    }
  }

  _circle(c, x, y, r, color, alpha = 1) {
    const o = this.scene.add.circle(x, y, r, color, alpha).setScrollFactor(0);
    c.add(o);
    return o;
  }

  /** 发光球：多层 ADD 混合圆，营造柔光 */
  _glowOrb(c, x, y, r, color, layers = 6) {
    for (let i = layers; i > 0; i--) {
      const lr = r * (1 + i * 0.35);
      const o = this.scene.add.circle(x, y, lr, color, 0.08)
        .setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD);
      c.add(o);
    }
    this._circle(c, x, y, r, color, 0.9);
  }

  _label(c, text, color = '#8a8a9e') {
    const t = this.scene.add.text(40, 28, text, {
      fontSize: '18px', color,
      stroke: '#0a0a14', strokeThickness: 3,
    }).setScrollFactor(0);
    c.add(t);
  }

  /** 像素块画法：在一个区域里按行列画小方块，构成抽象像素画 */
  _pixelGrid(c, ox, oy, cols, rows, data, palette) {
    // data 是字符串数组，每个字符对应 palette 里的一个色键；空格/·=透明
    for (let row = 0; row < data.length && row < rows; row++) {
      for (let col = 0; col < data[row].length && col < cols; col++) {
        const ch = data[row][col];
        if (ch === ' ' || ch === '.' || ch === undefined) continue;
        const color = palette[ch];
        if (color == null) continue;
        this._rect(c, ox + col * PX, oy + row * PX, PX, PX, color);
      }
    }
  }

  // ============ 各场景 ============

  // 通勤晨景：暖金朝阳 + 楼群剪影 + 光芒——"出发"感
  _street(c) {
    const W = this.SW, H = this.SH;
    const groundY = H * 0.64;
    // 暖金天空：朝霞感
    this._vGradient(c, 0, 0, W, groundY, 0xffd9a0, 0xf0c8d8);
    // 朝阳（发光球 + 光芒线）
    const sunX = W * 0.72, sunY = H * 0.26;
    this._glowOrb(c, sunX, sunY, 28, 0xfff0c0, 5);
    // 远处楼群剪影（中调蓝灰，高低错落）
    const bw = 130;
    for (let i = 0; i < Math.ceil(W / bw); i++) {
      const bh = 100 + ((i * 137) % 260);
      const shade = 0x5a6a88 + ((i % 3) * 0x0a0a12);
      this._rect(c, i * bw, groundY - bh, bw - 14, bh, shade, 0.85);
      // 暖色窗格
      for (let wy = groundY - bh + 18; wy < groundY - 18; wy += 30) {
        for (let wx = i * bw + 10; wx < i * bw + bw - 24; wx += 28) {
          if ((wx * 7 + wy * 3) % 5 < 2)
            this._rect(c, wx, wy, 10, 14, 0xffe8a8, 0.6);
        }
      }
    }
    // 玻璃大厦（高亮，"你仰望的那栋"）
    this._rect(c, W * 0.42, groundY - 420, 130, 420, 0x8ec4e8, 0.85);
    this._rect(c, W * 0.42 + 6, groundY - 410, 118, 400, 0xb8dcf4, 0.4);
    // 街道地面
    this._rect(c, 0, groundY, W, H - groundY, 0x3c3c48);
    this._rect(c, 0, groundY, W, 5, 0x5c5c68);
    // 斑马线（亮色引导前进方向）
    for (let x = W * 0.25; x < W * 0.75; x += 56)
      this._rect(c, x, groundY + 50, 34, H - groundY - 90, 0xd0d0d8, 0.4);
    this._label(c, '清晨 · 通勤路上', '#c8a070');
  }

  // 夜间街道（比早晨暗，但仍有路灯暖光）
  _streetNight(c) {
    const W = this.SW, H = this.SH;
    const groundY = H * 0.64;
    this._vGradient(c, 0, 0, W, groundY, 0x1a1a3a, 0x2a2440);
    // 路灯暖光球
    this._glowOrb(c, W * 0.3, H * 0.3, 18, 0xffc870, 4);
    this._glowOrb(c, W * 0.7, H * 0.35, 18, 0xffc870, 4);
    // 楼群剪影
    const bw = 130;
    for (let i = 0; i < Math.ceil(W / bw); i++) {
      const bh = 100 + ((i * 137) % 260);
      this._rect(c, i * bw, groundY - bh, bw - 14, bh, 0x181828, 0.9);
      for (let wy = groundY - bh + 18; wy < groundY - 18; wy += 30)
        for (let wx = i * bw + 10; wx < i * bw + bw - 24; wx += 28)
          if ((wx * 7 + wy * 3) % 7 < 2)
            this._rect(c, wx, wy, 10, 14, 0xffe090, 0.5);
    }
    this._rect(c, 0, groundY, W, H - groundY, 0x1a1a24);
    this._label(c, '深夜 · 街上', '#8a8ab0');
  }

  // 地铁/通勤
  _subway(c) {
    const W = this.SW, H = this.SH;
    this._vGradient(c, 0, 0, W, H, 0x202030, 0x161620);
    // 隧道弧顶
    this._circle(c, W / 2, H * 0.1, W * 0.6, 0x2a2a3a, 0.5);
    this._rect(c, 0, H * 0.12, W, 4, 0x3a3a4a);
    // 月台地面
    this._rect(c, 0, H * 0.6, W, H * 0.4, 0x2e2e38);
    // 车厢入口轮廓（亮色框——"车门要开了"）
    this._rect(c, W * 0.25, H * 0.25, W * 0.5, H * 0.42, 0x3a3a48, 0.8);
    this._rect(c, W * 0.25, H * 0.25, W * 0.5, H * 0.42, 0x000000, 0).setStrokeStyle(4, 0x6a8ab8, 0.6);
    // 车窗里的暖光
    for (let i = 0; i < 5; i++) {
      const wx = W * 0.3 + i * (W * 0.1);
      this._rect(c, wx, H * 0.32, 60, 50, 0xffd890, 0.15);
    }
    this._label(c, '通勤', '#8a9ab8');
  }

  // 大堂：明亮高挑空间
  _lobby(c) {
    const W = this.SW, H = this.SH;
    this._vGradient(c, 0, 0, W, H, 0xf0f4f8, 0xd0d8e0);
    // 立柱
    for (const x of [W * 0.15, W * 0.4, W * 0.6, W * 0.85]) {
      this._rect(c, x - 24, 0, 48, H * 0.75, 0xe0e6ec);
      this._rect(c, x - 24, 0, 8, H * 0.75, 0xffffff, 0.5);
    }
    // 大理石地面
    this._rect(c, 0, H * 0.7, W, H * 0.3, 0xc4ccd8);
    this._rect(c, 0, H * 0.7, W, 4, 0xffffff, 0.4);
    // 闸机（绿灯——通行）
    for (let i = 0; i < 5; i++) {
      const x = W * 0.3 + i * 88;
      this._rect(c, x, H * 0.6, 18, 100, 0x6a7284);
      this._glowOrb(c, x + 9, H * 0.62, 5, 0x4eff8a, 2);
    }
    // 前台桌
    this._rect(c, W * 0.7, H * 0.5, 260, 80, 0x8a7e6a);
    this._rect(c, W * 0.7, H * 0.5, 260, 6, 0xb0a48e);
    this._label(c, '公司大堂', '#6a6a7e');
  }

  // 家/出租屋：暖光小房间（深夜模式更暗）
  _home(c, night) {
    const W = this.SW, H = this.SH;
    // 墙壁：暖褐（白天）或深蓝褐（夜晚）
    this._rect(c, 0, 0, W, H, night ? 0x1e1a28 : 0x3a2e24);
    this._rect(c, 0, H * 0.72, W, H * 0.28, night ? 0x2a2430 : 0x4a3a2e);
    // 窗户：夜景
    const wx = W * 0.08, wy = H * 0.14, ww = 280, wh = 300;
    this._vGradient(c, wx, wy, ww, wh, 0x2a2a48, 0x141428);
    // 窗外远景灯光（小亮点）
    for (let i = 0; i < 14; i++) {
      const dx = wx + 20 + (i * 53 % (ww - 40));
      const dy = wy + 20 + (i * 71 % (wh - 60));
      this._rect(c, dx, dy, 3, 3, 0xffe8a0, 0.7);
    }
    // 月亮（发光圆，不用 emoji）
    this._glowOrb(c, wx + ww * 0.72, wy + 50, 14, 0xfff0c8, 3);
    // 窗框
    this._rect(c, wx + ww / 2 - 3, wy, 6, wh, night ? 0x4a4438 : 0x6a5a4a);
    this._rect(c, wx, wy + wh / 2 - 3, ww, 6, night ? 0x4a4438 : 0x6a5a4a);
    // 台灯暖光（发光球）
    const lampX = W * 0.78, lampY = H * 0.34;
    this._glowOrb(c, lampX, lampY, 60, night ? 0xffc060 : 0xffd080, 4);
    // 桌子（像素矩形）
    this._rect(c, W * 0.55, H * 0.56, 280, 100, night ? 0x4a3e34 : 0x6a5240);
    this._rect(c, W * 0.55, H * 0.56, 280, 5, night ? 0x5a4e40 : 0x7a6248);
    // 笔记本电脑（像素块轮廓——屏幕发光）
    this._rect(c, W * 0.62, H * 0.48, 80, 56, 0x1a1a24);
    this._rect(c, W * 0.62 + 4, H * 0.48 + 4, 72, 44, 0x2a4a6a, 0.6);
    // 床（色块）
    this._rect(c, W * 0.76, H * 0.66, 320, 140, night ? 0x5a4458 : 0x7a5a6a);
    this._rect(c, W * 0.76, H * 0.66, 320, 10, night ? 0x6a5468 : 0x8a6a7a);
    if (night) this._rect(c, 0, 0, W, H, 0x08081a, 0.3);
    this._label(c, night ? '深夜的出租屋' : '出租屋', night ? '#9a8ab0' : '#c8a878');
  }

  // 医院：偏暖白（不冰冷，病房有晨光——"会好起来的"）
  _hospital(c) {
    const W = this.SW, H = this.SH;
    // 暖白渐变（不是惨白冷色，加入一丝暖意）
    this._vGradient(c, 0, 0, W, H, 0xf4f0ec, 0xe0e8e4);
    // 走廊两侧墙
    this._rect(c, 0, 0, W * 0.14, H, 0xdce4e0);
    this._rect(c, W * 0.86, 0, W * 0.14, H, 0xdce4e0);
    // 地面
    this._rect(c, 0, H * 0.6, W, H * 0.4, 0xd8e0dc);
    this._rect(c, 0, H * 0.6, W, 4, 0xc0c8c4);
    // 窗户射入暖光（右侧）
    this._vGradient(c, W * 0.86, H * 0.15, W * 0.14, H * 0.4, 0xfff0c8, 0xf0d8a0, 10);
    this._rect(c, W * 0.85, 0, W * 0.15, H, 0xfff0c8, 0.06);
    // 灯管（柔光）
    for (const x of [W * 0.35, W * 0.55]) {
      this._rect(c, x, 36, 80, 10, 0xfff8e8, 0.8);
      this._glowOrb(c, x + 40, 40, 20, 0xfff8e0, 2);
    }
    // 病床（像素块 + 被子色块——暖色被套，不是惨白）
    this._rect(c, W * 0.35, H * 0.62, 300, 70, 0xe8e4dc);
    this._rect(c, W * 0.35, H * 0.62, 300, 8, 0xd0ccc4);
    this._rect(c, W * 0.4, H * 0.58, 100, 40, 0xa8c4d8, 0.7); // 枕头
    // 床头监护仪（小亮点，安静不刺眼）
    this._rect(c, W * 0.68, H * 0.52, 40, 30, 0x1a2a2a);
    this._rect(c, W * 0.68 + 4, H * 0.52 + 4, 32, 22, 0x2a5a4a, 0.5);
    this._label(c, '医院', '#7a8a8e');
  }

  // 茶水间
  _pantry(c) {
    const W = this.SW, H = this.SH;
    this._vGradient(c, 0, 0, W, H, 0x3e3830, 0x2e2820);
    this._rect(c, 0, H * 0.6, W, H * 0.4, 0x4a4438);
    // 台面
    this._rect(c, W * 0.25, H * 0.42, W * 0.5, 120, 0x6a6258);
    this._rect(c, W * 0.25, H * 0.42, W * 0.5, 6, 0x7a7268);
    // 咖啡机（像素块 + 发热红点）
    this._rect(c, W * 0.35, H * 0.3, 40, 70, 0x2a2a2e);
    this._rect(c, W * 0.35 + 6, H * 0.3 + 6, 28, 30, 0x4a3a2a);
    this._glowOrb(c, W * 0.35 + 20, H * 0.3 + 62, 4, 0xff6040, 2);
    // 杯子（圆）
    this._circle(c, W * 0.5, H * 0.5, 14, 0xf0f0f0, 0.8);
    this._circle(c, W * 0.5, H * 0.5, 10, 0x6a4a3a, 0.6);
    // 水龙头
    this._rect(c, W * 0.62, H * 0.35, 8, 40, 0x8a8a9a);
    this._rect(c, W * 0.6, H * 0.35, 30, 8, 0x8a8a9a);
    this._label(c, '茶水间', '#c8b898');
  }

  // 窗边：大窗 + 窗外远景（希望感——远处有光）
  _window(c) {
    const W = this.SW, H = this.SH;
    this._rect(c, 0, 0, W, H, 0x222830);
    // 大窗：窗外是黎明/黄昏过渡——"天要亮了"
    this._vGradient(c, W * 0.18, H * 0.08, W * 0.64, H * 0.74, 0x4a5a78, 0x8a6a58);
    // 远处城市灯光
    for (let i = 0; i < 24; i++) {
      const dx = W * 0.2 + (i * 97 % (W * 0.58));
      const dy = H * 0.1 + (i * 53 % (H * 0.6));
      this._rect(c, dx, dy, 3, 4, 0xffe8a0, 0.5);
    }
    // 朝阳/月亮（发光球，在窗外远处）
    this._glowOrb(c, W * 0.65, H * 0.2, 18, 0xffe8b0, 4);
    // 窗框十字
    this._rect(c, W * 0.5 - 3, H * 0.08, 6, H * 0.74, 0x4a4a56);
    this._rect(c, W * 0.18, H * 0.45 - 3, W * 0.64, 6, 0x4a4a56);
    // 窗台 + 小绿植（生机）
    this._rect(c, W * 0.3, H * 0.82, W * 0.4, 12, 0x5a5048);
    this._rect(c, W * 0.4, H * 0.76, 24, 20, 0x4a6a3a); // 绿植
    this._rect(c, W * 0.4 + 4, H * 0.73, 16, 8, 0x5a7a4a);
    this._label(c, '窗边', '#9ab0c8');
  }

  // 工位近景：双屏 + 绿植（代码行用绿/蓝色块，不扎眼）
  _desk(c) {
    const W = this.SW, H = this.SH;
    this._vGradient(c, 0, 0, W, H, 0x2a2a32, 0x1e1e26);
    this._rect(c, 0, H * 0.6, W, H * 0.4, 0x363640); // 桌面
    // 显示器1
    this._rect(c, W * 0.28, H * 0.26, 280, 190, 0x0e0e14);
    this._rect(c, W * 0.28 + 8, H * 0.26 + 8, 264, 174, 0x181820);
    // 屏幕代码行（柔绿/蓝）
    for (let i = 0; i < 6; i++)
      this._rect(c, W * 0.28 + 20, H * 0.26 + 24 + i * 22, 100 + (i * 37 % 130), 6, 0x4a8a5a, 0.4);
    // 显示器2
    this._rect(c, W * 0.56, H * 0.26, 280, 190, 0x0e0e14);
    this._rect(c, W * 0.56 + 8, H * 0.26 + 8, 264, 174, 0x181820);
    for (let i = 0; i < 5; i++)
      this._rect(c, W * 0.56 + 20, H * 0.26 + 24 + i * 22, 80 + (i * 53 % 120), 6, 0x5a7aaa, 0.35);
    // 键盘（像素块）
    this._rect(c, W * 0.4, H * 0.7, 240, 50, 0x1a1a22);
    for (let r = 0; r < 3; r++)
      for (let cc = 0; cc < 10; cc++)
        this._rect(c, W * 0.4 + 10 + cc * 22, H * 0.7 + 8 + r * 14, 16, 10, 0x2a2a32);
    // 绿植（工位旁的生机）
    this._rect(c, W * 0.75, H * 0.74, 28, 30, 0x6a5a48); // 花盆
    this._rect(c, W * 0.75 + 4, H * 0.66, 20, 20, 0x3a6a3a); // 叶
    this._rect(c, W * 0.75 + 8, H * 0.62, 12, 10, 0x4a7a4a);
    this._label(c, '你的工位', '#8ab0c8');
  }

  // 会议室
  _meetingRoom(c) {
    const W = this.SW, H = this.SH;
    this._vGradient(c, 0, 0, W, H, 0x303038, 0x222228);
    // 长桌
    this._rect(c, W * 0.15, H * 0.42, W * 0.7, H * 0.3, 0x4a4038);
    this._rect(c, W * 0.15, H * 0.42, W * 0.7, 6, 0x5a5048);
    // 椅子轮廓
    for (let i = 0; i < 6; i++) {
      this._rect(c, W * 0.2 + i * (W * 0.11), H * 0.36, 60, 20, 0x2a2a32); // 上排
      this._rect(c, W * 0.2 + i * (W * 0.11), H * 0.74, 60, 20, 0x2a2a32); // 下排
    }
    // 投影屏
    this._rect(c, W * 0.3, H * 0.12, W * 0.4, H * 0.2, 0x1a1a24);
    this._rect(c, W * 0.3 + 6, H * 0.12 + 6, W * 0.4 - 12, H * 0.2 - 12, 0x2a3a4a, 0.4);
    for (let i = 0; i < 3; i++)
      this._rect(c, W * 0.32, H * 0.14 + i * 20, W * 0.3, 6, 0x5a8a9a, 0.3);
    this._label(c, '会议室', '#8a9ab0');
  }

  // 校园夜景（回忆——温暖，不伤感）
  _campus(c) {
    const W = this.SW, H = this.SH;
    this._vGradient(c, 0, 0, W, H * 0.65, 0x2a2a48, 0x3a3050);
    const groundY = H * 0.65;
    // 远处教学楼
    this._rect(c, W * 0.1, groundY - 280, 200, 280, 0x222238, 0.9);
    this._rect(c, W * 0.5, groundY - 220, 180, 220, 0x262640, 0.9);
    // 暖窗
    for (let wy = groundY - 260; wy < groundY - 30; wy += 36) {
      for (let wx = W * 0.1 + 16; wx < W * 0.1 + 184; wx += 34) {
        if ((wx * 3 + wy) % 5 < 2) this._rect(c, wx, wy, 12, 18, 0xffd890, 0.55);
      }
    }
    for (let wy = groundY - 200; wy < groundY - 30; wy += 36) {
      for (let wx = W * 0.5 + 14; wx < W * 0.5 + 166; wx += 34) {
        if ((wx * 5 + wy) % 7 < 2) this._rect(c, wx, wy, 12, 18, 0xffd890, 0.5);
      }
    }
    // 林荫道
    this._rect(c, 0, groundY, W, H - groundY, 0x2a2438);
    // 路灯暖光
    this._glowOrb(c, W * 0.2, H * 0.45, 16, 0xffc870, 3);
    this._glowOrb(c, W * 0.8, H * 0.5, 16, 0xffc870, 3);
    this._label(c, '校园 · 夜', '#a098b8');
  }

  // 健身房傍晚
  _gym(c) {
    const W = this.SW, H = this.SH;
    this._vGradient(c, 0, 0, W, H, 0x2a3038, 0x1e242a);
    // 镜面墙
    this._rect(c, 0, 0, W, H * 0.7, 0x3a444c, 0.5);
    // 地面
    this._rect(c, 0, H * 0.7, W, H * 0.3, 0x2a2e34);
    // 器材轮廓（抽象色块）
    this._rect(c, W * 0.2, H * 0.4, 120, 160, 0x404a52);
    this._rect(c, W * 0.2, H * 0.4, 120, 6, 0x505a62);
    this._rect(c, W * 0.6, H * 0.45, 100, 140, 0x3a444c);
    // 暖光
    this._glowOrb(c, W * 0.5, H * 0.15, 30, 0xffd890, 3);
    this._label(c, '健身房', '#8aa0b0');
  }

  // 档案室
  _archive(c) {
    const W = this.SW, H = this.SH;
    this._vGradient(c, 0, 0, W, H, 0x2e2820, 0x221e18);
    // 档案柜排
    for (let i = 0; i < 5; i++) {
      const x = W * 0.1 + i * (W * 0.16);
      this._rect(c, x, H * 0.1, W * 0.12, H * 0.7, 0x4a4034);
      for (let r = 0; r < 6; r++)
        this._rect(c, x + 6, H * 0.14 + r * H * 0.1, W * 0.12 - 12, 6, 0x5a4e3c);
    }
    // 台灯
    this._glowOrb(c, W * 0.5, H * 0.85, 40, 0xffc870, 3);
    this._label(c, '档案室', '#b0a088');
  }

  // 过渡黑屏（转场用——但留一丝光，不绝望）
  _transition(c) {
    const W = this.SW, H = this.SH;
    this._rect(c, 0, 0, W, H, 0x080810);
    // 中心一点微光——"不是结束"
    this._glowOrb(c, W / 2, H / 2, 8, 0x3a3a5a, 4);
  }

  // 兜底
  _generic(c, bgKey) {
    const W = this.SW, H = this.SH;
    this._vGradient(c, 0, 0, W, H, 0x1e1e2a, 0x141420);
    this._label(c, bgKey, '#5a5a6e');
  }
}
