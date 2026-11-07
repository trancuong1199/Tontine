import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {requiresRiskAcknowledgement,riskAcknowledgementContext,availablePrincipal,formatAdaptivePercent,collateralCoverage,memberErrorMessage} from '../src/lib/bondedDisplay.ts';
const A='0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',B='0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',C='0xcccccccccccccccccccccccccccccccccccccccc',D='0xdddddddddddddddddddddddddddddddddddddddd';
const base:any={address:C,state:1,owner:B,groupName:'Risk fixture',isVerifiedClub:true,positionAvailable:true,memberContributions:{},memberContributionRound:1n,financialsAvailable:true,contributionAmount:10_000000n,maxMembers:4n,totalRounds:4n,roundDuration:86400n,rateBpsPerRound:200n,safetyBps:20000n,liquidationBps:12000n,interestGrace:3600n,settlementGrace:3600n,maxPriceAge:3600n,priceFeed:D,memberCount:2n,totalDeposits:40_000000n,totalDebt:0n,collateral:20n,interestDueTotal:0n,interestPaidTotal:0n,interestClaimedTotal:0n,interestOwed:0n,startTime:100n,nextInterestDeadline:0n,currentRoundIndex:1n,cycleEnded:false,memberAddresses:[],membersLoadError:null,oracleError:false,collateralValueUsdc:12000n,borrowLimit:6000n,exposure:0n,healthBps:100000n,oracleDescription:'MOCK BTC/USD',oracleDecimals:8,oracleStatus:'fresh',isMockOracle:true,oraclePriceRaw:6000000000000n,oracleUpdatedAt:100n,priceAgeSeconds:1n,isMember:true,userDeposit:10_000000n,hasContributedCurrentRound:false,pendingInterest:1000000n,previewPrincipalUsdc:10000000n,previewPrincipalCirBtc:0n,principalWithdrawn:false,usdcAllowance:0n,cirBtcBalance:0n,cirBtcAllowance:0n,isLoading:false,error:null,refetch:async()=>{}};
const require=createRequire(import.meta.url);
async function load(file:string,mocks:Record<string,string>={}){
 const result=await build({entryPoints:[file],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',logLevel:'silent',plugins:[{name:'qa-boundaries',setup(b){b.onResolve({filter:/.*/},a=>a.path in mocks?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js'}));}}]});
 const mod={exports:{} as any};new Function('module','exports','require',result.outputFiles[0].text.replace(/^#!.*\n/,''))(mod,mod.exports,require);return mod.exports;
}
const hookMock=`const h=()=>globalThis.__riskHooks;export const useId=()=>h().memo(()=>"qa-create-form",[]);export const useState=x=>h().state(x);export const useRef=x=>h().ref(x);export const useLayoutEffect=(f,d)=>h().effect(f,d);export const useEffect=(f,d)=>h().effect(f,d);export const useCallback=(f,d)=>h().memo(()=>f,d);export const useMemo=(f,d)=>h().memo(f,d);export default {};`;
let workspace:any;
async function component(){return workspace??= (await load('src/components/savings/BondedClubWorkspace.tsx',{
 react:hookMock,
 '../../hooks/useBondedClub.ts':'export const useBondedClub=()=>globalThis.__riskFixture;',
 '../../hooks/useSavingsClub.ts':'export const useUsdcBalance=()=>({balance:1000000000n});',
 '../../hooks/useArcWriteContract.ts':'export const useArcWriteContract=()=>({writeContractAsync:x=>globalThis.__riskWrite(x)});',
 wagmi:'export const usePublicClient=()=>globalThis.__riskClient;export const useWaitForTransactionReceipt=()=>({});',
 sonner:'export const toast={error(){},loading(){return 1},success(){},dismiss(){}};',
})).BondedClubWorkspace;}
function hooks(){const slots:any[]=[];let i=0,dirty=false;let queued:Array<()=>void>=[];const same=(a:any[],b:any[])=>a?.length===b?.length&&a.every((v,j)=>Object.is(v,b[j]));return {
 state(initial:any){const n=i++;if(!(n in slots))slots[n]=typeof initial==='function'?initial():initial;return [slots[n],(v:any)=>{const next=typeof v==='function'?v(slots[n]):v;if(!Object.is(next,slots[n])){slots[n]=next;dirty=true;}}];},
 ref(initial:any){const n=i++;return slots[n]??=( {current:initial});},
 effect(fn:any,deps:any[]){const n=i++;if(!same(slots[n]?.deps,deps))queued.push(()=>{slots[n]?.cleanup?.();slots[n]={deps,cleanup:fn()};});},
 memo(fn:any,deps:any[]){const n=i++;if(!same(slots[n]?.deps,deps))slots[n]={deps,value:fn()};return slots[n].value;},
 render(fn:()=>any){let tree;for(let pass=0;pass<10;pass++){i=0;dirty=false;queued=[];tree=fn();for(const run of queued)run();if(!dirty)return tree;}throw Error('hook render loop');},
 unmount(){for(const slot of slots)slot?.cleanup?.();},
};}
function nodes(x:any):any[]{if(Array.isArray(x))return x.flatMap(nodes);if(!x||typeof x!=='object')return [];return [x,...nodes(x.props?.children)];}
function textOf(x:any):string{if(typeof x==='string'||typeof x==='number'||typeof x==='bigint')return String(x);if(Array.isArray(x))return x.map(textOf).join('');return x?.props?textOf(x.props.children):'';}
async function harness(overrides:any={},propsOverride:any={}){const Component=await component();const h=hooks();let fixture={...base,...overrides},props={contractAddress:C,userAddress:A,language:'en',...propsOverride};const writes:any[]=[];let receipt:()=>Promise<any>=async()=>({status:'success'});(globalThis as any).__riskWrite=async(x:any)=>{writes.push(x);return '0x123';};(globalThis as any).__riskClient={waitForTransactionReceipt:()=>receipt()};
 const render=(f:any={},p:any={})=>{fixture={...fixture,...f};props={...props,...p};(globalThis as any).__riskFixture=fixture;(globalThis as any).__riskHooks=h;return h.render(()=>Component(props));};
 const button=(tree:any,needle:string)=>{const n=nodes(tree).find(n=>n.type==='button'&&textOf(n).includes(needle));assert.ok(n,'button '+needle);return n;};
 const checkbox=(tree:any)=>{const alert=nodes(tree).find(n=>n.props?.['data-testid']==='contribution-risk-warning');return nodes(alert).find(n=>n.type==='input'&&n.props.type==='checkbox');};
 return {render,button,checkbox,writes,h,receipt:(fn:()=>Promise<any>)=>{receipt=fn;}};}

function expand(tree:any):any{if(Array.isArray(tree))return tree.map(expand);if(!tree||typeof tree!=='object')return tree;if(typeof tree.type==='function'&&['BondedTerminalView','BondedMobileActionBar'].includes(tree.type.name))return expand(tree.type(tree.props));return {...tree,props:{...tree.props,children:expand(tree.props?.children)}};}
test('S1 terminal states expose truthful outcomes only, zero/error/owner/passkey branches',async()=>{
 for(const state of [2,3,4])for(const language of ['en','vi']){
 const h=await harness({state,...(state===4?{pendingInterest:0n,userDeposit:0n,collateral:0n}:{})},{language});const tree=expand(h.render()),all=textOf(tree);assert.ok(nodes(tree).some(n=>n.props?.['data-testid']==='bonded-terminal-view'));assert.ok(!nodes(tree).some(n=>n.props?.['data-testid']==='contribution-risk-warning'));assert.doesNotMatch(all,/Health Ratio|Timeline|Finalize Cycle|Approve & Contribute/);if(state===4)assert.ok(!all.includes('Withdraw recovery'));h.h.unmount();
 }
 let h=await harness({state:3,pendingInterest:0n,previewPrincipalUsdc:0n,previewPrincipalCirBtc:0n});let tree=expand(h.render());assert.match(textOf(tree),/Recovery is currently 0/);assert.ok(!nodes(tree).some(n=>n.type==='button'&&textOf(n)==='Withdraw recovery'));h.h.unmount();
 h=await harness({state:2,error:'failed',positionAvailable:false});tree=expand(h.render());assert.match(textOf(tree),/Balances unavailable/);assert.ok(!nodes(tree).some(n=>n.type==='button'&&/Withdraw recovery|Claim paid interest/.test(textOf(n))));h.h.unmount();
 h=await harness({state:2,principalWithdrawn:true,pendingInterest:0n},{userAddress:B});tree=expand(h.render());assert.ok(nodes(tree).some(n=>n.type==='button'&&textOf(n)==='Withdraw remaining collateral'));assert.match(textOf(tree),/Principal already withdrawn/);h.h.unmount();
 h=await harness({state:2},{isPasskeyUser:true});tree=expand(h.render());assert.ok(nodes(tree).filter(n=>n.type==='button'&&/Withdraw recovery|Claim paid interest/.test(textOf(n))).every(n=>n.props.disabled));h.h.unmount();
});
test('S2 full OPEN hides join/risk; full ACTIVE retains contribution; desktop/mobile share locked handler',async()=>{
 let h=await harness({state:0,isMember:false,memberCount:4n}),tree=h.render();assert.equal(h.checkbox(tree),undefined);assert.ok(!nodes(tree).some(n=>n.type==='button'&&/joinGroup|Join club/i.test(textOf(n))));h.h.unmount();
 h=await harness({memberCount:4n});tree=h.render();assert.ok(h.checkbox(tree));h.checkbox(tree).props.onChange({target:{checked:true}});tree=h.render();const desktop=h.button(tree,'Approve & Contribute'),mobile=nodes(expand(tree)).find(n=>n.type==='button'&&textOf(n)==='Contribute this round');assert.ok(mobile);let resolve!:(v:any)=>void;h.receipt(()=>new Promise(r=>resolve=r));const first=desktop.props.onClick();mobile.props.onClick();await Promise.resolve();await Promise.resolve();assert.deepEqual(h.writes.map(x=>x.functionName),['approve']);resolve({status:'success'});await Promise.resolve();await Promise.resolve();h.receipt(async()=>({status:'success'}));await first;assert.deepEqual(h.writes.map(x=>x.functionName),['approve','contribute']);h.h.unmount();
});
test('S3 preview invites joining only OPEN with capacity; loading does not claim availability',async()=>{
 const {UnauthenticatedBondedClubPreview}=await load('src/components/savings/UnauthenticatedBondedClubPreview.tsx',{
 react:hookMock,'../../hooks/useBondedClub':'export const useBondedClub=()=>globalThis.__riskFixture;',connectkit:'export const useModal=()=>({setOpen(){}});',sonner:'export const toast={success(){},error(){}};'});
 for(const [state,count,loading,join]of [[0,3n,false,true],[0,4n,false,false],[1,4n,false,false],[2,3n,false,false],[3,3n,false,false],[4,3n,false,false],[0,3n,true,false]]){
 const h=hooks();(globalThis as any).__riskHooks=h;(globalThis as any).__riskFixture={...base,state,memberCount:count,isLoading:loading};const tree=h.render(()=>UnauthenticatedBondedClubPreview({contractAddress:C,language:'en'}));assert.equal(textOf(tree).includes('Connect Wallet to Join'),join);if(!join)assert.match(textOf(tree),/Connect Wallet to View My Position/);h.unmount();
 }
});
test('S4 create essential terms precede Advanced; consent guards form and synchronous lock prevents duplicate create',async()=>{
 const calls:any[]=[];const h=hooks();(globalThis as any).__riskHooks=h;(globalThis as any).__riskWrite=(x:any)=>{calls.push(x);return new Promise(()=>{});};
 const {CreateBondedClubModal}=await load('src/components/savings/CreateBondedClubModal.tsx',{react:hookMock,wagmi:`export const useAccount=()=>({address:'${A}',isConnected:true,chainId:5042002});export const usePublicClient=()=>({});`,connectkit:'export const useModal=()=>({setOpen(){}});','../../hooks/useArcWriteContract':'export const useArcWriteContract=()=>({writeContractAsync:x=>globalThis.__riskWrite(x)});',sonner:'export const toast={error(){},success(){}};'});
 const render=()=>h.render(()=>CreateBondedClubModal({isOpen:true,onClose(){},onSuccess(){},language:'en'}));let tree=render();let list=nodes(tree);const essential=list.find(n=>n.props?.['data-testid']==='create-bonded-essential-terms');assert.ok(essential);assert.match(textOf(essential),/Initial collateral: 0 cirBTC/);assert.match(textOf(essential),/at least 2 members/);assert.match(textOf(essential),/200.*100 exposure/);assert.doesNotMatch(textOf(essential),/60000|60,000/);
 const form=list.find(n=>n.type==='form'),footer=list.find(n=>n.props?.['data-testid']==='create-bonded-footer');assert.ok(footer);assert.ok(!nodes(form).includes(footer));let submit=nodes(footer).find(n=>n.type==='button'&&n.props.type==='submit');assert.equal(submit.props.disabled,true);await form.props.onSubmit({preventDefault(){}});assert.equal(calls.length,0);
 nodes(footer).find(n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:true}});tree=render();list=nodes(tree);submit=list.find(n=>n.type==='button'&&n.props.type==='submit');assert.equal(submit.props.disabled,false);const nextForm=list.find(n=>n.type==='form');void nextForm.props.onSubmit({preventDefault(){}});void nextForm.props.onSubmit({preventDefault(){}});await Promise.resolve();assert.equal(calls.length,1);assert.equal(calls[0].functionName,'createClub');h.unmount();
});
test('S5 roster reflects each actual read and invalidates previous round; owner guidance and financial labels',async()=>{
 const h=await harness({memberAddresses:[A,B,D],memberContributions:{[A]:true,[B]:false,[D]:null},memberContributionRound:1n});let tree=h.render();let statuses=nodes(tree).filter(n=>n.props?.['data-testid']==='member-payment-status').map(textOf);assert.deepEqual(statuses,['Contributed this round','Not contributed yet','Contribution unknown']);tree=h.render({currentRoundIndex:2n});statuses=nodes(tree).filter(n=>n.props?.['data-testid']==='member-payment-status').map(textOf);assert.deepEqual(statuses,['Contribution unknown','Contribution unknown','Contribution unknown']);h.h.unmount();
 for(const [overrides,needle]of [[{state:0,collateral:0n},'deposit a positive'],[{state:0,memberCount:1n},'invite members'],[{interestOwed:1n},'pay outstanding interest'],[{totalDebt:1n},'repay the loan'],[{cycleEnded:true},'review completion eligibility']]as const){const owner=await harness(overrides,{userAddress:B});assert.ok(textOf(owner.render()).includes(needle));owner.h.unmount();}
 const display=await import('../src/lib/bondedDisplay.ts');assert.equal(display.formatFinancialAmount(10000000n),'10.00');assert.equal(display.formatFinancialAmount(1n),'0.000001');assert.equal(display.formatRoundDuration(86400,true),'1 day');assert.equal(display.collateralCoverage(20n,6000000000000n,8,10000000n,4n).percent,'0.0075');
});
test('S7 hook executes contributed(round,address) per roster row; partial failure unknown and next round replaces statuses',async()=>{
 const h=hooks();(globalThis as any).__riskHooks=h;let round=1n;const calls:any[]=[];const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error('offline fixture');};
 (globalThis as any).__riskClient={multicall:async({contracts}:any)=>contracts.map((c:any)=>({status:'success',result:c.functionName==='currentRoundIndex'?round:c.functionName==='memberCount'?3n:base[c.functionName]??0n})),getLogs:async({event}:any)=>event.name==='MemberJoined'?[A,B,D].map((member,i)=>({args:{member},blockNumber:1n,logIndex:i})):[],getBlockNumber:async()=>5n,readContract:async({functionName,args}:any)=>{calls.push({functionName,args});if(functionName==='contributed'){if(args[1]===D)throw Error('one row unavailable');return args[1]===A?args[0]===1n:args[0]===2n;}if(functionName==='isClub')return true;if(functionName==='description')return 'MOCK BTC/USD';if(functionName==='decimals')return 8;if(functionName==='latestRoundData')return [9n,6000000000000n,100n,100n,9n];if(functionName==='admin')return B;if(functionName==='isMember')return true;return base[functionName]??0n;}};
 const {useBondedClub}=await load('src/hooks/useBondedClub.ts',{react:hookMock,wagmi:'export const usePublicClient=()=>globalThis.__riskClient;'});
 try{let snapshot=h.render(()=>useBondedClub(C,A,true));await snapshot.refetch();snapshot=h.render(()=>useBondedClub(C,A,true));assert.equal(snapshot.error,null);assert.equal(snapshot.memberContributionRound,1n);assert.deepEqual(snapshot.memberContributions,{[A]:true,[B]:false,[D]:null});assert.ok(calls.some(c=>c.functionName==='contributed'&&c.args[0]===1n&&c.args[1]===D));round=2n;await snapshot.refetch();snapshot=h.render(()=>useBondedClub(C,A,true));assert.equal(snapshot.memberContributionRound,2n);assert.deepEqual(snapshot.memberContributions,{[A]:false,[B]:true,[D]:null});}finally{h.unmount();globalThis.fetch=originalFetch;}
});
