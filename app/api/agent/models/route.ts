import {modelCatalog} from '@/lib/agent/catalog';
export const dynamic='force-dynamic';
export async function GET(){return Response.json({source:'models.dev',snapshotDate:'2026-10-22',providers:modelCatalog(),defaultProvider:process.env.AGENT_PROVIDER??'deepseek',defaultModel:process.env.AGENT_MODEL??'deepseek-flash'});}
