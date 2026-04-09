ALTER TABLE public.cabinets
ADD COLUMN IF NOT EXISTS specialite TEXT;

ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS notes_medecin TEXT;
