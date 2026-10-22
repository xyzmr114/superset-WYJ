# Free browser-local idea assistance (Bonsai)

Bonsai 1.7B is a generative model, separate from Laya's narrow classifier. The free intake can preload it without receiving any private text, then pass only the idea the founder explicitly selects for improvement. The returned draft stays editable and unpublished until the founder chooses it and separately approves their final public brief.

## Prepare deployment assets

```sh
pnpm install
pnpm bonsai:prepare
pnpm build
```

The Node preparation script downloads public model assets from the pinned `onnx-community/Bonsai-1.7B-ONNX` revision `3f3cf1759daf66342d26610488b9931f2fafcb29`, and bundles Transformers.js 4.1.0 into a dedicated browser worker. Its official nested ORT 1.26 development runtime is copied alongside it; this does not change Laya's ORT 1.24.3 instance. This follows the official [ONNX model card](https://huggingface.co/onnx-community/Bonsai-1.7B-ONNX) and [Bonsai browser demo](https://huggingface.co/spaces/webml-community/bonsai-webgpu/tree/main).

Generated `public/models/bonsai/**` and `public/bonsai-runtime/**` are ignored. Include them in deployment; a clone/build without preparation cannot provide local generation. The model payload measures **300,184,413 bytes** (~300 MB), plus runtime JS/WASM. Preparation downloads only q1 weights, not the several-GB unquantized model. Visitor browsers may cache only public model assets.

## Browser requirements and boundary

WebGPU is required for this q1 runtime, checked before the model download. Recent Chrome/Edge with available GPU recommended. Unsupported browsers receive an explicit local-model unavailable result and retain manual idea editing; there is no cloud fallback. Running a model locally can use substantial memory even with 1-bit stored weights. Warmup should not compete with other large inference tasks on small devices.

`warmLocalIdeaAgent(progress?, signal?)` starts loading without accepting text. `improveIdeaLocally(idea, progress?, signal?)` sends a maximum 4,000-character selected idea only through worker `postMessage`. Fetches inside the worker are restricted to same-origin fixed model assets and runtime files, with no query strings, body, cookies or non-GET methods. No inference POST or telemetry is implemented. Errors never echo idea content.

`stopLocalIdeaAgent()` terminates the worker, releases GPU memory, and rejects pending work. No conversation/KV cache is retained across founders or ideas. A completed pipeline is reused for subsequent requests on this device. Generation requests are serial. Output is a short reviewed suggestion, not a guarantee of startup quality or factual validation.

The optional premium DeepSeek service remains separate and requires approval of its exact public-brief payload. Bonsai never invokes that service automatically.
