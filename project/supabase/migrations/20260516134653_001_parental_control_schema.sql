/*
  # Parental Control App - Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text)
      - `role` (text: 'parent' or 'child')
      - `avatar_url` (text, nullable)
      - `created_at` (timestamptz)

    - `children`
      - `id` (uuid, primary key)
      - `parent_id` (uuid, references profiles.id)
      - `name` (text)
      - `age` (integer)
      - `device_name` (text)
      - `avatar_url` (text, nullable)
      - `created_at` (timestamptz)

    - `screen_time_rules`
      - `id` (uuid, primary key)
      - `child_id` (uuid, references children.id)
      - `daily_limit_minutes` (integer)
      - `bedtime_start` (text, e.g. "21:00")
      - `bedtime_end` (text, e.g. "07:00")
      - `school_hours_start` (text, nullable)
      - `school_hours_end` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `app_restrictions`
      - `id` (uuid, primary key)
      - `child_id` (uuid, references children.id)
      - `app_name` (text)
      - `package_name` (text)
      - `is_blocked` (boolean)
      - `time_limit_minutes` (integer, nullable)
      - `category` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `web_filters`
      - `id` (uuid, primary key)
      - `child_id` (uuid, references children.id)
      - `url_pattern` (text)
      - `category` (text)
      - `is_allowed` (boolean)
      - `created_at` (timestamptz)

    - `location_history`
      - `id` (uuid, primary key)
      - `child_id` (uuid, references children.id)
      - `latitude` (double precision)
      - `longitude` (double precision)
      - `address` (text, nullable)
      - `recorded_at` (timestamptz)

    - `sos_alerts`
      - `id` (uuid, primary key)
      - `child_id` (uuid, references children.id)
      - `latitude` (double precision, nullable)
      - `longitude` (double precision, nullable)
      - `message` (text, nullable)
      - `is_resolved` (boolean)
      - `created_at` (timestamptz)
      - `resolved_at` (timestamptz, nullable)

    - `app_usage_logs`
      - `id` (uuid, primary key)
      - `child_id` (uuid, references children.id)
      - `app_name` (text)
      - `package_name` (text)
      - `duration_minutes` (integer)
      - `logged_date` (date)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Parents can only access data for their own children
    - Children can read their own restrictions but not modify them
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'parent' CHECK (role IN ('parent', 'child')),
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Children table
CREATE TABLE IF NOT EXISTS children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  age integer NOT NULL DEFAULT 0,
  device_name text NOT NULL DEFAULT '',
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read own children"
  ON children FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Parents can insert own children"
  ON children FOR INSERT
  TO authenticated
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Parents can update own children"
  ON children FOR UPDATE
  TO authenticated
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Parents can delete own children"
  ON children FOR DELETE
  TO authenticated
  USING (parent_id = auth.uid());

-- Screen time rules
CREATE TABLE IF NOT EXISTS screen_time_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  daily_limit_minutes integer NOT NULL DEFAULT 120,
  bedtime_start text NOT NULL DEFAULT '21:00',
  bedtime_end text NOT NULL DEFAULT '07:00',
  school_hours_start text,
  school_hours_end text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE screen_time_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read screen time rules for own children"
  ON screen_time_rules FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = screen_time_rules.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can insert screen time rules for own children"
  ON screen_time_rules FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM children WHERE children.id = screen_time_rules.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can update screen time rules for own children"
  ON screen_time_rules FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = screen_time_rules.child_id AND children.parent_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM children WHERE children.id = screen_time_rules.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can delete screen time rules for own children"
  ON screen_time_rules FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = screen_time_rules.child_id AND children.parent_id = auth.uid()));

-- App restrictions
CREATE TABLE IF NOT EXISTS app_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  app_name text NOT NULL,
  package_name text NOT NULL DEFAULT '',
  is_blocked boolean NOT NULL DEFAULT false,
  time_limit_minutes integer,
  category text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read app restrictions for own children"
  ON app_restrictions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = app_restrictions.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can insert app restrictions for own children"
  ON app_restrictions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM children WHERE children.id = app_restrictions.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can update app restrictions for own children"
  ON app_restrictions FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = app_restrictions.child_id AND children.parent_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM children WHERE children.id = app_restrictions.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can delete app restrictions for own children"
  ON app_restrictions FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = app_restrictions.child_id AND children.parent_id = auth.uid()));

-- Web filters
CREATE TABLE IF NOT EXISTS web_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  url_pattern text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  is_allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE web_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read web filters for own children"
  ON web_filters FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = web_filters.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can insert web filters for own children"
  ON web_filters FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM children WHERE children.id = web_filters.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can update web filters for own children"
  ON web_filters FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = web_filters.child_id AND children.parent_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM children WHERE children.id = web_filters.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can delete web filters for own children"
  ON web_filters FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = web_filters.child_id AND children.parent_id = auth.uid()));

-- Location history
CREATE TABLE IF NOT EXISTS location_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  address text,
  recorded_at timestamptz DEFAULT now()
);

ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read location history for own children"
  ON location_history FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = location_history.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can insert location history for own children"
  ON location_history FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM children WHERE children.id = location_history.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can delete location history for own children"
  ON location_history FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = location_history.child_id AND children.parent_id = auth.uid()));

-- SOS alerts
CREATE TABLE IF NOT EXISTS sos_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  latitude double precision,
  longitude double precision,
  message text,
  is_resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read SOS alerts for own children"
  ON sos_alerts FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = sos_alerts.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can insert SOS alerts for own children"
  ON sos_alerts FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM children WHERE children.id = sos_alerts.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can update SOS alerts for own children"
  ON sos_alerts FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = sos_alerts.child_id AND children.parent_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM children WHERE children.id = sos_alerts.child_id AND children.parent_id = auth.uid()));

-- App usage logs
CREATE TABLE IF NOT EXISTS app_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  app_name text NOT NULL,
  package_name text NOT NULL DEFAULT '',
  duration_minutes integer NOT NULL DEFAULT 0,
  logged_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE app_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read app usage logs for own children"
  ON app_usage_logs FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = app_usage_logs.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can insert app usage logs for own children"
  ON app_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM children WHERE children.id = app_usage_logs.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can delete app usage logs for own children"
  ON app_usage_logs FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = app_usage_logs.child_id AND children.parent_id = auth.uid()));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_children_parent_id ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_screen_time_rules_child_id ON screen_time_rules(child_id);
CREATE INDEX IF NOT EXISTS idx_app_restrictions_child_id ON app_restrictions(child_id);
CREATE INDEX IF NOT EXISTS idx_web_filters_child_id ON web_filters(child_id);
CREATE INDEX IF NOT EXISTS idx_location_history_child_id ON location_history(child_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_child_id ON sos_alerts(child_id);
CREATE INDEX IF NOT EXISTS idx_app_usage_logs_child_id ON app_usage_logs(child_id);
CREATE INDEX IF NOT EXISTS idx_app_usage_logs_logged_date ON app_usage_logs(logged_date);
