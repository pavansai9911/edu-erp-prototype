/**
 * ============================================================================
 *  NextGen EduERP — Staff Domain Data & Permission Model
 *  shared/staff-data.js  |  The RENEWAL surface's engine.
 *  ONE app, FOUR roles, navigation computed from PERMISSION CODES (never role
 *  names). Reuses FounderDB for students & the flexible fee ledger.
 * ============================================================================
 */
const StaffDB = {
  PFX:'eduerp_stf_',
  COLS:{ LEADS:'leads', LEAVES:'leaves', APPLICATIONS:'applications', ATTENDANCE:'attendance', USERS:'staff_users', SESSION_ROLE:'active_role' },

  /* ---- The permission catalog (MODULE.RESOURCE.ACTION) ---- */
  PERMS:{
    STUDENT_VIEW:'STUDENT.STUDENT.VIEW',
    ATTENDANCE_CREATE:'STUDENT.ATTENDANCE.CREATE',
    FEE_VIEW:'FEE.FEE.VIEW',
    FEE_PAYMENT_CREATE:'FEE.PAYMENT.CREATE',
    LEAD_VIEW:'ADMISSION.LEAD.VIEW',
    LEAD_CREATE:'ADMISSION.LEAD.CREATE',
    APPLICATION_APPROVE:'ADMISSION.APPLICATION.APPROVE',
    LEAVE_CREATE:'STAFF.LEAVE.CREATE',
    LEAVE_APPROVE:'STAFF.LEAVE.APPROVE',
    REPORTS_VIEW:'REPORTS.SCHOOL.VIEW',
  },

  /* ---- Four canonical role profiles (permission bundles).
     The BACKEND grants these in production; the app only READS them. ---- */
  ROLE_PROFILES:{
    Principal:{
      name:'Anjali Menon', avatar:'AM',
      perms:['STUDENT.STUDENT.VIEW','STAFF.LEAVE.APPROVE','ADMISSION.APPLICATION.APPROVE','ADMISSION.LEAD.VIEW','REPORTS.SCHOOL.VIEW','STAFF.LEAVE.CREATE'],
    },
    Teacher:{
      name:'Divya Krishnan', avatar:'DK', section:'3-A',
      perms:['STUDENT.STUDENT.VIEW','STUDENT.ATTENDANCE.CREATE','STAFF.LEAVE.CREATE'],
    },
    Accountant:{
      name:'Meera Nair', avatar:'MN',
      perms:['STUDENT.STUDENT.VIEW','FEE.FEE.VIEW','FEE.PAYMENT.CREATE','REPORTS.SCHOOL.VIEW','STAFF.LEAVE.CREATE'],
    },
    Receptionist:{
      name:'Vikram Rao', avatar:'VR',
      perms:['ADMISSION.LEAD.VIEW','ADMISSION.LEAD.CREATE','STUDENT.STUDENT.VIEW','STAFF.LEAVE.CREATE'],
    },
  },

  init(){ if(!this._get('seeded')){ this._seed(); this._set('seeded',true); } if(!this._get(this.COLS.SESSION_ROLE)) this.setRole('Teacher'); },
  _get(k){ try{ const d=sessionStorage.getItem(this.PFX+k); return d?JSON.parse(d):null; }catch{ return null; } },
  _set(k,v){ sessionStorage.setItem(this.PFX+k,JSON.stringify(v)); },

  /* ---- active role (prototype role switcher for review) ---- */
  setRole(r){ this._set(this.COLS.SESSION_ROLE,r); },
  role(){ return this._get(this.COLS.SESSION_ROLE)||'Teacher'; },
  profile(){ return this.ROLE_PROFILES[this.role()]; },
  perms(){ return this.profile().perms; },
  can(code){ return this.perms().includes(code); },

  _seed(){
    // Leads / admissions funnel
    const stages=['Enquiry','Contacted','Visited','Applied','Admitted'];
    const names=['Karthik Subramanian','Priya Venkatesh','Arjun Mehta','Sneha Pillai','Rohan Das','Ananya Bose','Ishita Reddy','Vivek Nair','Meghna Iyer','Aditya Rao','Tanvi Shah','Nikhil Kumar'];
    const classes=['Nursery','LKG','UKG','Class 1','Class 2','Class 3'];
    const sources=['Walk-in','Phone','Referral','Website','Social media'];
    const leads=names.map((nm,i)=>{
      const daysAgo=(i*4)%40;
      const d=new Date(); d.setDate(d.getDate()-daysAgo);
      return {id:'LEAD-'+String(101+i), childName:nm, parentName:(i%2?'Mr. ':'Mrs. ')+nm.split(' ')[1],
        phone:`+91 9${String(700000000+i*53).slice(0,9)}`, classInterested:classes[i%classes.length],
        source:sources[i%sources.length], stage:stages[i%stages.length], notes:[],
        followUp: i%3===0 ? (()=>{const f=new Date();f.setDate(f.getDate()+((i%5)));return f.toISOString().split('T')[0];})() : null,
        createdAt:d.toISOString()};
    });
    this._set(this.COLS.LEADS,leads);

    // Leave requests (for Principal approvals + staff's own)
    const leaveTypes=['Casual','Sick','Personal'];
    const staffNames=[['Divya Krishnan','Teacher'],['Ravi Kumar','Teacher'],['Meera Nair','Accountant'],['Sneha Iyer','Teacher'],['Vikram Rao','Receptionist']];
    const leaves=staffNames.map((s,i)=>{
      const from=new Date(); from.setDate(from.getDate()+2+i);
      const to=new Date(from); to.setDate(to.getDate()+(i%3));
      return {id:'LV-'+String(201+i), staffName:s[0], staffRole:s[1], type:leaveTypes[i%3],
        from:from.toISOString().split('T')[0], to:to.toISOString().split('T')[0], days:(i%3)+1,
        reason:['Family function','Fever','Personal work','Medical','Out of town'][i%5],
        status: i<3?'Pending':'Approved', createdAt:new Date(Date.now()-i*86400000).toISOString()};
    });
    this._set(this.COLS.LEAVES,leaves);

    // Admission applications ready for principal decision
    const apps=leads.filter(l=>l.stage==='Applied').map((l,i)=>({
      id:'APP-'+String(301+i), childName:l.childName, classApplied:l.classInterested,
      parentName:l.parentName, phone:l.phone, status:'Pending', leadId:l.id,
      createdAt:new Date(Date.now()-i*86400000).toISOString()}));
    this._set(this.COLS.APPLICATIONS,apps);

    // today's attendance state (empty = not marked yet)
    this._set(this.COLS.ATTENDANCE,{});
  },

  /* ---- leads ---- */
  leads(){ return this._get(this.COLS.LEADS)||[]; },
  leadById(id){ return this.leads().find(l=>l.id===id); },
  addLead(data){
    const leads=this.leads();
    const lead={id:'LEAD-'+String(Date.now()).slice(-5), stage:'Enquiry', notes:[], createdAt:new Date().toISOString(), ...data};
    leads.unshift(lead); this._set(this.COLS.LEADS,leads); return lead;
  },
  moveLeadStage(id,stage){ const leads=this.leads(); const l=leads.find(x=>x.id===id); if(l){l.stage=stage;this._set(this.COLS.LEADS,leads);} return l; },
  addLeadNote(id,note){ const leads=this.leads(); const l=leads.find(x=>x.id===id); if(l){l.notes.push({text:note,at:new Date().toISOString()});this._set(this.COLS.LEADS,leads);} return l; },
  funnel(){
    const stages=['Enquiry','Contacted','Visited','Applied','Admitted']; const leads=this.leads();
    return stages.map(s=>({stage:s,count:leads.filter(l=>l.stage===s).length}));
  },
  followUpsDue(){ const today=new Date().toISOString().split('T')[0]; return this.leads().filter(l=>l.followUp&&l.followUp<=today); },

  /* ---- leaves ---- */
  leaves(){ return this._get(this.COLS.LEAVES)||[]; },
  pendingLeaves(){ return this.leaves().filter(l=>l.status==='Pending'); },
  myLeaves(){ const me=this.profile().name; return this.leaves().filter(l=>l.staffName===me); },
  decideLeave(id,status){ const ls=this.leaves(); const l=ls.find(x=>x.id===id); if(l){l.status=status;this._set(this.COLS.LEAVES,ls);} return l; },
  addLeave(data){ const ls=this.leaves(); const lv={id:'LV-'+String(Date.now()).slice(-5),staffName:this.profile().name,staffRole:this.role(),status:'Pending',createdAt:new Date().toISOString(),...data}; ls.unshift(lv); this._set(this.COLS.LEAVES,ls); return lv; },

  /* ---- applications ---- */
  applications(){ return this._get(this.COLS.APPLICATIONS)||[]; },
  pendingApplications(){ return this.applications().filter(a=>a.status==='Pending'); },
  decideApplication(id,status){ const as=this.applications(); const a=as.find(x=>x.id===id); if(a){a.status=status;this._set(this.COLS.APPLICATIONS,as);} return a; },

  /* ---- attendance (per section, per day) ---- */
  attendanceKey(section){ return section+'|'+new Date().toISOString().split('T')[0]; },
  getAttendance(section){ const all=this._get(this.COLS.ATTENDANCE)||{}; return all[this.attendanceKey(section)]||null; },
  saveAttendance(section,marks){ const all=this._get(this.COLS.ATTENDANCE)||{}; all[this.attendanceKey(section)]={marks,savedAt:new Date().toISOString()}; this._set(this.COLS.ATTENDANCE,all); },
  sectionRoster(section){ return FounderDB._allStudents().filter(s=>s.section===section); },
  mySections(){ // teacher's assigned sections (from profile; demo: their section + one more)
    const p=this.profile(); if(p.section) return [p.section, '4-A']; return [];
  },

  /* ---- today collection (accountant dashboard) reuses FounderDB ---- */
  todayCollection(){ return FounderDB.collectedInPeriod('today'); },

  reset(){ Object.keys(sessionStorage).filter(k=>k.startsWith(this.PFX)).forEach(k=>sessionStorage.removeItem(k)); this.init(); },
};
StaffDB.init();
