import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { decodeFunctionData, encodeDeployData, decodeAbiParameters, parseAbi, getContractError, RpcRequestError } from "viem";
import { parseCollateralInput, formatCollateral, collateralAmounts, classifyCollateralPolicy, sameCollateralQuote, MAX_COLLATERAL } from "../src/lib/collateralPolicy.ts";
import { ROTATING_SAVINGS_ABI } from "../src/contract.ts";
const require=createRequire(import.meta.url);
const ACCOUNT="0x1111111111111111111111111111111111111111";
const OTHER="0x2222222222222222222222222222222222222222";
const CLUB="0x3333333333333333333333333333333333333333";
const NEXT_CLUB="0x4444444444444444444444444444444444444444";
const TOKEN="0x5555555555555555555555555555555555555555";
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred<T=any>() { let resolve!:(value:T)=>void,reject!:(reason:any)=>void; const promise=new Promise<T>((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject}; }
async function productionModule(file: string, mocks: Record<string, string> = {}) {
  const result = await build({ entryPoints: [file], bundle: true, write: false, format: "cjs", platform: "node", packages: "external", logLevel: "silent", define: { "import.meta.env": "{}" }, plugins: [{ name: "qa-cycle-boundaries", setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => args.path in mocks ? { path: args.path, namespace: "qa-boundary" } : undefined);
    builder.onLoad({ filter: /.*/, namespace: "qa-boundary" }, args => ({ contents: mocks[args.path], loader: "js" }));
  } }] });
  const mod = { exports: {} as any };
  new Function("module", "exports", "require", result.outputFiles[0].text)(mod, mod.exports, require);
  return mod.exports;
}
function nodes(tree: any): any[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  if (typeof tree.type === 'function' && tree.type.name === 'CollateralPreview') return [tree, ...nodes(tree.type(tree.props))];
  return [tree, ...nodes(tree.props?.children)];
}
function textOf(tree: any): string {
  if (typeof tree === "string" || typeof tree === "number") return String(tree);
  if (Array.isArray(tree)) return tree.map(textOf).join("");
  if (typeof tree?.type === 'function' && tree.type.name === 'CollateralPreview') return textOf(tree.type(tree.props));
  return tree?.props ? textOf(tree.props.children) : "";
}
function lifecycle(component: any, initialProps: any) {
  const slots: any[] = []; let cursor = 0;
  let effects: (() => void)[] = [];
  const changed = (a: any[] | undefined, b: any[] | undefined) => !a || !b || a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));
  const hooks = {
    useState(initial: any) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
      return [slots[i], (v: any) => { slots[i] = typeof v === "function" ? v(slots[i]) : v; }]; },
    useRef(initial: any) { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useMemo(fn: any, deps: any[]) { const i = cursor++; if (!slots[i] || changed(slots[i].deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useCallback(fn: any, deps: any[]) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn: any, deps: any[]) { const i = cursor++; if (!slots[i] || changed(slots[i].deps, deps)) { const old = slots[i]; slots[i] = { deps }; effects.push(() => { old?.cleanup?.(); slots[i].cleanup = fn(); }); } },
  };
  return {
    render(updates = {}) { cursor = 0; (globalThis as any).__task049Hooks = hooks; return component({ ...initialProps, ...updates }); },
    async flush() { const pending = effects; effects = []; pending.forEach(effect => effect()); await tick(); },
    dispose() { for(const slot of slots) slot?.cleanup?.(); },
  };
}
const reactBoundary = `export const useState=(x)=>globalThis.__task049Hooks.useState(x); export const useEffect=(f,d)=>globalThis.__task049Hooks.useEffect(f,d); export const useRef=(x)=>globalThis.__task049Hooks.useRef(x); export const useMemo=(f,d)=>globalThis.__task049Hooks.useMemo(f,d); export const useCallback=(f,d)=>globalThis.__task049Hooks.useCallback(f,d); export default {useRef};`;

function quote(overrides: any={}) { return {...collateralAmounts(100000n,40000n,1000000n), group:CLUB,account:ACCOUNT,token:TOKEN,policy:'enforced',allowance:0n,member:true,kicked:false,state:1,...overrides}; }
function rpcFixture(overrides: any={}) {
  const data:any={collateralPolicyVersion:1n,cirBtcCollateralAmount:100000n,cirBtcCollateral:40000n,cirBtcToken:TOKEN,isMember:true,isKicked:false,state:1,balanceOf:1000000n,allowance:0n,...overrides};
  const calls:any[]=[];
  const client={readContract:async(args:any)=>{calls.push(args); const value=data[args.functionName];if(value instanceof Error)throw value;return typeof value==='function'?value(args):value;}};
  return {data,calls,client};
}

test('T049 strict creation parser and exact shortfall model preserve uint256/satoshi values',()=>{
  assert.equal(parseCollateralInput('', '0.001'),undefined);assert.equal(parseCollateralInput('none',''),0n);
  for(const value of ['', '0','-1','.5','1.','NaN','Infinity','1e-8','1junk',' 1','1,000','0.000000001']) assert.equal(parseCollateralInput('custom',value),undefined,value);
  assert.equal(parseCollateralInput('custom','0.00000001'),1n);assert.equal(parseCollateralInput('custom','1.000000000'),100000000n);
  assert.equal(parseCollateralInput('custom',formatCollateral(MAX_COLLATERAL)),MAX_COLLATERAL);assert.equal(parseCollateralInput('custom',formatCollateral(MAX_COLLATERAL+1n)),undefined);
  assert.deepEqual(collateralAmounts(100000n,40000n,1000000n),{required:100000n,locked:40000n,balance:1000000n,shortfall:60000n,deficit:0n,after:940000n});
  assert.deepEqual(collateralAmounts(100000n,40000n,59999n),{required:100000n,locked:40000n,balance:59999n,shortfall:60000n,deficit:1n,after:undefined});
  assert.equal(collateralAmounts(0n,0n,0n).shortfall,0n);assert.equal(collateralAmounts(100000n,200000n,1n).shortfall,0n);
  assert.equal(formatCollateral(1n),'0.00000001');assert.equal(formatCollateral(9007199254740993123456n),'90071992547409.93123456');
  assert.equal(collateralAmounts(9007199254740993123456n,9007199254740993000000n,123457n).after,1n);
  const a=quote();for(const patch of [{group:NEXT_CLUB},{account:OTHER},{required:100001n},{locked:40001n},{balance:1000001n},{allowance:60000n},{token:OTHER},{policy:'legacy'},{member:false},{kicked:true},{state:2}]) assert.equal(sameCollateralQuote(a,{...a,...patch}),false);
});

test('T049 policy marker and actual quote reader distinguish legacy/unknown and read own token/account',async()=>{
  assert.equal(classifyCollateralPolicy({isPending:true}),'loading');assert.equal(classifyCollateralPolicy({data:1n}),'enforced');
  assert.equal(classifyCollateralPolicy({data:0n}),'unknown');assert.equal(classifyCollateralPolicy({data:2n}),'unknown');assert.equal(classifyCollateralPolicy({error:Error('offline')}),'unknown');
  const missing=getContractError(new RpcRequestError({body:{method:'eth_call'},error:{code:3,message:'execution reverted'},url:'https://example.invalid'}),{abi:parseAbi(['function collateralPolicyVersion() view returns(uint256)']),functionName:'collateralPolicyVersion',args:[]});
  assert.equal(classifyCollateralPolicy({error:missing}),'legacy');
  const {readCollateralQuote}=await productionModule('src/hooks/useCollateralPolicy.ts',{react:reactBoundary,wagmi:'export const usePublicClient=()=>globalThis.__task049Client;'});
  const f=rpcFixture();assert.deepEqual(await readCollateralQuote(f.client,CLUB,ACCOUNT),quote());
  for(const args of f.calls.filter((x:any)=>['balanceOf','allowance'].includes(x.functionName))) {assert.equal(args.address,TOKEN);assert.equal(args.args[0],ACCOUNT);if(args.functionName==='allowance')assert.equal(args.args[1],CLUB);}
  assert.ok(!f.calls.some((x:any)=>x.functionName==='claimableCirBtc'),'rewards cannot substitute for locked');
  f.data.cirBtcCollateralAmount=0n;f.data.cirBtcCollateral=0n;assert.equal((await readCollateralQuote(f.client,CLUB,ACCOUNT)).shortfall,0n,'explicit onchain zero remains zero');
  f.data.collateralPolicyVersion=missing;assert.equal((await readCollateralQuote(f.client,CLUB,ACCOUNT)).policy,'legacy');
  for(const [field,value] of [['collateralPolicyVersion',Error('RPC offline')],['cirBtcCollateralAmount',undefined],['cirBtcToken','0x0000000000000000000000000000000000000000'],['balanceOf',Error('balance unavailable')]]) {const broken=rpcFixture({[field as string]:value});await assert.rejects(readCollateralQuote(broken.client,CLUB,ACCOUNT));}
});

test('T049 actual collateral hook requires fresh matching quote and discards old account/group results',async()=>{
  const f=rpcFixture();(globalThis as any).__task049Client=f.client;const clientCalls:any[]=[];(globalThis as any).__task049ClientArgs=clientCalls;
  try{
    const mod=await productionModule('src/hooks/useCollateralPolicy.ts',{react:reactBoundary,wagmi:'export const usePublicClient=(args)=>{globalThis.__task049ClientArgs.push(args);return globalThis.__task049Client;};'});
    const ui=lifecycle((props:any)=>mod.useCollateralPolicy(props.group,props.account),{group:CLUB,account:ACCOUNT});
    assert.equal(ui.render().policy,'loading');await ui.flush();let view=ui.render();assert.equal(view.policy,'enforced');assert.ok(clientCalls.every(x=>x.chainId===5042002));
    assert.deepEqual(await view.review(),quote());view=ui.render();
    f.data.cirBtcCollateralAmount=100001n;await assert.rejects(view.review(),/changed|review/i);view=ui.render();assert.equal(view.quote.required,100001n);assert.equal((await view.review()).shortfall,60001n);
    view=ui.render();f.data.balanceOf=59999n;await assert.rejects(view.review(),/changed|review/i);view=ui.render();await assert.rejects(view.review(),/Insufficient/i);
    f.data.balanceOf=1000000n;await view.refresh();view=ui.render();
    const delayed=deferred();f.data.balanceOf=()=>delayed.promise;const oldReview=view.review();await tick();
    assert.equal(ui.render({group:NEXT_CLUB,account:OTHER}).policy,'loading');delayed.resolve(1000000n);await assert.rejects(oldReview,/context|changed|unavailable/i);
    f.data.balanceOf=1000000n;await ui.flush();view=ui.render({group:NEXT_CLUB,account:OTHER});assert.equal(view.quote.group,NEXT_CLUB);assert.equal(view.quote.account,OTHER);
    f.data.collateralPolicyVersion=Error('offline');await view.refresh();assert.equal(ui.render({group:NEXT_CLUB,account:OTHER}).policy,'unknown');
  }finally{delete (globalThis as any).__task049Client;delete (globalThis as any).__task049ClientArgs;delete (globalThis as any).__task049Hooks;}
});

const basePanel={state:1,currentRound:1n,contributionAmount:10000000n,isMember:true,hasWon:false,isKicked:false,hasContributed:false,allowance:1000000000n,contractAddress:CLUB,language:'en',account:{address:ACCOUNT},cycleCapability:'supported',lockedCollateral:40000n,collateralAmount:100000n,endTime:BigInt(Math.floor(Date.now()/1000)+86400)};
async function loadPanel(name:string){return productionModule(`src/components/savings/${name}.tsx`,{
  react:reactBoundary,
  wagmi:`export const useAccount=()=>({address:globalThis.__task049Panel?.address??'${ACCOUNT}',chainId:5042002});export const useSwitchChain=()=>({switchChain(){}});export const useWaitForTransactionReceipt=()=>globalThis.__task049Panel.receipt;`,
  connectkit:'export const useModal=()=>({setOpen(){}});',
  sonner:'export const toast={success:(...x)=>globalThis.__task049Panel.success.push(x),error:(...x)=>globalThis.__task049Panel.errors.push(x),info(){}};',
  '../../hooks/useArcWriteContract':'export const useArcWriteContract=()=>({writeContract:(x)=>globalThis.__task049Panel.writes.push(x),reset(){},isPending:false});',
});}
function viewFor(q:any){const view:any={policy:q.policy,quote:q,refreshes:0,reviews:0,async refresh(){view.refreshes++;return view.quote;},async review(){view.reviews++;return view.quote;}};return view;}
const topupButton=(tree:any)=>nodes(tree).find(n=>n.type==='button'&&/Approve CirBTC, then|Deposit collateral|Approve \+ deposit|Cấp quyền CirBTC, sau|Nộp bổ sung|Cấp quyền \+ nộp/i.test(textOf(n)));
const joinButton=(tree:any)=>nodes(tree).find(n=>n.type==='button'&&/joining|Join Savings Club|Approve \+ join|tham gia/i.test(textOf(n)));
function setupPanelGlobal(){const data:any={writes:[],errors:[],success:[],receipt:{isSuccess:false,isLoading:false}};(globalThis as any).__task049Panel=data;return data;}

test('T049 both wallet collateral cards preserve exact amounts, visible actions and compact Task050 details',async()=>{
  setupPanelGlobal();const instances:any[]=[];
  const visibleText=(tree:any):string=>Array.isArray(tree)?tree.map(visibleText).join(''):tree?.type==='details'?'':typeof tree==='string'||typeof tree==='number'?String(tree):tree?.props?visibleText(tree.props.children):'';
  const cardOf=(tree:any)=>{const cards=nodes(tree).filter(n=>typeof n.type==='function'&&n.type.name==='CollateralPreview');assert.equal(cards.length,1);return cards[0].type(cards[0].props);};
  try{for(const name of ['ActionPanel','PasskeyActionPanel']){const mod=await loadPanel(name);for(const language of ['en','vi']){
    const view=viewFor(quote({...collateralAmounts(100000n,40000n,1n)}));
    const ui=lifecycle(mod[name],{...basePanel,language,bundler:{},onSuccess(){},collateralView:view,claimableCirBtc:900000n,cirBtcBalance:1n});instances.push(ui);
    let card=cardOf(ui.render());let details=nodes(card).find(n=>n.type==='details');assert.ok(details);assert.ok(!details.props.open,'native details starts closed');assert.equal(textOf(nodes(details).find(n=>n.type==='summary')),language==='en'?'Details':'Chi tiết');
    const amounts=nodes(details).filter(n=>n.type==='dd').map(textOf);assert.deepEqual(amounts,['0.00100000 CirBTC','0.00040000 CirBTC','0.00060000 CirBTC','0.00000001 CirBTC','0.00900000 CirBTC']);
    assert.match(visibleText(card),language==='en'?/To deposit0.00060000 CirBTC/:/Cần nộp0.00060000 CirBTC/);assert.match(visibleText(card),/Unavailable|Chưa đọc được/);assert.ok(visibleText(card).includes('0.00059999 CirBTC'));
    for(const address of [TOKEN,CLUB,ACCOUNT]){assert.ok(textOf(details).includes(address));assert.ok(!visibleText(card).includes(address));}
    assert.match(textOf(details),language==='en'?/below the required amount/:/chưa đủ mức yêu cầu/);assert.ok(!visibleText(card).includes('Approval only grants permission'));
    const topup=topupButton(card);assert.ok(topup&&topup.props.disabled);assert.ok(!nodes(details).includes(topup));
    const refresh=nodes(details).find(n=>n.type==='button');refresh.props.onClick();assert.equal(view.refreshes,1);
    card=cardOf(ui.render({collateralAmount:0n,lockedCollateral:0n,collateralView:viewFor(quote({...collateralAmounts(0n,0n,1n)}))}));
    assert.match(visibleText(card),language==='en'?/No collateral required/:/Không yêu cầu ký quỹ/);assert.ok(visibleText(card).includes('0.00000000 CirBTC'));assert.ok(visibleText(card).includes('0.00000001 CirBTC'));assert.doesNotMatch(textOf(card),/Collateral Protected|below the required amount|chưa đủ mức yêu cầu/);
    card=cardOf(ui.render({lockedCollateral:100000n,collateralView:viewFor(quote({...collateralAmounts(100000n,100000n,1n)}))}));assert.match(visibleText(card),language==='en'?/Locked0.00100000 CirBTC/:/Đang khóa0.00100000 CirBTC/);assert.ok(visibleText(card).includes('0.00000001 CirBTC'));assert.ok(!topupButton(card));
    for(const policy of ['unknown','loading','legacy']){card=cardOf(ui.render({lockedCollateral:undefined,claimableCirBtc:undefined,cirBtcBalance:undefined,collateralView:policy==='legacy'?viewFor(quote({policy})):{policy,refresh(){}}}));assert.match(visibleText(card),policy==='legacy'?/Legacy|Hợp đồng cũ/:policy==='loading'?/Checking|Đang kiểm tra/:/unavailable|Chưa đọc được/);assert.doesNotMatch(visibleText(card),/Collateral Protected|Ready to Claim/);}
    card=cardOf(ui.render({state:2,isKicked:false,collateralView:{policy:'unknown',refresh(){}}}));details=nodes(card).find(n=>n.type==='details');const claim=nodes(card).find(n=>n.type==='button'&&/Claim.*Collateral|Rút.*ký quỹ|Nhận.*ký quỹ/i.test(textOf(n)));assert.ok(claim,'eligible collateral claim remains with unknown policy');assert.ok(!nodes(details).includes(claim));assert.ok(!claim.props.disabled);
    card=cardOf(ui.render({state:2,isKicked:true}));assert.match(visibleText(card),language==='en'?/Kicked — collateral withdrawal unavailable/:/Đã bị loại — không đủ điều kiện rút ký quỹ/);assert.ok(!nodes(card).some(n=>n.type==='button'&&/Claim.*Collateral|Rút.*ký quỹ|Nhận.*ký quỹ/i.test(textOf(n))));
  }}}finally{instances.forEach(x=>x.dispose());delete (globalThis as any).__task049Panel;delete (globalThis as any).__task049Hooks;}
});

test('T049 actual EOA approval is exact permission-only and receipt requires a second reviewed deposit click',async()=>{
  const env=setupPanelGlobal();let ui:any;
  try{const mod=await loadPanel('ActionPanel');const view=viewFor(quote());ui=lifecycle(mod.ActionPanel,{...basePanel,collateralView:view,onSuccess:()=>view.refresh()});
    ui.render();await ui.flush();let tree=ui.render();let button=topupButton(tree);assert.ok(button&&!button.props.disabled);await button.props.onClick();
    assert.equal(env.writes.length,1);assert.equal(env.writes[0].address,TOKEN);assert.equal(env.writes[0].functionName,'approve');assert.deepEqual(env.writes[0].args,[CLUB,60000n]);assert.equal(env.writes[0].account,ACCOUNT);
    env.receipt={isSuccess:true,isLoading:false};ui.render();await ui.flush();assert.equal(env.writes.length,1,'approval receipt must not auto-deposit');assert.ok(view.refreshes>0);
    view.quote=quote({allowance:60000n});tree=ui.render();button=topupButton(tree);await button.props.onClick();assert.equal(env.writes.length,2);assert.equal(env.writes[1].functionName,'depositCollateral');assert.equal(env.writes[1].address,CLUB);assert.deepEqual(env.writes[1].args,[60000n]);
  }finally{ui?.dispose();delete (globalThis as any).__task049Panel;delete (globalThis as any).__task049Hooks;}
});

test('T049 actual EOA join uses bounded reviewed requirement, noapproval for none, and rejects invalid/context states',async()=>{
  const env=setupPanelGlobal();const instances:any[]=[];
  try{const mod=await loadPanel('ActionPanel');
    for(const policy of ['enforced','legacy']){const q=quote({member:false,state:0,allowance:60000n,policy});const view=viewFor(q);const ui=lifecycle(mod.ActionPanel,{...basePanel,state:0,isMember:false,collateralView:view,onSuccess(){}});instances.push(ui);let tree=ui.render();await joinButton(tree).props.onClick();const call=env.writes.at(-1);assert.equal(call.functionName,policy==='enforced'?'joinGroupWithCollateral':'joinGroup');assert.deepEqual(call.args,policy==='enforced'?[100000n]:[]);}
    const none=viewFor(quote({...collateralAmounts(0n,0n,0n),member:false,state:0,allowance:0n}));const ui=lifecycle(mod.ActionPanel,{...basePanel,state:0,isMember:false,collateralView:none,onSuccess(){}});instances.push(ui);await joinButton(ui.render()).props.onClick();assert.equal(env.writes.at(-1).functionName,'joinGroupWithCollateral');assert.deepEqual(env.writes.at(-1).args,[0n]);
    for(const bad of [{...viewFor(quote()),policy:'unknown',quote:undefined},viewFor(quote({...collateralAmounts(100000n,40000n,59999n)}))]){const blocked=lifecycle(mod.ActionPanel,{...basePanel,collateralView:bad,onSuccess(){}});instances.push(blocked);const button=topupButton(blocked.render());assert.ok(!button||button.props.disabled);}
    for(const changes of [{account:OTHER},{group:NEXT_CLUB}]){const view=viewFor(quote());view.review=async()=>({...view.quote,...changes});const blocked=lifecycle(mod.ActionPanel,{...basePanel,collateralView:view,onSuccess(){}});instances.push(blocked);const before=env.writes.length;await topupButton(blocked.render()).props.onClick();assert.equal(env.writes.length,before);}
    const held=viewFor(quote());const pending=deferred();held.review=()=>pending.promise;const locked=lifecycle(mod.ActionPanel,{...basePanel,collateralView:held,onSuccess(){}});instances.push(locked);const button=topupButton(locked.render());const before=env.writes.length;const p=button.props.onClick();await button.props.onClick();pending.reject(Error('Collateral amounts changed'));await p;assert.equal(env.writes.length,before);assert.ok(env.errors.length>0);held.review=async()=>held.quote;await topupButton(locked.render()).props.onClick();assert.equal(env.writes.length,before+1,'review failure releases guard for retry');
  }finally{instances.forEach(ui=>ui.dispose());delete (globalThis as any).__task049Panel;delete (globalThis as any).__task049Hooks;}
});

test('T049 both modes render exact review R/L/D/B/after and distinguish missing1satoshi/unknown/legacy',async()=>{
  setupPanelGlobal();const instances:any[]=[];
  try{for(const name of ['ActionPanel','PasskeyActionPanel']){const mod=await loadPanel(name);for(const language of ['en','vi']){
    const ui=lifecycle(mod[name],{...basePanel,language,bundler:{},onSuccess(){},collateralView:viewFor(quote())});instances.push(ui);const node=nodes(ui.render()).find(n=>typeof n.type==='function'&&n.type.name==='CollateralPreview');assert.ok(node);let preview=node.type(node.props);
    const values=nodes(preview).filter(n=>n.type==='dd').map(textOf);assert.deepEqual(values,['0.00100000 CirBTC','0.00040000 CirBTC','0.00060000 CirBTC','0.01000000 CirBTC',language==='en'?'Unavailable':'Chưa đọc được']);assert.ok(textOf(preview).includes('0.00940000 CirBTC'));
    assert.ok(textOf(preview).includes(TOKEN)&&textOf(preview).includes(CLUB)&&textOf(preview).includes(ACCOUNT));
    for(const policy of ['unknown','loading','legacy']){const q=policy==='legacy'?quote({policy}):undefined;preview=node.type({language,view:{policy,quote:q,refresh(){}}});assert.match(textOf(preview),policy==='legacy'?/Legacy|Hợp đồng cũ/i:policy==='loading'?/Checking|Đang kiểm tra/i:/unavailable|Chưa có dữ liệu|Chưa đọc được/i);}
    preview=node.type({language,view:viewFor(quote({...collateralAmounts(100000n,40000n,59999n)}))});assert.ok(textOf(preview).includes('0.00000001 CirBTC'));assert.match(textOf(preview),/Unavailable|Không khả dụng|Chưa đọc được/);
  }}}
  finally{instances.forEach(ui=>ui.dispose());delete (globalThis as any).__task049Panel;delete (globalThis as any).__task049Hooks;}
});

test('T049 actual passkey batches exact approval then one bounded join/deposit and handles rejected inner receipt',async()=>{
  const env=setupPanelGlobal();const instances:any[]=[];const batches:any[]=[];let fail=false;
  const bundler={sendUserOperation:async(args:any)=>{batches.push(args);return '0x123';},waitForUserOperationReceipt:async()=>({success:!fail,receipt:{status:'success',transactionHash:'0x123'}})};
  try{const mod=await loadPanel('PasskeyActionPanel');
    for(const action of ['join','deposit'])for(const language of ['en','vi']){
      const q=quote({member:action!=='join',state:action==='join'?0:1});const view=viewFor(q);let refreshed=0;const ui=lifecycle(mod.PasskeyActionPanel,{...basePanel,language,state:q.state,isMember:q.member,collateralView:view,bundler,onSuccess(){refreshed++;}});instances.push(ui);
      const tree=ui.render();const button=action==='join'?joinButton(tree):topupButton(tree);assert.ok(button&&!button.props.disabled);assert.match(textOf(button),/Approve.*\+|Cấp quyền.*\+/i);await button.props.onClick();const batch=batches.at(-1);assert.equal(batch.account.address,ACCOUNT);assert.equal(batch.calls.length,2);assert.equal(batch.calls[0].to,TOKEN);assert.equal(batch.calls[1].to,CLUB);
      const approve=decodeFunctionData({abi:parseAbi(['function approve(address,uint256)']),data:batch.calls[0].data});assert.deepEqual(approve.args,[CLUB,60000n]);
      const operation=decodeFunctionData({abi:ROTATING_SAVINGS_ABI,data:batch.calls[1].data});assert.equal(operation.functionName,action==='join'?'joinGroupWithCollateral':'depositCollateral');assert.deepEqual(operation.args,action==='join'?[100000n]:[60000n]);assert.equal(refreshed,1);
    }
    for(const q of [quote({member:false,state:0,allowance:60000n}),quote({...collateralAmounts(0n,0n,0n),member:false,state:0,allowance:0n})]){const ui=lifecycle(mod.PasskeyActionPanel,{...basePanel,state:0,isMember:false,collateralView:viewFor(q),bundler,onSuccess(){}});instances.push(ui);await joinButton(ui.render()).props.onClick();assert.equal(batches.at(-1).calls.length,1,'funded allowance/none requires no approval');}
    let refreshed=0;const ui=lifecycle(mod.PasskeyActionPanel,{...basePanel,collateralView:viewFor(quote()),bundler,onSuccess(){refreshed++;}});instances.push(ui);fail=true;const successBefore=env.success.length;await topupButton(ui.render()).props.onClick();assert.equal(env.success.length,successBefore);assert.equal(refreshed,0);assert.ok(env.errors.length>0);fail=false;await topupButton(ui.render()).props.onClick();assert.equal(refreshed,1,'failed inner receipt releases retry');
  }finally{instances.forEach(ui=>ui.dispose());delete (globalThis as any).__task049Panel;delete (globalThis as any).__task049Hooks;}
});

test('T049 actual creation requires explicit policy, encodes exact constructorR and preserves submitted snapshot after receipt/retry',async()=>{
  const env:any={calls:[],saved:[],errors:[],receipt:{},reset(){},success:0,closed:0};(globalThis as any).__task049Create=env;let ui:any;
  try{const mod=await productionModule('src/components/savings/CreateClubModal.tsx',{
    react:reactBoundary,
    wagmi:`export const useAccount=()=>({isConnected:true,chainId:5042002,address:'${ACCOUNT}'});export const useConfig=()=>({});export const useSwitchChain=()=>({switchChainAsync:async()=>({id:5042002})});const reset=()=>globalThis.__task049Create.reset();export const useDeployContract=()=>({deployContract:x=>globalThis.__task049Create.calls.push(x),reset,isPending:false});export const useWaitForTransactionReceipt=()=>({isLoading:false,isSuccess:false,...globalThis.__task049Create.receipt});`,
    '@wagmi/core':`export const getAccount=()=>({address:'${ACCOUNT}',chainId:5042002});`,
    connectkit:'export const useModal=()=>({setOpen(){}});',
    sonner:'export const toast={error:x=>globalThis.__task049Create.errors.push(x)};',
    '../../lib/savingsClubDirectory':'export const saveKnownGroup=x=>globalThis.__task049Create.saved.push(x);',
  });
    ui=lifecycle(mod.CreateClubModal,{isOpen:true,language:'en',onClose(){env.closed++;},onSuccess(){env.success++;}});ui.render();await ui.flush();let tree=ui.render();const submit=(t:any)=>nodes(t).find(n=>n.type==='button'&&n.props.type==='submit');const form=(t:any)=>nodes(t).find(n=>n.type==='form');
    assert.equal(submit(tree).props.disabled,true);assert.ok(nodes(tree).filter(n=>n.type==='input'&&n.props.name==='collateralPolicy').every(n=>n.props.checked===false));
    nodes(tree).filter(n=>n.type==='input'&&n.props.name==='collateralPolicy')[0].props.onChange();tree=ui.render();assert.equal(submit(tree).props.disabled,false);await form(tree).props.onSubmit({preventDefault(){}});assert.equal(env.calls[0].args.length,7);assert.equal(env.calls[0].args[6],0n);
    await form(tree).props.onSubmit({preventDefault(){}});assert.equal(env.calls.length,1,'double click cannot deploy twice');
    env.receipt={error:Error('receipt unavailable')};ui.render();await ui.flush();assert.equal(env.saved.length,0);assert.equal(env.success,0);
    env.receipt={};tree=ui.render();nodes(tree).filter(n=>n.type==='input'&&n.props.name==='collateralPolicy')[1].props.onChange();tree=ui.render();
    for(const input of ['0','0.000000001','NaN','1e-8']){nodes(tree).find(n=>n.props?.['aria-label']==='Custom CirBTC collateral').props.onChange({target:{value:input}});tree=ui.render();assert.equal(submit(tree).props.disabled,true);}
    nodes(tree).find(n=>n.props?.['aria-label']==='Custom CirBTC collateral').props.onChange({target:{value:'0.00000001'}});tree=ui.render();const nameInput=nodes(tree).find(n=>n.type==='input'&&n.props.type==='text');nameInput.props.onChange({target:{value:'Reviewed name'}});tree=ui.render();await form(tree).props.onSubmit({preventDefault(){}});assert.equal(env.calls.length,2,'receipt failure releases deploy lock');const submitted=env.calls[1];assert.equal(submitted.args[6],1n);
    const encoded=encodeDeployData(submitted);const ctor=submitted.abi.find((x:any)=>x.type==='constructor');assert.deepEqual(decodeAbiParameters(ctor.inputs,`0x${encoded.slice(submitted.bytecode.length)}`),submitted.args);
    tree=ui.render();nodes(tree).find(n=>n.props?.['aria-label']==='Custom CirBTC collateral').props.onChange({target:{value:'2'}});nodes(tree).find(n=>n.type==='input'&&n.props.type==='text').props.onChange({target:{value:'Edited while pending'}});ui.render();
    env.receipt={isSuccess:true,data:{status:'success',contractAddress:NEXT_CLUB}};ui.render();await ui.flush();assert.deepEqual(env.saved,[{address:NEXT_CLUB,name:'Reviewed name',initialCollateral:'1'}]);assert.equal(env.success,1);assert.equal(env.closed,1);
    tree=ui.render();assert.ok(nodes(tree).filter(n=>n.type==='input'&&n.props.name==='collateralPolicy').every(n=>n.props.checked===false),'successful creation resets explicit policy choice');
  }finally{ui?.dispose();delete (globalThis as any).__task049Create;delete (globalThis as any).__task049Hooks;}
});

test('T049 actual App owner setting waits for receipt/refetch, rejects failed passkey receipt and resets stale drafts',async()=>{
  const savedWindow=(globalThis as any).window,savedStorage=(globalThis as any).localStorage;
  (globalThis as any).window={location:{search:`?group=${CLUB}&view=app`,href:`http://localhost/?group=${CLUB}&view=app`,pathname:'/'},history:{pushState(){},replaceState(){}},addEventListener(){},removeEventListener(){},scrollY:0,requestAnimationFrame(){}};
  (globalThis as any).localStorage={getItem:()=> 'en',setItem(){}};
  const missing=Object.assign(Error('execution reverted'),{code:3});let refreshCount=0;const fresh=Array.from({length:13},()=>({status:'success',result:0n} as any));fresh[1].result=0;fresh[7]={status:'failure',error:missing};fresh[8]={status:'failure',error:missing};
  const env:any={address:ACCOUNT,mode:'eoa',writes:[],batches:[],success:[],errors:[],ownerReceipt:{},failOp:false,club:{groupName:'QA owner',state:0,currentRound:0n,maxMembers:3n,activeMembers:0n,contributionAmount:10000000n,owner:ACCOUNT,collateralAmount:0n,memberCount:0,membershipKnown:true,isLoading:false,refetch:async()=>{refreshCount++;return {data:fresh};}},view:viewFor(quote({...collateralAmounts(0n,0n,1000000n),member:false,state:0}))};
  env.bundler={sendUserOperation:async(x:any)=>{env.batches.push(x);return '0x123';},waitForUserOperationReceipt:async()=>({success:!env.failOp,receipt:{status:'success',transactionHash:'0x123'}})};(globalThis as any).__task049App=env;let ui:any;
  try{
    const mocks:any={react:reactBoundary,
      wagmi:'export const useAccount=()=>({address:globalThis.__task049App.address});export const useWaitForTransactionReceipt=(x)=>x.hash==="owner"?globalThis.__task049App.ownerReceipt:{};',
      connectkit:'export const useModal=()=>({setOpen(){}});',
      sonner:'export const toast={success:(...x)=>globalThis.__task049App.success.push(x),error:(...x)=>globalThis.__task049App.errors.push(x),info(){}};',
      './hooks/useArcWriteContract':'const reset=()=>{};export const useArcWriteContract=(context)=>({writeContract:x=>globalThis.__task049App.writes.push(x),data:context?"owner":undefined,isPending:false,reset});',
      './hooks/usePasskeyWallet':'export const usePasskeyWallet=()=>{const e=globalThis.__task049App;return {state:e.mode==="passkey"?{status:"ready",address:e.address,account:{address:e.address}}:{status:"idle"},bundler:e.bundler,isConfigured:true,register(){},login(){},logout(){},clearError(){}}};',
      './hooks/useCollateralPolicy':'export const useCollateralPolicy=()=>globalThis.__task049App.view;',
      './hooks/useSavingsClub':'const refetch=()=>{};export const useClubInfo=()=>globalThis.__task049App.club;export const useCycleCapability=()=>({capability:"supported",refetch});export const useRoundInfo=()=>({refetch});export const useMemberStatus=()=>({refetch,isMember:false});export const useRoundMemberStatus=()=>({refetch});export const useUsdcAllowance=()=>({allowance:0n,refetch});export const useUsdcBalance=()=>({balance:0n,refetch});export const useClubMembers=()=>({members:[],totalJoined:0,refetch});export const useRoundHistory=()=>({settledRounds:[],isHistoryLimited:false});',
      './lib/savingsClubDirectory':`export const getKnownGroups=()=>[{address:'${CLUB}',name:'QA owner'}];export const getRemovedGroups=()=>new Set();export const saveKnownGroup=()=>{};export const updateKnownGroupName=()=>{};`,
    };
    const appSource=fs.readFileSync('src/App.tsx','utf8');for(const match of appSource.matchAll(/import\s*\{([^}]+)\}\s*from\s*["'](\.\/components\/[^"']+)["']/g)){mocks[match[2]]=match[1].split(',').map(s=>s.trim()).map(name=>`export const ${name}=()=>${name.startsWith('get')?'({x:0,y:0})':'null'};`).join('\n');}
    const {default:App}=await productionModule('src/App.tsx',mocks);ui=lifecycle(App,{});ui.render();await ui.flush();let tree=ui.render();const confirm=(t:any)=>nodes(t).find(n=>n.type==='button'&&textOf(n)==='Confirm collateral setting');
    assert.ok(confirm(tree)?.props.disabled);assert.match(textOf(tree),/Confirmed on-chain requirement:.*0\.00000000 CirBTC/);
    const chooseCustom=()=>{let t=ui.render();nodes(t).filter(n=>n.type==='input'&&n.props.name==='ownerCollateral')[1].props.onChange();t=ui.render();nodes(t).find(n=>n.props?.['aria-label']==='Owner CirBTC collateral').props.onChange({target:{value:'0.001'}});return ui.render();};
    tree=chooseCustom();await confirm(tree).props.onClick();assert.equal(env.writes.length,1);assert.equal(env.writes[0].functionName,'setCollateralAmount');assert.deepEqual(env.writes[0].args,[100000n]);assert.equal(env.success.length,0);assert.match(textOf(ui.render()),/Confirmed on-chain requirement:.*0\.00000000 CirBTC/,'no optimistic policy save');
    env.ownerReceipt={error:Error('owner receipt reverted')};ui.render();await ui.flush();assert.equal(env.success.length,0);assert.match(textOf(ui.render()),/Confirmed on-chain requirement:.*0\.00000000 CirBTC/);
    env.ownerReceipt={};ui.render();await ui.flush();await confirm(ui.render()).props.onClick();assert.equal(env.writes.length,2,'owner receipt failure allows explicit retry');
    const before=refreshCount;env.ownerReceipt={isSuccess:true};env.club.collateralAmount=100000n;ui.render();await ui.flush();assert.ok(refreshCount>before);assert.equal(env.success.length,1);assert.match(textOf(ui.render()),/Confirmed on-chain requirement:.*0\.00100000 CirBTC/);
    env.ownerReceipt={};ui.render();await ui.flush();env.mode='passkey';env.failOp=true;tree=chooseCustom();const successBefore=env.success.length;await confirm(tree).props.onClick();assert.equal(env.success.length,successBefore,'failed inner userOp never reports success');assert.ok(env.errors.length>0);assert.equal(decodeFunctionData({abi:ROTATING_SAVINGS_ABI,data:env.batches.at(-1).calls[0].data}).functionName,'setCollateralAmount');
    env.failOp=false;await confirm(ui.render()).props.onClick();assert.equal(env.success.length,successBefore+1,'rejected receipt releases next explicit attempt');
    env.address=OTHER;env.club.owner=OTHER;ui.render();await ui.flush();tree=ui.render();assert.ok(nodes(tree).filter(n=>n.type==='input'&&n.props.name==='ownerCollateral').every(n=>n.props.checked===false),'account switch resets owner draft');
    tree=chooseCustom();const switcher=nodes(tree).find(n=>typeof n.type==='function'&&n.props?.onSwitchGroup);switcher.props.onSwitchGroup(NEXT_CLUB);ui.render();await ui.flush();tree=ui.render();assert.ok(nodes(tree).filter(n=>n.type==='input'&&n.props.name==='ownerCollateral').every(n=>n.props.checked===false),'club switch resets owner draft');
    tree=chooseCustom();env.club.memberCount=1;assert.equal(confirm(ui.render()).props.disabled,true);env.club.memberCount=0;env.club.membershipKnown=false;assert.equal(confirm(ui.render()).props.disabled,true);
  }finally{ui?.dispose();(globalThis as any).window=savedWindow;(globalThis as any).localStorage=savedStorage;delete (globalThis as any).__task049App;delete (globalThis as any).__task049Hooks;}
});
