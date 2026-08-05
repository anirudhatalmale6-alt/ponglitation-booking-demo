/* ===== PongLiTation booking — live, API-driven ===== */
document.getElementById('yr').textContent = new Date().getFullYear();

let CFG = null;
let state = { step:1, service:null, date:null, dateLabel:null, time:null, slots:[], loadingSlots:false,
              name:'', email:'', phone:'', notes:'', calMonth:null, result:null, error:null };

async function loadConfig(){
  try{ const r = await fetch('/api/config'); CFG = await r.json(); }
  catch(e){ console.error('config load failed', e); }
}
const cfgReady = loadConfig();

function services(){ return (CFG && CFG.services) || {}; }
function scheduleFor(dow){ return (CFG && CFG.schedule && CFG.schedule[dow]) || []; }
function blocked(){ return (CFG && CFG.blockedDates) || []; }
function todayCT(){ return (CFG && CFG.today) || new Date().toISOString().slice(0,10); }
function tz(){ return (CFG && CFG.tz) || 'CT'; }
function isEnquiry(){ const s=services()[state.service]; return s ? s.type==='enquiry' : false; }

function startMonth(){ const [y,m]=todayCT().split('-').map(Number); return {y, m:m-1}; }

async function openBooking(svc){
  await cfgReady;
  state = { step:1, service:svc||null, date:null, dateLabel:null, time:null, slots:[], loadingSlots:false,
            name:'', email:'', phone:'', notes:'', calMonth:startMonth(), result:null, error:null };
  if(svc) state.step=2;
  document.getElementById('overlay').classList.add('open');
  document.body.style.overflow='hidden';
  render();
}
function closeBooking(){
  document.getElementById('overlay').classList.remove('open');
  document.body.style.overflow='';
}
document.getElementById('overlay').addEventListener('click',e=>{ if(e.target.id==='overlay') closeBooking(); });

function render(){
  const s=state.step;
  for(let i=1;i<=4;i++){ const el=document.getElementById('p'+i); if(el) el.className = i<=s?'on':''; }
  const area=document.getElementById('stepArea');
  const foot=document.getElementById('mFoot');
  document.getElementById('mTitle').textContent =
     s===4 ? (state.result&&state.result.isEnquiry?'Request sent':'Confirmed')
           : (isEnquiry()?'Enquire about a group':'Book a session');

  if(s===1){
    const svcs=services();
    area.innerHTML = `
      <div class="step-title">Choose a service</div>
      <div class="step-sub">What would you like to book?</div>
      ${Object.entries(svcs).map(([k,v])=>`
        <div class="opt ${state.service===k?'sel':''}" onclick="pickService('${k}')">
          <div><b>${v.name}</b><small>${v.desc} · ${v.unit}</small></div>
          <span class="p">${v.price}</span>
        </div>`).join('')}`;
    foot.innerHTML = `<button class="btn btn-ghost" onclick="closeBooking()">Cancel</button>
      <button class="btn btn-primary" onclick="next()" ${state.service?'':'disabled style=opacity:.5'}>Continue</button>`;
  }
  else if(s===2){
    if(isEnquiry()){
      area.innerHTML = `
        <div class="step-title">Preferred date</div>
        <div class="step-sub">Pick a preferred start date — we&rsquo;ll confirm the details by email.</div>
        ${calendarHTML()}
        <div class="notice" style="margin-top:14px">Group sessions are shaped around you. No time slot needed — just a preferred date to start the conversation.</div>`;
    } else {
      area.innerHTML = `
        <div class="step-title">Pick a date & time</div>
        <div class="step-sub">Mon &amp; Wed 4–7pm · Tue/Thu/Fri 2–5pm · Sat &amp; Sun 8am–12pm &nbsp;·&nbsp; all times ${tz()}.</div>
        ${calendarHTML()}
        <div id="slotWrap" style="margin-top:14px">${slotArea()}</div>`;
    }
    foot.innerHTML = `<button class="btn btn-ghost" onclick="prev()">Back</button>
      <button class="btn btn-primary" onclick="next()" ${canNext2()?'':'disabled style=opacity:.5'}>Continue</button>`;
  }
  else if(s===3){
    area.innerHTML = `
      <div class="step-title">Your details</div>
      <div class="step-sub">Book now, pay later — no card required.</div>
      ${state.error?`<div class="notice" style="background:#fbe9e7;border-color:#f3c0b8;color:#a23b28;margin-bottom:12px">${state.error}</div>`:''}
      <div class="field"><label>Full name</label><input value="${esc(state.name)}" placeholder="Jane Doe" oninput="state.name=this.value"></div>
      <div class="field"><label>Email</label><input type="email" value="${esc(state.email)}" placeholder="jane@email.com" oninput="state.email=this.value"></div>
      <div class="field"><label>Phone (optional)</label><input value="${esc(state.phone)}" placeholder="(555) 000-0000" oninput="state.phone=this.value"></div>
      <div class="field"><label>${isEnquiry()?'Tell us about your group':'Notes (optional)'}</label><textarea rows="3" placeholder="${isEnquiry()?'Group size, what you&rsquo;re hoping to get out of it…':'Anything I should know?'}" oninput="state.notes=this.value">${esc(state.notes)}</textarea></div>`;
    foot.innerHTML = `<button class="btn btn-ghost" onclick="prev()">Back</button>
      <button class="btn btn-primary" id="confirmBtn" onclick="submitBooking()">Confirm booking</button>`;
  }
  else if(s===4){
    const r=state.result||{};
    area.innerHTML = `
      <div class="confirm">
        <div class="check">✓</div>
        <h3>${r.isEnquiry?'Request sent!':'You&rsquo;re booked!'}</h3>
        <p>${r.isEnquiry?'Thanks '+first(state.name)+' — we&rsquo;ll be in touch very soon.'
                        :'See you on '+r.prettyDate+' at '+r.time+' '+r.tz+'.'}</p>
        <div class="email-preview">
          <div class="eh">📩 A confirmation is on its way to ${esc(state.email)} &nbsp;·&nbsp; ref ${esc(r.ref||'')}</div>
          <div class="eb">
            <b>Hi ${esc(first(state.name)||'there')},</b><br>
            ${r.isEnquiry
              ? `Thanks for your interest in the <b>${esc(services()[state.service]?.name||'')}</b>. We&rsquo;ll be in touch shortly to get you started.`
              : `Your <b>${esc(services()[state.service]?.name||'')}</b> is confirmed for <b>${r.prettyDate}</b> at <b>${r.time} ${r.tz}</b>.`}
            ${r.isEnquiry?'':'<br><br>⏰ You&rsquo;ll get an automatic reminder before your session. Reply to reschedule anytime.'}
            <br><br>— PongLiTation
          </div>
        </div>
      </div>`;
    foot.innerHTML = `<button class="btn btn-primary" style="flex:1;justify-content:center" onclick="closeBooking()">Done</button>`;
  }
}

/* ---------- calendar ---------- */
function calendarHTML(){
  const {y,m}=state.calMonth;
  const first=new Date(Date.UTC(y,m,1));
  const startDow=first.getUTCDay();
  const days=new Date(Date.UTC(y,m+1,0)).getUTCDate();
  const monthName=first.toLocaleString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});
  const today=todayCT();
  let cells='';
  for(let i=0;i<startDow;i++) cells+=`<div class="day muted"></div>`;
  for(let d=1;d<=days;d++){
    const key=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dow=new Date(Date.UTC(y,m,d)).getUTCDay();
    const closed = scheduleFor(dow).length===0 || blocked().includes(key);
    const past = key < today;
    if(closed||past){ cells+=`<div class="day dis">${d}</div>`; }
    else{
      const sel = state.date===key?'sel':'';
      const label = new Date(Date.UTC(y,m,d)).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'});
      cells+=`<div class="day avail ${sel}" onclick="pickDate('${key}','${label}')">${d}</div>`;
    }
  }
  const dows=['Su','Mo','Tu','We','Th','Fr','Sa'].map(x=>`<div class="dow">${x}</div>`).join('');
  const minKey=todayCT().slice(0,7);
  const thisKey=`${y}-${String(m+1).padStart(2,'0')}`;
  const canPrev = thisKey>minKey;
  return `
    <div class="cal-head">
      <button onclick="shiftMonth(-1)" ${canPrev?'':'disabled style=opacity:.3'}>‹</button>
      <b>${monthName}</b>
      <button onclick="shiftMonth(1)">›</button>
    </div>
    <div class="cal">${dows}${cells}</div>`;
}
function shiftMonth(dir){
  let {y,m}=state.calMonth; m+=dir;
  if(m<0){m=11;y--;} if(m>11){m=0;y++;}
  const minKey=todayCT().slice(0,7);
  if(`${y}-${String(m+1).padStart(2,'0')}`<minKey) return;
  state.calMonth={y,m}; render();
}
async function pickDate(key,label){
  state.date=key; state.dateLabel=label; state.time=null;
  if(isEnquiry()){ render(); return; }
  state.loadingSlots=true; state.slots=[]; render();
  try{
    const r=await fetch('/api/availability?date='+encodeURIComponent(key));
    const data=await r.json();
    state.slots=data.slots||[];
  }catch(e){ state.slots=[]; }
  state.loadingSlots=false; render();
}
function slotArea(){
  if(!state.date) return '<p style="color:var(--muted);font-size:.9rem">Select a date to see available times.</p>';
  if(state.loadingSlots) return '<p style="color:var(--muted);font-size:.9rem">Checking availability…</p>';
  if(!state.slots.length) return '<p style="color:var(--muted);font-size:.9rem">No times available on this day.</p>';
  return `<div class="step-sub" style="margin-bottom:8px">Available times · ${state.dateLabel} <span style="opacity:.7">(${tz()})</span></div>
   <div class="slots">${state.slots.map(s=>{
     const t=s.time, taken=s.taken;
     return `<div class="slot ${taken?'taken':''} ${state.time===t?'sel':''}" ${taken?'':`onclick="pickTime('${t}')"`}>${t}</div>`;
   }).join('')}</div>`;
}
function pickTime(t){ state.time=t; render(); }

/* ---------- flow ---------- */
function pickService(k){ state.service=k; render(); }
function canNext2(){ return isEnquiry()? !!state.date : (state.date && state.time); }
function next(){ if(state.step<3){ state.step++; render(); } }
function prev(){ if(state.step>1){ state.error=null; state.step--; render(); } }

async function submitBooking(){
  state.error=null;
  if(!state.name || !state.email){ state.error='Please add your name and email.'; render(); return; }
  const btn=document.getElementById('confirmBtn'); if(btn){ btn.textContent='Booking…'; btn.disabled=true; }
  try{
    const r=await fetch('/api/book',{ method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ service:state.service, date:state.date, time:state.time,
        name:state.name, email:state.email, phone:state.phone, notes:state.notes }) });
    const data=await r.json();
    if(!r.ok){ state.error=data.error||'Something went wrong.'; render();
      if(r.status===409){ /* slot taken: bounce back to time picker */ state.step=2; state.time=null; if(state.date) pickDate(state.date,state.dateLabel); }
      return; }
    state.result=data; state.step=4; render();
  }catch(e){ state.error='Network error — please try again.'; render(); }
}

/* ---------- helpers ---------- */
function first(n){ return (n||'').trim().split(' ')[0]; }
function esc(s){ return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
