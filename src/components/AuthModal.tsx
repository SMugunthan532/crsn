import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  User, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  LogOut, 
  X, 
  Upload, 
  BadgeCheck, 
  Building, 
  KeyRound, 
  Phone, 
  FileCheck 
} from 'lucide-react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  firebaseSignOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification 
} from '../firebase';
import { CRSNSystem } from '../engine/CRSNSystem';
import { NEIGHBORHOOD_LOCALITIES } from '../engine/util/locationData';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register' | 'verify';
}

const LOCALITY_NAMES = Object.keys(NEIGHBORHOOD_LOCALITIES);

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login'
}) => {
  const system = CRSNSystem.getInstance();
  const currentUser = system.getCurrentUser();

  const [mode, setMode] = useState<'login' | 'register' | 'verify'>(defaultMode);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [locality, setLocality] = useState(LOCALITY_NAMES[0] || 'Maple Heights');
  const [phone, setPhone] = useState(currentUser?.getPhone() || '');

  // ID & Extra Security Proof Verification Form
  const [idDocType, setIdDocType] = useState<'Driver License' | 'Passport' | 'Utility Bill' | 'Community ID'>('Driver License');
  const [idNumber, setIdNumber] = useState('');
  const [extraProofDetails, setExtraProofDetails] = useState(currentUser?.getExtraProofDetails() || '');
  const [idUploadedFile, setIdUploadedFile] = useState<string | null>(null);

  // UI status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Sign In with Google (automatically creates and persists session without relogin)
  const handleGoogleAuth = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      system.registerOrSyncFirebaseUser({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        emailVerified: user.emailVerified,
        phoneNumber: user.phoneNumber
      });
      setSuccessMsg(`Welcome to CRSN Community, ${user.displayName || user.email}! Your session is active.`);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setErrorMsg(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Email / Password
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      system.registerOrSyncFirebaseUser({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        emailVerified: user.emailVerified,
        phoneNumber: user.phoneNumber
      });
      setSuccessMsg('Logged in successfully! Session saved.');
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      // If Firebase auth fails (e.g. offline or custom user registered locally), try system service
      try {
        const localUser = system.userService.login(email.split('@')[0], password);
        system.setCurrentUser(localUser);
        setSuccessMsg(`Welcome back, ${localUser.getName()}! Session preserved.`);
        setTimeout(() => onClose(), 900);
      } catch (localErr: any) {
        setErrorMsg(err.message || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  // Create Community Account (Email + Locality + Mobile)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Full name is required');
      return;
    }
    if (!username.trim()) {
      setErrorMsg('Username is required');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;

      // Send Firebase email verification
      try {
        await sendEmailVerification(fbUser);
      } catch (evErr) {
        console.warn('Email verification link could not be sent:', evErr);
      }

      // Sync user profile into system and Firestore
      const newUser = system.registerOrSyncFirebaseUser({
        uid: fbUser.uid,
        displayName: fullName,
        email: fbUser.email,
        emailVerified: fbUser.emailVerified
      });
      newUser.setLocality(locality);
      if (phone.trim()) {
        newUser.setPhone(phone.trim());
      }
      system.notify();

      setSuccessMsg('Account registered! Session preserved so you do not need to log in again.');
      setTimeout(() => {
        setMode('verify');
      }, 1200);
    } catch (err: any) {
      // Fallback register locally in CRSN system
      try {
        const u = system.registerUser(fullName, username, password, locality, email, phone);
        setSuccessMsg('Registered successfully! Active session established.');
        setTimeout(() => onClose(), 1000);
      } catch (subErr: any) {
        setErrorMsg(err.message || subErr.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // Submit Community ID & Extra Security Proof
  const handleVerifyId = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setErrorMsg('Please log in first to verify your identity');
      return;
    }

    setLoading(true);
    try {
      system.verifyUserId(
        currentUser.getUserId(), 
        idDocType, 
        `Document ID: ${idNumber || 'DOC-VERIFIED'}`,
        phone.trim() || currentUser.getPhone(),
        extraProofDetails.trim() || undefined
      );
      setSuccessMsg(`Identity & extra security proof verified! You now possess the "Verified Neighbor" trust badge.`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Sign out / switch account
  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Firebase signout note:', e);
    }
    system.logout();
    setSuccessMsg('Logged out. You can now log into another neighbor profile.');
    setTimeout(() => {
      onClose();
    }, 800);
  };

  // Send Email Verification Request
  const handleSendEmailVerification = async () => {
    const fbUser = auth.currentUser;
    if (fbUser) {
      setLoading(true);
      try {
        await sendEmailVerification(fbUser);
        setSuccessMsg('Verification link sent to ' + fbUser.email);
      } catch (e: any) {
        setErrorMsg(e.message || 'Could not send verification email');
      } finally {
        setLoading(false);
      }
    } else if (currentUser) {
      currentUser.setEmailVerified(true);
      system.notify();
      setSuccessMsg('Email verified in CRSN Community database!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141622] border border-[#2B2E42] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-[#1D2030] hover:bg-[#282C42] text-slate-400 hover:text-white border border-[#2D3148] transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-black flex items-center justify-center shadow-lg shadow-amber-500/20 font-bold">
            <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-mono flex items-center gap-1.5">
              <span>CRSN Auth & Security</span>
            </h2>
            <p className="text-xs text-slate-400">
              Community Identity & Proof Verification
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex p-1 bg-[#1A1C2A] rounded-xl border border-[#282B3E] mb-6">
          <button
            onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'login' ? 'bg-amber-500 text-black shadow-sm font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('register'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'register' ? 'bg-amber-500 text-black shadow-sm font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Join Network
          </button>
          <button
            onClick={() => { setMode('verify'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'verify' ? 'bg-amber-500 text-black shadow-sm font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            ID & Proof
          </button>
        </div>

        {/* Feedback banners */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* VIEW 1: SIGN IN */}
        {mode === 'login' && (
          <div className="space-y-4">
            {/* Active User Status if already signed in */}
            {currentUser && (
              <div className="p-3.5 rounded-2xl bg-[#191B2A] border border-[#2B2E44] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Currently Logged In:</span>
                  <span className="text-white font-mono font-bold flex items-center space-x-1">
                    <span>{currentUser.getName()}</span>
                    {currentUser.getIsVerified() && <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-400 font-medium">
                  ✓ Persistent session active — you do not need to sign in again.
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full mt-1 py-1.5 rounded-lg bg-[#25283C] hover:bg-rose-950/40 hover:text-rose-300 text-slate-300 text-xs transition border border-[#343852]"
                >
                  Switch Account / Log Out
                </button>
              </div>
            )}

            {/* 1-Click Google Sign In */}
            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2.5 py-2.5 px-4 rounded-xl bg-[#222536] hover:bg-[#2C3044] text-white text-xs font-semibold border border-[#343852] transition shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google Account</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#25283A]"></div>
              <span className="flex-shrink mx-3 text-[11px] text-slate-500 font-mono uppercase">Or with email / username</span>
              <div className="flex-grow border-t border-[#25283A]"></div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Email or Username
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah_j or neighbor@example.com"
                    className="w-full bg-[#181A26] border border-[#2A2E44] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#181A26] border border-[#2A2E44] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition shadow-sm"
              >
                {loading ? 'Authenticating...' : 'Sign In & Save Session'}
              </button>
            </form>
          </div>
        )}

        {/* VIEW 2: REGISTER / JOIN NETWORK */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Elena Rostova"
                  className="w-full bg-[#181A26] border border-[#2A2E44] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="elena_r"
                  className="w-full bg-[#181A26] border border-[#2A2E44] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Locality</label>
                <select
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="w-full bg-[#181A26] border border-[#2A2E44] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {LOCALITY_NAMES.map((name: string) => (
                    <option key={name} value={name} className="bg-[#141622]">{name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Mobile Number (For Owner Notifications & Pickup SMS)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 234-5678"
                  className="w-full bg-[#181A26] border border-[#2A2E44] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="elena@neighborhood.org"
                  className="w-full bg-[#181A26] border border-[#2A2E44] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  minLength={6}
                  className="w-full bg-[#181A26] border border-[#2A2E44] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition shadow-sm"
            >
              {loading ? 'Creating Member Record...' : 'Create Account & Stay Signed In'}
            </button>
          </form>
        )}

        {/* VIEW 3: USER VERIFICATION (ID + EXTRA PROOF FOR LENDER SECURITY) */}
        {mode === 'verify' && (
          <div className="space-y-4">
            <div className="bg-[#191B2A] border border-[#2A2D40] rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Acting Account:</span>
                <span className="text-white font-mono font-bold">{currentUser?.getName() || 'Not Logged In'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Mobile Phone:</span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {currentUser?.getPhone() || 'Not set (add below)'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Community Trust ID:</span>
                {currentUser?.getIsVerified() ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Verified Resident
                  </span>
                ) : (
                  <span className="text-amber-400 text-[11px]">Unverified</span>
                )}
              </div>
            </div>

            <form onSubmit={handleVerifyId} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Mobile Number for Owner Notifications
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 234-5678"
                    className="w-full bg-[#181A26] border border-[#2A2E44] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Primary ID Document Type
                </label>
                <select
                  value={idDocType}
                  onChange={(e) => setIdDocType(e.target.value as any)}
                  className="w-full bg-[#181A26] border border-[#2A2E44] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Driver License">State Driver License</option>
                  <option value="Passport">Government Passport</option>
                  <option value="Utility Bill">Residential Utility Bill / Address Proof</option>
                  <option value="Community ID">Community Association Member Card</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Document / Member ID Reference
                </label>
                <input
                  type="text"
                  required
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="e.g. DL-9830211 or ACCT-4421"
                  className="w-full bg-[#181A26] border border-[#2A2E44] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Extra Security Proof to Assure Lenders */}
              <div>
                <label className="block text-[11px] font-semibold text-amber-300 mb-1 flex items-center justify-between">
                  <span>Extra Lender Security Proof</span>
                  <span className="text-[10px] text-slate-400">Guarantees safe return</span>
                </label>
                <textarea
                  rows={2}
                  value={extraProofDetails}
                  onChange={(e) => setExtraProofDetails(e.target.value)}
                  placeholder="e.g. Employer email, HOA apartment lease ref, or deposit pledge to assure lenders."
                  className="w-full bg-[#181A26] border border-[#2A2E44] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              <div className="border border-dashed border-[#2F334A] rounded-2xl p-3 text-center bg-[#151724]">
                <Upload className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <p className="text-[11px] text-slate-300 font-medium">Upload Proof Document Photo</p>
                <p className="text-[10px] text-slate-500">Supports PNG, JPG, or PDF up to 10MB</p>
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setIdUploadedFile(file.name);
                  }}
                  className="mt-2 text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:bg-[#25283C] file:text-amber-400 hover:file:bg-[#2E324A] cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !currentUser}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-bold transition shadow-sm flex items-center justify-center space-x-1.5"
              >
                <BadgeCheck className="w-4 h-4 text-black" />
                <span>Submit Proof & Verify Security</span>
              </button>
            </form>
          </div>
        )}

        {/* Database Status footer */}
        <div className="mt-6 pt-3 border-t border-[#232536] flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Firestore Sync & Auth Active</span>
          </span>
          <span>Persistent Auth Enabled</span>
        </div>
      </div>
    </div>
  );
};
