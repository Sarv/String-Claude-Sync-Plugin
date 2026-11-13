#!/bin/sh
# Starts one of the plugin's scripts with Node.js:  sh run.sh <script in this folder> [args…]
# (hooks.json and .mcp.json; since 1.9.0-beta.10, CORTEX-136 in the server repo).
#
# Claude Code started from the desktop app or VS Code often has a PATH without the folder of a Node.js installed with
# nvm, Volta, fnm, asdf or nodenv (those add it only in a terminal's shell). So, when `node` is not on PATH, this looks
# in their usual places too, and in Homebrew's and /usr/local's. No Node.js anywhere: exit 0 with no output, so Claude
# Code works as without the plugin (the tools server then simply doesn't start).
s="$1"
[ -n "$s" ] && shift
here=$(dirname "$0")

N=$(command -v node 2>/dev/null)

# nvm: its default version (alias/default: "24", "v24.1.0", "lts/*", "node"…), else the newest installed one
if [ -z "$N" ]; then
  nv="${NVM_DIR:-$HOME/.nvm}"
  if [ -d "$nv/versions/node" ]; then
    want=""
    [ -f "$nv/alias/default" ] && want=$(head -1 "$nv/alias/default" | sed 's/^v//' | tr -d '[:space:]')
    case "$want" in ''|*[!0-9.]*) want="" ;; esac
    pick=$(ls "$nv/versions/node" 2>/dev/null | sed -n 's/^v//p' | grep -E "^${want}(\.|\$)" | sort -t. -k1,1n -k2,2n -k3,3n | tail -1)
    [ -z "$pick" ] && pick=$(ls "$nv/versions/node" 2>/dev/null | sed -n 's/^v//p' | sort -t. -k1,1n -k2,2n -k3,3n | tail -1)
    [ -n "$pick" ] && [ -x "$nv/versions/node/v$pick/bin/node" ] && N="$nv/versions/node/v$pick/bin/node"
  fi
fi

if [ -z "$N" ]; then
  for d in "$HOME/.volta/bin" \
           "$HOME/.local/share/fnm/aliases/default/bin" "$HOME/Library/Application Support/fnm/aliases/default/bin" "$HOME/.fnm/aliases/default/bin" \
           "$HOME/.asdf/shims" "$HOME/.nodenv/shims" \
           /opt/homebrew/bin /usr/local/bin "$HOME/.local/bin" /usr/bin; do
    if [ -x "$d/node" ]; then N="$d/node"; break; fi
  done
fi

[ -n "$N" ] || exit 0
exec "$N" "$here/$s" "$@"
