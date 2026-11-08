#!/bin/zsh
# One kitchen manager run. launchd calls this daily; you can also run it by hand.
set -u
REPO="${0:A:h:h}"
LOG="$HOME/Library/Logs/le-petit-burnham.log"
CLAUDE_BIN="${CLAUDE_BIN:-$(command -v claude)}"
MODEL="${LPB_MODEL:-claude-sonnet-5-5}"

cd "$REPO" || exit 1
echo "=== $(date '+%Y-%m-%d %H:%M:%S') run start ===" >> "$LOG"
git pull -q --ff-only >> "$LOG" 2>&1 || echo "git pull failed, using local copy" >> "$LOG"

# The prompt is everything in AGENT_PROMPT.md after the first '---' line.
PROMPT="$(awk 'f; /^---$/ && !f {f=1}' AGENT_PROMPT.md)"

"$CLAUDE_BIN" -p "$PROMPT

Today is $(date '+%A %Y-%m-%d'), local time $(date '+%H:%M').
First, load your tools: call ToolSearch with query \"select:ArtifactData,Artifact\". If either one still is not available after that, stop and say exactly which tool is missing and what ToolSearch returned. Then do today's run." \
  --model "$MODEL" \
  --allowedTools "ToolSearch" "Bash(osascript:*)" "Bash(date:*)" "ArtifactData" "Artifact" "Read" \
    "mcp__Baalda__read_note" "mcp__Baalda__edit_note" "mcp__Baalda__list_notes" "mcp__Baalda__list_vaults" \
  >> "$LOG" 2>&1
echo "=== $(date '+%H:%M:%S') run end (exit $?) ===" >> "$LOG"
