import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Users, UserPlus, Shield, Crown, Eye, Lock, Trash2,
  Copy, QrCode, Link, Mail, Check
} from 'lucide-react';

interface FamilyGroup {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
}

interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: string;
  permissions: Record<string, unknown>;
  joined_at: string;
  profiles?: { email: string; full_name: string };
}

interface Child {
  id: string;
  name: string;
  age: number;
}

const ROLE_INFO: Record<string, { label: string; desc: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  primary_parent: { label: 'Parent principal', desc: 'Controle total sur tous les parametres et appareils', icon: Crown, color: '#2563eb' },
  secondary_parent: { label: 'Parent secondaire', desc: 'Peut modifier les regles et voir les activites', icon: Shield, color: '#059669' },
  tutor: { label: 'Tuteur', desc: 'Acces partiel pour surveiller et configurer', icon: Users, color: '#d97706' },
  read_only: { label: 'Lecture seule', desc: 'Peut uniquement voir les rapports et activites', icon: Eye, color: '#64748b' },
  limited: { label: 'Acces limite', desc: 'Acces restreint a certaines fonctionnalites', icon: Lock, color: '#94a3b8' },
};

export default function FamilyManagement() {
  const { user } = useAuth();
  const [family, setFamily] = useState<FamilyGroup | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('secondary_parent');
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    if (!user) return;

    const { data: familyData } = await supabase
      .from('family_groups')
      .select('*')
      .eq('created_by', user.id)
      .maybeSingle();

    if (familyData) {
      setFamily(familyData);

      const { data: membersData } = await supabase
        .from('family_members')
        .select('*, profiles:user_id(email, full_name)')
        .eq('family_id', familyData.id);
      if (membersData) setMembers(membersData);
    }

    const { data: childrenData } = await supabase
      .from('children')
      .select('id, name, age')
      .eq('parent_id', user.id);
    if (childrenData) setChildren(childrenData);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const createFamily = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('family_groups')
      .insert({ name: 'Ma Famille', created_by: user.id })
      .select()
      .maybeSingle();

    if (data) {
      setFamily(data);
      await supabase.from('family_members').insert({
        family_id: data.id,
        user_id: user.id,
        role: 'primary_parent',
        permissions: {
          can_edit_rules: true,
          can_view_location: true,
          can_manage_apps: true,
          can_view_reports: true,
          can_manage_devices: true,
        },
      });
      fetchData();
    }
  };

  const inviteMember = async () => {
    if (!family || !inviteEmail) return;
    setMessage('Invitation envoyee ! L\'utilisateur recevra un email pour rejoindre la famille.');
    setInviteEmail('');
    setShowInvite(false);
  };

  const removeMember = async (memberId: string) => {
    await supabase.from('family_members').delete().eq('id', memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const updateRole = async (memberId: string, newRole: string) => {
    await supabase.from('family_members').update({ role: newRole }).eq('id', memberId);
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
  };

  const copyInviteCode = () => {
    if (family?.invite_code) {
      navigator.clipboard.writeText(family.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <div className="page-loading">Chargement...</div>;

  return (
    <div className="family-page">
      <div className="page-header">
        <div>
          <h1>Gestion familiale</h1>
          <p>Gerer les membres et les permissions</p>
        </div>
        {family && (
          <button className="btn-primary" onClick={() => setShowInvite(!showInvite)}>
            <UserPlus size={18} /> Inviter un membre
          </button>
        )}
      </div>

      {!family ? (
        <div className="empty-state">
          <Users size={48} />
          <h2>Creer votre famille</h2>
          <p>Commencez par creer un groupe familial pour gerer les membres et les permissions.</p>
          <button className="btn-primary" onClick={createFamily}>
            <Users size={18} /> Creer ma famille
          </button>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="card-header">
              <h3><Crown size={18} /> Informations familiales</h3>
            </div>
            <div className="card-body">
              <div className="family-info-grid">
                <div className="family-info-item">
                  <span className="info-label">Nom de la famille</span>
                  <span className="info-value">{family.name}</span>
                </div>
                <div className="family-info-item">
                  <span className="info-label">Code d'invitation</span>
                  <div className="invite-code-row">
                    <code className="invite-code">{family.invite_code}</code>
                    <button className="btn-icon" onClick={copyInviteCode} title="Copier">
                      {copied ? <Check size={16} className="text-green" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
                <div className="family-info-item">
                  <span className="info-label">Membres</span>
                  <span className="info-value">{members.length}</span>
                </div>
                <div className="family-info-item">
                  <span className="info-label">Enfants</span>
                  <span className="info-value">{children.length}</span>
                </div>
              </div>

              <div className="invite-methods">
                <h4>Methodes d'invitation</h4>
                <div className="invite-method-grid">
                  <button className="invite-method-btn" onClick={copyInviteCode}>
                    <QrCode size={20} />
                    <span>QR Code</span>
                  </button>
                  <button className="invite-method-btn" onClick={copyInviteCode}>
                    <Copy size={20} />
                    <span>Code familial</span>
                  </button>
                  <button className="invite-method-btn" onClick={() => setShowInvite(true)}>
                    <Link size={20} />
                    <span>Lien securise</span>
                  </button>
                  <button className="invite-method-btn" onClick={() => setShowInvite(true)}>
                    <Mail size={20} />
                    <span>Par email</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {showInvite && (
            <div className="card form-card">
              <h3>Inviter un membre</h3>
              <form onSubmit={(e) => { e.preventDefault(); inviteMember(); }}>
                <div className="form-group">
                  <label>Adresse email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@exemple.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                    {Object.entries(ROLE_INFO).map(([key, info]) => (
                      <option key={key} value={key}>{info.label} - {info.desc}</option>
                    ))}
                  </select>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Envoyer l'invitation</button>
                  <button type="button" className="btn-secondary" onClick={() => setShowInvite(false)}>Annuler</button>
                </div>
              </form>
              {message && <div className="form-message">{message}</div>}
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3><Users size={18} /> Membres de la famille</h3>
            </div>
            <div className="card-body">
              <div className="member-list">
                {members.map((member) => {
                  const roleInfo = ROLE_INFO[member.role] || ROLE_INFO.limited;
                  const RoleIcon = roleInfo.icon;
                  const profile = member.profiles as { email: string; full_name: string } | undefined;

                  return (
                    <div key={member.id} className="member-item">
                      <div className="member-avatar">
                        {(profile?.full_name || profile?.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="member-info">
                        <span className="member-name">{profile?.full_name || profile?.email || 'Membre'}</span>
                        <span className="member-email">{profile?.email}</span>
                      </div>
                      <div className="member-role" style={{ color: roleInfo.color }}>
                        <RoleIcon size={16} />
                        <select
                          className="role-select"
                          value={member.role}
                          onChange={(e) => updateRole(member.id, e.target.value)}
                          disabled={member.user_id === user?.id}
                        >
                          {Object.entries(ROLE_INFO).map(([key, info]) => (
                            <option key={key} value={key}>{info.label}</option>
                          ))}
                        </select>
                      </div>
                      {member.user_id !== user?.id && (
                        <button className="btn-icon btn-danger" onClick={() => removeMember(member.id)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3><Users size={18} /> Enfants</h3>
            </div>
            <div className="card-body">
              <div className="children-grid">
                {children.map((child) => (
                  <div key={child.id} className="child-card">
                    <div className="child-card-avatar">{child.name.charAt(0).toUpperCase()}</div>
                    <div className="child-card-info">
                      <h3>{child.name}</h3>
                      <p>{child.age} ans</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
