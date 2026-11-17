#!/usr/bin/env bun
// Run once to set login credentials: bun setup-auth.js
import { readFileSync, writeFileSync, existsSync } from "fs";
import * as readline from "readline";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

const username = (await ask("  Username: ")).trim();
if (!username) { console.error("Username cannot be empty"); process.exit(1); }

const password = (await ask("  Password: ")).trim();
if (password.length < 8) { console.error("Password must be at least 8 characters"); process.exit(1); }

rl.close();

const hash = await Bun.password.hash(password, "bcrypt");

// Read existing .env and update/insert AUTH_ lines
const envPath = new URL(".env", import.meta.url).pathname;
let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

function setEnvVar(content, key, value) {
  const re = new RegExp(`^${key}=.*$`, "m");
  return re.test(content) ? content.replace(re, `${key}=${value}`) : content + `\n${key}=${value}`;
}

env = setEnvVar(env, "AUTH_USERNAME", username);
env = setEnvVar(env, "AUTH_PASSWORD_HASH", hash);
writeFileSync(envPath, env);

console.log(`\n  ✓ Credentials saved to .env`);
console.log(`  Restart the server: pm2 restart gmgn-trader --update-env\n`);
