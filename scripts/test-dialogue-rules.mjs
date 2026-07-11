// DialogueRules 纯函数单测
import { checkChoiceCondition, filterVisibleChoices } from '../src/systems/DialogueRules.js';

let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? ' → ' + d : ''}`); } };

const stats = { health: 50, stress: 80, passion: 20, skill: 10 };
const get = (k) => stats[k] ?? 0;

console.log('\n=== DialogueRules ===\n');

ok('无 condition → true', checkChoiceCondition(null, get) === true);
ok('空 condition → true', checkChoiceCondition({}, get) === true);
ok('min 满足', checkChoiceCondition({ skill: { min: 10 } }, get) === true);
ok('min 不满足', checkChoiceCondition({ skill: { min: 11 } }, get) === false);
ok('max 满足', checkChoiceCondition({ stress: { max: 80 } }, get) === true);
ok('max 不满足', checkChoiceCondition({ stress: { max: 79 } }, get) === false);
ok('多键全过', checkChoiceCondition({ skill: { min: 5 }, stress: { max: 90 } }, get) === true);
ok('多键一败', checkChoiceCondition({ skill: { min: 5 }, passion: { min: 50 } }, get) === false);
ok('getStat 缺省当 0', checkChoiceCondition({ money: { min: 1 } }, get) === false);

const choices = [
  { label: 'A', condition: { skill: { min: 5 } } },
  { label: 'B', condition: { skill: { min: 99 } } },
  { label: 'C' },
];
const vis = filterVisibleChoices(choices, get);
ok('过滤后剩 2', vis.length === 2);
ok('含 A', vis.some(c => c.label === 'A'));
ok('含 C', vis.some(c => c.label === 'C'));
ok('不含 B', !vis.some(c => c.label === 'B'));
ok('非数组 → []', filterVisibleChoices(null, get).length === 0);

console.log(`\n${fail === 0 ? '✅ ALL PASSED' : '❌ ' + fail + ' FAILED'} (${pass} passed, ${fail} failed)\n`);
process.exit(fail === 0 ? 0 : 1);
