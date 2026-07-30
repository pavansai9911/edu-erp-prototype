/**
 * ============================================================================
 *  NextGen EduERP — Founder Domain Data
 *  shared/founder-data.js  |  Students · Flexible Fee Ledger · Staff · Attendance
 *  Self-contained domain module (disciplined boundaries). Seeds ONE realistic
 *  demo school so the Founder "buy" experience is rich immediately.
 *  Flexible fee model: every charge is a typed LINE ITEM (tuition, books,
 *  uniform, transport…) — not "school-fee-only". This is the money wedge.
 * ============================================================================
 */
const FounderDB = {
  PFX:'eduerp_fdr_',
  COLS:{ STUDENTS:'students', STAFF:'staff', INVOICES:'invoices', PAYMENTS:'payments',
         BRANCHES:'branches', SETTINGS:'fdr_settings', FOUNDER_ID:'founder_identity',
         FEE_HEADS:'fee_heads', FEE_STRUCTURES:'fee_structures', RECEIPTS:'receipts',
         DEPARTMENTS:'departments', ORG_SETTINGS:'org_settings',
         NOTIF_TEMPLATES:'notif_templates', NOTIF_PREFS:'notif_prefs' },

  init(){ if(!this._get('seeded')){ this._seed(); this._set('seeded',true); } },

  _get(k){ try{ const d=sessionStorage.getItem(this.PFX+k); return d?JSON.parse(d):null; }catch{ return null; } },
  _set(k,v){ sessionStorage.setItem(this.PFX+k,JSON.stringify(v)); },

  /* ---- seed one realistic school ---- */
  _seed(){
    const sections=['Nursery-A','LKG-A','UKG-A','1-A','1-B','2-A','3-A','4-A','5-A'];
    /* Seed branches — mirrors BranchOut schema (openapi_july_11_a2.json) */
    const branches=[
      { id:'BR-01', public_id:'BR-01', branch_name:'Main Campus', branch_code:'MAIN',
        address_line1:'#12, Sunrise Avenue', address_line2:null,
        city:'Chennai', state:'Tamil Nadu', postal_code:'600001', country_code:'IN',
        geo_lat:'13.0827', geo_lng:'80.2707', is_active:true,
        // compat
        name:'Main Campus', code:'MAIN' },
      { id:'BR-02', public_id:'BR-02', branch_name:'City Branch', branch_code:'CITY',
        address_line1:'#45, MG Road', address_line2:null,
        city:'Chennai', state:'Tamil Nadu', postal_code:'600034', country_code:'IN',
        geo_lat:'13.0569', geo_lng:'80.2425', is_active:true,
        // compat
        name:'City Branch', code:'CITY' },
    ];

    /* Seed departments — mirrors DepartmentOut schema */
    const departments=[
      { public_id:'DEPT-01', branch_public_id:'BR-01', department_name:'Academics',
        department_code:'ACAD', parent_department_public_id:null, head_user_public_id:null, is_active:true },
      { public_id:'DEPT-02', branch_public_id:'BR-01', department_name:'Administration',
        department_code:'ADMIN', parent_department_public_id:null, head_user_public_id:null, is_active:true },
      { public_id:'DEPT-03', branch_public_id:'BR-01', department_name:'Finance',
        department_code:'FIN', parent_department_public_id:null, head_user_public_id:null, is_active:true },
      { public_id:'DEPT-04', branch_public_id:'BR-01', department_name:'Science Lab',
        department_code:'SCI', parent_department_public_id:'DEPT-01', head_user_public_id:null, is_active:true },
      { public_id:'DEPT-05', branch_public_id:'BR-01', department_name:'Sports',
        department_code:'SPORT', parent_department_public_id:null, head_user_public_id:null, is_active:true },
    ];
    const first=['Aarav','Diya','Vivaan','Ananya','Aditya','Ishaan','Saanvi','Kabir','Aditi','Reyansh','Myra','Arjun','Kiara','Vihaan','Anika','Sai','Navya','Dhruv','Riya','Krish','Pari','Ayaan','Zara','Ved','Tara','Neel','Advika','Ryan','Meera','Om'];
    const last=['Sharma','Reddy','Patel','Kumar','Nair','Iyer','Gupta','Rao','Menon','Das','Bose','Shah','Verma','Pillai','Krishnan'];
    const feeTypes=[
      {type:'Tuition',base:18000},
      {type:'Transport',base:6000,optional:true},
      {type:'Books & Stationery',base:3500},
      {type:'Uniform',base:2200,optional:true},
      {type:'Activity & Sports',base:1500},
    ];
    const students=[]; const invoices=[]; const payments=[];
    const modes=['Cash','UPI','Cheque'];
    for(let i=0;i<64;i++){
      const nm=`${first[i%first.length]} ${last[i%last.length]}`;
      const sec=sections[i%sections.length];
      const sid='STU-'+String(1001+i);
      const branchId = i%3===0 ? 'BR-02' : 'BR-01';   // ~1/3 in City branch
      // per-student fee assignment (reality: same class, different fees) — concessions vary
      const concession = i%9===0 ? 0.5 : i%7===0 ? 0.25 : 0;   // sibling/staff/scholarship
      const hasTransport = i%3!==0; const hasUniform = i%5!==0;
      const items=feeTypes.filter(f=>{
        if(f.type==='Transport') return hasTransport;
        if(f.type==='Uniform') return hasUniform;
        return true;
      }).map(f=>({type:f.type, amount:Math.round(f.base*(f.type==='Tuition'?(1-concession):1))}));
      const total=items.reduce((s,x)=>s+x.amount,0);
      // payment status distribution: paid / partial / unpaid
      const r=i%10; let paid;
      if(r<5) paid=total;                    // 50% fully paid
      else if(r<8) paid=Math.round(total*(0.3+ (i%3)*0.2)); // 30% partial
      else paid=0;                            // 20% unpaid
      students.push({id:sid, name:nm, section:sec, branchId, roll:String(i+1), admissionNo:`ADM-2026-${String(118+i).padStart(4,'0')}`,
        gender:i%2?'Female':'Male', status:'active', concession,
        guardian:{name:(i%2?'Mr. ':'Mrs. ')+last[i%last.length], phone:`+91 9${String(800000000+i*37).slice(0,9)}`, relation:i%2?'Father':'Mother'},
        // guardians[] mirrors GuardianOut schema (openapi_july_11_a2.json)
        guardians:[{
          guardian_public_id:`GRD-${String(9001+i).padStart(4,'0')}`,
          full_name:(i%2?'Mr. ':'Mrs. ')+last[i%last.length],
          phone_number:`+91 9${String(800000000+i*37).slice(0,9)}`,
          email:`parent${i}@example.com`,
          occupation: i%3===0?'Teacher':i%3===1?'Engineer':'Business',
          relationship_type:i%2?'father':'mother',
          is_primary_contact:true
        }],
        // enrollment history — mirrors EnrollmentHistoryOut
        enrollment_history:[{
          academic_session_public_id:`SESS-2026`,
          session_label:'2026-27',
          section_public_id:`SEC-${sec.replace('-','').toLowerCase()}`,
          section_name:sec,
          roll_number:String(i+1),
          enrollment_status:'active'
        }],
        lifecycle_status:'active', blood_group:['A+','B+','O+','AB+','A-','B-'][i%6],
        residency_type:i%4===0?'day_scholar':'day_scholar',
        joinedAt:`2026-0${(i%5)+1}-15`});
      const invId='INV-'+String(2001+i);
      const invPid='INV-PID-'+String(2001+i);
      /* Build installments — mirrors InstallmentDetailOut schema.
         Single instalment for simplicity (90% of Indian schools pay annually).
         Claude Code replaces with real installment logic per GenerateInvoicesRequest. */
      const instPid='INST-'+String(3001+i);
      const installments=[{
        public_id:instPid,
        installment_number:1,
        due_date:'2026-07-01',
        due_amount:String(total),
        fine_amount:'0',
        paid_amount:String(paid),
        status:paid>=total?'paid':paid>0?'partial':'pending',
        payments:[], // populated when payments are recorded
      }];
      const inv={id:invId, public_id:invPid, studentId:sid, studentName:nm, section:sec, branchId, items, total, paid,
        status: paid>=total?'Paid':paid>0?'Partial':'Unpaid',
        // InvoiceOut fields
        invoice_number:`INV-2026-${String(2001+i)}`,
        fee_structure_public_id:'FS-001',
        total_amount:String(total),
        discount_amount:'0',
        net_payable_amount:String(total),
        issued_date:'2026-06-15',
        installments,
      };
      invoices.push(inv);
      if(paid>0){
        // create 1-2 payment records, spread so today/week/month/term all have data
        const n = paid>=total? (i%2?2:1) : 1;
        let remaining=paid;
        for(let k=0;k<n;k++){
          const amt = k===n-1? remaining : Math.round(paid/n);
          remaining-=amt;
          // spread: some today, some this week, this month, and across the term (up to ~150d)
          let daysAgo;
          const bucket=(i+k)%10;
          if(bucket<2) daysAgo=(i+k)%1===0?0:0;           // ~20% today
          else if(bucket<4) daysAgo=1+((i+k)%6);          // this week
          else if(bucket<7) daysAgo=8+((i*3+k)%20);       // this month
          else daysAgo=30+((i*5+k)%120);                  // this term/year
          const d=new Date(); d.setDate(d.getDate()-daysAgo); d.setHours(9+((i+k)%9),(i*7+k)%60,0,0);
          const pyId='PAY-'+String(5001+payments.length);
          const rcpId='RCP-'+String(7001+payments.length);
          const modeMap=['cash','upi','cheque']; // mirrors PaymentCreate.payment_mode enum values
          payments.push({
            id:pyId,
            // PaymentOut fields
            public_id:pyId,
            installment_public_id:inv.installments[0].public_id,
            student_public_id:sid,
            payment_amount:String(amt),
            payment_mode:modeMap[(i+k)%3],
            cheque_number:null,
            paid_at:d.toISOString(),
            received_by_user_public_id:'USR-04',
            receipt_public_id:rcpId,
            // prototype-only fields kept for backward compat
            invoiceId:inv.id, studentId:sid, studentName:nm, branchId,
            amount:amt, mode:['Cash','UPI','Cheque'][(i+k)%3], at:d.toISOString(),
            items:items.map(x=>x.type)
          });
          // also push into the installment's payments[]
          inv.installments[0].payments.push(pyId);
        }
      }
    }
    this._set(this.COLS.BRANCHES,branches);
    this._set(this.COLS.DEPARTMENTS,departments);
    // seed initial empty receipts store
    this._set(this.COLS.RECEIPTS,[]);

    /* OrganizationSettingsOut.settings is an opaque object — we define sensible defaults.
       Claude Code replaces this with GET /settings + PUT /settings.                      */
    this._set(this.COLS.ORG_SETTINGS,{
      // organisation identity (mirrors OrganizationUpdate fields)
      display_name:'Sunrise Public School',
      legal_name:'Sunrise Public School Pvt. Ltd.',
      institution_type_code:'K12',
      primary_contact_email:'info@sunrise.edu',
      primary_contact_phone:'+91 98450 11223',
      country_code:'IN', timezone:'Asia/Kolkata',
      // operational settings (free-form object in the real API)
      settings:{
        academic_year_start_month:6,         // June
        attendance_threshold_percent:75,
        grading_scale:'percentage',           // percentage | gpa | custom
        late_fee_grace_days:7,
        allow_partial_payments:true,
        default_locale:'en',
        school_timings_start:'08:00',
        school_timings_end:'16:00',
      }
    });

    /* NotificationTemplateOut: template_code, channel, locale, subject_template,
       body_template, is_active. Channels: email | sms | whatsapp | push | internal */
    const tmpl=(code,channel,subject,body,active=true)=>({
      template_code:code, channel, locale:'en',
      subject_template:subject, body_template:body, is_active:active,
    });
    this._set(this.COLS.NOTIF_TEMPLATES,[
      tmpl('FEE_REMINDER','email','Fee reminder for {{student_name}}','Dear Parent, the fee of ₹{{amount}} for {{student_name}} is due on {{due_date}}.'),
      tmpl('FEE_REMINDER','sms',null,'Fee ₹{{amount}} due {{due_date}} for {{student_name}}. Sunrise School.'),
      tmpl('FEE_REMINDER','whatsapp',null,'📚 Fee reminder: ₹{{amount}} for {{student_name}} is due on {{due_date}}.'),
      tmpl('ATTENDANCE_ALERT','sms',null,'{{student_name}} was marked absent today. Sunrise School.'),
      tmpl('ATTENDANCE_ALERT','whatsapp',null,'📋 {{student_name}} was marked absent today at Sunrise School.',false),
      tmpl('ATTENDANCE_ALERT','push','Attendance alert','{{student_name}} was marked absent today.'),
      tmpl('LEAVE_DECISION','email','Your leave request has been {{status}}','Dear {{staff_name}}, your leave from {{from_date}} to {{to_date}} has been {{status}}.'),
      tmpl('LEAVE_DECISION','internal',null,'Leave {{status}}: {{staff_name}} · {{from_date}} to {{to_date}}'),
      tmpl('EXAM_SCHEDULE','email','Exam schedule for {{term}}','Dear Parent, exams for {{term}} begin on {{start_date}}. Please ensure {{student_name}} is prepared.',false),
      tmpl('PAYMENT_RECEIPT','email','Payment receipt ₹{{amount}}','Receipt for ₹{{amount}} received from {{student_name}} via {{payment_mode}}. Receipt no: {{receipt_code}}.'),
    ]);

    /* NotificationPreferenceOut: event_category, channel, is_enabled */
    this._set(this.COLS.NOTIF_PREFS,[
      {event_category:'FEE_REMINDER',    channel:'email',    is_enabled:true},
      {event_category:'FEE_REMINDER',    channel:'sms',      is_enabled:true},
      {event_category:'FEE_REMINDER',    channel:'whatsapp', is_enabled:false},
      {event_category:'ATTENDANCE_ALERT',channel:'sms',      is_enabled:true},
      {event_category:'ATTENDANCE_ALERT',channel:'whatsapp', is_enabled:false},
      {event_category:'ATTENDANCE_ALERT',channel:'push',     is_enabled:true},
      {event_category:'LEAVE_DECISION',  channel:'email',    is_enabled:true},
      {event_category:'LEAVE_DECISION',  channel:'internal', is_enabled:true},
      {event_category:'EXAM_SCHEDULE',   channel:'email',    is_enabled:false},
      {event_category:'PAYMENT_RECEIPT', channel:'email',    is_enabled:true},
    ]);
    // staff hierarchy
    const staff=[
      {id:'STF-01',name:'Anjali Menon',role:'Principal',reportsTo:null,phone:'+91 98450 11223',email:'principal@school.edu'},
      {id:'STF-02',name:'Divya Krishnan',role:'Teacher',reportsTo:'STF-01',section:'3-A',phone:'+91 98450 22334',email:'divya@school.edu'},
      {id:'STF-03',name:'Ravi Kumar',role:'Teacher',reportsTo:'STF-01',section:'4-A',phone:'+91 98450 33445',email:'ravi@school.edu'},
      {id:'STF-04',name:'Meera Nair',role:'Accountant',reportsTo:'STF-01',phone:'+91 98450 44556',email:'accounts@school.edu'},
      {id:'STF-05',name:'Vikram Rao',role:'Receptionist',reportsTo:'STF-01',phone:'+91 98450 55667',email:'reception@school.edu'},
      {id:'STF-06',name:'Sneha Iyer',role:'Teacher',reportsTo:'STF-01',section:'5-A',phone:'+91 98450 66778',email:'sneha@school.edu'},
    ];
    this._set(this.COLS.STUDENTS,students);
    this._set(this.COLS.STAFF,staff);
    this._set(this.COLS.INVOICES,invoices);
    this._set(this.COLS.PAYMENTS,payments);
    this._set(this.COLS.SETTINGS,{schoolName:'Sunrise Public School',theme:'violet',mode:'system',activeBranch:'ALL'});
    this._set(this.COLS.FOUNDER_ID,{name:'Rajesh Kumar',email:'rajesh@sunrise.edu',password:'Founder@123',avatar:'RK',orgCode:'SPS-CHN'});

    /* Seed fee heads — mirrors FeeHeadOut: head_name, is_refundable, is_active */
    this._set(this.COLS.FEE_HEADS,[
      {public_id:'FH-001',head_name:'Tuition',is_refundable:false,is_active:true},
      {public_id:'FH-002',head_name:'Transport',is_refundable:false,is_active:true},
      {public_id:'FH-003',head_name:'Books & Stationery',is_refundable:false,is_active:true},
      {public_id:'FH-004',head_name:'Uniform',is_refundable:false,is_active:true},
      {public_id:'FH-005',head_name:'Activity & Sports',is_refundable:false,is_active:true},
      {public_id:'FH-006',head_name:'Examination',is_refundable:false,is_active:true},
    ]);

    /* Seed fee structures — mirrors FeeStructureOut: includes head_lines[] of FeeStructureHeadLineOut */
    this._set(this.COLS.FEE_STRUCTURES,[
      {
        public_id:'FS-001', structure_name:'Primary (Class 1–5)',
        branch_public_id:'BR-MAIN', academic_session_public_id:'SESS-2026',
        class_level_public_id:null, is_active:true,
        head_lines:[
          {fee_head_name:'Tuition',amount:'18000',gst_percentage:'0',line_total:'18000'},
          {fee_head_name:'Transport',amount:'6000',gst_percentage:'0',line_total:'6000'},
          {fee_head_name:'Books & Stationery',amount:'3500',gst_percentage:'0',line_total:'3500'},
          {fee_head_name:'Uniform',amount:'2200',gst_percentage:'0',line_total:'2200'},
          {fee_head_name:'Activity & Sports',amount:'1500',gst_percentage:'0',line_total:'1500'},
        ],
        total_amount:'31200',
      },
    ]);
  },

  /* ---- branches ---- */
  branches(){ return this._get(this.COLS.BRANCHES)||[]; },
  branchById(id){ return this.branches().find(b=>b.public_id===id||b.id===id)||null; },
  activeBranch(){ return this.settings().activeBranch||'ALL'; },
  setActiveBranch(id){ this.updateSettings({activeBranch:id}); },
  branchName(id){ if(id==='ALL')return 'All branches'; const b=this.branches().find(x=>x.id===id||x.public_id===id); return b?(b.branch_name||b.name):'All branches'; },
  _inBranch(rec){ const b=this.activeBranch(); return b==='ALL'||rec.branchId===b; },

  /* ========== BRANCHES — mirrors BranchOut / BranchCreate / BranchUpdate ========== */
  addBranch({branch_name,branch_code,address_line1,address_line2,city,state,postal_code,country_code}){
    const branches=this.branches();
    if(branches.some(b=>b.branch_code.toUpperCase()===branch_code.toUpperCase()))
      return {error:'A branch with that code already exists.'};
    const pid='BR-'+String(Date.now()).slice(-5);
    const b={id:pid, public_id:pid, branch_name, branch_code:branch_code.toUpperCase(),
      address_line1:address_line1||null, address_line2:address_line2||null,
      city:city||null, state:state||null, postal_code:postal_code||null,
      country_code:country_code||'IN', geo_lat:null, geo_lng:null, is_active:true,
      name:branch_name, code:branch_code.toUpperCase() };
    branches.push(b); this._set(this.COLS.BRANCHES,branches); return b;
  },
  updateBranch(pid,patch){
    const branches=this.branches(); const b=branches.find(x=>x.public_id===pid||x.id===pid);
    if(!b) return null;
    const allowed=['branch_name','address_line1','address_line2','city','state','postal_code','is_active'];
    allowed.forEach(k=>{ if(patch[k]!==undefined){ b[k]=patch[k]; if(k==='branch_name') b.name=patch[k]; } });
    this._set(this.COLS.BRANCHES,branches); return b;
  },

  /* ---- Organization profile (PATCH /organization → OrganizationUpdate) ---- */
  orgProfile(){ return this._get(this.COLS.ORG_SETTINGS)||{}; },
  updateOrgProfile(patch){
    const current=this.orgProfile();
    const allowed=['display_name','legal_name','institution_type_code',
                   'primary_contact_email','primary_contact_phone','country_code','timezone'];
    allowed.forEach(k=>{ if(patch[k]!==undefined) current[k]=patch[k]; });
    this._set(this.COLS.ORG_SETTINGS,current); return current;
  },

  /* ---- Organization settings (PUT /settings → OrganizationSettingsReplace{settings:object}) ---- */
  orgSettings(){ return (this._get(this.COLS.ORG_SETTINGS)||{}).settings||{}; },
  updateOrgSettings(settingsPatch){
    const full=this.orgProfile();
    full.settings={...(full.settings||{}),...settingsPatch};
    this._set(this.COLS.ORG_SETTINGS,full); return full.settings;
  },

  /* ---- Notification templates (GET/PATCH /notifications/templates) ----
     NotificationTemplateOut: template_code, channel, locale,
                               subject_template, body_template, is_active       */
  notifTemplates(){ return this._get(this.COLS.NOTIF_TEMPLATES)||[]; },
  templatesByEvent(){
    const map={}; this.notifTemplates().forEach(t=>{
      (map[t.template_code]=map[t.template_code]||[]).push(t);
    }); return map;
  },
  updateTemplate(template_code,channel,patch){
    const tmpl=this.notifTemplates();
    const t=tmpl.find(x=>x.template_code===template_code&&x.channel===channel);
    if(!t) return null;
    if(patch.subject_template!==undefined) t.subject_template=patch.subject_template;
    if(patch.body_template!==undefined)    t.body_template=patch.body_template;
    if(patch.is_active!==undefined)        t.is_active=patch.is_active;
    this._set(this.COLS.NOTIF_TEMPLATES,tmpl); return t;
  },

  /* ---- Notification preferences (PUT /notifications/preferences → NotificationPreferenceIn) ----
     NotificationPreferenceIn: event_category, channel, is_enabled
     NotificationPreferenceOut: event_category, channel, is_enabled                               */
  notifPrefs(){ return this._get(this.COLS.NOTIF_PREFS)||[]; },
  updatePref(event_category,channel,is_enabled){
    const prefs=this.notifPrefs();
    let pref=prefs.find(p=>p.event_category===event_category&&p.channel===channel);
    if(!pref){ pref={event_category,channel,is_enabled}; prefs.push(pref); }
    else pref.is_enabled=is_enabled;
    this._set(this.COLS.NOTIF_PREFS,prefs); return pref;
  },

  /* ========== DEPARTMENTS — mirrors DepartmentOut / DepartmentCreate / DepartmentUpdate ========== */
  departments(){ return this._get(this.COLS.DEPARTMENTS)||[]; },
  activeDepartments(){ return this.departments().filter(d=>d.is_active); },
  departmentById(pid){ return this.departments().find(d=>d.public_id===pid)||null; },
  /* The name list used by the Add Staff dropdown — replaces the old hardcoded array */
  departmentNames(){ return this.activeDepartments().map(d=>d.department_name); },
  addDepartment({department_name,department_code,branch_public_id,parent_department_public_id,head_user_public_id}){
    const depts=this.departments();
    if(depts.some(d=>d.department_code.toUpperCase()===department_code.toUpperCase()&&d.is_active))
      return {error:'A department with that code already exists.'};
    const d={
      public_id:'DEPT-'+String(Date.now()).slice(-6),
      branch_public_id:branch_public_id||'BR-01',
      department_name, department_code:department_code.toUpperCase(),
      parent_department_public_id:parent_department_public_id||null,
      head_user_public_id:head_user_public_id||null,
      is_active:true,
    };
    depts.push(d); this._set(this.COLS.DEPARTMENTS,depts); return d;
  },
  updateDepartment(pid,patch){
    const depts=this.departments(); const d=depts.find(x=>x.public_id===pid);
    if(!d) return null;
    ['department_name','head_user_public_id','is_active'].forEach(k=>{ if(patch[k]!==undefined) d[k]=patch[k]; });
    this._set(this.COLS.DEPARTMENTS,depts); return d;
  },
  deleteDepartment(pid){
    const depts=this.departments();
    const idx=depts.findIndex(d=>d.public_id===pid); if(idx===-1) return false;
    const staffUsingIt=typeof StaffDB!=='undefined'
      ? StaffDB.staffUsers().some(u=>u.department===depts[idx].department_name)
      : false;
    if(staffUsingIt) return {error:'This department has staff assigned. Reassign them first.'};
    depts.splice(idx,1); this._set(this.COLS.DEPARTMENTS,depts); return true;
  },

  /* ---- accessors (branch-aware: respect the active branch selection) ---- */
  _allStudents(){ return this._get(this.COLS.STUDENTS)||[]; },
  _allInvoices(){ return this._get(this.COLS.INVOICES)||[]; },
  _allPayments(){ return this._get(this.COLS.PAYMENTS)||[]; },
  students(){ return this._allStudents().filter(s=>this._inBranch(s)); },
  staff(){ return this._get(this.COLS.STAFF)||[]; },
  invoices(){ return this._allInvoices().filter(i=>this._inBranch(i)); },
  payments(){ return this._allPayments().filter(p=>this._inBranch(p)); },
  settings(){ return this._get(this.COLS.SETTINGS)||{}; },
  founderCredentials(){ return this._get(this.COLS.FOUNDER_ID)||{}; },
  setFounderPassword(newPassword){ const fc=this.founderCredentials(); fc.password=newPassword; this._set(this.COLS.FOUNDER_ID,fc); },
  updateSettings(u){ this._set(this.COLS.SETTINGS,{...this.settings(),...u}); },

  /* ========== FEE HEADS — mirrors FeeHeadOut / FeeHeadCreate ========== */
  feeHeads(){ return this._get(this.COLS.FEE_HEADS)||[]; },
  activeFeeHeads(){ return this.feeHeads().filter(h=>h.is_active); },
  addFeeHead({head_name,is_refundable}){
    const heads=this.feeHeads();
    if(heads.some(h=>h.head_name.toLowerCase()===head_name.toLowerCase()&&h.is_active))
      return {error:'A fee head with that name already exists.'};
    const h={public_id:'FH-'+String(Date.now()).slice(-6),
              head_name,is_refundable:!!is_refundable,is_active:true};
    heads.push(h); this._set(this.COLS.FEE_HEADS,heads); return h;
  },
  toggleFeeHead(publicId){
    const heads=this.feeHeads(); const h=heads.find(x=>x.public_id===publicId);
    if(h){ h.is_active=!h.is_active; this._set(this.COLS.FEE_HEADS,heads); } return h;
  },

  /* ========== FEE STRUCTURES — mirrors FeeStructureOut / FeeStructureCreate ========== */
  feeStructures(){ return this._get(this.COLS.FEE_STRUCTURES)||[]; },
  feeStructureById(id){ return this.feeStructures().find(s=>s.public_id===id)||null; },
  addFeeStructure({structure_name,class_level_public_id,head_lines}){
    const structs=this.feeStructures();
    const total=head_lines.reduce((s,l)=>{
      const amt=parseFloat(l.amount)||0; const gst=parseFloat(l.gst_percentage||0)/100;
      return s+amt*(1+gst);
    },0);
    const struct={
      public_id:'FS-'+String(Date.now()).slice(-6),
      structure_name, is_active:true,
      branch_public_id:'BR-MAIN', academic_session_public_id:'SESS-2026',
      class_level_public_id:class_level_public_id||null,
      head_lines:head_lines.map(l=>({
        fee_head_name:l.fee_head_name,
        amount:String(parseFloat(l.amount)||0),
        gst_percentage:String(parseFloat(l.gst_percentage||0)),
        line_total:String(Math.round((parseFloat(l.amount)||0)*(1+(parseFloat(l.gst_percentage||0)/100)))),
      })),
      total_amount:String(Math.round(total)),
    };
    structs.push(struct); this._set(this.COLS.FEE_STRUCTURES,structs); return struct;
  },
  toggleFeeStructure(id){
    const structs=this.feeStructures(); const s=structs.find(x=>x.public_id===id);
    if(s){ s.is_active=!s.is_active; this._set(this.COLS.FEE_STRUCTURES,structs); } return s;
  },

  /* ---- Guardian CRUD (mirrors POST/DELETE /students/{id}/guardians) ---- */
  studentById(id){ return this._allStudents().find(s=>s.id===id); },
  guardians(studentId){
    const s=this.studentById(studentId); return (s&&s.guardians)||[];
  },
  addGuardian(studentId,data){
    const all=this._allStudents(); const s=all.find(x=>x.id===studentId); if(!s) return null;
    if(!s.guardians) s.guardians=[];
    // if first guardian or is_primary_contact, demote others
    if(data.is_primary_contact || s.guardians.length===0){
      s.guardians.forEach(g=>g.is_primary_contact=false);
    }
    const g={
      guardian_public_id:'GRD-'+String(Date.now()).slice(-6),
      full_name:data.full_name, phone_number:data.phone_number,
      email:data.email||null, occupation:data.occupation||null,
      relationship_type:data.relationship_type,
      is_primary_contact:!!data.is_primary_contact
    };
    s.guardians.push(g); this._set(this.COLS.STUDENTS,all); return g;
  },
  removeGuardian(studentId,guardianPublicId){
    const all=this._allStudents(); const s=all.find(x=>x.id===studentId); if(!s) return false;
    s.guardians=(s.guardians||[]).filter(g=>g.guardian_public_id!==guardianPublicId);
    // ensure at least one primary
    if(s.guardians.length>0 && !s.guardians.some(g=>g.is_primary_contact)) s.guardians[0].is_primary_contact=true;
    this._set(this.COLS.STUDENTS,all); return true;
  },

  /* ---- StudentUpdate (mirrors PATCH /students/{id}) ---- */
  updateStudent(studentId,patch){
    const all=this._allStudents(); const s=all.find(x=>x.id===studentId); if(!s) return null;
    const allowed=['full_name','gender','blood_group','residency_type','lifecycle_status'];
    allowed.forEach(k=>{ if(patch[k]!==undefined) s[k]=patch[k]; });
    // sync name alias
    if(patch.full_name) s.name=patch.full_name;
    this._set(this.COLS.STUDENTS,all); return s;
  },

  /* ---- Enrollment history (mirrors GET /students/{id}/enrollment-history) ---- */
  enrollmentHistory(studentId){
    const s=this.studentById(studentId); return (s&&s.enrollment_history)||[];
  },

  /* ---- Student attendance summary — reads from StaffDB's live attendance store.
     Cross-app: StaffDB stores marks per section|date; we aggregate for one student.
     Mirrors AttendanceSummaryOut: present_count, absent_count, late_count,
     half_day_count, excused_count, total_count, percentage                     ---- */
  studentAttendanceSummary(studentId){
    const out={present_count:0,absent_count:0,late_count:0,half_day_count:0,excused_count:0,total_count:0,percentage:0};
    if(typeof StaffDB==='undefined') return out;
    const allAtt=StaffDB._get(StaffDB.COLS.ATTENDANCE)||{};
    Object.values(allAtt).forEach(rec=>{
      if(!rec||!rec.marks) return;
      const mark=rec.marks[studentId]; if(!mark) return;
      out.total_count++;
      if(mark==='P') out.present_count++;
      else if(mark==='A') out.absent_count++;
      else if(mark==='Lt') out.late_count++;
      else if(mark==='H') out.half_day_count++;
      else if(mark==='E') out.excused_count++;
    });
    out.percentage=out.total_count?Math.round(out.present_count/out.total_count*100):0;
    return out;
  },
  invoiceForStudent(id){ return this._allInvoices().find(i=>i.studentId===id); },
  paymentsForStudent(id){ return this._allPayments().filter(p=>p.studentId===id); },
  staffById(id){ return this.staff().find(s=>s.id===id); },

  /* ---- period helpers (for the fee hero time filter: today/week/month/term/year) ---- */
  PERIODS:[['today','Today'],['week','This week'],['month','This month'],['term','This term'],['year','This year']],
  _periodStart(period){
    const d=new Date(); d.setHours(0,0,0,0);
    if(period==='today') return d;
    if(period==='week'){ const wd=(d.getDay()+6)%7; d.setDate(d.getDate()-wd); return d; }
    if(period==='month') return new Date(d.getFullYear(),d.getMonth(),1);
    if(period==='term') return new Date(d.getFullYear(),d.getMonth()-3,1); // ~3-month term window
    if(period==='year') return new Date(d.getFullYear(),0,1);
    return new Date(0);
  },
  paymentsInPeriod(period){ const start=this._periodStart(period); return this.payments().filter(p=>new Date(p.at)>=start); },
  collectedInPeriod(period){ return this.paymentsInPeriod(period).reduce((s,p)=>s+p.amount,0); },

  /* ---- aggregates (the "show with reports" engine) ---- */
  feeSummary(){
    const inv=this.invoices();
    const billed=inv.reduce((s,i)=>s+i.total,0);
    const collected=inv.reduce((s,i)=>s+i.paid,0);
    const outstanding=billed-collected;
    return {billed,collected,outstanding,
      paid:inv.filter(i=>i.status==='Paid').length,
      partial:inv.filter(i=>i.status==='Partial').length,
      unpaid:inv.filter(i=>i.status==='Unpaid').length,
      count:inv.length};
  },
  collectionByType(){
    const map={};
    this.payments().forEach(p=>{
      const inv=this._allInvoices().find(i=>i.id===p.invoiceId); if(!inv)return;
      const share=p.amount/inv.items.reduce((s,x)=>s+x.amount,0);
      inv.items.forEach(it=>{ map[it.type]=(map[it.type]||0)+Math.round(it.amount*share); });
    });
    return Object.entries(map).map(([type,amount])=>({type,amount})).sort((a,b)=>b.amount-a.amount);
  },
  collectionByMode(){
    const map={Cash:0,UPI:0,Cheque:0};
    this.payments().forEach(p=>{ map[p.mode]=(map[p.mode]||0)+p.amount; });
    return map;
  },
  collectionTrend(){ // last 6 months by payment date
    const months=[]; const now=new Date();
    for(let i=5;i>=0;i--){ const d=new Date(now.getFullYear(),now.getMonth()-i,1); months.push({key:`${d.getFullYear()}-${d.getMonth()}`,label:d.toLocaleString('en',{month:'short'}),amount:0}); }
    this.payments().forEach(p=>{ const d=new Date(p.at); const k=`${d.getFullYear()}-${d.getMonth()}`; const m=months.find(x=>x.key===k); if(m)m.amount+=p.amount; });
    return months;
  },
  recentPayments(n){ return [...this.payments()].sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,n||8); },

  /* ---- Invoice lookup by public_id (InvoiceDetailOut shape) ---- */
  invoiceByPublicId(pid){ return this._allInvoices().find(i=>i.public_id===pid)||null; },
  installmentById(pid){ for(const inv of this._allInvoices()){ const inst=inv.installments&&inv.installments.find(x=>x.public_id===pid); if(inst) return {installment:inst,invoice:inv}; } return null; },

  /* ---- GET /fees/invoices/status-summary — InvoiceStatusSummaryEntry[] ---- */
  invoiceStatusSummary(){
    const inv=this.invoices();
    const groups={Paid:0,Partial:0,Unpaid:0,Overdue:0};
    const totals={Paid:0,Partial:0,Unpaid:0,Overdue:0};
    inv.forEach(i=>{
      const s=i.status; groups[s]=(groups[s]||0)+1; totals[s]=(totals[s]||0)+(i.total-i.paid);
    });
    return Object.entries(groups)
      .filter(([,c])=>c>0)
      .map(([status,count])=>({status,count,total_amount:String(totals[status])}));
  },

  /* ---- POST /fees/invoices/generate — mirrors GenerateInvoicesRequest ----
     structure_public_id, target{class_level_public_id?,student_public_ids?},
     installments[]{number,due_date,fraction}
     Creates invoices for targeted students using amounts from the fee structure. ---- */
  generateInvoices({structure_public_id,target,installments}){
    const struct=this.feeStructureById(structure_public_id);
    if(!struct) return {error:'Fee structure not found'};
    const allStudents=this._allStudents();
    let targets=[];
    if(target&&target.student_public_ids&&target.student_public_ids.length){
      targets=allStudents.filter(s=>target.student_public_ids.includes(s.id));
    } else if(target&&target.class_level_public_id){
      targets=allStudents.filter(s=>s.class_level_public_id===target.class_level_public_id);
    } else {
      targets=allStudents; // all students
    }
    const allInvoices=this._allInvoices();
    const created=[];
    targets.forEach(s=>{
      const already=allInvoices.find(i=>i.fee_structure_public_id===structure_public_id&&i.studentId===s.id);
      if(already) return; // skip duplicates
      const total=parseFloat(struct.total_amount)||0;
      const invPid='INV-PID-GEN-'+String(Date.now()).slice(-6)+'-'+s.id;
      const inst=(installments||[{number:1,due_date:new Date().toISOString().split('T')[0],fraction:1}]).map((p,idx)=>{
        const fraction=parseFloat(p.fraction)||1;
        const due=Math.round(total*fraction);
        return {
          public_id:`INST-GEN-${String(Date.now()).slice(-5)}-${idx}`,
          installment_number:p.number||idx+1,
          due_date:p.due_date,
          due_amount:String(due),
          fine_amount:'0',
          paid_amount:'0',
          status:'pending',
          payments:[],
        };
      });
      const items=struct.head_lines.map(l=>({type:l.fee_head_name,amount:parseFloat(l.line_total)||0}));
      const inv={
        id:invPid, public_id:invPid, studentId:s.id, studentName:s.name,
        section:s.section, branchId:s.branchId||'BR-MAIN',
        items, total, paid:0, status:'Unpaid',
        invoice_number:`INV-GEN-${String(Date.now()).slice(-6)}`,
        fee_structure_public_id:structure_public_id,
        total_amount:String(total),
        discount_amount:'0',
        net_payable_amount:String(total),
        issued_date:new Date().toISOString().split('T')[0],
        installments:inst,
      };
      allInvoices.push(inv); created.push(inv);
    });
    this._set(this.COLS.INVOICES,allInvoices);
    return {created:created.length, total_targeted:targets.length};
  },

  /* ---- POST /fees/payments — PaymentCreate → PaymentOut + ReceiptOut ----
     installment_public_id, amount, payment_mode, cheque_number?               ---- */
  recordPayment({installment_public_id,amount,payment_mode,cheque_number}){
    const found=this.installmentById(installment_public_id);
    if(!found) return {error:'Installment not found'};
    const {installment,invoice}=found; const amt=parseFloat(amount)||0;
    // update installment
    const newPaid=parseFloat(installment.paid_amount||0)+amt;
    installment.paid_amount=String(newPaid);
    const due=parseFloat(installment.due_amount||0);
    installment.status=newPaid>=due?'paid':'partial';
    // create payment record (mirrors PaymentOut)
    const pyId='PAY-'+String(Date.now()).slice(-7);
    const rcpId='RCP-'+String(Date.now()).slice(-7);
    const payment={
      id:pyId, public_id:pyId,
      installment_public_id, student_public_id:invoice.studentId,
      payment_amount:String(amt), payment_mode,
      cheque_number:cheque_number||null,
      paid_at:new Date().toISOString(),
      received_by_user_public_id:'USR-04',
      receipt_public_id:rcpId,
      // compat fields
      invoiceId:invoice.id, studentId:invoice.studentId, studentName:invoice.studentName,
      branchId:invoice.branchId, amount:amt, mode:payment_mode, at:new Date().toISOString(),
    };
    installment.payments.push(pyId);
    // update invoice totals
    invoice.paid=(invoice.paid||0)+amt;
    const totalNet=parseFloat(invoice.net_payable_amount||invoice.total_amount||invoice.total)||0;
    invoice.status=invoice.paid>=totalNet?'Paid':invoice.paid>0?'Partial':'Unpaid';
    // create receipt (ReceiptOut)
    const receipt={
      public_id:rcpId,
      receipt_code:`RCP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
      issued_at:new Date().toISOString(),
      payment,
      // compat
      studentName:invoice.studentName, studentId:invoice.studentId, invoiceId:invoice.id,
    };
    const allInvoices=this._allInvoices();
    const idx=allInvoices.findIndex(i=>i.public_id===invoice.public_id||i.id===invoice.id);
    if(idx>-1) allInvoices[idx]=invoice;
    this._set(this.COLS.INVOICES,allInvoices);
    const payments=this._allPayments(); payments.push(payment); this._set(this.COLS.PAYMENTS,payments);
    const receipts=this._get(this.COLS.RECEIPTS)||[]; receipts.push(receipt); this._set(this.COLS.RECEIPTS,receipts);
    return {payment,receipt};
  },

  /* ---- GET /fees/receipts/{id} — ReceiptOut ---- */
  receiptByPublicId(id){ return (this._get(this.COLS.RECEIPTS)||[]).find(r=>r.public_id===id)||null; },

  /* ---- Staff hierarchy (mirrors GET /staff/hierarchy → StaffHierarchyOut[]) ----
     StaffHierarchyOut: full_name, designation, hierarchy_level, reporting_to_user_public_id, is_active  */
  staffHierarchy(){
    if(typeof StaffDB==='undefined') return [];
    const staff=StaffDB.staffUsers();
    // Compute hierarchy_level: level 0 = no reportsToId (top), level 1 = reports to top, etc.
    const levelMap={};
    const getLevel=(id,depth=0)=>{
      if(depth>5) return 0; // guard against cycles
      if(levelMap[id]!==undefined) return levelMap[id];
      const u=staff.find(x=>x.id===id); if(!u) return 0;
      const lvl=u.reportsToId ? getLevel(u.reportsToId,depth+1)+1 : 0;
      levelMap[id]=lvl; return lvl;
    };
    return staff.map(u=>({
      // StaffHierarchyOut fields
      public_id:u.id, user_public_id:u.id, full_name:u.name,
      email:u.email, phone_number:null,
      branch_public_id:'BR-01', branch_code:'MAIN',
      employee_code:u.id, designation:u.designation,
      date_of_joining:u.createdAt||'2026-01-15',
      employment_type:'full_time',
      reporting_to_user_public_id:u.reportsToId||null,
      is_active:u.passwordSet!==false,
      hierarchy_level:getLevel(u.id),
    })).sort((a,b)=>a.hierarchy_level-b.hierarchy_level||a.full_name.localeCompare(b.full_name));
  },

  /* ---- Attendance summary by section — reads real StaffDB data ----
     Groups all saved attendance marks by section and computes AttendanceSummaryOut-shaped aggregates. */
  attendanceSummaryBySection(){
    if(typeof StaffDB==='undefined') return [];
    const allAtt=StaffDB._get(StaffDB.COLS.ATTENDANCE)||{};
    const sectionMap={};
    Object.values(allAtt).forEach(rec=>{
      if(!rec||!rec.marks) return;
      Object.entries(rec.marks).forEach(([sid,mark])=>{
        const stu=this._allStudents().find(s=>s.id===sid); if(!stu) return;
        const sec=stu.section||'Unknown';
        if(!sectionMap[sec]) sectionMap[sec]={present_count:0,absent_count:0,late_count:0,half_day_count:0,excused_count:0,total_count:0,section:sec};
        const s=sectionMap[sec]; s.total_count++;
        if(mark==='P') s.present_count++;
        else if(mark==='A') s.absent_count++;
        else if(mark==='Lt') s.late_count++;
        else if(mark==='H') s.half_day_count++;
        else if(mark==='E') s.excused_count++;
      });
    });
    return Object.values(sectionMap).map(s=>({
      ...s, percentage:s.total_count?Math.round(s.present_count/s.total_count*100):0
    })).sort((a,b)=>a.section.localeCompare(b.section));
  },

  /* ---- Admissions funnel — mirrors GET /admissions/funnel-summary → FunnelSummaryEntry[] ----
     FunnelSummaryEntry: status (string), count (integer)                                         */
  funnelSummary(){
    if(typeof StaffDB==='undefined') return [];
    const stages=['Enquiry','Contacted','Visited','Applied','Admitted'];
    const counts={};
    stages.forEach(s=>counts[s]=0);
    StaffDB.leads().forEach(l=>{ if(counts[l.stage]!==undefined) counts[l.stage]++; });
    StaffDB.applications().filter(a=>a.status==='Admitted').forEach(()=>{}); // already in leads
    return stages.map(status=>({status,count:counts[status]||0}));
  },
  defaulters(){ return this.invoices().filter(i=>i.status!=='Paid').map(i=>({...i,due:i.total-i.paid})).sort((a,b)=>b.due-a.due); },
  attendanceToday(){ const total=this.students().length; const present=Math.round(total*0.92); return {present,absent:total-present,total,pct: total?Math.round(present/total*100):0}; },

  /* ---- "value beyond money" metrics (balanced dashboard) ---- */
  enrolmentTrend(){ // students joined per month (last 6)
    const months=[]; const now=new Date();
    for(let i=5;i>=0;i--){ const d=new Date(now.getFullYear(),now.getMonth()-i,1); months.push({key:`${d.getFullYear()}-${d.getMonth()}`,label:d.toLocaleString('en',{month:'short'}),count:0}); }
    this.students().forEach(s=>{ if(!s.joinedAt)return; const d=new Date(s.joinedAt); const k=`${d.getFullYear()}-${d.getMonth()}`; const m=months.find(x=>x.key===k); if(m)m.count++; });
    return months;
  },
  admissionsPipeline(){ // synthesized funnel, deterministic, branch-scaled
    const scale=this.activeBranch()==='ALL'?1:0.5;
    return {enquiries:Math.round(48*scale),visited:Math.round(31*scale),applied:Math.round(19*scale),admitted:Math.round(12*scale)};
  },
  academicHealth(){ // attendance + a synthesized result/pass metric
    const att=this.attendanceToday();
    return {attendancePct:att.pct, avgScore:78, passRate:94, topPerformers:Math.round(this.students().length*0.22)};
  },

  reset(){ Object.keys(sessionStorage).filter(k=>k.startsWith(this.PFX)).forEach(k=>sessionStorage.removeItem(k)); this.init(); },
};
FounderDB.init();
