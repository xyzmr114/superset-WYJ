#!/bin/sh
# One-time setup for the local Laya companion. Safe to run again: each step skips
# what is already in place. Everything goes under the ignored .wyj-local/ folder.
#
#   pnpm classifier:setup        (or: sh scripts/local-classifier/setup.sh)
#   PYTHON=/path/to/python3.12 pnpm classifier:setup   to choose the interpreter
set -eu

cd "$(dirname "$0")/../.."
VENV=.wyj-local/venv
REQUIREMENTS=scripts/local-classifier/requirements.txt
export HF_HUB_CACHE=.wyj-local/hf
export HF_HUB_DISABLE_TELEMETRY=1

step() { printf '\n==> %s\n' "$1"; }

step "1/3 Python environment ($VENV)"
if [ -x "$VENV/bin/python" ]; then
  echo "Already exists ($("$VENV/bin/python" --version)), skipping."
else
  PY=${PYTHON:-}
  if [ -z "$PY" ]; then
    for candidate in python3.12 python3.11 python3.10 python3; do
      if command -v "$candidate" >/dev/null 2>&1 &&
        "$candidate" -c 'import sys; sys.exit(sys.version_info < (3, 10))' 2>/dev/null; then
        PY=$candidate
        break
      fi
    done
  fi
  if [ -z "$PY" ]; then
    echo "Python 3.10 or newer is required. Install it, or set PYTHON=/path/to/python3." >&2
    exit 1
  fi
  echo "Creating it with $("$PY" --version) ($(command -v "$PY"))."
  "$PY" -m venv "$VENV"
fi

step "2/3 Packages from $REQUIREMENTS"
if "$VENV/bin/python" -m pip install --dry-run --disable-pip-version-check -r "$REQUIREMENTS" 2>/dev/null |
  grep -q '^Would install'; then
  echo "Installing (first time downloads PyTorch and other packages, several hundred MB)..."
  "$VENV/bin/python" -m pip install --quiet --disable-pip-version-check -r "$REQUIREMENTS"
else
  echo "Already installed, skipping."
fi
"$VENV/bin/python" -c 'import laya; print("laya", laya.__version__)' || {
  echo "laya did not import. Check the network and rerun, or delete $VENV and rerun." >&2
  exit 1
}

step "3/3 English checkpoint (about 850 MB) into $HF_HUB_CACHE"
if ls "$HF_HUB_CACHE"/models--convaiinnovations--laya/snapshots/*/model.safetensors >/dev/null 2>&1; then
  echo "Already downloaded. Loading it once to check it works..."
else
  echo "Downloading. This takes a few minutes on a fast connection..."
fi
# Same load path as server.py, so the companion never downloads anything at startup.
"$VENV/bin/python" - <<'EOF'
import sys
sys.path.insert(0, "scripts/local-classifier")
from laya import Router
from questions import build_brief_questions
Router().predict("Backend engineer.", build_brief_questions(), model="english")
print("Checkpoint loads and answers.")
EOF

printf '\nDone. Start the companion with: pnpm classifier\n'
