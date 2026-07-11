// Resume / buildWorldResumeData 单元测试。运行：node scripts/test-resume.mjs
import { buildWorldResumeData, DEEP_CAREERS } from '../src/systems/Resume.js';

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ' → ' + detail : ''}`); }
}

console.log('\n=== Resume / buildWorldResumeData ===\n');

ok('null → null', buildWorldResumeData(null) === null);
ok('undefined → null', buildWorldResumeData(undefined) === null);
ok('非对象 → null', buildWorldResumeData('x') === null);

const r1 = buildWorldResumeData({ career: 'programmer', act: 3, subRole: 'test' });
ok('带回 career', r1.career === 'programmer');
ok('带回 act', r1.act === 3);
ok('带回 subRole=test（续档关键）', r1.subRole === 'test');
ok('程序员默认 deep=true', r1.deep === true);

const r2 = buildWorldResumeData({ career: 'programmer', act: 2, subRole: 'dev' });
ok('subRole=dev', r2.subRole === 'dev');

const r3 = buildWorldResumeData({ career: 'programmer', act: 1 });
ok('缺 subRole → null', r3.subRole === null);
ok('缺 deep 旗舰职业 → true', r3.deep === true);

const r4 = buildWorldResumeData({ career: 'teacher', act: 1 });
ok('轻量职业 deep 默认 false', r4.deep === false);
ok('轻量 career 保留', r4.career === 'teacher');

const r5 = buildWorldResumeData({ career: 'product', act: 4, deep: false });
ok('显式 deep=false 优先于默认', r5.deep === false);

const r6 = buildWorldResumeData({ career: 'admin', act: 2, deep: true });
ok('admin 默认 deep 可显式 true', r6.deep === true);

const r7 = buildWorldResumeData({ act: 0 });
ok('缺 career 默认 programmer', r7.career === 'programmer');
ok('act<=0 回落 1', r7.act === 1);

const r8 = buildWorldResumeData({});
ok('空对象 act=1', r8.act === 1);
ok('空对象 deep 按 programmer=true', r8.deep === true);

ok('DEEP_CAREERS 含 programmer', DEEP_CAREERS.has('programmer'));
ok('DEEP_CAREERS 不含 lawyer', !DEEP_CAREERS.has('lawyer'));

console.log(`\n${fail === 0 ? '✅ ALL PASSED' : '❌ ' + fail + ' FAILED'} (${pass} passed, ${fail} failed)\n`);
process.exit(fail === 0 ? 0 : 1);
