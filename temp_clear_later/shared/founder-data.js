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
  COLS:{ STUDENTS:'students', STAFF:'staff', INVOICES:'invoices', PAYMENTS:'payments', SETTINGS:'fdr_settings' },

  init(){ if(!this._get('seeded')){ this._seed(); this._set('seeded',true); } },

  _get(k){ try{ const d=sessionStorage.getItem(this.PFX+k); return d?JSON.parse(d):null; }catch{ return null; } },
  _set(k,v){ sessionStorage.setItem(this.PFX+k,JSON.stringify(v)); },

  /* ---- seed one realistic school ---- */
  _seed(){
    const sections=['Nursery-A','LKG-A','UKG-A','1-A','1-B','2-A','3-A','4-A','5-A'];
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
      students.push({id:sid, name:nm, section:sec, roll:String(i+1), admissionNo:`ADM-2026-${String(118+i).padStart(4,'0')}`,
        gender:i%2?'Female':'Male', status:'active', concession,
        guardian:{name:(i%2?'Mr. ':'Mrs. ')+last[i%last.length], phone:`+91 9${String(800000000+i*37).slice(0,9)}`, relation:i%2?'Father':'Mother'},
        joinedAt:`2026-0${(i%5)+1}-15`});
      const inv={id:'INV-'+String(2001+i), studentId:sid, studentName:nm, section:sec, items, total, paid, status: paid>=total?'Paid':paid>0?'Partial':'Unpaid'};
      invoices.push(inv);
      if(paid>0){
        // create 1-2 payment records
        const n = paid>=total? (i%2?2:1) : 1;
        let remaining=paid;
        for(let k=0;k<n;k++){
          const amt = k===n-1? remaining : Math.round(paid/n);
          remaining-=amt;
          const daysAgo=(i*3+k*7)%90;
          const d=new Date(); d.setDate(d.getDate()-daysAgo);
          payments.push({id:'RCP-'+String(5001+payments.length), invoiceId:inv.id, studentId:sid, studentName:nm,
            amount:amt, mode:modes[(i+k)%3], at:d.toISOString(),
            items: items.map(x=>x.type)});
        }
      }
    }
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
    this._set(this.COLS.SETTINGS,{schoolName:'Sunrise Public School',theme:'violet',mode:'system'});
  },

  /* ---- accessors ---- */
  students(){ return this._get(this.COLS.STUDENTS)||[]; },
  staff(){ return this._get(this.COLS.STAFF)||[]; },
  invoices(){ return this._get(this.COLS.INVOICES)||[]; },
  payments(){ return this._get(this.COLS.PAYMENTS)||[]; },
  settings(){ return this._get(this.COLS.SETTINGS)||{}; },
  updateSettings(u){ this._set(this.COLS.SETTINGS,{...this.settings(),...u}); },
  studentById(id){ return this.students().find(s=>s.id===id); },
  invoiceForStudent(id){ return this.invoices().find(i=>i.studentId===id); },
  paymentsForStudent(id){ return this.payments().filter(p=>p.studentId===id); },
  staffById(id){ return this.staff().find(s=>s.id===id); },

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
      const inv=this.invoices().find(i=>i.id===p.invoiceId); if(!inv)return;
      // attribute payment proportionally across its items (prototype approximation)
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
  attendanceToday(){ // synthesized but deterministic
    const total=this.students().length; const present=Math.round(total*0.92); return {present,absent:total-present,total,pct:Math.round(present/total*100)}; },

  reset(){ Object.keys(sessionStorage).filter(k=>k.startsWith(this.PFX)).forEach(k=>sessionStorage.removeItem(k)); this.init(); },
};
FounderDB.init();
