import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as directory from '../src/lib/savingsClubDirectory.ts';
import {collateralCoverage, oracleStatus, formatRoundDuration, memberErrorMessage} from '../src/lib/bondedDisplay.ts';
import {fetchBondedClubMembers} from '../src/hooks/useBondedClub.ts';
import {t} from '../src/lib/i18n.ts';
import {ARC_EXPLORER,addrUrl,txUrl} from '../src/config/arc-constants.ts';
import {parseOptions} from '../scripts/refresh-mock-oracle.mjs';
const A='0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', B='0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const club='0x1234567890123456789012345678901234567890', club2='0x2345678901234567890123456789012345678901';
function storage(){const map=new Map<string,string>(); (globalThis as any).window={localStorage:{getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>map.set(k,v),removeItem:(k:string)=>map.delete(k)},location:{origin:'http://localhost',pathname:'/'}};return map;}
const fixture={financialsAvailable:true,collateral:20n,oraclePriceRaw:6000000000000n,oracleDecimals:8,contributionAmount:10000000n,maxMembers:4n,memberCount:3n,rateBpsPerRound:125n,state:1,groupName:'Verified live fixture',oracleStatus:'stale',oracleUpdatedAt:100n,priceAgeSeconds:138405n,maxPriceAge:3600n,isMockOracle:true,isLoading:false,error:null};
test('BRQ02 exact whole-cycle coverage and decimal/zero boundaries',()=>{
 assert.deepEqual(collateralCoverage(20n,6000000000000n,8,10000000n,4n),{maximumPool:160000000n,value:12000n,usd:'0.012',percent:'0.0075'});
 assert.equal(collateralCoverage(20n,60000000000n,6,10000000n,4n).usd,'0.012');
 assert.equal(collateralCoverage(0n,6000000000000n,8,10000000n,4n).percent,'0');
 assert.equal(collateralCoverage(20n,0n,8,10000000n,4n).usd,null);
 assert.equal(collateralCoverage(20n,6000000000000n,null,10000000n,4n).usd,null);
 assert.equal(collateralCoverage(20n,6000000000000n,8,0n,4n).percent,null);
 assert.equal(collateralCoverage(1n,100000000n,8,10000000n,4n).percent,'<0.000001');
});
test('BRQ04 oracle threshold, missing, future and incomplete round are distinct',()=>{
 assert.equal(oracleStatus(1n,100n,2n,2n,3700n,3600n),'fresh');
 assert.equal(oracleStatus(1n,100n,2n,2n,3701n,3600n),'stale');
 assert.equal(oracleStatus(1n,0n,2n,2n,3700n,3600n),'unavailable');
 assert.equal(oracleStatus(1n,3800n,2n,2n,3700n,3600n),'invalid');
 assert.equal(oracleStatus(-1n,100n,2n,2n,3700n,3600n),'invalid');
 assert.equal(oracleStatus(1n,100n,1n,2n,3700n,3600n),'invalid');
 assert.equal(oracleStatus(1n,3700n,3n,3n,3701n,3600n),'fresh');
});
test('BRQ06 A/B/guest namespaces isolate save rename delete clear; legacy ignored',()=>{
 const map=storage(); map.set(directory.SAVINGS_CLUBS_STORAGE_KEY,JSON.stringify([{address:club2,name:'legacy leaked'}]));
 directory.saveKnownGroup({address:club,name:'A private',version:'v2-bonded'},A.toUpperCase());
 assert.equal(directory.getKnownGroups(A).find(x=>x.address===club)?.name,'A private');
 assert.ok(!directory.getKnownGroups(B).some(x=>x.address===club||x.address===club2));
 assert.ok(!directory.getKnownGroups().some(x=>x.address===club));
 directory.saveKnownGroup({address:club,name:'B personal'},B); directory.saveKnownGroup({address:club,name:'Guest'});
 directory.updateKnownGroupName(club,'A renamed',A); directory.removeKnownGroup(club,B);
 assert.equal(directory.getKnownGroups(A).find(x=>x.address===club)?.name,'A renamed');
 assert.equal(directory.getKnownGroups().find(x=>x.address===club)?.name,'Guest');
 assert.ok(directory.getRemovedGroups(B).has(club)); assert.ok(!directory.getRemovedGroups(A).has(club));
 directory.clearCustomKnownGroups(A); assert.ok(!directory.getKnownGroups(A).some(x=>x.address===club));
 assert.ok(directory.getRemovedGroups(B).has(club)); assert.ok(directory.getKnownGroups().some(x=>x.address===club));
 delete (globalThis as any).window;
});
test('BRQ06 delayed factory sync retains originating account and respects concurrent hide',async()=>{
 storage(); let release!:()=>void; const pause=new Promise<void>(r=>release=r);
 const reader={readContract:async({functionName}:any)=>{if(functionName==='clubsLength')return 1n;if(functionName==='clubAt')return club;await pause;return 'On-chain name';}};
 const pending=directory.syncFactoryBondedClubs(reader,club2,[],[],A);
 await new Promise(r=>setTimeout(r,0)); directory.saveKnownGroup({address:club2,name:'B private'},B);release();await pending;
 assert.ok(directory.getKnownGroups(A).some(x=>x.address===club));assert.ok(!directory.getKnownGroups(B).some(x=>x.address===club));
 let releaseHide!:()=>void; const hidePause=new Promise<void>(r=>releaseHide=r);
 const delayedAgain={readContract:async(args:any)=>{if(args.functionName==='groupName')await hidePause;return reader.readContract(args);}};
 const pendingHide=directory.syncFactoryBondedClubs(delayedAgain,club2,[],[],A);
 await new Promise(r=>setTimeout(r,0));directory.removeKnownGroup(club,A);releaseHide();await pendingHide;assert.ok(!directory.getKnownGroups(A).some(x=>x.address===club));
 delete (globalThis as any).window;
});
test('BRQ03 duration singular and both subtitle translations resolve',()=>{
 assert.equal(formatRoundDuration(3600,true),'1 hour');assert.equal(formatRoundDuration(7200,true),'2 hours');assert.equal(formatRoundDuration(86400,true),'1 day');assert.equal(formatRoundDuration(172800,true),'2 days');
 for(const lang of ['en','vi'] as const)assert.notEqual(t('clubDirectoryModal.subtitle',lang),'clubDirectoryModal.subtitle');
});
let id=100;function freshClub(){return `0x${(++id).toString(16).padStart(40,'0')}` as `0x${string}`;}
test('BRQ05 429, range, timeout and complete fallback preserve truthful diagnosis',async()=>{
 const original=globalThis.fetch;
 try{
 globalThis.fetch=async()=>({ok:false,status:429}) as Response;
 let result=await fetchBondedClubMembers({getLogs:async()=>{throw new Error('RPC offline');},getBlockNumber:async()=>{throw new Error('RPC offline');}} as any,freshClub(),2n);
 assert.match(result.error!,/explorer-429/);assert.doesNotMatch(result.error!,/rpc-range/);assert.match(memberErrorMessage(result.error!,'en'),/HTTP 429/);
 globalThis.fetch=async()=>{throw new Error('fetch unavailable');};
 result=await fetchBondedClubMembers({getLogs:async()=>{throw new Error('-32012 block range limit');},getBlockNumber:async()=>{throw new Error('timeout');}} as any,freshClub(),2n);
 assert.match(result.error!,/rpc-range/);assert.match(result.error!,/timeout/);
 globalThis.fetch=async()=>({ok:false,status:429}) as Response;
 const rpc={getLogs:async({event}:any)=>event.name==='MemberJoined'?[{args:{member:A},blockNumber:1n,logIndex:0}]:[],getBlockNumber:async()=>5000n};
 result=await fetchBondedClubMembers(rpc as any,freshClub(),1n);assert.equal(result.error,null);assert.deepEqual(result.members,[A]);
 result=await fetchBondedClubMembers(rpc as any,freshClub(),2n);assert.match(result.error!,/partial/);assert.equal(result.members.length,1);
 }finally{globalThis.fetch=original;}
});
test('BRQ04 CLI options reject malformed values before any provider work',()=>{
 for(const args of [['--interval','0'],['--interval','NaN'],['--price','-1'],['--price','1.000000001'],['--bad'],['--interval']])assert.throws(()=>parseOptions(args));
 assert.equal(parseOptions(['--dry-run']).readOnly,true);assert.equal(parseOptions(['--status']).readOnly,true);assert.equal(parseOptions(['--interval','1800']).interval,1800);
});
const require=createRequire(import.meta.url);
async function loadUI(file:string,extraMocks:Record<string,string>={}){
 const mocks:Record<string,string>={...extraMocks,wagmi:'export const usePublicClient=()=>undefined;export const useReadContracts=()=>({data:globalThis.__brqStates});', '../../hooks/useBondedClub':'export const useBondedClub=()=>globalThis.__brqFixture;'};
 const result=await build({entryPoints:[file],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',logLevel:'silent',plugins:[{name:'qa-boundaries',setup(b){b.onResolve({filter:/.*/},a=>a.path in mocks?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js'}));}}]});
 const mod={exports:{} as any};new Function('module','exports','require',result.outputFiles[0].text.replace(/^#!.*\n/,''))(mod,mod.exports,require);return mod.exports;
}
test('BRQ01 home renders actual featured data, placeholders and bilingual bonded copy',async()=>{
 const {LandingPage}=await loadUI('src/components/landing/LandingPage.tsx');
 for(const language of ['en','vi']){
 (globalThis as any).__brqFixture=fixture;
 const html=renderToStaticMarkup(React.createElement(LandingPage,{language,onLaunchApp(){},onSelectClub(){},onOpenCreateModal(){},onOpenGuideModal(){}}));
 assert.match(html,/Verified live fixture/);assert.match(html,/1.25%/);assert.match(html,/3 \/ 4/);assert.doesNotMatch(html,/Bid for Pot|the winner claims|mathematical guarantees|Uncollateralized Owner Fraud|đấu giá/i);
 (globalThis as any).__brqFixture={...fixture,isLoading:true};const loading=renderToStaticMarkup(React.createElement(LandingPage,{language}));assert.doesNotMatch(loading,/Verified live fixture|1.25%/);
 (globalThis as any).__brqFixture={...fixture,error:'network'};const failed=renderToStaticMarkup(React.createElement(LandingPage,{language}));assert.doesNotMatch(failed,/Verified live fixture|1.25%/);
 }
 delete (globalThis as any).__brqFixture;
});
test('BRQ02/04 collateral component renders historical labels, precision and missing price',async()=>{
 const {BondedCollateralSummary}=await loadUI('src/components/savings/BondedCollateralSummary.tsx');
 const html=renderToStaticMarkup(React.createElement(BondedCollateralSummary,{club:fixture,language:'en'}));
 for(const expected of ['$0.012','160','0.0075%','Historical estimate','138405s / 3600s','Test price, not market price'])assert.ok(html.includes(expected),expected);
 const invalid=renderToStaticMarkup(React.createElement(BondedCollateralSummary,{club:{...fixture,oracleStatus:'invalid'},language:'en'}));assert.doesNotMatch(invalid,/\$0.012/);assert.match(invalid,/Invalid price/);
});
test('BRQ03 directory renders same-name addresses distinctly and excludes cancelled including empty result',async()=>{
 storage();directory.saveKnownGroup({address:club,name:'Same name',version:'v2-bonded'},A);directory.saveKnownGroup({address:club2,name:'Same name',version:'v2-bonded'},A);
 const {ClubDirectoryModal}=await loadUI('src/components/savings/ClubDirectoryModal.tsx');
 const row=(state:number)=>[state,2n,4n,10000000n,3600n,A].map(result=>({status:'success',result}));
 (globalThis as any).__brqStates=[...row(0),...row(4)];
 let html=renderToStaticMarkup(React.createElement(ClubDirectoryModal,{account:A,isOpen:true,currentAddress:'',language:'en',onClose(){},onSelectGroup(){},onOpenCreateModal(){}}));
 assert.ok(html.includes(club2));assert.ok(!html.includes(club));assert.match(html,/1 hour/);assert.doesNotMatch(html,/clubDirectoryModal.subtitle/);
 (globalThis as any).__brqStates=[...row(0),...row(1)];html=renderToStaticMarkup(React.createElement(ClubDirectoryModal,{account:A,isOpen:true,currentAddress:'',language:'en'}));assert.ok(html.includes(club)&&html.includes(club2));assert.equal((html.match(/Same name /g)??[]).length,2);assert.match(html,/Same name <span[^>]*>0x1234\.\.\.7890<\/span>/);assert.match(html,/Same name <span[^>]*>0x2345\.\.\.8901<\/span>/);
 (globalThis as any).__brqStates=[...row(4),...row(4)];html=renderToStaticMarkup(React.createElement(ClubDirectoryModal,{account:A,isOpen:true,currentAddress:'',language:'en'}));assert.ok(html.includes(t('clubDirectoryModal.noClubs','en')));assert.ok(!html.includes(club));
 delete (globalThis as any).window;delete (globalThis as any).__brqStates;
});
test('BRQ07 canonical URL helpers and operational source inventory',()=>{
 assert.equal(addrUrl(club),`${ARC_EXPLORER}/address/${club}`);assert.equal(txUrl('0xabc'),`${ARC_EXPLORER}/tx/0xabc`);
 const files=fs.readdirSync('src',{recursive:true}).filter(f=>/\.(ts|tsx)$/.test(String(f))&&!String(f).includes('onchain-facts'));
 for(const file of files)assert.doesNotMatch(fs.readFileSync(`src/${file}`,'utf8'),/https:\/\/(?:explorer\.testnet\.arc\.io|testnet\.arcscan\.app|rpc\.testnet\.arc\.(?:io|network))/,'operational URL: '+file);
 const app=fs.readFileSync('src/App.tsx','utf8');assert.match(app,/key=\{.*address.*guest/);assert.doesNotMatch(app,/setActiveDirectoryAccount/);
});

test('BRQ04 read-only operator paths never access signer or send writes',async()=>{
 const publicClient={readContract:async({functionName}:any)=>({maxPriceAge:3600n,priceFeed:'0x9c0866b4D6dB662038f805563b8f4CdECA626525',decimals:8,latestRoundData:[9n,6000000000000n,100n,100n,9n]}[functionName])};
 (globalThis as any).__brqPublic=publicClient;
 const {main}=await loadUI('scripts/refresh-mock-oracle.mjs',{
 viem:'export const createPublicClient=()=>globalThis.__brqPublic;export const createWalletClient=()=>{throw Error("SIGNER MUST NOT RUN")};export const http=()=>({});export const formatUnits=(x,d)=>String(Number(x)/10**d);',
 'viem/accounts':'export const privateKeyToAccount=()=>{throw Error("KEY MUST NOT RUN")};',
 });
 await main(['--status']);await main(['--dry-run']);
 await assert.rejects(main(['--interval','3600']),/below/);
 delete (globalThis as any).__brqPublic;
});
