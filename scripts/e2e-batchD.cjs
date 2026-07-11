// 批次D E2E：从读小说到玩。验证 bg 真换景、状态演出染色、耗竭减速、关键抉择演出。
// 运行：先 npm run dev，再 node scripts/e2e-batchD.cjs
const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = process.env.BASE_URL || 'http://localhost:5173';
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? ' → ' + d : ''}`); } };

(async () => {
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1920, height: 1080 });
  const errors = [];
  p.on('pageerror', e => errors.push('PAGEERR: ' + String(e).slice(0, 200)));
  p.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });

  console.log('\n=== 批次D 从读小说到玩 E2E ===\n');
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wdwtb_onboarded', '1'); });
  await sleep(1200);
  await p.evaluate(() => window.__game.scene.start('WorldScene', { career: 'programmer', act: 1, day: 1 }));
  await sleep(3000);
  ok('WorldScene 启动无报错', errors.length === 0, errors[0]);

  // 1. 环境滤镜层 + 情绪染色层已创建
  const overlays = await p.evaluate(() => {
    const ws = window.__game.scene.getScene('WorldScene');
    return { hasAmbient: !!ws._ambientOverlay, hasMood: !!ws._moodTint };
  });
  ok('环境滤镜层已创建', overlays.hasAmbient);
  ok('情绪染色层已创建', overlays.hasMood);

  // 2. bgChange 真换景（不再 console.log）
  errors.length = 0;
  const ambient = await p.evaluate(async () => {
    const ws = window.__game.scene.getScene('WorldScene');
    // 触发深夜场景
    ws.dialogueEngine.emit('bgChange', 'office_996');
    await new Promise(r => setTimeout(r, 1000));
    const nightAlpha = ws._ambientOverlay.alpha;
    // 换白天
    ws.dialogueEngine.emit('bgChange', 'street_morning');
    await new Promise(r => setTimeout(r, 1000));
    const morningColor = ws._ambientOverlay.fillColor;
    return { nightAlpha, morningColor };
  });
  ok('bgChange 深夜场景染暗（alpha>0）', ambient.nightAlpha > 0.2, 'alpha=' + ambient.nightAlpha);
  ok('bgChange 切换环境色（晨光）', ambient.morningColor === 0xffdca8, '0x' + ambient.morningColor.toString(16));
  ok('换景无报错', errors.length === 0, errors[0]);

  // 3. 状态演出：高压力染红
  errors.length = 0;
  const stressFx = await p.evaluate(async () => {
    const ws = window.__game.scene.getScene('WorldScene');
    ws.stateSystem.set('health', 80); ws.stateSystem.set('energy', 80);
    ws.stateSystem.set('stress', 80); // 高压
    ws.stateSystem.set('passion', 50);
    // 触发一帧 update
    ws._updateMoodFx(5000);
    await new Promise(r => setTimeout(r, 800));
    return { mood: ws._moodState, tintColor: ws._moodTint.fillColor, tintAlpha: ws._moodTint.alpha };
  });
  ok('高压力 → 情绪态=stress', stressFx.mood === 'stress', JSON.stringify(stressFx));
  ok('高压力 → 屏幕染红', stressFx.tintColor === 0x8a1a1a);

  // 4. 状态演出：耗竭染褐 + 减速
  const drainedFx = await p.evaluate(async () => {
    const ws = window.__game.scene.getScene('WorldScene');
    ws.stateSystem.set('health', 25); // 耗竭
    ws.stateSystem.set('stress', 30);
    ws._updateMoodFx(6000);
    await new Promise(r => setTimeout(r, 300));
    return { mood: ws._moodState, speedMul: ws._moodSpeedMul };
  });
  ok('耗竭 → 情绪态=drained', drainedFx.mood === 'drained', JSON.stringify(drainedFx));
  ok('耗竭 → 移动减速（speedMul<1）', drainedFx.speedMul < 1, 'mul=' + drainedFx.speedMul);

  // 5. 状态演出：心流染暖金
  const flowFx = await p.evaluate(async () => {
    const ws = window.__game.scene.getScene('WorldScene');
    ws.stateSystem.set('health', 80); ws.stateSystem.set('energy', 80);
    ws.stateSystem.set('stress', 30); ws.stateSystem.set('passion', 80); // 心流
    ws._updateMoodFx(7000);
    await new Promise(r => setTimeout(r, 300));
    return { mood: ws._moodState };
  });
  ok('高热情低压 → 情绪态=flow（心流）', flowFx.mood === 'flow', JSON.stringify(flowFx));

  // 6. 关键抉择即时演出（不报错）
  errors.length = 0;
  await p.evaluate(async () => {
    const ws = window.__game.scene.getScene('WorldScene');
    // 人生抉择
    ws._reactToChoice({ label: '辞职', tag: 'quit' });
    // 负面选择
    ws._reactToChoice({ label: '加班', tag: 'overwork', effects: { stress: 4, health: -8 } });
    // 正面选择
    ws._reactToChoice({ label: '照顾自己', tag: 'self_care', effects: { health: 3 } });
    await new Promise(r => setTimeout(r, 500));
  });
  ok('关键抉择演出无报错', errors.length === 0, errors[0]);

  // 截图：耗竭状态下的画面（看褐色染色演出）
  await p.evaluate(() => {
    const ws = window.__game.scene.getScene('WorldScene');
    ws.stateSystem.set('health', 20); ws.stateSystem.set('energy', 20);
    ws._updateMoodFx(9000);
  });
  await sleep(1000);
  await p.screenshot({ path: '/tmp/mood-drained.png' });
  console.log('  📷 耗竭状态截图: /tmp/mood-drained.png');

  await b.close();
  console.log(`\n${fail === 0 ? '✅ ALL PASSED' : '❌ ' + fail + ' FAILED'} (${pass} passed, ${fail} failed)\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('E2E 崩溃:', e); process.exit(1); });
