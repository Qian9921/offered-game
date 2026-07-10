// 非程序员职业浏览器冒烟：产品（深度完整版）+ 律师（轻量迷你完整版）
// 验证：能进办公室、workLoop 开启、名册 NPC、任务链异步加载、里程碑/轻量经营不炸。
// 运行：npm run test:e2e:careers  或 由 npm run test:e2e 一并调用
const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173';

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; console.log(`  ✗ ${n}${d ? ' → ' + d : ''}`); }
};

async function waitForQuests(page, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const n = await page.evaluate(() => {
      const ws = window.__game?.scene?.getScene('WorldScene');
      if (!ws?.questSystem) return 0;
      return Object.keys(ws.questSystem.defs || {}).length;
    });
    if (n > 0) return n;
    await sleep(200);
  }
  return 0;
}

async function bootWorld(page, data) {
  await page.evaluate((d) => {
    localStorage.setItem('wdwtb_onboarded', '1');
    window.__game.scene.start('WorldScene', d);
  }, data);
  await sleep(3000);
}

(async () => {
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1920, height: 1080 });
  const errors = [];
  p.on('pageerror', e => errors.push(String(e).slice(0, 180)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 180)); });

  console.log('\n=== 非程序员职业冒烟（产品 + 律师）===\n');
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wdwtb_onboarded', '1'); });
  await sleep(800);

  // ---------- 产品 · 业务产品（深度 + workLoop）----------
  errors.length = 0;
  await bootWorld(p, { career: 'product', subRole: 'biz', deep: true, act: 1 });
  let snap = await p.evaluate(() => {
    const ws = window.__game.scene.getScene('WorldScene');
    if (!ws) return { ok: false };
    return {
      ok: true,
      career: ws.career,
      subRole: ws.subRole,
      workLoop: !!ws.workLoopEnabled,
      hasProject: !!ws.projectSystem,
      npcIds: (ws.npcs || []).map(n => n.id),
      seniorName: (ws.npcs || []).find(n => n.id === 'senior')?.name || null,
      storyPhase: ws._story?.phase,
      player: !!(ws.player && ws.player.body),
    };
  });
  ok('产品：WorldScene 已启动', snap.ok);
  ok('产品：career=product', snap.career === 'product', JSON.stringify(snap));
  ok('产品：subRole=biz', snap.subRole === 'biz', JSON.stringify(snap));
  ok('产品：workLoop 开启', snap.workLoop === true);
  ok('产品：有 ProjectSystem', snap.hasProject === true);
  ok('产品：玩家可移动体', snap.player === true);
  ok('产品：story 初始 ready', snap.storyPhase === 'ready', snap.storyPhase);
  ok('产品：名册含 senior', (snap.npcIds || []).includes('senior'), JSON.stringify(snap.npcIds));
  ok('产品：导师是林姐（或非空名）', !!(snap.seniorName), snap.seniorName);
  // 产品 roster 期望有 dev/data/ops 等具名 id
  ok('产品：名册多于 3 人（具名同事）', (snap.npcIds || []).length >= 4, JSON.stringify(snap.npcIds));

  const qn = await waitForQuests(p);
  ok('产品：任务链 defs 已加载', qn >= 3, `defs=${qn}`);
  const qids = await p.evaluate(() => Object.keys(window.__game.scene.getScene('WorldScene').questSystem.defs));
  ok('产品：链含 biz_c1', qids.includes('biz_c1'), qids.slice(0, 8).join(','));

  // 经营期 + 里程碑推进（与程序员同构）
  await p.evaluate(() => {
    const ws = window.__game.scene.getScene('WorldScene');
    ws.dialogueActive = false;
    ws._loadNextAct();
  });
  await sleep(600);
  let phase = await p.evaluate(() => window.__game.scene.getScene('WorldScene')._story.phase);
  ok('产品：next_act → working', phase === 'working', phase);

  const prodAdv = await p.evaluate(async () => {
    const ws = window.__game.scene.getScene('WorldScene');
    ws._story.phase = 'working'; ws.act = 1; ws._story.act = 1;
    ws.projectSystem.adjustProgress(26);
    const senior = ws.npcs.find(n => n.id === 'senior');
    if (senior) ws._interactSenior(senior);
    await new Promise(r => setTimeout(r, 700));
    return { act: ws.act, phase: ws._story.phase, pending: ws._story.pendingAct };
  });
  ok('产品：里程碑可推进到 act2', prodAdv.act === 2, JSON.stringify(prodAdv));
  ok('产品路径无明显 pageerror', errors.filter(e => !/favicon|FontFace|AudioContext/i.test(e)).length === 0,
    errors[0]);

  // ---------- 律师 · 诉讼（轻量 + workLoop）----------
  errors.length = 0;
  await p.evaluate(() => localStorage.clear());
  await bootWorld(p, { career: 'lawyer', subRole: 'litigation', deep: false, act: 1 });
  snap = await p.evaluate(() => {
    const ws = window.__game.scene.getScene('WorldScene');
    if (!ws) return { ok: false };
    return {
      ok: true,
      career: ws.career,
      subRole: ws.subRole,
      workLoop: !!ws.workLoopEnabled,
      hasProject: !!ws.projectSystem,
      npcIds: (ws.npcs || []).map(n => n.id),
      seniorName: (ws.npcs || []).find(n => n.id === 'senior')?.name || null,
      player: !!(ws.player && ws.player.body),
    };
  });
  ok('律师：WorldScene 已启动', snap.ok);
  ok('律师：career=lawyer', snap.career === 'lawyer');
  ok('律师：subRole=litigation', snap.subRole === 'litigation', JSON.stringify(snap));
  ok('律师：workLoop 开启（迷你完整）', snap.workLoop === true);
  ok('律师：有 ProjectSystem', snap.hasProject === true);
  ok('律师：玩家可移动体', snap.player === true);
  ok('律师：名册含 senior', (snap.npcIds || []).includes('senior'));
  ok('律师：名册含 corp/clerk 等', (snap.npcIds || []).some(id => id === 'corp' || id === 'clerk' || id === 'vet'),
    JSON.stringify(snap.npcIds));

  const lqn = await waitForQuests(p);
  ok('律师：任务链 defs 已加载', lqn >= 3, `defs=${lqn}`);
  const lids = await p.evaluate(() => Object.keys(window.__game.scene.getScene('WorldScene').questSystem.defs));
  ok('律师：链含 lt_c1', lids.includes('lt_c1'), lids.slice(0, 8).join(','));

  // 接第一环任务（模拟导师派活）
  const accept = await p.evaluate(() => {
    const ws = window.__game.scene.getScene('WorldScene');
    ws.dialogueActive = false;
    ws._story.phase = 'working'; // 经营期才派链任务
    const av = ws.questSystem.available({ act: ws.act });
    const q = av.find(x => x.giver === 'senior') || av[0];
    if (!q) return { ok: false, av: av.map(x => x.id) };
    const okAcc = ws.questSystem.accept(q.id);
    return { ok: okAcc, id: q.id, active: ws.questSystem.active().map(x => x.id) };
  });
  ok('律师：可接取主线链任务', accept.ok, JSON.stringify(accept));

  // 轻量结局延后：ending 且进度<100 → working（不直接 EndingScene）
  // 通过 Vite 直接 import 已发布的 StoryProgress，禁止内联重写逻辑（防 theater）
  const defer = await p.evaluate(async () => {
    const ws = window.__game.scene.getScene('WorldScene');
    const before = ws.scene.isActive('EndingScene');
    const prog = ws.projectSystem.progress;
    ws.projectSystem.progress = 10;
    const {
      shouldDeferLightEnding,
      enterWorkingFromLightEnding,
    } = await import('/src/systems/StoryProgress.js');
    const deferNow = shouldDeferLightEnding(ws.workLoopEnabled, ws.career, ws.projectSystem.progress);
    if (deferNow) {
      ws._story = enterWorkingFromLightEnding(ws._story, ws.act);
    }
    ws.projectSystem.progress = prog;
    return {
      deferNow,
      phase: ws._story.phase,
      endingWasActive: before,
    };
  });
  ok('律师：light+未满进度应 defer 结局', defer.deferNow === true, JSON.stringify(defer));
  ok('律师：defer 后 phase=working', defer.phase === 'working', JSON.stringify(defer));

  ok('律师路径无明显 pageerror', errors.filter(e => !/favicon|FontFace|AudioContext|404/i.test(e)).length === 0,
    errors[0]);

  await b.close();
  console.log(`\n${fail === 0 ? '✅ ALL PASSED' : '❌ ' + fail + ' FAILED'} (${pass} passed, ${fail} failed)\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('崩溃:', e); process.exit(1); });
