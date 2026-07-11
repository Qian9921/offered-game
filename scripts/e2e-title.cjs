// e2e：标题界面完整交互——多按钮 / 存档面板 / 设置面板 / 制作组 / 旧档迁移
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1920, height: 1080 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  let ok = 0, bad = 0;
  const t = (n, c, d) => {
    c ? ok++ : bad++;
    console.log((c ? '✓ ' : '✗ ') + n + (c ? '' : ' → ' + (d || '')));
  };

  const allTexts = async () => p.evaluate(() => {
    const out = [];
    const walk = (list) => list.forEach((o) => {
      if (o.text) out.push(o.text);
      if (o.list) walk(o.list);
    });
    const s = window.__game.scene.getScene('TitleScene');
    if (s && s.children) walk(s.children.list);
    return out;
  });

  const clickByText = async (substr) => p.evaluate((substr) => {
    const s = window.__game.scene.getScene('TitleScene');
    if (!s) return false;
    // 找到含 substr 的文字，然后找与之重叠的交互矩形（makeButton 的 btn）
    let target = null;
    const allObjs = [];
    const walk = (list) => list.forEach((o) => {
      allObjs.push(o);
      if (o.list) walk(o.list);
    });
    walk(s.children.list);
    // 1) 找文字
    const txt = allObjs.find(o => o.text && o.text.includes(substr));
    if (!txt) return false;
    // 2) 找与文字重叠的交互矩形
    const rect = allObjs.find(o =>
      o.type === 'Rectangle' && o.input && o.input.enabled &&
      Math.abs(o.x - txt.x) < 10 && Math.abs(o.y - txt.y) < 10
    );
    if (rect) { rect.emit('pointerdown'); return true; }
    // 3) 如果没有矩形（overlay 按钮=纯文字+交互），直接点文字
    if (txt.input && txt.input.enabled) { txt.emit('pointerdown'); return true; }
    return false;
  }, substr);

  const restartTitle = async () => {
    await p.evaluate(() => {
      const s = window.__game.scene.getScene('TitleScene');
      if (s) { s._overlayActive = false; if (s._overlay) { s._overlay.destroy(true); s._overlay = null; } }
      window.__game.scene.start('TitleScene');
    });
    await sleep(1500);
  };

  // ===== 1. 无档状态：4 个按钮（无"继续游戏"）=====
  await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await p.evaluate(() => localStorage.clear());
  await restartTitle();
  const textsNoSave = await allTexts();
  t('无档时显示"读取存档"', textsNoSave.some((x) => x.includes('读取存档')));
  t('无档时显示"重新开始"', textsNoSave.some((x) => x.includes('重新开始')));
  t('无档时显示"设置"', textsNoSave.some((x) => x.includes('设置')));
  t('无档时显示"制作组"', textsNoSave.some((x) => x.includes('制作组')));
  t('无档时不显示"继续游戏"', !textsNoSave.some((x) => x.includes('继续游戏')));
  t('显示版本号', textsNoSave.some((x) => /v0\./.test(x)));

  // ===== 2. 有档状态：显示"继续游戏" =====
  await p.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('wdwtb_save_1', JSON.stringify({
      version: 2, slot: 1, career: 'programmer', act: 3, subRole: 'dev',
      daySystem: { day: 5 }, updatedAt: Date.now(),
    }));
  });
  await restartTitle();
  const textsWithSave = await allTexts();
  t('有档时显示"继续游戏"', textsWithSave.some((x) => x.includes('继续游戏')));

  // ===== 3. 继续游戏 → 进入 WorldScene =====
  await p.evaluate(() => {
    window.__game.scene.getScene('TitleScene')._handleAction('resume');
  });
  await sleep(2500);
  const inWorld = await p.evaluate(() => {
    const w = window.__game.scene.getScene('WorldScene');
    return !!(w && w.scene.isActive());
  });
  t('继续游戏 → WorldScene 激活', inWorld);

  // ===== 4. 读取存档面板 =====
  await restartTitle();
  await p.evaluate(() => {
    window.__game.scene.getScene('TitleScene')._handleAction('load');
  });
  await sleep(800);
  const loadTexts = await allTexts();
  t('存档面板显示槽位1有存档', loadTexts.some((x) => x.includes('槽位 1') && x.includes('程序员')));
  t('存档面板显示槽位2空', loadTexts.some((x) => x.includes('槽位 2') && x.includes('空')));
  t('存档面板显示槽位3空', loadTexts.some((x) => x.includes('槽位 3') && x.includes('空')));
  t('存档面板有读取按钮', loadTexts.some((x) => x.includes('读取')));

  // ===== 5. 设置面板 =====
  await restartTitle();
  await p.evaluate(() => {
    window.__game.scene.getScene('TitleScene')._handleAction('settings');
  });
  await sleep(800);
  const settingsTexts = await allTexts();
  t('设置面板显示"背景音乐"', settingsTexts.some((x) => x.includes('背景音乐')));
  t('设置面板显示"音效"', settingsTexts.some((x) => x.includes('音效')));
  t('设置面板显示"文字速度"', settingsTexts.some((x) => x.includes('文字速度')));
  t('设置面板显示"叙事辅助"', settingsTexts.some((x) => x.includes('叙事辅助')));

  // ===== 6. 制作组面板 =====
  await restartTitle();
  await p.evaluate(() => {
    window.__game.scene.getScene('TitleScene')._handleAction('credits');
  });
  await sleep(800);
  const creditsTexts = await allTexts();
  t('制作组显示 LimeZu', creditsTexts.some((x) => x.includes('LimeZu')));
  t('制作组显示 Kenney', creditsTexts.some((x) => x.includes('Kenney')));
  t('制作组显示混元', creditsTexts.some((x) => x.includes('混元')));
  t('制作组显示 Phaser', creditsTexts.some((x) => x.includes('Phaser') || x.includes('Vite')));

  // ===== 7. 旧档迁移 =====
  await p.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('wdwtb_save', JSON.stringify({
      version: 2, career: 'lawyer', act: 2, subRole: 'litigation', updatedAt: 1000,
    }));
  });
  await restartTitle();
  const migrated = await p.evaluate(() => {
    return {
      legacyGone: localStorage.getItem('wdwtb_save') === null,
      slot1Has: localStorage.getItem('wdwtb_save_1') !== null,
    };
  });
  t('旧档 wdwtb_save 迁移后删除', migrated.legacyGone);
  t('旧档迁移到 wdwtb_save_1', migrated.slot1Has);

  // ===== 8. 新游戏选槽 =====
  await p.evaluate(() => localStorage.clear());
  await restartTitle();
  await p.evaluate(() => {
    window.__game.scene.getScene('TitleScene')._handleAction('newgame');
  });
  await sleep(800);
  const newGameTexts = await allTexts();
  t('新游戏面板显示3个槽位', newGameTexts.filter((x) => x.includes('槽位')).length >= 3);

  console.log(`\n${ok} passed, ${bad} failed | pageerrors: ${errs.length}`);
  errs.slice(0, 6).forEach((e) => console.log(' ', e));
  await b.close();
  process.exit(bad || errs.length ? 1 : 0);
})();
