/**
 * ============================================================================
 *  NextGen EduERP — Prototype Data Engine
 *  shared/data.js  |  sessionStorage (survives refresh & new tabs in the same
 *  session; clears when ALL tabs close — exactly the requested behavior).
 *  Single source of truth for all prototype data.
 *  Starts EMPTY: only the platform admin is seeded. Onboard schools to populate.
 * ============================================================================
 */
const DB = {
  VERSION:'1.0.0',
  PREFIX:'eduerp_',

  COLS:{
    ADMINS:'admins',            // platform operators (seeded)
    ORGS:'organizations',       // schools onboarded via the wizard
    FOUNDERS:'founders',        // founder logins created at onboarding
    PLANS:'plan_changes',       // subscription change log
    SETTINGS:'settings',
  },

  /* ---- bootstrap (idempotent) ---- */
  init(){
    if(!this._get('initialized')){
      this._seed();
      this._set('initialized',true);
      this._set('version',this.VERSION);
    }
  },

  _seed(){
    // Only the platform admin exists at first run.
    this._set(this.COLS.ADMINS,[{
      id:'ADM-0001', name:'Suresh Kumar', email:'admin@nextgeneduerp.com',
      password:'demo1234', role:'Platform Admin', avatar:'SK', status:'active',
      createdAt:new Date().toISOString()
    }]);
    // Everything else starts empty — the real first-run of a platform operator.
    this._set(this.COLS.ORGS,[]);
    this._set(this.COLS.FOUNDERS,[]);
    this._set(this.COLS.PLANS,[]);
    this._set(this.COLS.SETTINGS,{
      platformName:'NextGen EduERP', theme:'violet', mode:'system'
    });
  },

  /* ---- storage internals (sessionStorage) ---- */
  _get(k){ try{ const d=sessionStorage.getItem(this.PREFIX+k); return d?JSON.parse(d):null; }catch(e){ return null; } },
  _set(k,v){ try{ sessionStorage.setItem(this.PREFIX+k,JSON.stringify(v)); return true; }catch(e){ console.error('DB write',e); return false; } },

  _id(col){
    const map={organizations:'ORG',founders:'FDR',plan_changes:'PLN',admins:'ADM'};
    const pfx=map[col]||'ITM';
    const ts=Date.now().toString(36).toUpperCase().slice(-4);
    const rnd=Math.random().toString(36).substring(2,5).toUpperCase();
    return `${pfx}-${ts}${rnd}`;
  },

  /* ---- generic CRUD ---- */
  getAll(col){ return this._get(col)||[]; },
  getById(col,id){ return this.getAll(col).find(i=>i.id===id)||null; },
  getBy(col,f,v){ return this.getAll(col).filter(i=>i[f]===v); },

  insert(col,data){
    const items=this.getAll(col);
    const item={...data, id:data.id||this._id(col), createdAt:new Date().toISOString(), updatedAt:new Date().toISOString()};
    items.push(item); this._set(col,items); return item;
  },
  update(col,id,patch){
    const items=this.getAll(col); const idx=items.findIndex(i=>i.id===id);
    if(idx===-1) return null;
    items[idx]={...items[idx],...patch,updatedAt:new Date().toISOString()};
    this._set(col,items); return items[idx];
  },
  remove(col,id){ this._set(col,this.getAll(col).filter(i=>i.id!==id)); return true; },

  /* ---- settings ---- */
  getSettings(){ return this._get(this.COLS.SETTINGS)||{}; },
  updateSettings(u){ this._set(this.COLS.SETTINGS,{...this.getSettings(),...u}); },

  /* ---- domain helpers ---- */
  orgs(){ return this.getAll(this.COLS.ORGS); },
  activeOrgs(){ return this.orgs().filter(o=>o.status==='active'); },

  /* onboard a school = create org + its founder login, atomically */
  onboardSchool({schoolName,orgCode,city,address,founderName,founderEmail,founderPassword,branchName,academicYear,plan}){
    const org=this.insert(this.COLS.ORGS,{
      name:schoolName, code:orgCode, city, address:address||'',
      plan:plan||'Basic', status:'active', students:0,
      branch:branchName, academicYear,
      onboardedAt:new Date().toISOString().split('T')[0],
    });
    const founder=this.insert(this.COLS.FOUNDERS,{
      orgId:org.id, orgCode, name:founderName, email:founderEmail,
      password:founderPassword, role:'Founder', status:'active', avatar:this._initials(founderName),
    });
    return {org,founder};
  },

  changePlan(orgId,newPlan,reason){
    const org=this.getById(this.COLS.ORGS,orgId); if(!org) return null;
    const prev=org.plan;
    this.update(this.COLS.ORGS,orgId,{plan:newPlan});
    this.insert(this.COLS.PLANS,{orgId,from:prev,to:newPlan,reason:reason||'',by:'Platform Admin'});
    return this.getById(this.COLS.ORGS,orgId);
  },

  planCounts(){
    const o=this.orgs();
    return {
      total:o.length,
      active:o.filter(x=>x.status==='active').length,
      basic:o.filter(x=>x.plan==='Basic').length,
      pro:o.filter(x=>x.plan==='Pro').length,
      enterprise:o.filter(x=>x.plan==='Enterprise').length,
      proPlus:o.filter(x=>x.plan!=='Basic').length,
      students:o.reduce((s,x)=>s+(Number(x.students)||0),0),
    };
  },

  /* onboarding trend: counts by month for last 6 months (real, from data) */
  onboardingTrend(){
    const months=[]; const now=new Date();
    for(let i=5;i>=0;i--){ const d=new Date(now.getFullYear(),now.getMonth()-i,1); months.push({key:`${d.getFullYear()}-${d.getMonth()}`,label:d.toLocaleString('en',{month:'short'}),count:0}); }
    this.orgs().forEach(o=>{
      if(!o.onboardedAt) return; const d=new Date(o.onboardedAt); const k=`${d.getFullYear()}-${d.getMonth()}`;
      const m=months.find(x=>x.key===k); if(m) m.count++;
    });
    return months;
  },

  _initials(name){ return (name||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase(); },

  /* ---- reset (prototype control) ---- */
  reset(){
    Object.keys(sessionStorage).filter(k=>k.startsWith(this.PREFIX)).forEach(k=>sessionStorage.removeItem(k));
    this.init();
  }
};
DB.init();
