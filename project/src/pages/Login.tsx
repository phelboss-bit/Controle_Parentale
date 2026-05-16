import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Mail, Lock, User, ArrowRight, Eye, EyeOff, Check, CircleAlert as AlertCircle, Smartphone, KeyRound, FingerprintPattern as Fingerprint } from 'lucide-react';

type Role = 'parent' | 'tutor' | 'child' | 'family';
type AuthStep = 'role' | 'register' | 'login' | 'verify' | 'mfa';

const ROLE_INFO: Record<Role, { title: string; desc: string; icon: string; color: string }> = {
  parent: {
    title: 'Parent',
    desc: 'Controle complet sur tous les appareils et parametres. Vous pouvez gerer les regles, voir les activites et configurer les protections.',
    icon: '👨‍👩‍👧‍👦',
    color: '#2563eb',
  },
  tutor: {
    title: 'Tuteur',
    desc: 'Acces partiel pour surveiller et configurer les regles. Ideal pour les grands-parents ou gardiens qui ont besoin d\'un acces limite.',
    icon: '🛡️',
    color: '#059669',
  },
  child: {
    title: 'Enfant',
    desc: 'Profil surveille avec demandes d\'autorisation. L\'enfant peut demander du temps supplementaire ou l\'acces a des applications.',
    icon: '👶',
    color: '#d97706',
  },
  family: {
    title: 'Compte Famille',
    desc: 'Gestion collective avec plusieurs administrateurs. Parfait pour les familles ou plusieurs adultes partent la responsabilite.',
    icon: '🏠',
    color: '#7c3aed',
  },
};

const SOCIAL_PROVIDERS = [
  { name: 'Google', icon: 'G', color: '#4285f4' },
  { name: 'Apple', icon: '', color: '#000' },
  { name: 'Microsoft', icon: 'M', color: '#00a4ef' },
  { name: 'Facebook', icon: 'f', color: '#1877f2' },
  { name: 'Discord', icon: 'D', color: '#5865f2' },
];

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [step, setStep] = useState<AuthStep>('role');
  const [selectedRole, setSelectedRole] = useState<Role>('parent');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mfaCode, setMfaCode] = useState(['', '', '', '', '', '']);

  const passwordStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strengthLabel = ['Tres faible', 'Faible', 'Moyen', 'Fort', 'Tres fort', 'Excellent'];
  const strengthColor = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#059669'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegister && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (isRegister && passwordStrength() < 3) {
      setError('Le mot de passe doit etre plus fort (au moins 8 caracteres, majuscule, chiffre)');
      return;
    }

    setLoading(true);

    if (isRegister) {
      const { error } = await signUp(email, password, fullName);
      if (error) setError(error);
      else setStep('verify');
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    }

    setLoading(false);
  };

  const handleMfaInput = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    if (!/^\d*$/.test(value)) return;
    const newCode = [...mfaCode];
    newCode[index] = value;
    setMfaCode(newCode);
    if (value && index < 5) {
      const next = document.getElementById(`mfa-${index + 1}`);
      next?.focus();
    }
  };

  if (step === 'role') {
    return (
      <div className="login-page">
        <div className="login-container-wide">
          <div className="login-header">
            <div className="login-logo">
              <Shield size={40} />
            </div>
            <h1>FamilyGuard</h1>
            <p>Choisissez votre type de compte pour commencer</p>
          </div>

          <div className="role-grid">
            {(Object.entries(ROLE_INFO) as [Role, typeof ROLE_INFO[Role]][]).map(([key, info]) => (
              <button
                key={key}
                className={`role-card ${selectedRole === key ? 'selected' : ''}`}
                onClick={() => setSelectedRole(key)}
                style={{ '--role-color': info.color } as React.CSSProperties}
              >
                <span className="role-icon">{info.icon}</span>
                <h3>{info.title}</h3>
                <p>{info.desc}</p>
                {selectedRole === key && (
                  <div className="role-check">
                    <Check size={16} />
                  </div>
                )}
              </button>
            ))}
          </div>

          <button
            className="btn-primary btn-full"
            onClick={() => {
              setIsRegister(true);
              setStep('register');
            }}
          >
            Creer un compte {ROLE_INFO[selectedRole].title} <ArrowRight size={18} />
          </button>

          <div className="login-divider">
            <span>ou</span>
          </div>

          <button
            className="btn-secondary btn-full"
            onClick={() => {
              setIsRegister(false);
              setStep('login');
            }}
          >
            J'ai deja un compte
          </button>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-header">
            <div className="login-logo success">
              <Check size={40} />
            </div>
            <h1>Verifiez votre email</h1>
            <p>Nous avons envoye un lien de verification a <strong>{email}</strong></p>
          </div>

          <div className="verify-info">
            <AlertCircle size={18} />
            <p>Cliquez sur le lien dans l'email pour activer votre compte. Verifiez vos spams si necessaire.</p>
          </div>

          <button className="btn-primary btn-full" onClick={() => setStep('login')}>
            Aller a la connexion <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (step === 'mfa') {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-header">
            <div className="login-logo">
              <KeyRound size={40} />
            </div>
            <h1>Verification en deux etapes</h1>
            <p>Entrez le code de verification</p>
          </div>

          <div className="mfa-inputs">
            {mfaCode.map((digit, i) => (
              <input
                key={i}
                id={`mfa-${i}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleMfaInput(i, e.target.value)}
                className="mfa-input"
              />
            ))}
          </div>

          <div className="mfa-options">
            <button className="link-button">
              <Smartphone size={14} /> Envoyer par SMS
            </button>
            <button className="link-button">
              <Fingerprint size={14} /> Biomimetrie
            </button>
          </div>

          <button className="btn-primary btn-full">
            Verifier <ArrowRight size={18} />
          </button>

          <button className="link-button" onClick={() => setStep('login')}>
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <Shield size={40} />
          </div>
          <h1>{isRegister ? 'Creer un compte' : 'Connexion'}</h1>
          <p>
            {isRegister
              ? `Inscription en tant que ${ROLE_INFO[selectedRole].title}`
              : 'Accedez a votre espace parental'}
          </p>
        </div>

        {isRegister && (
          <div className="social-login">
            <p className="social-label">Inscription rapide avec</p>
            <div className="social-buttons">
              {SOCIAL_PROVIDERS.map((provider) => (
                <button
                  key={provider.name}
                  className="social-btn"
                  style={{ '--provider-color': provider.color } as React.CSSProperties}
                  title={provider.name}
                >
                  {provider.icon ? <span className="social-icon-text">{provider.icon}</span> : <span className="social-icon-svg">&#63743;</span>}
                </button>
              ))}
            </div>
            <div className="login-divider"><span>ou par email</span></div>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label htmlFor="fullName">Nom complet</label>
              <div className="input-wrapper">
                <User size={18} />
                <input
                  id="fullName"
                  type="text"
                  placeholder="Votre nom complet"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Adresse email</label>
            <div className="input-wrapper">
              <Mail size={18} />
              <input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <div className="input-wrapper">
              <Lock size={18} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {isRegister && password && (
              <div className="password-strength">
                <div className="strength-bars">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="strength-bar"
                      style={{
                        background: i <= passwordStrength() ? strengthColor[passwordStrength()] : '#e2e8f0',
                      }}
                    />
                  ))}
                </div>
                <span className="strength-label" style={{ color: strengthColor[passwordStrength()] }}>
                  {strengthLabel[passwordStrength()]}
                </span>
              </div>
            )}
          </div>

          {isRegister && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
              <div className="input-wrapper">
                <Lock size={18} />
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirmez le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {isRegister && (
            <div className="security-requirements">
              <p className="req-title">Le mot de passe doit contenir :</p>
              <div className={`req-item ${password.length >= 8 ? 'met' : ''}`}>
                <Check size={14} /> Au moins 8 caracteres
              </div>
              <div className={`req-item ${/[A-Z]/.test(password) ? 'met' : ''}`}>
                <Check size={14} /> Une majuscule
              </div>
              <div className={`req-item ${/[0-9]/.test(password) ? 'met' : ''}`}>
                <Check size={14} /> Un chiffre
              </div>
              <div className={`req-item ${/[^A-Za-z0-9]/.test(password) ? 'met' : ''}`}>
                <Check size={14} /> Un caractere special
              </div>
            </div>
          )}

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Chargement...' : isRegister ? 'Creer mon compte' : 'Se connecter'}
            <ArrowRight size={18} />
          </button>
        </form>

        {!isRegister && (
          <button className="link-button btn-full" onClick={() => setStep('mfa')}>
            <KeyRound size={14} /> Se connecter avec la verification en deux etapes
          </button>
        )}

        <div className="login-footer">
          <p>
            {isRegister ? 'Deja un compte ?' : 'Pas encore de compte ?'}{' '}
            <button
              className="link-button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
            >
              {isRegister ? 'Se connecter' : "S'inscrire"}
            </button>
          </p>
          {!isRegister && (
            <button className="link-button">Mot de passe oublie ?</button>
          )}
        </div>
      </div>
    </div>
  );
}
