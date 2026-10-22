import {modelCatalog} from '@/lib/agent/catalog';
export const dynamic='force-dynamic';
export async function GET(){return Response.json({source:'models.dev',snapshotDate:'2026-10-22',providers:modelCatalog(),defaultProvider:process.env.AGENT_PROVIDER??'openrouter',defaultModel:process.env.AGENT_MODEL??'nvidia/nemotron-3.5-lightning:free'});}
