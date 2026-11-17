const TTY = process.stdout.isTTY;

// Strip API keys from URLs and remove known secret patterns before logging
const SECRET_PATTERNS = [
  /([?&]api[-_]?key=)[^&\s"']*/gi,
  /([?&]access[-_]?token=)[^&\s"']*/gi,
  /(Authorization:\s*Bearer\s+)\S+/gi,
  /(sk-or-v1-)\S+/g,
  /(jup_)\S+/g,
  /(gmgn_)\S+/g,
];

export function sanitize(str) {
  if (typeof str !== 'string') return str;
  let out = str;
  for (const re of SECRET_PATTERNS) out = out.replace(re, (_, prefix) => `${prefix}[REDACTED]`);
  return out;
}

const RESET  = TTY ? '\x1b[0m'  : '';
const CYAN   = TTY ? '\x1b[36m' : '';
const GREEN  = TTY ? '\x1b[32m' : '';
const YELLOW = TTY ? '\x1b[33m' : '';
const RED    = TTY ? '\x1b[31m' : '';
const DIM    = TTY ? '\x1b[2m'  : '';

function ts() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export const log = {
  info:  (msg) => console.log(`${DIM}${ts()}${RESET} ${CYAN}[INFO]${RESET}  ${sanitize(msg)}`),
  ok:    (msg) => console.log(`${DIM}${ts()}${RESET} ${GREEN}[OK]${RESET}    ${sanitize(msg)}`),
  warn:  (msg) => console.log(`${DIM}${ts()}${RESET} ${YELLOW}[WARN]${RESET}  ${sanitize(msg)}`),
  error: (msg) => console.error(`${DIM}${ts()}${RESET} ${RED}[ERROR]${RESET} ${sanitize(msg)}`),
  agent: (role, msg) => console.log(`${DIM}${ts()}${RESET} ${YELLOW}[${role}]${RESET} ${sanitize(msg)}`),
  tool:  (name, msg) => console.log(`${DIM}${ts()}${RESET} ${DIM}[tool:${name}]${RESET} ${sanitize(msg)}`),
};
