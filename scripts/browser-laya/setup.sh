#!/bin/sh
# Run once on the deployment/build machine. Visitors install nothing.
set -eu
cd "$(dirname "$0")/../.."
REV=6f0496f797dc7127265d62e1543a62de507d943c
mkdir -p .wyj-local/laya-source
curl -fL "https://api.github.com/repos/NandhaKishorM/laya/tarball/$REV" -o .wyj-local/laya-source.tar.gz
tar -xzf .wyj-local/laya-source.tar.gz -C .wyj-local/laya-source --strip-components=1
if [ ! -x .wyj-local/venv/bin/python ]; then python3.12 -m venv .wyj-local/venv; fi
.wyj-local/venv/bin/python -m pip install 'laya==0.4.13' 'onnx==1.23.2' 'onnxruntime==1.31.0' 'onnxscript==0.7.2' 'torch==2.14.1' 'transformers==5.20.2'
.wyj-local/venv/bin/python scripts/browser-laya/export-pinned.py
.wyj-local/venv/bin/python scripts/browser-laya/prepare-model.py
node scripts/browser-laya/build-runtime.mjs
