#!/bin/bash
cd /root/trader
export AGENT_CONFIG_FILE=/root/trader/agent-config-newtoken.json
export AGENT_STATE_FILE=/root/trader/agent/state-newtoken.json
exec /root/.bun/bin/bun agent/newtoken-index.js
