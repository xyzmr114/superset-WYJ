import {z} from 'zod';
// Free text, stored exactly as sent so the published card matches the preview. Matching maps
// these onto the controlled tags itself; GitHub queries use only the mapped base tags.
const Tag = z.string().min(1).max(40).refine((s) => s.trim().length > 0);

export const Card = z.object({
  alias: z.string().trim().min(1).max(40),
  offers: z.array(Tag).min(1).max(5),
  seeks: z.array(Tag).min(1).max(5),
  interests: z.array(Tag).min(1).max(4),
  availability: z.enum(['exploring', 'weekends', 'full_time']),
  approvedBlurb: z.string().trim().max(280),
  preferences:z.object({techStack:z.array(Tag).max(5),strengths:z.array(Tag).max(5),partnerStrengths:z.array(Tag).max(5),workStyles:z.array(Tag).max(4)}).strict().optional(),
  publishConsent: z.literal(true), // explicit opt-in to publish this card for matching
}).strict();
