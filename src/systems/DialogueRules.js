// 对话树纯规则：无 Phaser 依赖，便于单测与引擎共用。

/**
 * 检查 choice.condition：每个状态键可带 min(≥) / max(≤)。
 * @param {object|null|undefined} condition
 * @param {(key:string)=>number} getStat  取当前状态值
 * @returns {boolean}
 */
export function checkChoiceCondition(condition, getStat) {
  if (!condition) return true;
  if (typeof getStat !== 'function') return true;
  for (const [key, rule] of Object.entries(condition)) {
    if (!rule || typeof rule !== 'object') continue;
    const value = getStat(key);
    const v = Number(value);
    const num = Number.isFinite(v) ? v : 0;
    if (rule.min != null && num < rule.min) return false;
    if (rule.max != null && num > rule.max) return false;
  }
  return true;
}

/**
 * 过滤可见选项；全被滤掉时返回空数组（引擎层决定兜底）。
 */
export function filterVisibleChoices(choices, getStat) {
  if (!Array.isArray(choices)) return [];
  return choices.filter(c => checkChoiceCondition(c && c.condition, getStat));
}
