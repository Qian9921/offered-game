// E4 全职业风味门禁：每条 workLoop 线须有足够职业动词 + 互不换皮。
// 服务初衷：盲玩 10 分钟能猜出职业。
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORK_LOOP_CAREERS, DEFAULT_SUBROLE } from '../src/systems/StoryProgress.js';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'public/data');
let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; console.log(`  ✗ ${n}${d ? ' → ' + d : ''}`); }
};

function load(name) {
  const p = join(DATA, name);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8'));
}

function blobOf(obj) {
  return JSON.stringify(obj || {}, null);
}

function hits(text, words) {
  const t = text || '';
  return words.filter((w) => t.includes(w));
}

/** 每职业指纹词（须与真实日常对齐） */
const FINGERPRINT = {
  programmer: ['代码', '接口', 'bug', '测试', '上线', '日志', 'PR', '缺陷', '编译', '联调'],
  product: ['PRD', '需求', '漏斗', '用户', '评审', '迭代', '转化', '指标', '原型', '路径'],
  admin: ['公文', '收文', '盖章', '台账', '会议', '材料', '流程', '通知', '迎检', '用章'],
  designer: ['视觉', '走查', '组件', '对齐', '稿', '规范', '像素', '交互', '改稿', '空态'],
  operation: ['选题', '投放', '留存', '内容', '热词', '复盘', '增长', '转化', '活动', '数据'],
  teacher: ['教案', '班会', '家校', '家长', '公开课', '作业', '班级', '备课', '课堂', '学生'],
  doctor: ['病历', '查房', '医嘱', '检验', '接诊', '护理', '用药', '病人', '病程', '告知'],
  civilservant: ['窗口', '材料', '办件', '文书', '归档', '接待', '规范', '审批', '台账', '群众'],
  sales: ['客户', '线索', '拜访', '报价', '成单', '跟进', '方案', '异议', 'CRM', '复盘'],
  lawyer: ['争点', '阅卷', '证据', '开庭', '合同', '尽调', '诉讼', '原件', '意见', '庭'],
};

console.log('\n=== Career flavor ALL (E4 distinctiveness) ===\n');

const CAREERS = WORK_LOOP_CAREERS instanceof Set
  ? [...WORK_LOOP_CAREERS]
  : (Array.isArray(WORK_LOOP_CAREERS) ? WORK_LOOP_CAREERS : Object.keys(DEFAULT_SUBROLE));
ok('WORK_LOOP 10 职业', CAREERS.length === 10);

const blobs = {};
for (const career of CAREERS) {
  const sub = DEFAULT_SUBROLE[career];
  const chainName = `taskchain_${career}_${sub}.json`;
  const chain = load(chainName);
  const events = load(`office_events_${career}.json`);
  const orders = load(`work_orders_${career}.json`);
  const roster = load(`roster_${career}.json`);

  ok(`${career} 默认链存在`, !!chain, chainName);
  ok(`${career} 事件存在`, !!events);
  ok(`${career} 工单存在`, !!orders);
  ok(`${career} 名册存在`, !!roster);

  const qs = chain?.quests || [];
  ok(`${career} 链 ≥3 环`, qs.length >= 3);

  let chainBlob = '';
  for (const q of qs) {
    chainBlob += [q.title, q.desc, q.acceptLine, q.doneLine, JSON.stringify(q.talkLines || {})].join(' ');
    ok(`${career}/${q.id} accept≥12`, (q.acceptLine || '').length >= 12);
    ok(`${career}/${q.id} done≥8`, (q.doneLine || '').length >= 8);
  }

  const evList = events?.events || [];
  ok(`${career} 事件≥6`, evList.length >= 6);
  const gated = evList.filter((e) => e.minAct != null || e.maxAct != null).length;
  ok(`${career} 事件有幕次门槛≥1`, gated >= 1);

  const orderList = orders?.orders || (Array.isArray(orders) ? orders : []);
  ok(`${career} 工单≥5`, orderList.length >= 5);

  const fullBlob = chainBlob + blobOf(events) + blobOf(orders) + blobOf(roster);
  blobs[career] = fullBlob;

  const fp = FINGERPRINT[career] || [];
  const hit = hits(fullBlob, fp);
  ok(`${career} 指纹词≥4 (${hit.length})`, hit.length >= 4, hit.join(',') || 'none');
}

// 职业两两：默认链文案前 160 字不得完全相同（防整段复制换皮）
const keys = Object.keys(blobs);
for (let i = 0; i < keys.length; i++) {
  for (let j = i + 1; j < keys.length; j++) {
    const a = keys[i], b = keys[j];
    const sa = blobs[a].slice(0, 160);
    const sb = blobs[b].slice(0, 160);
    ok(`${a}≠${b} 开头不雷同`, sa !== sb);
  }
}

// 程序员 vs 产品：各自核心词不得大量交叉占优反转
ok('程序员强于代码感', hits(blobs.programmer, ['代码', '接口', 'bug', '测试']).length
  >= hits(blobs.product, ['代码', '接口', 'bug']).length);
ok('产品强于需求感', hits(blobs.product, ['需求', 'PRD', '用户', '评审']).length >= 2);
ok('律师强于诉讼感', hits(blobs.lawyer, ['争点', '阅卷', '证据', '开庭']).length >= 2);
ok('销售强于客户感', hits(blobs.sales, ['客户', '线索', '拜访', '报价']).length >= 2);

console.log(`\n${fail === 0 ? '✅ ALL PASSED' : '❌ ' + fail + ' FAILED'} (${pass} passed, ${fail} failed)\n`);
process.exit(fail === 0 ? 0 : 1);
