/**
 * ============================================================================
 *  NextGen EduERP — Prototype Auth
 *  shared/auth.js  |  Login · Session · Permissions
 *  Admin is seeded. Founders are created by onboarding (in the ERP Admin app),
 *  then THEY can log in — mirrors the real product & the badminton reference.
 * ============================================================================
 */
const Auth = {
  SESSION_KEY:'eduerp_session',

  /**
   * Login. `app` scopes which credential table is valid:
   *   'admin'   → platform admins only (ERP Admin app)
   *   'founder' → founder logins created at onboarding (Founder app, later)
   */
  login(email,password,app){
    const em=(email||'').trim().toLowerCase();

    if(app==='admin' || !app){
      const a=DB.getAll(DB.COLS.ADMINS).find(u=>u.email.toLowerCase()===em && u.password===password && u.status==='active');
      if(a) return this._start({userId:a.id,name:a.name,email:a.email,role:a.role,app:'admin',avatar:a.avatar});
      if(app==='admin') return {success:false,message:'Invalid email or password.'};
    }
    if(app==='founder' || !app){
      const f=DB.getAll(DB.COLS.FOUNDERS).find(u=>u.email.toLowerCase()===em && u.password===password && u.status==='active');
      if(f) return this._start({userId:f.id,name:f.name,email:f.email,role:'Founder',app:'founder',orgId:f.orgId,orgCode:f.orgCode,avatar:f.avatar});
      if(app==='founder') return {success:false,message:'Invalid email or password.'};
    }
    return {success:false,message:'Invalid email or password.'};
  },

  _start(data){
    const session={...data,loginTime:new Date().toISOString()};
    sessionStorage.setItem(this.SESSION_KEY,JSON.stringify(session));
    return {success:true,user:session};
  },

  logout(){ sessionStorage.removeItem(this.SESSION_KEY); },
  getSession(){ try{ const d=sessionStorage.getItem(this.SESSION_KEY); return d?JSON.parse(d):null; }catch{ return null; } },
  isLoggedIn(){ return !!this.getSession(); },
  isAdmin(){ const s=this.getSession(); return s&&s.app==='admin'; },
};
