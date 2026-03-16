import React, { useState, useEffect } from 'react';
import { 
  auth, db 
} from './firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  FilePlus, 
  Database, 
  Users, 
  LogOut, 
  Search, 
  Download, 
  Trash2, 
  Plus, 
  X,
  ChevronRight,
  FileText,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Edit,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  AdminProfile, 
  AnalysisReport, 
  ClientInfo, 
  SampleInfo, 
  TestResult, 
  AnalysisInfo,
  OperationType,
  UserRole,
  ReportType
} from './types';
import { handleFirestoreError } from './utils/errorHandlers';
import { generatePDF } from './utils/pdfGenerator';
import ErrorBoundary from './components/ErrorBoundary';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Constants ---

const SALUTATIONS = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.'];
const SAMPLE_SUBTYPES = ['Potable Water', 'Non-Potable Water'];
const REPORT_TYPES: ReportType[] = ['Biological', 'Biocide', 'Potable Water'];

const DEFAULT_TESTS: Record<ReportType, TestResult[]> = {
  'Biological': [
    { test: 'E. coli', method: 'Colilert', result: '', unit: 'MPN/100 mL', rl: '1' },
    { test: 'Enterococci (Enterolert)', method: 'Enterolert', result: '', unit: 'MPN/100 mL', rl: '1' },
    { test: 'Heterotrophic Plate Count', method: 'SimPlate', result: '', unit: 'MPN/mL', rl: '1' }
  ],
  'Biocide': [
    { test: 'Chlorite', method: 'EPA 300.1', result: '', unit: 'mg/L', rl: '0.01' },
    { test: 'Chlorate', method: 'EPA 300.1', result: '', unit: 'mg/L', rl: '0.01' },
    { test: 'Total Trihalomethanes TTHM', method: 'EPA 8260 D', result: '', unit: 'µg/L', rl: '0.5' },
    { test: 'Haloacetic acid', method: 'EPA 552.2', result: '', unit: 'µg/L', rl: '1.0' }
  ],
  'Potable Water': [
    { test: 'Total Coliform', method: 'SM 9223 B', result: '', unit: 'MPN/100 mL', rl: '1' },
    { test: 'Turbidity', method: 'EPA 180.1', result: '', unit: 'NTU', rl: '0.1' },
    { test: 'Chlorine Residual', method: 'SM 4500-Cl G', result: '', unit: 'mg/L', rl: '0.05' }
  ]
};

// --- Components ---

const Button = ({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  children, 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
    secondary: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 shadow-sm',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
    outline: 'bg-transparent text-indigo-600 border border-indigo-600 hover:bg-indigo-50'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
};

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 50 }}
    className={cn(
      "fixed bottom-8 right-8 z-[200] px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border",
      type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-red-50 border-red-100 text-red-800"
    )}
  >
    {type === 'success' ? <ShieldCheck size={20} className="text-emerald-600" /> : <AlertCircle size={20} className="text-red-600" />}
    <p className="text-sm font-bold">{message}</p>
    <button onClick={onClose} className="ml-4 p-1 hover:bg-black/5 rounded-lg transition-colors">
      <X size={16} />
    </button>
  </motion.div>
);

const Input = ({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>}
    <input
      className={cn(
        "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-gray-900",
        error && "border-red-500 focus:ring-red-500"
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'records' | 'admins'>('dashboard');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        try {
          const docRef = doc(db, 'admins', u.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const profile = docSnap.data() as AdminProfile;
            // Force super-admin role and active status for the primary owner
            if (u.email === 'bhavnayeotikar@gmail.com' && (profile.role !== 'super-admin' || !profile.isActive)) {
              const updatedProfile = { ...profile, role: 'super-admin' as UserRole, isActive: true };
              await setDoc(docRef, updatedProfile);
              setAdminProfile(updatedProfile);
            } else {
              setAdminProfile(profile);
            }
          } else {
            // Check if it's the super admin email
            if (u.email === 'bhavnayeotikar@gmail.com') {
              const newProfile: AdminProfile = {
                uid: u.uid,
                adminId: 'SUPER_ADMIN',
                email: u.email!,
                role: 'super-admin',
                displayName: u.displayName || 'Super Admin',
                isActive: true,
                createdAt: serverTimestamp()
              };
              await setDoc(docRef, newProfile);
              setAdminProfile(newProfile);
            } else {
              // Not an admin
              await signOut(auth);
              alert('Access denied. You are not an authorized admin.');
            }
          }
        } catch (error) {
          console.error('Error fetching admin profile:', error);
        }
      } else {
        setUser(null);
        setAdminProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
                BL
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900 leading-tight">BIOCOM LABS</h1>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">LIMS Portal</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <SidebarItem 
              icon={<LayoutDashboard size={20} />} 
              label="Dashboard" 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
            />
            <SidebarItem 
              icon={<FilePlus size={20} />} 
              label="Create Report" 
              active={activeTab === 'create'} 
              onClick={() => setActiveTab('create')} 
            />
            <SidebarItem 
              icon={<Database size={20} />} 
              label="Sample Records" 
              active={activeTab === 'records'} 
              onClick={() => setActiveTab('records')} 
            />
            {adminProfile?.role === 'super-admin' && (
              <SidebarItem 
                icon={<Users size={20} />} 
                label="Manage Admins" 
                active={activeTab === 'admins'} 
                onClick={() => setActiveTab('admins')} 
              />
            )}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs">
                {adminProfile?.displayName?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{adminProfile?.displayName}</p>
                <p className="text-[10px] text-gray-500 truncate">{adminProfile?.role}</p>
              </div>
            </div>
            <button 
              onClick={() => signOut(auth)}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
            <h2 className="text-lg font-bold text-gray-900 capitalize">
              {activeTab === 'dashboard' ? 'Overview' : activeTab.replace('-', ' ')}
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium text-gray-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </header>

          <div className="p-8 max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && <DashboardView setActiveTab={setActiveTab} />}
              {activeTab === 'create' && <CreateReportView adminProfile={adminProfile} showToast={showToast} />}
              {activeTab === 'records' && <RecordsView adminProfile={adminProfile} showToast={showToast} />}
              {activeTab === 'admins' && <AdminsView showToast={showToast} />}
            </AnimatePresence>
          </div>
        </main>
        
        <AnimatePresence>
          {toast && (
            <Toast 
              message={toast.message} 
              type={toast.type} 
              onClose={() => setToast(null)} 
            />
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}

// --- Sub-Views ---

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
        active 
          ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" 
          : "text-gray-500 hover:bg-indigo-50 hover:text-indigo-600"
      )}
    >
      <span className={cn("transition-transform group-hover:scale-110", active ? "text-white" : "text-gray-400 group-hover:text-indigo-600")}>
        {icon}
      </span>
      <span className="text-sm font-semibold">{label}</span>
      {active && (
        <motion.div 
          layoutId="sidebar-active"
          className="ml-auto w-1.5 h-1.5 bg-white rounded-full"
        />
      )}
    </button>
  );
}

function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in instead.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        return;
      }
      if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized in Firebase. Please add this URL to Authorized Domains in Firebase Console.');
      } else {
        setError('Google sign-in failed: ' + err.message);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-white border border-gray-200 rounded-[2.5rem] p-10 shadow-xl">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6 shadow-lg shadow-indigo-100">
              BL
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">BIOCOM LABS</h1>
            <p className="text-gray-500 text-sm font-medium">LIMS Secure Access Portal</p>
          </div>

          <div className="space-y-6">
            <div className="flex bg-gray-100 p-1 rounded-2xl">
              <button 
                onClick={() => setIsSignUp(false)}
                className={cn(
                  "flex-1 py-2.5 text-xs font-bold rounded-xl transition-all",
                  !isSignUp ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                SIGN IN
              </button>
              <button 
                onClick={() => setIsSignUp(true)}
                className={cn(
                  "flex-1 py-2.5 text-xs font-bold rounded-xl transition-all",
                  isSignUp ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                SIGN UP
              </button>
            </div>

            <Button 
              onClick={handleGoogleLogin}
              variant="secondary"
              className="w-full py-4 text-base font-bold flex items-center justify-center gap-3 border-2 border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30"
              isLoading={loading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-gray-400 font-bold tracking-widest">Or use email</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4">
                <Input
                  label="Admin Email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@biocomlabs.com"
                />
                <Input
                  label="Password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-xs py-3 px-4 rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between">
                <Button 
                  type="submit" 
                  className="flex-1 py-4 text-base font-bold"
                  isLoading={loading}
                >
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Button>
              </div>

              {!isSignUp && (
                <button 
                  type="button"
                  onClick={async () => {
                    if (!email) {
                      setError('Please enter your email address first.');
                      return;
                    }
                    try {
                      await sendPasswordResetEmail(auth, email);
                      alert('Password reset email sent! Please check your inbox.');
                    } catch (err: any) {
                      setError('Error sending reset email: ' + err.message);
                    }
                  }}
                  className="w-full text-center text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors mt-4"
                >
                  FORGOT PASSWORD?
                </button>
              )}
            </form>
          </div>

          <p className="mt-10 text-center text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            Authorized Personnel Only • US EPA LAB CODE: NY01602
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function DashboardView({ setActiveTab }: { setActiveTab: (tab: any) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Reports" 
          value="0" 
          change="No reports generated yet" 
          icon={<FileText className="text-indigo-600" />} 
        />
        <StatCard 
          title="Samples Analyzed" 
          value="0" 
          change="No samples analyzed yet" 
          icon={<Database className="text-emerald-600" />} 
        />
        <StatCard 
          title="Active Admins" 
          value="0" 
          change="No active admins" 
          icon={<ShieldCheck className="text-blue-600" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <QuickAction 
              icon={<Plus className="text-indigo-600" />} 
              label="New Report" 
              onClick={() => setActiveTab('create')} 
            />
            <QuickAction 
              icon={<Search className="text-blue-600" />} 
              label="Search Records" 
              onClick={() => setActiveTab('records')} 
            />
            <QuickAction 
              icon={<UserPlus className="text-emerald-600" />} 
              label="Add Admin" 
              onClick={() => setActiveTab('admins')} 
            />
            <QuickAction 
              icon={<Download className="text-orange-600" />} 
              label="Export Data" 
              onClick={() => setActiveTab('records')} 
            />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Activity</h3>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
              <FileText size={32} />
            </div>
            <p className="text-sm font-bold text-gray-900">No Recent Activity</p>
            <p className="text-xs text-gray-500 mt-1">New activities will appear here as you use the system.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ title, value, change, icon }: { title: string; value: string; change: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
          {icon}
        </div>
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-wider">
          Live
        </span>
      </div>
      <h4 className="text-sm font-semibold text-gray-500 mb-1">{title}</h4>
      <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
      <p className="text-xs text-gray-400">{change}</p>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-[1.5rem] hover:bg-indigo-50 hover:shadow-md transition-all group gap-3"
    >
      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="text-sm font-bold text-gray-700">{label}</span>
    </button>
  );
}

function CreateReportView({ adminProfile, initialData, onComplete, showToast }: { 
  adminProfile: AdminProfile | null; 
  initialData?: AnalysisReport; 
  onComplete?: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}) {
  const [reportType, setReportType] = useState<ReportType>(initialData?.reportType || 'Biological');
  const [clientInfo, setClientInfo] = useState<ClientInfo>(initialData?.clientInfo || {
    clientName: '', salutation: '', fullName: '', phoneNumber: '', address: '', city: '', state: '', zipCode: '', country: ''
  });
  const [sampleInfo, setSampleInfo] = useState<SampleInfo>(initialData?.sampleInfo || {
    projectName: '', projectNumber: '', sampleId: '', sampleSubtype: '', samplingDate: '', samplingTime: '', samplePreparationDate: '', samplePreparationTime: ''
  });
  const [testResults, setTestResults] = useState<TestResult[]>(initialData?.testResults || DEFAULT_TESTS['Biological']);
  const [analysisInfo, setAnalysisInfo] = useState<AnalysisInfo>(initialData?.analysisInfo || {
    analysisDate: new Date().toISOString().split('T')[0],
    analysisTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    analysisBy: adminProfile?.displayName || '',
    qcReportingBy: 'Marubetsy Alcina'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update tests when report type changes (only if not editing or if user explicitly wants to reset)
  const handleReportTypeChange = (type: ReportType) => {
    setReportType(type);
    if (!initialData) {
      setTestResults(DEFAULT_TESTS[type]);
    }
  };

  const handleAddRow = () => {
    setTestResults([...testResults, { test: '', method: '', result: '', unit: '', rl: '' }]);
  };

  const handleRemoveRow = (index: number) => {
    setTestResults(testResults.filter((_, i) => i !== index));
  };

  const handleTestChange = (index: number, field: keyof TestResult, value: string) => {
    const newResults = [...testResults];
    newResults[index][field] = value;
    setTestResults(newResults);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const reportId = initialData?.reportId || `REP-${Date.now()}`;
      const report: AnalysisReport = {
        reportId,
        reportType,
        clientInfo,
        sampleInfo,
        testResults,
        analysisInfo,
        createdAt: initialData?.createdAt || serverTimestamp(),
        createdBy: initialData?.createdBy || adminProfile?.uid || 'system'
      };

      // Generate and trigger PDF download immediately for better UX
      const pdf = generatePDF(report);
      pdf.save(`BIOCOM_REPORT_${report.sampleInfo.sampleId}.pdf`);

      // Save to Firestore in background (or at least after PDF is triggered)
      await setDoc(doc(db, 'reports', reportId), report);

      showToast(initialData ? 'Report updated successfully!' : 'Report generated and saved successfully!');
      if (onComplete) onComplete();
    } catch (error) {
      handleFirestoreError(error, initialData ? OperationType.UPDATE : OperationType.CREATE, 'reports');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-8 pb-20">
        {/* Report Type Selection */}
        <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Filter size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Report Category</h3>
          </div>
          <div className="flex flex-wrap gap-4">
            {REPORT_TYPES.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => handleReportTypeChange(type)}
                className={cn(
                  "px-6 py-3 rounded-xl text-sm font-bold transition-all border",
                  reportType === type 
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100" 
                    : "bg-white text-gray-600 border-gray-200 hover:border-indigo-200 hover:bg-indigo-50"
                )}
              >
                {type} Report
              </button>
            ))}
          </div>
        </section>

        {/* Client Information */}
        <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Users size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Client Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input label="Client Name" value={clientInfo.clientName} onChange={e => setClientInfo({...clientInfo, clientName: e.target.value})} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Salutation</label>
              <select 
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={clientInfo.salutation} 
                onChange={e => setClientInfo({...clientInfo, salutation: e.target.value})}
              >
                <option value="">Select Salutation</option>
                {SALUTATIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Input label="Full Name" value={clientInfo.fullName} onChange={e => setClientInfo({...clientInfo, fullName: e.target.value})} required />
            <Input label="Phone Number" value={clientInfo.phoneNumber} onChange={e => setClientInfo({...clientInfo, phoneNumber: e.target.value})} />
            <div className="md:col-span-2">
              <Input label="Address" value={clientInfo.address} onChange={e => setClientInfo({...clientInfo, address: e.target.value})} required />
            </div>
            <Input label="City" value={clientInfo.city} onChange={e => setClientInfo({...clientInfo, city: e.target.value})} required />
            <Input label="State" value={clientInfo.state} onChange={e => setClientInfo({...clientInfo, state: e.target.value})} required />
            <Input label="Zip Code" value={clientInfo.zipCode} onChange={e => setClientInfo({...clientInfo, zipCode: e.target.value})} required />
            <Input label="Country" value={clientInfo.country} onChange={e => setClientInfo({...clientInfo, country: e.target.value})} required />
          </div>
        </section>

        {/* Sample Information */}
        <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Database size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Sample Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2">
              <Input label="Project Name" value={sampleInfo.projectName} onChange={e => setSampleInfo({...sampleInfo, projectName: e.target.value})} required />
            </div>
            <Input label="Project Number (PO)" value={sampleInfo.projectNumber} onChange={e => setSampleInfo({...sampleInfo, projectNumber: e.target.value})} required />
            <Input label="Sample ID" value={sampleInfo.sampleId} onChange={e => setSampleInfo({...sampleInfo, sampleId: e.target.value})} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Sample Subtype</label>
              <select 
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={sampleInfo.sampleSubtype} 
                onChange={e => setSampleInfo({...sampleInfo, sampleSubtype: e.target.value})}
              >
                <option value="">Select Subtype</option>
                {SAMPLE_SUBTYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Input label="Sampling Date" type="date" value={sampleInfo.samplingDate} onChange={e => setSampleInfo({...sampleInfo, samplingDate: e.target.value})} required />
            <Input label="Sampling Time" type="time" value={sampleInfo.samplingTime} onChange={e => setSampleInfo({...sampleInfo, samplingTime: e.target.value})} required />
            <Input label="Prep Date" type="date" value={sampleInfo.samplePreparationDate} onChange={e => setSampleInfo({...sampleInfo, samplePreparationDate: e.target.value})} />
            <Input label="Prep Time" type="time" value={sampleInfo.samplePreparationTime} onChange={e => setSampleInfo({...sampleInfo, samplePreparationTime: e.target.value})} />
          </div>
        </section>

        {/* Test Results Table */}
        <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <FileText size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Analytes & Results</h3>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAddRow}>
              <Plus size={16} className="mr-2" />
              Add Analyte
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Test</th>
                  <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Method</th>
                  <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Result</th>
                  <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Unit</th>
                  <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">RL</th>
                  <th className="pb-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {testResults.map((tr, idx) => (
                  <tr key={idx} className="group">
                    <td className="py-3 px-2">
                      <input 
                        className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-900"
                        value={tr.test} 
                        onChange={e => handleTestChange(idx, 'test', e.target.value)}
                        placeholder="Test Name"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input 
                        className="w-full bg-transparent border-none focus:ring-0 text-sm text-gray-600"
                        value={tr.method} 
                        onChange={e => handleTestChange(idx, 'method', e.target.value)}
                        placeholder="Method"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input 
                        className="w-full bg-indigo-50 border-none rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-indigo-700"
                        value={tr.result} 
                        onChange={e => handleTestChange(idx, 'result', e.target.value)}
                        placeholder="Result"
                        required
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input 
                        className="w-full bg-transparent border-none focus:ring-0 text-sm text-gray-600"
                        value={tr.unit} 
                        onChange={e => handleTestChange(idx, 'unit', e.target.value)}
                        placeholder="Unit"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input 
                        className="w-full bg-transparent border-none focus:ring-0 text-sm text-gray-600"
                        value={tr.rl} 
                        onChange={e => handleTestChange(idx, 'rl', e.target.value)}
                        placeholder="RL"
                      />
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button 
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Analysis Information */}
        <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Analysis Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Input label="Analysis Date" type="date" value={analysisInfo.analysisDate} onChange={e => setAnalysisInfo({...analysisInfo, analysisDate: e.target.value})} required />
            <Input label="Analysis Time" type="time" value={analysisInfo.analysisTime} onChange={e => setAnalysisInfo({...analysisInfo, analysisTime: e.target.value})} required />
            <Input label="Analysis By" value={analysisInfo.analysisBy} onChange={e => setAnalysisInfo({...analysisInfo, analysisBy: e.target.value})} required />
            <Input label="QC Reporting By" value={analysisInfo.qcReportingBy} onChange={e => setAnalysisInfo({...analysisInfo, qcReportingBy: e.target.value})} required />
          </div>
        </section>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="secondary" size="lg">Cancel</Button>
          <Button type="submit" size="lg" isLoading={isSubmitting}>
            Generate & Save Report
          </Button>
        </div>
      </form>
    </motion.div>
  );
}

function RecordsView({ adminProfile, showToast }: { adminProfile: AdminProfile | null; showToast: (message: string, type?: 'success' | 'error') => void }) {
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<ReportType | 'All'>('All');
  const [editingReport, setEditingReport] = useState<AnalysisReport | null>(null);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as AnalysisReport);
      setReports(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reports');
    });

    return () => unsubscribe();
  }, []);

  const filteredReports = reports.filter(r => {
    const matchesSearch = r.sampleInfo.sampleId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.sampleInfo.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.sampleInfo.projectName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = dateFilter ? r.sampleInfo.samplingDate === dateFilter : true;
    const matchesType = typeFilter === 'All' ? true : r.reportType === typeFilter;
    return matchesSearch && matchesDate && matchesType;
  });

  const handleDelete = async () => {
    if (!reportToDelete) return;
    try {
      await deleteDoc(doc(db, 'reports', reportToDelete));
      setReportToDelete(null);
      showToast('Record deleted successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'reports');
    }
  };

  const handleDownload = (report: AnalysisReport) => {
    const pdf = generatePDF(report);
    pdf.save(`BIOCOM_REPORT_${report.sampleInfo.sampleId}.pdf`);
  };

  if (editingReport) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Editing Report: {editingReport.reportId}</h3>
          <Button variant="ghost" onClick={() => setEditingReport(null)}>
            <X size={20} className="mr-2" />
            Cancel Edit
          </Button>
        </div>
        <CreateReportView 
          adminProfile={adminProfile} 
          initialData={editingReport} 
          onComplete={() => setEditingReport(null)} 
          showToast={showToast}
        />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTypeFilter('All')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
              typeFilter === 'All' 
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md" 
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            )}
          >
            All Reports
          </button>
          {REPORT_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                typeFilter === type 
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md" 
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              )}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <Input 
              label="Search by Project, Sample ID or PO #" 
              placeholder="Enter search term..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <Input 
              label="Filter by Date" 
              type="date" 
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />
          </div>
          <Button variant="secondary" onClick={() => {setSearchTerm(''); setDateFilter(''); setTypeFilter('All');}}>
            Reset
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest min-w-[200px]">Project Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Project # (PO)</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sample ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sampling Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sampling Time</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Analysis Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Analysis Time</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Loading records...</p>
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center">
                    <p className="text-sm text-gray-500">No records found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.reportId} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 max-w-[200px]">
                      <p className="text-sm font-bold text-gray-900 whitespace-normal leading-tight mb-1">{report.sampleInfo.projectName}</p>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter bg-indigo-50 px-2 py-0.5 rounded-full">
                        {report.reportType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{report.sampleInfo.projectNumber}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{report.sampleInfo.sampleId}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{report.clientInfo.clientName}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{report.sampleInfo.samplingDate}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{report.sampleInfo.samplingTime}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{report.analysisInfo.analysisDate}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{report.analysisInfo.analysisTime}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setEditingReport(report)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Edit Report"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDownload(report)}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Download PDF"
                        >
                          <Download size={18} />
                        </button>
                        <button 
                          onClick={() => setReportToDelete(report.reportId)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete Record"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={!!reportToDelete} 
        onClose={() => setReportToDelete(null)} 
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle size={24} />
            <p className="font-bold">Are you sure you want to delete this record?</p>
          </div>
          <p className="text-sm text-gray-500">This action cannot be undone. The analysis report and all associated data will be permanently removed.</p>
          <div className="flex gap-3 pt-2">
            <Button variant="danger" className="flex-1" onClick={handleDelete}>Delete Permanently</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setReportToDelete(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

function AdminsView({ showToast }: { showToast: (message: string, type?: 'success' | 'error') => void }) {
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [adminId, setAdminId] = useState('');
  const [role, setRole] = useState<UserRole>('admin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'admins'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as AdminProfile);
      setAdmins(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Note: In a real app, you'd use a Cloud Function to create users without logging out.
      // Here we'll just simulate it or explain the limitation.
      // For this demo, we'll create the document in Firestore.
      // The user would still need to be created in Auth.
      
      const tempUid = `user_${Date.now()}`; // Placeholder UID
      const newAdmin: AdminProfile = {
        uid: tempUid,
        adminId,
        email,
        role,
        displayName,
        isActive: true,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'admins', tempUid), newAdmin);
      // alert('Admin record created. Note: In this environment, the actual Auth account must be created separately or via a Cloud Function.');
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'admins');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setAdminId('');
    setRole('admin');
  };

  const toggleStatus = async (admin: AdminProfile) => {
    try {
      await setDoc(doc(db, 'admins', admin.uid), { ...admin, isActive: !admin.isActive });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'admins');
    }
  };

  const handleDelete = async () => {
    if (!adminToDelete) return;
    try {
      await deleteDoc(doc(db, 'admins', adminToDelete));
      setAdminToDelete(null);
      showToast('Admin deleted successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'admins');
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      showToast(`Password reset email sent to ${email}`);
    } catch (error) {
      showToast('Error sending reset email: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Admin Management</h3>
          <p className="text-sm text-gray-500">Manage system access and permissions</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <UserPlus size={18} className="mr-2" />
          Add New Admin
        </Button>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin Details</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admin ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.uid} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                          {admin.displayName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{admin.displayName}</p>
                          <p className="text-xs text-gray-500">{admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">{admin.adminId}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider",
                        admin.role === 'super-admin' ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"
                      )}>
                        {admin.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleStatus(admin)}
                        className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider transition-colors",
                          admin.isActive ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-red-50 text-red-600 hover:bg-red-100"
                        )}
                      >
                        {admin.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleResetPassword(admin.email)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Send Password Reset"
                        >
                          <ShieldCheck size={18} />
                        </button>
                        <button 
                          onClick={() => setAdminToDelete(admin.uid)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete Admin"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={!!adminToDelete} 
        onClose={() => setAdminToDelete(null)} 
        title="Confirm Admin Deletion"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle size={24} />
            <p className="font-bold">Are you sure you want to delete this admin account?</p>
          </div>
          <p className="text-sm text-gray-500">This will revoke all access for this user. This action cannot be undone.</p>
          <div className="flex gap-3 pt-2">
            <Button variant="danger" className="flex-1" onClick={handleDelete}>Delete Admin</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setAdminToDelete(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Add Admin Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900">Add New Admin</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddAdmin} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Admin ID" value={adminId} onChange={e => setAdminId(e.target.value)} required placeholder="e.g. ADM001" />
                  <Input label="Full Name" value={displayName} onChange={e => setDisplayName(e.target.value)} required placeholder="John Doe" />
                </div>
                <Input label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@biocomlabs.com" />
                <Input label="Temporary Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</label>
                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setRole('admin')}
                      className={cn(
                        "flex-1 py-3 rounded-xl border-2 transition-all font-bold text-sm",
                        role === 'admin' ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-gray-100 text-gray-400"
                      )}
                    >
                      Admin
                    </button>
                    <button 
                      type="button"
                      onClick={() => setRole('super-admin')}
                      className={cn(
                        "flex-1 py-3 rounded-xl border-2 transition-all font-bold text-sm",
                        role === 'super-admin' ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-gray-100 text-gray-400"
                      )}
                    >
                      Super Admin
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1" isLoading={isSubmitting}>Create Account</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
