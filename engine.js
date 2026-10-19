/* On:gyeol: calendar math runs locally. See README.md for calculation conventions. */
(function(root){
'use strict';
const lib=typeof module==='object'&&module.exports?require('./vendor/lunar.js'):root;
const GAN='甲乙丙丁戊己庚辛壬癸',ZHI='子丑寅卯辰巳午未申酉戌亥';
const KO={甲:'갑',乙:'을',丙:'병',丁:'정',戊:'무',己:'기',庚:'경',辛:'신',壬:'임',癸:'계',子:'자',丑:'축',寅:'인',卯:'묘',辰:'진',巳:'사',午:'오',未:'미',申:'신',酉:'유',戌:'술',亥:'해'};
const ELEMENTS=[{name:'목',han:'木',color:'#71917b',class:'wood',word:'성장'},{name:'화',han:'火',color:'#cf8b7d',class:'fire',word:'표현'},{name:'토',han:'土',color:'#c5ad71',class:'earth',word:'안정'},{name:'금',han:'金',color:'#a29dac',class:'metal',word:'기준'},{name:'수',han:'水',color:'#82a4be',class:'water',word:'유연함'}];
const STEM_E=[0,0,1,1,2,2,3,3,4,4],BRANCH_E=[4,2,0,0,2,1,1,2,3,3,2,4];
const CITIES={seoul:['서울',126.97],busan:['부산',129.08],incheon:['인천',126.71],daegu:['대구',128.60],daejeon:['대전',127.38],gwangju:['광주',126.85],ulsan:['울산',129.31],sejong:['세종',127.29],suwon:['수원',127.03],chuncheon:['춘천',127.73],gangneung:['강릉',128.90],cheongju:['청주',127.49],jeonju:['전주',127.15],jeju:['제주',126.53]};
const HIDDEN={子:'癸',丑:'己癸辛',寅:'甲丙戊',卯:'乙',辰:'戊乙癸',巳:'丙庚戊',午:'丁己',未:'己丁乙',申:'庚壬戊',酉:'辛',戌:'戊辛丁',亥:'壬甲'};
const FORTUNE=['장생','목욕','관대','건록','제왕','쇠','병','사','묘','절','태','양'],START=[11,6,2,9,2,9,5,0,8,3];
const FORMAT=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const pad=n=>String(n).padStart(2,'0');
const parts=d=>[d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),d.getUTCHours(),d.getUTCMinutes()];
function stamp(d){const [y,m,day,h,min]=parts(d);return `${y}.${pad(m)}.${pad(day)} ${pad(h)}:${pad(min)}`;}
function solar(d){return lib.Solar.fromYmdHms(...parts(d),d.getUTCSeconds());}
function localWall(instant){const x=Object.fromEntries(FORMAT.formatToParts(new Date(instant)).map(p=>[p.type,p.value]));return Date.UTC(+x.year,+x.month-1,+x.day,+x.hour,+x.minute);}
function resolveKoreanTime(wall){const candidates=[9,10].map(offset=>({instant:wall-offset*3600000,offset})).filter(x=>localWall(x.instant)===wall);if(candidates.length!==1)throw new Error(candidates.length?'서머타임 종료로 두 번 존재하는 시각이에요. 이 시각은 현재 지원하지 않아요.':'서머타임 전환으로 존재하지 않는 시각이에요. 출생 기록을 확인해주세요.');return candidates[0];}
function element(symbol){const i=GAN.indexOf(symbol);return i>=0?STEM_E[i]:BRANCH_E[ZHI.indexOf(symbol)];}
function god(day,other){const a=GAN.indexOf(day),b=GAN.indexOf(other),ae=STEM_E[a],be=STEM_E[b],same=a%2===b%2;const diff=(be-ae+5)%5;return [['비견','겁재'],['식신','상관'],['편재','정재'],['편관','정관'],['편인','정인']][diff][same?0:1];}
function fortune(day,branch){const i=GAN.indexOf(day),z=ZHI.indexOf(branch);return FORTUNE[(i%2===0?z-START[i]+12:START[i]-z+12)%12];}
function compute(input){
 if(!input||!/^\d{4}-\d{2}-\d{2}$/.test(input.date))throw new Error('생년월일을 정확히 입력해주세요.');
 const [y,m,d]=input.date.split('-').map(Number),check=new Date(Date.UTC(y,m-1,d));
 if(y<1970||y>2026||check.getUTCFullYear()!==y||check.getUTCMonth()+1!==m||check.getUTCDate()!==d)throw new Error('1970~2026년의 올바른 양력 날짜를 입력해주세요.');
 if(!CITIES[input.city])throw new Error('출생 도시를 선택해주세요.');
 if(!input.unknown&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time||''))throw new Error('태어난 시간을 24시간제로 입력해주세요.');
 const [h,min]=(input.unknown?'12:00':input.time).split(':').map(Number),wall=Date.UTC(y,m-1,d,h,min),resolved=resolveKoreanTime(wall);
 const dayOfYear=Math.floor((Date.UTC(y,m-1,d)-Date.UTC(y,0,1))/86400000)+1,B=2*Math.PI*(dayOfYear-81)/365;
 const eqt=9.87*Math.sin(2*B)-7.53*Math.cos(B)-1.5*Math.sin(B),lon=(CITIES[input.city][1]-135)*4;
 const correction=input.correct&&!input.unknown?eqt+lon:0;
 const adjusted=new Date(resolved.instant+9*3600000+correction*60000);
 const ec=solar(adjusted).getLunar().getEightChar();ec.setSect(2);
 // Solar-term library is expressed in China standard time; compare the SAME instant in UTC+8.
 const termEC=solar(new Date(resolved.instant+8*3600000)).getLunar().getEightChar();
 const dayGan=ec.getDayGan(),dayZhi=ec.getDayZhi(),hourBranch=Math.floor(((adjusted.getUTCHours()*60+adjusted.getUTCMinutes()+60)%1440)/120);
 const timeGan=GAN[((GAN.indexOf(dayGan)%5)*2+hourBranch)%10];
 const pillars=[input.unknown?null:{gan:timeGan,zhi:ZHI[hourBranch]},{gan:dayGan,zhi:dayZhi},{gan:termEC.getMonthGan(),zhi:termEC.getMonthZhi()},{gan:termEC.getYearGan(),zhi:termEC.getYearZhi()}];
 pillars.forEach((p,i)=>{if(!p)return;p.ganGod=i===1?'일간 · 나':god(dayGan,p.gan);p.hidden=Array.from(HIDDEN[p.zhi]);p.zhiGod=god(dayGan,p.hidden[0]);p.fortune=fortune(dayGan,p.zhi);});
 const counts=[0,0,0,0,0];pillars.filter(Boolean).forEach(p=>{counts[element(p.gan)]++;counts[element(p.zhi)]++;});
 const warnings=[];
 if(input.unknown){warnings.push('시간 미상: 정오를 기준으로 세 기둥을 계산했어요. 자정·절기 경계 출생자는 일주·월주·년주가 달라질 수 있어요.');const a=resolveKoreanTime(Date.UTC(y,m-1,d,0,0)),b=resolveKoreanTime(Date.UTC(y,m-1,d,23,59));const edge=[a,b].map(t=>solar(new Date(t.instant+8*3600000)).getLunar().getEightChar());if(edge[0].getYear()!==edge[1].getYear()||edge[0].getMonth()!==edge[1].getMonth())warnings.push('이 날짜에는 절기 경계가 있어요. 정확한 출생 시간을 알아야 년주·월주를 확정할 수 있습니다.');}
 if(!input.unknown){const minutes=adjusted.getUTCHours()*60+adjusted.getUTCMinutes();if(Math.min((minutes+60)%120,120-(minutes+60)%120)<5)warnings.push('보정 시각이 시주 경계에서 5분 이내예요. 출생 기록과 도시 경도·균시차 근사 오차에 따라 시주가 달라질 수 있어요.');}
 if(resolved.offset===10)warnings.push('한국 서머타임을 감지해 시계 시각에서 60분을 제외했어요.');
 return {input:{...input,name:(input.name||'당신').trim().slice(0,12)||'당신'},pillars,dayGan,counts,total:input.unknown?6:8,dayElement:element(dayGan),adjusted:stamp(adjusted),correction,lon,eqt,dst:resolved.offset===10,city:CITIES[input.city],warnings};
}

const THEMES={
비견:['나의 속도를 지키는 시간','자기 기준과 독립성을 돌아보는 상징이에요. 주변의 속도보다 내가 원하는 방향을 먼저 정리해보세요.','서로의 개인 시간과 취향을 존중하는 대화를 해보세요.'],
겁재:['관계의 균형을 살피는 시간','함께하는 일과 나만의 영역 사이에서 균형을 생각해볼 수 있어요. 비교보다는 협력의 방식을 찾아보세요.','상대와 나를 비교하기보다 서로 편한 경계와 약속을 이야기해보세요.'],
식신:['편안한 표현을 연습하는 시간','일상의 즐거움과 꾸준한 표현을 상징해요. 작은 취미와 편안한 소통을 이어가보세요.','거창한 이벤트보다 함께 즐길 수 있는 가벼운 일상을 제안해보세요.'],
상관:['새로운 표현을 발견하는 시간','익숙한 방식 밖의 아이디어와 솔직한 표현을 상징해요. 말의 내용과 전달 방식을 함께 살펴보세요.','솔직함에 배려를 더해보세요. 감정을 말할 때 상대의 의도를 단정하지 않는 게 좋아요.'],
편재:['넓어진 관심을 정리하는 시간','다양한 경험과 외부 활동에 눈길을 두는 상징이에요. 많은 선택지 속에서 나의 우선순위를 정해보세요.','새로운 만남의 폭보다 내가 편안함을 느끼는 관계인지 살펴보세요.'],
정재:['작은 신뢰를 쌓는 시간','꾸준한 관리와 현실적인 약속을 상징해요. 큰 변화보다 지속할 수 있는 일상에 시선을 두어보세요.','연락과 만남에서 서로 지킬 수 있는 약속을 정해보세요.'],
편관:['경계와 부담을 살피는 시간','도전과 책임을 바라보는 상징이에요. 무엇을 감당할지, 무엇을 내려놓을지 구분해보세요.','관계를 지키려고 내 경계를 희생하고 있지는 않은지 돌아보세요.'],
정관:['서로의 기준을 맞추는 시간','원칙과 책임을 정돈하는 상징이에요. 내가 중요하게 여기는 기준을 말로 정리해보세요.','관계를 정의하는 말보다 서로 기대하는 행동을 구체적으로 이야기해보세요.'],
편인:['내 마음의 이유를 찾는 시간','사색과 새로운 관점을 상징해요. 혼자 생각하는 시간과 타인에게 확인하는 시간을 균형 있게 가져보세요.','상대의 마음을 추측하기보다 궁금한 점 하나를 직접 물어보세요.'],
정인:['편안한 기반을 돌보는 시간','배움과 지지, 회복의 상징이에요. 도움을 받을 수 있는 관계와 나를 편안하게 하는 일상을 살펴보세요.','돌봄을 주는 것만큼 내가 원하는 배려도 편하게 표현해보세요.']};
function koreanYear(now){return Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Asia/Seoul'}).format(now));}
function forecast(r,gender,now=new Date()){
 if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw new Error('기준 날짜가 올바르지 않아요.');
 if(gender&&!['male','female'].includes(gender))throw new Error('대운 계산 기준을 확인해주세요.');
 const year=koreanYear(now);
 const annual=[year,year+1].map(y=>{const idx=((y-4)%60+60)%60,gan=GAN[idx%10],zhi=ZHI[idx%12],ganGod=god(r.dayGan,gan);return {year:y,gan,zhi,ganGod,zhiGod:god(r.dayGan,HIDDEN[zhi][0]),theme:THEMES[ganGod],beforeBirth:y<Number(r.input.date.slice(0,4))};});
 if(!gender)return {year,annual,daeun:null};
 const [y,m,d]=r.input.date.split('-').map(Number),[h,min]=(r.input.unknown?'12:00':r.input.time).split(':').map(Number),resolved=resolveKoreanTime(Date.UTC(y,m-1,d,h,min));
 // Daeun uses civil birth INSTANT, not longitude-adjusted display clock.
 const ec=solar(new Date(resolved.instant+8*3600000)).getLunar().getEightChar();
 const yun=ec.getYun(gender==='male'?1:0,2),start=yun.getStartSolar();
 const toInstant=s=>Date.UTC(s.getYear(),s.getMonth()-1,s.getDay(),s.getHour()-8,s.getMinute(),s.getSecond());
 const cycles=yun.getDaYun(10).slice(1).map((cycle,i)=>{const startSolar=start.nextYear(i*10),endSolar=start.nextYear((i+1)*10),from=toInstant(startSolar),to=toInstant(endSolar),gz=cycle.getGanZhi(),ganGod=god(r.dayGan,gz[0]);const startKst=new Date(from+9*3600000),birth=new Date(resolved.instant+9*3600000);let age=startKst.getUTCFullYear()-birth.getUTCFullYear();if(startKst.getUTCMonth()<birth.getUTCMonth()||(startKst.getUTCMonth()===birth.getUTCMonth()&&startKst.getUTCDate()<birth.getUTCDate()))age--;return {index:i,gan:gz[0],zhi:gz[1],ganGod,theme:THEMES[ganGod],from,to,start:stamp(startKst).slice(0,10),end:stamp(new Date(to+9*3600000)).slice(0,10),age,current:now.getTime()>=from&&now.getTime()<to};});
 return {year,annual,daeun:{forward:yun.isForward(),years:yun.getStartYear(),months:yun.getStartMonth(),days:yun.getStartDay(),hours:yun.getStartHour(),approximate:!!r.input.unknown,cycles,beforeStart:now.getTime()<cycles[0].from,afterEnd:now.getTime()>=cycles.at(-1).to}};
}
function yearWindow(year){const instant=y=>{const t=lib.Solar.fromYmd(y,2,4).getLunar().getJieQiTable()['立春'];return Date.UTC(t.getYear(),t.getMonth()-1,t.getDay(),t.getHour()-8,t.getMinute(),t.getSecond());};return {from:instant(year),to:instant(year+1)};}
const api={compute,forecast,yearWindow,THEMES,element,god,fortune,KO,GAN,ZHI,ELEMENTS,CITIES,stamp,resolveKoreanTime};
if(typeof module==='object'&&module.exports)module.exports=api;else root.Saju=api;
})(typeof globalThis==='object'?globalThis:this);
