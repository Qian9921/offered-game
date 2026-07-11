// 批次A E2E：遮字修复 + 小游戏3题bug。截图 EndingScene 长金句验证不遮挡。
// 运行：先 npm run dev，再 node scripts/e2e-batchA.cjs
const puppeteer = require('puppeteer');
const fs = require('fs');
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

  console.log('\n=== 批次A 遮字修复 + 小游戏bug E2E ===\n');
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => localStorage.clear());
  await sleep(1200);

  // 1. EndingScene 长金句 + 长段落：验证元素不重叠（用真实 2 行金句 + 长段落）
  errors.length = 0;
  const layout = await p.evaluate(async () => {
    window.__game.scene.start('EndingScene', {
      ending: 'backbone', career: 'programmer',
      stats: { health: 45, energy: 50, san: 40, stress: 70, skill: 60, performance: 55, money: 800, passion: 30 },
      portrait: {
        driveText: '你被"把事情做对"这件事驱动着。每一次代码跑通、每一次需求交付，都在给你一种"我还在往前"的确认感。这种驱动力很纯粹，但也容易让你忘记停下来问自己：往前，是往哪里？',
        drainText: '真正掏空你的，不是加班本身，而是那种"我明明很努力，却好像没人看见"的落差。重复的、看不到意义的活儿，比熬夜更快地磨掉你的热情。',
        stressStyle: '硬扛型。你习惯把压力咽下去，报喜不报忧，直到某个深夜突然扛不住。',
        hiddenPattern: '你有一个自己没察觉的模式：报喜不报忧。你在家人面前说"挺好的"，在同事面前说"没事"，但那些没说出口的累，并没有消失，它们只是被你藏进了更深的地方。',
        fitText: '你和这份职业是契合的，但契合不等于要用健康去换。',
        oneLineForYou: '你不是要成为一个正确的人，而是要认出那个本来的你。',
      },
    });
    await new Promise(r => setTimeout(r, 4000)); // 等揭示动画完成
    const es = window.__game.scene.getScene('EndingScene');
    if (!es || !es.uiContainer) return { ok: false };
    // 收集所有文本元素的世界包围盒，检测两两是否重叠（遮字=重叠）
    const texts = es.uiContainer.list.filter(o => o.type === 'Text' && o.text && o.alpha > 0.5);
    const boxes = texts.map(t => {
      const b = t.getBounds();
      return { text: t.text.slice(0, 12), top: b.top, bottom: b.bottom, left: b.left, right: b.right };
    });
    // 检测垂直重叠（同一水平区域内 y 范围交叠 > 8px 视为遮挡）
    let overlaps = [];
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], c = boxes[j];
        const xOverlap = Math.min(a.right, c.right) - Math.max(a.left, c.left);
        const yOverlap = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
        if (xOverlap > 20 && yOverlap > 10) {
          overlaps.push(`"${a.text}"↕"${c.text}"(${Math.round(yOverlap)}px)`);
        }
      }
    }
    return { ok: true, textCount: texts.length, overlaps };
  });
  ok('EndingScene 渲染成功', layout.ok);
  ok('结局页文字无重叠遮挡（长金句+长段落）', layout.overlaps && layout.overlaps.length === 0,
    layout.overlaps ? layout.overlaps.join(', ') : 'no data');
  ok('结局页渲染无报错', errors.length === 0, errors[0]);

  // 截图存档供人工查看
  await p.screenshot({ path: '/tmp/ending-fixed.png' });
  console.log('  📷 结局页截图: /tmp/ending-fixed.png');

  // 2. 小游戏3题bug：完整走一遍验证3题全部出现
  errors.length = 0;
  const mg = await p.evaluate(async () => {
    let seen = new Set();
    window.__game.scene.start('MinigameScene', {
      type: 'coding',
      onComplete: () => {},
      fromScene: null,
    });
    await new Promise(r => setTimeout(r, 500));
    const ms = window.__game.scene.getScene('MinigameScene');
    // 记录每题（用进度文字判断当前第几题），自动答题走完
    for (let step = 0; step < 10; step++) {
      if (ms.progressText && ms.progressText.text) {
        const m = ms.progressText.text.match(/第 (\d+)\/(\d+)/);
        if (m) seen.add(parseInt(m[1]));
      }
      // 若在题目页（有 answered=false），点第一个选项；等反馈；点继续
      if (ms.ui && ms.answered === false && ms.questions) {
        ms._onSelect(0); // 触发选择→反馈
        await new Promise(r => setTimeout(r, 200));
        // 手动推进（模拟点击继续）
        if (ms._advanceHandler) ms._advanceHandler();
        await new Promise(r => setTimeout(r, 200));
      } else {
        await new Promise(r => setTimeout(r, 200));
      }
      if (!window.__game.scene.isActive('MinigameScene')) break;
    }
    return { seenQuestions: [...seen].sort(), total: ms.questions ? ms.questions.length : 0 };
  });
  ok('小游戏总题数=3', mg.total === 3, 'total=' + mg.total);
  ok('小游戏3题全部出现（修复3题变2题bug）', mg.seenQuestions.length === 3,
    '见到题号: ' + JSON.stringify(mg.seenQuestions));
  ok('小游戏无报错', errors.length === 0, errors[0]);

  // 3. 答案不再全是索引0
  const answers = await p.evaluate(async () => {
    const res = await fetch('./data/minigame_coding.json');
    const d = await res.json();
    return d.questions.map(q => q.answer);
  });
  ok('小游戏答案已打乱（不全是0）', new Set(answers).size > 1, JSON.stringify(answers));

  await b.close();
  console.log(`\n${fail === 0 ? '✅ ALL PASSED' : '❌ ' + fail + ' FAILED'} (${pass} passed, ${fail} failed)\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('E2E 崩溃:', e); process.exit(1); });
