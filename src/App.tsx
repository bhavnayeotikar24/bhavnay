import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from './firebase';

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
  Filter,
  History,
  ClipboardList,
  FileSpreadsheet,
  Upload,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ChevronLeft,
  Image as ImageIcon
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
  ReportType,
  AuditLog
} from './types';
import { handleFirestoreError } from './utils/errorHandlers';
import { generatePDF } from './utils/pdfGenerator';
import { exportToExcel } from './utils/excelExporter';
import { exportLogsToCSV, exportLogsToPDF } from './utils/logExporter';
import ErrorBoundary from './components/ErrorBoundary';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Constants ---

const PERMANENT_ADMINS = [
  'bhavnayeotikar@gmail.com',
  'byeotikar@ergonavgroup.com',
  'nfotopoulos@ergonavgroup.com'
];

const DEFAULT_ADMIN: AdminProfile = {
  adminId: 'ADMIN-001',
  email: 'bhavnayeotikar@gmail.com',
  displayName: 'System Administrator',
  role: 'super-admin',
  isActive: true,
  status: 'Approved',
  isPermanent: true,
  createdAt: new Date().toISOString(),
  signatureUrl: ''
};

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
  const [user, setUser] = useState<AdminProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'records' | 'admins' | 'logs'>('dashboard');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(true);

  // Firebase Auth sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const admins: AdminProfile[] = JSON.parse(localStorage.getItem('mock_admins') || '[]');
        const userEmail = firebaseUser.email?.toLowerCase() || '';
        let admin = admins.find(a => a.email.toLowerCase() === userEmail);
        
        if (!admin) {
          // Create default profile for first-time login/signup if not in list
          const isSystemAdmin = PERMANENT_ADMINS.includes(userEmail);
          
          admin = {
            adminId: `ADM-${Date.now()}`,
            email: userEmail,
            displayName: firebaseUser.displayName || userEmail.split('@')[0] || 'User',
            role: isSystemAdmin ? 'super-admin' : 'analyst', // Default role
            isActive: true,
            status: isSystemAdmin ? 'Approved' : 'Pending Approval',
            isPermanent: isSystemAdmin,
            password: '', // Password handled by Firebase Auth
            createdAt: new Date().toISOString(),
            signatureUrl: ''
          };
          const updatedAdmins = [...admins, admin];
          localStorage.setItem('mock_admins', JSON.stringify(updatedAdmins));
          window.dispatchEvent(new Event('mock_admins_updated'));

          // Log signup
          const logs = JSON.parse(localStorage.getItem('mock_logs') || '[]');
          const signupLog: AuditLog = {
            id: `LOG-SIGNUP-${Date.now()}`,
            userId: admin.adminId,
            userEmail: admin.email,
            userDisplayName: admin.displayName,
            userRole: admin.role,
            timestamp: new Date().toISOString(),
            action: 'SIGNUP',
            module: 'Auth',
            details: `New account created: ${admin.displayName} (${admin.email}). Status: ${admin.status}`
          };
          localStorage.setItem('mock_logs', JSON.stringify([signupLog, ...logs]));
        } else {
          // Identify permanent ones just in case
          if (PERMANENT_ADMINS.includes(userEmail) && (!admin.isPermanent || admin.status !== 'Approved')) {
            admin.isPermanent = true;
            admin.status = 'Approved';
            admin.role = 'super-admin';
            const updatedAdmins = admins.map(a => a.email === userEmail ? admin! : a);
            localStorage.setItem('mock_admins', JSON.stringify(updatedAdmins));
          }
        }
        
        if (!user) { // Only log if transitioning from logged out
          const logs = JSON.parse(localStorage.getItem('mock_logs') || '[]');
          const newLog: AuditLog = {
            id: `LOG-${Date.now()}`,
            userId: admin.adminId,
            userEmail: admin.email,
            userDisplayName: admin.displayName,
            userRole: admin.role,
            timestamp: new Date().toISOString(),
            action: 'LOGIN',
            module: 'Session',
            details: `User logged in. Approval Status: ${admin.status}`
          };
          localStorage.setItem('mock_logs', JSON.stringify([newLog, ...logs]));
        }

        localStorage.setItem('current_user', JSON.stringify(admin));
        setUser(admin);
      } else {
        localStorage.removeItem('current_user');
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []); // Only subscribe once on mount

  // Mock initial data if not exists
  useEffect(() => {
    const initMockData = () => {
      // Admins
      if (!localStorage.getItem('mock_admins')) {
        const initialAdmins: AdminProfile[] = [
          { ...DEFAULT_ADMIN, password: 'password123' },
          { 
            adminId: 'ADMIN-002', 
            email: 'jane@example.com', 
            displayName: 'Jane Analyst', 
            role: 'analyst', 
            password: 'password123', 
            status: 'Approved',
            isPermanent: false,
            isActive: true, 
            createdAt: new Date().toISOString() 
          },
          { 
            adminId: 'ADMIN-003', 
            email: 'quality@example.com', 
            displayName: 'QM Mark', 
            role: 'quality-manager', 
            password: 'password123', 
            status: 'Approved',
            isPermanent: false,
            isActive: true, 
            createdAt: new Date().toISOString() 
          }
        ];
        localStorage.setItem('mock_admins', JSON.stringify(initialAdmins));
      }

      // Reports
      if (!localStorage.getItem('mock_reports')) {
        localStorage.setItem('mock_reports', JSON.stringify([]));
      }

      // Logs
      if (!localStorage.getItem('mock_logs')) {
        localStorage.setItem('mock_logs', JSON.stringify([]));
      }

      // Check session (Moving this to onAuthStateChanged)
      /*
      const savedUser = localStorage.getItem('current_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      setLoading(false);
      */
    };

    initMockData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const logActivity = async (params: {
    action: string;
    module: string;
    details?: string;
    updatedValues?: any;
  }) => {
    if (!user) return;
    
    const logs = JSON.parse(localStorage.getItem('mock_logs') || '[]');
    const newLog: AuditLog = {
      id: `LOG-${Date.now()}`,
      userId: user.adminId,
      userEmail: user.email,
      userDisplayName: user.displayName,
      userRole: user.role,
      timestamp: new Date().toISOString(),
      ...params
    };
    
    const updatedLogs = [newLog, ...logs];
    localStorage.setItem('mock_logs', JSON.stringify(updatedLogs));
    
    // Dispatch event for other components to update if needed (since they use state)
    window.dispatchEvent(new Event('mock_logs_updated'));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      logActivity({
        action: 'LOGOUT',
        module: 'Session',
        details: 'User logged out successfully'
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthFlow setUser={setUser} logActivity={logActivity} />;
  }

  if (user.status !== 'Approved') {
    return <WaitingForApprovalView user={user} handleLogout={handleLogout} />;
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
            <SidebarItem 
              icon={<History size={20} />} 
              label="Activity Log" 
              active={activeTab === 'logs'} 
              onClick={() => setActiveTab('logs')} 
            />
            {(user.role === 'super-admin' || user.role === 'admin') && (
              <SidebarItem 
                icon={<Users size={20} />} 
                label="Manage Admin" 
                active={activeTab === 'admins'} 
                onClick={() => setActiveTab('admins')} 
              />
            )}
          </nav>

          <div className="p-4 border-t border-gray-100 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs">
                {user.displayName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{user.displayName}</p>
                <p className="text-[10px] text-gray-500 truncate capitalize">{user.role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-semibold"
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
              {activeTab === 'create' && <CreateReportView adminProfile={user} showToast={showToast} logActivity={logActivity} />}
              {activeTab === 'records' && <RecordsView adminProfile={user} showToast={showToast} logActivity={logActivity} />}
              {activeTab === 'admins' && <AdminsView adminProfile={user} showToast={showToast} logActivity={logActivity} />}
              {activeTab === 'logs' && <LogsView />}
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

// --- Auth System ---

function AuthFlow({ setUser, logActivity }: { setUser: (u: AdminProfile) => void, logActivity: (p: any) => void }) {
  const [view, setView] = useState<'login' | 'signup'>('login');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <AnimatePresence mode="wait">
          {view === 'login' ? (
            <LoginPage onSwitch={() => setView('signup')} logActivity={logActivity} />
          ) : (
            <SignUpPage onSwitch={() => setView('login')} />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function WaitingForApprovalView({ user, handleLogout }: { user: AdminProfile; handleLogout: () => void }) {
  const isRejected = user.status === 'Rejected';
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white border border-gray-200 rounded-[2.5rem] p-10 shadow-2xl text-center"
      >
        <div className={cn(
          "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 relative",
          isRejected ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500"
        )}>
          {isRejected ? <AlertCircle size={48} /> : <History size={48} className="animate-pulse" />}
          <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full border border-gray-100">
            <Lock size={16} className={isRejected ? "text-red-500" : "text-amber-500"} />
          </div>
        </div>
        
        <h2 className="text-3xl font-bold text-gray-900 mb-4">{isRejected ? 'Access Denied' : 'Pending Approval'}</h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Hello <span className="font-bold text-indigo-600">{user.displayName}</span>, your access request is currently <span className={cn(
            "px-2 py-0.5 rounded font-bold",
            isRejected ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
          )}>{user.status}</span>.
        </p>
        
        <div className={cn(
          "border rounded-2xl p-6 mb-10",
          isRejected ? "bg-red-50 border-red-100 text-red-700" : "bg-indigo-50 border-indigo-100 text-indigo-700"
        )}>
          <p className="text-xs font-medium leading-relaxed">
            {isRejected 
              ? "Your request for LIMS portal access has been declined by the system administrators. Please contact your supervisor or IT support if you believe this is an error."
              : "A notification has been sent to the system administrators. You will be able to access the LIMS portal once your request is reviewed and approved."}
          </p>
        </div>
        
        <div className="space-y-4">
          {!isRejected && (
            <Button 
              variant="secondary" 
              className="w-full py-4 rounded-xl"
              onClick={() => window.location.reload()}
            >
              Check Status
            </Button>
          )}
          <button 
            onClick={handleLogout}
            className="text-sm font-bold text-gray-400 hover:text-red-500 transition-colors"
          >
            {isRejected ? 'Return to Login' : 'Sign Out'}
          </button>
        </div>
        
        <p className="mt-12 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
          System Support: byeotikar@ergonavgroup.com
        </p>
      </motion.div>
    </div>
  );
}

function LoginPage({ onSwitch, logActivity }: { onSwitch: () => void, logActivity: (p: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // User state will be updated by onAuthStateChanged
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid Email or Password');
      } else {
        setError(err.message || 'Login failed');
      }
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess('Password reset link has been sent to your email.');
      
      // Log this activity
      await logActivity({
        action: 'PASSWORD_RESET_REQUESTED',
        module: 'Auth',
        details: `Password reset requested for email: ${email}`,
      });
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-white border border-gray-200 rounded-[2.5rem] p-10 shadow-xl"
    >
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6 shadow-lg shadow-indigo-100">
          BL
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">BIOCOM LABS</h1>
        <p className="text-gray-500 text-sm font-medium">LIMS Secure Access Portal</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="email"
              placeholder="Admin Email"
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="flex justify-end px-1">
            <button 
              type="button" 
              onClick={handleForgotPassword}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider"
            >
              Forgot Password?
            </button>
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-red-50 border border-red-100 p-3 rounded-xl flex gap-3 items-center text-red-600 text-xs font-semibold"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex gap-3 items-center text-emerald-600 text-xs font-semibold"
          >
            <ShieldCheck size={16} />
            {success}
          </motion.div>
        )}

        <Button type="submit" className="w-full py-4 rounded-2xl shadow-lg shadow-indigo-100" isLoading={loading}>
          Sign In
        </Button>

        <div className="pt-4 text-center">
          <p className="text-xs text-indigo-800 font-bold bg-indigo-50 p-3 rounded-xl mb-4">
            Note: Demo accounts are not migration-synced. Please Sign Up to create your first session account.
          </p>
          <p className="text-xs text-gray-500 font-medium">
            Don't have an account?{' '}
            <button type="button" onClick={onSwitch} className="text-indigo-600 font-bold hover:underline">
              Request Sign Up
            </button>
          </p>
        </div>
      </form>
    </motion.div>
  );
}

function SignUpPage({ onSwitch }: { onSwitch: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      // Update display name in Firebase Auth
      await updateProfile(userCredential.user, { displayName });
      
      // onAuthStateChanged will handle profile creation in mock_admins
      // and redirecting to dashboard
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white border border-gray-200 rounded-[2.5rem] p-10 shadow-xl"
    >
      <button onClick={onSwitch} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors mb-6 group">
        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        BACK TO LOGIN
      </button>

      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-4">
          <UserPlus size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
        <p className="text-gray-500 text-sm mt-2">Sign up for BIOCOM LABS LIMS access</p>
      </div>

      <form onSubmit={handleSignUp} className="space-y-4">
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Full Name"
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="email"
            placeholder="Admin Email"
            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-red-50 border border-red-100 p-3 rounded-xl flex gap-3 items-center text-red-600 text-xs font-semibold"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}

        <Button type="submit" className="w-full py-4 rounded-2xl shadow-lg shadow-indigo-100" isLoading={loading}>
          Register Account
        </Button>
      </form>
      
      <p className="mt-8 text-center text-[10px] text-gray-400 uppercase tracking-widest font-bold">
        Authorized Personnel Only
      </p>
    </motion.div>
  );
}

function DashboardView({ setActiveTab }: { setActiveTab: (tab: any) => void }) {
  const [stats, setStats] = useState({ reports: 0, admins: 0, logs: 0, pendingAdmins: 0 });
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const updateStats = () => {
      const reports = JSON.parse(localStorage.getItem('mock_reports') || '[]');
      const admins = JSON.parse(localStorage.getItem('mock_admins') || '[]');
      const logs = JSON.parse(localStorage.getItem('mock_logs') || '[]');
      
      setStats({
        reports: reports.length,
        admins: admins.length,
        logs: logs.length,
        pendingAdmins: admins.filter((a: AdminProfile) => a.status === 'Pending Approval').length
      });
      setRecentLogs(logs.slice(0, 5));
    };

    updateStats();
    
    // Listen for updates
    window.addEventListener('mock_logs_updated', updateStats);
    window.addEventListener('mock_reports_updated', updateStats);
    window.addEventListener('mock_admins_updated', updateStats);
    
    return () => {
      window.removeEventListener('mock_logs_updated', updateStats);
      window.removeEventListener('mock_reports_updated', updateStats);
      window.removeEventListener('mock_admins_updated', updateStats);
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.pendingAdmins > 0 && (
          <div className="md:col-span-3">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6 flex items-center justify-between shadow-sm shadow-amber-100"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-amber-900">Pending Approvals</h4>
                  <p className="text-sm text-amber-600">There are {stats.pendingAdmins} new user registration requests waiting for review.</p>
                </div>
              </div>
              <Button 
                variant="primary" 
                className="bg-amber-600 hover:bg-amber-700 shadow-amber-200"
                onClick={() => setActiveTab('admins')}
              >
                Review Requests
              </Button>
            </motion.div>
          </div>
        )}
        <StatCard 
          title="Total Reports" 
          value={stats.reports.toString()} 
          change={`${stats.reports} generated to date`} 
          icon={<FileText className="text-indigo-600" />} 
        />
        <StatCard 
          title="Samples Analyzed" 
          value={stats.reports.toString()} 
          change="Laboratory analysis records" 
          icon={<Database className="text-emerald-600" />} 
        />
        <StatCard 
          title="Active Admins" 
          value={stats.admins.toString()} 
          change="Authorized system personnel" 
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
          {recentLogs.length > 0 ? (
            <div className="space-y-6">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex gap-4 items-start pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                    <History size={18} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-bold text-gray-900 truncate">{log.action.replace(/_/g, ' ')}</p>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-1">{log.details}</p>
                    <div className="flex items-center gap-2 mt-2">
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter bg-gray-50 px-2 py-0.5 rounded-full">
                         {log.userDisplayName}
                       </span>
                       <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">
                         {log.userRole}
                       </span>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="w-full mt-2" onClick={() => setActiveTab('logs')}>
                View Full Audit Trail
                <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
              <ClipboardList size={32} className="mb-4 opacity-20" />
              <p className="text-sm font-bold">No Recent Activity</p>
              <p className="text-xs mt-1">Activities will appear here.</p>
            </div>
          )}
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

function CreateReportView({ adminProfile, initialData, onComplete, showToast, logActivity }: { 
  adminProfile: AdminProfile | null; 
  initialData?: AnalysisReport; 
  onComplete?: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  logActivity: (params: any) => Promise<void>;
}) {
  const [reportType, setReportType] = useState<ReportType>(initialData?.reportType || 'Biological');
  const [clientInfo, setClientInfo] = useState<ClientInfo>(initialData?.clientInfo || {
    clientName: '', salutation: '', fullName: '', phoneNumber: '', address: '', city: '', state: '', zipCode: '', country: ''
  });
  const [sampleInfo, setSampleInfo] = useState<SampleInfo>(initialData?.sampleInfo || {
    projectName: '', projectNumber: '', sampleId: '', sampleSubtype: '', samplingDate: '', samplingTime: '', samplePreparationDate: '', samplePreparationTime: ''
  });
  const [testResults, setTestResults] = useState<TestResult[]>(initialData?.testResults || DEFAULT_TESTS['Biological']);
  const [signatureUrl, setSignatureUrl] = useState<string | undefined>(initialData?.signatureUrl || adminProfile?.signatureUrl);
  const [analysisInfo, setAnalysisInfo] = useState<AnalysisInfo>(initialData?.analysisInfo || {
    analysisDate: new Date().toISOString().split('T')[0],
    analysisTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    analysisBy: adminProfile?.displayName || '',
    qcReportingBy: 'Quality Manager'
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
        signatureUrl,
        createdAt: initialData?.createdAt || new Date().toISOString(),
        createdBy: initialData?.createdBy || adminProfile?.email || 'system'
      };

      // Generate and trigger PDF download immediately for better UX
      const pdf = generatePDF(report);
      pdf.save(`BIOCOM_REPORT_${report.sampleInfo.sampleId}.pdf`);

      // Mock Save
      const reports = JSON.parse(localStorage.getItem('mock_reports') || '[]');
      let updatedReports;
      if (initialData) {
        updatedReports = reports.map((r: any) => r.reportId === reportId ? report : r);
      } else {
        updatedReports = [report, ...reports];
      }
      localStorage.setItem('mock_reports', JSON.stringify(updatedReports));
      window.dispatchEvent(new Event('mock_reports_updated'));

      await logActivity({
        action: initialData ? 'UPDATED_REPORT' : 'CREATED_REPORT',
        module: 'Reports',
        details: `${initialData ? 'Updated' : 'Created'} report ${reportId} for client ${clientInfo.clientName} (Sample ID: ${sampleInfo.sampleId})`,
        updatedValues: report
      });

      showToast(initialData ? 'Report updated successfully!' : 'Report generated and saved successfully!');
      if (onComplete) onComplete();
    } catch (error: any) {
      showToast(error.message || 'Operation failed', 'error');
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
            <Input label="Full Name" value={analysisInfo.analysisBy} onChange={e => setAnalysisInfo({...analysisInfo, analysisBy: e.target.value})} required />
            <Input label="Authorized Role" value={analysisInfo.qcReportingBy} onChange={e => setAnalysisInfo({...analysisInfo, qcReportingBy: e.target.value})} required />
          </div>
        </section>

        {/* E-Sign Section */}
        <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                <ImageIcon size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Digital Signature Authorization</h3>
            </div>
            {signatureUrl && (
              <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => setSignatureUrl(undefined)}>
                <Trash2 size={16} className="mr-2" />
                Clear Signature
              </Button>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 w-full space-y-4">
              <div className="p-6 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50 flex flex-col items-center justify-center min-h-[120px] text-center">
                {signatureUrl ? (
                  <div className="relative group">
                    <img src={signatureUrl} alt="Signature" className="max-h-24 object-contain mx-auto mix-blend-multiply" />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none" />
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-sm font-bold text-gray-900">Insert E-Sign</p>
                    <p className="text-xs text-gray-500">Upload your digital signature to authorize this report</p>
                  </>
                )}
              </div>
              
              <div className="flex gap-3">
                <label className="flex-1">
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          const base64 = event.target?.result as string;
                          setSignatureUrl(base64);
                          
                          // Proactively save to profile if user requests
                          if (adminProfile?.email) {
                            try {
                                const admins = JSON.parse(localStorage.getItem('mock_admins') || '[]');
                                const updatedAdmins = admins.map((a: any) => 
                                  a.email.toLowerCase() === adminProfile.email.toLowerCase() 
                                    ? { ...a, signatureUrl: base64 } 
                                    : a
                                );
                                localStorage.setItem('mock_admins', JSON.stringify(updatedAdmins));
                                window.dispatchEvent(new Event('mock_admins_updated'));
                            } catch (err) {
                              console.error('Failed to auto-save signature to profile:', err);
                            }
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <div className="w-full h-11 bg-white border border-indigo-100 text-indigo-600 rounded-xl font-bold text-sm flex items-center justify-center cursor-pointer hover:bg-indigo-50 transition-all">
                    <Upload size={16} className="mr-2" />
                    {signatureUrl ? 'Change Signature' : 'Upload Signature'}
                  </div>
                </label>
                
                {!signatureUrl && adminProfile?.signatureUrl && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setSignatureUrl(adminProfile.signatureUrl)}
                  >
                    <ImageIcon size={16} className="mr-2" />
                    Use Saved Signature
                  </Button>
                )}
              </div>
            </div>

            <div className="w-full md:w-72 bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
              <p className="text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wider">Authorization Preview</p>
              <div className="p-4 bg-white rounded-2xl border border-indigo-100 space-y-2">
                <p className="text-[10px] text-gray-400">Reviewed and Authorized by:</p>
                <div className="h-10 flex items-center">
                  {signatureUrl ? (
                    <img src={signatureUrl} alt="sig" className="h-full object-contain mix-blend-multiply" />
                  ) : (
                    <div className="w-full h-full border border-dashed border-gray-100 rounded flex items-center justify-center">
                      <span className="text-[8px] text-gray-300 italic">Signature will appear here</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-900">{analysisInfo.analysisBy || 'Name'}</p>
                  <p className="text-[9px] text-gray-500 italic">{analysisInfo.qcReportingBy}</p>
                </div>
              </div>
              <p className="text-[10px] text-indigo-400 mt-4 leading-normal">
                By inserting your digital signature, you verify that the analytical data has undergone validation using standard quality control measures.
              </p>
            </div>
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

function RecordsView({ adminProfile, showToast, logActivity }: { adminProfile: AdminProfile | null; showToast: (message: string, type?: 'success' | 'error') => void; logActivity: (params: any) => Promise<void> }) {
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<ReportType | 'All'>('All');
  const [editingReport, setEditingReport] = useState<AnalysisReport | null>(null);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = () => {
      const data = JSON.parse(localStorage.getItem('mock_reports') || '[]');
      setReports(data);
      setLoading(false);
    };
    fetchData();
    window.addEventListener('mock_reports_updated', fetchData);
    return () => window.removeEventListener('mock_reports_updated', fetchData);
  }, []);

  const filteredReports = reports.filter(r => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (r.reportId?.toLowerCase().includes(term) || false) ||
                          (r.sampleInfo?.sampleId?.toLowerCase().includes(term) || false) || 
                          (r.sampleInfo?.projectNumber?.toLowerCase().includes(term) || false) ||
                          (r.sampleInfo?.projectName?.toLowerCase().includes(term) || false) ||
                          (r.clientInfo?.clientName?.toLowerCase().includes(term) || false);
    const matchesDate = dateFilter ? r.sampleInfo.samplingDate === dateFilter : true;
    const matchesType = typeFilter === 'All' ? true : r.reportType === typeFilter;
    return matchesSearch && matchesDate && matchesType;
  });

  const handleDelete = async () => {
    if (!reportToDelete) return;
    const report = reports.find(r => r.reportId === reportToDelete);
    try {
      const updated = reports.filter(r => r.reportId !== reportToDelete);
      localStorage.setItem('mock_reports', JSON.stringify(updated));
      window.dispatchEvent(new Event('mock_reports_updated'));
      
      if (report) {
        await logActivity({
          action: 'DELETED_REPORT',
          module: 'Reports',
          details: `Deleted report ${report.reportId} for client ${report.clientInfo.clientName}`
        });
      }

      setReportToDelete(null);
      showToast('Record deleted successfully');
    } catch (error: any) {
      showToast(error.message || 'Deletion failed', 'error');
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
          logActivity={logActivity}
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
          <Button variant="outline" onClick={() => exportToExcel(filteredReports)}>
            <FileSpreadsheet size={18} className="mr-2" />
            Save to Excel
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

function AdminsView({ adminProfile, showToast, logActivity }: { adminProfile: AdminProfile | null; showToast: (message: string, type?: 'success' | 'error') => void; logActivity: (params: any) => Promise<void> }) {
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
  const [editingAdmin, setEditingAdmin] = useState<AdminProfile | null>(null);

  useEffect(() => {
    const fetchData = () => {
      const data = JSON.parse(localStorage.getItem('mock_admins') || '[]');
      setAdmins(data);
      setLoading(false);
    };
    fetchData();
    window.addEventListener('mock_admins_updated', fetchData);
    return () => window.removeEventListener('mock_admins_updated', fetchData);
  }, []);

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    setTimeout(() => {
      try {
        const allAdmins = JSON.parse(localStorage.getItem('mock_admins') || '[]');
        if (allAdmins.some((a: any) => a.email.toLowerCase() === email.toLowerCase())) {
          throw new Error('An admin with this email already exists.');
        }

        const newAdmin: AdminProfile = {
          uid: `UID-${Date.now()}`,
          adminId,
          email: email.toLowerCase(),
          displayName,
          role,
          isActive: true,
          status: PERMANENT_ADMINS.includes(email.toLowerCase()) ? 'Approved' : 'Approved', // Manually added are approved
          isPermanent: PERMANENT_ADMINS.includes(email.toLowerCase()),
          password: password || 'password123',
          createdAt: new Date().toISOString()
        };

        const updatedAdmins = [...allAdmins, newAdmin];
        localStorage.setItem('mock_admins', JSON.stringify(updatedAdmins));
        window.dispatchEvent(new Event('mock_admins_updated'));

        logActivity({
          action: 'CREATED_ADMIN',
          module: 'Manage Admin',
          details: `Created new admin account: ${displayName} (${email}) with role ${role}`
        });

        showToast(`Admin account created for ${displayName}.`);
        setIsModalOpen(false);
        resetForm();
      } catch (error: any) {
        showToast(error.message, 'error');
      } finally {
        setIsSubmitting(false);
      }
    }, 600);
  };

  const handleEditAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setIsSubmitting(true);
    
    setTimeout(() => {
      try {
        const allAdmins = JSON.parse(localStorage.getItem('mock_admins') || '[]');
        const updatedAdmins = allAdmins.map((a: AdminProfile) => {
          if (a.email.toLowerCase() === editingAdmin.email.toLowerCase()) {
            return {
              ...a,
              adminId,
              displayName,
              role,
              password: password || a.password
            };
          }
          return a;
        });

        localStorage.setItem('mock_admins', JSON.stringify(updatedAdmins));
        window.dispatchEvent(new Event('mock_admins_updated'));

        logActivity({
          action: 'EDITED_ADMIN',
          module: 'Manage Admin',
          details: `Updated admin ${displayName}. Password updated: ${password ? 'Yes' : 'No'}`,
        });

        showToast('Admin updated successfully');
        setEditingAdmin(null);
        setIsModalOpen(false);
        resetForm();
      } catch (error: any) {
        showToast(error.message, 'error');
      } finally {
        setIsSubmitting(false);
      }
    }, 600);
  };

  const resetForm = () => {
    setEditingAdmin(null);
    setEmail('');
    setPassword('');
    setDisplayName('');
    setAdminId('');
    setRole('admin');
  };

  const toggleStatus = async (admin: AdminProfile) => {
    if (admin.isPermanent) {
      showToast('Permanent Super Admins cannot be modified', 'error');
      return;
    }
    try {
      const newStatus = !admin.isActive;
      const allAdmins = JSON.parse(localStorage.getItem('mock_admins') || '[]');
      const updatedAdmins = allAdmins.map((a: AdminProfile) => 
        a.email === admin.email ? { ...a, isActive: newStatus } : a
      );
      
      localStorage.setItem('mock_admins', JSON.stringify(updatedAdmins));
      window.dispatchEvent(new Event('mock_admins_updated'));

      await logActivity({
        action: 'TOGGLE_ADMIN_STATUS',
        module: 'Manage Admin',
        details: `${newStatus ? 'Activated' : 'Disabled'} admin: ${admin.displayName}`,
      });
      
      showToast(`Admin ${newStatus ? 'activated' : 'disabled'} successfully`);
    } catch (error: any) {
      showToast(`Update failed: ${error.message}`, 'error');
    }
  };

  const handleApproval = async (admin: AdminProfile, newStatus: 'Approved' | 'Rejected') => {
    try {
      const allAdmins = JSON.parse(localStorage.getItem('mock_admins') || '[]');
      const updatedAdmins = allAdmins.map((a: AdminProfile) => 
        a.email === admin.email ? { ...a, status: newStatus } : a
      );
      
      localStorage.setItem('mock_admins', JSON.stringify(updatedAdmins));
      window.dispatchEvent(new Event('mock_admins_updated'));

      await logActivity({
        action: newStatus === 'Approved' ? 'USER_APPROVED' : 'USER_REJECTED',
        module: 'Manage Admin',
        details: `${newStatus === 'Approved' ? 'Approved' : 'Rejected'} access for: ${admin.displayName} (${admin.email})`,
      });
      
      showToast(`User ${newStatus === 'Approved' ? 'approved' : 'rejected'} successfully`);
    } catch (error: any) {
      showToast(`Action failed: ${error.message}`, 'error');
    }
  };

  const handleDelete = async () => {
    if (!adminToDelete) return;
    if (adminToDelete === adminProfile?.email) {
      showToast('You cannot delete your own account', 'error');
      setAdminToDelete(null);
      return;
    }
    const admin = admins.find(a => a.email === adminToDelete);
    if (admin?.isPermanent) {
      showToast('Permanent Super Admins cannot be deleted', 'error');
      setAdminToDelete(null);
      return;
    }
    setIsSubmitting(true);
    
    setTimeout(async () => {
      try {
        const allAdmins = JSON.parse(localStorage.getItem('mock_admins') || '[]');
        const updatedAdmins = allAdmins.filter((a: AdminProfile) => a.email !== adminToDelete);
        
        localStorage.setItem('mock_admins', JSON.stringify(updatedAdmins));
        window.dispatchEvent(new Event('mock_admins_updated'));
        
        if (admin) {
          await logActivity({
            action: 'DELETED_ADMIN',
            module: 'Manage Admin',
            details: `Deleted admin: ${admin.displayName} (${admin.email})`,
          });
        }

        setAdminToDelete(null);
        showToast('Admin deleted successfully');
      } catch (error: any) {
        showToast(`Delete failed: ${error.message}`, 'error');
      } finally {
        setIsSubmitting(false);
      }
    }, 600);
  };

  const handleResetPassword = (email: string) => {
    alert(`Please contact the Super Admin to reset the password for ${email}. Manual password updates are managed by system administrators.`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Manage Admin</h3>
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
                  <tr key={admin.email} className={cn(
                    "hover:bg-gray-50/50 transition-colors",
                    admin.status === 'Pending Approval' && "bg-amber-50/20"
                  )}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-bold relative",
                          admin.isPermanent ? "bg-purple-600 text-white" : "bg-indigo-50 text-indigo-600"
                        )}>
                          {admin.displayName.charAt(0)}
                          {admin.isPermanent && <ShieldCheck size={12} className="absolute -top-1 -right-1 text-purple-600 bg-white rounded-full p-0.5 shadow-sm" />}
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
                        admin.role === 'super-admin' ? "bg-purple-100 text-purple-700" : 
                        admin.role === 'admin' ? "bg-blue-100 text-blue-700" :
                        admin.role === 'quality-manager' ? "bg-amber-100 text-amber-700" :
                        "bg-gray-100 text-gray-700"
                      )}>
                        {admin.role.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 space-y-2">
                      <div className="flex flex-col gap-1">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider w-fit",
                          admin.status === 'Approved' ? "bg-emerald-50 text-emerald-600" :
                          admin.status === 'Rejected' ? "bg-red-50 text-red-600" :
                          "bg-amber-50 text-amber-600"
                        )}>
                          {admin.status}
                        </span>
                        {admin.status === 'Pending Approval' && (adminProfile?.role === 'super-admin' || adminProfile?.role === 'admin') && (
                          <div className="flex gap-1 pt-1">
                            <button 
                              onClick={() => handleApproval(admin, 'Approved')}
                              className="text-[9px] font-bold px-2 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 uppercase"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleApproval(admin, 'Rejected')}
                              className="text-[9px] font-bold px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 uppercase"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          disabled={admin.isPermanent}
                          onClick={() => {
                            if (admin.isPermanent) return;
                            setEditingAdmin(admin);
                            setAdminId(admin.adminId);
                            setEmail(admin.email);
                            setDisplayName(admin.displayName);
                            setRole(admin.role);
                            setPassword('');
                            setIsModalOpen(true);
                          }}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            admin.isPermanent ? "text-gray-200 cursor-not-allowed" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                          )}
                          title="Edit Admin"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleResetPassword(admin.email)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Send Password Reset"
                        >
                          <ShieldCheck size={18} />
                        </button>
                        <button 
                          disabled={admin.isPermanent}
                          onClick={() => {
                            if (admin.isPermanent) return;
                            setAdminToDelete(admin.email);
                          }}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            admin.isPermanent ? "text-gray-200 cursor-not-allowed" : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                          )}
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
            <Button variant="danger" className="flex-1" onClick={handleDelete} isLoading={isSubmitting}>Delete Admin</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setAdminToDelete(null)} disabled={isSubmitting}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Admin Modal */}
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
                <h3 className="text-2xl font-bold text-gray-900">{editingAdmin ? 'Edit Admin' : 'Add New Admin'}</h3>
                <button onClick={() => { setIsModalOpen(false); setEditingAdmin(null); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={editingAdmin ? handleEditAdmin : handleCreateAdmin} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Admin ID" value={adminId} onChange={e => setAdminId(e.target.value)} required placeholder="e.g. ADM001" />
                  <Input 
                    label="Full Name" 
                    value={displayName} 
                    onChange={e => setDisplayName(e.target.value)} 
                    required 
                    placeholder="John Doe" 
                  />
                </div>

                <Input 
                  label="Email Address" 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  placeholder="admin@biocomlabs.com" 
                  disabled={!!editingAdmin}
                />

                <Input 
                  label={editingAdmin ? "New Password" : "Password"} 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder={editingAdmin ? "Leave blank to keep current" : "••••••••"} 
                  required={!editingAdmin}
                />
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['super-admin', 'admin', 'quality-manager', 'analyst'].map((r) => (
                      <button 
                        key={r}
                        type="button"
                        onClick={() => setRole(r as UserRole)}
                        className={cn(
                          "py-3 rounded-xl border-2 transition-all font-bold text-[10px] uppercase tracking-wider",
                          role === r ? "border-indigo-600 bg-indigo-50 text-indigo-600 shadow-sm" : "border-gray-100 text-gray-400 opacity-60"
                        )}
                      >
                        {r.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => { setIsModalOpen(false); setEditingAdmin(null); }}>Cancel</Button>
                  <Button type="submit" className="flex-1" isLoading={isSubmitting}>
                    {editingAdmin ? 'Update Admin' : 'Create Account'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function LogsView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');

  useEffect(() => {
    const fetchData = () => {
      const data = JSON.parse(localStorage.getItem('mock_logs') || '[]');
      setLogs(data);
      setLoading(false);
    };
    fetchData();
    window.addEventListener('mock_logs_updated', fetchData);
    return () => window.removeEventListener('mock_logs_updated', fetchData);
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userDisplayName.toLowerCase().includes(filter.toLowerCase()) ||
      log.action.toLowerCase().includes(filter.toLowerCase()) ||
      log.details?.toLowerCase().includes(filter.toLowerCase());
    
    const matchesModule = moduleFilter === 'All' || log.module === moduleFilter;
    
    return matchesSearch && matchesModule;
  });

  const modules = ['All', ...Array.from(new Set(logs.map(l => l.module)))];

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'Pending...';
    try {
      const date = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Activity Log</h3>
          <p className="text-sm text-gray-500">21 CFR Part 11 Compliant Audit Trail</p>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search activity..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm outline-none"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="pl-12 pr-10 py-3 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 appearance-none shadow-sm outline-none font-medium cursor-pointer"
            >
              {modules.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <Button variant="outline" onClick={() => exportLogsToCSV(filteredLogs)}>
            <FileSpreadsheet size={18} className="mr-2" />
            CSV
          </Button>
          <Button variant="outline" onClick={() => exportLogsToPDF(filteredLogs)}>
            <FileText size={18} className="mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">User / Role</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Action</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Module</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                    No activity logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono text-gray-500 whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-bold text-gray-900">{log.userDisplayName}</p>
                      <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-tighter">{log.userRole}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg uppercase tracking-wider">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-600 whitespace-nowrap">
                      {log.module}
                    </td>
                    <td className="px-6 py-4 max-w-sm">
                      <p className="text-xs text-gray-700 leading-relaxed">{log.details}</p>
                      {log.updatedValues && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-100 text-[10px] font-mono text-gray-500 overflow-x-auto max-h-40">
                          <div>
                            <span className="text-emerald-500 font-bold mr-1">ACTION DETAILS:</span>
                            {JSON.stringify(log.updatedValues)}
                          </div>
                        </div>
                      )}
                      {log.signatureDetails && (
                        <div className="mt-2 flex items-center gap-2 text-emerald-600 bg-emerald-50 px-2 py-1 rounded inline-flex">
                          <ShieldCheck size={12} />
                          <span className="text-[10px] font-bold uppercase">Electronically Signed</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
