"""Download exact checkpoint, then use upstream's torch/ONNX parity verified exporter."""
import subprocess, sys
from huggingface_hub import snapshot_download
checkpoint=snapshot_download('convaiinnovations/laya',revision='7b928d828b7b0e022f929d9bd2e44165aa270148',allow_patterns=['rl_agent_config.json','model.safetensors','config.json','tokenizer.json','tokenizer/*','encoder/*'])
subprocess.run([sys.executable,'.wyj-local/laya-source/laya-ts/scripts/export_onnx.py','--model-dir',checkpoint,'--out-dir','.wyj-local/onnx-english'],check=True)
