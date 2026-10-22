# Browser-local Laya

Visitors open WYJ and explicitly click **Classify in this browser**. There is no companion installation or hosted inference fallback. Text is passed to a dedicated module worker; only public, same-origin model/runtime asset GETs leave the worker. The private constraints field never enters its arguments. All labels remain editable suggestions.

## Prepare deployment assets once

With Node/pnpm installed, `pnpm install`, Python 3.12 and several GB of free build disk/RAM:

```sh
sh scripts/browser-laya/setup.sh
pnpm build
pnpm start
```

The script pins upstream Laya source `6f0496f797dc7127265d62e1543a62de507d943c` and English checkpoint `7b928d828b7b0e022f929d9bd2e44165aa270148`, exports split ONNX with upstream torch/ONNX verification at 1e-4, then dynamically quantizes MatMul/Gemm weights to int8. Stale intermediate head shape hints are discarded before ORT re-infers shapes. It bundles the upstream TypeScript implementation, rewrites its browser ORT import to the same-origin pinned ORT 1.24.3 module, and changes public model caching to cache-first. Node providers remain unused in the browser.

**Generated files are ignored, not in GitHub:** deploy `public/models/laya/**` and `public/laya-runtime/**` alongside the app. A plain clone/build without preparation will offer manual brief entry, not working inference. If deploying to a static object store/CDN, preserve these same-origin paths through the app origin; no profile data should pass through that store. The exact matching ORT asyncify runtime files must travel with the JS bundle; mixing ORT releases or omitting its WASM file prevents initialization. Do not serve HTML redirects in place of missing model files.

Measured model payload is **602,272,016 bytes** (~602 MB), plus ~26 MB ORT WASM and small JS assets. This is a substantial first-use download, explicitly user initiated. Public weights may be cached in browser CacheStorage; private text is not. Caching may be refused by browser quota, and phones can fail due to memory. Desktop Chrome/Edge recommended. HTTPS or localhost is required for WebGPU; WASM is the fallback. Dynamic int8 kernels may use WASM even on a GPU-capable device. Manual entry stays available.

## Runtime boundary and cancellation

`classifyInBrowser(profile, idea, onProgress?, signal?)` in `lib/private/browser-classifier.ts` does not call fetch. It passes labeled, length-bounded text only through `Worker.postMessage`. The worker rejects any fetch except fixed same-origin model/runtime GETs. Its questions are the same 11 offered-skill/interest questions used by the companion smoke. One question per pass avoids a large 11-question activation batch. Threshold 0.7; sought skills, availability, strengths, stack and working preferences remain manual.

Cancel terminates the worker and releases model memory. Normal completion reuses the worker/model without retaining the request. No raw result or user text is logged. The optional companion adapter is retained separately for existing developer setups; it is not called automatically.

The earlier ten-profile smoke measures float Python checkpoint accuracy, not quantized browser accuracy. Browser quantization can change suggestions; neither runtime may auto-publish. See `scripts/local-classifier/README.md` for existing limitations.
