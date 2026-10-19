const assert=require('node:assert/strict');
const S=require('../engine.js');
const {Solar}=require('../vendor/lunar.js');
const base={date:'1990-05-15',time:'07:30',city:'seoul',correct:true,unknown:false};
const r=S.compute(base),now=new Date('2026-10-19T03:00:00Z');let n=0;
function test(label,fn){fn();n++;console.log('PASS',label);}
test('current and next Korean year are 2026 and 2027',()=>{const f=S.forecast(r,'male',now);assert.deepEqual(f.annual.map(a=>[a.year,a.gan+a.zhi]),[[2026,'丙午'],[2027,'丁未']]);assert.equal(f.annual[0].ganGod,'편관');assert.equal(f.annual[1].ganGod,'정관');});
test('Korean New Year is independent of host time zone',()=>{assert.equal(S.forecast(r,'male',new Date('2026-12-31T15:00:00Z')).year,2027);assert.equal(S.forecast(r,'male',new Date('2026-12-31T14:59:59Z')).year,2026);});
test('optional gender omits daeun but preserves annual readings',()=>{const f=S.forecast(r,'',now);assert.equal(f.daeun,null);assert.equal(f.annual.length,2);assert.throws(()=>S.forecast(r,'invalid',now));});
test('yang year male forward, female backward',()=>{assert.equal(S.forecast(r,'male',now).daeun.forward,true);assert.equal(S.forecast(r,'female',now).daeun.forward,false);});
test('yin year direction reverses',()=>{const yin=S.compute({...base,date:'1991-05-15'});assert.equal(S.forecast(yin,'male',now).daeun.forward,false);assert.equal(S.forecast(yin,'female',now).daeun.forward,true);});
test('all cycles agree with upstream calendar and are contiguous',()=>{const f=S.forecast(r,'male',now),yun=Solar.fromYmdHms(1990,5,15,6,30,0).getLunar().getEightChar().getYun(1,2);const expected=yun.getDaYun(10).slice(1);assert.equal(f.daeun.cycles.length,9);f.daeun.cycles.forEach((c,i)=>{assert.equal(c.gan+c.zhi,expected[i].getGanZhi());assert.ok(c.to>c.from);if(i>0)assert.equal(c.from,f.daeun.cycles[i-1].to);});assert.equal(f.daeun.cycles.filter(c=>c.current).length,1);});
test('start included, next boundary excluded with no duplicate current interval',()=>{const cycles=S.forecast(r,'male',now).daeun.cycles,edge=cycles[1].from;const before=S.forecast(r,'male',new Date(edge-1)).daeun.cycles;const after=S.forecast(r,'male',new Date(edge)).daeun.cycles;assert.equal(before[0].current,true);assert.equal(after[0].current,false);assert.equal(after[1].current,true);});
test('solar display correction does not move daeun birth instant',()=>{const on=S.forecast(r,'male',now),off=S.forecast(S.compute({...base,correct:false}),'male',now);assert.deepEqual(on.daeun,off.daeun);});
test('unknown birth time flags daeun approximation',()=>{const f=S.forecast(S.compute({...base,unknown:true}),'female',now);assert.equal(f.daeun.approximate,true);});
test('early and out of displayed range never claim a current cycle',()=>{const early=S.forecast(r,'male',new Date('1990-05-16T00:00:00Z')).daeun;assert.equal(early.beforeStart,true);assert.equal(early.cycles.filter(c=>c.current).length,0);const late=S.forecast(r,'male',new Date('2150-01-01T00:00:00Z')).daeun;assert.equal(late.afterEnd,true);assert.equal(late.cycles.filter(c=>c.current).length,0);});
test('same input and reference time yield same full forecast',()=>{assert.deepEqual(S.forecast(r,'male',now),S.forecast(r,'male',now));});
console.log(n+' forecast tests passed');
