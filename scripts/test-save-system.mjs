// SaveSystem 单元测试（纯 Node，mock localStorage）。
// 运行：node scripts/test-save-system.mjs
import { SaveSystem } from '../src/systems/SaveSystem.js';

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ' → ' + detail : ''}`); }
}

// mock localStorage
let _store = {};
globalThis.localStorage = {
  getItem: (k) => (k in _store ? _store[k] : null),
  setItem: (k, v) => { _store[k] = String(v); },
  removeItem: (k) => { delete _store[k]; },
};
const reset = () => { _store = {}; };

console.log('\n=== SaveSystem 单元测试 ===\n');

reset();
ok('初始无档：has() 为 false', SaveSystem.has() === false);
ok('初始无档：load() 返回 null', SaveSystem.load() === null);

reset();
ok('save 成功返回 true', SaveSystem.save({ career: 'programmer', act: 2 }) === true);
ok('save 后 has() 为 true', SaveSystem.has() === true);
const loaded = SaveSystem.load();
ok('load 返回存入的 career', loaded.career === 'programmer');
ok('load 返回存入的 act', loaded.act === 2);
ok('save 自动加 version:2', loaded.version === 2, `got ${loaded.version}`);
ok('save 自动加 updatedAt 时间戳', typeof loaded.updatedAt === 'number');

reset();
SaveSystem.saveProgress({ career: 'product', act: 3, stats: { health: 50, passion: 30 } });
const p = SaveSystem.load();
ok('saveProgress：存入 career', p.career === 'product');
ok('saveProgress：存入 act', p.act === 3);
ok('saveProgress：存入 stats.health', p.stats && p.stats.health === 50);
ok('saveProgress：存入 stats.passion', p.stats && p.stats.passion === 30);

reset();
SaveSystem.saveProgress({ career: 'admin', act: 1, stats: {}, extra: { customField: 'abc' } });
ok('saveProgress：extra 字段合并', SaveSystem.load().customField === 'abc');

reset();
SaveSystem.save({ career: 'designer', act: 1 });
ok('向后兼容：旧格式可 load', SaveSystem.load().career === 'designer');

reset();
SaveSystem.save({ career: 'x', act: 1 });
ok('clear 前有档', SaveSystem.has() === true);
SaveSystem.clear();
ok('clear 后无档', SaveSystem.has() === false);

// localStorage 不可用时降级
globalThis.localStorage = {
  getItem: () => { throw new Error('denied'); },
  setItem: () => { throw new Error('denied'); },
  removeItem: () => { throw new Error('denied'); },
};
ok('localStorage 不可用：save 返回 false 不抛错', SaveSystem.save({ career: 'x' }) === false);
ok('localStorage 不可用：load 返回 null 不抛错', SaveSystem.load() === null);
ok('localStorage 不可用：has 返回 false 不抛错', SaveSystem.has() === false);
ok('localStorage 不可用：clear 返回 false 不抛错', SaveSystem.clear() === false);
ok('localStorage 不可用：saveProgress 返回 false 不抛错', SaveSystem.saveProgress({ career: 'x', act: 1 }) === false);

// 恢复可用 localStorage，继续增强用例
globalThis.localStorage = {
  getItem: (k) => (k in _store ? _store[k] : null),
  setItem: (k, v) => { _store[k] = String(v); },
  removeItem: (k) => { delete _store[k]; },
};

// ── 1. Full save with story/project/quests/subRole via extra ──
console.log('\n-- full saveProgress extra --');
reset();
const fullExtra = {
  subRole: 'dev',
  story: { phase: 'working', act: 1, daysInAct: 1, pendingAct: null },
  project: { progress: 42, performance: 15, hitMilestones: [25] },
  quests: { accepted: { dev_c1: { objectives: { o1: true } } }, completed: [] },
};
ok(
  'full saveProgress 返回 true',
  SaveSystem.saveProgress({
    career: 'programmer',
    act: 1,
    stats: { health: 80, energy: 90 },
    extra: fullExtra,
  }) === true,
);
const full = SaveSystem.load();
ok('full load career', full.career === 'programmer');
ok('full load subRole', full.subRole === 'dev');
ok('full load story.phase', full.story && full.story.phase === 'working');
ok('full load story.daysInAct', full.story && full.story.daysInAct === 1);
ok('full load project.progress', full.project && full.project.progress === 42);
ok('full load project.hitMilestones', full.project && Array.isArray(full.project.hitMilestones)
  && full.project.hitMilestones[0] === 25);
ok('full load quests.accepted', full.quests && full.quests.accepted && full.quests.accepted.dev_c1);
ok('full load stats.health', full.stats && full.stats.health === 80);

// ── 2. Partial overwrite preserves nested progress (BUG-1 class merge) ──
console.log('\n-- partial overwrite merge --');
ok('partial save act:2 返回 true', SaveSystem.save({ act: 2 }) === true);
const partial = SaveSystem.load();
ok('partial: act 更新为 2', partial.act === 2);
ok('partial: career 保留', partial.career === 'programmer');
ok('partial: subRole 保留', partial.subRole === 'dev');
ok('partial: story 保留', partial.story && partial.story.phase === 'working' && partial.story.daysInAct === 1);
ok('partial: project 保留', partial.project && partial.project.progress === 42);
ok('partial: quests 保留', partial.quests && partial.quests.accepted && partial.quests.accepted.dev_c1);
ok('partial: stats 保留', partial.stats && partial.stats.health === 80);

// ── 3. Sleep-shaped write: only story daysInAct bump keeps project ──
console.log('\n-- sleep-shaped story bump --');
const bumpedStory = { ...partial.story, daysInAct: (partial.story.daysInAct || 0) + 1 };
ok(
  'sleep saveProgress 返回 true',
  SaveSystem.saveProgress({
    career: partial.career,
    act: partial.act,
    stats: partial.stats,
    extra: { story: bumpedStory },
  }) === true,
);
const sleep = SaveSystem.load();
ok('sleep: daysInAct 递增', sleep.story && sleep.story.daysInAct === 2, `got ${sleep.story?.daysInAct}`);
ok('sleep: project 仍在', sleep.project && sleep.project.progress === 42);
ok('sleep: quests 仍在', sleep.quests && sleep.quests.accepted && sleep.quests.accepted.dev_c1);
ok('sleep: subRole 仍在', sleep.subRole === 'dev');

// ── 4. Corrupt JSON → loadSlot() === null ──
console.log('\n-- corrupt JSON --');
_store['wdwtb_save_1'] = '{not-valid-json!!!';
ok('corrupt JSON: loadSlot(1) === null', SaveSystem.loadSlot(1) === null);
ok('corrupt JSON: hasSlot(1) 仍为 true（键存在）', SaveSystem.hasSlot(1) === true);

// ── 5. 多槽位 API ──
console.log('\n-- 多槽位 --');
delete _store['wdwtb_save']; delete _store['wdwtb_save_1']; delete _store['wdwtb_save_2']; delete _store['wdwtb_save_3'];
ok('slotCount=3', SaveSystem.slotCount === 3);
ok('空槽 saveSlot(2)', SaveSystem.saveSlot(2, { career: 'doctor', act: 2 }));
ok('hasSlot(2) true', SaveSystem.hasSlot(2) === true);
ok('hasSlot(1) false', SaveSystem.hasSlot(1) === false);
ok('loadSlot(2) career', SaveSystem.loadSlot(2)?.career === 'doctor');
ok('saveSlot 自动加 slot 字段', SaveSystem.loadSlot(2)?.slot === 2);
const list = SaveSystem.listSlots();
ok('listSlots 返回 3 条', list.length === 3);
ok('listSlots[1] 有存档', list[1].exists === true && list[1].career === 'doctor');
ok('listSlots[0] 空', list[0].exists === false);
ok('latestSlot=2', SaveSystem.latestSlot() === 2);
ok('firstEmptySlot=1', SaveSystem.firstEmptySlot() === 1);
// 单独测 latestSlot：手动写入不同 updatedAt（避免毫秒精度问题）
_store['wdwtb_save_1'] = JSON.stringify({ version: 2, slot: 1, career: 'programmer', act: 1, updatedAt: 500 });
_store['wdwtb_save_2'] = JSON.stringify({ version: 2, slot: 2, career: 'doctor', act: 1, updatedAt: 1000 });
_store['wdwtb_save_3'] = JSON.stringify({ version: 2, slot: 3, career: 'lawyer', act: 1, updatedAt: 2000 });
ok('latestSlot=3（更新更晚）', SaveSystem.latestSlot() === 3);
SaveSystem.clearSlot(2);
ok('clearSlot(2) 后 hasSlot(2)=false', SaveSystem.hasSlot(2) === false);
ok('clearSlot 后 firstEmptySlot=2', SaveSystem.firstEmptySlot() === 2);
SaveSystem.saveSlot(2, { career: 'teacher', act: 3 });
ok('满槽时 firstEmptySlot=null', SaveSystem.firstEmptySlot() === null);

// ── 6. 旧档迁移 ──
console.log('\n-- 旧档迁移 --');
delete _store['wdwtb_save_1']; delete _store['wdwtb_save_2']; delete _store['wdwtb_save_3'];
delete _store['wdwtb_save'];
_store['wdwtb_save'] = JSON.stringify({ version: 2, career: 'product', act: 4, subRole: 'ux', updatedAt: 12345 });
SaveSystem._migrateLegacy();
ok('迁移后 wdwtb_save 删除', _store['wdwtb_save'] === undefined);
ok('迁移到 slot1', SaveSystem.loadSlot(1)?.career === 'product');
ok('迁移 slot 字段=1', SaveSystem.loadSlot(1)?.slot === 1);
ok('迁移后 has()=true（兼容）', SaveSystem.has() === true);
SaveSystem._migrateLegacy();
ok('迁移幂等', SaveSystem.loadSlot(1)?.career === 'product');

console.log(`\n${fail === 0 ? '✅ ALL PASSED' : '❌ ' + fail + ' FAILED'} (${pass} passed, ${fail} failed)\n`);
process.exit(fail === 0 ? 0 : 1);
