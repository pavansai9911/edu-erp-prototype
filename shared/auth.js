/**
 * ============================================================================
 *  NextGen EduERP — Prototype Auth
 *  shared/auth.js  |  Login · Session · Permissions · Forgot-password/OTP/Reset
 *  Admin is seeded. Founders are created by onboarding (in the ERP Admin app),
 *  then THEY can log in — mirrors the real product & the badminton reference.
 *
 *  Shapes mirror the frozen backend exactly (openapi_july_11_a2.json):
 *   LoginRequest{identifier,password,org_code?}  -> TokenPair (simulated)
 *   ForgotPasswordRequest{identifier,org_code?}  -> (no data; always succeeds)
 *   VerifyOtpRequest{identifier,otp,org_code?}   -> VerifyOtpResponse{reset_ticket}
 *   ResetPasswordRequest{reset_ticket,new_password} -> (no data)
 *  No real backend exists in this prototype, so OTP is a fixed demo code and
 *  rate-limiting/lockout is simulated in sessionStorage — the UI/flow is real,
 *  the transport is not.
 * ============================================================================
 */
const Auth = {
  SESSION_KEY:'eduerp_session',
  ATTEMPTS_KEY:'eduerp_login_attempts',
  RESET_KEY:'eduerp_reset_flow',
  MAX_ATTEMPTS:5,
  LOCKOUT_MS:60000,     // 60s demo lockout after 5 failed attempts
  DEMO_OTP:'123456',    // fixed demo code — no real SMS/email backend exists
  OTP_TTL_MS:10*60000,  // 10 minutes

  /**
   * Login. `app` scopes which credential source is checked, mirroring the
   * real multi-tenant login (LoginRequest.identifier + optional org_code):
   *   'admin'   -> platform admins only (DB.COLS.ADMINS) \u2014 org_code optional,
   *                never validated (platform admins aren't tied to an org)
   *   'founder' -> any founder login, seeded or onboarded (FounderDB.founders())
   *                \u2014 org_code mandatory, must match the founder's own org
   *   'staff'   -> any staff member, seeded or created (StaffDB._allStaffUsers())
   *                \u2014 org_code mandatory, must match the staff member's own org
   */
  login(identifier,password,app,orgCode){
    const em=(identifier||'').trim().toLowerCase();
    const orgIn=(orgCode||'').trim().toUpperCase();
    const lockKey=app+':'+em;
    const lock=this._checkLockout(lockKey);
    if(lock.locked) return {success:false,code:429,message:`Too many attempts. Try again in ${lock.secondsLeft}s.`};

    let account=null, sessionData=null, orgMismatch=false;
    if(app==='admin'){
      account=DB.getAll(DB.COLS.ADMINS).find(u=>u.email.toLowerCase()===em && u.status==='active');
      if(account && account.password===password) sessionData={userId:account.id,name:account.name,email:account.email,role:account.role,app:'admin',avatar:account.avatar};
    }else if(app==='founder'){
      const fc=typeof FounderDB!=='undefined'?FounderDB.founderByEmail(em):null;
      if(fc){
        account=fc;
        if(fc.password===password){
          if((fc.orgCode||'').toUpperCase()!==orgIn) orgMismatch=true;
          else sessionData={userId:fc.id||'FDR-DEMO',name:fc.name,email:fc.email,role:'Founder',app:'founder',orgCode:fc.orgCode,avatar:fc.avatar};
        }
      }
    }else if(app==='staff'){
      // must search the GLOBAL directory (not the org-filtered staffUsers()) \u2014
      // at login time we don't yet know which org this person belongs to.
      const su=typeof StaffDB!=='undefined'?StaffDB._allStaffUsers().find(u=>u.email.toLowerCase()===em):null;
      if(su){
        account=su;
        if(su.password===password){
          if((su.orgCode||'').toUpperCase()!==orgIn) orgMismatch=true;
          else sessionData={userId:su.id,staffId:su.id,name:su.name,email:su.email,role:'Staff',app:'staff',avatar:su.avatar};
        }
      }
    }

    if(sessionData){ this._clearAttempts(lockKey); return this._start(sessionData); }
    this._recordAttempt(lockKey);
    if(!account) return {success:false,code:404,message:'We couldn\u2019t find an account with that email.'};
    if(orgMismatch) return {success:false,code:403,message:'Incorrect organization code for this account.'};
    return {success:false,code:401,message:'Incorrect password. Please try again.'};
  },

  /* ---- rate-limit / lockout (simulates the real backend's 429) ---- */
  _attempts(){ try{ return JSON.parse(sessionStorage.getItem(this.ATTEMPTS_KEY))||{}; }catch{ return {}; } },
  _recordAttempt(key){ const a=this._attempts(); a[key]=a[key]||{count:0,lockedAt:null}; a[key].count++; if(a[key].count>=this.MAX_ATTEMPTS) a[key].lockedAt=Date.now(); sessionStorage.setItem(this.ATTEMPTS_KEY,JSON.stringify(a)); },
  _clearAttempts(key){ const a=this._attempts(); delete a[key]; sessionStorage.setItem(this.ATTEMPTS_KEY,JSON.stringify(a)); },
  _checkLockout(key){
    const a=this._attempts()[key];
    if(!a || !a.lockedAt) return {locked:false};
    const elapsed=Date.now()-a.lockedAt;
    if(elapsed>=this.LOCKOUT_MS){ this._clearAttempts(key); return {locked:false}; }
    return {locked:true,secondsLeft:Math.ceil((this.LOCKOUT_MS-elapsed)/1000)};
  },

  /* ---- forgot-password -> verify-otp -> reset-password (3-step, matches backend) ---- */
  forgotPassword(identifier,app){
    // Never reveal whether an account exists (security best practice) — always
    // "succeeds"; a demo OTP is issued regardless so the flow is fully testable.
    const em=(identifier||'').trim().toLowerCase();
    const flow=this._resetFlows(); const key=app+':'+em;
    flow[key]={otp:this.DEMO_OTP,expiresAt:Date.now()+this.OTP_TTL_MS,verified:false};
    sessionStorage.setItem(this.RESET_KEY,JSON.stringify(flow));
    return {success:true,message:'If an account exists for that email, a code has been sent.'};
  },
  verifyOtp(identifier,otp,app){
    const em=(identifier||'').trim().toLowerCase();
    const flow=this._resetFlows(); const key=app+':'+em; const rec=flow[key];
    if(!rec || Date.now()>rec.expiresAt) return {success:false,message:'That code has expired. Request a new one.'};
    if(otp!==rec.otp) return {success:false,message:'Incorrect code. Please try again.'};
    const ticket='RT-'+Math.random().toString(36).slice(2,10);
    rec.verified=true; rec.resetTicket=ticket; flow[key]=rec;
    sessionStorage.setItem(this.RESET_KEY,JSON.stringify(flow));
    return {success:true,resetTicket:ticket};
  },
  resetPassword(resetTicket,newPassword,app,identifier){
    const em=(identifier||'').trim().toLowerCase();
    const flow=this._resetFlows(); const key=app+':'+em; const rec=flow[key];
    if(!rec || !rec.verified || rec.resetTicket!==resetTicket) return {success:false,message:'This reset link is invalid or has expired. Start again.'};
    let updated=false;
    if(app==='admin'){ const a=DB.getAll(DB.COLS.ADMINS).find(u=>u.email.toLowerCase()===em); if(a){ DB.update(DB.COLS.ADMINS,a.id,{password:newPassword}); updated=true; } }
    else if(app==='founder' && typeof FounderDB!=='undefined'){ if(FounderDB.founderByEmail(em)){ FounderDB.setFounderPassword(em,newPassword); updated=true; } }
    else if(app==='staff' && typeof StaffDB!=='undefined'){ const su=StaffDB._allStaffUsers().find(u=>u.email.toLowerCase()===em); if(su){ StaffDB.updateStaff(su.id,{password:newPassword,passwordSet:true}); updated=true; } }
    delete flow[key]; sessionStorage.setItem(this.RESET_KEY,JSON.stringify(flow));
    return updated?{success:true}:{success:false,message:'We couldn\u2019t find that account.'};
  },
  _resetFlows(){ try{ return JSON.parse(sessionStorage.getItem(this.RESET_KEY))||{}; }catch{ return {}; } },

  _start(data){
    const session={...data,loginTime:new Date().toISOString()};
    sessionStorage.setItem(this.SESSION_KEY,JSON.stringify(session));
    // FounderDB/StaffDB both self-seed once at page load, before anyone has
    // logged in — so a login for a DIFFERENT org than whichever was active at
    // load time needs to re-run init() now that the session (and therefore
    // the active org) has just changed, or that org's tenant data would never
    // get seeded. Founder logins carry orgCode directly; staff logins resolve
    // their org from their own staff record (see StaffDB._activeOrgCode).
    if(data.app==='founder' && typeof FounderDB!=='undefined') FounderDB.init();
    if((data.app==='founder'||data.app==='staff') && typeof StaffDB!=='undefined') StaffDB.init();
    return {success:true,user:session};
  },

  logout(){ sessionStorage.removeItem(this.SESSION_KEY); },
  getSession(){ try{ const d=sessionStorage.getItem(this.SESSION_KEY); return d?JSON.parse(d):null; }catch{ return null; } },
  isLoggedIn(){ return !!this.getSession(); },
  isAdmin(){ const s=this.getSession(); return s&&s.app==='admin'; },
};
