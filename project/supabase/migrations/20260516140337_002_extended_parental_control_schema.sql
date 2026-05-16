/*
  # Extended Parental Control Schema - Advanced Features

  1. New Tables
    - `family_groups` - Family organization with shared settings
    - `security_settings` - MFA, device verification, security questions
    - `family_members` - Multi-parent permissions and roles
    - `connected_devices` - Device tracking and management
    - `protection_modes` - Predefined and custom protection modes
    - `geofence_zones` - Safe zones with entry/exit alerts
    - `notifications` - Smart notification system
    - `reward_system` - Rewards and motivation tracking
    - `permission_requests` - Child request system
    - `activity_reports` - AI-generated activity summaries
    - `web_activity_logs` - Detailed web browsing history
    - `bypass_attempts` - Anti-bypass detection log

  2. Security
    - Enable RLS on all new tables
    - Parents can only access data for their own children
*/

-- Family groups
CREATE TABLE IF NOT EXISTS family_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Ma Famille',
  invite_code text UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 8)),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family creator can manage own families"
  ON family_groups FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Family creator can insert families"
  ON family_groups FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Family creator can update families"
  ON family_groups FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Security settings
CREATE TABLE IF NOT EXISTS security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mfa_enabled boolean NOT NULL DEFAULT false,
  mfa_method text NOT NULL DEFAULT 'email' CHECK (mfa_method IN ('app', 'sms', 'email')),
  phone_verified boolean NOT NULL DEFAULT false,
  phone_number text,
  security_questions jsonb,
  recovery_codes jsonb,
  biometric_enabled boolean NOT NULL DEFAULT false,
  trusted_devices jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own security settings"
  ON security_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own security settings"
  ON security_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own security settings"
  ON security_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Family members
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'secondary_parent' CHECK (role IN ('primary_parent', 'secondary_parent', 'tutor', 'read_only', 'limited')),
  permissions jsonb NOT NULL DEFAULT '{"can_edit_rules": true, "can_view_location": true, "can_manage_apps": true, "can_view_reports": true, "can_manage_devices": false}'::jsonb,
  joined_at timestamptz DEFAULT now()
);

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can read their family members"
  ON family_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM family_groups fg WHERE fg.id = family_members.family_id AND fg.created_by = auth.uid()));

CREATE POLICY "Primary parent can insert family members"
  ON family_members FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM family_groups fg WHERE fg.id = family_members.family_id AND fg.created_by = auth.uid()));

CREATE POLICY "Primary parent can update family members"
  ON family_members FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM family_groups fg WHERE fg.id = family_members.family_id AND fg.created_by = auth.uid()));

CREATE POLICY "Primary parent can delete family members"
  ON family_members FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM family_groups fg WHERE fg.id = family_members.family_id AND fg.created_by = auth.uid()));

-- Connected devices
CREATE TABLE IF NOT EXISTS connected_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  device_name text NOT NULL,
  device_type text NOT NULL DEFAULT 'android' CHECK (device_type IN ('android', 'iphone', 'windows', 'mac', 'chromebook', 'smart_tv', 'console', 'linux')),
  os_version text,
  battery_level integer,
  is_online boolean NOT NULL DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  security_level text NOT NULL DEFAULT 'medium' CHECK (security_level IN ('high', 'medium', 'low', 'critical')),
  anti_bypass_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE connected_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read devices for own children"
  ON connected_devices FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = connected_devices.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can insert devices for own children"
  ON connected_devices FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM children WHERE children.id = connected_devices.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can update devices for own children"
  ON connected_devices FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = connected_devices.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can delete devices for own children"
  ON connected_devices FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = connected_devices.child_id AND children.parent_id = auth.uid()));

-- Protection modes
CREATE TABLE IF NOT EXISTS protection_modes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  mode_name text NOT NULL CHECK (mode_name IN ('home', 'school', 'night', 'vacation', 'homework', 'emergency', 'travel', 'free_time')),
  is_active boolean NOT NULL DEFAULT false,
  screen_time_override integer,
  blocked_categories jsonb,
  allowed_apps_only jsonb,
  auto_activate_schedule jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE protection_modes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read modes for own children"
  ON protection_modes FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = protection_modes.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can insert modes for own children"
  ON protection_modes FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM children WHERE children.id = protection_modes.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can update modes for own children"
  ON protection_modes FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = protection_modes.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can delete modes for own children"
  ON protection_modes FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = protection_modes.child_id AND children.parent_id = auth.uid()));

-- Geofence zones
CREATE TABLE IF NOT EXISTS geofence_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius_meters integer NOT NULL DEFAULT 200,
  zone_type text NOT NULL DEFAULT 'safe' CHECK (zone_type IN ('home', 'school', 'safe', 'danger')),
  notify_on_enter boolean NOT NULL DEFAULT true,
  notify_on_exit boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE geofence_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read geofences for own children"
  ON geofence_zones FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = geofence_zones.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can insert geofences for own children"
  ON geofence_zones FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM children WHERE children.id = geofence_zones.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can update geofences for own children"
  ON geofence_zones FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = geofence_zones.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can delete geofences for own children"
  ON geofence_zones FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = geofence_zones.child_id AND children.parent_id = auth.uid()));

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_id uuid REFERENCES children(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Reward system
CREATE TABLE IF NOT EXISTS reward_system (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  task_name text NOT NULL,
  task_type text NOT NULL DEFAULT 'chore' CHECK (task_type IN ('chore', 'reading', 'homework', 'rule_compliance', 'goal')),
  reward_minutes integer NOT NULL DEFAULT 15,
  reward_apps jsonb,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  streak_days integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reward_system ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read rewards for own children"
  ON reward_system FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = reward_system.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can insert rewards for own children"
  ON reward_system FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM children WHERE children.id = reward_system.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can update rewards for own children"
  ON reward_system FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = reward_system.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can delete rewards for own children"
  ON reward_system FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = reward_system.child_id AND children.parent_id = auth.uid()));

-- Permission requests
CREATE TABLE IF NOT EXISTS permission_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  request_type text NOT NULL DEFAULT 'extra_time' CHECK (request_type IN ('extra_time', 'app_access', 'site_access', 'mode_change')),
  detail text NOT NULL,
  extra_minutes integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  parent_response text,
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz
);

ALTER TABLE permission_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read requests for own children"
  ON permission_requests FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = permission_requests.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can insert requests for own children"
  ON permission_requests FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM children WHERE children.id = permission_requests.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can update requests for own children"
  ON permission_requests FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = permission_requests.child_id AND children.parent_id = auth.uid()));

-- Activity reports
CREATE TABLE IF NOT EXISTS activity_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  total_screen_time integer NOT NULL DEFAULT 0,
  most_used_apps jsonb NOT NULL DEFAULT '[]'::jsonb,
  categories_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_insights jsonb,
  risk_flags jsonb,
  recommendations jsonb,
  security_score integer NOT NULL DEFAULT 50,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read reports for own children"
  ON activity_reports FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = activity_reports.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can insert reports for own children"
  ON activity_reports FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM children WHERE children.id = activity_reports.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can update reports for own children"
  ON activity_reports FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = activity_reports.child_id AND children.parent_id = auth.uid()));

-- Web activity logs
CREATE TABLE IF NOT EXISTS web_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text,
  category text,
  was_blocked boolean NOT NULL DEFAULT false,
  browsed_at timestamptz DEFAULT now()
);

ALTER TABLE web_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read web logs for own children"
  ON web_activity_logs FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = web_activity_logs.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can insert web logs for own children"
  ON web_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM children WHERE children.id = web_activity_logs.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can delete web logs for own children"
  ON web_activity_logs FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = web_activity_logs.child_id AND children.parent_id = auth.uid()));

-- Bypass attempts
CREATE TABLE IF NOT EXISTS bypass_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  attempt_type text NOT NULL CHECK (attempt_type IN ('uninstall', 'time_change', 'permission_revoke', 'vpn', 'safe_mode', 'apk_install', 'proxy', 'dev_mode')),
  details text,
  detected_at timestamptz DEFAULT now(),
  was_prevented boolean NOT NULL DEFAULT true
);

ALTER TABLE bypass_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read bypass attempts for own children"
  ON bypass_attempts FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM children WHERE children.id = bypass_attempts.child_id AND children.parent_id = auth.uid()));

CREATE POLICY "Parents can insert bypass attempts for own children"
  ON bypass_attempts FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM children WHERE children.id = bypass_attempts.child_id AND children.parent_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_devices_child_id ON connected_devices(child_id);
CREATE INDEX IF NOT EXISTS idx_protection_modes_child_id ON protection_modes(child_id);
CREATE INDEX IF NOT EXISTS idx_geofence_zones_child_id ON geofence_zones(child_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_child_id ON notifications(child_id);
CREATE INDEX IF NOT EXISTS idx_reward_system_child_id ON reward_system(child_id);
CREATE INDEX IF NOT EXISTS idx_permission_requests_child_id ON permission_requests(child_id);
CREATE INDEX IF NOT EXISTS idx_activity_reports_child_id ON activity_reports(child_id);
CREATE INDEX IF NOT EXISTS idx_activity_reports_date ON activity_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_web_activity_logs_child_id ON web_activity_logs(child_id);
CREATE INDEX IF NOT EXISTS idx_bypass_attempts_child_id ON bypass_attempts(child_id);
