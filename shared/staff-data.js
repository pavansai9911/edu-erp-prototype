/**
 * ============================================================================
 *  NextGen EduERP — Staff Domain Data & RBAC Model  (Phase A rebuild)
 *  shared/staff-data.js
 *
 *  Mirrors the FROZEN backend RBAC exactly:
 *   - Permissions are atoms:  MODULE.RESOURCE.ACTION  (rbac.permission)
 *   - Roles are editable bundles of permissions       (rbac.role + role_permission)
 *   - A user is assigned a role; their EFFECTIVE permission set drives the UI
 *     (rbac.user_role_assignment -> live permissions[] from /auth/me)
 *   - Navigation & every action are computed from can(code), never role name.
 *     A brand-new custom role slots in with ZERO code changes.
 *
 *  The Staff app is used by EVERY non-founder employee (teacher, accountant,
 *  receptionist, librarian, lab assistant, counselor, ...). Each sees only
 *  what their permissions allow. Reuses FounderDB for students & fee ledger.
 * ============================================================================
 */
const StaffDB = {
  PFX:'eduerp_stf_',
  COLS:{ ROLES:'roles', STAFF:'staff_users', LEADS:'leads', LEAVES:'leaves',
         APPLICATIONS:'applications', ATTENDANCE:'attendance', STAFF_ATT:'staff_attendance',
         ACADEMIC:'academic', SESSION_USER:'active_user' },

  /* ======================================================================
     PERMISSION CATALOG — grouped by the 10 MVP backend modules.
     action in rbac.permission_action_enum. Code = MODULE.RESOURCE.ACTION
     ====================================================================== */
  CATALOG:[
    { module:'STUDENT', label:'Students & Attendance', icon:'users', perms:[
      ['STUDENT.STUDENT.VIEW','View students'],
      ['STUDENT.ATTENDANCE.VIEW','View student attendance'],
      ['STUDENT.ATTENDANCE.CREATE','Mark student attendance'],
    ]},
    { module:'FEE', label:'Fees & Payments', icon:'wallet', perms:[
      ['FEE.INVOICE.VIEW','View invoices'],
      ['FEE.INVOICE.CREATE','Create invoices'],
      ['FEE.INVOICE.EXPORT','Export invoices'],
      ['FEE.PAYMENT.VIEW','View payments'],
      ['FEE.PAYMENT.CREATE','Record payments'],
    ]},
    { module:'ADMISSION', label:'Admissions', icon:'trend', perms:[
      ['ADMISSION.LEAD.VIEW','View leads'],
      ['ADMISSION.LEAD.CREATE','Capture leads'],
      ['ADMISSION.APPLICATION.VIEW','View applications'],
      ['ADMISSION.APPLICATION.CREATE','Create applications'],
      ['ADMISSION.APPLICATION.APPROVE','Approve/decide applications'],
    ]},
    { module:'STAFF', label:'Staff & HR', icon:'briefcase', perms:[
      ['STAFF.PROFILE.VIEW','View staff'],
      ['STAFF.PROFILE.CREATE','Add staff (creates a login)'],
      ['STAFF.PROFILE.UPDATE','Edit staff'],
      ['STAFF.ATTENDANCE.VIEW','View staff attendance'],
      ['STAFF.ATTENDANCE.CREATE','Staff check-in / check-out'],
      ['STAFF.LEAVE.CREATE','Apply for leave'],
      ['STAFF.LEAVE.APPROVE','Approve leave'],
      ['STAFF.LEAVE.REJECT','Reject leave'],
    ]},
    { module:'ACADEMIC', label:'Academic Structure', icon:'building2', perms:[
      ['ACADEMIC.SECTION.VIEW','View sections'],
      ['ACADEMIC.STRUCTURE.MANAGE','Manage classes, sections & subjects'],
    ]},
    { module:'RBAC', label:'Roles & Permissions', icon:'shield', perms:[
      ['RBAC.ROLE.VIEW','View roles'],
      ['RBAC.ROLE.UPDATE','Edit roles & permissions'],
      ['RBAC.ASSIGNMENT.CREATE','Assign roles to users'],
    ]},
    { module:'REPORTS', label:'Reports', icon:'chart', perms:[
      ['REPORTS.SCHOOL.VIEW','View reports'],
    ]},
    { module:'NOTIFY', label:'Notifications', icon:'bell', perms:[
      ['NOTIFY.DISPATCH.VIEW','View notifications'],
    ]},
    { module:'AUDIT', label:'Audit', icon:'shield', perms:[
      ['AUDIT.LOG.VIEW','View audit log'],
    ]},
    { module:'ORG', label:'Organization', icon:'settings', perms:[
      ['ORG.SETTINGS.VIEW','View org settings'],
    ]},
  ],

  allPerms(){ return this.CATALOG.flatMap(m=>m.perms.map(p=>p[0])); },
  permLabel(code){ for(const m of this.CATALOG){ const p=m.perms.find(x=>x[0]===code); if(p)return p[1]; } return code; },
  moduleOf(code){ return code.split('.')[0]; },

  /* ======================================================================
     TEMPLATE ROLES — the backend platform template roles as editable bundles.
     ====================================================================== */
  TEMPLATE_ROLES:{
    PRINCIPAL:{ name:'Principal', code:'PRINCIPAL', system:true, desc:'Everything except branch management',
      perms:['STUDENT.STUDENT.VIEW','STUDENT.ATTENDANCE.VIEW','STUDENT.ATTENDANCE.CREATE',
             'FEE.INVOICE.VIEW','FEE.PAYMENT.VIEW',
             'ADMISSION.LEAD.VIEW','ADMISSION.APPLICATION.VIEW','ADMISSION.APPLICATION.APPROVE',
             'STAFF.PROFILE.VIEW','STAFF.PROFILE.CREATE','STAFF.PROFILE.UPDATE','STAFF.ATTENDANCE.VIEW',
             'STAFF.LEAVE.CREATE','STAFF.LEAVE.APPROVE','STAFF.LEAVE.REJECT',
             'ACADEMIC.SECTION.VIEW','ACADEMIC.STRUCTURE.MANAGE',
             'RBAC.ROLE.VIEW','RBAC.ROLE.UPDATE','RBAC.ASSIGNMENT.CREATE',
             'REPORTS.SCHOOL.VIEW','NOTIFY.DISPATCH.VIEW','AUDIT.LOG.VIEW','ORG.SETTINGS.VIEW'] },
    TEACHER:{ name:'Teacher', code:'TEACHER', system:true, desc:'Attendance, students, academic (scoped)',
      perms:['STUDENT.STUDENT.VIEW','STUDENT.ATTENDANCE.VIEW','STUDENT.ATTENDANCE.CREATE',
             'ACADEMIC.SECTION.VIEW','STAFF.LEAVE.CREATE','STAFF.ATTENDANCE.CREATE'] },
    ACCOUNTANT:{ name:'Accountant', code:'ACCOUNTANT', system:true, desc:'Fees, invoices, payments',
      perms:['STUDENT.STUDENT.VIEW','FEE.INVOICE.VIEW','FEE.INVOICE.CREATE','FEE.INVOICE.EXPORT',
             'FEE.PAYMENT.VIEW','FEE.PAYMENT.CREATE','REPORTS.SCHOOL.VIEW',
             'STAFF.LEAVE.CREATE','STAFF.ATTENDANCE.CREATE'] },
    RECEPTIONIST:{ name:'Receptionist', code:'RECEPTIONIST', system:true, desc:'Admissions, leads, front-desk',
      perms:['ADMISSION.LEAD.VIEW','ADMISSION.LEAD.CREATE','ADMISSION.APPLICATION.VIEW','ADMISSION.APPLICATION.CREATE',
             'STUDENT.STUDENT.VIEW','STAFF.LEAVE.CREATE','STAFF.ATTENDANCE.CREATE'] },
  },

  init(){
    if(!this._get('seeded_v2')){ this._seed(); this._set('seeded_v2',true); }
    if(!this._get(this.COLS.SESSION_USER)) this.setActiveUser(this._defaultUserId());
  },
  _get(k){ try{ const d=sessionStorage.getItem(this.PFX+k); return d?JSON.parse(d):null; }catch{ return null; } },
  _set(k,v){ sessionStorage.setItem(this.PFX+k,JSON.stringify(v)); },

  _seed(){
    const roles=Object.values(this.TEMPLATE_ROLES).map((r,i)=>({
      id:'ROLE-'+String(1+i), name:r.name, code:r.code, system:r.system, desc:r.desc, perms:[...r.perms]
    }));
    this._set(this.COLS.ROLES,roles);

    const roleId=code=>roles.find(r=>r.code===code).id;
    const staff=[
      {id:'USR-01',name:'Anjali Menon',email:'principal@sunrise.edu',designation:'Principal',department:'Administration',reportsToId:null,roleId:roleId('PRINCIPAL'),section:null,avatar:'AM',passwordSet:true},
      {id:'USR-02',name:'Divya Krishnan',email:'divya@sunrise.edu',designation:'Class Teacher',department:'Academics',reportsToId:'USR-01',roleId:roleId('TEACHER'),section:'3-A',avatar:'DK',passwordSet:true},
      {id:'USR-03',name:'Ravi Kumar',email:'ravi@sunrise.edu',designation:'Class Teacher',department:'Academics',reportsToId:'USR-01',roleId:roleId('TEACHER'),section:'4-A',avatar:'RK',passwordSet:true},
      {id:'USR-04',name:'Meera Nair',email:'accounts@sunrise.edu',designation:'Accountant',department:'Finance',reportsToId:'USR-01',roleId:roleId('ACCOUNTANT'),section:null,avatar:'MN',passwordSet:true},
      {id:'USR-05',name:'Vikram Rao',email:'reception@sunrise.edu',designation:'Front Desk Executive',department:'Administration',reportsToId:'USR-01',roleId:roleId('RECEPTIONIST'),section:null,avatar:'VR',passwordSet:true},
      {id:'USR-06',name:'Sneha Iyer',email:'sneha@sunrise.edu',designation:'Class Teacher',department:'Academics',reportsToId:'USR-01',roleId:roleId('TEACHER'),section:'5-A',avatar:'SI',passwordSet:true},
    ];
    this._set(this.COLS.STAFF,staff);

    const stages=['Enquiry','Contacted','Visited','Applied','Admitted'];
    const names=['Karthik Subramanian','Priya Venkatesh','Arjun Mehta','Sneha Pillai','Rohan Das','Ananya Bose','Ishita Reddy','Vivek Nair','Meghna Iyer','Aditya Rao','Tanvi Shah','Nikhil Kumar'];
    const classes=['Nursery','LKG','UKG','Class 1','Class 2','Class 3'];
    const sources=['Walk-in','Phone','Referral','Website','Social media'];
    const leads=names.map((nm,i)=>{ const d=new Date(); d.setDate(d.getDate()-((i*4)%40));
      return {id:'LEAD-'+String(101+i),childName:nm,parentName:(i%2?'Mr. ':'Mrs. ')+nm.split(' ')[1],
        phone:'+91 9'+String(700000000+i*53).slice(0,9),classInterested:classes[i%classes.length],
        source:sources[i%sources.length],stage:stages[i%stages.length],notes:[],
        followUp:i%3===0?(()=>{const f=new Date();f.setDate(f.getDate()+(i%5));return f.toISOString().split('T')[0];})():null,
        createdAt:d.toISOString()}; });
    this._set(this.COLS.LEADS,leads);

    const leaveTypes=['Casual','Sick','Personal'];
    const leaves=[['Divya Krishnan','Class Teacher'],['Ravi Kumar','Class Teacher'],['Meera Nair','Accountant'],['Sneha Iyer','Class Teacher'],['Vikram Rao','Front Desk Executive']].map((s,i)=>{
      const from=new Date(); from.setDate(from.getDate()+2+i); const to=new Date(from); to.setDate(to.getDate()+(i%3));
      return {id:'LV-'+String(201+i),staffName:s[0],staffRole:s[1],type:leaveTypes[i%3],
        from:from.toISOString().split('T')[0],to:to.toISOString().split('T')[0],days:(i%3)+1,
        reason:['Family function','Fever','Personal work','Medical','Out of town'][i%5],
        status:i<3?'Pending':'Approved',createdAt:new Date(Date.now()-i*86400000).toISOString()}; });
    this._set(this.COLS.LEAVES,leaves);

    const apps=leads.filter(l=>l.stage==='Applied').map((l,i)=>({id:'APP-'+String(301+i),
      childName:l.childName,classApplied:l.classInterested,parentName:l.parentName,phone:l.phone,
      status:'Pending',leadId:l.id,createdAt:new Date(Date.now()-i*86400000).toISOString()}));
    this._set(this.COLS.APPLICATIONS,apps);

    this._set(this.COLS.ATTENDANCE,{});
    this._set(this.COLS.STAFF_ATT,{});

    this._set(this.COLS.ACADEMIC,{
      classLevels:[
        {id:'CL-1',name:'Nursery'},{id:'CL-2',name:'LKG'},{id:'CL-3',name:'UKG'},
        {id:'CL-4',name:'Class 1'},{id:'CL-5',name:'Class 2'},{id:'CL-6',name:'Class 3'},
        {id:'CL-7',name:'Class 4'},{id:'CL-8',name:'Class 5'},
      ],
      sections:[
        {id:'SEC-1',name:'3-A',classLevel:'Class 3',teacher:'Divya Krishnan'},
        {id:'SEC-2',name:'4-A',classLevel:'Class 4',teacher:'Ravi Kumar'},
        {id:'SEC-3',name:'5-A',classLevel:'Class 5',teacher:'Sneha Iyer'},
      ],
      subjects:[
        {id:'SUB-1',name:'English',code:'ENG'},{id:'SUB-2',name:'Mathematics',code:'MATH'},
        {id:'SUB-3',name:'Science',code:'SCI'},{id:'SUB-4',name:'Social Studies',code:'SST'},
        {id:'SUB-5',name:'Hindi',code:'HIN'},
      ],
    });
  },

  roles(){ return this._get(this.COLS.ROLES)||[]; },
  roleById(id){ return this.roles().find(r=>r.id===id); },
  roleByCode(code){ return this.roles().find(r=>r.code===code); },
  addRole({name,desc,perms}){ const roles=this.roles(); const r={id:'ROLE-'+String(Date.now()).slice(-5),name,code:name.toUpperCase().replace(/\s+/g,'_'),system:false,desc:desc||'',perms:[...perms]}; roles.push(r); this._set(this.COLS.ROLES,roles); return r; },
  updateRole(id,patch){ const roles=this.roles(); const r=roles.find(x=>x.id===id); if(r){Object.assign(r,patch);this._set(this.COLS.ROLES,roles);} return r; },

  staffUsers(){ return this._get(this.COLS.STAFF)||[]; },
  staffUserById(id){ return this.staffUsers().find(s=>s.id===id); },
  _defaultUserId(){ return 'USR-02'; },
  addStaff({name,email,password,designation,department,reportsToId,roleId,section}){
    const staff=this.staffUsers();
    const u={id:'USR-'+String(Date.now()).slice(-5),name,email,designation,department:department||'',
      reportsToId:reportsToId||null,roleId,section:section||null,avatar:initials(name),passwordSet:!!password,createdAt:new Date().toISOString()};
    staff.push(u); this._set(this.COLS.STAFF,staff); return u;
  },
  updateStaff(id,patch){ const staff=this.staffUsers(); const u=staff.find(x=>x.id===id); if(u){Object.assign(u,patch);this._set(this.COLS.STAFF,staff);} return u; },

  setActiveUser(id){ this._set(this.COLS.SESSION_USER,id); },
  activeUser(){ return this.staffUserById(this._get(this.COLS.SESSION_USER))||this.staffUsers()[0]; },
  activeRole(){ const u=this.activeUser(); return this.roleById(u.roleId); },
  perms(){ const r=this.activeRole(); return r?r.perms:[]; },
  can(code){ return this.perms().includes(code); },
  profile(){ const u=this.activeUser(); const r=this.activeRole(); return {name:u.name,avatar:u.avatar,section:u.section,roleName:r?r.name:'-',designation:u.designation}; },
  role(){ const r=this.activeRole(); return r?r.name:'-'; },

  PERMS:{ STUDENT_VIEW:'STUDENT.STUDENT.VIEW', ATTENDANCE_CREATE:'STUDENT.ATTENDANCE.CREATE',
    FEE_VIEW:'FEE.INVOICE.VIEW', FEE_PAYMENT_CREATE:'FEE.PAYMENT.CREATE',
    LEAD_VIEW:'ADMISSION.LEAD.VIEW', LEAD_CREATE:'ADMISSION.LEAD.CREATE',
    APPLICATION_APPROVE:'ADMISSION.APPLICATION.APPROVE',
    STAFF_VIEW:'STAFF.PROFILE.VIEW', STAFF_CREATE:'STAFF.PROFILE.CREATE', STAFF_UPDATE:'STAFF.PROFILE.UPDATE',
    STAFF_ATT_CREATE:'STAFF.ATTENDANCE.CREATE', STAFF_ATT_VIEW:'STAFF.ATTENDANCE.VIEW',
    LEAVE_CREATE:'STAFF.LEAVE.CREATE', LEAVE_APPROVE:'STAFF.LEAVE.APPROVE',
    ACADEMIC_MANAGE:'ACADEMIC.STRUCTURE.MANAGE', REPORTS_VIEW:'REPORTS.SCHOOL.VIEW',
    ROLE_VIEW:'RBAC.ROLE.VIEW', ROLE_UPDATE:'RBAC.ROLE.UPDATE' },

  leads(){ return this._get(this.COLS.LEADS)||[]; },
  leadById(id){ return this.leads().find(l=>l.id===id); },
  addLead(data){ const leads=this.leads(); const lead={id:'LEAD-'+String(Date.now()).slice(-5),stage:'Enquiry',notes:[],createdAt:new Date().toISOString(),...data}; leads.unshift(lead); this._set(this.COLS.LEADS,leads); return lead; },
  moveLeadStage(id,stage){ const leads=this.leads(); const l=leads.find(x=>x.id===id); if(l){l.stage=stage;this._set(this.COLS.LEADS,leads);} return l; },
  addLeadNote(id,note){ const leads=this.leads(); const l=leads.find(x=>x.id===id); if(l){l.notes.push({text:note,at:new Date().toISOString()});this._set(this.COLS.LEADS,leads);} return l; },
  convertLead(id){ const l=this.moveLeadStage(id,'Applied'); if(l){ const apps=this.applications(); if(!apps.find(a=>a.leadId===id)){ apps.unshift({id:'APP-'+String(Date.now()).slice(-5),childName:l.childName,classApplied:l.classInterested,parentName:l.parentName,phone:l.phone,status:'Pending',leadId:id,createdAt:new Date().toISOString()}); this._set(this.COLS.APPLICATIONS,apps);} } return l; },
  funnel(){ const stages=['Enquiry','Contacted','Visited','Applied','Admitted']; const leads=this.leads(); return stages.map(s=>({stage:s,count:leads.filter(l=>l.stage===s).length})); },
  followUpsDue(){ const t=new Date().toISOString().split('T')[0]; return this.leads().filter(l=>l.followUp&&l.followUp<=t); },

  leaves(){ return this._get(this.COLS.LEAVES)||[]; },
  pendingLeaves(){ return this.leaves().filter(l=>l.status==='Pending'); },
  myLeaves(){ const me=this.activeUser().name; return this.leaves().filter(l=>l.staffName===me); },
  decideLeave(id,status){ const ls=this.leaves(); const l=ls.find(x=>x.id===id); if(l){l.status=status;this._set(this.COLS.LEAVES,ls);} return l; },
  addLeave(data){ const ls=this.leaves(); const u=this.activeUser(); const lv={id:'LV-'+String(Date.now()).slice(-5),staffName:u.name,staffRole:u.designation,status:'Pending',createdAt:new Date().toISOString(),...data}; ls.unshift(lv); this._set(this.COLS.LEAVES,ls); return lv; },

  applications(){ return this._get(this.COLS.APPLICATIONS)||[]; },
  pendingApplications(){ return this.applications().filter(a=>a.status==='Pending'); },
  applicationForLead(leadId){ return this.applications().find(a=>a.leadId===leadId); },
  decideApplication(id,status){
    const as=this.applications(); const a=as.find(x=>x.id===id);
    if(a){ a.status=status; this._set(this.COLS.APPLICATIONS,as);
      // Admitting is the one decision that advances the funnel stage — keeps the
      // pipeline/funnel views accurate to what the Principal actually decided.
      if(status==='Admitted' && a.leadId) this.moveLeadStage(a.leadId,'Admitted');
    }
    return a;
  },

  ATT_STATES:[['P','Present','chip-success'],['A','Absent','chip-danger'],['L','Leave','chip-warning'],['H','Half-day','chip-info'],['E','Excused','chip-neutral']],
  attKey(section){ return section+'|'+new Date().toISOString().split('T')[0]; },
  getAttendance(section){ const all=this._get(this.COLS.ATTENDANCE)||{}; return all[this.attKey(section)]||null; },
  saveAttendance(section,marks){ const all=this._get(this.COLS.ATTENDANCE)||{}; all[this.attKey(section)]={marks,savedAt:new Date().toISOString()}; this._set(this.COLS.ATTENDANCE,all); },
  sectionRoster(section){ return FounderDB._allStudents().filter(s=>s.section===section); },
  mySections(){ const u=this.activeUser(); if(u.section){ const secs=this._get(this.COLS.ACADEMIC).sections.map(s=>s.name); return [u.section, ...secs.filter(s=>s!==u.section)].slice(0,2); } return []; },

  staffAttKey(){ return this.activeUser().id+'|'+new Date().toISOString().split('T')[0]; },
  myStaffAttendance(){ const all=this._get(this.COLS.STAFF_ATT)||{}; return all[this.staffAttKey()]||null; },
  staffCheckIn(){ const all=this._get(this.COLS.STAFF_ATT)||{}; const k=this.staffAttKey(); all[k]=all[k]||{}; all[k].checkIn=new Date().toISOString(); this._set(this.COLS.STAFF_ATT,all); return all[k]; },
  staffCheckOut(){ const all=this._get(this.COLS.STAFF_ATT)||{}; const k=this.staffAttKey(); all[k]=all[k]||{}; all[k].checkOut=new Date().toISOString(); this._set(this.COLS.STAFF_ATT,all); return all[k]; },
  staffAttendanceRoster(){ const all=this._get(this.COLS.STAFF_ATT)||{}; const today=new Date().toISOString().split('T')[0];
    return this.staffUsers().map(u=>{ const rec=all[u.id+'|'+today]; return {name:u.name,designation:u.designation,checkIn:rec&&rec.checkIn||null,checkOut:rec&&rec.checkOut||null}; }); },
  myRecentAttendance(n){
    n=n||5; const all=this._get(this.COLS.STAFF_ATT)||{}; const u=this.activeUser(); const out=[];
    for(let i=0;i<n;i++){ const d=new Date(); d.setDate(d.getDate()-i); const key=d.toISOString().split('T')[0];
      const rec=all[u.id+'|'+key]; out.push({date:key,checkIn:rec&&rec.checkIn||null,checkOut:rec&&rec.checkOut||null}); }
    return out;
  },

  academic(){ return this._get(this.COLS.ACADEMIC)||{classLevels:[],sections:[],subjects:[]}; },
  addAcademic(kind,item){ const a=this.academic(); a[kind].push({id:kind.slice(0,3).toUpperCase()+'-'+String(Date.now()).slice(-4),...item}); this._set(this.COLS.ACADEMIC,a); return a; },
  removeAcademic(kind,id){ const a=this.academic(); a[kind]=a[kind].filter(x=>x.id!==id); this._set(this.COLS.ACADEMIC,a); },

  todayCollection(){ return FounderDB.collectedInPeriod('today'); },

  reset(){ Object.keys(sessionStorage).filter(k=>k.startsWith(this.PFX)).forEach(k=>sessionStorage.removeItem(k)); this.init(); },
};
StaffDB.init();
