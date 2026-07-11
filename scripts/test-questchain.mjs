// QuestSystem 任务链单测：requires 前置解锁 / ordered 顺序目标 / nextObjective / npcMark 引导
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// QuestSystem 依赖 Phaser/AudioSystem——用最小桩替换后动态求值源码
const root = dirname(dirname(fileURLToPath(import.meta.url)));
let src = readFileSync(join(root, 'src/systems/QuestSystem.js'), 'utf8');
src = src
  .replace(/import .*?;\n/g, '')
  .replace('export class QuestSystem extends Phaser.Events.EventEmitter', 'class QuestSystem extends MiniEmitter')
  .replace(/AudioSystem\.questDone\(\);/, '');
const MiniEmitter = class { emit() {} on() {} };
const QuestSystem = new Function('MiniEmitter', `${src}; return QuestSystem;`)(MiniEmitter);

let pass = 0, fail = 0;
const t = (name, cond) => { cond ? pass++ : (fail++, console.error('✗ ' + name)); if (cond) console.log('✓ ' + name); };

const state = { change: () => {} };
const qs = new QuestSystem(state);
const chain = JSON.parse(readFileSync(join(root, 'public/data/taskchain_programmer_dev.json'), 'utf8'));
qs.load(chain);

// requires: 只有 c1 可接
let av = qs.available();
t('初始只有第一环可接', av.length === 1 && av[0].id === 'dev_c1');

qs.accept('dev_c1');
t('接了 c1 后无可接任务', qs.available().length === 0);

// ordered: 先做 minigame 不生效
qs.progress('minigame', 'work');
t('ordered: 跳过 talk 直接 minigame 不推进', qs.nextObjective('dev_c1').id === 'o1');

qs.progress('talk', 'zhao');
t('talk zhao 完成 o1', qs.nextObjective('dev_c1').id === 'o2');
t('o1 完成后 isReady=false', !qs.isReady('dev_c1'));

// npcMark 引导：giver senior 无标(未就绪)、下一环目标不是 zhao 了
t('进行中 senior 无 deliver 标', qs.npcMark('senior') === null);

qs.progress('minigame', 'work');
t('minigame 完成 o2 → isReady', qs.isReady('dev_c1'));
t('就绪后 senior 显示 deliver', qs.npcMark('senior') === 'deliver');

qs.complete('dev_c1');
t('c1 完成后 c2 解锁', qs.available().length === 1 && qs.available()[0].id === 'dev_c2');
t('c1 完成后 senior 显示 available', qs.npcMark('senior') === 'available');

qs.accept('dev_c2');
t('c2 接取后 npcMark(lin)=progress (下一环目标)', qs.npcMark('lin') === 'progress');
t('c2 的 minigame 目标未到 → 不误标', qs.npcMark('ting') === null);

// serialize/restore 保链
const snap = qs.serialize();
const qs2 = new QuestSystem(state);
qs2.load(chain);
qs2.restore(snap);
t('restore 后 c1 已完成', !!qs2.completed['dev_c1']);
t('restore 后 c2 进行中且下一目标 o1', qs2.nextObjective('dev_c2').id === 'o1');
t('restore 后 c3 未解锁', !qs2.available().some(q => q.id === 'dev_c3'));

// 测试链数据完整性
const tchain = JSON.parse(readFileSync(join(root, 'public/data/taskchain_programmer_test.json'), 'utf8'));
const ids = new Set(tchain.quests.map(q => q.id));
t('test 链 5 环且 requires 都存在', tchain.quests.length === 5 &&
  tchain.quests.every(q => (q.requires || []).every(r => ids.has(r))));
const dids = new Set(chain.quests.map(q => q.id));
t('dev 链 5 环且 requires 都存在', chain.quests.length === 5 &&
  chain.quests.every(q => (q.requires || []).every(r => dids.has(r))));


// 产品业务链：同样的 requires/ordered 语义
const pchain = JSON.parse(readFileSync(join(root, 'public/data/taskchain_product_biz.json'), 'utf8'));
const pqs = new QuestSystem(state);
pqs.load(pchain);
const pav = pqs.available();
t('产品 biz 初始仅 biz_c1', pav.length === 1 && pav[0].id === 'biz_c1');
pqs.accept('biz_c1');
pqs.progress('minigame', 'work');
t('产品 ordered 跳过 talk 不推进', pqs.nextObjective('biz_c1').id === 'o1');
pqs.progress('talk', 'vet');
pqs.progress('minigame', 'work');
t('产品 c1 可交付', pqs.isReady('biz_c1'));
t('产品 senior deliver', pqs.npcMark('senior') === 'deliver');
pqs.complete('biz_c1');
t('产品 c2 解锁', pqs.available().some(q => q.id === 'biz_c2'));

const pids = new Set(pchain.quests.map(q => q.id));
t('产品 biz 链 5 环 requires 合法', pchain.quests.length === 5 &&
  pchain.quests.every(q => (q.requires || []).every(r => pids.has(r))));
const ux = JSON.parse(readFileSync(join(root, 'public/data/taskchain_product_ux.json'), 'utf8'));
const uids = new Set(ux.quests.map(q => q.id));
t('产品 ux 链 5 环 requires 合法', ux.quests.length === 5 &&
  ux.quests.every(q => (q.requires || []).every(r => uids.has(r))));

// roster 引用：biz/ux talk 目标都在 product roster
const prodRoster = JSON.parse(readFileSync(join(root, 'public/data/roster_product.json'), 'utf8'));
const rids = new Set(prodRoster.npcs.map(n => n.id));
const allTalkOk = [...pchain.quests, ...ux.quests].every(q =>
  (q.objectives || []).filter(o => o.kind === 'talk').every(o => rids.has(o.target))
  && (!q.talkLines || Object.keys(q.talkLines).every(k => rids.has(k)))
  && rids.has(q.giver)
);
t('产品链 talk/giver 全在 roster', allTalkOk);


// 行政综合办链
const achain = JSON.parse(readFileSync(join(root, 'public/data/taskchain_admin_office.json'), 'utf8'));
const aqs = new QuestSystem(state);
aqs.load(achain);
t('行政 office 初始仅 off_c1', aqs.available().length === 1 && aqs.available()[0].id === 'off_c1');
aqs.accept('off_c1');
aqs.progress('minigame', 'work');
t('行政 ordered 跳过 talk 不推进', aqs.nextObjective('off_c1').id === 'o1');
aqs.progress('talk', 'vet');
aqs.progress('minigame', 'work');
t('行政 c1 可交付', aqs.isReady('off_c1'));
aqs.complete('off_c1');
t('行政 c2 解锁', aqs.available().some(q => q.id === 'off_c2'));
const aids = new Set(achain.quests.map(q => q.id));
t('行政 office 链 5 环 requires 合法', achain.quests.length === 5 &&
  achain.quests.every(q => (q.requires || []).every(r => aids.has(r))));
const stu = JSON.parse(readFileSync(join(root, 'public/data/taskchain_admin_student.json'), 'utf8'));
const sids = new Set(stu.quests.map(q => q.id));
t('行政 student 链 5 环 requires 合法', stu.quests.length === 5 &&
  stu.quests.every(q => (q.requires || []).every(r => sids.has(r))));
const adminRoster = JSON.parse(readFileSync(join(root, 'public/data/roster_admin.json'), 'utf8'));
const arids = new Set(adminRoster.npcs.map(n => n.id));
const adminTalkOk = [...achain.quests, ...stu.quests].every(q =>
  (q.objectives || []).filter(o => o.kind === 'talk').every(o => arids.has(o.target))
  && (!q.talkLines || Object.keys(q.talkLines).every(k => arids.has(k)))
  && arids.has(q.giver)
);
t('行政链 talk/giver 全在 roster', adminTalkOk);


// 设计师迷你链（3 环）
const dchain = JSON.parse(readFileSync(join(root, 'public/data/taskchain_designer_visual.json'), 'utf8'));
const dqs = new QuestSystem(state);
dqs.load(dchain);
t('设计 visual 初始仅 vis_c1', dqs.available().length === 1 && dqs.available()[0].id === 'vis_c1');
dqs.accept('vis_c1');
dqs.progress('talk', 'pm');
dqs.progress('minigame', 'work');
t('设计 c1 可交付', dqs.isReady('vis_c1'));
dqs.complete('vis_c1');
t('设计 c2 解锁', dqs.available().some(q => q.id === 'vis_c2'));
const dvisIds = new Set(dchain.quests.map(q => q.id));
t('设计 visual 链 requires 合法', dchain.quests.length === 3 &&
  dchain.quests.every(q => (q.requires || []).every(r => dvisIds.has(r))));
const du = JSON.parse(readFileSync(join(root, 'public/data/taskchain_designer_ui.json'), 'utf8'));
const duiIds = new Set(du.quests.map(q => q.id));
t('设计 ui 链 3 环 requires 合法', du.quests.length === 3 &&
  du.quests.every(q => (q.requires || []).every(r => duiIds.has(r))));
const dRoster = JSON.parse(readFileSync(join(root, 'public/data/roster_designer.json'), 'utf8'));
const dRosterIds = new Set(dRoster.npcs.map(n => n.id));
const dTalkOk = [...dchain.quests, ...du.quests].every(q =>
  (q.objectives || []).filter(o => o.kind === 'talk').every(o => dRosterIds.has(o.target))
  && (!q.talkLines || Object.keys(q.talkLines).every(k => dRosterIds.has(k)))
  && dRosterIds.has(q.giver)
);
t('设计链 talk/giver 全在 roster', dTalkOk);


// 运营迷你链
const ochain = JSON.parse(readFileSync(join(root, 'public/data/taskchain_operation_content.json'), 'utf8'));
const oqs = new QuestSystem(state);
oqs.load(ochain);
t('运营 content 初始仅 cnt_c1', oqs.available().length === 1 && oqs.available()[0].id === 'cnt_c1');
oqs.accept('cnt_c1');
oqs.progress('talk', 'data');
oqs.progress('minigame', 'work');
t('运营 c1 可交付', oqs.isReady('cnt_c1'));
oqs.complete('cnt_c1');
t('运营 c2 解锁', oqs.available().some(q => q.id === 'cnt_c2'));
const ocIds = new Set(ochain.quests.map(q => q.id));
t('运营 content 链 requires 合法', ochain.quests.length === 3 &&
  ochain.quests.every(q => (q.requires || []).every(r => ocIds.has(r))));
const og = JSON.parse(readFileSync(join(root, 'public/data/taskchain_operation_growth.json'), 'utf8'));
const ogIds = new Set(og.quests.map(q => q.id));
t('运营 growth 链 3 环 requires 合法', og.quests.length === 3 &&
  og.quests.every(q => (q.requires || []).every(r => ogIds.has(r))));
const oRoster = JSON.parse(readFileSync(join(root, 'public/data/roster_operation.json'), 'utf8'));
const oRids = new Set(oRoster.npcs.map(n => n.id));
const oTalkOk = [...ochain.quests, ...og.quests].every(q =>
  (q.objectives || []).filter(o => o.kind === 'talk').every(o => oRids.has(o.target))
  && (!q.talkLines || Object.keys(q.talkLines).every(k => oRids.has(k)))
  && oRids.has(q.giver)
);
t('运营链 talk/giver 全在 roster', oTalkOk);


// 教师迷你链
const teachChain = JSON.parse(readFileSync(join(root, 'public/data/taskchain_teacher_homeroom.json'), 'utf8'));
const teachQs = new QuestSystem(state);
teachQs.load(teachChain);
t('教师 homeroom 初始仅 hr_c1', teachQs.available().length === 1 && teachQs.available()[0].id === 'hr_c1');
teachQs.accept('hr_c1');
teachQs.progress('talk', 'vet');
teachQs.progress('minigame', 'work');
t('教师 c1 可交付', teachQs.isReady('hr_c1'));
teachQs.complete('hr_c1');
t('教师 c2 解锁', teachQs.available().some(q => q.id === 'hr_c2'));
const thrIds = new Set(teachChain.quests.map(q => q.id));
t('教师 homeroom 链 requires 合法', teachChain.quests.length === 3 &&
  teachChain.quests.every(q => (q.requires || []).every(r => thrIds.has(r))));
const teachSub = JSON.parse(readFileSync(join(root, 'public/data/taskchain_teacher_subject.json'), 'utf8'));
const tsbIds = new Set(teachSub.quests.map(q => q.id));
t('教师 subject 链 3 环 requires 合法', teachSub.quests.length === 3 &&
  teachSub.quests.every(q => (q.requires || []).every(r => tsbIds.has(r))));
const teachRoster = JSON.parse(readFileSync(join(root, 'public/data/roster_teacher.json'), 'utf8'));
const teachRids = new Set(teachRoster.npcs.map(n => n.id));
const teachTalkOk = [...teachChain.quests, ...teachSub.quests].every(q =>
  (q.objectives || []).filter(o => o.kind === 'talk').every(o => teachRids.has(o.target))
  && (!q.talkLines || Object.keys(q.talkLines).every(k => teachRids.has(k)))
  && teachRids.has(q.giver)
);
t('教师链 talk/giver 全在 roster', teachTalkOk);


// 医护迷你链
const docChain = JSON.parse(readFileSync(join(root, 'public/data/taskchain_doctor_clinic.json'), 'utf8'));
const docQs = new QuestSystem(state);
docQs.load(docChain);
t('医护 clinic 初始仅 cl_c1', docQs.available().length === 1 && docQs.available()[0].id === 'cl_c1');
docQs.accept('cl_c1');
docQs.progress('talk', 'vet');
docQs.progress('minigame', 'work');
t('医护 c1 可交付', docQs.isReady('cl_c1'));
docQs.complete('cl_c1');
t('医护 c2 解锁', docQs.available().some(q => q.id === 'cl_c2'));
const docIds = new Set(docChain.quests.map(q => q.id));
t('医护 clinic 链 requires 合法', docChain.quests.length === 3 &&
  docChain.quests.every(q => (q.requires || []).every(r => docIds.has(r))));
const nurseChain = JSON.parse(readFileSync(join(root, 'public/data/taskchain_doctor_nurse.json'), 'utf8'));
const nurseIds = new Set(nurseChain.quests.map(q => q.id));
t('医护 nurse 链 3 环 requires 合法', nurseChain.quests.length === 3 &&
  nurseChain.quests.every(q => (q.requires || []).every(r => nurseIds.has(r))));
const docRoster = JSON.parse(readFileSync(join(root, 'public/data/roster_doctor.json'), 'utf8'));
const docRids = new Set(docRoster.npcs.map(n => n.id));
const docTalkOk = [...docChain.quests, ...nurseChain.quests].every(q =>
  (q.objectives || []).filter(o => o.kind === 'talk').every(o => docRids.has(o.target))
  && (!q.talkLines || Object.keys(q.talkLines).every(k => docRids.has(k)))
  && docRids.has(q.giver)
);
t('医护链 talk/giver 全在 roster', docTalkOk);


// 公务员迷你链
const csChain = JSON.parse(readFileSync(join(root, 'public/data/taskchain_civilservant_window.json'), 'utf8'));
const csQs = new QuestSystem(state);
csQs.load(csChain);
t('公务员 window 初始仅 win_c1', csQs.available().length === 1 && csQs.available()[0].id === 'win_c1');
csQs.accept('win_c1');
csQs.progress('talk', 'vet');
csQs.progress('minigame', 'work');
t('公务员 c1 可交付', csQs.isReady('win_c1'));
csQs.complete('win_c1');
t('公务员 c2 解锁', csQs.available().some(q => q.id === 'win_c2'));
const csIds = new Set(csChain.quests.map(q => q.id));
t('公务员 window 链 requires 合法', csChain.quests.length === 3 &&
  csChain.quests.every(q => (q.requires || []).every(r => csIds.has(r))));
const csDesk = JSON.parse(readFileSync(join(root, 'public/data/taskchain_civilservant_desk.json'), 'utf8'));
const csDeskIds = new Set(csDesk.quests.map(q => q.id));
t('公务员 desk 链 3 环 requires 合法', csDesk.quests.length === 3 &&
  csDesk.quests.every(q => (q.requires || []).every(r => csDeskIds.has(r))));
const csRoster = JSON.parse(readFileSync(join(root, 'public/data/roster_civilservant.json'), 'utf8'));
const csRids = new Set(csRoster.npcs.map(n => n.id));
const csTalkOk = [...csChain.quests, ...csDesk.quests].every(q =>
  (q.objectives || []).filter(o => o.kind === 'talk').every(o => csRids.has(o.target))
  && (!q.talkLines || Object.keys(q.talkLines).every(k => csRids.has(k)))
  && csRids.has(q.giver)
);
t('公务员链 talk/giver 全在 roster', csTalkOk);


// 销售迷你链
const salesChain = JSON.parse(readFileSync(join(root, 'public/data/taskchain_sales_field.json'), 'utf8'));
const salesQs = new QuestSystem(state);
salesQs.load(salesChain);
t('销售 field 初始仅 fd_c1', salesQs.available().length === 1 && salesQs.available()[0].id === 'fd_c1');
salesQs.accept('fd_c1');
salesQs.progress('talk', 'vet');
salesQs.progress('minigame', 'work');
t('销售 c1 可交付', salesQs.isReady('fd_c1'));
salesQs.complete('fd_c1');
t('销售 c2 解锁', salesQs.available().some(q => q.id === 'fd_c2'));
const salesIds = new Set(salesChain.quests.map(q => q.id));
t('销售 field 链 requires 合法', salesChain.quests.length === 3 &&
  salesChain.quests.every(q => (q.requires || []).every(r => salesIds.has(r))));
const salesIn = JSON.parse(readFileSync(join(root, 'public/data/taskchain_sales_inside.json'), 'utf8'));
const salesInIds = new Set(salesIn.quests.map(q => q.id));
t('销售 inside 链 3 环 requires 合法', salesIn.quests.length === 3 &&
  salesIn.quests.every(q => (q.requires || []).every(r => salesInIds.has(r))));
const salesRoster = JSON.parse(readFileSync(join(root, 'public/data/roster_sales.json'), 'utf8'));
const salesRids = new Set(salesRoster.npcs.map(n => n.id));
const salesTalkOk = [...salesChain.quests, ...salesIn.quests].every(q =>
  (q.objectives || []).filter(o => o.kind === 'talk').every(o => salesRids.has(o.target))
  && (!q.talkLines || Object.keys(q.talkLines).every(k => salesRids.has(k)))
  && salesRids.has(q.giver)
);
t('销售链 talk/giver 全在 roster', salesTalkOk);


// 律师迷你链
const lawChain = JSON.parse(readFileSync(join(root, 'public/data/taskchain_lawyer_litigation.json'), 'utf8'));
const lawQs = new QuestSystem(state);
lawQs.load(lawChain);
t('律师 litigation 初始仅 lt_c1', lawQs.available().length === 1 && lawQs.available()[0].id === 'lt_c1');
lawQs.accept('lt_c1');
lawQs.progress('talk', 'vet');
lawQs.progress('minigame', 'work');
t('律师 c1 可交付', lawQs.isReady('lt_c1'));
lawQs.complete('lt_c1');
t('律师 c2 解锁', lawQs.available().some(q => q.id === 'lt_c2'));
const lawIds = new Set(lawChain.quests.map(q => q.id));
t('律师 litigation 链 requires 合法', lawChain.quests.length === 3 &&
  lawChain.quests.every(q => (q.requires || []).every(r => lawIds.has(r))));
const lawCorp = JSON.parse(readFileSync(join(root, 'public/data/taskchain_lawyer_corporate.json'), 'utf8'));
const lawCorpIds = new Set(lawCorp.quests.map(q => q.id));
t('律师 corporate 链 3 环 requires 合法', lawCorp.quests.length === 3 &&
  lawCorp.quests.every(q => (q.requires || []).every(r => lawCorpIds.has(r))));
const lawRoster = JSON.parse(readFileSync(join(root, 'public/data/roster_lawyer.json'), 'utf8'));
const lawRids = new Set(lawRoster.npcs.map(n => n.id));
const lawTalkOk = [...lawChain.quests, ...lawCorp.quests].every(q =>
  (q.objectives || []).filter(o => o.kind === 'talk').every(o => lawRids.has(o.target))
  && (!q.talkLines || Object.keys(q.talkLines).every(k => lawRids.has(k)))
  && lawRids.has(q.giver)
);
t('律师链 talk/giver 全在 roster', lawTalkOk);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
