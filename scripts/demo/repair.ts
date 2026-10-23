process.loadEnvFile('.env.local');
import {DEMO_FOUNDERS} from './founders';
import {restoreFixedFounder} from './fixed-founders';
async function main(){
 for(const f of DEMO_FOUNDERS){const result=await restoreFixedFounder(f);console.log(`${f.alias}: ${result?'reconnected; duplicate published fixtures retired':'no exact fixture found; untouched'}`);}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
