// MinigameFlavor 纯函数单测
import {
  resolveWorkGameFlavor, pickSequencePool, pickMinigameQuestions, pickDebugPool,
  CAREER_FLAVOR, FLAVOR_KEYS,
} from '../src/systems/MinigameFlavor.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? ' → ' + d : ''}`); } };

console.log('\n=== MinigameFlavor ===\n');

ok('默认 programmer/null → dev', resolveWorkGameFlavor('programmer', null).key === 'dev');
ok('programmer/test → test', resolveWorkGameFlavor('programmer', 'test').key === 'test');
ok('programmer/dev → dev', resolveWorkGameFlavor('programmer', 'dev').key === 'dev');
ok('product/biz → product', resolveWorkGameFlavor('product', 'biz').key === 'product');
ok('product chrome 有中文标题', resolveWorkGameFlavor('product', 'ux').debugTitle.includes('产品'));
ok('teacher/homeroom → teach', resolveWorkGameFlavor('teacher', 'homeroom').key === 'teach');
ok('doctor/nurse → medical', resolveWorkGameFlavor('doctor', 'nurse').key === 'medical');
ok('lawyer/litigation → law', resolveWorkGameFlavor('lawyer', 'litigation').key === 'law');
ok('sales/field → sales', resolveWorkGameFlavor('sales', 'field').key === 'sales');
ok('未知职业回落 dev', resolveWorkGameFlavor('alien', null).key === 'dev');

const seq = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../public/data/sequence_puzzles.json'), 'utf8'));
ok('pickSequencePool dev', pickSequencePool(seq, 'dev').length >= 3);
ok('pickSequencePool test', pickSequencePool(seq, 'test').length >= 3);
ok('pickSequencePool product', pickSequencePool(seq, 'product').length >= 3);
ok('pickSequencePool law', pickSequencePool(seq, 'law').length >= 3);
ok('pickSequencePool 未知回落 dev', pickSequencePool(seq, 'nope').length === pickSequencePool(seq, 'dev').length);

const mg = { questions: [{ q: 1 }], byCareer: { teacher: [{ q: 't' }] } };
ok('pickMinigame 默认 questions', pickMinigameQuestions(mg, null).length === 1);
ok('pickMinigame byCareer 优先', pickMinigameQuestions(mg, 'teacher')[0].q === 't');
ok('pickMinigame 无数据 null', pickMinigameQuestions(null) === null);

// 每个 CAREER 都能解析到已注册 chrome
for (const [c, f] of Object.entries(CAREER_FLAVOR)) {
  ok(`career ${c} → ${f} 在 FLAVOR_KEYS`, FLAVOR_KEYS.includes(resolveWorkGameFlavor(c, null).key));
}

// sequence 题库覆盖所有 sequenceKey
const need = new Set(Object.values(CAREER_FLAVOR).map(k => k === 'dev' ? 'dev' : k));
need.add('test');
for (const k of need) {
  ok(`sequence 含 ${k}`, Array.isArray(seq[k]) && seq[k].length >= 2);
}

// debug 分池
const dbg = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../public/data/debug_puzzles.json'), 'utf8'));
ok('debug 旧 puzzles 仍在', Array.isArray(dbg.puzzles) && dbg.puzzles.length >= 6);
ok('debug pools 存在', dbg.pools && typeof dbg.pools === 'object');
const devPool = pickDebugPool(dbg, 'dev');
const prodPool = pickDebugPool(dbg, 'product');
const lawPool = pickDebugPool(dbg, 'law');
ok('pickDebugPool dev 有题', devPool.length >= 6);
ok('pickDebugPool product 有题', prodPool.length >= 4);
ok('pickDebugPool law 有题', lawPool.length >= 4);
ok('product 池不是纯代码题', prodPool.some(p => p.lang === 'text' || (p.lines && !String(p.lines[0]||'').includes('def '))));
ok('dev 池含代码题', devPool.some(p => p.lang === 'python' || p.lang === 'js' || (p.lines && String(p.lines[0]||'').match(/def |function |const /))));
ok('旧格式 {puzzles} 兼容', pickDebugPool({ puzzles: [{ id: 1 }] }, 'product').length === 1);
for (const k of need) {
  const pool = pickDebugPool(dbg, k);
  ok(`debug pool ${k} 非空`, pool.length >= 2);
  ok(`debug pool ${k} 有 bugLine`, pool.every(p => Number.isInteger(p.bugLine)));
}

console.log(`\n${fail === 0 ? '✅ ALL PASSED' : '❌ ' + fail + ' FAILED'} (${pass} passed, ${fail} failed)\n`);
process.exit(fail === 0 ? 0 : 1);
