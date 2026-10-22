import { NextResponse } from 'next/server';
export function notImplemented() {return NextResponse.json({error:{code:'NOT_IMPLEMENTED',message:'Backend not connected. Use the labeled local demo; do not submit personal data to this endpoint.'}},{status:501});}
