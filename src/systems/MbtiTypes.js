// MbtiTypes：MBTI 16 型名称/别称 + 四维读数（纯逻辑，无 Phaser，可 node 单测）。
// 专业依据：MBTI 四维(E/I·S/N·T/F·J/P);本游戏由大五(Big-Five)经 McCrae-Costa 对应折算——
//   E(外向)→E/I、O(开放)→N/S、A(宜人)→F/T、C(尽责)→J/P。玩家看到的是专业、好看的画像。

// 16 型别称（沿用广为人知的命名，便于玩家理解）
export const MBTI_TYPES = {
  INTJ: { nick: '建筑师', blurb: '独立而有远见，擅长把复杂问题系统化。' },
  INTP: { nick: '逻辑学家', blurb: '好奇、爱钻研，享受把想法拆开重装。' },
  ENTJ: { nick: '指挥官', blurb: '果决、有组织力，天生把人和事推向目标。' },
  ENTP: { nick: '辩论家', blurb: '机敏、爱挑战，点子多、不怕唱反调。' },
  INFJ: { nick: '提倡者', blurb: '理想而细腻，为在意的人和事默默使劲。' },
  INFP: { nick: '调停者', blurb: '温柔、有信念，在意意义胜过输赢。' },
  ENFJ: { nick: '主人公', blurb: '有感染力，擅长看见并托举身边的人。' },
  ENFP: { nick: '竞选者', blurb: '热情、好奇，能把可能性说得让人心动。' },
  ISTJ: { nick: '物流师', blurb: '踏实、可靠，把该做的事一件件做扎实。' },
  ISFJ: { nick: '守卫者', blurb: '细心、尽责，默默照顾好每一个细节。' },
  ESTJ: { nick: '总经理', blurb: '务实、有条理，善于把秩序落到实处。' },
  ESFJ: { nick: '执政官', blurb: '热心、周到，是团队里的黏合剂。' },
  ISTP: { nick: '鉴赏家', blurb: '冷静、动手强，用最省力的方式解决问题。' },
  ISFP: { nick: '探险家', blurb: '安静而敏感，用行动而非言语表达自己。' },
  ESTP: { nick: '企业家', blurb: '敏捷、敢冲，在当下的变化里如鱼得水。' },
  ESFP: { nick: '表演者', blurb: '爱热闹、有活力，把气氛点亮是本能。' },
};

// 四个维度（正极对应 big5 ≥0 的那一端）
export const MBTI_DIMS = [
  { big5: 'E', posChar: 'E', posName: '外向', negChar: 'I', negName: '内向' },
  { big5: 'O', posChar: 'N', posName: '直觉', negChar: 'S', negName: '实感' },
  { big5: 'A', posChar: 'F', posName: '情感', negChar: 'T', negName: '思考' },
  { big5: 'C', posChar: 'J', posName: '判断', negChar: 'P', negName: '感知' },
];

/** 由大五折算 MBTI 四字母（与 OpeningScene 既有口径一致） */
export function mbtiFromBig5(b = {}) {
  const n = (v) => Number(v) || 0;
  return (n(b.E) >= 0 ? 'E' : 'I') + (n(b.O) >= 0 ? 'N' : 'S') + (n(b.A) >= 0 ? 'F' : 'T') + (n(b.C) >= 0 ? 'J' : 'P');
}

/** 取型别称/简介（未知型安全兜底） */
export function typeInfo(mbti) {
  return MBTI_TYPES[mbti] || { nick: '探索者', blurb: '你的画像还在成形——多走几步，会更清晰。' };
}

// 大五净值 → -100..100 展示值（软压缩，约 ±6 净值接近满极）
function squash(v, scale = 6) {
  const t = (Number(v) || 0) / scale;
  return Math.round(Math.max(-1, Math.min(1, t / (1 + Math.abs(t)))) * 100);
}

/**
 * 四维读数：每维给 { 左标/右标、-100..100 值、命中端 }。value>0 偏正极(E/N/F/J)。
 * 用于画专业的四条维度滑条。
 * @param {object} b  big5 净值 {O,C,E,A,N}
 */
export function mbtiDimReadings(b = {}) {
  return MBTI_DIMS.map((d) => {
    const value = squash(b[d.big5]);
    return {
      big5: d.big5,
      value,
      left: `${d.negChar} ${d.negName}`,
      right: `${d.posChar} ${d.posName}`,
      pick: value >= 0 ? d.posChar : d.negChar,
      // 该维强度百分比（离中点多远，给"倾向明显/中庸"用）
      strength: Math.abs(value),
    };
  });
}
