import type { Evidence } from '@/lib/contracts';
// Server-side only. Wire into the authenticated generation route; never pass private intake.
export async function searchPublicProjects(approvedDomain: string): Promise<Evidence[]> {
 const domain = ['developer-tools','payments','healthcare','climate'].includes(approvedDomain) ? approvedDomain : 'developer-tools';
 const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(domain)}&per_page=3`, {headers:{Accept:'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? {Authorization:`Bearer ${process.env.GITHUB_TOKEN}`} : {})}, next:{revalidate:900},signal:AbortSignal.timeout(8000)});
 if (!response.ok) throw new Error(`Public evidence unavailable (${response.status})`);
 const data=await response.json();
 return (data.items ?? []).map((item:{id:number;full_name:string;html_url:string;description:string|null})=>({id:String(item.id),provider:'github' as const,title:item.full_name,url:item.html_url,excerpt:item.description ?? '',fetchedAt:new Date().toISOString(),cached:false}));
}
