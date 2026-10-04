
-- ─── EXTENSIONS ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. PROFILES ────────────────────────────────────────────
-- Auto-created when a user signs up via Auth
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-insert profile on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── 2. DOCTORS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctors (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  specialty            TEXT NOT NULL,
  qualification        TEXT,
  experience_years     INT DEFAULT 0,
  avatar_url           TEXT,
  bio                  TEXT,
  consultation_fee     INT NOT NULL DEFAULT 500,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. DOCTOR SCHEDULES (SPLIT SHIFTS SUPPORTED) ───────────
-- Allows multiple shifts per day (e.g., Morning 09:00-13:00 and Evening 16:00-21:00)
DROP TABLE IF EXISTS doctor_schedules CASCADE;

CREATE TABLE doctor_schedules (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id               UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week             INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sun, 1=Mon…6=Sat
  shift_name              TEXT DEFAULT 'General',                            -- 'Morning', 'Evening', etc.
  start_time              TIME NOT NULL,                                     -- e.g. '09:00'
  end_time                TIME NOT NULL,                                     -- e.g. '13:00'
  slot_duration_minutes   INT NOT NULL DEFAULT 30,
  CHECK (start_time < end_time),
  UNIQUE (doctor_id, day_of_week, start_time)
);

-- ─── 4. APPOINTMENTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name          TEXT NOT NULL,
  patient_phone         TEXT NOT NULL,
  patient_email         TEXT,
  user_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- nullable: guest booking
  doctor_id             UUID NOT NULL REFERENCES doctors(id),
  appointment_datetime  TIMESTAMPTZ NOT NULL,
  reason                TEXT,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  admin_notes           TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_appointments_updated_at ON appointments;
CREATE TRIGGER set_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ─── 5. CHAT SESSIONS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_key  TEXT UNIQUE NOT NULL,          -- localStorage key for anonymous users
  messages     JSONB NOT NULL DEFAULT '[]',   -- [{role, content, timestamp}]
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER set_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────

-- profiles: users see/edit only their own
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- doctors: anyone can read (public data)
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "doctors_select_all" ON doctors;
CREATE POLICY "doctors_select_all" ON doctors FOR SELECT USING (true);

-- doctor_schedules: anyone can read
ALTER TABLE doctor_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schedules_select_all" ON doctor_schedules;
CREATE POLICY "schedules_select_all" ON doctor_schedules FOR SELECT USING (true);

-- appointments:
--   - Anyone can INSERT (to allow guest booking via service role in API route)
--   - Users see only their own appointments
--   - Service role (used in API routes) bypasses RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "appointments_select_own" ON appointments;
CREATE POLICY "appointments_select_own" ON appointments
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "appointments_insert_own" ON appointments;
CREATE POLICY "appointments_insert_own" ON appointments
  FOR INSERT WITH CHECK (true);

-- chat_sessions: users see only their own
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_sessions_select_own" ON chat_sessions;
CREATE POLICY "chat_sessions_select_own" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "chat_sessions_insert_own" ON chat_sessions;
CREATE POLICY "chat_sessions_insert_own" ON chat_sessions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "chat_sessions_update_own" ON chat_sessions;
CREATE POLICY "chat_sessions_update_own" ON chat_sessions
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);



