import nextEnv from '@next/env';
import {createClerkClient} from '@clerk/backend';
nextEnv.loadEnvConfig(process.cwd(),true);
if(!process.env.CLERK_SECRET_KEY?.startsWith('sk_test_'))throw new Error('Development Clerk keys are required.');
const clerk=createClerkClient({secretKey:process.env.CLERK_SECRET_KEY});
const email='clientbrief-smoke+clerk_test@example.com';
const {data}=await clerk.users.getUserList({emailAddress:[email]});
if(!data.length)await clerk.users.createUser({emailAddress:[email],firstName:'ClientBrief',lastName:'Smoke Test',skipPasswordRequirement:true,privateMetadata:{purpose:'ClientBrief development smoke test'}});
console.log('Development test user ready; Clerk test email mode sends no email.');
