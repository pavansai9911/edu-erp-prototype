/**
 * ============================================================================
 *  NextGen EduERP — Prototype Utilities
 *  shared/utils.js  |  Icons · Toasts · Modals · Sheets · Formatters
 * ============================================================================
 */

/* ---- ICON SET (inline SVG paths; stroke 1.75 per design system) ---- */
const ICONS = {
  logo:'<path d="M12 3 2 8l10 5 10-5-10-5zM2 8v8l10 5 10-5V8"/>',
  home:'<path d="M3 9.5 12 3l9 6.5V21H3z"/>',
  building:'<path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h6"/>',
  chart:'<path d="M3 3v18h18M8 14v4M13 10v8M18 6v12"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/>',
  chevronR:'<path d="m9 6 6 6-6 6"/>',
  chevronL:'<path d="m15 6-6 6 6 6"/>',
  chevronD:'<path d="m6 9 6 6 6-6"/>',
  arrowUp:'<path d="M12 19V5M5 12l7-7 7 7"/>',
  arrowDown:'<path d="M12 5v14M19 12l-7 7-7-7"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  checkCircle:'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-3.5 3-5 7-5s7 1.5 7 5M16 6a3.5 3.5 0 0 1 0 7M22 21c0-2.6-1.5-4-4-4.7"/>',
  mail:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  phone:'<path d="M4 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 12l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 2 6a2 2 0 0 1 2-2z"/>',
  mapPin:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  palette:'<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 0 0 0 20c1 0 1.5-.8 1.5-1.5 0-1-.7-1.3-.7-2 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-5-4-10-9-10z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
  moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
  building2:'<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18M6 12H4a2 2 0 0 0-2 2v8h4M18 9h2a2 2 0 0 1 2 2v11h-4M10 6h4M10 10h4M10 14h4"/>',
  wallet:'<path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 10h18M16 14h2"/>',
  trend:'<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  alert:'<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
  ban:'<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  power:'<path d="M12 2v10M18.4 6.6a9 9 0 1 1-12.8 0"/>',
  refresh:'<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>',
  edit:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  filter:'<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
  calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  shield:'<path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5z"/>',
  sparkle:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
};
function icon(name,cls){ return `<svg class="${cls||''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]||''}</svg>`; }

/* ---- avatar color (deterministic from string) ---- */
const AV_COLORS=['#7C5CFF','#22B8A2','#4F7CFF','#F5A524','#F06595','#059669','#A97CFF','#E8863B'];
function avatarColor(str){ let h=0; str=str||'?'; for(let i=0;i<str.length;i++)h=str.charCodeAt(i)+((h<<5)-h); return AV_COLORS[Math.abs(h)%AV_COLORS.length]; }
function initials(name){ return (name||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase(); }

/* ---- formatters ---- */
const fmt={
  money(n){ return '₹'+Number(n||0).toLocaleString('en-IN'); },
  moneyShort(n){ n=Number(n||0); if(n>=1e7)return '₹'+(n/1e7).toFixed(2)+' Cr'; if(n>=1e5)return '₹'+(n/1e5).toFixed(2)+' L'; if(n>=1e3)return '₹'+(n/1e3).toFixed(1)+'K'; return '₹'+n; },
  num(n){ return Number(n||0).toLocaleString('en-IN'); },
  date(iso){ if(!iso)return '—'; const d=new Date(iso); return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); },
  ago(iso){ if(!iso)return ''; const s=Math.floor((Date.now()-new Date(iso))/1000); if(s<60)return 'just now'; if(s<3600)return Math.floor(s/60)+'m ago'; if(s<86400)return Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago'; },
};

/* ---- toast ---- */
const UI={
  toast(msg,type){
    let wrap=document.querySelector('.toast-wrap');
    if(!wrap){ wrap=document.createElement('div'); wrap.className='toast-wrap'; document.querySelector('.viewport').appendChild(wrap); }
    const t=document.createElement('div'); t.className='toast '+(type||'success');
    t.innerHTML=icon(type==='error'?'alert':'checkCircle')+`<span>${msg}</span>`;
    wrap.appendChild(t); requestAnimationFrame(()=>t.classList.add('show'));
    setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),250); },2400);
  },

  /* confirm modal → returns a Promise<boolean> */
  confirm({title,message,confirmText,danger}){
    return new Promise(resolve=>{
      const el=document.createElement('div'); el.className='modal';
      el.innerHTML=`<div class="modal-card">
        <div class="modal-icon ${danger?'danger':'success'}">${icon(danger?'alert':'checkCircle')}</div>
        <h3 class="t-h2 text-center mb-2">${title}</h3>
        <p class="text-secondary text-center mb-6">${message||''}</p>
        <div class="flex gap-3">
          <button class="btn btn-secondary btn-full" data-no>Cancel</button>
          <button class="btn ${danger?'btn-danger':'btn-primary'} btn-full" data-yes>${confirmText||'Confirm'}</button>
        </div></div>`;
      document.querySelector('.viewport').appendChild(el);
      requestAnimationFrame(()=>el.classList.add('open'));
      const close=v=>{ el.classList.remove('open'); setTimeout(()=>el.remove(),200); resolve(v); };
      el.querySelector('[data-yes]').onclick=()=>close(true);
      el.querySelector('[data-no]').onclick=()=>close(false);
    });
  },

  /* generic bottom sheet. content = HTML string. returns the element. */
  sheet(html){
    const scrim=document.createElement('div'); scrim.className='scrim';
    const sheet=document.createElement('div'); sheet.className='sheet';
    sheet.innerHTML=`<div class="sheet-handle"></div>`+html;
    const vp=document.querySelector('.viewport'); vp.appendChild(scrim); vp.appendChild(sheet);
    requestAnimationFrame(()=>{ scrim.classList.add('open'); sheet.classList.add('open'); });
    const close=()=>{ scrim.classList.remove('open'); sheet.classList.remove('open'); setTimeout(()=>{scrim.remove();sheet.remove();},250); };
    scrim.onclick=close;
    return {el:sheet,close};
  },
};
