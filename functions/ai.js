/**
 * EdgeOne Pages 边缘函数 — 代理腾讯混元 hy3 API
 * 部署后端点：https://<你的域名>/ai
 *
 * 环境变量（在 EdgeOne 控制台 → 函数 → 环境变量 中配置，部署时自动绑定为全局常量）：
 *   HUNYUAN_API_KEY — 混元 API 的 Bearer Token
 *   （也兼容 DEEPSEEK_API_KEY 作为备选变量名）
 */

async function handleRequest(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // OPTIONS 预检
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // 仅处理 POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { messages, model } = body;

    // ---- API Key：从环境变量读取，不硬编码 ----
    // EdgeOne 部署时自动将控制台环境变量绑定为全局常量
    const apiKey =
      (typeof HUNYUAN_API_KEY === 'string' && HUNYUAN_API_KEY) ||
      (typeof DEEPSEEK_API_KEY === 'string' && DEEPSEEK_API_KEY) ||
      '';

    if (!apiKey) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'API key not configured. Please set HUNYUAN_API_KEY in EdgeOne console.',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---- 调用混元 hy3（OpenAI 兼容格式）----
    const upstream = await fetch('https://tokenhub.tencentmaas.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'hy3',
        messages,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      return new Response(JSON.stringify({
        ok: false,
        error: `Upstream API error ${upstream.status}: ${errText.slice(0, 200)}`,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await upstream.json();
    const text = data.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ ok: true, text }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      error: err.message || 'Unknown error',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

addEventListener('fetch', event => event.respondWith(handleRequest(event.request)));
