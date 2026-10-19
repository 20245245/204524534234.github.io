const assert=require('node:assert/strict');
const S=require('../engine.js');
const {Solar,LunarUtil}=require('../vendor/lunar.js');
const base={name:'테스트',date:'2005-12-23',time:'09:37',city:'seoul',correct:false,unknown:false};
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS',name);}
test('upstream known case at the same instant, local hour preserved',()=>{
 const r=S.compute(base); // 09:37 KST = 08:37 CST; year/month/day match upstream fixture.
 assert.deepEqual(r.pillars.slice(1).map(p=>p.gan+p.zhi),['辛巳','戊子','乙酉']);
 assert.equal(r.pillars[0].gan+r.pillars[0].zhi,'癸巳');
});
test('reference document day-cycle base agrees',()=>{assert.equal(Solar.fromYmd(1900,1,1).getLunar().getEightChar().getDay(),'甲戌');});
test('known sexagenary anchor 2000-01-07 = 甲子',()=>{const r=S.compute({...base,date:'2000-01-07',time:'12:00'});assert.equal(r.pillars[1].gan+r.pillars[1].zhi,'甲子');});
test('KST solar-term boundary changes year/month at same instant as CST library',()=>{
 const term=Solar.fromYmd(2024,2,4).getLunar().getJieQiTable()['立春'];
 const [date,time]=term.toYmdHms().split(' '),[h,m]=time.split(':').map(Number);
 const before=S.compute({...base,date,time:`${String(h+1).padStart(2,'0')}:${String(m).padStart(2,'0')}`});
 const after=S.compute({...base,date,time:`${String(h+1).padStart(2,'0')}:${String(m+1).padStart(2,'0')}`});
 assert.equal(before.pillars[3].gan+before.pillars[3].zhi,'癸卯');
 assert.equal(after.pillars[3].gan+after.pillars[3].zhi,'甲辰');
 assert.notEqual(before.pillars[2].zhi,after.pillars[2].zhi);
});
test('true solar correction crosses civil midnight correctly',()=>{const r=S.compute({...base,date:'2000-01-07',time:'00:10',correct:true});assert.equal(r.adjusted.slice(0,10),'2000.01.06');assert.equal(r.pillars[1].gan+r.pillars[1].zhi,'癸亥');});
test('day changes at 00:00, hour branch changes at 23:00',()=>{const a=S.compute({...base,date:'2000-01-07',time:'22:59'}),b=S.compute({...base,date:'2000-01-07',time:'23:00'}),c=S.compute({...base,date:'2000-01-08',time:'00:00'});assert.equal(a.pillars[0].zhi,'亥');assert.equal(b.pillars[0].zhi,'子');assert.equal(b.pillars[1].gan,'甲');assert.equal(b.pillars[0].gan,'甲');assert.equal(c.pillars[1].gan,'乙');assert.equal(c.pillars[0].gan,'丙');});
test('unknown time excludes all hour symbols and their element counts',()=>{const r=S.compute({...base,unknown:true,time:''});assert.equal(r.pillars[0],null);assert.equal(r.total,6);assert.equal(r.counts.reduce((a,b)=>a+b),6);});
test('unknown birth time warns on a solar-term day',()=>{const r=S.compute({...base,date:'2024-02-04',unknown:true});assert.ok(r.warnings.some(w=>w.includes('절기 경계')));});
test('1988 Korea daylight saving correctly removes 60 minutes',()=>{const r=S.compute({...base,date:'1988-08-08',time:'12:00'});assert.equal(r.dst,true);assert.ok(r.adjusted.endsWith('11:00'));});
test('rejects ambiguous/nonexistent Korean DST transition times',()=>{assert.throws(()=>S.compute({...base,date:'1988-05-08',time:'02:30'}),/존재하지/);assert.throws(()=>S.compute({...base,date:'1988-10-09',time:'02:30'}),/두 번/);});
test('invalid dates, times, region and unsupported years are rejected',()=>{for(const patch of [{date:'2023-02-29'},{date:'1969-12-31'},{date:'2027-01-01'},{time:'24:00'},{city:'unknown'}])assert.throws(()=>S.compute({...base,...patch}));assert.doesNotThrow(()=>S.compute({...base,date:'2024-02-29'}));});
test('same input stays deterministic and percentages use correct total',()=>{assert.deepEqual(S.compute(base),S.compute(base));assert.equal(S.compute(base).counts.reduce((a,b)=>a+b),8);});
test('all ten-god relationships agree with upstream tables',()=>{const ko={'比肩':'비견','劫财':'겁재','食神':'식신','伤官':'상관','偏财':'편재','正财':'정재','七杀':'편관','正官':'정관','偏印':'편인','正印':'정인'};for(const a of S.GAN)for(const b of S.GAN)assert.equal(S.god(a,b),ko[LunarUtil.SHI_SHEN[a+b]],a+b);});
test('all twelve-life stages agree with upstream formulas',()=>{const ko={'长生':'장생','沐浴':'목욕','冠带':'관대','临官':'건록','帝旺':'제왕','衰':'쇠','病':'병','死':'사','墓':'묘','绝':'절','胎':'태','养':'양'};for(const g of S.GAN)for(let z=0;z<12;z++){const offset=LunarUtil.CHANG_SHENG_OFFSET[g],idx=(offset+(S.GAN.indexOf(g)%2===0?z:-z)+12)%12;assert.equal(S.fortune(g,S.ZHI[z]),ko[LunarUtil.CHANG_SHENG[idx]]);}});
console.log(`${checks} tests passed`);
