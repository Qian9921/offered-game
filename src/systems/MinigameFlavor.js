// MinigameFlavor：按 career + subRole 解析小游戏「风味」——纯函数、无 Phaser。
// Debug / Sequence / Minigame 共用；WorldScene 只传 career/subRole 或本模块的 resolve 结果。

/** @typedef {{ key: string, sequenceKey: string, debugTitle: string, sequenceTitle: string, debugHint: string, sequenceHint: string, solvedLabel: string, failLabel: string, loading: string }} FlavorChrome */

const CHROME = {
  dev: {
    key: 'dev',
    sequenceKey: 'dev',
    debugTitle: '🐛 Debug 找茬',
    sequenceTitle: '⚙️ 开发·流程排序',
    debugHint: '👆 点击你认为有 bug 的那一行',
    sequenceHint: '👆 按正确的执行顺序，依次点击下面的步骤',
    solvedLabel: '✓ 修复成功',
    failLabel: '✗ 没找到',
    loading: '加载代码…',
  },
  test: {
    key: 'test',
    sequenceKey: 'test',
    debugTitle: '🔍 测试·缺陷排查',
    sequenceTitle: '📋 测试·流程排序',
    debugHint: '👆 点击有缺陷的那一行，把 bug 记进缺陷单',
    sequenceHint: '👆 按正确的测试/验收顺序，依次点击步骤',
    solvedLabel: '✓ 缺陷定位',
    failLabel: '✗ 漏检了',
    loading: '加载用例…',
  },
  product: {
    key: 'product',
    sequenceKey: 'product',
    debugTitle: '📐 产品·逻辑挑错',
    sequenceTitle: '📋 产品·流程排序',
    debugHint: '👆 点出有问题的那一行（需求/规则描述）',
    sequenceHint: '👆 按正确的产品推进顺序点击',
    solvedLabel: '✓ 问题定位',
    failLabel: '✗ 没找准',
    loading: '加载需求…',
  },
  admin: {
    key: 'admin',
    sequenceKey: 'admin',
    debugTitle: '📑 行政·文书挑错',
    sequenceTitle: '📋 行政·办事流程',
    debugHint: '👆 点出有误的那一行（流程/公文描述）',
    sequenceHint: '👆 按正确的办事顺序点击',
    solvedLabel: '✓ 差错已标',
    failLabel: '✗ 漏标了',
    loading: '加载台账…',
  },
  design: {
    key: 'design',
    sequenceKey: 'design',
    debugTitle: '🎨 设计·稿面挑错',
    sequenceTitle: '📐 设计·交付流程',
    debugHint: '👆 点出有问题的那一行（规范/标注描述）',
    sequenceHint: '👆 按正确的设计交付顺序点击',
    solvedLabel: '✓ 问题标出',
    failLabel: '✗ 没点中',
    loading: '加载稿面…',
  },
  ops: {
    key: 'ops',
    sequenceKey: 'ops',
    debugTitle: '📣 运营·文案/数据挑错',
    sequenceTitle: '📈 运营·活动流程',
    debugHint: '👆 点出有问题的那一行',
    sequenceHint: '👆 按正确的运营推进顺序点击',
    solvedLabel: '✓ 问题定位',
    failLabel: '✗ 漏了',
    loading: '加载方案…',
  },
  teach: {
    key: 'teach',
    sequenceKey: 'teach',
    debugTitle: '📚 教学·教案挑错',
    sequenceTitle: '📝 教学·备课流程',
    debugHint: '👆 点出有问题的那一行',
    sequenceHint: '👆 按正确的教学准备顺序点击',
    solvedLabel: '✓ 已修正',
    failLabel: '✗ 没找准',
    loading: '加载教案…',
  },
  medical: {
    key: 'medical',
    sequenceKey: 'medical',
    debugTitle: '🩺 医护·流程挑错',
    sequenceTitle: '🏥 医护·处置流程',
    debugHint: '👆 点出有风险的那一步描述',
    sequenceHint: '👆 按正确的临床/护理顺序点击',
    solvedLabel: '✓ 风险标出',
    failLabel: '✗ 漏检',
    loading: '加载病历…',
  },
  gov: {
    key: 'gov',
    sequenceKey: 'gov',
    debugTitle: '🏛️ 政务·材料挑错',
    sequenceTitle: '🪟 政务·办事流程',
    debugHint: '👆 点出有误的那一行',
    sequenceHint: '👆 按正确的窗口办理顺序点击',
    solvedLabel: '✓ 差错已标',
    failLabel: '✗ 漏标',
    loading: '加载材料…',
  },
  sales: {
    key: 'sales',
    sequenceKey: 'sales',
    debugTitle: '🤝 销售·话术/流程挑错',
    sequenceTitle: '📞 销售·成交流程',
    debugHint: '👆 点出有问题的那一行',
    sequenceHint: '👆 按正确的销售推进顺序点击',
    solvedLabel: '✓ 问题定位',
    failLabel: '✗ 没找准',
    loading: '加载线索…',
  },
  law: {
    key: 'law',
    sequenceKey: 'law',
    debugTitle: '⚖️ 法务·文书挑错',
    sequenceTitle: '📂 法务·办案流程',
    debugHint: '👆 点出有问题的那一行',
    sequenceHint: '👆 按正确的办案顺序点击',
    solvedLabel: '✓ 问题标出',
    failLabel: '✗ 漏了',
    loading: '加载卷宗…',
  },
};

// subRole → 优先 flavor（程序员 test 真分叉；其余 subRole 落到职业默认）
const SUBROLE_FLAVOR = {
  test: 'test',
  dev: 'dev',
  biz: 'product',
  ux: 'product',
  office: 'admin',
  student: 'admin',
  visual: 'design',
  ui: 'design',
  content: 'ops',
  growth: 'ops',
  homeroom: 'teach',
  subject: 'teach',
  clinic: 'medical',
  nurse: 'medical',
  window: 'gov',
  desk: 'gov',
  field: 'sales',
  inside: 'sales',
  litigation: 'law',
  corporate: 'law',
};

const CAREER_FLAVOR = {
  programmer: 'dev',
  product: 'product',
  admin: 'admin',
  designer: 'design',
  operation: 'ops',
  teacher: 'teach',
  doctor: 'medical',
  civilservant: 'gov',
  sales: 'sales',
  lawyer: 'law',
};

/**
 * @param {string|null|undefined} career
 * @param {string|null|undefined} subRole
 * @returns {FlavorChrome}
 */
export function resolveWorkGameFlavor(career, subRole) {
  let key = 'dev';
  if (subRole && SUBROLE_FLAVOR[subRole]) key = SUBROLE_FLAVOR[subRole];
  else if (career && CAREER_FLAVOR[career]) key = CAREER_FLAVOR[career];
  return { ...CHROME[key] };
}

/**
 * 从 sequence 题库 JSON 取池：优先 flavor.sequenceKey，否则 dev。
 * @param {object} data
 * @param {string} sequenceKey
 * @returns {array}
 */
export function pickSequencePool(data, sequenceKey) {
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data[sequenceKey]) && data[sequenceKey].length) return data[sequenceKey];
  if (Array.isArray(data.dev)) return data.dev;
  if (Array.isArray(data.puzzles)) return data.puzzles;
  return [];
}

/**
 * 从 debug_puzzles JSON 取池。
 * 新格式：{ pools: { dev, test, product, ... }, puzzles? }
 * 旧格式：{ puzzles: [] } → 视为 dev/test 代码池
 * @param {object} data
 * @param {string} flavorKey  resolveWorkGameFlavor().key
 * @returns {array}
 */
export function pickDebugPool(data, flavorKey) {
  if (!data || typeof data !== 'object') return [];
  const key = flavorKey || 'dev';
  if (data.pools && typeof data.pools === 'object') {
    if (Array.isArray(data.pools[key]) && data.pools[key].length) return data.pools[key];
    // test 可回落 dev 代码池
    if (key === 'test' && Array.isArray(data.pools.dev) && data.pools.dev.length) return data.pools.dev;
    if (Array.isArray(data.pools.dev) && data.pools.dev.length) return data.pools.dev;
  }
  if (Array.isArray(data.puzzles) && data.puzzles.length) return data.puzzles;
  return [];
}

/**
 * MinigameScene 选择题库：支持 { questions } 或 { byCareer: { programmer: [] } }
 */
export function pickMinigameQuestions(data, career, type) {
  if (!data || typeof data !== 'object') return null;
  if (data.byCareer && career && Array.isArray(data.byCareer[career]) && data.byCareer[career].length) {
    return data.byCareer[career];
  }
  if (Array.isArray(data.questions) && data.questions.length) return data.questions;
  return null;
}

export const FLAVOR_KEYS = Object.keys(CHROME);
export { CHROME, CAREER_FLAVOR, SUBROLE_FLAVOR };
