// 从存档构造进入 WorldScene 的 resume 参数。
// 纯函数，不依赖 Phaser，便于单测与 Title/其他入口复用。
//
// 关键：必须显式带回 subRole（程序员 dev/test 任务链）和 deep（旗舰/轻量）。
// 旧逻辑只传 career+act → WorldScene 里 data.deep 为 undefined 被当成 false，
// 轻量/深度分支与任务链加载会走偏。

const DEEP_CAREERS = new Set(['programmer', 'product', 'admin']);

/**
 * @param {object|null} save SaveSystem.load() 结果
 * @returns {null|{career:string,act:number,subRole:string|null,deep:boolean}}
 */
export function buildWorldResumeData(save) {
  if (!save || typeof save !== 'object') return null;
  const career = save.career || 'programmer';
  const act = Number.isFinite(save.act) && save.act > 0 ? save.act : 1;
  const subRole = save.subRole || null;
  // deep：存档有字段用存档；否则按职业默认（旗舰三职 true，其余 false）
  const deep = save.deep != null ? !!save.deep : DEEP_CAREERS.has(career);
  return { career, act, subRole, deep };
}

export { DEEP_CAREERS };
