-- Trocar FK de auth.users para public.users (profiles e pacientes)
-- Nota: em ambientes com dados existentes, rodar antes script que copia auth.users -> public.users

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE pacientes
  DROP CONSTRAINT IF EXISTS pacientes_user_id_fkey;

ALTER TABLE pacientes
  ADD CONSTRAINT pacientes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
