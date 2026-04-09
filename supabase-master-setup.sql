-- ============================================================
-- MACROMEDICA — MASTER SCHEMA SETUP
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- This script ensures all tables, columns, and views aligned with the frontend.
-- ============================================================

-- 1. TABLES & COLUMNS

-- CABINETS
CREATE TABLE IF NOT EXISTS public.cabinets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  specialite TEXT,
  ville TEXT,
  telephone TEXT,
  adresse TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure missing columns exist if table was already created
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cabinets' AND column_name='ville') THEN
    ALTER TABLE public.cabinets ADD COLUMN ville TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cabinets' AND column_name='telephone') THEN
    ALTER TABLE public.cabinets ADD COLUMN telephone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cabinets' AND column_name='adresse') THEN
    ALTER TABLE public.cabinets ADD COLUMN adresse TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cabinets' AND column_name='specialite') THEN
    ALTER TABLE public.cabinets ADD COLUMN specialite TEXT;
  END IF;
END $$;

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cabinet_id UUID REFERENCES public.cabinets(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'medecin',
  nom_complet TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- PATIENTS
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cabinet_id UUID NOT NULL REFERENCES public.cabinets(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  telephone TEXT,
  date_naissance DATE,
  cin TEXT,
  email TEXT,
  adresse TEXT,
  ville TEXT,
  sexe TEXT CHECK (sexe IN ('homme', 'femme')),
  groupe_sanguin TEXT,
  allergies TEXT,
  antecedents TEXT,
  notes_medecin TEXT,
  mutuelle TEXT,
  medecin_referent TEXT,
  num_dossier TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='patients' AND column_name='notes_medecin') THEN
    ALTER TABLE public.patients ADD COLUMN notes_medecin TEXT;
  END IF;
END $$;

-- CONSULTATIONS
CREATE TABLE IF NOT EXISTS public.consultations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cabinet_id UUID NOT NULL REFERENCES public.cabinets(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  montant NUMERIC DEFAULT 0,
  statut TEXT CHECK (statut IN ('paye', 'credit', 'annule')),
  date_consult DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RDV (Rendez-vous)
CREATE TABLE IF NOT EXISTS public.rdv (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cabinet_id UUID NOT NULL REFERENCES public.cabinets(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  date_rdv TIMESTAMPTZ NOT NULL,
  statut TEXT DEFAULT 'confirme' CHECK (statut IN ('confirme', 'annule', 'termine')),
  notes TEXT,
  rappel_envoye BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- SALLE ATTENTE
CREATE TABLE IF NOT EXISTS public.salle_attente (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cabinet_id UUID NOT NULL REFERENCES public.cabinets(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'en_consultation', 'termine', 'annule')),
  position INTEGER,
  heure_arrivee TIMESTAMPTZ DEFAULT now(),
  date_rdv DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- DOCUMENTS
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cabinet_id UUID NOT NULL REFERENCES public.cabinets(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  type_document TEXT,
  storage_path TEXT NOT NULL,
  nom_fichier TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. VIEWS (Required for dashboard and real-time frontend)

-- Vue Salle Attente (Joins with patients)
CREATE OR REPLACE VIEW public.vue_salle_attente AS
SELECT 
  s.*,
  p.nom,
  p.prenom,
  p.telephone
FROM public.salle_attente s
JOIN public.patients p ON s.patient_id = p.id;

-- Vue Métriques Jour
CREATE OR REPLACE VIEW public.vue_metriques_jour AS
SELECT 
  cabinet_id,
  COUNT(DISTINCT patient_id) AS patients_aujourd_hui,
  SUM(CASE WHEN statut = 'paye' THEN montant ELSE 0 END) AS ca_aujourd_hui,
  SUM(CASE WHEN statut = 'credit' THEN montant ELSE 0 END) AS credits_aujourd_hui
FROM public.consultations
WHERE date_consult = CURRENT_DATE
GROUP BY cabinet_id;

-- Vue CA Mensuel
CREATE OR REPLACE VIEW public.vue_ca_mensuel AS
SELECT 
  cabinet_id,
  TO_CHAR(date_consult, 'YYYY-MM') AS mois,
  SUM(CASE WHEN statut = 'paye' THEN montant ELSE 0 END) AS ca_paye,
  SUM(CASE WHEN statut = 'credit' THEN montant ELSE 0 END) AS ca_credit,
  COUNT(*) AS nb_consultations
FROM public.consultations
GROUP BY cabinet_id, mois;

-- 3. RLS POLICIES (CLEAN & NON-RECURSIVE)

-- Function to drop all policies for a table (needed to prevent recursion)
CREATE OR REPLACE FUNCTION public.drop_all_policies(tbl_name TEXT) 
RETURNS void AS $$
DECLARE
  pol_name TEXT;
BEGIN
  FOR pol_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = tbl_name AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol_name, tbl_name);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
SELECT public.drop_all_policies('cabinets');
SELECT public.drop_all_policies('profiles');
SELECT public.drop_all_policies('patients');
SELECT public.drop_all_policies('consultations');
SELECT public.drop_all_policies('rdv');
SELECT public.drop_all_policies('salle_attente');
SELECT public.drop_all_policies('documents');

-- Enable RLS on all tables
ALTER TABLE public.cabinets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rdv ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salle_attente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Dynamic Policies Setup

-- CABINETS: Owner only
CREATE POLICY "cabinets_full_access" ON public.cabinets
FOR ALL TO authenticated USING (auth.uid() = tenant_id);

-- PROFILES: Self only
CREATE POLICY "profiles_full_access" ON public.profiles
FOR ALL TO authenticated USING (auth.uid() = id);

-- PATIENTS, CONSULTATIONS, RDV, SALLE_ATTENTE, DOCUMENTS
-- Access based on cabinet_id link in profiles
CREATE POLICY "patients_access" ON public.patients
FOR ALL TO authenticated USING (cabinet_id IN (SELECT cabinet_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "consultations_access" ON public.consultations
FOR ALL TO authenticated USING (cabinet_id IN (SELECT cabinet_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "rdv_access" ON public.rdv
FOR ALL TO authenticated USING (cabinet_id IN (SELECT cabinet_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "salle_attente_access" ON public.salle_attente
FOR ALL TO authenticated USING (cabinet_id IN (SELECT cabinet_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "documents_access" ON public.documents
FOR ALL TO authenticated USING (cabinet_id IN (SELECT cabinet_id FROM public.profiles WHERE id = auth.uid()));

-- 4. VERIFICATION DONE
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public';
