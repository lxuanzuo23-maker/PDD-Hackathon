#!/usr/bin/env node
/**
 * Person C runs this in the first 30 minutes: npm run verify:minimax
 * Confirms the MiniMax key works BEFORE any feature code depends on it.
 * If this fails twice, switch the LLM fallback and never look back.
 *
 * Env (in .env or exported): MINIMAX_API_KEY required.
 * Optional: MINIMAX_BASE_URL, MINIMAX_MODEL.
 */
import { readFileSync, existsSync } from "node:fs";

// Tiny .env loader, no dependency.
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]] && m[2]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const KEY = process.env.MINIMAX_API_KEY;
const BASE = process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1";
const candidates = process.env.MINIMAX_MODEL
  ? [process.env.MINIMAX_MODEL]
  : ["MiniMax-M3", "MiniMax-M2.5", "MiniMax-M2"];

if (!KEY) {
  console.error("FAIL: MINIMAX_API_KEY is not set. cp .env.example .env, then add the key from the sponsor table.");
  process.exit(1);
}

for (const model of candidates) {
  try {
    const started = Date.now();
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
        max_tokens: 8,
      }),
    });
    const ms = Date.now() - started;
    const body = await res.json().catch(() => ({}));
    const text = body?.choices?.[0]?.message?.content;
    if (res.ok && text) {
      console.log(`PASS  model=${model}  latency=${ms}ms  reply=${JSON.stringify(text.trim())}`);
      console.log(`Now set MINIMAX_MODEL=${model} in .env AND in the Render dashboard env vars.`);
      process.exit(0);
    }
    console.error(`model=${model}: HTTP ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  } catch (err) {
    console.error(`model=${model}: ${err.message}`);
  }
}

console.error("FAIL: no candidate model responded.");
console.error("Check: key correct? Base URL right (override with MINIMAX_BASE_URL)? Ask the MiniMax sponsor table for the exact model name and set MINIMAX_MODEL.");
process.exit(1);
