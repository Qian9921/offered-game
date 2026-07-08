import Phaser from 'phaser';

// AssetBrowserScene — 临时素材浏览器，显示 Limezu 339 个办公家具的编号。
const COLS = 15;
const CELL = 64;
const SCALE = 2;
const TOTAL = 339;
const START_X = (960 - COLS * CELL) / 2 + CELL / 2;
const ROWS = Math.ceil(TOTAL / COLS);
const CONTENT_H = ROWS * CELL + 40;

export class AssetBrowserScene extends Phaser.Scene {
  constructor() {
    super('AssetBrowserScene');
  }

  preload() {
    for (let i = 1; i <= TOTAL; i++) {
      this.load.image(`s${i}`, `./assets/limezu/singles16/Modern_Office_Singles_${i}.png`);
    }
    this.load.image('roombuilder', './assets/limezu/roombuilder_16.png');
    this.load.image('office', './assets/limezu/office_16.png');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0d1117');
    this.scrollY = 0;
    this.maxScroll = CONTENT_H - 540;

    // 所有内容放入容器，整体滚动
    this.content = this.add.container(0, 0);

    for (let i = 1; i <= TOTAL; i++) {
      const row = Math.floor((i - 1) / COLS);
      const col = (i - 1) % COLS;
      const cx = START_X + col * CELL;
      const cy = 30 + row * CELL + CELL / 2;

      const key = `s${i}`;
      if (!this.textures.exists(key)) continue;

      const tex = this.textures.get(key);
      const tw = tex.source[0].width;
      const th = tex.source[0].height;

      // 家具缩略图（中心对齐，2x 缩放）
      const img = this.add.image(cx, cy - 6, key).setScale(SCALE).setOrigin(0.5);
      this.content.add(img);

      // 编号
      const label = this.add.text(cx, cy + Math.max(th * SCALE, 10) / 2 + 6, String(i), {
        fontSize: '10px', color: '#8b949e',
      }).setOrigin(0.5);
      this.content.add(label);
    }

    // 标题
    const title = this.add.text(480, 8, `素材浏览器  (${TOTAL} 件)`, {
      fontSize: '14px', color: '#6a6a7a',
    }).setOrigin(0.5, 0);
    // 标题不跟滚动，独立于容器
    title.setScrollFactor(0);

    // 底栏
    const footer = this.add.text(480, 524, '↓ 鼠标滚轮 / 方向键滚动 ↓', {
      fontSize: '12px', color: '#484f58',
    }).setOrigin(0.5);
    footer.setScrollFactor(0);

    // 输入
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.on('wheel', (_pointer, _objects, _dx, dy) => {
      this.scrollY = Phaser.Math.Clamp(this.scrollY - dy * 0.6, -this.maxScroll, 0);
      this.content.y = this.scrollY;
    });
  }

  update() {
    const spd = 6;
    if (this.cursors.up.isDown) this.scrollY = Math.min(0, this.scrollY + spd);
    if (this.cursors.down.isDown) this.scrollY = Math.max(-this.maxScroll, this.scrollY - spd);
    this.content.y = this.scrollY;
  }
}
