"""Quantize the upstream verified split English export for browser WASM inference."""
import json, shutil, hashlib, onnx
from pathlib import Path
from onnxruntime.quantization import quantize_dynamic, QuantType
source=Path('.wyj-local/onnx-english'); target=Path('public/models/laya'); target.mkdir(parents=True,exist_ok=True)
for name in ('encoder.onnx','head.onnx'):
    model=onnx.load(str(source/name))
    del model.graph.value_info[:] # discard stale exporter shape hints; ORT re-infers them
    quantize_dynamic(model,str(target/name),weight_type=QuantType.QInt8,per_channel=False,op_types_to_quantize=['MatMul','Gemm'],use_external_data_format=False)
for name in ('tokenizer.json','rl_agent_config.json'):
    shutil.copy2(source/name,target/name)
files={p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in target.iterdir() if p.suffix in ('.onnx','.json') and p.name!='manifest.json'}
(target/'manifest.json').write_text(json.dumps({'checkpoint':'convaiinnovations/laya','checkpointRevision':'7b928d828b7b0e022f929d9bd2e44165aa270148','runtimeRevision':'6f0496f797dc7127265d62e1543a62de507d943c','quantization':'dynamic-int8 MatMul/Gemm','totalBytes':sum(f['bytes'] for f in files.values()),'files':files},indent=2))
print(json.dumps({'totalBytes':sum(f['bytes'] for f in files.values()),'files':files},indent=2))
