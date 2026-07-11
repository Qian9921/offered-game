// SaveSystem + buildWorldResumeData 联调：模拟「存档 → 标题继续」不丢 subRole/deep
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { buildWorldResumeData } from '../src/systems/Resume.js';

let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? ' → ' + d : ''}`); } };

let _store = {};
globalThis.localStorage = {
  getItem: (k) => (k in _store ? _store[k] : null),
  setItem: (k, v) => { _store[k] = String(v); },
  removeItem: (k) => { delete _store[k]; },
};

console.log('\n=== Save + Resume 联调 ===\n');

_store = {};
SaveSystem.saveProgress({
  career: 'programmer', act: 3, stats: { health: 70, skill: 40 },
  extra: { subRole: 'test', story: { phase: 'working', act: 3, daysInAct: 1 } },
});
const d1 = buildWorldResumeData(SaveSystem.load());
ok('程序员 test 方向续档 subRole', d1.subRole === 'test');
ok('程序员 test 方向 deep=true', d1.deep === true);
ok('act 保留', d1.act === 3);

_store = {};
SaveSystem.saveProgress({
  career: 'programmer', act: 1, stats: {},
  extra: { subRole: 'dev' },
});
const d2 = buildWorldResumeData(SaveSystem.load());
ok('程序员 dev 方向', d2.subRole === 'dev');

_store = {};
// 旧档：只有 career+act，无 subRole/deep
SaveSystem.save({ career: 'programmer', act: 2, version: 1 });
const d3 = buildWorldResumeData(SaveSystem.load());
ok('旧档无 subRole 不崩', d3.subRole === null);
ok('旧档程序员仍 deep=true', d3.deep === true);
ok('旧档 act 可读', d3.act === 2);

_store = {};
SaveSystem.saveProgress({ career: 'teacher', act: 1, stats: {} });
const d4 = buildWorldResumeData(SaveSystem.load());
ok('轻量职业 deep=false', d4.deep === false);
ok('轻量 career', d4.career === 'teacher');

_store = {};
SaveSystem.saveProgress({
  career: 'product', act: 5, stats: {},
  extra: { deep: true },
});
const d5 = buildWorldResumeData(SaveSystem.load());
ok('产品经理 deep=true', d5.deep === true);

ok('无档 resume 为 null', buildWorldResumeData(null) === null);

console.log(`\n${fail === 0 ? '✅ ALL PASSED' : '❌ ' + fail + ' FAILED'} (${pass} passed, ${fail} failed)\n`);
process.exit(fail === 0 ? 0 : 1);
