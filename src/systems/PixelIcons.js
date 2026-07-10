// PixelIcons：程序化生成像素风 UI 图标纹理（替代 emoji——emoji 在像素世界里像贴上去的照片）。
// 全部以白色绘制,使用处 setTint 上色。幂等:纹理已存在则跳过。
//
// 图标 8×8 逻辑像素、每格 PX 实际像素,generateTexture 后用 image 显示,NEAREST 过滤天然锐利。
// 用法:
//   ensurePixelIcons(scene);
//   scene.add.image(x, y, ICON_KEYS.excl).setTint(0xffdd33);

const PX = 3;           // 每个逻辑像素的实际像素数(8×8→24×24 纹理,与原 24px emoji 等大)
const GRID = 8;

// 8×8 点阵:1=实心。手绘像素图标,像素 RPG 语汇。
const GLYPHS = {
  // ❗ 感叹号
  excl: [
    '..111...',
    '..111...',
    '..111...',
    '..111...',
    '..11....',
    '........',
    '..11....',
    '..11....',
  ],
  // ❓ 问号
  quest: [
    '.1111...',
    '11..11..',
    '....11..',
    '...11...',
    '..11....',
    '........',
    '..11....',
    '..11....',
  ],
  // 💬 对话气泡
  chat: [
    '.111111.',
    '11....11',
    '1.1.1.11',
    '11....11',
    '.111111.',
    '...11...',
    '..11....',
    '.1......',
  ],
  // 💤 Z字(睡眠/经营中)
  zzz: [
    '1111....',
    '..11....',
    '.11.....',
    '1111.111',
    '......11',
    '.....11.',
    '....111.',
    '........',
  ],
  // 💾 软盘(保存提示)
  save: [
    '1111111.',
    '1.111.11',
    '1.111.11',
    '1.....11',
    '11111111',
    '11....11',
    '11....11',
    '11111111',
  ],
  // ▸ 目标箭头(任务指路)
  arrow: [
    '11......',
    '1111....',
    '111111..',
    '11111111',
    '11111111',
    '111111..',
    '1111....',
    '11......',
  ],
};

export const ICON_KEYS = Object.fromEntries(Object.keys(GLYPHS).map(k => [k, `pi_${k}`]));

// emoji → 图标 key 的映射(旧数据/名册里仍写 emoji,这里翻译)
export const EMOJI_TO_ICON = {
  '❗': ICON_KEYS.excl,
  '❓': ICON_KEYS.quest,
  '💬': ICON_KEYS.chat,
  '💤': ICON_KEYS.zzz,
  '💾': ICON_KEYS.save,
};

// 在场景中确保所有图标纹理已生成(幂等)
export function ensurePixelIcons(scene) {
  for (const [name, rows] of Object.entries(GLYPHS)) {
    const key = ICON_KEYS[name];
    if (scene.textures.exists(key)) continue;
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0xffffff, 1);
    for (let y = 0; y < GRID; y++) {
      const row = rows[y] || '';
      for (let x = 0; x < GRID; x++) {
        if (row[x] === '1') g.fillRect(x * PX, y * PX, PX, PX);
      }
    }
    g.generateTexture(key, GRID * PX, GRID * PX);
    g.destroy();
  }
}
