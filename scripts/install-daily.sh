#!/bin/zsh
# Installs the daily kitchen manager run as a launchd job for this Mac user.
# Usage: zsh scripts/install-daily.sh [hour] [minute]   (default 7:07)
set -e
REPO="${0:A:h:h}"
HOUR="${1:-7}"; MINUTE="${2:-7}"
LABEL="com.burnham.le-petit-burnham"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/le-petit-burnham.log"
CLAUDE_BIN="$(command -v claude || true)"

if [[ -z "$CLAUDE_BIN" ]]; then
  echo "Claude Code (the 'claude' command) isn't installed or isn't on your PATH. Install it, sign in with 'claude', then run this again."
  exit 1
fi

echo "Checking Reminders and Calendar access (macOS may ask you to allow Terminal)..."
osascript -e 'tell application "Reminders" to get name of list "Groceries"' >/dev/null \
  && echo "  Reminders: OK, found the Groceries list" \
  || echo "  Reminders: NOT OK. Allow it in System Settings > Privacy & Security > Automation, then rerun."
osascript -e 'tell application "Calendar" to get name of calendar "Family"' >/dev/null \
  && echo "  Calendar: OK, found the Family calendar" \
  || echo "  Calendar: NOT OK. Allow it in System Settings > Privacy & Security > Automation, then rerun."

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>/bin/zsh</string><string>$REPO/scripts/run-kitchen-manager.sh</string></array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>${CLAUDE_BIN:h}:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    <key>CLAUDE_BIN</key><string>$CLAUDE_BIN</string>
  </dict>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>$HOUR</integer><key>Minute</key><integer>$MINUTE</integer></dict>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
printf "\nInstalled: the kitchen manager runs daily at %d:%02d (if the Mac is asleep, it runs when it wakes).\n" "$HOUR" "$MINUTE"
echo "Run it now:   launchctl kickstart gui/$(id -u)/$LABEL"
echo "Watch it:     tail -f $LOG"
echo "Remove it:    launchctl bootout gui/$(id -u) $PLIST && rm $PLIST"
