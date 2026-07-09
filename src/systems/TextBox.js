// TextBox：自适应文本框工具——根治"先定死框再塞文字导致遮字"的通病。
// 核心原则：先量文字实际高度，再据此定框。所有弹窗/报告共用这一套度量逻辑。
//
// 用法：
//   const m = measureText(scene, text, { fontSize:'26px', wrapWidth: 800 });
//   → { width, height }  文字实际渲染尺寸（已按 wrapWidth 折行）
//
//   const box = TextBox.panel(scene, { x, y, width, padding, children:[...] });
//   → 按内容实测高度自动撑开的面板（不写死高度）

// 量一段文字按 wrapWidth 折行后的真实尺寸。用临时隐藏 Text 实测，用后即毁。
export function measureText(scene, text, style = {}) {
  const wrapWidth = style.wrapWidth || style.wordWrap?.width || 99999;
  const probe = scene.add.text(-99999, -99999, text || '', {
    fontSize: style.fontSize || '20px',
    fontStyle: style.fontStyle,
    lineSpacing: style.lineSpacing || 0,
    align: style.align || 'left',
    wordWrap: { width: wrapWidth, useAdvancedWrap: true },
  }).setVisible(false);
  const size = { width: probe.width, height: probe.height };
  probe.destroy();
  return size;
}

// 创建一段文字并返回 { text, height }——height 是它实际占的高度，供调用方累加 y。
// 这是替代"硬编码 y += 40"的安全做法。
export function addFlowText(scene, x, y, text, style = {}) {
  const t = scene.add.text(x, y, text || '', {
    fontSize: style.fontSize || '20px',
    color: style.color || '#ffffff',
    fontStyle: style.fontStyle,
    lineSpacing: style.lineSpacing || 0,
    align: style.align || 'left',
    wordWrap: style.wrapWidth ? { width: style.wrapWidth, useAdvancedWrap: true } : undefined,
  });
  if (style.origin != null) t.setOrigin(style.origin);
  return { text: t, height: t.height };
}

export const TextBox = { measureText, addFlowText };
