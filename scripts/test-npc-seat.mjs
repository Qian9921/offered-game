// resolveNpcSeat 单元测试（纯 Node）——护住"事件信使回座崩溃/NPC滞留"的回归。
import { resolveNpcSeat } from '../src/systems/CareerFit.js';

let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? ' → ' + d : ''}`); } };

console.log('\n=== resolveNpcSeat 单元测试 ===\n');

ok('背景同事 seat', JSON.stringify(resolveNpcSeat({ seat: { x: 10, y: 20 } })) === '{"x":10,"y":20}');
ok('具名NPC _seat', JSON.stringify(resolveNpcSeat({ _seat: { x: 30, y: 40 } })) === '{"x":30,"y":40}');
ok('chair 兜底', JSON.stringify(resolveNpcSeat({ chair: { x: 5, y: 6 } })) === '{"x":5,"y":6}');
ok('spr 最终兜底', JSON.stringify(resolveNpcSeat({ spr: { x: 1, y: 2 } })) === '{"x":1,"y":2}');
ok('优先级 seat>_seat', JSON.stringify(resolveNpcSeat({ seat: { x: 1, y: 1 }, _seat: { x: 9, y: 9 } })) === '{"x":1,"y":1}');
ok('具名NPC 无 seat/chair 不崩溃(旧bug)', resolveNpcSeat({ _seat: { x: 7, y: 8 }, spr: { x: 0, y: 0 } }).x === 7);
ok('全空返回 null', resolveNpcSeat({}) === null);
ok('null 安全', resolveNpcSeat(null) === null);
ok('部分坐标视为无效', resolveNpcSeat({ seat: { x: 1 } }) === null);

console.log(`\n${fail === 0 ? '✅ ALL PASSED' : '❌ ' + fail + ' FAILED'} (${pass} passed, ${fail} failed)\n`);
process.exit(fail === 0 ? 0 : 1);
