/**
 * ============================================================================
 *  NextGen EduERP — Shared Auth Screens
 *  shared/auth-screens.js  |  Login · Forgot password · Verify OTP · Reset
 *
 *  Built ONCE, used by all 3 apps (ERP Admin, Founder, Staff) — each app calls
 *  AuthScreens.Login(container, opts) with its own branding + demo credentials
 *  + an onSuccess callback. The 4 screens transition between each other
 *  internally; the host app only ever gets called back on final success
 *  (login) or when the person taps "Back to sign in".
 *
 *  Depends on: shared/utils.js (icon, UI.toast), shared/auth.js (Auth).
 *  Renders into whatever element is passed — no tab bar, no app shell.
 * ============================================================================
 */
const AuthScreens = {
  _ctx:null, // the active flow's config + carried state (identifier, resetTicket)

  /* ========================================================================
     LOGIN
     opts: { app, title, subtitle, badge, badgeIcon, orgCodeRequired,
             demoIdentifier, demoPassword, demoOrgCode, onSuccess(user) }
     orgCodeRequired: true for founder/staff (mandatory), false for admin
     (field still shown, just optional — see EDU-002).
     ======================================================================== */
  Login(container,opts){
    this._ctx={...opts,container};
    container.innerHTML=`
    <div class="login fade-in">
      <div class="login-brand">${icon('logo')}</div>
      <span class="login-badge">${icon(opts.badgeIcon||'shield')} ${opts.badge||''}</span>
      <h1 class="t-display mb-2">${opts.title}</h1>
      <p class="text-secondary mb-6">${opts.subtitle||'Sign in to continue.'}</p>
      <div class="field">
        <label class="field-label">Email</label>
        <input class="input" id="auth-id" type="email" value="${opts.demoIdentifier||''}" autocomplete="username">
      </div>
      <div class="field">
        <label class="field-label">Password</label>
        <div class="input-affix">
          <input class="input" id="auth-pw" type="password" value="${opts.demoPassword||''}" autocomplete="current-password">
          <button class="input-group-btn" onclick="AuthScreens._togglePass(this)" aria-label="Show password">${icon('eye')}</button>
        </div>
      </div>
      <div class="field">
        <label class="field-label">Organization code ${opts.orgCodeRequired?'<span class="req">*</span>':'<span class="t-caption" style="font-weight:400">(optional)</span>'}</label>
        <input class="input t-code" id="auth-org" type="text" value="${opts.demoOrgCode||''}"
          placeholder="${opts.orgCodeRequired?'e.g. SPS-CHN':'Only needed if you’re prompted for it'}"
          ${opts.orgCodeRequired?'style="text-transform:uppercase" oninput="this.value=this.value.toUpperCase()"':''} autocomplete="off">
      </div>
      <div class="flex between items-center mb-4"><span></span>
        <button class="sec-link" style="background:none;border:none;cursor:pointer" onclick="AuthScreens._goForgot()">Forgot password?</button>
      </div>
      <div id="auth-err"></div>
      <button class="btn btn-primary btn-full btn-lg" id="auth-btn" onclick="AuthScreens._doLogin()">Sign in</button>
      <p class="t-caption text-center mt-6">Prototype · seeded demo credentials pre-filled</p>
    </div>`;
  },
  _togglePass(btn){ const i=btn.previousElementSibling; i.type=i.type==='password'?'text':'password'; },
  _doLogin(){
    const c=this._ctx;
    const identifier=document.getElementById('auth-id').value.trim();
    const password=document.getElementById('auth-pw').value;
    const orgCode=document.getElementById('auth-org').value.trim();
    const err=document.getElementById('auth-err');
    err.innerHTML='';
    if(!identifier||!password){ err.innerHTML=`<div class="field-error mb-2">${icon('alert')} Enter your email and password.</div>`; return; }
    if(c.orgCodeRequired && !orgCode){ err.innerHTML=`<div class="field-error mb-2">${icon('alert')} Enter your organization code.</div>`; return; }
    const btn=document.getElementById('auth-btn');
    btn.textContent='Signing in…'; btn.disabled=true;
    setTimeout(()=>{
      const r=Auth.login(identifier,password,c.app,orgCode);
      if(r.success){ btn.textContent='Sign in'; btn.disabled=false; c.onSuccess(r.user); }
      else{
        err.innerHTML=`<div class="field-error mb-2">${icon('alert')} ${r.message}</div>`;
        btn.textContent='Sign in'; btn.disabled=false;
      }
    },500);
  },
  _goForgot(){
    const c=this._ctx;
    const prefill=document.getElementById('auth-id')?document.getElementById('auth-id').value.trim():'';
    this.ForgotPassword(c.container,{...c,prefillIdentifier:prefill});
  },

  /* ========================================================================
     FORGOT PASSWORD — step 1: enter identifier, "send" a demo OTP
     ======================================================================== */
  ForgotPassword(container,opts){
    this._ctx={...opts,container};
    container.innerHTML=`
    <div class="login fade-in">
      <button class="appbar-btn mb-4" style="align-self:flex-start" onclick="AuthScreens._backToLogin()" aria-label="Back">${icon('chevronL')}</button>
      <div class="login-brand">${icon('key')}</div>
      <h1 class="t-display mb-2">Reset your password</h1>
      <p class="text-secondary mb-6">Enter the email on your account and we'll send you a verification code.</p>
      <div class="field">
        <label class="field-label">Email</label>
        <input class="input" id="auth-id" type="email" value="${opts.prefillIdentifier||opts.demoIdentifier||''}" autocomplete="username">
      </div>
      <div id="auth-err"></div>
      <button class="btn btn-primary btn-full btn-lg" id="auth-btn" onclick="AuthScreens._doForgot()">Send code</button>
      <button class="btn btn-secondary btn-full mt-3" onclick="AuthScreens._backToLogin()">Back to sign in</button>
    </div>`;
  },
  _doForgot(){
    const c=this._ctx;
    const identifier=document.getElementById('auth-id').value.trim();
    const err=document.getElementById('auth-err');
    if(!identifier){ err.innerHTML=`<div class="field-error mb-2">${icon('alert')} Enter your email.</div>`; return; }
    const btn=document.getElementById('auth-btn');
    btn.textContent='Sending…'; btn.disabled=true;
    setTimeout(()=>{
      Auth.forgotPassword(identifier,c.app);
      this.VerifyOtp(c.container,{...c,identifier});
    },500);
  },

  /* ========================================================================
     VERIFY OTP — step 2: enter the code, get a reset_ticket on success
     ======================================================================== */
  VerifyOtp(container,opts){
    this._ctx={...opts,container};
    container.innerHTML=`
    <div class="login fade-in">
      <button class="appbar-btn mb-4" style="align-self:flex-start" onclick="AuthScreens._backToLogin()" aria-label="Back">${icon('chevronL')}</button>
      <div class="login-brand">${icon('shield')}</div>
      <h1 class="t-display mb-2">Enter the code</h1>
      <p class="text-secondary mb-2">We sent a 6-digit code to <b>${opts.identifier}</b>.</p>
      <div class="dashed-card mb-4">${icon('sparkle')} <span class="t-caption">Prototype mode — no real email is sent. Use code <b>${Auth.DEMO_OTP}</b>.</span></div>
      <div class="field">
        <label class="field-label">Verification code</label>
        <input class="input" id="auth-otp" type="text" inputmode="numeric" maxlength="6" style="letter-spacing:6px;text-align:center;font-size:20px" placeholder="••••••">
      </div>
      <div id="auth-err"></div>
      <button class="btn btn-primary btn-full btn-lg" id="auth-btn" onclick="AuthScreens._doVerify()">Verify code</button>
      <button class="sec-link mt-4" style="background:none;border:none;cursor:pointer;text-align:center" onclick="AuthScreens._doForgot()">Resend code</button>
    </div>`;
  },
  _doVerify(){
    const c=this._ctx;
    const otp=document.getElementById('auth-otp').value.trim();
    const err=document.getElementById('auth-err');
    if(!otp){ err.innerHTML=`<div class="field-error mb-2">${icon('alert')} Enter the code.</div>`; return; }
    const btn=document.getElementById('auth-btn');
    btn.textContent='Verifying…'; btn.disabled=true;
    setTimeout(()=>{
      const r=Auth.verifyOtp(c.identifier,otp,c.app);
      if(r.success){ this.ResetPassword(c.container,{...c,resetTicket:r.resetTicket}); }
      else{ err.innerHTML=`<div class="field-error mb-2">${icon('alert')} ${r.message}</div>`; btn.textContent='Verify code'; btn.disabled=false; }
    },500);
  },

  /* ========================================================================
     RESET PASSWORD — step 3: set a new password using the reset_ticket
     ======================================================================== */
  ResetPassword(container,opts){
    this._ctx={...opts,container};
    container.innerHTML=`
    <div class="login fade-in">
      <div class="login-brand">${icon('lock')}</div>
      <h1 class="t-display mb-2">Set a new password</h1>
      <p class="text-secondary mb-6">Choose a new password for your account.</p>
      <div class="field">
        <label class="field-label">New password</label>
        <input class="input" id="auth-pw1" type="password" autocomplete="new-password">
      </div>
      <div class="field">
        <label class="field-label">Confirm new password</label>
        <input class="input" id="auth-pw2" type="password" autocomplete="new-password">
      </div>
      <div id="auth-err"></div>
      <button class="btn btn-primary btn-full btn-lg" id="auth-btn" onclick="AuthScreens._doReset()">Reset password</button>
    </div>`;
  },
  _doReset(){
    const c=this._ctx;
    const pw1=document.getElementById('auth-pw1').value;
    const pw2=document.getElementById('auth-pw2').value;
    const err=document.getElementById('auth-err');
    if(!pw1||pw1.length<6){ err.innerHTML=`<div class="field-error mb-2">${icon('alert')} Password must be at least 6 characters.</div>`; return; }
    if(pw1!==pw2){ err.innerHTML=`<div class="field-error mb-2">${icon('alert')} Passwords don't match.</div>`; return; }
    const btn=document.getElementById('auth-btn');
    btn.textContent='Saving…'; btn.disabled=true;
    setTimeout(()=>{
      const r=Auth.resetPassword(c.resetTicket,pw1,c.app,c.identifier);
      if(r.success){
        UI.toast('Password reset. Please sign in with your new password.');
        this.Login(c.container,{...c,demoIdentifier:c.identifier,demoPassword:''});
      }else{
        err.innerHTML=`<div class="field-error mb-2">${icon('alert')} ${r.message}</div>`;
        btn.textContent='Reset password'; btn.disabled=false;
      }
    },500);
  },

  _backToLogin(){ const c=this._ctx; this.Login(c.container,c); },
};
