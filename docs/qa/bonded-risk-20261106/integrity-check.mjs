import fs from 'node:fs';
import assert from 'node:assert/strict';
const root='docs/qa/bonded-risk-20261106/';
const before=JSON.parse(fs.readFileSync(root+'task059-original.log','utf8'));
const after=JSON.parse(fs.readFileSync('docs/manifests/task-059/manifest.json','utf8'));
assert.equal(Object.keys(before.files).length,22);assert.deepEqual(Object.keys(before.files).sort(),Object.keys(after.files).sort());
for(const [name,info]of Object.entries(before.files)){assert.equal(after.files[name].baselineSha256,info.baselineSha256);assert.equal(after.files[name].isNew,info.isNew);}
const deleted=fs.readFileSync(root+'untracked-retained-paths.log','utf8').trim().split('\n').filter(Boolean);
const tracked=new Set(fs.readFileSync(root+'tracked-paths.log','utf8').trim().split('\n'));
const snapshots=deleted.filter(p=>p.startsWith('docs/manifests/bonded-review-20261106/baseline/'));
const logs=deleted.filter(p=>p.startsWith('docs/qa/bonded-review-20261106/')&&p.endsWith('.log'));
assert.equal(snapshots.length,82);assert.equal(logs.length,5);assert.equal(deleted.length,87);
for(const p of deleted){assert.ok(fs.existsSync(p),'retained '+p);assert.ok(!tracked.has(p),'untracked '+p);}
assert.ok([...tracked].some(p=>p.startsWith('docs/manifests/task-059/baseline/')),'other historical snapshots remain tracked');
assert.ok(fs.readFileSync('.gitignore','utf8').includes('docs/manifests/**/baseline/'));
console.log('PASS task059 exactly22 paths with baseline metadata preserved;82 snapshots+5 logs untracked and retained;other historical artifacts remain');
