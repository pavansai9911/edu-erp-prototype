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
  COLS:{ STUDENTS:'students', STAFF:'staff', INVOICES:'invoices', PAYMENTS:'payments', BRANCHES:'branches', SETTINGS:'fdr_settings' },

  init(){ if(!this._get('seeded')){ this._seed(); this._set('seeded',true); } },

  _get(k){ try{ const d=sessionStorage.getItem(this.PFX+k); return d?JSON.parse(d):null; }catch{ return null; } },
  _set(k,v){ sessionStorage.setItem(this.PFX+k,JSON.stringify(v)); },

  /* ---- seed one realistic school ---- */
  _seed(){
    const sections=['Nursery-A','LKG-A','UKG-A','1-A','1-B','2-A','3-A','4-A','5-A'];
    const branches=[{id:'BR-01',name:'Main Campus',code:'MAIN'},{id:'BR-02',name:'City Branch',code:'CITY'}];
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
        joinedAt:`2026-0${(i%5)+1}-15`});
      const inv={id:'INV-'+String(2001+i), studentId:sid, studentName:nm, section:sec, branchId, items, total, paid, status: paid>=total?'Paid':paid>0?'Partial':'Unpaid'};
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
          payments.push({id:'RCP-'+String(5001+payments.length), invoiceId:inv.id, studentId:sid, studentName:nm, branchId,
            amount:amt, mode:modes[(i+k)%3], at:d.toISOString(),
            items: items.map(x=>x.type)});
        }
      }
    }
    this._set(this.COLS.BRANCHES,branches);
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
  },

  /* ---- branches ---- */
  branches(){ return this._get(this.COLS.BRANCHES)||[]; },
  activeBranch(){ return this.settings().activeBranch||'ALL'; },
  setActiveBranch(id){ this.updateSettings({activeBranch:id}); },
  branchName(id){ if(id==='ALL')return 'All branches'; const b=this.branches().find(x=>x.id===id); return b?b.name:'All branches'; },
  _inBranch(rec){ const b=this.activeBranch(); return b==='ALL'||rec.branchId===b; },

  /* ---- accessors (branch-aware: respect the active branch selection) ---- */
  _allStudents(){ return this._get(this.COLS.STUDENTS)||[]; },
  _allInvoices(){ return this._get(this.COLS.INVOICES)||[]; },
  _allPayments(){ return this._get(this.COLS.PAYMENTS)||[]; },
  students(){ return this._allStudents().filter(s=>this._inBranch(s)); },
  staff(){ return this._get(this.COLS.STAFF)||[]; },
  invoices(){ return this._allInvoices().filter(i=>this._inBranch(i)); },
  payments(){ return this._allPayments().filter(p=>this._inBranch(p)); },
  settings(){ return this._get(this.COLS.SETTINGS)||{}; },
  updateSettings(u){ this._set(this.COLS.SETTINGS,{...this.settings(),...u}); },
  studentById(id){ return this._allStudents().find(s=>s.id===id); },
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
