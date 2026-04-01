import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { RDV_STATUSES, isValidTransition } from '../lib/workflow';
import {
  CalendarPlus, Bell, Trash2, Phone, MoreHorizontal,
  PlayCircle, FileText, StickyNote, ChevronRight, Clock,
  Stethoscope, User, Activity, Calendar, Search, Users, CheckCircle, CreditCard
} from 'lucide-react';

// ─── Constants ───
const TZ = 'Africa/Casablanca';
const ACCENT = '#004F45';
const ACCENT_LIGHT = '#E6F4F1';

// ─── Helpers ───
function formatDateLong() {
  const now = new Date();
  const days = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  return `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function formatTime(iso) {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
}

const civility = (sexe) => sexe === 'F' ? 'Mme.' : 'M.';
const getInitials = (prenom, nom) => `${(prenom?.[0] || '').toUpperCase()}${(nom?.[0] || '').toUpperCase()}`;

const AVATAR_PALETTES = [
  { bg: '#D1FAE5', text: '#065F46' },
  { bg: '#DBEAFE', text: '#1E40AF' },
  { bg: '#FEE2E2', text: '#991B1B' },
  { bg: '#FEF3C7', text: '#92400E' },
  { bg: '#EDE9FE', text: '#4C1D95' },
  { bg: '#FCE7F3', text: '#831843' },
  { bg: '#CFFAFE', text: '#164E63' },
];
function getAvatarColor(id) {
  const idx = id ? String(id).charCodeAt(0) % AVATAR_PALETTES.length : 0;
  return AVATAR_PALETTES[idx];
}

const fmtMAD = (n) => `${Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits:2, maximumFractionDigits:2 })} MAD`;

const getAssurancePill = (assurance) => {
  const a = (assurance || '').toLowerCase();
  if (a.includes('cnss'))                          return { bg:'#EFF6FF', color:'#1D4ED8', text:'CNSS'     };
  if (a.includes('cnops'))                         return { bg:'#F5F3FF', color:'#7C3AED', text:'CNOPS'    };
  if (a.includes('mutuelle'))                      return { bg:'#F5F3FF', color:'#5B21B6', text:'Mutuelle' };
  if (a.includes('privée') || a.includes('privee')) return { bg:'#ECFDF5', color:'#065F46', text:'Privée'  };
  return { bg:'#F8FAFC', color:'#6B7280', text:'Aucune' };
};

// ─── Live Clock & Wait ───
function useLiveClock() {
  const [d, setD] = useState(formatDateLong);
  const [t, setT] = useState('');
  useEffect(() => {
    const tick = () => {
      setD(formatDateLong());
      const now = new Date();
      setT(now.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit', timeZone:TZ }));
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);
  return { date: d, time: t };
}

function WaitCell({ rdv }) {
  const [mins, setMins] = useState(0);
  useEffect(() => {
    const since = rdv.updated_at || rdv.date_rdv;
    if (!since) return;
    const update = () => setMins(Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 60000)));
    update();
    const iv = setInterval(update, 30000);
    return () => clearInterval(iv);
  }, [rdv]);

  const isLate = rdv.status === RDV_STATUSES.SCHEDULED && mins > 15;
  if (isLate) {
    return (
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626' }}>Retard</div>
        <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>Prévu {formatTime(rdv.date_rdv)}</div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: "'JetBrains Mono', monospace" }}>
        {String(Math.floor(mins / 60)).padStart(2, '0')}:{String(mins % 60).padStart(2, '0')} min
      </div>
      <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
        Arrivé {formatTime(rdv.updated_at || rdv.date_rdv)}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───
const SecretaireDashboard = memo(() => {
  const navigate = useNavigate();
  const { profile, rdvList, consultations, openGlobalModal, notify } = useAppContext();
  const { date: dateStr, time: clockTime } = useLiveClock();

  // ── MOCK DATA FALLBACK ──
  const NOW = new Date();
  const t = (offsetMin) => new Date(NOW.getTime() - offsetMin * 60000).toISOString();

  const MOCK_SALLE = [
    { id: 'm1', status: RDV_STATUSES.IN_CONSULTATION, date_rdv: t(60), updated_at: t(25), notes: 'Consultation', patients: { id: 'p1', prenom: 'Ahmed', nom: 'Radi', sexe: 'M', assurance: 'CNOPS', telephone: '066112233' } },
    { id: 'm2', status: RDV_STATUSES.ARRIVED, date_rdv: t(40), updated_at: t(10), notes: 'Contrôle', patients: { id: 'p2', prenom: 'Sofia', nom: 'Berrada', sexe: 'F', assurance: 'CNSS', telephone: '0655443322' } },
    { id: 'm3', status: RDV_STATUSES.ARRIVED, date_rdv: t(15), updated_at: t(2), notes: 'Renouvellement', patients: { id: 'p3', prenom: 'Karim', nom: 'Slimani', sexe: 'M', assurance: 'Aucune', telephone: '0677889900' } },
  ];
  const MOCK_RDV = [
    { id: 'r1', status: RDV_STATUSES.SCHEDULED, date_rdv: new Date(NOW.getTime() + 45*60000).toISOString(), patients: { id: 'p4', prenom: 'Nawal', nom: 'Zairi', sexe: 'F', assurance: 'CNSS', telephone: '0612345678' } },
    { id: 'r2', status: RDV_STATUSES.SCHEDULED, date_rdv: new Date(NOW.getTime() + 120*60000).toISOString(), patients: { id: 'p5', prenom: 'Youssef', nom: 'Lamrini', sexe: 'M', assurance: 'Mutuelle', telephone: '0698765432' } },
    { id: 'r3', status: RDV_STATUSES.SCHEDULED, date_rdv: new Date(NOW.getTime() + 180*60000).toISOString(), patients: { id: 'p6', prenom: 'Leila', nom: 'Tahiri', sexe: 'F', assurance: 'Privée', telephone: '0600112233' } },
  ];

  const useMock = !rdvList || rdvList.length === 0;

  // ── Slices ──
  const confirmes = useMemo(() => {
    if (useMock) return MOCK_RDV;
    return rdvList.filter(r => r.status === RDV_STATUSES.SCHEDULED).sort((a,b) => new Date(a.date_rdv) - new Date(b.date_rdv));
  }, [rdvList, useMock]);

  const activeApts = useMemo(() => {
    if (useMock) return MOCK_SALLE;
    return rdvList.filter(r => [RDV_STATUSES.ARRIVED, RDV_STATUSES.IN_CONSULTATION].includes(r.status))
      .sort((a,b) => {
        if (a.status === RDV_STATUSES.IN_CONSULTATION && b.status !== RDV_STATUSES.IN_CONSULTATION) return -1;
        if (b.status === RDV_STATUSES.IN_CONSULTATION && a.status !== RDV_STATUSES.IN_CONSULTATION) return 1;
        return new Date(a.updated_at || a.date_rdv) - new Date(b.updated_at || b.date_rdv);
      });
  }, [rdvList, useMock]);

  const completedApts = useMemo(() => {
    if (useMock) return [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }];
    return rdvList.filter(r => r.status === RDV_STATUSES.COMPLETED);
  }, [rdvList, useMock]);

  const revenuJour = useMemo(() => {
    if (useMock) return 2450;
    const today = new Date().toLocaleDateString('fr-CA', { timeZone: TZ });
    return consultations.filter(c => c.statut === 'paye' && c.date_consult?.startsWith(today)).reduce((s, c) => s + (c.montant || 0), 0);
  }, [consultations, useMock]);

  const enConsult = activeApts.filter(r => r.status === RDV_STATUSES.IN_CONSULTATION);
  const enAttente = activeApts.filter(r => r.status === RDV_STATUSES.ARRIVED);

  const totalRdvDuJour = confirmes.length + activeApts.length + completedApts.length;

  const [nextPatientIndex, setNextPatientIndex] = useState(0);
  const nextPatient = enAttente.length > 0 ? enAttente[nextPatientIndex % enAttente.length] : null;

  // ── Actions ──
  const transitionStatus = useCallback(async (rdvId, target) => {
    if (useMock) return true; // Pretend it worked for mock demo
    const { data: cur, error: e } = await supabase.from('rdv').select('status').eq('id', rdvId).single();
    if (e || !cur) { notify({ title: 'Erreur', description: 'RDV introuvable', tone: 'error' }); return false; }
    try { isValidTransition(cur.status, target); } catch (err) {
      notify({ title: 'Transition invalide', description: err.message, tone: 'error' }); return false;
    }
    const { error } = await supabase.from('rdv').update({ status: target }).eq('id', rdvId);
    if (error) { notify({ title: 'Erreur DB', description: error.message, tone: 'error' }); return false; }
    return true;
  }, [notify, useMock]);

  const handleCommencer = async (apt) => {
    const ok = await transitionStatus(apt.id, RDV_STATUSES.IN_CONSULTATION);
    if (ok) notify({ title: 'Consultation démarrée', description: `${apt.patients?.prenom} appelé en salle.`, tone:'success' });
  };
  const handleTerminer = async (apt) => {
    const ok = await transitionStatus(apt.id, RDV_STATUSES.COMPLETED);
    if (ok) notify({ title: 'Consultation terminée', description: `N'oubliez pas d'éditer la facture si nécessaire.`, tone:'info' });
  };
  const handleAnnulerRdv = async (apt) => {
    if (!window.confirm("Annuler ce rendez-vous ?")) return;
    const ok = await transitionStatus(apt.id, RDV_STATUSES.ABSENT); // Or delete
    if (ok) notify({ title: 'RDV Annulé', description: 'Le rendez-vous a été retiré.', tone:'error' });
  };
  const handleAjouterSalle = async (apt) => {
    const ok = await transitionStatus(apt.id, RDV_STATUSES.ARRIVED);
    if (ok) notify({ title: 'Patient en salle', description: `${apt.patients?.prenom} ajouté à la salle d'attente.`, tone:'success' });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .sec-root {
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          display: flex; flex-direction: column;
          height: 100vh; background: #F8FAFB;
        }

        /* TOPBAR */
        .sec-topbar {
          height: 60px; background: #FFF; border-bottom: 1px solid #EEF2F7;
          display: flex; alignItems: center; padding: 0 24px; gap: 16px; flex-shrink: 0;
        }
        .sec-search {
          background: #F1F5F9; border-radius: 10px; display: flex; align-items: center;
          padding: 0 12px; height: 38px; width: 340px; border: 1px solid #E2E8F0;
          transition: all 0.2s;
        }
        .sec-search:focus-within { background: #FFF; border-color: ${ACCENT}; box-shadow: 0 0 0 3px ${ACCENT_LIGHT}; }
        .sec-search input { background: transparent; border: none; outline: none; width: 100%; font-size: 13px; margin-left:8px; color: #0F172A; }

        .sec-btn-rdv {
          background: ${ACCENT}; color: #FFF; border: none; padding: 0 20px; height: 38px; border-radius: 10px;
          font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 8px; cursor: pointer;
          transition: opacity 0.2s; box-shadow: 0 4px 12px rgba(0,79,69,0.2);
        }
        .sec-btn-rdv:hover { opacity: 0.9; }

        /* CONTENT */
        .sec-content {
          flex: 1; padding: 24px; overflow-y: auto;
        }
        .sec-greeting { font-size: 24px; font-weight: 800; color: #0F172A; margin-bottom: 4px; letter-spacing: -0.5px; }
        .sec-subline  { font-size: 13px; color: #64748B; margin-bottom: 24px; }

        /* KPIS */
        .sec-kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .sec-kpi-card {
          background: #fff;
          border: 1px solid #E9EFF5;
          border-radius: 14px;
          padding: 22px 24px;
          display: flex; align-items: center; justify-content: space-between;
          transition: box-shadow .2s;
        }
        .sec-kpi-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .sec-kpi-label { font-size: 12px; font-weight: 600; color: #6B7B8D; margin-bottom: 8px; text-transform: capitalize; letter-spacing: .1px; }
        .sec-kpi-val { font-size: 32px; font-weight: 800; color: #0F172A; line-height: 1; letter-spacing: -1px; }
        .sec-kpi-val span { font-size: 16px; font-weight: 500; color: #94A3B8; }
        .sec-kpi-sub { font-size: 11px; color: #94A3B8; margin-top: 5px; font-weight: 500; }
        .sec-kpi-sub.green { color: ${ACCENT}; }
        .sec-kpi-icon {
          width: 42px; height: 42px; border-radius: 10px;
          background: ${ACCENT_LIGHT}; color: ${ACCENT};
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        /* GRIDS */
        .sec-layout {
          display: grid; grid-template-columns: 1fr 380px; gap: 20px;
        }
        @media (max-width: 1200px) { .sec-layout { grid-template-columns: 1fr; } }

        /* TABLE CARD */
        .sec-panel { background: #FFF; border-radius: 14px; border: 1px solid #E9EFF5; overflow: hidden; display: flex; flex-direction: column; }
        .sec-panel-header {
          padding: 16px 20px; border-bottom: 1px solid #F1F5F9;
          display: flex; justify-content: space-between; align-items: center;
        }
        .sec-panel-title { font-size: 14px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px; }
        .sec-panel-badge { background: ${ACCENT_LIGHT}; color: ${ACCENT}; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 10px; }

        .sec-table { width: 100%; border-collapse: collapse; }
        .sec-table th { padding: 12px 20px; text-align: left; font-size: 10px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #E9EFF5; background: #FAFBFC; }
        .sec-table td { padding: 14px 20px; border-bottom: 1px solid #F8FAFB; vertical-align: middle; }
        .sec-table tr:hover td { background: #FAFBFC; }
        .sec-table tr:last-child td { border-bottom: none; }

        .sec-avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0; }
        .sec-name { font-size: 13px; font-weight: 700; color: #0F172A; }

        .sec-btn-action { background: #F1F5F9; color: #475569; border: none; padding: 8px 14px; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
        .sec-btn-action:hover { background: #E2E8F0; color: #0F172A; }
        .sec-btn-action.primary { background: ${ACCENT_LIGHT}; color: ${ACCENT}; }
        .sec-btn-action.primary:hover { background: ${ACCENT}; color: #FFF; }
        .sec-btn-action.danger { background: #FEE2E2; color: #DC2626; padding: 8px; }
        .sec-btn-action.danger:hover { background: #FECACA; }

        /* RDV LIST */
        .sec-rdv-list { padding: 12px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 10px; }
        .sec-rdv-item {
          border: 1px solid #E9EFF5; border-radius: 12px; padding: 16px; background: #FAFBFC;
          transition: all 0.2s;
        }
        .sec-rdv-item.active { background: #FFF; border-color: ${ACCENT_LIGHT}; box-shadow: 0 4px 12px rgba(0,79,69,0.04); }
        .sec-rdv-item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
        .sec-rdv-item-name { font-size: 13px; font-weight: 800; color: #0F172A; }
        .sec-rdv-item-meta { font-size: 12px; color: #64748B; display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
        .sec-rdv-item-actions { display: flex; gap: 8px; margin-top: 14px; }
        .sec-rdv-btn { flex: 1; padding: 10px; border-radius: 8px; font-size: 11.5px; font-weight: 700; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .sec-rdv-btn.add { background: #0F172A; color: #FFF; }
        .sec-rdv-btn.add:hover { background: #1E293B; }
        .sec-rdv-btn.cancel { background: #FFF; border-color: #E2E8F0; color: #DC2626; }
        .sec-rdv-btn.cancel:hover { background: #FEE2E2; border-color: #FECACA; }

        /* ACTION BAR (Bottom sticky) */
        .sec-action-bar {
          height: 70px; background: #0F172A; flex-shrink: 0;
          display: flex; align-items: center; padding: 0 24px; gap: 20px;
        }
        .sec-ab-label { font-size: 10px; text-transform: uppercase; font-weight: 800; color: rgba(255,255,255,0.4); letter-spacing: 1px; }
        .sec-ab-patient { flex: 1; display: flex; align-items: center; gap: 12px; }
        .sec-ab-btn {
          background: ${ACCENT}; color: #FFF; border: none; border-radius: 10px; padding: 0 20px; height: 42px;
          font-size: 13px; font-weight: 800; display: flex; align-items: center; gap: 8px; cursor: pointer;
          transition: background 0.2s;
        }
        .sec-ab-btn:hover { background: #006659; }
        .sec-ab-btn:disabled { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.3); cursor: not-allowed; }
        .sec-ab-btn.outline { background: transparent; border: 1px solid rgba(255,255,255,0.2); }
        .sec-ab-btn.outline:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
      `}</style>
      <div className="sec-root">

        {/* ── TOPBAR ── */}
        <div className="sec-topbar">
          <div className="sec-search">
            <Search size={16} color="#94A3B8" />
            <input type="text" placeholder="Rechercher un dossier, un patient..." />
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 13, color: '#64748B', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span>{dateStr}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", background: '#F1F5F9', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>{clockTime}</span>
          </div>
          <button className="sec-btn-rdv" onClick={() => openGlobalModal('appointment')}>
            <CalendarPlus size={16} /> Nouveau RDV
          </button>
        </div>

        {/* ── CONTENT ── */}
        <div className="sec-content">
          <div className="sec-greeting">Gestion de l'Accueil</div>
          <div className="sec-subline">Vue d'ensemble et pilotage de la salle d'attente pour {profile?.nom_complet || 'votre cabinet'}.</div>

          {/* ── KPIs ── */}
          <div className="sec-kpi-row">
            <div className="sec-kpi-card">
              <div>
                <div className="sec-kpi-label">Salle d'attente</div>
                <div className="sec-kpi-val">{activeApts.length}</div>
                <div className="sec-kpi-sub">patients en ce moment</div>
              </div>
              <div className="sec-kpi-icon">
                <Users size={20} />
              </div>
            </div>
            
            <div className="sec-kpi-card">
              <div>
                <div className="sec-kpi-label">Consultation</div>
                <div className="sec-kpi-val">{enConsult.length}</div>
                <div className="sec-kpi-sub">en cours dans les salles</div>
              </div>
              <div className="sec-kpi-icon">
                <Stethoscope size={20} />
              </div>
            </div>
            
            <div className="sec-kpi-card">
              <div>
                <div className="sec-kpi-label">RDV du jour</div>
                <div className="sec-kpi-val">{completedApts.length} <span>/ {totalRdvDuJour}</span></div>
                <div className="sec-kpi-sub">patients terminés</div>
              </div>
              <div className="sec-kpi-icon">
                <CheckCircle size={20} />
              </div>
            </div>
            
            <div className="sec-kpi-card">
              <div>
                <div className="sec-kpi-label">Revenu du jour</div>
                <div className="sec-kpi-val" style={{ fontSize: 28 }}>{fmtMAD(revenuJour)}</div>
                <div className="sec-kpi-sub green">encaissé aujourd'hui</div>
              </div>
              <div className="sec-kpi-icon">
                <CreditCard size={20} />
              </div>
            </div>
          </div>

          <div className="sec-layout">
            {/* ── LEFT: SALLE D'ATTENTE ── */}
            <div className="sec-panel">
              <div className="sec-panel-header">
                <div className="sec-panel-title">
                  <Users size={16} color={ACCENT} /> Patients — Salle d'attente
                  <span className="sec-panel-badge">{activeApts.length}</span>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="sec-table">
                  <thead>
                    <tr>
                      <th>Patient &amp; Assurance</th>
                      <th>Heure prévue</th>
                      <th>Attente / Statut</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeApts.map((apt) => {
                      const isConsult = apt.status === RDV_STATUSES.IN_CONSULTATION;
                      const pt = apt.patients || {};
                      const name = `${civility(pt.sexe)} ${pt.prenom} ${pt.nom}`;
                      const av = getAvatarColor(pt.id || apt.id);
                      const ass = getAssurancePill(pt.assurance || 'Aucune');

                      return (
                        <tr key={apt.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div className="sec-avatar" style={{ background: av.bg, color: av.text }}>{getInitials(pt.prenom, pt.nom)}</div>
                              <div>
                                <div className="sec-name">{name}</div>
                                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                  <span style={{ fontSize: 10, background: ass.bg, color: ass.color, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{ass.text}</span>
                                  {apt.notes && <span style={{ fontSize: 10, color: '#94A3B8', padding: '2px 0' }}>• {apt.notes}</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#64748B' }}>
                            {formatTime(apt.date_rdv)}
                          </td>
                          <td>
                            {isConsult ? (
                              <span style={{ background: '#DBEAFE', color: '#1D4ED8', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 6, textTransform: 'uppercase' }}>EN CONSULTATION</span>
                            ) : (
                              <WaitCell rdv={apt} />
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              {isConsult ? (
                                <button className="sec-btn-action primary" onClick={() => handleTerminer(apt)}>Terminer</button>
                              ) : (
                                <button className="sec-btn-action" onClick={() => handleCommencer(apt)}>Commencer</button>
                              )}
                              <button className="sec-btn-action danger" title="Annuler" onClick={() => handleAnnulerRdv(apt)}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {activeApts.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                          <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                          La salle d'attente est vide pour l'instant.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── RIGHT: RDV DU JOUR ── */}
            <div className="sec-panel">
              <div className="sec-panel-header">
                <div className="sec-panel-title">
                  <Calendar size={16} color={ACCENT} /> Rendez-vous aujourd'hui
                  <span className="sec-panel-badge">{confirmes.length}</span>
                </div>
              </div>
              <div className="sec-rdv-list">
                {confirmes.map(apt => {
                  const pt = apt.patients || {};
                  const name = `${pt.prenom} ${pt.nom}`;
                  // Widen layout gives more space for inline details
                  return (
                    <div key={apt.id} className="sec-rdv-item active">
                      <div className="sec-rdv-item-header">
                        <span className="sec-rdv-item-name">{civility(pt.sexe)} {name}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '3px 8px', borderRadius: 6 }}>{formatTime(apt.date_rdv)}</span>
                      </div>
                      <div className="sec-rdv-item-meta"><Activity size={12} /> {apt.motif || apt.notes || 'Consultation de suivi'}</div>
                      <div className="sec-rdv-item-meta"><Phone size={12} /> {pt.telephone || 'Non renseigné'} • {pt.assurance || 'Aucune'}</div>

                      <div className="sec-rdv-item-actions">
                        <button className="sec-rdv-btn add" onClick={() => handleAjouterSalle(apt)}>
                          Ajouter à la salle
                        </button>
                        <button className="sec-rdv-btn cancel" onClick={() => handleAnnulerRdv(apt)}>
                          Annuler
                        </button>
                      </div>
                    </div>
                  );
                })}
                {confirmes.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: 13 }}>
                    <CalendarPlus size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                    Aucun rendez-vous à venir aujourd'hui.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── ACTION BAR (Bottom Sticky) ── */}
        <div className="sec-action-bar">
          <span className="sec-ab-label">Prochain appel</span>
          <div className="sec-ab-patient">
            {nextPatient ? (() => {
              const pt = nextPatient.patients || {};
              const av = getAvatarColor(pt.id || nextPatient.id);
              return (
                <>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: av.bg, color: av.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>
                    {getInitials(pt.prenom, pt.nom)}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#FFF' }}>{pt.prenom} {pt.nom}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{nextPatient.motif || 'En attente'}</div>
                  </div>
                </>
              );
            })() : (
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>La salle d'attente est vide</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="sec-ab-btn outline"
              onClick={() => setNextPatientIndex(i => i + 1)}
              disabled={enAttente.length <= 1}
            >
              Patient suivant 👉
            </button>
            <button
              className="sec-ab-btn"
              onClick={() => handleCommencer(nextPatient)}
              disabled={!nextPatient}
            >
              <PlayCircle size={18} /> Appeler en salle
            </button>
          </div>
        </div>
      </div>
    </>
  );
});

SecretaireDashboard.displayName = 'SecretaireDashboard';
export default SecretaireDashboard;
