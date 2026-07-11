// FamilyMessages 单元测试（纯 Node，无 Phaser）。直接读真实数据文件验证。
// 运行：node scripts/test-family-messages.mjs
import { readFileSync } from 'fs';
import { FamilyMessages } from '../src/systems/FamilyMessages.js';

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ' → ' + detail : ''}`); }
}

const RAW = readFileSync(new URL('../public/data/emotional_anchors.json', import.meta.url), 'utf8');
const DATA = JSON.parse(RAW);
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => DATA });

console.log('\n=== FamilyMessages 单元测试 ===\n');

// parseText
{
  const fm = new FamilyMessages();
  const b = fm.parseText('【妈妈】囡囡，天冷了。\n【妈妈】加件衣服。');
  ok('parseText：两条消息各成一气泡', b.length === 2, `got ${b.length}`);
  ok('parseText：sender 正确', b[0].sender === '妈妈');
  ok('parseText：text 正确', b[0].text === '囡囡，天冷了。');
}
{
  const fm = new FamilyMessages();
  const b = fm.parseText('【爸爸】(转账 2000.00)\n【爸爸】拿着。别推。');
  ok('parseText：sender 带括号', b[0].sender === '爸爸');
  ok('parseText：含括号 text 保留', b[0].text === '(转账 2000.00)');
}
{
  const fm = new FamilyMessages();
  ok('parseText：空输入返回 []', fm.parseText('').length === 0);
  ok('parseText：null 返回 []', fm.parseText(null).length === 0);
  ok('parseText：空行跳过', fm.parseText('【妈妈】a\n\n【妈妈】b').length === 2);
}

// load + 缓存
{
  const fm = new FamilyMessages();
  const data = await fm.load();
  ok('load：成功', !!data);
  ok('load：含 parents_messages', Array.isArray(data.parents_messages) && data.parents_messages.length > 0);
  ok('load：含 letter_options', Array.isArray(data.letter_options) && data.letter_options.length >= 10);
  ok('isReady 加载后 true', fm.isReady() === true);
  const again = await fm.load();
  ok('load：二次返回缓存', again === data);
}

// pickForAct
{
  const fm = new FamilyMessages();
  await fm.load();
  const a1 = fm.pickForAct(1);
  ok('pickForAct(1)：匹配到消息', !!a1 && a1.bubbles.length > 0);
  ok('pickForAct(1)：context 含第一幕/入职', /第一幕|入职/.test(a1.context));
  const a1b = fm.pickForAct(1);
  if (a1b) ok('pickForAct(1) 二次：不重复', a1b.index !== a1.index);
  else ok('pickForAct(1) 二次：首幕耗尽返回 null（合法）', true);
  // 定位调整后：仅保留第一幕一条入职问候，其余幕次无消息（安全返回 null）
  const a3 = fm.pickForAct(3);
  ok('pickForAct(3)：无消息返回 null', a3 === null);
}

// pickForThreshold（定位调整后：无至暗情感消息，安全返回 null）
{
  const fm = new FamilyMessages();
  await fm.load();
  ok('pickForThreshold：无消息返回 null', fm.pickForThreshold() === null);
}

// pickForEnding（定位调整后：无结局专属家人消息，安全返回 null）
{
  const fm = new FamilyMessages();
  await fm.load();
  for (const key of ['backbone', 'quit', 'health', 'switch', 'light']) {
    ok(`pickForEnding(${key})：无消息返回 null`, fm.pickForEnding(key) === null);
  }
  ok('pickForEnding(未知key)：返回 null', fm.pickForEnding('nonexistent') === null);
}

// getLetterOptions
{
  const fm = new FamilyMessages();
  await fm.load();
  const opts = fm.getLetterOptions();
  ok('getLetterOptions：返回候选句', opts.length >= 10);
  ok('getLetterOptions：内容是字符串', typeof opts[0] === 'string');
}

// load 失败降级
{
  globalThis.fetch = async () => { throw new Error('network down'); };
  const fm = new FamilyMessages();
  const data = await fm.load();
  ok('load 失败：返回 null 不抛错', data === null);
  ok('load 失败：isReady false', fm.isReady() === false);
  ok('load 失败：pickForAct 安全 null', fm.pickForAct(1) === null);
}

console.log(`\n${fail === 0 ? '✅ ALL PASSED' : '❌ ' + fail + ' FAILED'} (${pass} passed, ${fail} failed)\n`);
process.exit(fail === 0 ? 0 : 1);
