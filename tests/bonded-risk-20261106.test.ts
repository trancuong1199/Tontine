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
const base:any={address:C,state:1,owner:B,groupName:'Risk fixture',isVerifiedClub:true,financialsAvailable:true,contributionAmount:10_000000n,maxMembers:4n,totalRounds:4n,roundDuration:86400n,rateBpsPerRound:200n,safetyBps:20000n,liquidationBps:12000n,interestGrace:3600n,settlementGrace:3600n,maxPriceAge:3600n,priceFeed:D,memberCount:2n,totalDeposits:40_000000n,totalDebt:0n,collateral:20n,interestDueTotal:0n,interestPaidTotal:0n,interestClaimedTotal:0n,interestOwed:0n,startTime:100n,nextInterestDeadline:0n,currentRoundIndex:1n,cycleEnded:false,memberAddresses:[],membersLoadError:null,oracleError:false,collateralValueUsdc:12000n,borrowLimit:6000n,exposure:0n,healthBps:100000n,oracleDescription:'MOCK BTC/USD',oracleDecimals:8,oracleStatus:'fresh',isMockOracle:true,oraclePriceRaw:6000000000000n,oracleUpdatedAt:100n,priceAgeSeconds:1n,isMember:true,userDeposit:10_000000n,hasContributedCurrentRound:false,pendingInterest:1000000n,previewPrincipalUsdc:10000000n,previewPrincipalCirBtc:0n,principalWithdrawn:false,usdcAllowance:0n,cirBtcBalance:0n,cirBtcAllowance:0n,isLoading:false,error:null,refetch:async()=>{}};
const require=createRequire(import.meta.url);
async function load(file:string,mocks:Record<string,string>={}){
 const result=await build({entryPoints:[file],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',logLevel:'silent',plugins:[{name:'qa-boundaries',setup(b){b.onResolve({filter:/.*/},a=>a.path in mocks?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js'}));}}]});
 const mod={exports:{} as any};new Function('module','exports','require',result.outputFiles[0].text.replace(/^#!.*\n/,''))(mod,mod.exports,require);return mod.exports;
}
const hookMock=`const h=()=>globalThis.__riskHooks;export const useState=x=>h().state(x);export const useRef=x=>h().ref(x);export const useLayoutEffect=(f,d)=>h().effect(f,d);export const useEffect=(f,d)=>h().effect(f,d);export const useCallback=(f,d)=>h().memo(()=>f,d);export const useMemo=(f,d)=>h().memo(f,d);export default {};`;
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

test('R1 low/stale/unknown requires explicit unchecked ack; disabled and programmatic join/contribute blocked before approval',async()=>{
 for(const change of [{},{collateral:0n},{oracleStatus:'stale',oracleError:true},{oracleDecimals:null}])for(const join of [false,true]){
 const h=await harness({...change,...(join?{state:0,isMember:false}:{})});let tree=h.render();const action=join?'joinGroup':'Approve & Contribute';const button=h.button(tree,action);assert.equal(button.props.disabled,true);assert.equal(h.checkbox(tree).props.checked,false);await button.props.onClick();assert.equal(h.writes.length,0);
 h.checkbox(tree).props.onChange({target:{checked:true}});tree=h.render();assert.equal(h.button(tree,action).props.disabled,false);await h.button(tree,action).props.onClick();assert.deepEqual(h.writes.map(x=>x.functionName),join?['joinGroup']:['approve','contribute']);h.h.unmount();
 }
});
test('R1 acknowledgement invalidates during pending approval for account, club, quote, uncheck, loading and unmount',async()=>{
 for(const mutation of ['account','club','quote','uncheck','loading','unmount']){
 const h=await harness();let tree=h.render();h.checkbox(tree).props.onChange({target:{checked:true}});tree=h.render();let resolve!:(value:any)=>void;h.receipt(()=>new Promise(r=>resolve=r));const pending=h.button(tree,'Approve & Contribute').props.onClick();await Promise.resolve();await Promise.resolve();assert.deepEqual(h.writes.map(x=>x.functionName),['approve']);
 if(mutation==='account')h.render({}, {userAddress:B});if(mutation==='club')h.render({}, {contractAddress:D});if(mutation==='quote')h.render({oraclePriceRaw:6000000000001n});if(mutation==='uncheck'){h.checkbox(tree).props.onChange({target:{checked:false}});h.render();}if(mutation==='loading')h.render({isLoading:true});if(mutation==='unmount')h.h.unmount();
 resolve({status:'success'});await pending;assert.deepEqual(h.writes.map(x=>x.functionName),['approve'],mutation+' must block contribute');h.h.unmount();
 }
});
test('R1 exact100% needs no ack; data failure never signs; claims and principal withdrawals unaffected',async()=>{
 const exact={collateral:16000000000n,oraclePriceRaw:100000000n};assert.equal(requiresRiskAcknowledgement({...base,...exact}),false);assert.equal(requiresRiskAcknowledgement({...base,...exact,collateral:16000000001n}),false);
 let h=await harness(exact),tree=h.render();assert.equal(h.checkbox(tree),undefined);await h.button(tree,'Approve & Contribute').props.onClick();assert.deepEqual(h.writes.map(x=>x.functionName),['approve','contribute']);h.h.unmount();
 for(const unavailable of [{isLoading:true},{error:'RPC failed'},{financialsAvailable:false}]){h=await harness(unavailable);tree=h.render();h.checkbox(tree).props.onChange({target:{checked:true}});tree=h.render();assert.equal(h.button(tree,'Approve & Contribute').props.disabled,true);await h.button(tree,'Approve & Contribute').props.onClick();assert.equal(h.writes.length,0);h.h.unmount();}
 h=await harness({oracleStatus:'stale',state:2});tree=h.render();await h.button(tree,'Claim Interest').props.onClick();h.render();await h.button(h.render(),'Withdraw Principal').props.onClick();assert.deepEqual(h.writes.map(x=>x.functionName),['claimInterest','withdrawPrincipal']);h.h.unmount();
});
test('R1 context reset does not revive ack on A→B→A and age alone preserves current fresh quote',async()=>{
 const h=await harness();let tree=h.render();h.checkbox(tree).props.onChange({target:{checked:true}});tree=h.render({priceAgeSeconds:2n});assert.equal(h.checkbox(tree).props.checked,true);h.render({}, {userAddress:B});tree=h.render({}, {userAddress:A});assert.equal(h.checkbox(tree).props.checked,false);h.h.unmount();
 assert.equal(riskAcknowledgementContext(base,A,C),riskAcknowledgementContext({...base,priceAgeSeconds:99n},A,C));
});
test('R2 liquidity truthful for fully lent, excess debt, zero and failed reads',async()=>{
 assert.equal(availablePrincipal(40n,40n),0n);assert.equal(availablePrincipal(40n,50n),0n);assert.equal(availablePrincipal(0n,0n),0n);
 const {BondedLiquiditySummary}=await load('src/components/savings/BondedCollateralSummary.tsx');
 const render=(x:any)=>renderToStaticMarkup(React.createElement(BondedLiquiditySummary,{club:{...base,...x},language:'en'}));
 assert.match(render({totalDebt:40_000000n}),/Available liquidity \(contributed principal\).*0 USDC/);assert.match(render({totalDebt:50_000000n}),/Available liquidity \(contributed principal\).*0 USDC/);
 for(const x of [{financialsAvailable:false},{error:'read failed'},{isLoading:true}])assert.doesNotMatch(render(x),/0 USDC/);
});
test('R3 adaptive percentages and R4 concise429 precedence retain partial and retry',()=>{
 assert.equal(formatAdaptivePercent(3333333333n),'3333.33');assert.equal(formatAdaptivePercent(7500n),'0.0075');assert.equal(collateralCoverage(1n,100000000n,8,10000000n,4n).percent,'<0.000001');assert.equal(collateralCoverage(0n,100000000n,8,10000000n,4n).percent,'0');
 for(const lang of ['vi','en'] as const){const message=memberErrorMessage('rpc-range|explorer-429|timeout|partial',lang);assert.ok(message.length<140);assert.match(message,/429/);assert.doesNotMatch(message,/block|phạm vi/);assert.match(message,lang==='en'?/retry.*Incomplete/:/thử lại.*chưa đầy đủ/);}
});
test('R8 service template parses and non-admin script cannot construct a signing client',async()=>{
 const source=fs.readFileSync('deploy/tontine-oracle.service','utf8');assert.match(source,/--price 60000 --interval 1800/);assert.match(source,/Restart=always/);assert.match(source,/EnvironmentFile=/);
 const previous=process.env.DEPLOYER_PRIVATE_KEY;process.env.DEPLOYER_PRIVATE_KEY='test-placeholder-never-signed';
 const {main}=await load('scripts/refresh-mock-oracle.mjs',{
 viem:`export const createPublicClient=()=>({readContract:async({functionName})=>({maxPriceAge:3600n,priceFeed:'0x9c0866b4D6dB662038f805563b8f4CdECA626525',decimals:8,latestRoundData:[9n,6000000000000n,100n,100n,9n],admin:'${B}'}[functionName])});export const createWalletClient=()=>{throw Error('SIGNER MUST NOT BE CREATED')};export const http=()=>({});export const formatUnits=()=> '60000';`,
 'viem/accounts':`export const privateKeyToAccount=()=>({address:'${A}'});`,
 });
 try{await main(['--status']);await assert.rejects(main(['--interval','1800']),/not the live oracle admin/);}finally{if(previous===undefined)delete process.env.DEPLOYER_PRIVATE_KEY;else process.env.DEPLOYER_PRIVATE_KEY=previous;}
});
test('R2 failed financial multicall and required individual read never create available zero snapshot',async()=>{
 const h=hooks();const calls:string[]=[];(globalThis as any).__riskHooks=h;
 (globalThis as any).__riskClient={multicall:async({contracts}:any)=>contracts.map((c:any)=>c.functionName==='totalDebt'?{status:'failure',error:Error('debt unavailable')}:{status:'success',result:base[c.functionName]??0n}),readContract:async({functionName}:any)=>{calls.push(functionName);if(functionName==='totalDebt')throw Error('debt unavailable');return base[functionName]??0n;}};
 const {useBondedClub}=await load('src/hooks/useBondedClub.ts',{react:hookMock,wagmi:'export const usePublicClient=()=>globalThis.__riskClient;'});
 let result=h.render(()=>useBondedClub(C,A,true));await result.refetch();result=h.render(()=>useBondedClub(C,A,true));assert.match(result.error,/debt unavailable/);assert.equal(result.financialsAvailable,false);assert.ok(calls.includes('totalDebt'));h.unmount();
});
test('R5 runtime display/config use shared network and pool constants',()=>{
 const header=fs.readFileSync('src/components/savings/Header.tsx','utf8'),kit=fs.readFileSync('src/components/savings/ArcAppKitModal.tsx','utf8');
 assert.match(header,/ARC_CHAIN_NAME/);assert.match(kit,/addrUrl\(ARC_USDC_EURC_POOL\)/);assert.match(kit,/switchOrAddArcNetwork|forceUpdateArcRpc/);
 assert.doesNotMatch(header+kit,/5042002|rpc\.testnet\.arc\.|explorer\.testnet\.arc\.|0xe8f7fA2A412e98C537554643F83DA34DfdD50c23/);
});
