import OpenAI from 'openai';
import { cfg, OPENROUTER_KEY } from './config.js';
import { log } from './logger.js';

const client = new OpenAI({
  apiKey: OPENROUTER_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://gmgn.mb-guild.xyz',
    'X-Title': 'gmgnAgent',
  },
});

// Convert Anthropic-style tool schema → OpenAI function tool format
function toOpenAITools(tools) {
  return tools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema ?? { type: 'object', properties: {} },
    },
  }));
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toolLabel(name, args) {
  const hint = args.symbol ?? args.address?.slice(0, 8) ?? args.reason?.slice(0, 40) ?? args.lesson?.slice(0, 40) ?? '';
  return hint ? `<code>${name}</code> ${escHtml(hint)}` : `<code>${name}</code>`;
}

export async function runReAct({ role, systemPrompt, initialMessage, tools, handlers, onProgress }) {
  if (!OPENROUTER_KEY) throw new Error('OPENROUTER_API_KEY not set in .env');

  const openAITools = toOpenAITools(tools);
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: initialMessage },
  ];

  const maxSteps = cfg.claude.maxSteps;
  log.agent(role, `Starting ReAct loop (max ${maxSteps} steps, model: ${cfg.claude.model})`);

  for (let step = 1; step <= maxSteps; step++) {
    let response;
    try {
      response = await client.chat.completions.create({
        model: cfg.claude.model,
        temperature: cfg.claude.temperature,
        max_tokens: 4096,
        tools: openAITools,
        tool_choice: 'auto',
        messages,
      });
    } catch (e) {
      log.error(`OpenRouter API error: ${e.message}`);
      throw e;
    }

    if (!response.choices?.length) {
      log.error(`OpenRouter returned no choices: ${JSON.stringify(response).slice(0, 200)}`);
      break;
    }

    const msg = response.choices[0].message;
    messages.push(msg);

    // Log reasoning text
    if (msg.content?.trim()) {
      const snippet = msg.content.trim().split('\n')[0].slice(0, 120);
      log.agent(role, `💭 ${snippet}`);
      onProgress?.addStep?.(`think_${step}`, `💭 <i>${escHtml(snippet.slice(0, 80))}</i>`);
    }

    const stopReason = response.choices[0].finish_reason;

    if (stopReason === 'stop' || !msg.tool_calls?.length) {
      log.agent(role, `Done after ${step} step(s)`);
      break;
    }

    if (stopReason === 'tool_calls' || msg.tool_calls?.length) {
      for (const call of msg.tool_calls) {
        const { name, arguments: argsStr } = call.function;
        let args = {};
        try { args = JSON.parse(argsStr); } catch { /* malformed JSON, pass empty */ }

        log.tool(name, JSON.stringify(args).slice(0, 120));
        const label = toolLabel(name, args);
        onProgress?.addStep?.(call.id, `⏳ ${label}`);

        let result;
        const handler = handlers[name];
        if (!handler) {
          result = { error: `No handler for tool: ${name}` };
        } else {
          try {
            result = await handler(args);
          } catch (e) {
            result = { error: e.message };
          }
        }

        log.tool(name, `→ ${JSON.stringify(result).slice(0, 120)}`);
        onProgress?.updateStep?.(call.id, `${result?.error ? '❌' : '✅'} ${label}`);

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    log.warn(`[${role}] Unexpected finish_reason: ${stopReason}`);
    break;
  }

  return messages;
}
