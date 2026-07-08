// AIClient — 前端 AI 客户端，调自己的 /ai 边缘函数（不碰 API Key），带降级兜底。
// 纯 fetch 工具，不依赖 Phaser。

export class AIClient {
  /**
   * 调用 AI（先走边缘函数 /ai，失败则走降级）
   * @param {Array}  messages  — [{ role:'user', content:'...' }]
   * @param {Object} opts
   *   model      {string}  默认 'hy3'
   *   fallbackFn {Function} 降级回调，返回 { text }；不传则用内置兜底
   *   timeoutMs  {number}  默认 8000
   * @returns {Promise<{text:string, source:'ai'|'fallback'}>}
   */
  static async call(messages, {
    model = 'hy3',
    fallbackFn = null,
    timeoutMs = 8000,
  } = {}) {
    // --- 尝试调用边缘函数 ---
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch('/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const json = await res.json();

      if (json.ok && json.text) {
        return { text: json.text, source: 'ai' };
      }
      // 边缘函数返回 ok:false，走降级
      return await this._fallback(fallbackFn, messages);
    } catch (err) {
      // 网络错误 / 超时 / fetch 失败，走降级
      return await this._fallback(fallbackFn, messages);
    }
  }

  // ---- 内部：降级兜底 ----
  static async _fallback(fallbackFn, messages) {
    if (typeof fallbackFn === 'function') {
      try {
        const result = await fallbackFn(messages);
        return { text: result?.text || '（降级回调未返回有效文本）', source: 'fallback' };
      } catch (e) {
        // fallbackFn 本身也失败了，用内置兜底
      }
    }
    // 内置兜底：返回友好提示
    return {
      text: '（AI 助手暂时不可用，请稍后再试）',
      source: 'fallback',
    };
  }
}
