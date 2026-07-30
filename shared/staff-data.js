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
         ACADEMIC:'academic', SESSION_USER:'active_user',
         AUDIT_LOGS:'audit_logs', ROLE_ASSIGNMENTS:'role_assignments',
         NOTIF_DISPATCH:'notif_dispatch' },

  /* ======================================================================
     PERMISSION CATALOG — mirrors GET /permissions → ModulePermissionGroup[]
     Each module: { module_code, module_name, permissions: [PermissionOut] }
     PermissionOut: { code, action, description }
     ====================================================================== */
  CATALOG:[
    { module_code:'STUDENT', module_name:'Students & Attendance', module:'STUDENT', label:'Students & Attendance', icon:'users', perms:[
      {code:'STUDENT.STUDENT.VIEW',    action:'View students',           description:'Read student profiles and enrolment status'},
      {code:'STUDENT.ATTENDANCE.VIEW', action:'View student attendance', description:'See historical attendance records'},
      {code:'STUDENT.ATTENDANCE.CREATE',action:'Mark student attendance',description:'Submit daily attendance for assigned sections'},
      {code:'STUDENT.STUDENT.CREATE',  action:'Add students',            description:'Enrol new students'},
      {code:'STUDENT.STUDENT.UPDATE',  action:'Edit students',           description:'Update student profile and guardian details'},
    ]},
    { module_code:'FEE', module_name:'Fees & Payments', module:'FEE', label:'Fees & Payments', icon:'wallet', perms:[
      {code:'FEE.INVOICE.VIEW',    action:'View invoices',    description:'See all invoices and fee summaries'},
      {code:'FEE.INVOICE.CREATE',  action:'Create invoices',  description:'Generate invoices from fee structures'},
      {code:'FEE.INVOICE.EXPORT',  action:'Export invoices',  description:'Download invoice data as CSV/PDF'},
      {code:'FEE.PAYMENT.VIEW',    action:'View payments',    description:'See payment history and receipts'},
      {code:'FEE.PAYMENT.CREATE',  action:'Record payments',  description:'Log fee payments and generate receipts'},
    ]},
    { module_code:'ADMISSION', module_name:'Admissions', module:'ADMISSION', label:'Admissions', icon:'trend', perms:[
      {code:'ADMISSION.LEAD.VIEW',              action:'View leads',               description:'Browse the admissions pipeline'},
      {code:'ADMISSION.LEAD.CREATE',            action:'Capture leads',            description:'Log new enquiries and track sources'},
      {code:'ADMISSION.APPLICATION.VIEW',       action:'View applications',        description:'Read formal admission applications'},
      {code:'ADMISSION.APPLICATION.CREATE',     action:'Create applications',      description:'Convert a lead to a formal application'},
      {code:'ADMISSION.APPLICATION.APPROVE',    action:'Decide applications',      description:'Admit, waitlist, or reject applicants'},
    ]},
    { module_code:'STAFF', module_name:'Staff & HR', module:'STAFF', label:'Staff & HR', icon:'briefcase', perms:[
      {code:'STAFF.PROFILE.VIEW',       action:'View staff',          description:'Read staff profiles and employment data'},
      {code:'STAFF.PROFILE.CREATE',     action:'Add staff',           description:'Create a staff account and set a login'},
      {code:'STAFF.PROFILE.UPDATE',     action:'Edit staff',          description:'Update designation, department, compliance fields'},
      {code:'STAFF.ATTENDANCE.VIEW',    action:'View staff attendance',description:'See staff check-in/out history'},
      {code:'STAFF.ATTENDANCE.CREATE',  action:'Staff self check-in', description:'Check in or out for the day'},
      {code:'STAFF.LEAVE.CREATE',       action:'Apply for leave',     description:'Submit a leave application'},
      {code:'STAFF.LEAVE.APPROVE',      action:'Approve leave',       description:'Approve pending leave requests'},
      {code:'STAFF.LEAVE.REJECT',       action:'Reject leave',        description:'Reject pending leave requests'},
    ]},
    { module_code:'ACADEMIC', module_name:'Academic Structure', module:'ACADEMIC', label:'Academic Structure', icon:'building2', perms:[
      {code:'ACADEMIC.SECTION.VIEW',       action:'View sections',                description:'See class sections and rosters'},
      {code:'ACADEMIC.STRUCTURE.MANAGE',   action:'Manage academic structure',    description:'Create/edit class levels, sections, subjects, programs'},
    ]},
    { module_code:'RBAC', module_name:'Roles & Permissions', module:'RBAC', label:'Roles & Permissions', icon:'shield', perms:[
      {code:'RBAC.ROLE.VIEW',         action:'View roles',          description:'See role definitions and permission sets'},
      {code:'RBAC.ROLE.UPDATE',       action:'Edit roles',          description:'Modify roles and their permission codes'},
      {code:'RBAC.ASSIGNMENT.CREATE', action:'Assign roles',        description:'Assign roles to staff members'},
    ]},
    { module_code:'REPORTS', module_name:'Reports', module:'REPORTS', label:'Reports', icon:'chart', perms:[
      {code:'REPORTS.SCHOOL.VIEW', action:'View reports', description:'Access fee, attendance, and admissions reports'},
    ]},
    { module_code:'NOTIFY', module_name:'Notifications', module:'NOTIFY', label:'Notifications', icon:'bell', perms:[
      {code:'NOTIFY.DISPATCH.VIEW', action:'View notifications', description:'See notification dispatch logs'},
    ]},
    { module_code:'AUDIT', module_name:'Audit', module:'AUDIT', label:'Audit', icon:'shield', perms:[
      {code:'AUDIT.LOG.VIEW', action:'View audit log', description:'Read platform-level audit trail'},
    ]},
    { module_code:'ORG', module_name:'Organization', module:'ORG', label:'Organization', icon:'settings', perms:[
      {code:'ORG.SETTINGS.VIEW', action:'View org settings', description:'See organization profile and settings'},
    ]},
  ],

  allPerms(){ return this.CATALOG.flatMap(m=>m.perms.map(p=>p.code)); },
  permLabel(code){ for(const m of this.CATALOG){ const p=m.perms.find(x=>x.code===code); if(p)return p.action; } return code; },
  permDescription(code){ for(const m of this.CATALOG){ const p=m.perms.find(x=>x.code===code); if(p)return p.description||''; } return ''; },
  moduleOf(code){ return code.split('.')[0]; },
  /* Returns ModulePermissionGroup[] for the full permission catalogue */
  permissionCatalog(){ return this.CATALOG.map(m=>({module_code:m.module_code,module_name:m.module_name,permissions:m.perms})); },

  /* ======================================================================
     TEMPLATE ROLES — the backend platform template roles as editable bundles.
     ====================================================================== */
  TEMPLATE_ROLES:{
    PRINCIPAL:{ role_name:'Principal', role_code:'PRINCIPAL', is_system_role:true, hierarchy_level:1,
      description:'Full school access — attendance, admissions, approvals, HR',
      perms:['STUDENT.STUDENT.VIEW','STUDENT.ATTENDANCE.VIEW','STUDENT.ATTENDANCE.CREATE',
             'STUDENT.STUDENT.CREATE','STUDENT.STUDENT.UPDATE',
             'FEE.INVOICE.VIEW','FEE.PAYMENT.VIEW',
             'ADMISSION.LEAD.VIEW','ADMISSION.APPLICATION.VIEW','ADMISSION.APPLICATION.APPROVE',
             'STAFF.PROFILE.VIEW','STAFF.PROFILE.CREATE','STAFF.PROFILE.UPDATE','STAFF.ATTENDANCE.VIEW',
             'STAFF.LEAVE.CREATE','STAFF.LEAVE.APPROVE','STAFF.LEAVE.REJECT',
             'ACADEMIC.SECTION.VIEW','ACADEMIC.STRUCTURE.MANAGE',
             'RBAC.ROLE.VIEW','RBAC.ROLE.UPDATE','RBAC.ASSIGNMENT.CREATE',
             'REPORTS.SCHOOL.VIEW','NOTIFY.DISPATCH.VIEW','AUDIT.LOG.VIEW','ORG.SETTINGS.VIEW'] },
    TEACHER:{ role_name:'Teacher', role_code:'TEACHER', is_system_role:true, hierarchy_level:4,
      description:'Student attendance, academic view (section-scoped)',
      perms:['STUDENT.STUDENT.VIEW','STUDENT.ATTENDANCE.VIEW','STUDENT.ATTENDANCE.CREATE',
             'ACADEMIC.SECTION.VIEW','STAFF.LEAVE.CREATE','STAFF.ATTENDANCE.CREATE'] },
    ACCOUNTANT:{ role_name:'Accountant', role_code:'ACCOUNTANT', is_system_role:true, hierarchy_level:3,
      description:'Fees, invoices, payments, reports',
      perms:['STUDENT.STUDENT.VIEW','FEE.INVOICE.VIEW','FEE.INVOICE.CREATE','FEE.INVOICE.EXPORT',
             'FEE.PAYMENT.VIEW','FEE.PAYMENT.CREATE','REPORTS.SCHOOL.VIEW',
             'STAFF.LEAVE.CREATE','STAFF.ATTENDANCE.CREATE'] },
    RECEPTIONIST:{ role_name:'Receptionist', role_code:'RECEPTIONIST', is_system_role:true, hierarchy_level:3,
      description:'Admissions pipeline, leads, front-desk',
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
    /* Seed roles with RoleOut + RoleDetailOut fields:
       public_id, role_name, role_code, is_system_role, hierarchy_level, description, is_active, permission_codes */
    const roles=Object.values(this.TEMPLATE_ROLES).map((r,i)=>({
      // RoleDetailOut fields
      public_id:'ROLE-'+String(1+i), id:'ROLE-'+String(1+i),
      role_name:r.role_name, role_code:r.role_code,
      is_system_role:r.is_system_role, hierarchy_level:r.hierarchy_level,
      description:r.description, is_active:true,
      permission_codes:[...r.perms],
      // compat aliases used throughout existing SPA code
      name:r.role_name, code:r.role_code, system:r.is_system_role,
      desc:r.description, perms:[...r.perms],
    }));
    this._set(this.COLS.ROLES,roles);

    const roleId=code=>roles.find(r=>r.code===code).id;
    const DEMO_PW='Welcome@123'; // fixed demo password — no real backend, all seeded staff share it
    const now=new Date().toISOString();
    const daysAgo=n=>{ const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString(); };
    const staff=[
      {id:'USR-01',name:'Anjali Menon',email:'principal@sunrise.edu',password:DEMO_PW,designation:'Principal',department:'Administration',reportsToId:null,roleId:roleId('PRINCIPAL'),section:null,avatar:'AM',passwordSet:true,
       /* UserOut fields */ public_id:'USR-01',full_name:'Anjali Menon',phone_number:'+91 98450 10001',is_active:true,is_platform_admin:false,last_login_at:daysAgo(0),employee_code:'EMP-001',date_of_joining:'2022-06-01',employment_type:'full_time'},
      {id:'USR-02',name:'Divya Krishnan',email:'divya@sunrise.edu',password:DEMO_PW,designation:'Class Teacher',department:'Academics',reportsToId:'USR-01',roleId:roleId('TEACHER'),section:'3-A',avatar:'DK',passwordSet:true,
       public_id:'USR-02',full_name:'Divya Krishnan',phone_number:'+91 98450 10002',is_active:true,is_platform_admin:false,last_login_at:daysAgo(1),employee_code:'EMP-002',date_of_joining:'2023-06-01',employment_type:'full_time'},
      {id:'USR-03',name:'Ravi Kumar',email:'ravi@sunrise.edu',password:DEMO_PW,designation:'Class Teacher',department:'Academics',reportsToId:'USR-01',roleId:roleId('TEACHER'),section:'4-A',avatar:'RK',passwordSet:true,
       public_id:'USR-03',full_name:'Ravi Kumar',phone_number:'+91 98450 10003',is_active:true,is_platform_admin:false,last_login_at:daysAgo(2),employee_code:'EMP-003',date_of_joining:'2023-07-01',employment_type:'full_time'},
      {id:'USR-04',name:'Meera Nair',email:'accounts@sunrise.edu',password:DEMO_PW,designation:'Accountant',department:'Finance',reportsToId:'USR-01',roleId:roleId('ACCOUNTANT'),section:null,avatar:'MN',passwordSet:true,
       public_id:'USR-04',full_name:'Meera Nair',phone_number:'+91 98450 10004',is_active:true,is_platform_admin:false,last_login_at:daysAgo(0),employee_code:'EMP-004',date_of_joining:'2023-01-15',employment_type:'full_time'},
      {id:'USR-05',name:'Vikram Rao',email:'reception@sunrise.edu',password:DEMO_PW,designation:'Front Desk Executive',department:'Administration',reportsToId:'USR-01',roleId:roleId('RECEPTIONIST'),section:null,avatar:'VR',passwordSet:true,
       public_id:'USR-05',full_name:'Vikram Rao',phone_number:'+91 98450 10005',is_active:true,is_platform_admin:false,last_login_at:daysAgo(3),employee_code:'EMP-005',date_of_joining:'2024-03-01',employment_type:'contract'},
      {id:'USR-06',name:'Sneha Iyer',email:'sneha@sunrise.edu',password:DEMO_PW,designation:'Class Teacher',department:'Academics',reportsToId:'USR-01',roleId:roleId('TEACHER'),section:'5-A',avatar:'SI',passwordSet:true,
       public_id:'USR-06',full_name:'Sneha Iyer',phone_number:'+91 98450 10006',is_active:true,is_platform_admin:false,last_login_at:daysAgo(1),employee_code:'EMP-006',date_of_joining:'2024-06-01',employment_type:'full_time'},
    ];
    this._set(this.COLS.STAFF,staff);

    /* Seed RoleAssignmentOut records (mirrors POST /users/{id}/role-assignments) */
    const roleAssignments=staff.map(u=>({
      public_id:'RA-'+u.id, user_public_id:u.id,
      role_public_id:u.roleId, role_code:Object.values(this.TEMPLATE_ROLES).find(r=>roleId(r.role_code)===u.roleId)?.role_code||'',
      role_name:this.TEMPLATE_ROLES[Object.values(this.TEMPLATE_ROLES).find(r=>roleId(r.role_code)===u.roleId)?.role_code]?.role_name||'',
      valid_from:u.date_of_joining||'2022-06-01', valid_until:null, is_active:true,
    }));
    this._set(this.COLS.ROLE_ASSIGNMENTS,roleAssignments);

    /* Seed AuditLogOut records (mirrors GET /audit-logs) */
    const auditSeeds=[
      ['STAFF_CREATED',    'User',  'USR-02','Staff account created for Divya Krishnan',                  'USR-01',4],
      ['ROLE_ASSIGNED',    'User',  'USR-02','Role TEACHER assigned to Divya Krishnan',                   'USR-01',4],
      ['LEAVE_APPROVED',   'Leave', 'LV-201','Sick Leave approved for Divya Krishnan (3 days)',            'USR-01',3],
      ['STAFF_CREATED',    'User',  'USR-04','Staff account created for Meera Nair',                      'USR-01',7],
      ['ROLE_ASSIGNED',    'User',  'USR-04','Role ACCOUNTANT assigned to Meera Nair',                    'USR-01',7],
      ['INVOICE_CREATED',  'Invoice','INV-001','Fee invoice generated for Class 3-A',                     'USR-04',2],
      ['PAYMENT_RECORDED', 'Payment','PAY-001','Payment ₹5,000 recorded via UPI',                         'USR-04',2],
      ['LEAD_CREATED',     'Lead',  'LEAD-101','New enquiry captured: walk-in',                           'USR-05',1],
      ['APPLICATION_ADMITTED','Application','APP-2026-1','Application admitted — Karthik Subramanian',    'USR-01',1],
      ['PASSWORD_RESET',   'User',  'USR-03','Password reset triggered for Ravi Kumar',                  'USR-01',0],
      ['ROLE_UPDATED',     'Role',  'ROLE-2','Permissions updated for Teacher role',                     'USR-01',0],
      ['LEAVE_REJECTED',   'Leave', 'LV-205','Sick Leave rejected for Vikram Rao',                       'USR-01',1],
    ];
    const auditLogs=auditSeeds.map(([action_type,auditable_type,auditable_id,description,actor,dago],i)=>({
      public_id:'AL-'+String(1001+i),
      action_type, auditable_type, auditable_id,
      description, actor_user_public_id:actor,
      is_platform_action:false, branch_public_id:'BR-01',
      occurred_at:daysAgo(dago),
      changes:[],
    }));
    this._set(this.COLS.AUDIT_LOGS,auditLogs);

    /* Seed DispatchLogOut records — mirrors GET /notifications/dispatch-log
       DispatchLogOut: public_id, channel, recipient_user_public_id, source_type,
                       source_id, rendered_subject, rendered_body, status,
                       failure_reason, queued_at, sent_at                          */
    const dago=n=>{ const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString(); };
    const dispatchSeeds=[
      ['internal','USR-02','Leave','LV-201','Leave approved','Your Sick Leave (3 days) has been approved by Anjali Menon.',   'sent',null,0],
      ['email',   'USR-02','Leave','LV-201','Leave approved — Divya Krishnan','Your leave from 2026-07-21 to 2026-07-24 has been approved.','sent',null,0],
      ['internal','USR-03','Leave','LV-205','Leave rejected','Your Sick Leave request has been rejected.',                    'sent',null,1],
      ['sms',     'USR-03','Leave','LV-205',null,'Sunrise School: Your leave request has been rejected by the Principal.', 'sent',null,1],
      ['internal','USR-04','Invoice','INV-001','New invoice generated','Fee invoice for Class 3-A (June 2026) has been generated. Total: ₹45,000.','sent',null,2],
      ['email',   'USR-01','Leave','LV-203','Leave application received','Meera Nair has applied for 2 days Casual Leave starting 2026-08-01.','sent',null,2],
      ['internal','USR-05','Application','APP-301','Application admitted','Karthik Subramanian has been admitted to Nursery.',               'sent',null,3],
      ['internal','USR-06','Leave','LV-204','Leave pending approval','Your Earned Leave (2 days) is pending approval.',                      'sent',null,3],
      ['push',    'USR-02','Attendance','ATT-001','Attendance reminder','You have not marked attendance for 3-A today.',                     'failed','Push token not registered',4],
      ['internal','USR-01','Role','ROLE-2','Permissions updated','The Teacher role permissions were updated.',                              'sent',null,5],
    ];
    const dispatchLogs=dispatchSeeds.map(([channel,recipient,source_type,source_id,subject,body,status,failure,daysAgo],i)=>({
      public_id:'DL-'+String(1001+i),
      channel, recipient_user_public_id:recipient,
      source_type, source_id,
      rendered_subject:subject, rendered_body:body,
      status, failure_reason:failure||null,
      queued_at:dago(daysAgo),
      sent_at:status==='sent'?dago(daysAgo):null,
      read:false,
    }));
    this._set(this.COLS.NOTIF_DISPATCH,dispatchLogs);

    const stages=['Enquiry','Contacted','Visited','Applied','Admitted'];
    const apiStatusMap={Enquiry:'inquiry',Contacted:'counselling',Visited:'document_verification',Applied:'interview',Admitted:'admitted'};
    const names=['Karthik Subramanian','Priya Venkatesh','Arjun Mehta','Sneha Pillai','Rohan Das','Ananya Bose','Ishita Reddy','Vivek Nair','Meghna Iyer','Aditya Rao','Tanvi Shah','Nikhil Kumar'];
    const classes=['Nursery','LKG','UKG','Class 1','Class 2','Class 3'];
    const sources=['walk_in','phone','referral','website','social_media'];
    const leads=names.map((nm,i)=>{ const d=new Date(); d.setDate(d.getDate()-((i*4)%40));
      const pid='LEAD-'+String(101+i); const stage=stages[i%stages.length];
      const ph='+91 9'+String(700000000+i*53).slice(0,9);
      return {
        /* LeadOut fields */
        public_id:pid, id:pid,
        branch_public_id:'BR-01',
        enquirer_name:(i%2?'Mr. ':'Mrs. ')+nm.split(' ')[1],
        enquirer_phone:ph,
        enquirer_email:i%3===0?nm.toLowerCase().replace(' ','.')+`@gmail.com`:null,
        interested_class_level_public_id:classes[i%classes.length],
        source_channel:sources[i%sources.length],
        status:apiStatusMap[stage],
        assigned_to_user_public_id:'USR-01',
        /* compat aliases */
        childName:nm, parentName:(i%2?'Mr. ':'Mrs. ')+nm.split(' ')[1],
        phone:ph, classInterested:classes[i%classes.length],
        source:sources[i%sources.length].replace('_',' '),
        stage, notes:[],
        followUp:i%3===0?(()=>{const f=new Date();f.setDate(f.getDate()+(i%5));return f.toISOString().split('T')[0];})():null,
        createdAt:d.toISOString(),
      };
    });
    this._set(this.COLS.LEADS,leads);

    /* Seed leave types — mirrors GET /leave-types → LeaveTypeOut[] */
    const LEAVE_TYPE_SEED=[
      {leave_type_name:'Casual Leave',     default_annual_quota:12},
      {leave_type_name:'Sick Leave',       default_annual_quota:10},
      {leave_type_name:'Earned Leave',     default_annual_quota:15},
      {leave_type_name:'Maternity Leave',  default_annual_quota:180},
      {leave_type_name:'Compensatory Leave',default_annual_quota:null},
    ];
    /* Seed leave applications — mirrors LeaveApplicationOut schema */
    const leaveSeeds=[
      ['Divya Krishnan','USR-02','Sick Leave',    7, 'Fever and rest',    'approved','USR-01'],
      ['Ravi Kumar',    'USR-03','Casual Leave',  5, 'Family function',   'approved','USR-01'],
      ['Meera Nair',    'USR-04','Casual Leave',  3, 'Personal work',     'pending', null],
      ['Sneha Iyer',    'USR-05','Earned Leave',  2, 'Travel',            'pending', null],
      ['Vikram Rao',    'USR-06','Sick Leave',    1, 'Medical check-up',  'rejected','USR-01'],
    ];
    const _today=new Date();
    const leaves=leaveSeeds.map(([staffName,staffPid,type,daysAgo,reason,status,approver],i)=>{
      const start=new Date(_today); start.setDate(_today.getDate()-(daysAgo+i*3));
      const end=new Date(start); end.setDate(start.getDate()+((i%3)+1));
      return {
        public_id:'LV-'+String(201+i), id:'LV-'+String(201+i),
        staff_profile_public_id:staffPid, staffName,
        leave_type_name:type, type,
        start_date:start.toISOString().split('T')[0],
        end_date:end.toISOString().split('T')[0],
        from:start.toISOString().split('T')[0], to:end.toISOString().split('T')[0],
        days:Math.round((end-start)/(1000*60*60*24))+1,
        reason, status,
        approved_by_user_public_id:approver||null,
        createdAt:start.toISOString(),
      };
    });
    this._set(this.COLS.LEAVES,leaves);
    this._set('leave_types',LEAVE_TYPE_SEED);

    const apps=leads.filter(l=>l.stage==='Applied').map((l,i)=>{
      const pid='APP-'+String(301+i);
      return {
        /* ApplicationOut fields */
        public_id:pid, id:pid,
        branch_public_id:'BR-01',
        admission_lead_public_id:l.public_id, leadId:l.id,
        application_code:'APP-'+new Date().getFullYear()+'-'+String(301+i),
        applicant_full_name:l.childName, childName:l.childName,
        applicant_date_of_birth:null,
        applying_class_level_public_id:l.classInterested, classApplied:l.classInterested,
        applying_academic_session_public_id:'SESS-2026',
        guardian_name:l.parentName, parentName:l.parentName,
        guardian_phone:l.phone, phone:l.phone,
        guardian_email:l.enquirer_email||null,
        status:'interview', /* pending review — matches TransitionRequest enum */
        waiting_list_rank:null, interview_score:null,
        decision_notes:null, converted_student_public_id:null,
        createdAt:new Date(Date.now()-i*86400000).toISOString(),
      };
    });
    this._set(this.COLS.APPLICATIONS,apps);

    this._set(this.COLS.ATTENDANCE,{});
    this._set(this.COLS.STAFF_ATT,{});

    /* Academic structure seed — all 5 entity types aligned to their *Out schemas */

    /* AcademicSessionOut: public_id, session_label, start_date, end_date, is_current, status */
    const academicSessions=[
      {public_id:'SESS-2026',id:'SESS-2026',session_label:'2026-27',start_date:'2026-06-01',end_date:'2027-04-30',is_current:true,status:'active'},
      {public_id:'SESS-2025',id:'SESS-2025',session_label:'2025-26',start_date:'2025-06-01',end_date:'2026-04-30',is_current:false,status:'closed'},
    ];

    /* ProgramOut: public_id, branch_public_id, department_public_id, program_name, program_code, program_level, is_active */
    const programs=[
      {public_id:'PROG-01',id:'PROG-01',branch_public_id:'BR-01',department_public_id:'DEPT-01',
       program_name:'Primary School',program_code:'PRI',program_level:'primary',
       duration_unit_count:8,duration_unit_type:'years',is_active:true},
      {public_id:'PROG-02',id:'PROG-02',branch_public_id:'BR-01',department_public_id:'DEPT-01',
       program_name:'Pre-Primary',program_code:'PRE',program_level:'pre_primary',
       duration_unit_count:3,duration_unit_type:'years',is_active:true},
    ];

    /* ClassLevelOut: public_id, branch_public_id, program_public_id, class_name, sequence_order, is_active */
    const classLevels=[
      {public_id:'CL-1',id:'CL-1',branch_public_id:'BR-01',program_public_id:'PROG-02',class_name:'Nursery',sequence_order:1,is_active:true,name:'Nursery'},
      {public_id:'CL-2',id:'CL-2',branch_public_id:'BR-01',program_public_id:'PROG-02',class_name:'LKG',sequence_order:2,is_active:true,name:'LKG'},
      {public_id:'CL-3',id:'CL-3',branch_public_id:'BR-01',program_public_id:'PROG-02',class_name:'UKG',sequence_order:3,is_active:true,name:'UKG'},
      {public_id:'CL-4',id:'CL-4',branch_public_id:'BR-01',program_public_id:'PROG-01',class_name:'Class 1',sequence_order:4,is_active:true,name:'Class 1'},
      {public_id:'CL-5',id:'CL-5',branch_public_id:'BR-01',program_public_id:'PROG-01',class_name:'Class 2',sequence_order:5,is_active:true,name:'Class 2'},
      {public_id:'CL-6',id:'CL-6',branch_public_id:'BR-01',program_public_id:'PROG-01',class_name:'Class 3',sequence_order:6,is_active:true,name:'Class 3'},
      {public_id:'CL-7',id:'CL-7',branch_public_id:'BR-01',program_public_id:'PROG-01',class_name:'Class 4',sequence_order:7,is_active:true,name:'Class 4'},
      {public_id:'CL-8',id:'CL-8',branch_public_id:'BR-01',program_public_id:'PROG-01',class_name:'Class 5',sequence_order:8,is_active:true,name:'Class 5'},
    ];

    /* SubjectOut: public_id, branch_public_id, subject_name, subject_code, is_elective, is_active */
    const subjects=[
      {public_id:'SUB-1',id:'SUB-1',branch_public_id:'BR-01',subject_name:'English',subject_code:'ENG',is_elective:false,is_active:true,name:'English',code:'ENG'},
      {public_id:'SUB-2',id:'SUB-2',branch_public_id:'BR-01',subject_name:'Mathematics',subject_code:'MATH',is_elective:false,is_active:true,name:'Mathematics',code:'MATH'},
      {public_id:'SUB-3',id:'SUB-3',branch_public_id:'BR-01',subject_name:'Science',subject_code:'SCI',is_elective:false,is_active:true,name:'Science',code:'SCI'},
      {public_id:'SUB-4',id:'SUB-4',branch_public_id:'BR-01',subject_name:'Social Studies',subject_code:'SST',is_elective:false,is_active:true,name:'Social Studies',code:'SST'},
      {public_id:'SUB-5',id:'SUB-5',branch_public_id:'BR-01',subject_name:'Hindi',subject_code:'HIN',is_elective:false,is_active:true,name:'Hindi',code:'HIN'},
      {public_id:'SUB-6',id:'SUB-6',branch_public_id:'BR-01',subject_name:'Computer Science',subject_code:'CS',is_elective:true,is_active:true,name:'Computer Science',code:'CS'},
      {public_id:'SUB-7',id:'SUB-7',branch_public_id:'BR-01',subject_name:'Physical Education',subject_code:'PE',is_elective:false,is_active:true,name:'Physical Education',code:'PE'},
    ];

    /* SectionOut: public_id, branch_public_id, class_level_public_id, academic_session_public_id, section_name, class_teacher_user_public_id, max_capacity, is_active */
    const sections=[
      {public_id:'SEC-1',id:'SEC-1',branch_public_id:'BR-01',class_level_public_id:'CL-6',academic_session_public_id:'SESS-2026',section_name:'3-A',class_teacher_user_public_id:'USR-02',max_capacity:40,is_active:true,name:'3-A',classLevel:'Class 3',teacher:'Divya Krishnan'},
      {public_id:'SEC-2',id:'SEC-2',branch_public_id:'BR-01',class_level_public_id:'CL-7',academic_session_public_id:'SESS-2026',section_name:'4-A',class_teacher_user_public_id:'USR-03',max_capacity:40,is_active:true,name:'4-A',classLevel:'Class 4',teacher:'Ravi Kumar'},
      {public_id:'SEC-3',id:'SEC-3',branch_public_id:'BR-01',class_level_public_id:'CL-8',academic_session_public_id:'SESS-2026',section_name:'5-A',class_teacher_user_public_id:'USR-05',max_capacity:40,is_active:true,name:'5-A',classLevel:'Class 5',teacher:'Sneha Iyer'},
    ];

    /* ClassSubjectMappings — ClassSubjectMappingOut per class level */
    const classSubjectMappings={
      'CL-6':[
        {subject_public_id:'SUB-1',subject_name:'English',subject_code:'ENG',credit_hours:'5',is_mandatory:true},
        {subject_public_id:'SUB-2',subject_name:'Mathematics',subject_code:'MATH',credit_hours:'5',is_mandatory:true},
        {subject_public_id:'SUB-3',subject_name:'Science',subject_code:'SCI',credit_hours:'4',is_mandatory:true},
        {subject_public_id:'SUB-4',subject_name:'Social Studies',subject_code:'SST',credit_hours:'4',is_mandatory:true},
        {subject_public_id:'SUB-5',subject_name:'Hindi',subject_code:'HIN',credit_hours:'4',is_mandatory:true},
      ],
      'CL-7':[
        {subject_public_id:'SUB-1',subject_name:'English',subject_code:'ENG',credit_hours:'5',is_mandatory:true},
        {subject_public_id:'SUB-2',subject_name:'Mathematics',subject_code:'MATH',credit_hours:'5',is_mandatory:true},
        {subject_public_id:'SUB-3',subject_name:'Science',subject_code:'SCI',credit_hours:'4',is_mandatory:true},
        {subject_public_id:'SUB-6',subject_name:'Computer Science',subject_code:'CS',credit_hours:'2',is_mandatory:false},
      ],
    };

    this._set(this.COLS.ACADEMIC,{classLevels,sections,subjects,programs,academicSessions,classSubjectMappings});
  },

  roles(){ return this._get(this.COLS.ROLES)||[]; },
  roleById(id){ return this.roles().find(r=>r.public_id===id||r.id===id); },
  roleByCode(code){ return this.roles().find(r=>r.role_code===code||r.code===code); },
  can(permCode){ const r=this.activeRole(); return !!(r&&(r.permission_codes||r.perms||[]).includes(permCode)); },

  /* mirrors POST /roles (RoleCreate):
     required: role_name, role_code  optional: description, hierarchy_level */
  addRole({role_name,role_code,description,hierarchy_level,perms}){
    const roles=this.roles();
    if(roles.some(r=>r.role_code===role_code||r.code===role_code))
      return {error:'A role with that code already exists.'};
    const pid='ROLE-'+String(Date.now()).slice(-5);
    const r={
      // RoleDetailOut fields
      public_id:pid, id:pid,
      role_name, role_code,
      is_system_role:false, hierarchy_level:hierarchy_level||null,
      description:description||'', is_active:true,
      permission_codes:[...(perms||[])],
      // compat aliases
      name:role_name, code:role_code, system:false,
      desc:description||'', perms:[...(perms||[])],
    };
    roles.push(r); this._set(this.COLS.ROLES,roles); return r;
  },

  /* mirrors PATCH /roles/{id} (RoleUpdate):
     role_name, description, hierarchy_level, is_active  — NO role_code update */
  updateRole(id,patch){
    const roles=this.roles(); const r=roles.find(x=>x.public_id===id||x.id===id);
    if(!r) return null;
    if(patch.role_name!==undefined){ r.role_name=patch.role_name; r.name=patch.role_name; }
    if(patch.description!==undefined){ r.description=patch.description; r.desc=patch.description; }
    if(patch.hierarchy_level!==undefined) r.hierarchy_level=patch.hierarchy_level;
    if(patch.is_active!==undefined) r.is_active=patch.is_active;
    this._set(this.COLS.ROLES,roles); return r;
  },

  /* mirrors PUT /roles/{id}/permissions (RolePermissionsUpdate{permission_codes:[]}) */
  updateRolePermissions(id,permission_codes){
    const roles=this.roles(); const r=roles.find(x=>x.public_id===id||x.id===id);
    if(!r) return null;
    r.permission_codes=[...permission_codes];
    r.perms=[...permission_codes]; // keep compat alias in sync
    this._set(this.COLS.ROLES,roles); return r;
  },

  /* mirrors DELETE /roles/{id} — system roles cannot be deleted */
  deleteRole(id){
    const roles=this.roles(); const r=roles.find(x=>x.public_id===id||x.id===id);
    if(!r) return {error:'Role not found.'};
    if(r.is_system_role||r.system) return {error:'System roles cannot be deleted.'};
    const inUse=this.staffUsers().some(u=>u.roleId===id);
    if(inUse) return {error:'This role is assigned to staff. Re-assign them first.'};
    this._set(this.COLS.ROLES,roles.filter(x=>x.public_id!==id&&x.id!==id)); return true;
  },

  /* addStaff below already calls staffUsers() — defined later */
  _defaultUserId(){ return 'USR-02'; },
  /* addStaff — mirrors POST /staff (StaffCreate):
     required: branch_public_id, role_public_id, employee_code, designation, date_of_joining
     optional: full_name, email, phone_number, password, employment_type, reporting_to_user_public_id */
  addStaff({name,email,phone_number,password,designation,department,reportsToId,roleId,
             section,employee_code,date_of_joining,employment_type}){
    const staff=this.staffUsers();
    const empCode=employee_code||('EMP-'+String(Date.now()).slice(-5));
    const u={
      id:'USR-'+String(Date.now()).slice(-5),
      // StaffOut fields
      public_id:'USR-'+String(Date.now()).slice(-5),
      full_name:name, name,
      email, phone_number:phone_number||null,
      branch_public_id:'BR-01', branch_code:'MAIN',
      employee_code:empCode,
      designation,
      date_of_joining:date_of_joining||new Date().toISOString().split('T')[0],
      employment_type:employment_type||'full_time',
      reporting_to_user_public_id:reportsToId||null,
      is_active:true,
      // prototype-only fields
      department:department||'', reportsToId:reportsToId||null,
      roleId, section:section||null,
      avatar:initials(name), password:password||'', passwordSet:!!password,
      createdAt:new Date().toISOString(),
    };
    staff.push(u); this._set(this.COLS.STAFF,staff); return u;
  },
  updateStaff(id,patch){
    const staff=this.staffUsers(); const u=staff.find(x=>x.id===id);
    if(u){
      Object.assign(u,patch);
      // keep full_name and name in sync
      if(patch.name) u.full_name=patch.name;
      if(patch.full_name) u.name=patch.full_name;
      this._set(this.COLS.STAFF,staff);
    }
    return u;
  },

  setActiveUser(id){ this._set(this.COLS.SESSION_USER,id); },
  activeUser(){ return this.staffUserById(this._get(this.COLS.SESSION_USER))||this.staffUsers()[0]; },
  activeRole(){ const u=this.activeUser(); return this.roleById(u.roleId); },
  perms(){ const r=this.activeRole(); return r?(r.permission_codes||r.perms):[]; },
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
  leadById(id){ return this.leads().find(l=>l.public_id===id||l.id===id); },

  /* mirrors POST /admissions/leads (LeadCreate) */
  addLead({enquirer_name,enquirer_phone,enquirer_email,source_channel,
            interested_class_level_public_id,assigned_to_user_public_id,
            // compat aliases still accepted
            childName,parentName,phone,classInterested,source}){
    const leads=this.leads();
    const pid='LEAD-'+String(Date.now()).slice(-6);
    const name=enquirer_name||childName||'';
    const ph=enquirer_phone||phone||'';
    const lead={
      // LeadOut fields
      public_id:pid, id:pid,
      branch_public_id:'BR-01',
      enquirer_name:name,
      enquirer_phone:ph,
      enquirer_email:enquirer_email||null,
      interested_class_level_public_id:interested_class_level_public_id||null,
      source_channel:source_channel||source||null,
      status:'inquiry',
      assigned_to_user_public_id:assigned_to_user_public_id||this.activeUser().id,
      // compat aliases (drive existing UI)
      childName:name, parentName:parentName||name,
      phone:ph, classInterested:classInterested||interested_class_level_public_id||'',
      source:source_channel||source||'Walk-in',
      stage:'Enquiry',
      notes:[], createdAt:new Date().toISOString(),
    };
    leads.unshift(lead); this._set(this.COLS.LEADS,leads); return lead;
  },

  /* mirrors PATCH /admissions/leads/{id} (LeadUpdate) */
  updateLead(id,patch){
    const leads=this.leads(); const l=leads.find(x=>x.public_id===id||x.id===id);
    if(!l) return null;
    const allowed=['enquirer_name','enquirer_phone','enquirer_email',
                   'interested_class_level_public_id','source_channel','status',
                   'assigned_to_user_public_id'];
    allowed.forEach(k=>{ if(patch[k]!==undefined) l[k]=patch[k]; });
    // sync compat aliases
    if(patch.enquirer_name){ l.childName=patch.enquirer_name; l.parentName=patch.enquirer_name; }
    if(patch.enquirer_phone) l.phone=patch.enquirer_phone;
    if(patch.source_channel) l.source=patch.source_channel;
    if(patch.status) l.stage=this._apiStatusToStage(patch.status);
    this._set(this.COLS.LEADS,leads); return l;
  },
  _apiStatusToStage(status){
    const map={inquiry:'Enquiry',counselling:'Contacted',document_verification:'Visited',
               interview:'Applied',admitted:'Admitted',rejected:'Rejected',
               waiting_list:'Waitlisted',cancelled:'Cancelled',transferred:'Transferred',lead:'Enquiry'};
    return map[status]||status;
  },
  moveLeadStage(id,stage){ return this.updateLead(id,{status:this._stageToApiStatus(stage)})||this.leads().find(x=>x.id===id); },
  _stageToApiStatus(stage){
    const map={Enquiry:'inquiry',Contacted:'counselling',Visited:'document_verification',
               Applied:'interview',Admitted:'admitted',Rejected:'rejected',
               Waitlisted:'waiting_list',Cancelled:'cancelled',Transferred:'transferred'};
    return map[stage]||'inquiry';
  },
  addLeadNote(id,note){ const leads=this.leads(); const l=leads.find(x=>x.public_id===id||x.id===id); if(l){l.notes=l.notes||[]; l.notes.push({text:note,at:new Date().toISOString()});this._set(this.COLS.LEADS,leads);} return l; },

  /* mirrors POST /admissions/leads/{id}/convert (ConvertLeadRequest → ApplicationOut) */
  convertLead(id,{applicant_full_name,applicant_date_of_birth,applying_class_level_public_id,
                   guardian_name,guardian_phone,guardian_email,application_code}={}){
    const leads=this.leads(); const l=leads.find(x=>x.public_id===id||x.id===id); if(!l) return null;
    l.status='interview'; l.stage='Applied'; this._set(this.COLS.LEADS,leads);
    const apps=this.applications();
    if(apps.find(a=>a.admission_lead_public_id===l.public_id||a.leadId===l.id)) return l;
    const appPid='APP-'+String(Date.now()).slice(-6);
    const app={
      // ApplicationOut fields
      public_id:appPid, id:appPid,
      branch_public_id:l.branch_public_id||'BR-01',
      admission_lead_public_id:l.public_id, leadId:l.id,
      application_code:application_code||('APP-'+new Date().getFullYear()+'-'+String(Date.now()).slice(-4)),
      applicant_full_name:applicant_full_name||l.enquirer_name||l.childName,
      applicant_date_of_birth:applicant_date_of_birth||null,
      applying_class_level_public_id:applying_class_level_public_id||l.interested_class_level_public_id||l.classInterested||'',
      applying_academic_session_public_id:'SESS-2026',
      guardian_name:guardian_name||l.parentName||l.enquirer_name,
      guardian_phone:guardian_phone||l.enquirer_phone||l.phone,
      guardian_email:guardian_email||l.enquirer_email||null,
      status:'interview', // matches to_status enum
      waiting_list_rank:null, interview_score:null,
      decision_notes:null, converted_student_public_id:null,
      // compat
      childName:applicant_full_name||l.childName, classApplied:l.classInterested||'',
      parentName:guardian_name||l.parentName, phone:guardian_phone||l.phone,
      createdAt:new Date().toISOString(),
    };
    apps.unshift(app); this._set(this.COLS.APPLICATIONS,apps); return app;
  },

  /* mirrors POST /admissions/applications/{id}/transition (TransitionRequest):
     to_status: enum['lead','inquiry','counselling','document_verification','interview',
                     'admitted','waiting_list','rejected','cancelled','transferred']
     remarks (optional), section_public_id (optional, for 'admitted') */
  transitionApplication(id,{to_status,remarks,section_public_id}){
    const as=this.applications(); const a=as.find(x=>x.public_id===id||x.id===id);
    if(!a) return null;
    a.status=to_status;
    if(remarks) a.decision_notes=remarks;
    if(section_public_id) a.section_public_id=section_public_id;
    this._set(this.COLS.APPLICATIONS,as);
    // sync lead stage when application reaches a terminal status
    if(a.admission_lead_public_id||a.leadId){
      const stage=this._apiStatusToStage(to_status);
      this.moveLeadStage(a.admission_lead_public_id||a.leadId,stage);
    }
    return a;
  },

  /* backward-compat wrapper (Approvals screen) — maps old status strings to transitions */
  decideApplication(id,status){
    const statusMap={'Admitted':'admitted','Rejected':'rejected','Waitlisted':'waiting_list','Pending':'interview'};
    return this.transitionApplication(id,{to_status:statusMap[status]||status.toLowerCase()});
  },

  funnel(){
    /* Mirrors GET /admissions/funnel-summary → FunnelSummaryEntry[] */
    const stages=['Enquiry','Contacted','Visited','Applied','Admitted'];
    const leads=this.leads();
    return stages.map(s=>({stage:s,count:leads.filter(l=>l.stage===s).length}));
  },
  followUpsDue(){ const t=new Date().toISOString().split('T')[0]; return this.leads().filter(l=>l.followUp&&l.followUp<=t); },

  /* ---- Leave types — mirrors GET /leave-types → LeaveTypeOut[] ---- */
  leaveTypes(){ return this._get('leave_types')||[]; },
  leaveTypeNames(){ return this.leaveTypes().map(t=>t.leave_type_name); },

  /* ---- Leave applications — mirrors LeaveApplicationOut shape ---- */
  leaves(){ return this._get(this.COLS.LEAVES)||[]; },
  pendingLeaves(){ return this.leaves().filter(l=>l.status==='pending'); },
  myLeaves(){
    const me=this.activeUser(); const myId=me.id;
    return this.leaves().filter(l=>l.staff_profile_public_id===myId||l.staffName===me.name);
  },
  leavesByStatus(status){ return this.leaves().filter(l=>l.status===status); },

  /* mirrors POST /leave-applications (LeaveApplicationCreate) */
  addLeave({leave_type_name,start_date,end_date,reason}){
    const ls=this.leaves(); const u=this.activeUser();
    const start=new Date(start_date); const end=new Date(end_date);
    const days=Math.max(1,Math.round((end-start)/(1000*60*60*24))+1);
    const lv={
      public_id:'LV-'+String(Date.now()).slice(-6),
      id:'LV-'+String(Date.now()).slice(-6),
      staff_profile_public_id:u.id, staffName:u.name,
      leave_type_name, type:leave_type_name,
      start_date, end_date,
      from:start_date, to:end_date, days,
      reason:reason||null,
      status:'pending',
      approved_by_user_public_id:null,
      createdAt:new Date().toISOString(),
    };
    ls.unshift(lv); this._set(this.COLS.LEAVES,ls); return lv;
  },

  /* mirrors POST /leave-applications/{id}/approve — no body */
  approveLeave(id){
    const ls=this.leaves(); const l=ls.find(x=>x.public_id===id||x.id===id);
    if(!l) return null;
    l.status='approved';
    l.approved_by_user_public_id=this.activeUser().id;
    this._set(this.COLS.LEAVES,ls);
    const applicant=this.staffUserById(l.staff_profile_public_id);
    if(applicant){
      this._addDispatchLog({channel:'internal',recipient_user_public_id:applicant.public_id||applicant.id,
        source_type:'Leave',source_id:id,
        rendered_subject:'Leave approved',
        rendered_body:`Your ${l.leave_type_name||l.type} has been approved.${l.days?' ('+l.days+' day'+(l.days!==1?'s':'')+')':''}`,status:'sent'});
    }
    return l;
  },

  /* mirrors POST /leave-applications/{id}/reject — no body */
  rejectLeave(id){
    const ls=this.leaves(); const l=ls.find(x=>x.public_id===id||x.id===id);
    if(!l) return null;
    l.status='rejected';
    l.approved_by_user_public_id=this.activeUser().id;
    this._set(this.COLS.LEAVES,ls);
    const applicant=this.staffUserById(l.staff_profile_public_id);
    if(applicant){
      this._addDispatchLog({channel:'internal',recipient_user_public_id:applicant.public_id||applicant.id,
        source_type:'Leave',source_id:id,
        rendered_subject:'Leave rejected',
        rendered_body:`Your ${l.leave_type_name||l.type} request has been rejected.`,status:'sent'});
    }
    return l;
  },

  /* backward-compat wrapper used by existing Approvals screen */
  decideLeave(id,status){
    if(status==='Approved'||status==='approved') return this.approveLeave(id);
    return this.rejectLeave(id);
  },

  applications(){ return this._get(this.COLS.APPLICATIONS)||[]; },
  applicationById(id){ return this.applications().find(a=>a.public_id===id||a.id===id); },
  pendingApplications(){ return this.applications().filter(a=>a.status==='interview'||a.status==='Pending'); },
  applicationForLead(leadId){ return this.applications().find(a=>a.admission_lead_public_id===leadId||a.leadId===leadId); },
  decideApplication(id,status){
    const as=this.applications(); const a=as.find(x=>x.id===id);
    if(a){ a.status=status; this._set(this.COLS.APPLICATIONS,as);
      // Admitting is the one decision that advances the funnel stage — keeps the
      // pipeline/funnel views accurate to what the Principal actually decided.
      if(status==='Admitted' && a.leadId) this.moveLeadStage(a.leadId,'Admitted');
    }
    return a;
  },

  /* ATT_STATES: internal codes used in the prototype store.
     Claude Code maps these to StudentAttendanceEntry.status enum on POST /attendance/students/bulk:
       P → 'present'  |  A → 'absent'  |  Lt → 'late'  |  H → 'half_day'  |  E → 'excused'  */
  ATT_STATES:[['P','Present','chip-success'],['A','Absent','chip-danger'],['Lt','Late','chip-warning'],['H','Half-day','chip-info'],['E','Excused','chip-neutral']],
  /* Helper: convert internal code to API enum value for POST /attendance/students/bulk */
  attCodeToApiStatus(code){ return {P:'present',A:'absent',Lt:'late',H:'half_day',E:'excused'}[code]||'absent'; },
  attKey(section){ return section+'|'+new Date().toISOString().split('T')[0]; },
  getAttendance(section){ const all=this._get(this.COLS.ATTENDANCE)||{}; return all[this.attKey(section)]||null; },
  saveAttendance(section,marks){ const all=this._get(this.COLS.ATTENDANCE)||{}; all[this.attKey(section)]={marks,savedAt:new Date().toISOString()}; this._set(this.COLS.ATTENDANCE,all); },
  sectionRoster(section){ return (typeof FounderDB!=='undefined'?FounderDB._allStudents():[]).filter(s=>s.section===section).map(s=>({...s,roll:s.roll||0})); },

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

  academic(){ return this._get(this.COLS.ACADEMIC)||{classLevels:[],sections:[],subjects:[],programs:[],academicSessions:[],classSubjectMappings:{}}; },
  /* compat wrapper — still used by a few places */
  addAcademic(kind,item){ const a=this.academic(); a[kind]=a[kind]||[]; a[kind].push({public_id:kind.slice(0,3).toUpperCase()+'-'+String(Date.now()).slice(-4),id:kind.slice(0,3).toUpperCase()+'-'+String(Date.now()).slice(-4),...item}); this._set(this.COLS.ACADEMIC,a); return a; },
  removeAcademic(kind,id){ const a=this.academic(); a[kind]=(a[kind]||[]).filter(x=>x.public_id!==id&&x.id!==id); this._set(this.COLS.ACADEMIC,a); },

  /* === ACADEMIC SESSIONS (POST/PATCH /academic-sessions → AcademicSessionCreate/Out) === */
  academicSessions(){ return this.academic().academicSessions||[]; },
  currentSession(){ return this.academicSessions().find(s=>s.is_current)||this.academicSessions()[0]||null; },
  addAcademicSession({session_label,start_date,end_date,is_current}){
    const a=this.academic();
    if(is_current) (a.academicSessions||[]).forEach(s=>s.is_current=false);
    const sess={public_id:'SESS-'+String(Date.now()).slice(-5),id:'SESS-'+String(Date.now()).slice(-5),
      session_label,start_date,end_date,is_current:!!is_current,status:'active'};
    a.academicSessions=a.academicSessions||[]; a.academicSessions.unshift(sess);
    this._set(this.COLS.ACADEMIC,a); return sess;
  },
  updateAcademicSession(id,patch){
    const a=this.academic(); const s=a.academicSessions.find(x=>x.public_id===id||x.id===id); if(!s) return null;
    if(patch.is_current){ a.academicSessions.forEach(x=>x.is_current=false); }
    ['session_label','start_date','end_date','is_current','status'].forEach(k=>{if(patch[k]!==undefined)s[k]=patch[k];});
    this._set(this.COLS.ACADEMIC,a); return s;
  },

  /* === PROGRAMS (POST/PATCH/DELETE /programs → ProgramCreate/Out) === */
  programs(){ return this.academic().programs||[]; },
  addProgram({program_name,program_code,program_level,department_public_id,duration_unit_count,duration_unit_type}){
    const a=this.academic();
    if((a.programs||[]).some(p=>p.program_code.toUpperCase()===program_code.toUpperCase()))
      return {error:'A program with that code already exists.'};
    const prog={public_id:'PROG-'+String(Date.now()).slice(-5),id:'PROG-'+String(Date.now()).slice(-5),
      branch_public_id:'BR-01',department_public_id:department_public_id||'DEPT-01',
      program_name,program_code:program_code.toUpperCase(),program_level,
      duration_unit_count:duration_unit_count||null,duration_unit_type:duration_unit_type||null,is_active:true};
    a.programs=a.programs||[]; a.programs.push(prog);
    this._set(this.COLS.ACADEMIC,a); return prog;
  },
  updateProgram(id,patch){
    const a=this.academic(); const p=a.programs.find(x=>x.public_id===id||x.id===id); if(!p) return null;
    ['program_name','program_level','duration_unit_count','duration_unit_type','is_active'].forEach(k=>{if(patch[k]!==undefined)p[k]=patch[k];});
    this._set(this.COLS.ACADEMIC,a); return p;
  },
  deleteProgram(id){
    const a=this.academic();
    if((a.classLevels||[]).some(c=>c.program_public_id===id||c.program_public_id===a.programs.find(p=>p.id===id)?.public_id))
      return {error:'Remove all class levels in this program first.'};
    a.programs=(a.programs||[]).filter(p=>p.public_id!==id&&p.id!==id);
    this._set(this.COLS.ACADEMIC,a); return true;
  },

  /* === CLASS LEVELS (POST/PATCH/DELETE /class-levels → ClassLevelCreate/Out) === */
  classLevels(){ return this.academic().classLevels||[]; },
  classLevelById(id){ return this.classLevels().find(c=>c.public_id===id||c.id===id)||null; },
  addClassLevel({class_name,program_public_id,sequence_order}){
    const a=this.academic();
    const seq=parseInt(sequence_order)||((a.classLevels||[]).length+1);
    const cl={public_id:'CL-'+String(Date.now()).slice(-5),id:'CL-'+String(Date.now()).slice(-5),
      branch_public_id:'BR-01',program_public_id:program_public_id||'PROG-01',
      class_name,sequence_order:seq,is_active:true,name:class_name};
    a.classLevels=a.classLevels||[]; a.classLevels.push(cl);
    this._set(this.COLS.ACADEMIC,a); return cl;
  },
  updateClassLevel(id,patch){
    const a=this.academic(); const c=a.classLevels.find(x=>x.public_id===id||x.id===id); if(!c) return null;
    ['class_name','sequence_order','is_active'].forEach(k=>{if(patch[k]!==undefined){c[k]=patch[k];if(k==='class_name')c.name=patch[k];}});
    this._set(this.COLS.ACADEMIC,a); return c;
  },
  deleteClassLevel(id){
    const a=this.academic();
    if((a.sections||[]).some(s=>s.class_level_public_id===id))
      return {error:'Remove all sections in this class level first.'};
    a.classLevels=(a.classLevels||[]).filter(c=>c.public_id!==id&&c.id!==id);
    delete (a.classSubjectMappings||{})[id];
    this._set(this.COLS.ACADEMIC,a); return true;
  },

  /* === CLASS SUBJECT MAPPING (PUT /class-levels/{id}/subjects → ClassSubjectMappingReplace) === */
  classSubjectsForLevel(classLevelId){
    return (this.academic().classSubjectMappings||{})[classLevelId]||[];
  },
  replaceClassSubjects(classLevelId,subjects){
    /* subjects: [{subject_public_id, credit_hours, is_mandatory}] → stored as ClassSubjectMappingOut */
    const a=this.academic();
    a.classSubjectMappings=a.classSubjectMappings||{};
    const allSubjects=a.subjects||[];
    a.classSubjectMappings[classLevelId]=subjects.map(entry=>{
      const sub=allSubjects.find(s=>s.public_id===entry.subject_public_id||s.id===entry.subject_public_id);
      return {
        subject_public_id:entry.subject_public_id,
        subject_name:sub?sub.subject_name:entry.subject_public_id,
        subject_code:sub?sub.subject_code:'',
        credit_hours:String(entry.credit_hours||0),
        is_mandatory:!!entry.is_mandatory,
      };
    });
    this._set(this.COLS.ACADEMIC,a); return a.classSubjectMappings[classLevelId];
  },

  /* === SECTIONS (POST/PATCH/DELETE /sections → SectionCreate/Out) === */
  sections(){ return this.academic().sections||[]; },
  addSection({section_name,class_level_public_id,academic_session_public_id,class_teacher_user_public_id,max_capacity}){
    const a=this.academic();
    const teacher=this.staffUsers().find(u=>u.id===class_teacher_user_public_id);
    const classLevel=this.classLevelById(class_level_public_id);
    const sec={public_id:'SEC-'+String(Date.now()).slice(-5),id:'SEC-'+String(Date.now()).slice(-5),
      branch_public_id:'BR-01',class_level_public_id,
      academic_session_public_id:academic_session_public_id||'SESS-2026',
      section_name,class_teacher_user_public_id:class_teacher_user_public_id||null,
      max_capacity:parseInt(max_capacity)||null,is_active:true,
      /* compat */ name:section_name,classLevel:classLevel?classLevel.class_name:'',teacher:teacher?teacher.name:''};
    a.sections=a.sections||[]; a.sections.push(sec);
    this._set(this.COLS.ACADEMIC,a); return sec;
  },
  updateSection(id,patch){
    const a=this.academic(); const s=a.sections.find(x=>x.public_id===id||x.id===id); if(!s) return null;
    ['section_name','class_teacher_user_public_id','max_capacity','is_active'].forEach(k=>{if(patch[k]!==undefined)s[k]=patch[k];});
    if(patch.section_name) s.name=patch.section_name;
    if(patch.class_teacher_user_public_id!==undefined){ const t=this.staffUsers().find(u=>u.id===patch.class_teacher_user_public_id); s.teacher=t?t.name:''; }
    this._set(this.COLS.ACADEMIC,a); return s;
  },
  deleteSection(id){
    const a=this.academic(); a.sections=(a.sections||[]).filter(s=>s.public_id!==id&&s.id!==id);
    this._set(this.COLS.ACADEMIC,a); return true;
  },

  /* === SUBJECTS (POST/PATCH/DELETE /subjects → SubjectCreate/Out) === */
  subjects(){ return this.academic().subjects||[]; },
  addSubject({subject_name,subject_code,is_elective}){
    const a=this.academic();
    if((a.subjects||[]).some(s=>s.subject_code.toUpperCase()===subject_code.toUpperCase()))
      return {error:'A subject with that code already exists.'};
    const sub={public_id:'SUB-'+String(Date.now()).slice(-5),id:'SUB-'+String(Date.now()).slice(-5),
      branch_public_id:'BR-01',subject_name,subject_code:subject_code.toUpperCase(),
      is_elective:!!is_elective,is_active:true,name:subject_name,code:subject_code.toUpperCase()};
    a.subjects=a.subjects||[]; a.subjects.push(sub);
    this._set(this.COLS.ACADEMIC,a); return sub;
  },
  updateSubject(id,patch){
    const a=this.academic(); const s=a.subjects.find(x=>x.public_id===id||x.id===id); if(!s) return null;
    ['subject_name','is_elective','is_active'].forEach(k=>{if(patch[k]!==undefined){s[k]=patch[k];if(k==='subject_name')s.name=patch[k];}});
    this._set(this.COLS.ACADEMIC,a); return s;
  },
  deleteSubject(id){
    const a=this.academic(); a.subjects=(a.subjects||[]).filter(s=>s.public_id!==id&&s.id!==id);
    this._set(this.COLS.ACADEMIC,a); return true;
  },

  mySections(){ const u=this.activeUser(); if(u.section){ const secs=this.sections().map(s=>s.name||s.section_name); return [u.section,...secs.filter(s=>s!==u.section)].slice(0,2); } return []; },
  sectionRoster(section){ return (typeof FounderDB!=='undefined'?FounderDB._allStudents():[]).filter(s=>s.section===section).map(s=>({...s,roll:s.roll||0})); },

  /* ========================================================================
     USER MANAGEMENT (GET/PATCH /users, POST/DELETE role-assignments, reset-password)
     UserOut: public_id, full_name, email, phone_number, is_active,
              is_platform_admin, last_login_at
     ======================================================================== */
  staffUsers(){ return this._get(this.COLS.STAFF)||[]; },
  staffUserById(id){ return this.staffUsers().find(u=>u.public_id===id||u.id===id); },

  /* mirrors GET /users → UserOut[] */
  users(){ return this.staffUsers().map(u=>({
    public_id:u.public_id||u.id, full_name:u.full_name||u.name,
    email:u.email, phone_number:u.phone_number||null,
    is_active:u.is_active!==false, is_platform_admin:u.is_platform_admin||false,
    last_login_at:u.last_login_at||null,
    /* extras needed by UI */ id:u.id, name:u.name, designation:u.designation,
    roleId:u.roleId, department:u.department, passwordSet:u.passwordSet,
  })); },

  /* mirrors PATCH /users/{id} (UserUpdate) */
  updateUser(id, patch){
    const staff=this.staffUsers(); const u=staff.find(x=>x.public_id===id||x.id===id);
    if(!u) return null;
    const allowed=['full_name','email','phone_number','date_of_birth','gender','is_active'];
    allowed.forEach(k=>{
      if(patch[k]!==undefined){
        u[k]=patch[k];
        if(k==='full_name'){ u.name=patch[k]; }
        if(k==='is_active' && !patch[k]) this._auditLog('USER_DEACTIVATED','User',id,`User ${u.full_name||u.name} deactivated`,this.activeUser().id);
      }
    });
    this._set(this.COLS.STAFF,staff);
    return u;
  },

  /* mirrors POST /users/{id}/reset-password (no body) */
  resetPassword(id){
    const u=this.staffUserById(id); if(!u) return null;
    this._auditLog('PASSWORD_RESET','User',id,`Password reset triggered for ${u.full_name||u.name}`,this.activeUser().id);
    return {message:'Password reset email sent (prototype — no actual email sent)'};
  },

  /* mirrors PATCH /users/me/password (ChangeMyPasswordRequest) */
  changeMyPassword({current_password, new_password}){
    const u=this.activeUser();
    if(u.password && u.password!==current_password) return {error:'Current password is incorrect.'};
    const staff=this.staffUsers(); const me=staff.find(x=>x.id===u.id);
    if(me){ me.password=new_password; me.passwordSet=true; this._set(this.COLS.STAFF,staff); }
    this._auditLog('PASSWORD_CHANGED','User',u.id,'User changed their own password',u.id);
    return {success:true};
  },

  /* ===== ROLE ASSIGNMENTS (POST/DELETE /users/{id}/role-assignments) ===== */
  roleAssignments(){ return this._get(this.COLS.ROLE_ASSIGNMENTS)||[]; },
  roleAssignmentsForUser(userId){
    return this.roleAssignments().filter(a=>a.user_public_id===userId||a.user_public_id===userId);
  },

  /* mirrors POST /users/{id}/role-assignments (RoleAssignmentCreate) */
  assignRole(userId, {role_public_id, valid_from, valid_until}){
    const staff=this.staffUsers(); const u=staff.find(x=>x.public_id===userId||x.id===userId);
    if(!u) return null;
    const role=this.roleById(role_public_id);
    // Update staff record to reflect new primary role
    u.roleId=role_public_id; this._set(this.COLS.STAFF,staff);
    // Add RoleAssignmentOut record
    const assigns=this.roleAssignments();
    // Mark any existing assignment for this user as inactive
    assigns.filter(a=>a.user_public_id===userId).forEach(a=>a.is_active=false);
    const newAssign={
      public_id:'RA-'+String(Date.now()).slice(-6),
      user_public_id:userId,
      role_public_id, role_code:role?.role_code||role?.code||'',
      role_name:role?.role_name||role?.name||'',
      valid_from:valid_from||new Date().toISOString().split('T')[0],
      valid_until:valid_until||null, is_active:true,
    };
    assigns.push(newAssign); this._set(this.COLS.ROLE_ASSIGNMENTS,assigns);
    this._auditLog('ROLE_ASSIGNED','User',userId,`Role ${role?.role_name||role_public_id} assigned to ${u.full_name||u.name}`,this.activeUser().id);
    return newAssign;
  },

  /* mirrors DELETE /users/{id}/role-assignments?role_public_id=xxx */
  removeRoleAssignment(userId, role_public_id){
    const assigns=this.roleAssignments();
    const a=assigns.find(x=>x.user_public_id===userId&&x.role_public_id===role_public_id);
    if(a){ a.is_active=false; this._set(this.COLS.ROLE_ASSIGNMENTS,assigns); }
    return a;
  },

  /* ========================================================================
     AUDIT LOGS (GET /audit-logs → AuditLogOut[])
     AuditLogOut: action_type, auditable_type, auditable_id, description,
                  actor_user_public_id, is_platform_action, occurred_at, changes[]
     ======================================================================== */
  auditLogs(filters={}){
    let logs=[...(this._get(this.COLS.AUDIT_LOGS)||[])].sort((a,b)=>new Date(b.occurred_at)-new Date(a.occurred_at));
    if(filters.auditable_type) logs=logs.filter(l=>l.auditable_type===filters.auditable_type);
    if(filters.actor) logs=logs.filter(l=>l.actor_user_public_id===filters.actor);
    if(filters.from) logs=logs.filter(l=>l.occurred_at>=filters.from);
    if(filters.to) logs=logs.filter(l=>l.occurred_at<=filters.to);
    return logs;
  },
  _auditLog(action_type, auditable_type, auditable_id, description, actor_user_public_id){
    const logs=this._get(this.COLS.AUDIT_LOGS)||[];
    logs.unshift({
      public_id:'AL-'+String(Date.now()).slice(-6),
      action_type, auditable_type, auditable_id,
      description, actor_user_public_id,
      is_platform_action:false, branch_public_id:'BR-01',
      occurred_at:new Date().toISOString(), changes:[],
    });
    this._set(this.COLS.AUDIT_LOGS,logs);
  },

  /* ========================================================================
     NOTIFICATIONS — DISPATCH LOG
     mirrors GET /notifications/dispatch-log → DispatchLogOut[]
     query params: recipient (user public_id), status
     DispatchLogOut: public_id, channel, recipient_user_public_id, source_type,
                     source_id, rendered_subject, rendered_body, status,
                     failure_reason, queued_at, sent_at
     ======================================================================== */
  dispatchLogs(filters={}){
    let logs=[...(this._get(this.COLS.NOTIF_DISPATCH)||[])].sort((a,b)=>new Date(b.queued_at)-new Date(a.queued_at));
    if(filters.recipient) logs=logs.filter(l=>l.recipient_user_public_id===filters.recipient);
    if(filters.status)    logs=logs.filter(l=>l.status===filters.status);
    return logs;
  },
  myDispatchLogs(){
    const u=this.activeUser();
    return this.dispatchLogs({recipient:u.public_id||u.id});
  },
  unreadCount(){
    const u=this.activeUser();
    return (this._get(this.COLS.NOTIF_DISPATCH)||[]).filter(l=>
      (l.recipient_user_public_id===u.id||l.recipient_user_public_id===u.public_id)
      && l.channel==='internal' && !l.read
    ).length;
  },
  markRead(id){
    const logs=this._get(this.COLS.NOTIF_DISPATCH)||[];
    const l=logs.find(x=>x.public_id===id); if(l) l.read=true;
    this._set(this.COLS.NOTIF_DISPATCH,logs);
  },
  markAllRead(){
    const u=this.activeUser(); const uid=u.public_id||u.id;
    const logs=this._get(this.COLS.NOTIF_DISPATCH)||[];
    logs.filter(l=>(l.recipient_user_public_id===uid)&&l.channel==='internal').forEach(l=>l.read=true);
    this._set(this.COLS.NOTIF_DISPATCH,logs);
  },
  /* Creates a dispatch log entry — used internally when leave is approved/rejected */
  _addDispatchLog({channel,recipient_user_public_id,source_type,source_id,rendered_subject,rendered_body,status}){
    const logs=this._get(this.COLS.NOTIF_DISPATCH)||[];
    const now=new Date().toISOString();
    logs.unshift({
      public_id:'DL-'+String(Date.now()).slice(-6),
      channel, recipient_user_public_id, source_type, source_id,
      rendered_subject:rendered_subject||null,
      rendered_body, status:status||'sent',
      failure_reason:null, queued_at:now, sent_at:now, read:false,
    });
    this._set(this.COLS.NOTIF_DISPATCH,logs);
  },

  todayCollection(){ return FounderDB.collectedInPeriod('today'); },

  reset(){ Object.keys(sessionStorage).filter(k=>k.startsWith(this.PFX)).forEach(k=>sessionStorage.removeItem(k)); this.init(); },
};
StaffDB.init();
