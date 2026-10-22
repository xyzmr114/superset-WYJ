import type { Evidence } from '@/lib/contracts';

// Saved snapshot of public GitHub repositories, used only when live search fails.
// Every entry is cached: true and carries the time it was captured, so it is never
// shown as live. These repositories show that related tooling exists; they say
// nothing about customer demand. Descriptions are as published, with emoji removed
// and long ones cut at a sentence or field boundary.
export const EVIDENCE_SNAPSHOT_AT = '2026-10-22T18:51:11Z';
const TRAVEL_AGENTS_SNAPSHOT_AT = '2026-10-22T21:21:30Z';

type Repo = [id: number, fullName: string, description: string];
const repo = (at: string) => ([id, fullName, description]: Repo): Evidence => ({
  id: `github-${id}`, provider: 'github', title: fullName, url: `https://github.com/${fullName}`,
  excerpt: description, fetchedAt: at, cached: true,
});

export const evidenceFixture: Record<string, Evidence[]> = {
  'developer-tools': ([
    [568098118, 'makeplane/plane', 'Open-source Jira, Linear, Monday, and ClickUp alternative. Plane is a modern project management platform to manage tasks, sprints, docs, and triage.'],
    [202291859, 'chatwoot/chatwoot', 'Open-source live-chat, email support, omni-channel desk. An alternative to Intercom, Zendesk, Salesforce Service Cloud etc.'],
    [873328, 'getsentry/sentry', 'Developer-first error tracking and performance monitoring'],
  ] as Repo[]).map(repo(EVIDENCE_SNAPSHOT_AT)),
  payments: ([
    [464415161, 'getlago/lago', 'Open Source Metering and Usage Based Billing API. Consumption tracking, Subscription management, Pricing iterations, Payment orchestration & Revenue analytics'],
    [552877440, 'juspay/hyperswitch', 'Open source, composable payments platform'],
  ] as Repo[]).map(repo(EVIDENCE_SNAPSHOT_AT)),
  healthcare: ([
    [360238600, 'medplum/medplum', 'Medplum is a healthcare platform that helps you quickly develop high-quality compliant applications.'],
    [679584, 'openemr/openemr', 'The most popular open source electronic health records and medical practice management solution.'],
  ] as Repo[]).map(repo(EVIDENCE_SNAPSHOT_AT)),
  climate: ([
    [59370571, 'electricitymaps/electricitymaps-contrib', "The open source repository for Electricity Maps data parsers that powers the world's most comprehensive electricity data platform"],
    [409382013, 'Green-Software-Foundation/carbon-aware-sdk', 'Carbon-Aware SDK'],
  ] as Repo[]).map(repo(EVIDENCE_SNAPSHOT_AT)),
  travel: ([
    [1169880696, 'LetsFG/LetsFG', 'Agent-native flight & hotel search and booking — MCP server, CLI, and Python/JS SDKs.'],
    [1154244616, 'flightclaw/agents', 'Flight search, price tracking and booking for AI agents. Hosted MCP server (mcp.flightclaw.com) + open-source skill.'],
  ] as Repo[]).map(repo(TRAVEL_AGENTS_SNAPSHOT_AT)),
  'ai-agents': ([
    [1283907968, 'oomol-lab/open-connector', 'Open-source auth gateway connecting 1500+ SaaS providers to AI agents through SDK, CLI, MCP, HTTP, and OpenAPI.'],
    [1351879111, 'Human-Agent-Society/reef', 'Infrastructure for continually self-improving agents'],
  ] as Repo[]).map(repo(TRAVEL_AGENTS_SNAPSHOT_AT)),
};
