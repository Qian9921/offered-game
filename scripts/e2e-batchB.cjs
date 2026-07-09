// 批次B E2E：程序员 Debug 找茬小游戏。验证关卡加载、点对/点错、完成回调、截图看视觉。
// 运行：先 npm run dev，再 node scripts/e2e-batchB.cjs
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

  console.log('\n=== 批次B Debug找茬小游戏 E2E ===\n');
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => localStorage.clear());
  await sleep(1200);

  // 1. debug_puzzles.json 可加载
  const data = await p.evaluate(async () => {
    const r = await fetch('./data/debug_puzzles.json');
    if (!r.ok) return { ok: false };
    const d = await r.json();
    return { ok: true, count: d.puzzles.length, acts: [...new Set(d.puzzles.map(x => x.act))].sort() };
  });
  ok('debug_puzzles.json 可加载', data.ok && data.count >= 6, JSON.stringify(data));
  ok('关卡覆盖 act1-5 难度曲线', data.acts && data.acts.length >= 4, JSON.stringify(data.acts));

  // 2. DebugGameScene 启动 + 关卡渲染
  errors.length = 0;
  const scene = await p.evaluate(async () => {
    window.__game.scene.start('DebugGameScene', { act: 1, fromScene: null, onComplete: () => {} });
    await new Promise(r => setTimeout(r, 700));
    const s = window.__game.scene.getScene('DebugGameScene');
    return {
      active: window.__game.scene.isActive('DebugGameScene'),
      puzzleCount: s.puzzles ? s.puzzles.length : 0,
      rowCount: s.rowZones ? s.rowZones.length : 0,
      bugLine: s.puzzles ? s.puzzles[0].bugLine : null,
    };
  });
  ok('DebugGameScene 启动', scene.active);
  ok('关卡渲染出代码行（可点击）', scene.rowCount >= 3, 'rows=' + scene.rowCount);
  ok('关卡渲染无报错', errors.length === 0, errors[0]);

  await p.screenshot({ path: '/tmp/debug-game.png' });
  console.log('  📷 Debug游戏截图: /tmp/debug-game.png');

  // 3. 点对 bug 行 → 解出 + solved++
  errors.length = 0;
  const correct = await p.evaluate(async () => {
    const s = window.__game.scene.getScene('DebugGameScene');
    const bugLine = s.puzzles[s.idx].bugLine;
    const zone = s.rowZones[bugLine];
    const before = s.solved;
    s._pick(bugLine, zone.bg); // 点对
    await new Promise(r => setTimeout(r, 300));
    return { solvedBefore: before, solvedAfter: s.solved, answered: s.answered };
  });
  ok('点对 bug 行 → solved+1', correct.solvedAfter === correct.solvedBefore + 1, JSON.stringify(correct));
  ok('点对后锁定该题（answered=true）', correct.answered === true);
  ok('点对无报错', errors.length === 0, errors[0]);

  // 4. 点错 bug 行 → 扣时间、不结束
  errors.length = 0;
  const wrong = await p.evaluate(async () => {
    // 重启到新关卡测点错
    window.__game.scene.start('DebugGameScene', { act: 2, fromScene: null, onComplete: () => {} });
    await new Promise(r => setTimeout(r, 700));
    const s = window.__game.scene.getScene('DebugGameScene');
    const bugLine = s.puzzles[s.idx].bugLine;
    const wrongLine = bugLine === 0 ? 1 : 0; // 选一个非bug行
    const timeBefore = s.timeLeft;
    s._pick(wrongLine, s.rowZones[wrongLine].bg); // 点错
    await new Promise(r => setTimeout(r, 200));
    return { timeBefore, timeAfter: s.timeLeft, answered: s.answered };
  });
  ok('点错 bug 行 → 扣时间', wrong.timeAfter < wrong.timeBefore, `${wrong.timeBefore}→${wrong.timeAfter}`);
  ok('点错不结束（可继续找）', wrong.answered === false);
  ok('点错无报错', errors.length === 0, errors[0]);

  // 5. 完整走完 → onComplete 回调带成绩
  errors.length = 0;
  const complete = await p.evaluate(async () => {
    let result = null;
    window.__game.scene.start('DebugGameScene', {
      act: 1, fromScene: null,
      onComplete: (r) => { result = r; },
    });
    await new Promise(r => setTimeout(r, 700));
    const s = window.__game.scene.getScene('DebugGameScene');
    // 自动解出所有关卡
    for (let step = 0; step < 6; step++) {
      if (!window.__game.scene.isActive('DebugGameScene')) break;
      if (s.answered === false) {
        const bl = s.puzzles[s.idx].bugLine;
        s._pick(bl, s.rowZones[bl].bg);
        await new Promise(r => setTimeout(r, 250));
      }
      // 推进（点击继续）
      s.input.emit('pointerdown');
      await new Promise(r => setTimeout(r, 250));
    }
    return result;
  });
  ok('走完 debug 游戏触发 onComplete', complete !== null, JSON.stringify(complete));
  ok('onComplete 带 correct/total 成绩', complete && typeof complete.correct === 'number' && complete.total >= 1, JSON.stringify(complete));
  ok('完整流程无报错', errors.length === 0, errors[0]);

  // 6. 程序员职业 minigame:coding 路由到 DebugGameScene（而非选择题）
  errors.length = 0;
  const routing = await p.evaluate(async () => {
    localStorage.setItem('wdwtb_onboarded', '1');
    window.__game.scene.start('WorldScene', { career: 'programmer', act: 1, day: 1 });
    await new Promise(r => setTimeout(r, 2800));
    const ws = window.__game.scene.getScene('WorldScene');
    // 触发 coding 小游戏 action
    ws.dialogueEngine.emit('action', 'minigame:coding', {});
    await new Promise(r => setTimeout(r, 800));
    return {
      debugActive: window.__game.scene.isActive('DebugGameScene'),
      minigameActive: window.__game.scene.isActive('MinigameScene'),
    };
  });
  ok('程序员 coding → 路由到 Debug 找茬（不是选择题）', routing.debugActive && !routing.minigameActive, JSON.stringify(routing));

  await b.close();
  console.log(`\n${fail === 0 ? '✅ ALL PASSED' : '❌ ' + fail + ' FAILED'} (${pass} passed, ${fail} failed)\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('E2E 崩溃:', e); process.exit(1); });
