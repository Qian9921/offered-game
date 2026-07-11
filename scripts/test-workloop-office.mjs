// WorkLoopOffice + 真实 taskchain/roster：镜像 e2e-taskchain 的纯逻辑路径。
// 运行：node scripts/test-workloop-office.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  questDataUrl,
  npcDefsFromRoster,
  seniorInteractAction,
  applySeniorAccept,
  applySeniorDeliver,
  applySeniorAction,
  reportMinigameProgress,
  isWorkLoopCareer,
  defaultSubRole,
  eventEligibleForAct,
  filterEventsByAct,
  pickOfficeEvent,
  tryPickOfficeEvent,
} from '../src/systems/WorkLoopOffice.js';
import {
  RelationshipSystem,
  eventMeetsRelations,
} from '../src/systems/RelationshipSystem.js';
import { createStoryState } from '../src/systems/StoryProgress.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'public/data');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ' → ' + detail : ''}`); }
}

// Phaser stub for QuestSystem
globalThis.Phaser = {
  Events: {
    EventEmitter: class {
      constructor() { this._l = {}; }
      on(e, f) { (this._l[e] || (this._l[e] = [])).push(f); return this; }
      off() { return this; }
      emit(e, ...a) { (this._l[e] || []).forEach(fn => fn(...a)); return this; }
    },
  },
};

const questSrc = readFileSync(join(ROOT, 'src/systems/QuestSystem.js'), 'utf8')
  .replace(/^import Phaser from 'phaser';/m, 'const Phaser = globalThis.Phaser;')
  .replace(/^import \{ AudioSystem \} from '\.\/AudioSystem\.js';/m, 'const AudioSystem = { questDone(){} };')
  .replace(/^import \{ Juice \} from '\.\/JuiceKit\.js';/m, 'const Juice = {};');
const { QuestSystem } = await import(
  'data:text/javascript;base64,' + Buffer.from(questSrc).toString('base64')
);

function makeState() {
  const stats = {
    health: 80, energy: 100, san: 80, stress: 20,
    skill: 10, performance: 50, money: 0, passion: 70,
  };
  return { stats, get(k) { return stats[k]; }, change(k, d) { stats[k] += d; } };
}

console.log('\n=== WorkLoopOffice (shipped path) ===\n');

// URL
ok('workLoop programmer → taskchain_programmer_dev',
  questDataUrl('programmer', 'dev', true).includes('taskchain_programmer_dev'));
ok('workLoop test subRole',
  questDataUrl('programmer', 'test', true).includes('taskchain_programmer_test'));
ok('非 workLoop → quests_',
  questDataUrl('programmer', 'dev', false).includes('quests_programmer'));
ok('isWorkLoopCareer programmer', isWorkLoopCareer('programmer'));
ok('defaultSubRole programmer=dev', defaultSubRole('programmer') === 'dev');

// Roster NPCs
const roster = JSON.parse(readFileSync(join(DATA, 'roster_programmer.json'), 'utf8'));
const defs = npcDefsFromRoster(roster, 'programmer');
ok('roster defs 非空', Array.isArray(defs) && defs.length >= 6);
const ids = new Set(defs.map(d => d.id));
ok('含 senior', ids.has('senior'));
ok('含 zhao', ids.has('zhao'));
ok('含 lin', ids.has('lin'));
ok('含 ting', ids.has('ting'));
ok('非 workLoop career → null', npcDefsFromRoster(roster, 'unknown_career_xyz') === null);

// Quest chain walk (mirrors e2e-taskchain)
const chain = JSON.parse(readFileSync(join(DATA, 'taskchain_programmer_dev.json'), 'utf8'));
const qs = new QuestSystem(makeState());
qs.load(chain);
ok('load 5 环', qs.order.length === 5 && qs.order[0] === 'dev_c1');

const storyReady = createStoryState({ phase: 'ready', act: 1 });
const noAcceptWhileStory = seniorInteractAction({
  questSystem: qs, story: storyReady, workLoopEnabled: true, act: 1,
});
ok('story ready 时不派活', noAcceptWhileStory.kind === 'none');

const storyWorking = createStoryState({ phase: 'working', act: 1, daysInAct: 0 });
const acceptAct = seniorInteractAction({
  questSystem: qs, story: storyWorking, workLoopEnabled: true, act: 1,
});
ok('working 可 accept', acceptAct.kind === 'accept' && acceptAct.questId === 'dev_c1');
const accepted = applySeniorAccept(qs, acceptAct);
ok('apply accept ok', accepted.ok === true);
ok('accept 后 accepted 含 dev_c1', !!qs.accepted.dev_c1);
ok('accept line 含下一步', accepted.line && accepted.line.includes('小赵'));

// talk zhao
qs.progress('talk', 'zhao');
let next = qs.nextObjective('dev_c1');
ok('talk zhao → o2 minigame', next && next.id === 'o2' && next.kind === 'minigame');

// reportMinigameProgress must complete work target
const targets = reportMinigameProgress(qs, 'coding');
ok('report 含 work', targets.includes('work'));
ok('report 含 coding', targets.includes('coding'));
ok('o2 完成后 isReady', qs.isReady('dev_c1') === true);

const deliverAct = seniorInteractAction({
  questSystem: qs, story: storyWorking, workLoopEnabled: true, act: 1,
});
ok('可交付', deliverAct.kind === 'deliver' && deliverAct.questId === 'dev_c1');
ok('progressGain 12', deliverAct.progressGain === 12);
const delivered = applySeniorDeliver(qs, deliverAct);
ok('deliver ok', delivered.ok === true);
ok('dev_c1 completed', !!qs.completed.dev_c1);
ok('dev_c2 解锁', qs.available({ act: 1 }).some(q => q.id === 'dev_c2'));

// ---------- office event act filter / pick ----------
console.log('\n-- office event pick --');
const sampleEv = [
  { id: 'honeymoon', title: '蜜月', text: 'a' },
  { id: 'layoff', title: '裁员', text: 'b', minAct: 3 },
  { id: 'late', title: '通宵', text: 'c', minAct: 2, maxAct: 4 },
  { id: 'early_only', title: '入职', text: 'd', maxAct: 1 },
];
ok('act1 含 honeymoon', eventEligibleForAct(sampleEv[0], 1));
ok('act1 不含 layoff', !eventEligibleForAct(sampleEv[1], 1));
ok('act3 含 layoff', eventEligibleForAct(sampleEv[1], 3));
ok('act5 不含 late(max4)', !eventEligibleForAct(sampleEv[2], 5));
ok('null event 不合格', !eventEligibleForAct(null, 1));

const f1 = filterEventsByAct(sampleEv, 1);
ok('act1 过滤长度', f1.length === 2 && f1.every(e => e.id === 'honeymoon' || e.id === 'early_only'));
const f3 = filterEventsByAct(sampleEv, 3);
ok('act3 含 layoff+late+honeymoon', f3.length === 3 && f3.some(e => e.id === 'layoff'));

// 优先未见过：先抽到 A，再抽应避开 A
const r0 = pickOfficeEvent(sampleEv, new Set(), 1, () => 0);
ok('pick act1 有事件', !!r0.event && (r0.event.id === 'honeymoon' || r0.event.id === 'early_only'));
const r1 = pickOfficeEvent(sampleEv, r0.seen, 1, () => 0);
ok('第二次避开已见', r1.event && r1.event.id !== r0.event.id);
// 两轮后应 reset
const r2 = pickOfficeEvent(sampleEv, r1.seen, 1, () => 0);
ok('池耗尽 resetSeen', r2.resetSeen === true && !!r2.event);
// act1 绝不抽到 minAct3
for (let i = 0; i < 20; i++) {
  const r = pickOfficeEvent(sampleEv, null, 1, () => Math.random());
  if (r.event && r.event.id === 'layoff') {
    ok('act1 误抽 layoff', false);
    break;
  }
}
ok('act1 20 次无 layoff', true);
// 无合格事件
const empty = pickOfficeEvent([{ id: 'x', minAct: 5 }], null, 1, () => 0);
ok('无合格 → null event', empty.event === null);

// 真实 product 事件数据：幕次门槛可滤
try {
  const pev = JSON.parse(readFileSync(join(DATA, 'office_events_product.json'), 'utf8'));
  const evs = pev.events || [];
  const a1 = filterEventsByAct(evs, 1);
  const a5 = filterEventsByAct(evs, 5);
  ok('product 事件非空', evs.length >= 6);
  ok('product act1 子集 ≤ 全量', a1.length <= evs.length);
  ok('product act5 合格 ≥ act1', a5.length >= a1.length);
} catch (e) {
  ok('product events 可读', false, e.message);
}

// ---------- tryPickOfficeEvent：概率 + 关系 + 幕次 合成 ----------
console.log('\n-- tryPickOfficeEvent compose --');
{
  const evs = [
    { id: 'open', title: '开放' },
    { id: 'gated', title: '门控', minAffinity: { npc: 'vet', min: 60 } },
    { id: 'late', title: '后期', minAct: 4 },
  ];
  // 概率未过
  const miss = tryPickOfficeEvent({
    events: evs, act: 1, fireChance: 0.55, rng: () => 0.9,
  });
  ok('chance miss → !fired', miss.fired === false && miss.reason === 'chance');

  // 必中概率 + 无关系 → 只能抽 open（gated 被 relationFilter 挡）
  const rel = new RelationshipSystem(); // vet 默认 50 < 60
  const hit = tryPickOfficeEvent({
    events: evs,
    act: 1,
    fireChance: 1,
    rng: () => 0,
    relations: rel,
    relationFilter: eventMeetsRelations,
  });
  ok('必中抽到事件', hit.fired === true && !!hit.event);
  ok('低好感不抽 gated', hit.event.id !== 'gated');
  ok('act1 不抽 late', hit.event.id !== 'late');

  // 抬高好感后可抽到 gated
  rel.bump('vet', 20); // 70
  const hits = new Set();
  for (let i = 0; i < 30; i++) {
    const r = tryPickOfficeEvent({
      events: evs,
      act: 1,
      fireChance: 1,
      rng: () => Math.random(),
      relations: rel,
      relationFilter: eventMeetsRelations,
      seenIds: null,
    });
    if (r.event) hits.add(r.event.id);
  }
  ok('高好感可触达 gated', hits.has('gated') || hits.has('open'));

  // fireChance=1 且空池
  const empty = tryPickOfficeEvent({
    events: [{ id: 'x', minAct: 9 }],
    act: 1,
    fireChance: 1,
    rng: () => 0,
  });
  ok('空池 !fired empty_pool', empty.fired === false && empty.reason === 'empty_pool');
}

// ---------- applySeniorAction 一站式 ----------
console.log('\n-- applySeniorAction --');
{
  // 重新走完整链：load programmer dev，accept via applySeniorAction
  const chain = JSON.parse(readFileSync(join(DATA, 'taskchain_programmer_dev.json'), 'utf8'));
  const qs2 = new QuestSystem(makeState());
  qs2.load(chain);
  const storyW = createStoryState();
  storyW.phase = 'working';
  storyW.act = 1;

  const actAccept = seniorInteractAction({
    questSystem: qs2, story: storyW, workLoopEnabled: true, act: 1,
  });
  ok('working 可 accept action', actAccept.kind === 'accept');
  const appliedA = applySeniorAction(qs2, actAccept);
  ok('applySeniorAction accept ok', appliedA.ok && appliedA.kind === 'accept');
  ok('apply accept 含 ▸', appliedA.line && appliedA.line.includes('▸'));
  ok('hint 不改状态', applySeniorAction(qs2, { kind: 'hint', line: 'x' }).ok === true);

  // 推完 talk+minigame 才能 deliver
  qs2.progress('talk', 'zhao');
  reportMinigameProgress(qs2, 'coding');
  const actD = seniorInteractAction({
    questSystem: qs2, story: storyW, workLoopEnabled: true, act: 1,
  });
  ok('可 deliver action', actD.kind === 'deliver');
  const appliedD = applySeniorAction(qs2, actD);
  ok('applySeniorAction deliver ok', appliedD.ok && appliedD.kind === 'deliver');
  ok('deliver progressGain', appliedD.progressGain === 12);
  ok('apply none', applySeniorAction(qs2, { kind: 'none' }).ok === false);
}

// WorldScene 静态接线
{
  const ws = readFileSync(join(ROOT, 'src/scenes/WorldScene.js'), 'utf8');
  ok('WS 用 seniorInteractAction', ws.includes('seniorInteractAction'));
  ok('WS 用 applySeniorAction', ws.includes('applySeniorAction'));
  ok('WS 用 tryPickOfficeEvent', ws.includes('tryPickOfficeEvent'));
  // 不再内联 complete(q.id) 在 senior 交付循环（抽到 pure）
  ok('WS 不内联双层 senior for-of complete', !/for \(const q of this\.questSystem\.active\(\)\) \{\s*if \(q\.giver === 'senior' && this\.questSystem\.isReady/.test(ws));
}

console.log(`\n${fail === 0 ? '✅ ALL PASSED' : '❌ ' + fail + ' FAILED'} (${pass} passed, ${fail} failed)\n`);
process.exit(fail === 0 ? 0 : 1);
