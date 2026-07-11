// MbtiTypes 单元测试（纯 Node）。运行：node scripts/test-mbti-types.mjs
import { MBTI_TYPES, MBTI_DIMS, mbtiFromBig5, typeInfo, mbtiDimReadings } from '../src/systems/MbtiTypes.js';

let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? ' → ' + d : ''}`); } };

console.log('\n=== MbtiTypes 单元测试 ===\n');

ok('16 型齐全', Object.keys(MBTI_TYPES).length === 16);
ok('每型含 nick/blurb', Object.values(MBTI_TYPES).every(t => t.nick && t.blurb));
ok('4 维', MBTI_DIMS.length === 4);

// mbtiFromBig5
ok('全正→ENFJ', mbtiFromBig5({ E: 2, O: 2, A: 2, C: 2 }) === 'ENFJ');
ok('全负→ISTP', mbtiFromBig5({ E: -2, O: -2, A: -2, C: -2 }) === 'ISTP');
ok('空→ENFJ(默认≥0)', mbtiFromBig5({}) === 'ENFJ');

// typeInfo
ok('ENFJ=主人公', typeInfo('ENFJ').nick === '主人公');
ok('INTJ=建筑师', typeInfo('INTJ').nick === '建筑师');
ok('未知型兜底', typeInfo('XXXX').nick === '探索者');

// mbtiDimReadings
{
  const r = mbtiDimReadings({ E: 6, O: -6, A: 3, C: 0 });
  ok('返回4维', r.length === 4);
  ok('E 正→偏E', r[0].value > 0 && r[0].pick === 'E');
  ok('O 负→偏S', r[1].value < 0 && r[1].pick === 'S');
  ok('值域-100..100', r.every(x => x.value >= -100 && x.value <= 100));
  ok('含左右标签', r[0].left.includes('内向') && r[0].right.includes('外向'));
  ok('strength=|value|', r[0].strength === Math.abs(r[0].value));
  ok('大净值接近满极', mbtiDimReadings({ E: 40 })[0].value > 70);
}

console.log(`\n${fail === 0 ? '✅ ALL PASSED' : '❌ ' + fail + ' FAILED'} (${pass} passed, ${fail} failed)\n`);
process.exit(fail === 0 ? 0 : 1);
