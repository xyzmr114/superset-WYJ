import {HttpError,requireSession} from './http';
import {planFor} from './ideas';

/** The previous free-form cloud harness is not the private matching agent. */
export async function assertLegacyAgentAccess(request:Request,options:{enabled?:boolean;session?:typeof requireSession;plan?:typeof planFor}={}){
 if(!(options.enabled??process.env.ENABLE_LEGACY_AGENT==='true'))throw new HttpError(410,'LEGACY_AGENT_DISABLED','This legacy agent is disabled. Use on-device idea help or the approved-brief Premium studio.');
 const me=await(options.session??requireSession)(request);
 if((await(options.plan??planFor)(me.id)).plan!=='premium')throw new HttpError(403,'PREMIUM_REQUIRED','Cloud agent access requires Premium. Free idea assistance runs on your device.');
 return me;
}
