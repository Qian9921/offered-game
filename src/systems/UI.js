// UI.js — 统一 UI 工具：自适应按钮工厂 + 可爱主题 + 圆角面板/进度条。
// 根治"文字被框挡/溢出"：先创建文本量出真实宽高，再画比文字大一圈的框，
// 框永远包住文字（padX/padY 冗余），文字与框严格居中。全场景复用，杜绝硬编码框尺寸。

// ===== 统一可爱主题（单一色源，全局协调）=====
export const THEME = {
  gold: 0xd4a353, goldBright: 0xffd24d,
  panel: 0x20203a, panelSoft: 0x282844, panelDark: 0x14141f,
  stroke: 0x4a4a6a, strokeSoft: 0x3a3a52,
  text: '#f0eefa', textMuted: '#a6acc4', textDim: '#6a6a82',
  blue: 0x6fb2e8, green: 0x7bd88f, pink: 0xe89ac0, purple: 0xc79ae8, orange: 0xe8a86f,
  bg: 0x1a1a2e,
};
// 轮换的柔和点缀色（选项徽章/装饰）
export const TONES = [0x6fb2e8, 0x7bd88f, 0xe8a86f, 0xc79ae8, 0xe89ac0];

/**
 * 可爱圆角面板：柔和底 + 圆角 + 描边（可选顶部高光条）。返回 Graphics。
 * @param {Phaser.Scene} scene
 * @param {object} o { x,y,w,h,radius=20,fill=THEME.panel,alpha=0.98,stroke=THEME.gold,strokeW=2,glow=false }
 */
export function makeCutePanel(scene, o = {}) {
  const { x, y, w, h } = o;
  const radius = o.radius ?? 20;
  const fill = o.fill ?? THEME.panel;
  const alpha = o.alpha ?? 0.98;
  const stroke = o.stroke ?? THEME.gold;
  const strokeW = o.strokeW ?? 2;
  const g = scene.add.graphics();
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  if (o.glow) { // 顶部一抹柔光
    g.fillStyle(0xffffff, 0.06);
    g.fillRoundedRect(x - w / 2 + 4, y - h / 2 + 4, w - 8, h * 0.4, radius - 4);
  }
  g.lineStyle(strokeW, stroke, 1);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  return g;
}

/**
 * 可爱进度条（圆角轨道 + 圆角填充）。返回容器。
 * @param {object} o { x,y,w,h=10,value,max=1,color=THEME.gold,track=0x2a2a3e }
 */
export function makeProgressBar(scene, o = {}) {
  const { x, y, w } = o;
  const h = o.h ?? 10;
  const color = o.color ?? THEME.gold;
  const track = o.track ?? 0x2a2a3e;
  const ratio = Math.max(0, Math.min(1, (Number(o.value) || 0) / (Number(o.max) || 1)));
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(track, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  if (ratio > 0) { g.fillStyle(color, 1); g.fillRoundedRect(-w / 2, -h / 2, Math.max(h, w * ratio), h, h / 2); }
  c.add(g);
  c.setData('redraw', (v, max) => {
    const r = Math.max(0, Math.min(1, (Number(v) || 0) / (Number(max) || 1)));
    g.clear();
    g.fillStyle(track, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    if (r > 0) { g.fillStyle(color, 1); g.fillRoundedRect(-w / 2, -h / 2, Math.max(h, w * r), h, h / 2); }
  });
  return c;
}

/**
 * 自适应按钮：框尺寸由 label 实测决定，绝不溢出。
 * @param {Phaser.Scene} scene
 * @param {object} o
 *   x,y            按钮中心
 *   label          文本
 *   fontSize       字号（数字 px，默认 22）
 *   color          文字色（默认 #e8e8f4）
 *   fill           填充色（默认 0x2a2a44）
 *   stroke         描边色（默认 0x5a5a8a）
 *   minW           最小宽度（默认 0）
 *   padX,padY      内边距（默认 32 / 18）
 *   fontStyle      默认 'bold'
 *   letterSpacing  默认 2
 *   depth          默认不设
 *   onClick        点击回调
 *   sound          点击音（AudioSystem.uiClick），传 fn
 * @returns {{btn, label, width, height, setLabel}}
 */
export function makeButton(scene, o) {
  const fontSize = o.fontSize ?? 22;
  const padX = o.padX ?? 32;
  const padY = o.padY ?? 18;
  const style = {
    fontSize: `${fontSize}px`,
    color: o.color ?? '#e8e8f4',
    fontStyle: o.fontStyle ?? 'bold',
    letterSpacing: o.letterSpacing ?? 2,
    align: 'center',
  };
  // 先量文字定框尺寸
  const label = scene.add.text(0, 0, o.label, style).setOrigin(0.5);
  const w = Math.max(o.minW ?? 0, Math.ceil(label.width) + padX * 2);
  const h = Math.ceil(label.height) + padY * 2;
  const fill = o.fill ?? 0x2a2a44;
  const stroke = o.stroke ?? 0x5a5a8a;
  const hi = Phaser.Display.Color.IntegerToColor(fill).lighten(16).color;
  const radius = Math.min(18, Math.floor(h / 2));
  const c = scene.add.container(o.x, o.y);
  if (o.depth != null) c.setDepth(o.depth);
  const g = scene.add.graphics();
  let selected = false;
  const draw = (state) => {
    g.clear();
    g.fillStyle(state === 'hover' ? hi : fill, o.alpha ?? 0.96);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    g.lineStyle(selected ? 4 : 2.5, selected ? 0xfff0a0 : stroke, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  };
  draw('normal');
  c.add(g); c.add(label);
  const zone = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
  c.add(zone);
  zone.on('pointerover', () => { draw('hover'); scene.tweens.add({ targets: c, scale: 1.04, duration: 120, ease: 'Back.out' }); });
  zone.on('pointerout', () => { draw('normal'); scene.tweens.add({ targets: c, scale: selected ? 1.05 : 1, duration: 120 }); });
  if (o.onClick) zone.on('pointerdown', () => { if (o.sound) o.sound(); o.onClick(); });
  return {
    btn: c, container: c, label, width: w, height: h,
    setLabel: (s) => { label.setText(s); },
    setSelected: (v) => {
      selected = v; draw('normal');
      scene.tweens.add({ targets: c, scale: v ? 1.05 : 1, duration: 150, ease: 'Back.out' });
    },
    destroy: () => { c.destroy(true); },
  };
}

/**
 * 可爱圆角选项框：圆角底板 + 彩色序号徽章 + 弹入 + hover 放大。
 * 返回一个 Container（调用方 add 到父容器或直接留在场景，destroy 时随父容器一起销毁）。
 * @param {Phaser.Scene} scene
 * @param {object} o
 *   x,y      中心
 *   w,h      尺寸
 *   label    文本
 *   index    从 0 起的序号（画彩色徽章 index+1；null 则不画徽章）
 *   tone     主题色（描边/徽章）
 *   fontSize 字号（默认 22）
 *   onClick  点击回调
 *   sound    点击音（fn）
 *   popDelay 弹入延迟 ms（交错动画用，默认 0）
 * @returns {Phaser.GameObjects.Container}
 */
export function makeCuteChoice(scene, o) {
  const tone = o.tone ?? 0x6fb2e8;
  const w = o.w, h = o.h;
  const hasBadge = o.index != null;
  // scrollFactor：双相机 UI(WorldScene)用 0；单相机缩放场景(OpeningScene)用 1。默认 0 向后兼容。
  const sf = o.scrollFactor ?? 0;
  const c = scene.add.container(o.x, o.y).setScrollFactor(sf);
  const g = scene.add.graphics().setScrollFactor(sf);
  const radius = Math.min(16, Math.floor(h / 2));
  const draw = (hover) => {
    g.clear();
    g.fillStyle(hover ? 0x33334e : 0x232338, 0.98);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    g.lineStyle(3, hover ? tone : 0x5a5a7a, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  };
  draw(false);
  c.add(g);
  let labelX = 0;
  if (hasBadge) {
    const bx = -w / 2 + 28;
    c.add(scene.add.circle(bx, 0, 14, tone, 1).setScrollFactor(sf));
    c.add(scene.add.text(bx, 0, `${o.index + 1}`, {
      fontSize: '16px', color: '#16161f', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(sf));
    labelX = 16;
  }
  c.add(scene.add.text(labelX, 0, o.label, {
    fontSize: `${o.fontSize ?? 22}px`, color: '#ffffff', align: 'center',
    wordWrap: { width: w - (hasBadge ? 96 : 44), useAdvancedWrap: true },
  }).setOrigin(0.5).setScrollFactor(sf));
  const zone = scene.add.zone(0, 0, w, h).setScrollFactor(sf).setInteractive({ useHandCursor: true });
  c.add(zone);
  zone.on('pointerover', () => { draw(true); scene.tweens.add({ targets: c, scale: 1.04, duration: 120, ease: 'Back.out' }); });
  zone.on('pointerout', () => { draw(false); scene.tweens.add({ targets: c, scale: 1, duration: 120 }); });
  zone.on('pointerdown', () => { if (o.sound) o.sound(); if (o.onClick) o.onClick(); });
  // 弹入
  c.setScale(0);
  scene.tweens.add({ targets: c, scale: 1, duration: 300, delay: o.popDelay ?? 0, ease: 'Back.out' });
  c._zone = zone;
  return c;
}
