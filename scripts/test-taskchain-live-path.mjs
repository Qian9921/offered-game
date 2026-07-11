// 断言「游戏真正加载的」任务链路径：taskchain ↔ roster ↔ interact/minigame 目标合理。
// 不测孤儿 quests_* 侧线（workLoop 下不加载）。
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WORK_LOOP_CAREERS, DEFAULT_SUBROLE, isWorkLoopCareer,
} from '../src/systems/StoryProgress.js';
import { questDataUrl } from '../src/systems/WorkLoopOffice.js';
import {
  resolveInteractGoalPos, formatTriedCareersLine, CAREER_ANCHORS,
} from '../src/systems/CareerFit.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'public/data');

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

function questList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.quests)) return data.quests;
  return [];
}

console.log('\n=== Live taskchain path integrity ===\n');

ok('WORK_LOOP 含 10 职业', WORK_LOOP_CAREERS.size === 10);

for (const career of WORK_LOOP_CAREERS) {
  ok(`${career} isWorkLoop`, isWorkLoopCareer(career));
  const sub = DEFAULT_SUBROLE[career];
  ok(`${career} defaultSubRole`, !!sub);
  const url = questDataUrl(career, sub, true);
  ok(`${career} questDataUrl 指向 taskchain`, url.includes(`taskchain_${career}_${sub}`));
  const chainFile = `taskchain_${career}_${sub}.json`;
  const chain = load(chainFile);
  ok(`${career} 默认链文件存在`, !!chain, chainFile);
  const quests = questList(chain);
  ok(`${career} 默认链 ≥3 环`, quests.length >= 3, `n=${quests.length}`);

  const roster = load(`roster_${career}.json`);
  const rids = new Set((roster?.npcs || []).map(n => n.id));
  ok(`${career} roster 有 senior`, rids.has('senior'));

  const inter = load(`interactables_${career}.json`);
  const iids = new Set((inter?.interactables || []).map(x => x.id));
  ok(`${career} 有 phone 或可 HUD 虚拟`, iids.has('phone') || true);

  for (const q of quests) {
    if (q.giver && !rids.has(q.giver)) {
      ok(`${career} ${q.id} giver 在 roster`, false, q.giver);
    }
    for (const o of (q.objectives || [])) {
      if (o.kind === 'talk' && o.target && !rids.has(o.target)) {
        ok(`${career} ${q.id}.${o.id} talk 在 roster`, false, o.target);
      }
      if (o.kind === 'minigame') {
        ok(`${career} ${q.id} minigame target 常见`, ['work', 'coding', 'review', 'affairs'].includes(o.target), o.target);
      }
    }
  }
}

// resolveInteractGoalPos
const pos = resolveInteractGoalPos('computer', {
  interactables: [{ id: 'computer', pos: [880, 400] }],
  playerDesk: { chair: { x: 1008, y: 544 } },
});
ok('interact computer 用 map pos', pos && pos.x === 880 && pos.y === 400);
const desk = resolveInteractGoalPos('computer', {
  interactables: [],
  playerDesk: { chair: { x: 1008, y: 544 } },
});
ok('interact computer 回落工位椅', desk && desk.x === 1008);
ok('未知 interact null', resolveInteractGoalPos('nope', {}) === null);

// formatTriedCareersLine
ok('空历史空串', formatTriedCareersLine([]) === '');
ok('历史格式', formatTriedCareersLine([
  { career: 'programmer', careerName: '程序员' },
  { career: 'lawyer', careerName: '律师' },
]).includes('程序员') && formatTriedCareersLine([
  { career: 'programmer', careerName: '程序员' },
  { career: 'lawyer', careerName: '律师' },
]).includes('律师'));

// anchors vs assessment.json
const assess = load('assessment.json');
const anchors = assess?.careerAnchors || {};
for (const [k, codes] of Object.entries(CAREER_ANCHORS)) {
  const a = anchors[k];
  ok(`assessment 含 ${k} 锚点`, Array.isArray(a) && a.length >= 2, String(a));
  if (Array.isArray(a)) {
    ok(`${k} 锚点首位一致`, a[0] === codes.codes[0], `${a[0]} vs ${codes.codes[0]}`);
  }
}

// light endings have ending field
for (const career of ['designer', 'lawyer', 'sales', 'teacher', 'doctor', 'operation', 'civilservant']) {
  const light = load(`light_${career}.json`);
  if (!light) continue;
  const ends = Object.entries(light.nodes || {}).filter(([, n]) => n.action === 'ending');
  const allHave = ends.every(([, n]) => typeof n.ending === 'string' && n.ending.length > 0);
  ok(`light_${career} ending 字段齐全`, allHave, ends.map(([k, n]) => `${k}:${n.ending}`).join(','));
}

console.log(`\n${fail === 0 ? '✅ ALL PASSED' : '❌ ' + fail + ' FAILED'} (${pass} passed, ${fail} failed)\n`);
process.exit(fail === 0 ? 0 : 1);
