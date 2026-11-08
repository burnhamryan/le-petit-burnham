#!/bin/zsh
# Mac half of the kitchen manager. launchd runs this daily (installed by install-daily.sh).
# No AI here: it pulls the cloud's to-do list (bridge/outbox.json), applies it to
# Reminders and Calendar, and pushes back what happened (bridge/inbox.json).
# The cloud half runs as a scheduled Claude task each morning before this.
set -u
REPO="${0:A:h:h}"
LOG="$HOME/Library/Logs/le-petit-burnham.log"
STATE="$HOME/.le-petit-burnham/state.json"
mkdir -p "${STATE:h}"

cd "$REPO" || exit 1
echo "=== $(date '+%Y-%m-%d %H:%M:%S') Mac sync start ===" >> "$LOG"
git pull -q --rebase --autostash >> "$LOG" 2>&1 || echo "git pull failed, using local copy" >> "$LOG"

if [[ ! -f bridge/outbox.json ]]; then
  echo "No bridge/outbox.json yet; reporting Reminders state only." >> "$LOG"
fi

osascript -l JavaScript scripts/apple-sync.js "$REPO/bridge/outbox.json" "$REPO/bridge/inbox.json" "$STATE" >> "$LOG" 2>&1
echo "osascript exit $?" >> "$LOG"

git add bridge/inbox.json >> "$LOG" 2>&1
if ! git diff --cached --quiet; then
  git commit -q -m "Mac sync $(date '+%Y-%m-%d %H:%M')" >> "$LOG" 2>&1
  git pull -q --rebase >> "$LOG" 2>&1
  git push -q >> "$LOG" 2>&1 && echo "Pushed inbox to GitHub" >> "$LOG" || echo "git push FAILED" >> "$LOG"
fi
echo "=== $(date '+%H:%M:%S') Mac sync end ===" >> "$LOG"
