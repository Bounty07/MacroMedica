import React, { useState, useEffect, useMemo, memo } from 'react';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const TODAY_DATE = new Date().toISOString().slice(0, 10);

const MOCK_APPOINTMENTS = [
  { id:'apt1', patientId:'p1', staffId:'staff1', date:TODAY_DATE, time:'08:30', duration:30, type:'Consultation générale', status:'ARRIVE',          roomId:null,    arrivalTime:'08:25', checkoutTime:null,    reminderSent:true,  reminderConfirmed:true,  paymentMethod:null,       notes:'',                lateFlag:false },
  { id:'apt2', patientId:'p2', staffId:'staff1', date:TODAY_DATE, time:'09:00', duration:30, type:'Suivi HTA',             status:'EN_CONSULTATION',  roomId:'room1', arrivalTime:'08:55', checkoutTime:null,    reminderSent:true,  reminderConfirmed:true,  paymentMethod:null,       notes:'',                lateFlag:false },
  { id:'apt3', patientId:'p3', staffId:'staff1', date:TODAY_DATE, time:'09:30', duration:45, type:'Bilan complet',         status:'ARRIVE',          roomId:null,    arrivalTime:'09:25', checkoutTime:null,    reminderSent:true,  reminderConfirmed:false, paymentMethod:null,       notes:'CNOPS',           lateFlag:true  },
  { id:'apt4', patientId:'p4', staffId:'staff1', date:TODAY_DATE, time:'10:00', duration:30, type:'Contrôle',              status:'TERMINE',         roomId:null,    arrivalTime:'09:52', checkoutTime:'10:30', reminderSent:true,  reminderConfirmed:true,  paymentMethod:'especes',  notes:'',                lateFlag:false },
  { id:'apt5', patientId:'p5', staffId:'staff1', date:TODAY_DATE, time:'10:30', duration:30, type:'Urgence',               status:'PLANIFIE',        roomId:null,    arrivalTime:null,    checkoutTime:null,    reminderSent:false, reminderConfirmed:false, paymentMethod:null,       notes:'Douleur abdominale', lateFlag:false },
  { id:'apt6', patientId:'p1', staffId:'staff1', date:TODAY_DATE, time:'11:00', duration:30, type:'Consultation générale', status:'PLANIFIE',        roomId:null,    arrivalTime:null,    checkoutTime:null,    reminderSent:true,  reminderConfirmed:true,  paymentMethod:null,       notes:'',                lateFlag:false },
  { id:'apt7', patientId:'p6', staffId:'staff1', date:TODAY_DATE, time:'11:30', duration:20, type:'Suivi',                 status:'PLANIFIE',        roomId:null,    arrivalTime:null,    checkoutTime:null,    reminderSent:false, reminderConfirmed:false, paymentMethod:null,       notes:'',                lateFlag:false },
  { id:'apt8', patientId:'p2', staffId:'staff1', date:TODAY_DATE, time:'14:00', duration:30, type:'Consultation générale', status:'PLANIFIE',        roomId:null,    arrivalTime:null,    checkoutTime:null,    reminderSent:true,  reminderConfirmed:true,  paymentMethod:null,       notes:'',                lateFlag:false },
];

const MOCK_PATIENTS = [
  { id:'p1', prenom:'Fatima Zahra', nom:'Benali',   cin:'BE234567', telephone:'0661234567', assurance:'CNSS',     cnss:'123456789', solde:400 },
  { id:'p2', prenom:'Mohammed',     nom:'Tazi',      cin:'BK345678', telephone:'0662345678', assurance:'CNSS',     cnss:'234567890', solde:0   },
  { id:'p3', prenom:'Nadia',        nom:'Chraibi',   cin:'BH456789', telephone:'0663456789', assurance:'CNOPS',    cnops:'OP123',    solde:450 },
  { id:'p4', prenom:'Hassan',       nom:'Benkiran',  cin:'BE567890', telephone:'0664567890', assurance:'Aucune',                     solde:0   },
  { id:'p5', prenom:'Samira',       nom:'Naciri',    cin:'BJ678901', telephone:'0665678901', assurance:'CNSS',     cnss:'345678901', solde:0   },
  { id:'p6', prenom:'Omar',         nom:'Skalli',    cin:'BL789012', telephone:'0666789012', assurance:'Mutuelle',                   solde:0   },
];

const MOCK_INVOICES = [
  { id:'inv1', patientId:'p4', date:TODAY_DATE, total:200, paymentMethod:'especes', status:'paid'    },
  { id:'inv2', patientId:'p2', date:TODAY_DATE, total:350, paymentMethod:'tpe',     status:'paid'    },
  { id:'inv3', patientId:'p1', date:TODAY_DATE, total:150, paymentMethod:'especes', status:'paid'    },
  { id:'inv4', patientId:'p3', date:TODAY_DATE, total:450, paymentMethod:null,      status:'pending' },
];

const MOCK_ROOMS = [
  { id:'room1', name:'Salle 1', color:'#1A56DB', occupied:true,  currentPatient:'p2'  },
  { id:'room2', name:'Salle 2', color:'#0D9488', occupied:false, currentPatient:null  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const getWaitMin = (arrivalTime: string | null): number => {
  if (!arrivalTime) return 0;
  const [h, m] = arrivalTime.split(':').map(Number);
  const n = new Date();
  return Math.max(0, (n.getHours() * 60 + n.getMinutes()) - (h * 60 + m));
};

const avatarColor = (str: string): string => {
  const colors = ['#1A56DB','#10B981','#F59E0B','#7C3AED','#EF4444','#0D9488','#06B6D4','#F97316'];
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) % colors.length;
  return colors[h];
};

const getInitials = (name: string): string => {
  const parts = (name || '').trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] || '?').toUpperCase();
};

const fmtMAD = (n: number): string => `${Number(n || 0).toLocaleString('fr-FR')} MAD`;

const getAssurancePill = (assurance: string) => {
  const a = (assurance || '').toLowerCase();
  if (a.includes('cnss'))                          return { bg:'#EFF6FF', color:'#1D4ED8', text:'CNSS'     };
  if (a.includes('cnops'))                         return { bg:'#F5F3FF', color:'#7C3AED', text:'CNOPS'    };
  if (a.includes('mutuelle'))                      return { bg:'#F5F3FF', color:'#5B21B6', text:'Mutuelle' };
  if (a.includes('privée') || a.includes('privee')) return { bg:'#ECFDF5', color:'#065F46', text:'Privée'  };
  return { bg:'#F8FAFC', color:'#6B7280', text:'Aucune' };
};

const getWaitColor = (min: number): string => {
  if (min < 15) return '#10B981';
  if (min <= 30) return '#F59E0B';
  return '#EF4444';
};

const getPatientFullName = (patients: any[], patientId: string): string => {
  const p = patients.find(pt => pt.id === patientId);
  if (!p) return 'Inconnu';
  return `${p.prenom || ''} ${p.nom || ''}`.trim();
};

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const PeopleIcon = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const CalendarIcon = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const CurrencyIcon = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8"/>
    <path d="M12 18V6"/>
  </svg>
);

const PhoneIcon = ({ color }: { color: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.67 12 19.79 19.79 0 0 1 1.63 3.5 2 2 0 0 1 3.6 1.36h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const SecretaireDashboard = memo(({ db = {}, setDb, showToast, waitTick, navigateTo }: any) => {

  // FIX 1 — inject fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap';
    document.head.appendChild(link);
  }, []);

  // ── Data with mock fallback ──
  const appointments: any[] = (db?.appointments?.length > 0) ? db.appointments : MOCK_APPOINTMENTS;
  const patients: any[]     = (db?.patients?.length > 0)     ? db.patients     : MOCK_PATIENTS;
  const invoices: any[]     = (db?.invoices?.length > 0)     ? db.invoices     : MOCK_INVOICES;
  const rooms: any[]        = (db?.config?.rooms?.length > 0) ? db.config.rooms : MOCK_ROOMS;

  // ── Live clock ──
  const [clockTime, setClockTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setClockTime(
        String(n.getHours()).padStart(2,'0') + ':' +
        String(n.getMinutes()).padStart(2,'0') + ':' +
        String(n.getSeconds()).padStart(2,'0')
      );
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const [nextPatientIndex, setNextPatientIndex] = useState(0);

  // ── Computed ──
  const { todayApts, arriveApts, enConsultApts, termineApts, confirmedRdv, unconfirmedCount, rdvInList,
          todayRevenue, especesTotal, tpeTotal, enAttenteTotal } = useMemo(() => {
    const today  = appointments.filter(a => a.date === TODAY_DATE);
    const arr    = today.filter(a => a.status === 'ARRIVE').sort((a,b) => (a.arrivalTime||'').localeCompare(b.arrivalTime||''));
    const enc    = today.filter(a => a.status === 'EN_CONSULTATION');
    const ter    = today.filter(a => a.status === 'TERMINE');
    const conf   = today.filter(a => a.reminderConfirmed);
    const rdvIn  = today.filter(a => !['ARRIVE','EN_CONSULTATION','TERMINE','ANNULE'].includes(a.status));
    const paid   = invoices.filter(i => i.date === TODAY_DATE && i.status === 'paid');
    const pend   = invoices.filter(i => i.date === TODAY_DATE && i.status === 'pending');
    return {
      todayApts: today, arriveApts: arr, enConsultApts: enc, termineApts: ter,
      confirmedRdv: conf, unconfirmedCount: today.length - conf.length, rdvInList: rdvIn,
      todayRevenue:   paid.reduce((s,i) => s + (i.total||0), 0),
      especesTotal:   paid.filter(i => i.paymentMethod === 'especes').reduce((s,i) => s + (i.total||0), 0),
      tpeTotal:       paid.filter(i => i.paymentMethod === 'tpe').reduce((s,i) => s + (i.total||0), 0),
      enAttenteTotal: pend.reduce((s,i) => s + (i.total||0), 0),
    };
  }, [appointments, invoices, waitTick]);

  const nextPatient = arriveApts.length > 0 ? arriveApts[nextPatientIndex % arriveApts.length] : null;
  const todayDateStr = new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
  const fullDateStr  = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  // ── Actions ──
  const handleCommencer = (apt: any) => {
    const freeRoom = rooms.find(r => !r.occupied);
    if (!freeRoom) { if (showToast) showToast('Aucune salle disponible', 'error'); return; }
    if (setDb) setDb((prev: any) => ({
      ...prev,
      appointments: (prev.appointments||[]).map((a: any) => a.id === apt.id ? { ...a, status:'EN_CONSULTATION', roomId: freeRoom.id } : a),
      config: { ...prev.config, rooms: (prev.config?.rooms||[]).map((r: any) => r.id === freeRoom.id ? { ...r, occupied:true, currentPatient: apt.patientId } : r) },
    }));
    const name = getPatientFullName(patients, apt.patientId);
    if (showToast) showToast(`👨‍⚕️ ${name} appelé(e) en ${freeRoom.name}`, 'success');
  };

  const handleTerminer = (apt: any) => {
    if (setDb) setDb((prev: any) => ({
      ...prev,
      appointments: (prev.appointments||[]).map((a: any) => a.id === apt.id ? { ...a, status:'EN_ATTENTE_PAIEMENT', roomId:null } : a),
      config: { ...prev.config, rooms: (prev.config?.rooms||[]).map((r: any) => r.id === apt.roomId ? { ...r, occupied:false, currentPatient:null } : r) },
    }));
    if (showToast) showToast('✅ Consultation terminée — Veuillez encaisser', 'info');
  };

  const handleSupprimer = (apt: any) => {
    if (!window.confirm('Retirer ce patient de la salle ?')) return;
    if (setDb) setDb((prev: any) => ({ ...prev, appointments: (prev.appointments||[]).map((a: any) => a.id === apt.id ? { ...a, status:'ANNULE' } : a) }));
  };

  const handleAjouterSalle = (apt: any) => {
    const now = new Date();
    const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    if (setDb) setDb((prev: any) => ({ ...prev, appointments: (prev.appointments||[]).map((a: any) => a.id === apt.id ? { ...a, status:'ARRIVE', arrivalTime: t } : a) }));
    const name = getPatientFullName(patients, apt.patientId);
    if (showToast) showToast(`✅ ${name} ajouté(e) à la salle d'attente`, 'success');
  };

  const handleAnnulerRdv = (apt: any) => {
    if (setDb) setDb((prev: any) => ({ ...prev, appointments: (prev.appointments||[]).map((a: any) => a.id === apt.id ? { ...a, status:'ANNULE' } : a) }));
    if (showToast) showToast('❌ RDV annulé', 'error');
  };

  const pill = (bg: string, color: string, text: string) => (
    <span style={{ background:bg, color, fontSize:'11px', fontWeight:700, padding:'3px 8px', borderRadius:'8px', whiteSpace:'nowrap' as const, fontFamily:"'DM Sans', sans-serif" }}>{text}</span>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    // FIX 6 — root is flex column with fixed height
    <div style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:'100vh', fontFamily:"'DM Sans', system-ui, sans-serif" }}>

      {/* ══ TOPBAR ══ */}
      <div style={{ height:'52px', background:'#FFFFFF', borderBottom:'0.5px solid #E5E7EB', display:'flex', alignItems:'center', padding:'0 18px', gap:'12px', flexShrink:0 }}>
        <div style={{ background:'#F8FAFC', border:'0.5px solid #E5E7EB', borderRadius:'8px', display:'flex', alignItems:'center', padding:'0 10px', maxWidth:'320px', width:'100%', height:'34px' }}>
          <span style={{ fontSize:'13px', color:'#9CA3AF', marginRight:'6px' }}>🔍</span>
          <input type="text" placeholder="Trouver un patient…" style={{ background:'transparent', border:'none', outline:'none', width:'100%', fontSize:'13px', color:'#0F172A', fontFamily:"'DM Sans', system-ui, sans-serif" }} />
        </div>

        <div style={{ flex:1 }} />

        <span style={{ fontSize:'13px', color:'#6B7280', whiteSpace:'nowrap' }}>Aujourd'hui : {todayDateStr}</span>

        {/* FIX 1+5 — live clock with JetBrains Mono */}
        <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'12px', color:'#6B7280', background:'#F8FAFC', border:'0.5px solid #E5E7EB', padding:'5px 10px', borderRadius:'6px', whiteSpace:'nowrap' }}>{clockTime}</span>

        <div style={{ position:'relative', cursor:'pointer' }}>
          <span style={{ fontSize:'18px' }}>🔔</span>
          <div style={{ position:'absolute', top:0, right:0, width:'7px', height:'7px', background:'#EF4444', borderRadius:'50%', border:'1.5px solid #FFF' }} />
        </div>

        <div style={{ width:'32px', height:'32px', background:'#1A56DB', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'#FFF', fontSize:'11px', fontWeight:700, flexShrink:0 }}>JS</div>
      </div>

      {/* ══ CONTENT — FIX 6: scrollable middle ══ */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 22px', background:'#F0F2F5' }}>

        {/* Breadcrumb — FIX 5 */}
        <div style={{ fontSize:'13px', color:'#6B7280', marginBottom:'18px', display:'flex', alignItems:'center', gap:'6px' }}>
          <span>⊞</span> Vue d'ensemble — {fullDateStr}
        </div>

        {/* ── KPI CARDS — FIX 2 ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'14px', marginBottom:'18px' }}>

          {/* CARD 1 */}
          <div style={{ background:'#FFFFFF', borderRadius:'10px', border:'0.5px solid #E5E7EB', position:'relative', overflow:'hidden', padding:'18px 20px', minHeight:'200px', display:'flex', flexDirection:'column' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px', background:'#EF4444' }} />
            {/* Label + icon */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'12px' }}>
              <span style={{ fontSize:'10.5px', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:"'DM Sans', sans-serif" }}>Salle d'attente</span>
              <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:'#FFF1F2', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><PeopleIcon color="#EF4444" /></div>
            </div>
            {/* Big number */}
            <div style={{ fontSize:'34px', fontWeight:800, color:'#EF4444', fontFamily:"'JetBrains Mono', monospace", lineHeight:1, marginBottom:'4px' }}>{arriveApts.length}</div>
            <div style={{ fontSize:'12px', color:'#6B7280', marginBottom:'14px', fontFamily:"'DM Sans', sans-serif" }}>patients en ce moment</div>
            {/* Mini list */}
            <div style={{ display:'flex', flexDirection:'column', gap:'6px', flex:1 }}>
              {arriveApts.slice(0,3).map(a => {
                const name = getPatientFullName(patients, a.patientId);
                const wMin = getWaitMin(a.arrivalTime);
                return (
                  <div key={a.id} style={{ background:'#F8FAFC', borderRadius:'7px', padding:'6px 8px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', overflow:'hidden' }}>
                      <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: wMin > 20 ? '#F59E0B' : '#10B981', flexShrink:0 }} />
                      <span style={{ fontSize:'12px', color:'#0F172A', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'5px', flexShrink:0 }}>
                      <span style={{ fontSize:'11px', fontFamily:"'JetBrains Mono', monospace", color:'#6B7280' }}>{wMin}m</span>
                      {pill('#ECFDF5','#065F46','En attente')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CARD 2 */}
          <div style={{ background:'#FFFFFF', borderRadius:'10px', border:'0.5px solid #E5E7EB', position:'relative', overflow:'hidden', padding:'18px 20px', minHeight:'200px', display:'flex', flexDirection:'column' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px', background:'#1A56DB' }} />
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'12px' }}>
              <span style={{ fontSize:'10.5px', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:"'DM Sans', sans-serif" }}>RDV du jour</span>
              <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><CalendarIcon color="#1A56DB" /></div>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:'6px', marginBottom:'4px' }}>
              <span style={{ fontSize:'34px', fontWeight:800, color:'#1A56DB', fontFamily:"'JetBrains Mono', monospace", lineHeight:1 }}>{confirmedRdv.length}</span>
              <span style={{ fontSize:'12px', color:'#6B7280', fontFamily:"'DM Sans', sans-serif" }}>/ {todayApts.length} confirmés</span>
            </div>
            <div style={{ fontSize:'12px', color:'#6B7280', marginBottom:'14px', fontFamily:"'DM Sans', sans-serif" }}>{unconfirmedCount} sans confirmation · rappel requis</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px', flex:1 }}>
              {todayApts.filter(a => a.status === 'PLANIFIE').slice(0,3).map(a => {
                const isConf = a.reminderConfirmed;
                const name   = getPatientFullName(patients, a.patientId);
                return (
                  <div key={a.id} style={{ background:'#F8FAFC', borderRadius:'7px', padding:'6px 8px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', gap:'6px', alignItems:'center', overflow:'hidden' }}>
                      <span style={{ fontSize:'11px', fontFamily:"'JetBrains Mono', monospace", color:'#6B7280', flexShrink:0 }}>{a.time}</span>
                      <span style={{ fontSize:'12px', color:'#0F172A', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
                    </div>
                    {pill(isConf ? '#ECFDF5' : '#FFF7ED', isConf ? '#065F46' : '#C2410C', isConf ? '✓ Confirmé' : 'En attente')}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CARD 3 */}
          <div style={{ background:'#FFFFFF', borderRadius:'10px', border:'0.5px solid #E5E7EB', position:'relative', overflow:'hidden', padding:'18px 20px', minHeight:'200px', display:'flex', flexDirection:'column' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px', background:'#10B981' }} />
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'12px' }}>
              <span style={{ fontSize:'10.5px', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:"'DM Sans', sans-serif" }}>Revenu du jour</span>
              <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:'#ECFDF5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><CurrencyIcon color="#10B981" /></div>
            </div>
            <div style={{ fontSize:'34px', fontWeight:800, color:'#10B981', fontFamily:"'JetBrains Mono', monospace", lineHeight:1, marginBottom:'4px' }}>{todayRevenue.toLocaleString('fr-FR')}</div>
            <div style={{ fontSize:'12px', color:'#6B7280', marginBottom:'14px', fontFamily:"'DM Sans', sans-serif" }}>{invoices.filter(i => i.date === TODAY_DATE && i.status === 'paid').length} consultations encaissées</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px', flex:1 }}>
              {[
                { label:'Espèces',    val: especesTotal,   color:'#0F172A' },
                { label:'TPE',        val: tpeTotal,       color:'#0F172A' },
                { label:'En attente', val: enAttenteTotal, color:'#F59E0B' },
              ].map(row => (
                <div key={row.label} style={{ background:'#F8FAFC', borderRadius:'7px', padding:'6px 8px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'12px', color:row.color === '#F59E0B' ? '#F59E0B' : '#475569', fontWeight:500 }}>{row.label}</span>
                  <span style={{ fontSize:'12px', fontFamily:"'JetBrains Mono', monospace", fontWeight:700, color:row.color }}>{fmtMAD(row.val)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── BOTTOM GRID — FIX 5 ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:'14px' }}>

          {/* LEFT — Patient table — FIX 3 */}
          <div style={{ background:'#FFFFFF', borderRadius:'10px', border:'0.5px solid #E5E7EB', overflow:'hidden' }}>
            <div style={{ padding:'12px 18px', borderBottom:'0.5px solid #F3F4F6', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <span style={{ fontSize:'13.5px', fontWeight:700, color:'#0F172A' }}>Patients — salle d'attente</span>
                <span style={{ background:'#EFF6FF', color:'#1D4ED8', fontSize:'11px', fontWeight:700, padding:'2px 8px', borderRadius:'10px', fontFamily:"'DM Sans', sans-serif" }}>{arriveApts.length + enConsultApts.length}</span>
              </div>
              <button type="button" style={{ background:'#0B1628', color:'#FFF', border:'none', borderRadius:'7px', padding:'6px 12px', fontSize:'11.5px', fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans', system-ui, sans-serif" }}>
                + Nouvelle tâche
              </button>
            </div>

            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    {["Nom et prénom","Heure d'entrée","Assurance","Attente","Montant dû","Actions"].map((c,i) => (
                      <th key={i} style={{ padding:'10px 16px', fontSize:'11px', fontWeight:700, textTransform:'uppercase', color:'#9CA3AF', letterSpacing:'0.06em', background:'#FAFAFA', textAlign:'left', whiteSpace:'nowrap', borderBottom:'0.5px solid #F0F0F0', fontFamily:"'DM Sans', sans-serif" }}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...enConsultApts, ...arriveApts].map((apt, idx, arr) => {
                    const isConsult = apt.status === 'EN_CONSULTATION';
                    const name = getPatientFullName(patients, apt.patientId);
                    const pt   = patients.find((p: any) => p.id === apt.patientId) || {};
                    const init = getInitials(name);
                    const bgCol = avatarColor(name);
                    const wMin  = getWaitMin(apt.arrivalTime);
                    const assPill = getAssurancePill(pt.assurance || 'Aucune');
                    const inv   = invoices.find((i: any) => i.patientId === apt.patientId && i.date === TODAY_DATE);
                    const amtDue = inv?.total || pt.solde || 0;
                    const room  = isConsult ? (rooms.find((r: any) => r.id === apt.roomId)?.name || 'Salle') : null;

                    return (
                      <tr key={apt.id}
                        style={{ borderBottom: idx === arr.length-1 ? 'none' : '0.5px solid #F9FAFB', background:'#FFF', transition:'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background='#FAFAFA')}
                        onMouseLeave={e => (e.currentTarget.style.background='#FFF')}>

                        {/* Name */}
                        <td style={{ padding:'14px 16px', verticalAlign:'middle', fontSize:'13px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                            <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:bgCol, color:'#FFF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:800, flexShrink:0 }}>{init}</div>
                            <span style={{ fontWeight:700, color:'#0F172A', fontSize:'13px', fontFamily:"'DM Sans', sans-serif" }}>{name}</span>
                          </div>
                        </td>

                        {/* Arrival time */}
                        <td style={{ padding:'14px 16px', verticalAlign:'middle', fontSize:'13px' }}>
                          <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'12px', color:'#6B7280' }}>{apt.arrivalTime || '--:--'}</span>
                        </td>

                        {/* Assurance */}
                        <td style={{ padding:'14px 16px', verticalAlign:'middle' }}>
                          <span style={{ background:assPill.bg, color:assPill.color, fontSize:'11px', fontWeight:700, padding:'3px 8px', borderRadius:'8px', whiteSpace:'nowrap', fontFamily:"'DM Sans', sans-serif" }}>{assPill.text}</span>
                        </td>

                        {/* Wait */}
                        <td style={{ padding:'14px 16px', verticalAlign:'middle' }}>
                          {isConsult
                            ? <span style={{ color:'#1A56DB', fontWeight:700, fontSize:'12px', fontFamily:"'DM Sans', sans-serif" }}>{room}</span>
                            : <span style={{ color:getWaitColor(wMin), fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:'12px' }}>{wMin} min</span>
                          }
                        </td>

                        {/* Amount */}
                        <td style={{ padding:'14px 16px', verticalAlign:'middle' }}>
                          <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:'12px', color:'#0F172A' }}>{amtDue ? fmtMAD(amtDue) : '--'}</span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding:'14px 16px', verticalAlign:'middle' }}>
                          <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                            {isConsult
                              ? <button type="button" onClick={() => handleTerminer(apt)} style={{ background:'#10B981', color:'#FFF', border:'none', borderRadius:'7px', padding:'7px 14px', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans', sans-serif" }}>Terminer</button>
                              : <button type="button" onClick={() => handleCommencer(apt)} style={{ background:'#0B1628', color:'#FFF', border:'none', borderRadius:'7px', padding:'7px 14px', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans', sans-serif" }}>Commencer</button>
                            }
                            <button type="button" onClick={() => handleSupprimer(apt)} style={{ background:'#FFF1F2', color:'#EF4444', border:'0.5px solid #FCA5A5', borderRadius:'7px', width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', cursor:'pointer', flexShrink:0 }}>✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {arriveApts.length === 0 && enConsultApts.length === 0 && (
                    <tr><td colSpan={6} style={{ padding:'28px', textAlign:'center', color:'#9CA3AF', fontSize:'13px', fontFamily:"'DM Sans', sans-serif" }}>Aucun patient en salle d'attente</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT — RDV sidebar — FIX 4 */}
          <div style={{ background:'#FFFFFF', borderRadius:'10px', border:'0.5px solid #E5E7EB', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'0.5px solid #F3F4F6', display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
              <span style={{ fontSize:'13.5px', fontWeight:700, color:'#0F172A', fontFamily:"'DM Sans', sans-serif" }}>Rendez-vous aujourd'hui</span>
              <span style={{ background:'#EFF6FF', color:'#1D4ED8', fontSize:'11px', fontWeight:700, padding:'2px 8px', borderRadius:'10px', fontFamily:"'DM Sans', sans-serif" }}>{rdvInList.length}</span>
            </div>

            <div style={{ overflowY:'auto', padding:'8px', flex:1 }}>
              {rdvInList.map((apt: any) => {
                const isConf = apt.reminderConfirmed;
                const name   = getPatientFullName(patients, apt.patientId);
                const pt     = patients.find((p: any) => p.id === apt.patientId) || {};

                return (
                  <div key={apt.id} style={{ borderRadius:'10px', padding:'12px 14px', marginBottom:'8px', background: isConf ? '#FAFAFA' : '#FFF7F7', border:`0.5px solid ${isConf ? '#E5E7EB' : '#FCA5A5'}` }}>
                    {/* Name + badge */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
                      <span style={{ fontSize:'13px', fontWeight:700, color:'#0F172A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, marginRight:'6px', fontFamily:"'DM Sans', sans-serif" }}>{name}</span>
                      <span style={{ background: isConf ? '#EFF6FF' : '#FFFBEB', color: isConf ? '#1D4ED8' : '#92400E', fontSize:'10px', fontWeight:700, padding:'2px 6px', borderRadius:'6px', whiteSpace:'nowrap', flexShrink:0, fontFamily:"'DM Sans', sans-serif" }}>
                        {isConf ? 'Confirmé' : 'Non confirmé'}
                      </span>
                    </div>

                    {/* Meta info — FIX 4 */}
                    <div style={{ display:'flex', flexDirection:'column', gap:'2px', marginBottom:'8px' }}>
                      <span style={{ fontSize:'11.5px', color:'#6B7280', lineHeight:1.7, fontFamily:"'DM Sans', sans-serif" }}>
                        🕐 <span style={{ fontFamily:"'JetBrains Mono', monospace" }}>{apt.time}</span> · {pt.assurance || 'Aucune'}
                      </span>
                      <span style={{ fontSize:'11.5px', color:'#6B7280', lineHeight:1.7, display:'flex', alignItems:'center', gap:'4px', fontFamily:"'DM Sans', sans-serif" }}>
                        <PhoneIcon color="#9CA3AF" /> {pt.telephone || '---'}
                      </span>
                      <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:'11px', color:'#6B7280', lineHeight:1.7 }}>CIN: {pt.cin || '---'}</span>
                    </div>

                    {/* Buttons */}
                    <div style={{ display:'flex', gap:'6px', marginTop:'8px' }}>
                      <button type="button" onClick={() => handleAjouterSalle(apt)}
                        style={{ flex:1, background:'#0B1628', color:'#FFF', border:'none', borderRadius:'7px', padding:'7px 10px', fontSize:'11.5px', fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans', sans-serif" }}>
                        Ajouter à la salle
                      </button>
                      <button type="button" onClick={() => handleAnnulerRdv(apt)}
                        style={{ flex:1, background:'#FFF', color:'#EF4444', border:'0.5px solid #FCA5A5', borderRadius:'7px', padding:'7px 10px', fontSize:'11.5px', fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans', sans-serif" }}>
                        Annuler RDV
                      </button>
                    </div>
                  </div>
                );
              })}
              {rdvInList.length === 0 && (
                <div style={{ textAlign:'center', padding:'28px', fontSize:'13px', color:'#9CA3AF', fontFamily:"'DM Sans', sans-serif" }}>Aucun RDV planifié</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ ACTION BAR — FIX 6: direct child of root, never scrolls ══ */}
      <div style={{ height:66, flexShrink:0, background:'#0B1628', display:'flex', alignItems:'center', padding:'0 20px', gap:14 }}>

        <span style={{ fontSize:'9.5px', textTransform:'uppercase', letterSpacing:'0.1em', color:'rgba(255,255,255,0.3)', fontWeight:700, flexShrink:0, fontFamily:"'DM Sans', sans-serif" }}>
          Prochain patient
        </span>

        <div style={{ flex:1, display:'flex', alignItems:'center', gap:'10px', overflow:'hidden' }}>
          {nextPatient ? (() => {
            const name = getPatientFullName(patients, nextPatient.patientId);
            const pt   = patients.find((p: any) => p.id === nextPatient.patientId) || {};
            const wMin = getWaitMin(nextPatient.arrivalTime);
            return (
              <>
                <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:'#1A56DB', color:'#FFF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, flexShrink:0, fontFamily:"'DM Sans', sans-serif" }}>
                  {getInitials(name)}
                </div>
                <div style={{ overflow:'hidden' }}>
                  <div style={{ fontSize:'13px', fontWeight:700, color:'#FFF', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontFamily:"'DM Sans', sans-serif" }}>{name}</div>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.45)', display:'flex', gap:'4px', alignItems:'center', flexWrap:'wrap', fontFamily:"'DM Sans', sans-serif" }}>
                    <span>{nextPatient.type}</span>
                    <span>·</span>
                    <span>{pt.assurance || 'Aucune'}</span>
                    <span>· Attend depuis</span>
                    <span style={{ color:'#F59E0B', fontFamily:"'JetBrains Mono', monospace", fontWeight:700 }}>{wMin}min</span>
                  </div>
                </div>
              </>
            );
          })() : (
            <span style={{ fontSize:'13px', color:'rgba(255,255,255,0.4)', fontFamily:"'DM Sans', sans-serif" }}>Aucun patient en attente</span>
          )}
        </div>

        <div style={{ width:'0.5px', height:'38px', background:'rgba(255,255,255,0.1)', flexShrink:0 }} />

        {/* FIX 1 — stats with JetBrains Mono */}
        <div style={{ display:'flex', gap:'20px', flexShrink:0 }}>
          {[
            { label:'En attente', val: arriveApts.length,               color:'#FFF'     },
            { label:'Terminés',   val: termineApts.length,              color:'#FFF'     },
            { label:'En salle',   val: enConsultApts.length,            color:'#10B981'  },
            { label:'MAD / jour', val: todayRevenue.toLocaleString('fr-FR'), color:'#F59E0B', isStr:true },
          ].map(s => (
            <div key={s.label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:'17px', fontWeight:800, fontFamily:"'JetBrains Mono', monospace", color:s.color, lineHeight:1.1 }}>{s.val}</div>
              <div style={{ fontSize:'9px', textTransform:'uppercase', letterSpacing:'0.05em', color:'rgba(255,255,255,0.35)', marginTop:'2px', fontFamily:"'DM Sans', sans-serif" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ width:'0.5px', height:'38px', background:'rgba(255,255,255,0.1)', flexShrink:0 }} />

        <button type="button" onClick={() => { if (nextPatient) handleCommencer(nextPatient); }} disabled={!nextPatient}
          style={{ background: nextPatient ? '#10B981' : 'rgba(16,185,129,0.35)', color:'#FFF', border:'none', borderRadius:'9px', padding:'9px 16px', fontSize:'12px', fontWeight:700, cursor: nextPatient ? 'pointer' : 'default', display:'flex', alignItems:'center', gap:'6px', fontFamily:"'DM Sans', sans-serif", whiteSpace:'nowrap', flexShrink:0 }}>
          <span>📞</span> Appeler ce patient
        </button>

        <button type="button" onClick={() => setNextPatientIndex(i => i + 1)} disabled={arriveApts.length <= 1}
          style={{ background:'rgba(255,255,255,0.07)', color: arriveApts.length > 1 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)', border:'0.5px solid rgba(255,255,255,0.12)', borderRadius:'9px', padding:'9px 12px', fontSize:'12px', cursor: arriveApts.length > 1 ? 'pointer' : 'default', fontFamily:"'DM Sans', sans-serif", whiteSpace:'nowrap', flexShrink:0 }}>
          Suivant →
        </button>

      </div>
    </div>
  );
});

SecretaireDashboard.displayName = 'SecretaireDashboard';
export default SecretaireDashboard;
