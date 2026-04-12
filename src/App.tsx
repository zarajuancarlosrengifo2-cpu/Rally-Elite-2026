import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  memo,
  useCallback,
} from 'react';
import {
  Home,
  Map,
  FastForward,
  Trophy,
  Settings,
  ChevronRight,
  TrendingUp,
  Target,
  Award,
  Zap,
  Save,
  AlertCircle,
  DollarSign,
  PiggyBank,
  ShieldAlert,
  Lock,
  Unlock,
  Flag,
  Power,
  ShieldCheck,
  PhoneCall,
  Activity,
  Wrench,
  Ban,
  CheckCircle,
  Users,
  UserPlus,
  Edit2,
  Trash2,
  X,
  Check,
  CalendarDays,
  Star,
  BookOpen,
  RefreshCw,
  Hexagon,
  AlertTriangle,
  Crosshair,
  Clock,
  Camera,
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: 'AIzaSyDnRCHJ-ilQgyqSG5JOuzXaiwkz61xUjUk',
  authDomain: 'rally-comercial-fc4ab.firebaseapp.com',
  projectId: 'rally-comercial-fc4ab',
  storageBucket: 'rally-comercial-fc4ab.firebasestorage.app',
  messagingSenderId: '657588773433',
  appId: '1:657588773433:web:40432aa188fcf0f484e3e8',
  measurementId: 'G-2DF0LJHBM2',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const COLL_PATH = 'rally_users_v2';
const SETTINGS_PATH = 'rally_settings';

// --- CONFIGURACIÓN DE LA APP ---
const MANAGER_PIN = '2026';

const METAS = {
  contencion: 85,
  colocacion_nuevas: 7,
  colocacion_total: 23,
  pagahorros: 12,
  cuentas_ahorro: 3,
};

// --- ESCUDO SANITIZADOR DE DATOS ---
const sanitizeUser = (u: any) => ({
  id: u?.id || String(Math.random()),
  name: u?.name || 'Piloto',
  avatar: u?.avatar || null,
  status: u?.status || 'pits',
  isUpdated: !!u?.isUpdated,
  score: Number(u?.score) || 0,
  extraPoints: Number(u?.extraPoints) || 0,
  kpis: {
    contencion: Number(u?.kpis?.contencion) || 0,
    colocacion: {
      nuevas: Number(u?.kpis?.colocacion?.nuevas) || 0,
      renovaciones: Number(u?.kpis?.colocacion?.renovaciones) || 0,
    },
    rodamientos: {
      base: Number(u?.kpis?.rodamientos?.base) || 0,
      recuperado: Number(u?.kpis?.rodamientos?.recuperado) || 0,
    },
    pagahorros: Number(u?.kpis?.pagahorros) || 0,
    cuentas_ahorro: Number(u?.kpis?.cuentas_ahorro) || 0,
  },
  preventiva: {
    realizada: !!u?.preventiva?.realizada,
    agenda: !!u?.preventiva?.agenda,
  },
});

const RAW_INITIAL_USERS = [
  { id: '1', name: 'Ingrid' },
  { id: '2', name: 'Stefania' },
  { id: '3', name: 'Angela' },
  { id: '4', name: 'Richard' },
  { id: '5', name: 'Fredy' },
  { id: '6', name: 'María R.' },
  { id: '7', name: 'Néstor' },
  { id: '8', name: 'Yhon' },
  { id: '9', name: 'Eibar' },
  { id: '10', name: 'Luis' },
  { id: '11', name: 'Liliana' },
  { id: '12', name: 'Carlos' },
  { id: '13', name: 'Nohemi' },
  { id: '14', name: 'Carolina' },
  { id: '15', name: 'Juan' },
];

const INITIAL_USERS = RAW_INITIAL_USERS.map(sanitizeUser);

// --- UTILS & GAMIFICATION LOGIC ---
const formatNumber = (num: number) =>
  new Intl.NumberFormat('es-CO').format(Number(num) || 0);
const formatCurrency = (num: number) =>
  '$' + new Intl.NumberFormat('es-CO').format(Number(num) || 0);

const calculateScore = (kpis: any, status: string, extraPoints: number = 0) => {
  if (!kpis) return 0;
  let score = 0;
  score +=
    (METAS.contencion > 0
      ? Math.min(kpis.contencion / METAS.contencion, 1)
      : 0) * 300;
  score +=
    (METAS.colocacion_total > 0
      ? Math.min(
          (kpis.colocacion.nuevas + kpis.colocacion.renovaciones) /
            METAS.colocacion_total,
          1
        )
      : 0) * 150;
  score +=
    (METAS.colocacion_nuevas > 0
      ? Math.min(kpis.colocacion.nuevas / METAS.colocacion_nuevas, 1)
      : 0) * 150;
  score +=
    (METAS.pagahorros > 0
      ? Math.min(kpis.pagahorros / METAS.pagahorros, 1)
      : 0) * 150;
  score +=
    (METAS.cuentas_ahorro > 0
      ? Math.min(kpis.cuentas_ahorro / METAS.cuentas_ahorro, 1)
      : 0) * 150;
  score +=
    (kpis.rodamientos.base > 0
      ? Math.min(kpis.rodamientos.recuperado / kpis.rodamientos.base, 1)
      : 0) * 150;

  let finalScore = Math.round(score * 100);
  if (status === 'penalty') finalScore -= 15000;
  finalScore += extraPoints;
  return Math.max(0, finalScore);
};

const getLeague = (score: number) => {
  const safeScore = Number(score) || 0;
  if (safeScore >= 80000)
    return {
      name: 'Diamante',
      color: 'from-fuchsia-600 to-purple-800',
      text: 'text-fuchsia-400',
      border: 'border-fuchsia-500/50',
    };
  if (safeScore >= 60000)
    return {
      name: 'Oro',
      color: 'from-amber-400 to-amber-600',
      text: 'text-amber-400',
      border: 'border-amber-500/50',
    };
  if (safeScore >= 40000)
    return {
      name: 'Plata',
      color: 'from-zinc-300 to-zinc-500',
      text: 'text-zinc-300',
      border: 'border-zinc-400/50',
    };
  return {
    name: 'Bronce',
    color: 'from-orange-700 to-amber-900',
    text: 'text-orange-600',
    border: 'border-orange-700/50',
  };
};

const getBadges = (user: any, allUsers: any[]) => {
  let badges = [];
  if (!user || user.status !== 'active') return badges;
  const activeUsers = allUsers.filter((u) => u.status === 'active');
  if (activeUsers.length === 0) return badges;

  const maxContencion = Math.max(
    0,
    ...activeUsers.map((u) => u.kpis.contencion)
  );
  const maxNuevas = Math.max(
    0,
    ...activeUsers.map((u) => u.kpis.colocacion.nuevas)
  );
  const maxRecuperacionRatio = Math.max(
    0,
    ...activeUsers.map((u) =>
      u.kpis.rodamientos.base > 0
        ? u.kpis.rodamientos.recuperado / u.kpis.rodamientos.base
        : 0
    )
  );
  const maxPaga = Math.max(0, ...activeUsers.map((u) => u.kpis.pagahorros));

  const userRecuperacionRatio =
    user.kpis.rodamientos.base > 0
      ? user.kpis.rodamientos.recuperado / user.kpis.rodamientos.base
      : 0;

  if (user.kpis.contencion === maxContencion && maxContencion > 0)
    badges.push({
      id: 'cont',
      name: 'Guardián',
      Icon: ShieldCheck,
      colorClass: 'text-indigo-400',
      bgClass: 'bg-indigo-900/30 border-indigo-500/30 text-indigo-400',
      desc: 'Mejor Contención',
    });
  if (user.kpis.colocacion.nuevas === maxNuevas && maxNuevas > 0)
    badges.push({
      id: 'col',
      name: 'Top Closer',
      Icon: Target,
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400',
      desc: 'Líder en Nuevas',
    });
  if (
    userRecuperacionRatio === maxRecuperacionRatio &&
    maxRecuperacionRatio > 0
  )
    badges.push({
      id: 'rod',
      name: 'Titán',
      Icon: TrendingUp,
      colorClass: 'text-orange-400',
      bgClass: 'bg-orange-900/30 border-orange-500/30 text-orange-400',
      desc: 'Líder en Rodamientos',
    });
  if (user.kpis.pagahorros === maxPaga && maxPaga > 0)
    badges.push({
      id: 'pag',
      name: 'As Ahorro',
      Icon: PiggyBank,
      colorClass: 'text-purple-400',
      bgClass: 'bg-purple-900/30 border-purple-500/30 text-purple-400',
      desc: 'Líder en Pagahorros',
    });

  if (user.preventiva?.realizada && user.preventiva?.agenda)
    badges.push({
      id: 'prev',
      name: 'Impecable',
      Icon: Activity,
      colorClass: 'text-rose-400',
      bgClass: 'bg-rose-900/30 border-rose-500/30 text-rose-400',
      desc: 'Requisitos Cumplidos',
    });

  return badges;
};

const getUsersWithScores = (users: any[]) =>
  users.map((u) => {
    const safeUser = sanitizeUser(u);
    return {
      ...safeUser,
      score: calculateScore(
        safeUser.kpis,
        safeUser.status,
        safeUser.extraPoints
      ),
    };
  });

const getVehicleData = (id: string | number) => {
  const themes = [
    {
      color: 'text-red-500',
      bg: 'from-red-500 to-red-900',
      border: 'border-red-500/50',
    },
    {
      color: 'text-orange-500',
      bg: 'from-orange-400 to-orange-800',
      border: 'border-orange-500/50',
    },
    {
      color: 'text-amber-500',
      bg: 'from-amber-400 to-amber-800',
      border: 'border-amber-500/50',
    },
    {
      color: 'text-emerald-500',
      bg: 'from-emerald-400 to-emerald-800',
      border: 'border-emerald-500/50',
    },
    {
      color: 'text-cyan-500',
      bg: 'from-cyan-400 to-cyan-800',
      border: 'border-cyan-500/50',
    },
    {
      color: 'text-blue-500',
      bg: 'from-blue-500 to-blue-900',
      border: 'border-blue-500/50',
    },
    {
      color: 'text-indigo-500',
      bg: 'from-indigo-400 to-indigo-800',
      border: 'border-indigo-500/50',
    },
    {
      color: 'text-purple-500',
      bg: 'from-purple-500 to-purple-900',
      border: 'border-purple-500/50',
    },
    {
      color: 'text-fuchsia-500',
      bg: 'from-fuchsia-400 to-fuchsia-800',
      border: 'border-fuchsia-500/50',
    },
    {
      color: 'text-rose-500',
      bg: 'from-rose-500 to-rose-900',
      border: 'border-rose-500/50',
    },
  ];
  return themes[(parseInt(String(id)) - 1) % themes.length] || themes[0];
};

// --- COMPONENTES UI ÉLITE ---
const Kart3D = memo(
  ({
    user,
    className = 'w-24 h-24',
    emojiSize = 'text-5xl',
    isFloating = true,
  }: any) => {
    if (!user) return null;
    const vData = getVehicleData(user.id);
    const isActive = user.status === 'active';
    const isPits = user.status === 'pits';

    const initial = user.name.substring(0, 1).toUpperCase();

    const auraClass = isActive
      ? `bg-gradient-to-br ${vData.bg} opacity-30 blur-xl group-hover:opacity-60`
      : isPits
      ? 'bg-amber-400 opacity-20 blur-xl'
      : 'bg-zinc-600 opacity-10 blur-sm';

    const pedestalClass = isActive
      ? `bg-zinc-900/90 border-t border-b-4 border-black ${vData.border} border-2`
      : isPits
      ? 'bg-zinc-900/60 border-amber-900/50 border-t border-b-4 border-black border-2'
      : 'bg-zinc-900/30 border-zinc-800 border-t border-b-2 border-black';

    const textAnimClass = isActive
      ? `${vData.color} drop-shadow-[0_0_10px_currentColor] transform -translate-y-1`
      : isPits
      ? 'text-amber-600 opacity-80'
      : 'text-zinc-700 opacity-50';

    const imgAnimClass = isActive
      ? 'shadow-[0_0_15px_rgba(255,255,255,0.3)] transform -translate-y-1'
      : isPits
      ? 'sepia-[.6] opacity-80'
      : 'grayscale opacity-50';

    return (
      <div
        className={`relative flex items-center justify-center ${className} transition-transform duration-300 hover:scale-110 ${
          isFloating && isActive ? 'animate-float' : ''
        }`}
      >
        <div
          className={`absolute inset-0 rounded-full transition-all duration-500 ${auraClass}`}
        />
        <div
          className={`absolute inset-1 backdrop-blur-md rounded-full shadow-2xl transition-colors duration-500 ${pedestalClass} flex items-center justify-center overflow-hidden`}
        >
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4px_4px]" />
        </div>
        {user.avatar ? (
          <img
            src={user.avatar}
            className={`relative z-10 w-[75%] h-[75%] rounded-full object-cover border-2 border-black transition-all duration-500 ${imgAnimClass}`}
            alt={user.name}
          />
        ) : (
          <span
            className={`relative z-10 ${emojiSize} font-black font-mono transition-all duration-500 ${textAnimClass} select-none`}
          >
            {initial}
          </span>
        )}
      </div>
    );
  },
  (prev: any, next: any) =>
    prev.user?.id === next.user?.id &&
    prev.user?.status === next.user?.status &&
    prev.user?.score === next.user?.score &&
    prev.user?.avatar === next.user?.avatar &&
    prev.isFloating === next.isFloating
);

const FormattedNumberInput = memo(
  ({ value, onChange, disabled, className, placeholder = '0' }: any) => {
    const safeValue = Number(value) || 0;
    const [displayValue, setDisplayValue] = useState(formatNumber(safeValue));
    useEffect(() => {
      setDisplayValue(formatNumber(Number(value) || 0));
    }, [value]);
    const handleChange = (e: any) => {
      const rawValue = e.target.value.replace(/\D/g, '');
      const numValue = Number(rawValue);
      setDisplayValue(formatNumber(numValue));
      onChange(numValue);
    };
    return (
      <input
        type="text"
        inputMode="numeric"
        value={displayValue === '0' && !safeValue ? '' : displayValue}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        className={className}
      />
    );
  }
);

const MetricCard = memo(
  ({
    title,
    value,
    meta,
    type = 'normal',
    isMissing = false,
    missingValue = 0,
  }: any) => {
    const valNum = Number(value) || 0;
    const metaNum = Number(meta) || 0;
    const percentage =
      metaNum > 0 ? Math.min((valNum / metaNum) * 100, 100) : 0;

    return (
      <div className="w-full bg-zinc-900/60 p-4 rounded-xl border border-white/5 backdrop-blur-md relative overflow-hidden group hover:border-amber-500/30 transition-colors">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
        <span className="text-zinc-500 text-[9px] uppercase tracking-widest font-bold mb-1 block">
          {title}
        </span>
        <div className="flex items-end justify-between mb-2">
          <span className="text-xl leading-none font-black text-white font-mono drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
            {type === 'money' ? formatCurrency(valNum) : valNum}
            {type === 'percent' ? '%' : ''}
          </span>
          <span className="text-zinc-600 text-[10px] font-mono">
            TRGT: {type === 'money' ? formatCurrency(metaNum) : metaNum}
            {type === 'percent' ? '%' : ''}
          </span>
        </div>
        <div className="w-full bg-black rounded-full h-1 mb-2 border border-zinc-800">
          <div
            className="h-full rounded-full transition-all duration-1000 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)] relative"
            style={{ width: `${percentage}%` }}
          >
            <div className="absolute right-0 top-0 w-2 h-full bg-white rounded-full blur-[1px]"></div>
          </div>
        </div>
        {isMissing && missingValue > 0 && percentage < 100 && (
          <div className="flex items-center gap-1.5 text-[10px] text-orange-400 font-mono tracking-wide mt-2">
            <AlertTriangle size={10} className="text-orange-500" />
            FALTA:{' '}
            {type === 'money' ? formatCurrency(missingValue) : missingValue}
          </div>
        )}
        {isMissing && percentage >= 100 && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-mono tracking-wide mt-2">
            <CheckCircle size={10} className="text-amber-500" /> SYSTEM
            OVERRIDE: OK
          </div>
        )}
      </div>
    );
  }
);

const CuentasAhorroStars = memo(({ value, meta = 3 }: any) => {
  const safeValue = Math.min(Number(value) || 0, meta);
  return (
    <div className="flex items-center gap-2">
      {[...Array(meta)].map((_, i) => {
        const isOn = i < safeValue;
        return (
          <Star
            key={i}
            size={22}
            strokeWidth={isOn ? 0 : 1.5}
            className={`transition-all duration-500 ${
              isOn
                ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,1)] scale-110'
                : 'text-zinc-700 fill-transparent scale-90'
            }`}
          />
        );
      })}
    </div>
  );
});

const SplashScreen = ({ onComplete }: any) => {
  const [progress, setProgress] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => setIsFading(true), 200);
          setTimeout(onComplete, 800);
          return 100;
        }
        return p + 1;
      });
    }, 60);

    return () => clearInterval(progressInterval);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#030303] text-white transition-opacity duration-700 ease-in-out ${
        isFading ? 'opacity-0' : 'opacity-100'
      } p-4`}
    >
      <div className="relative w-full max-w-md aspect-[4/5] bg-[#080808] border border-amber-500/30 rounded-[2rem] shadow-[0_0_30px_rgba(245,158,11,0.15)] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/20 blur-[60px] rounded-full mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-amber-500/20 blur-[60px] rounded-full mix-blend-screen pointer-events-none" />

        <div className="absolute top-6 w-full px-8 flex justify-between items-center z-20">
          <div className="border border-white/20 px-2 py-0.5 flex items-center gap-1">
            <span className="text-[8px] font-black font-mono tracking-widest">
              POPAYÁN
            </span>
          </div>
          <div className="w-3 h-3 border-2 border-zinc-500 rounded-full flex items-center justify-center">
            <div className="w-1 h-1 bg-zinc-500 rounded-full" />
          </div>
        </div>

        <div className="absolute top-16 flex flex-col items-center z-10">
          <div className="w-4 h-4 border-2 border-white rounded-full flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
          <div className="w-px h-6 bg-white/20 mt-2" />
        </div>

        <div className="relative w-full flex flex-col items-center justify-center z-20 mt-8">
          <div className="absolute top-[-20px] right-8 flex border border-amber-500/30 bg-black/50 backdrop-blur-sm z-30">
            <div className="bg-amber-500 text-black text-[6px] font-black px-1.5 py-1 leading-none flex flex-col justify-center text-center">
              <span>20</span>
              <span>26</span>
            </div>
            <div className="text-[5px] font-mono text-zinc-300 px-2 py-1 leading-tight tracking-widest flex flex-col justify-center">
              <span>TELEMETRÍA</span>
              <span>ÉLITE</span>
            </div>
          </div>

          <div className="text-center select-none z-10 relative">
            <div className="text-[6.5rem] leading-[0.75] font-black tracking-tighter text-white">
              RAL
            </div>
            <div className="text-[6.5rem] leading-[0.75] font-black tracking-tighter text-white relative">
              LY
              <span
                className="text-transparent"
                style={{ WebkitTextStroke: '2px rgba(255,255,255,0.2)' }}
              >
                .
              </span>
              <div className="absolute bottom-2 left-[-20px] w-6 h-6 border-[3px] border-amber-500 rounded-full blur-[1px] shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
            </div>
          </div>

          <img
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            alt="Abstract 3D Art"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] min-w-[380px] object-cover mix-blend-screen opacity-95 z-20 pointer-events-none"
            style={{
              maskImage:
                'linear-gradient(to bottom, rgba(0,0,0,1) 65%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, rgba(0,0,0,1) 65%, rgba(0,0,0,0) 100%)',
              filter:
                'grayscale(100%) sepia(100%) hue-rotate(-10deg) saturate(500%) brightness(1.2)',
            }}
          />

          <div className="absolute right-4 top-1/2 flex gap-1 z-30">
            <div className="w-2 h-2 border border-white rounded-full" />
            <div className="w-1 h-1 border border-white rounded-full mt-1" />
          </div>
        </div>

        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
          <div className="w-1 h-1 rounded-full bg-white/30" />
          <div className="w-1 h-1 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,1)]" />
          <div className="w-1 h-1 rounded-full bg-white/30" />
          <div className="w-1 h-1 rounded-full bg-white/30" />
        </div>

        <div className="absolute bottom-24 flex flex-col items-center z-30">
          <div className="w-[80px] h-px bg-white/20 mb-3 relative">
            <div className="absolute -left-1 -top-0.5 w-1 h-1 bg-white/50 rounded-full" />
          </div>
          <div className="text-[7px] font-mono tracking-[0.4em] text-zinc-400 text-center leading-relaxed uppercase">
            DIRECCIÓN & <br />
            TELEMETRÍA <br />
            COMERCIAL
          </div>
        </div>

        <div className="absolute bottom-6 flex flex-col items-center z-30 w-full px-12">
          <div className="w-3 h-5 border border-white/30 rounded-full flex justify-center pt-1 mb-2">
            <div className="w-0.5 h-1 bg-amber-500 rounded-full animate-bounce shadow-[0_0_5px_rgba(245,158,11,0.8)]" />
          </div>
          <div className="flex justify-between w-full mb-1.5">
            <span className="text-[6px] font-black font-mono tracking-widest text-zinc-500 uppercase">
              SYS_INIT_ONLINE
            </span>
            <span className="text-[6px] font-black font-mono tracking-widest text-amber-500 uppercase">
              {progress}%
            </span>
          </div>

          <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
            <div
              className="h-full bg-amber-500 transition-all duration-75 ease-linear shadow-[0_0_8px_rgba(245,158,11,1)] relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-0 w-2 h-full bg-white rounded-full blur-[1px]"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 text-[8px] font-mono tracking-[0.5em] text-zinc-500 flex items-center gap-2">
        <span className="w-1 h-1 bg-amber-500 rounded-full" />
        J U A N C A R L O S
        <span className="w-1 h-1 bg-amber-500 rounded-full" />
      </div>
    </div>
  );
};

// --- VISTAS PRINCIPALES ---
const Dashboard = ({
  users,
  openManagerPanel,
  currentDay,
  daysInMonth,
  monthProgress,
}: any) => {
  const { topUser } = useMemo(() => {
    const tUser =
      users.length > 0
        ? [...users].sort((a: any, b: any) => b.score - a.score)[0]
        : null;
    return { topUser: tUser };
  }, [users]);

  return (
    <div className="pb-32 pt-8 px-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8 relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,1)]" />
              <h2 className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.3em]">
                Pole Position
              </h2>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter">
              RALLY{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600">
                COMERCIAL
              </span>
            </h1>
          </div>
          <div className="w-12 h-12 bg-black border border-white/10 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center backdrop-blur-md">
            <Hexagon className="text-amber-500" size={24} strokeWidth={1.5} />
          </div>
        </div>

        <div className="bg-black/40 rounded-xl p-4 border border-white/5 backdrop-blur-md">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays size={14} className="text-amber-500" />
              <span className="font-mono text-zinc-400 text-[10px] uppercase tracking-widest">
                Sys.Time / Días
              </span>
            </div>
            <span className="text-amber-400 font-mono text-xs font-bold drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]">
              [{currentDay}/{daysInMonth}]
            </span>
          </div>
          <div className="w-full bg-zinc-900 rounded h-1.5 overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 relative"
              style={{ width: `${monthProgress}%` }}
            >
              <div className="absolute right-0 top-0 w-4 h-full bg-white/50 blur-[2px]"></div>
            </div>
          </div>
        </div>
      </header>

      <button
        onClick={openManagerPanel}
        className="relative z-10 w-full bg-gradient-to-b from-zinc-900 to-black text-white rounded-2xl p-4 flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.8)] mb-8 active:scale-95 transition-all border border-zinc-800 hover:border-amber-500/50 group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-black border border-zinc-700 rounded-lg flex items-center justify-center group-hover:border-amber-500/50 transition-colors relative overflow-hidden">
            <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Power size={20} className="text-amber-500" />
          </div>
          <div className="text-left">
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-300 group-hover:text-white transition-colors">
              Dir. Deportiva
            </h3>
            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-1">
              Setup & Telemetría
            </p>
          </div>
        </div>
        <Lock
          size={14}
          className="text-zinc-600 group-hover:text-amber-500 transition-colors"
        />
      </button>

      {topUser ? (
        <div className="relative z-10 bg-black/60 rounded-[2rem] p-6 border border-white/10 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_20px_rgba(245,158,11,0.5)]" />

          <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-6">
            <div className="flex flex-col justify-center">
              <div className="flex items-center space-x-3 mb-3">
                <div className="inline-flex items-center space-x-1 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1">
                  <Trophy size={12} className="text-amber-400" />
                  <span className="text-amber-400 text-[9px] font-bold uppercase tracking-[0.2em]">
                    P1 / Líder
                  </span>
                </div>
              </div>
              <h3 className="text-white text-3xl font-black mb-1 tracking-tight truncate max-w-[180px]">
                {topUser.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Zap size={16} className="text-amber-500" fill="currentColor" />
                <p className="text-amber-400 font-mono text-xl drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]">
                  {formatNumber(topUser.score)}{' '}
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
                    PTS
                  </span>
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 pt-1 pr-1">
              <Kart3D
                user={topUser}
                className="w-20 h-20"
                emojiSize="text-4xl"
                isFloating={true}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              title="Contención"
              value={topUser.kpis?.contencion}
              meta={METAS.contencion}
              type="percent"
            />
            <MetricCard
              title="Pagahorros"
              value={topUser.kpis?.pagahorros}
              meta={METAS.pagahorros}
            />

            <div className="col-span-2 bg-zinc-900/60 p-4 rounded-xl border border-white/5 backdrop-blur-md flex justify-between items-center mt-2">
              <div>
                <span className="text-zinc-500 text-[9px] uppercase tracking-widest font-bold block mb-1">
                  Cuentas Ahorro
                </span>
                <span className="text-[10px] font-mono text-zinc-600">
                  TRGT: {METAS.cuentas_ahorro}
                </span>
              </div>
              <CuentasAhorroStars
                value={topUser.kpis?.cuentas_ahorro}
                meta={METAS.cuentas_ahorro}
              />
            </div>

            <div className="col-span-2 bg-zinc-900/60 p-4 rounded-xl border border-white/5 backdrop-blur-md relative overflow-hidden group hover:border-amber-500/30 transition-colors mt-2">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
              <span className="text-zinc-500 text-[9px] uppercase tracking-widest font-bold mb-3 block">
                Recuperación Rodamientos
              </span>

              <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-3">
                <div>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block">
                    BASE ASIGNADA
                  </span>
                  <span className="text-lg font-black text-white font-mono">
                    {formatCurrency(topUser.kpis?.rodamientos?.base)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block">
                    EFECTIVIDAD
                  </span>
                  <span className="text-lg font-black text-amber-500 font-mono drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]">
                    {(topUser.kpis?.rodamientos?.base > 0
                      ? (topUser.kpis?.rodamientos?.recuperado /
                          topUser.kpis?.rodamientos?.base) *
                        100
                      : 0
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <div>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block">
                    RECUPERADO
                  </span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    {formatCurrency(topUser.kpis?.rodamientos?.recuperado)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-mono text-orange-400 uppercase tracking-widest block">
                    FALTA POR CUMPLIR
                  </span>
                  <span className="text-sm font-black text-orange-400 font-mono">
                    {formatCurrency(
                      Math.max(
                        0,
                        (topUser.kpis?.rodamientos?.base || 0) -
                          (topUser.kpis?.rodamientos?.recuperado || 0)
                      )
                    )}
                  </span>
                </div>
              </div>

              <div className="w-full bg-black rounded-full h-1.5 border border-zinc-800">
                <div
                  className="h-full rounded-full transition-all duration-1000 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)] relative"
                  style={{
                    width: `${Math.min(
                      topUser.kpis?.rodamientos?.base > 0
                        ? (topUser.kpis?.rodamientos?.recuperado /
                            topUser.kpis?.rodamientos?.base) *
                            100
                        : 0,
                      100
                    )}%`,
                  }}
                >
                  <div className="absolute right-0 top-0 w-2 h-full bg-white rounded-full blur-[1px]"></div>
                </div>
              </div>
            </div>

            <div className="col-span-2 bg-zinc-900/40 border border-white/5 rounded-xl p-4 mt-2 relative overflow-hidden">
              <div className="absolute left-0 top-0 w-1 h-full bg-zinc-700" />
              <span className="text-zinc-500 text-[9px] uppercase tracking-widest font-bold mb-3 block">
                Matriz Colocación (TRGT: {METAS.colocacion_total})
              </span>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-white font-mono text-xl">
                    {topUser.kpis?.colocacion?.nuevas || 0}
                  </span>
                  <span className="text-zinc-500 font-mono text-[9px] ml-2 tracking-widest">
                    NUEVAS / M:{METAS.colocacion_nuevas}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-amber-400 font-mono text-xl drop-shadow-[0_0_5px_rgba(245,158,11,0.4)]">
                    {(topUser.kpis?.colocacion?.nuevas || 0) +
                      (topUser.kpis?.colocacion?.renovaciones || 0)}
                  </span>
                  <span className="text-zinc-500 font-mono text-[9px] ml-2 tracking-widest">
                    TOTAL
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900/60 backdrop-blur-xl rounded-2xl p-8 text-center border border-zinc-800 mt-12">
          <h3 className="font-mono text-zinc-500 text-sm">
            NO HAY DATOS DE PILOTOS.
          </h3>
        </div>
      )}
    </div>
  );
};

// --- PISTA TÁCTICA (RUN RATE) ---
const Track = memo(
  ({
    users,
    currentDay,
    daysInMonth,
    monthProgress,
    monthName,
    globalSettings,
  }: any) => {
    if (users.length === 0)
      return (
        <div className="p-8 text-center text-zinc-500 font-mono mt-12">
          SIN PILOTOS EN PISTA.
        </div>
      );

    const { packs, timeNodeY, expectedScore, daysLeft } = useMemo(() => {
      const tProgress = monthProgress / 100;
      const tY = 90 - tProgress * 80;
      const targetScore = 80000;
      const expScore = targetScore * tProgress;
      const left = daysInMonth - currentDay;

      const sorted = [...users].sort((a, b) => b.score - a.score);
      const clusters: any[] = [];
      sorted.forEach((u) => {
        const cluster = clusters.find(
          (c) => Math.abs(c.baseScore - u.score) <= 4000
        );
        if (cluster) {
          cluster.users.push(u);
          cluster.baseScore =
            cluster.users.reduce(
              (acc: number, curr: any) => acc + curr.score,
              0
            ) / cluster.users.length;
        } else {
          clusters.push({ baseScore: u.score, users: [u] });
        }
      });

      clusters.forEach((c, idx) => {
        c.align = idx % 2 === 0 ? 'right' : 'left';
        c.x = c.align === 'right' ? 70 : 30;
        const p = Math.max(0, Math.min(c.baseScore / targetScore, 1));
        c.y = 90 - p * 80;
      });

      return {
        packs: clusters,
        timeNodeY: tY,
        expectedScore: expScore,
        daysLeft: left,
      };
    }, [users, currentDay, daysInMonth, monthProgress]);

    const currentDateString = `${currentDay} ${monthName
      .substring(0, 3)
      .toUpperCase()}`;

    return (
      <div className="pb-32 pt-8 px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-start mb-8 border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-amber-500 font-bold text-[9px] uppercase tracking-[0.4em] font-mono mb-1">
              Mapeo Táctico / Run Rate
            </h2>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase font-mono">
              LÍNEA DE TIEMPO
            </h1>
          </div>
          <div className="text-right bg-[#0a0a0a] border border-zinc-800 p-2 rounded-xl shadow-lg">
            <span className="text-2xl font-black font-mono text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]">
              D{currentDay}
            </span>
            <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest block mt-0.5 text-center">
              DÍA ACTUAL
            </span>
          </div>
        </div>

        <div className="relative w-full min-h-[900px] mt-6 bg-[#0a0a0a] rounded-[2rem] border border-zinc-900 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]" />

          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <line
              x1="50"
              y1="90"
              x2="50"
              y2="10"
              stroke="#18181b"
              strokeWidth="12"
            />
            <line
              x1="50"
              y1={timeNodeY}
              x2="50"
              y2="10"
              stroke="#7f1d1d"
              strokeWidth="4"
              strokeDasharray="2 2"
              className="animate-pulse"
            />
            <line
              x1="50"
              y1="90"
              x2="50"
              y2={timeNodeY}
              stroke="#f59e0b"
              strokeWidth="4"
            />
            <line
              x1="40"
              y1="90"
              x2="60"
              y2="90"
              stroke="#ffffff"
              strokeWidth="2"
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1="35"
              y1="10"
              x2="65"
              y2="10"
              stroke="#ffffff"
              strokeWidth="4"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />

            {packs.map((pack, idx) => {
              const isAhead = pack.baseScore >= expectedScore;
              const laserColor = isAhead ? '#10b981' : '#ef4444';
              return (
                <g key={idx}>
                  <line
                    x1="50"
                    y1={timeNodeY}
                    x2={pack.x}
                    y2={pack.y}
                    stroke={laserColor}
                    strokeWidth="1.5"
                    opacity="0.6"
                    strokeDasharray="2 2"
                    className="animate-[pulse_2s_ease-in-out_infinite]"
                  />
                  <circle
                    cx={pack.x}
                    cy={pack.y}
                    r="0.8"
                    fill={laserColor}
                    className="animate-ping"
                  />
                </g>
              );
            })}
          </svg>

          {[
            { day: globalSettings?.cut1 || 10, label: 'CORTE 1' },
            { day: globalSettings?.cut2 || 20, label: 'CORTE 2' },
            { day: globalSettings?.cut3 || daysInMonth, label: 'CIERRE' },
          ].map((corte, idx) => {
            const yPos = 90 - (corte.day / daysInMonth) * 80;
            return (
              <div
                key={idx}
                className="absolute w-full z-10 pointer-events-none transition-all duration-1000"
                style={{ top: `${yPos}%`, transform: 'translateY(-50%)' }}
              >
                <div className="absolute left-1/2 -translate-x-1/2 w-[40%] border-t-2 border-dashed border-zinc-700" />
                <div className="absolute left-[10%] bg-[#0a0a0a] border border-zinc-700 px-2 py-1 rounded shadow-lg">
                  <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-widest">
                    {corte.label}{' '}
                    <span className="text-amber-500 ml-1">D{corte.day}</span>
                  </span>
                </div>
              </div>
            );
          })}

          <div
            className="absolute w-full z-20 pointer-events-none"
            style={{ top: '15%', transform: 'translateY(-50%)' }}
          >
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
              <div className="bg-red-950/80 backdrop-blur-md px-4 py-2 rounded-sm border border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse">
                <span className="text-[10px] font-black font-mono text-red-500 uppercase tracking-widest flex items-center gap-2">
                  <Clock size={12} /> {daysLeft} DÍAS PARA EL CIERRE
                </span>
              </div>
            </div>
          </div>

          <div
            className="absolute w-full z-30 pointer-events-none transition-all duration-1000 ease-out"
            style={{ top: `${timeNodeY}%`, transform: 'translateY(-50%)' }}
          >
            <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="bg-amber-500 text-black px-3 py-1 rounded-sm font-black font-mono text-[9px] shadow-[0_0_15px_rgba(245,158,11,1)] whitespace-nowrap tracking-widest uppercase">
                {currentDateString}
              </div>
              <div className="w-12 h-1 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,1)] mt-1" />
            </div>
          </div>

          {packs.map((pack, idx) => {
            return (
              <div
                key={idx}
                className={`absolute z-30 flex flex-col pointer-events-auto transition-all duration-1000 ${
                  pack.align === 'left' ? 'items-end' : 'items-start'
                }`}
                style={{
                  top: `${pack.y}%`,
                  left: `${pack.x}%`,
                  transform:
                    pack.align === 'left'
                      ? 'translate(-100%, -50%)'
                      : 'translate(0%, -50%)',
                  paddingLeft: pack.align === 'right' ? '16px' : '0',
                  paddingRight: pack.align === 'left' ? '16px' : '0',
                }}
              >
                <div
                  className={`flex flex-wrap gap-2 w-full max-w-[160px] ${
                    pack.align === 'left'
                      ? 'justify-end flex-row-reverse'
                      : 'justify-start flex-row'
                  }`}
                >
                  {pack.users.map((u: any) => (
                    <div
                      key={u.id}
                      className="relative group cursor-pointer flex flex-col items-center bg-black/90 backdrop-blur-xl p-2 rounded-2xl border border-zinc-800 hover:border-amber-500 transition-colors shadow-[0_5px_15px_rgba(0,0,0,0.8)] min-w-[4rem]"
                    >
                      <Kart3D
                        user={u}
                        className="w-10 h-10"
                        emojiSize="text-2xl"
                        isFloating={false}
                      />
                      <div className="mt-1.5 text-center w-full">
                        <p className="text-[8px] font-black text-zinc-300 tracking-wider uppercase truncate">
                          {u.name}
                        </p>
                        {u.status === 'active' && (
                          <p className="text-[7px] font-mono text-emerald-400 tabular-nums font-black mt-0.5 drop-shadow-[0_0_3px_rgba(52,211,153,0.8)]">
                            {formatNumber(u.score)}
                          </p>
                        )}
                        {u.status === 'pits' && (
                          <p className="text-[6px] font-mono text-black bg-amber-500 px-1 py-0.5 rounded-sm uppercase mt-1 font-black">
                            PITS
                          </p>
                        )}
                        {u.status === 'penalty' && (
                          <p className="text-[6px] font-mono text-white bg-red-600 px-1 py-0.5 rounded-sm uppercase mt-1 font-black shadow-[0_0_5px_rgba(220,38,38,0.8)]">
                            ERR
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

const Pits = ({ users, updateUserKpis }: any) => {
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const user = users.find((u: any) => u.id === selectedUserId) || users[0];
  const [formData, setFormData] = useState({
    kpis: user?.kpis,
    preventiva: user?.preventiva,
  });

  useEffect(() => {
    if (users.length > 0 && !users.find((u: any) => u.id === selectedUserId))
      setSelectedUserId(users[0].id);
  }, [users, selectedUserId]);

  useEffect(() => {
    if (user)
      setFormData({
        kpis: { ...user.kpis },
        preventiva: { ...user.preventiva },
      });
  }, [selectedUserId, user]);

  if (users.length === 0)
    return (
      <div className="p-8 text-center text-zinc-500 font-mono mt-12">
        SIN PILOTOS.
      </div>
    );

  const handleInputChange = (
    category: string,
    field: string,
    subfield: any,
    value: any
  ) => {
    if (!isUnlocked) return;
    const finalValue =
      typeof value === 'boolean' ? value : value === '' ? 0 : Number(value);
    setFormData((prev: any) => {
      const updated = { ...prev };
      if (subfield)
        updated[category] = {
          ...updated[category],
          [field]: { ...updated[category][field], [subfield]: finalValue },
        };
      else updated[category] = { ...updated[category], [field]: finalValue };
      return updated;
    });
  };

  const handleSave = async () => {
    if (!isUnlocked) return;
    setIsSaving(true);
    await updateUserKpis(user.id, formData.kpis, formData.preventiva);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="pb-40 pt-8 px-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col relative">
      <div className="flex justify-between items-end mb-8 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.3em] mb-1">
            Carga de Datos
          </h2>
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase">
            PITS ENTRY
          </h1>
        </div>
        <button
          onClick={() => setIsUnlocked(!isUnlocked)}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded text-[9px] font-mono uppercase tracking-widest border transition-colors ${
            isUnlocked
              ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
              : 'bg-zinc-900 text-zinc-500 border-zinc-800'
          }`}
        >
          {isUnlocked ? (
            <>
              <Unlock size={10} />
              <span>Abierto</span>
            </>
          ) : (
            <>
              <Lock size={10} />
              <span>Cerrado</span>
            </>
          )}
        </button>
      </div>

      <div className="flex overflow-x-auto pb-4 -mx-6 px-6 space-x-3 hide-scrollbar snap-x">
        {users.map((u: any) => (
          <button
            key={u.id}
            onClick={() => setSelectedUserId(u.id)}
            className={`snap-center flex-shrink-0 relative w-20 py-3 rounded-xl border transition-all ${
              selectedUserId === u.id
                ? 'bg-zinc-800 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'bg-black border-zinc-800 opacity-60 hover:opacity-100'
            }`}
          >
            <div className="flex flex-col items-center">
              <div
                className={`mb-2 transition-transform ${
                  selectedUserId === u.id ? 'scale-110' : ''
                }`}
              >
                <Kart3D
                  user={u}
                  className="w-10 h-10"
                  emojiSize="text-lg"
                  isFloating={false}
                />
              </div>
              <span
                className={`text-[9px] font-mono uppercase tracking-widest ${
                  selectedUserId === u.id ? 'text-amber-500' : 'text-zinc-500'
                }`}
              >
                {u.name}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 flex-1 relative">
        <div
          className={`w-full bg-black/60 backdrop-blur-xl rounded-2xl p-6 border transition-colors ${
            isUnlocked ? 'border-amber-500/30' : 'border-zinc-800'
          }`}
        >
          {!isUnlocked && (
            <div className="absolute inset-0 z-20 backdrop-blur-md bg-black/80 rounded-2xl flex flex-col items-center justify-center p-6 border border-zinc-800">
              <Lock size={32} className="text-zinc-600 mb-4" strokeWidth={1} />
              <p className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase text-center mb-6">
                Módulo Bloqueado. Desbloquee arriba para inyectar datos.
              </p>
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
              <span className="text-zinc-500 text-[9px] uppercase tracking-widest font-bold mb-4 block">
                Requisitos de Arranque
              </span>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">
                  Preventiva Call
                </span>
                <button
                  onClick={() =>
                    handleInputChange(
                      'preventiva',
                      'realizada',
                      null,
                      !formData.preventiva?.realizada
                    )
                  }
                  className={`w-12 h-6 rounded-full border transition-colors relative ${
                    formData.preventiva?.realizada
                      ? 'bg-amber-500/20 border-amber-500'
                      : 'bg-black border-zinc-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-3.5 h-3.5 rounded-full transition-transform ${
                      formData.preventiva?.realizada
                        ? 'bg-amber-500 left-7'
                        : 'bg-zinc-600 left-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">
                  Agenda Set
                </span>
                <button
                  onClick={() =>
                    handleInputChange(
                      'preventiva',
                      'agenda',
                      null,
                      !formData.preventiva?.agenda
                    )
                  }
                  className={`w-12 h-6 rounded-full border transition-colors relative ${
                    formData.preventiva?.agenda
                      ? 'bg-amber-500/20 border-amber-500'
                      : 'bg-black border-zinc-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-3.5 h-3.5 rounded-full transition-transform ${
                      formData.preventiva?.agenda
                        ? 'bg-amber-500 left-7'
                        : 'bg-zinc-600 left-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div>
              <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5 block">
                Contención (%)
              </label>
              <input
                type="number"
                value={formData.kpis?.contencion || ''}
                onChange={(e) =>
                  handleInputChange('kpis', 'contencion', null, e.target.value)
                }
                className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-amber-500 font-mono outline-none focus:border-amber-500/50 transition-colors"
                placeholder="0"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5 block">
                  Nuevas
                </label>
                <input
                  type="number"
                  value={formData.kpis?.colocacion?.nuevas || ''}
                  onChange={(e) =>
                    handleInputChange(
                      'kpis',
                      'colocacion',
                      'nuevas',
                      e.target.value
                    )
                  }
                  className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-amber-500 font-mono outline-none focus:border-amber-500/50 transition-colors"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5 block">
                  Renovadas
                </label>
                <input
                  type="number"
                  value={formData.kpis?.colocacion?.renovaciones || ''}
                  onChange={(e) =>
                    handleInputChange(
                      'kpis',
                      'colocacion',
                      'renovaciones',
                      e.target.value
                    )
                  }
                  className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-amber-500 font-mono outline-none focus:border-amber-500/50 transition-colors"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5 block">
                  Pagahorros
                </label>
                <input
                  type="number"
                  value={formData.kpis?.pagahorros || ''}
                  onChange={(e) =>
                    handleInputChange(
                      'kpis',
                      'pagahorros',
                      null,
                      e.target.value
                    )
                  }
                  className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-amber-500 font-mono outline-none focus:border-amber-500/50 transition-colors"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5 block">
                  Cuentas Ah.
                </label>
                <input
                  type="number"
                  value={formData.kpis?.cuentas_ahorro || ''}
                  onChange={(e) =>
                    handleInputChange(
                      'kpis',
                      'cuentas_ahorro',
                      null,
                      e.target.value
                    )
                  }
                  className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-amber-500 font-mono outline-none focus:border-amber-500/50 transition-colors"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5 block">
                Rodamientos (Base)
              </label>
              <FormattedNumberInput
                value={formData.kpis?.rodamientos?.base}
                onChange={(val: any) =>
                  handleInputChange('kpis', 'rodamientos', 'base', val)
                }
                className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-amber-500 font-mono outline-none focus:border-amber-500/50 transition-colors"
                placeholder="$0"
              />
            </div>
            <div>
              <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5 block">
                Rodamientos (Recuperado)
              </label>
              <FormattedNumberInput
                value={formData.kpis?.rodamientos?.recuperado}
                onChange={(val: any) =>
                  handleInputChange('kpis', 'rodamientos', 'recuperado', val)
                }
                className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-amber-500 font-mono outline-none focus:border-amber-500/50 transition-colors"
                placeholder="$0"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || saveSuccess || !isUnlocked}
            className={`w-full mt-8 font-black uppercase tracking-[0.2em] text-[10px] py-4 rounded-lg active:scale-95 transition-all duration-300 flex justify-center items-center gap-2 ${
              saveSuccess
                ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : isSaving
                ? 'bg-amber-900/50 text-amber-500 border border-amber-800 cursor-not-allowed'
                : 'bg-amber-600 text-black shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:bg-amber-500'
            }`}
          >
            {saveSuccess ? (
              <>
                <CheckCircle size={16} /> ¡DATOS INYECTADOS!
              </>
            ) : isSaving ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> PROCESANDO...
              </>
            ) : (
              <>
                <Save size={16} /> INYECTAR DATOS
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const Ranking = memo(({ users }: any) => {
  if (users.length === 0)
    return (
      <div className="p-8 text-center text-zinc-500 font-mono mt-12">
        SIN PILOTOS.
      </div>
    );
  const sorted = [...users].sort((a, b) => b.score - a.score);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const podiumUsers = [top3[1], top3[0], top3[2]];

  return (
    <div className="pb-32 pt-8 px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end mb-16 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.3em] mb-1">
            Clasificación Global
          </h2>
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase">
            PODIO DE HONOR
          </h1>
        </div>
      </div>

      <div className="flex items-end justify-center h-56 mb-16 space-x-1">
        {podiumUsers.map((u, i) => {
          if (!u) return null;
          const isGold = i === 1;
          const isSilver = i === 0;
          const isBronze = i === 2;
          const height = isGold ? 'h-48' : isSilver ? 'h-36' : 'h-28';
          const bg = isGold
            ? 'bg-gradient-to-t from-black via-zinc-900 to-amber-900/40 border-t-amber-400'
            : isSilver
            ? 'bg-gradient-to-t from-black via-zinc-900 to-zinc-700/40 border-t-zinc-300'
            : 'bg-gradient-to-t from-black via-zinc-900 to-orange-900/40 border-t-orange-600';
          const rank = isGold ? 1 : isSilver ? 2 : 3;

          return (
            <div
              key={u.id}
              className={`relative w-24 ${height} ${bg} rounded-t-lg flex flex-col items-center justify-end pb-4 border-t-2 border-l border-r border-zinc-800/50`}
            >
              <div className="absolute bottom-full mb-4 w-full flex justify-center drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]">
                <Kart3D
                  user={u}
                  className={isGold ? 'w-24 h-24' : 'w-20 h-20'}
                  emojiSize={isGold ? 'text-5xl' : 'text-4xl'}
                  isFloating={false}
                />
              </div>
              <span
                className={`font-black text-4xl absolute top-4 select-none opacity-20 ${
                  isGold
                    ? 'text-amber-500'
                    : isSilver
                    ? 'text-zinc-300'
                    : 'text-orange-600'
                }`}
              >
                {rank}
              </span>
              <span className="text-zinc-300 font-mono font-bold text-[10px] uppercase tracking-wider truncate w-full text-center px-1">
                {u.name}
              </span>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        {rest.map((u, i) => {
          const league = getLeague(u.score);
          return (
            <div
              key={u.id}
              className="bg-black/60 backdrop-blur-md rounded-xl p-4 flex items-center justify-between border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <span className="text-zinc-600 font-mono w-6 text-center text-xs">
                  {i + 4}
                </span>
                <Kart3D
                  user={u}
                  className="w-10 h-10"
                  emojiSize="text-xl"
                  isFloating={false}
                />
                <div className="flex flex-col">
                  <span className="font-bold text-zinc-300 text-xs uppercase tracking-wider">
                    {u.name}
                  </span>
                  <span
                    className={`text-[8px] font-mono uppercase tracking-widest ${league.text}`}
                  >
                    {league.name}
                  </span>
                </div>
              </div>
              <span className="font-mono text-amber-500 text-xs">
                {formatNumber(u.score)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

const Garage = memo(({ users }: any) => {
  if (users.length === 0)
    return (
      <div className="p-8 text-center text-zinc-500 font-mono mt-12">
        SIN PILOTOS.
      </div>
    );
  return (
    <div className="pb-32 pt-8 px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end mb-8 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.3em] mb-1">
            Métricas Detalladas
          </h2>
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase">
            GARAGE DATA
          </h1>
        </div>
      </div>

      <div className="space-y-4">
        {users.map((u: any) => {
          const totalCol =
            (u.kpis?.colocacion?.nuevas || 0) +
            (u.kpis?.colocacion?.renovaciones || 0);
          const faltaRodamientos = Math.max(
            0,
            (u.kpis?.rodamientos?.base || 0) -
              (u.kpis?.rodamientos?.recuperado || 0)
          );
          const badges = getBadges(u, users);

          return (
            <div
              key={u.id}
              className="bg-black/60 backdrop-blur-xl rounded-2xl p-5 border border-zinc-800 relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-zinc-800 group-hover:bg-amber-500/50 transition-colors" />
              <div className="flex items-center justify-between mb-4 border-b border-zinc-800/50 pb-3">
                <div className="flex items-center space-x-4">
                  <Kart3D
                    user={u}
                    className="w-12 h-12"
                    emojiSize="text-2xl"
                    isFloating={false}
                  />
                  <div>
                    <h3 className="font-black text-zinc-200 text-sm tracking-wider uppercase">
                      {u.name}
                    </h3>
                    <span className="text-[10px] font-mono text-amber-500">
                      {formatNumber(u.score)} PTS
                    </span>
                  </div>
                </div>
              </div>

              {badges.length > 0 && u.status === 'active' && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {badges.map((b) => (
                    <div
                      key={b.id}
                      className={`${b.bgClass} border rounded px-1.5 py-1 flex items-center space-x-1`}
                      title={b.desc}
                    >
                      <b.Icon size={10} className={b.colorClass} />
                      <span
                        className={`text-[8px] font-mono uppercase tracking-widest ${b.colorClass}`}
                      >
                        {b.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                <MetricCard
                  title="Contención"
                  value={u.kpis?.contencion}
                  meta={METAS.contencion}
                  type="percent"
                />
                <div className="bg-zinc-900/40 rounded-xl p-3 border border-zinc-800 w-full mb-3">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block mb-2">
                    Colocación
                  </span>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between items-end mb-1">
                        <span className="font-mono text-amber-400 text-xs">
                          {u.kpis?.colocacion?.nuevas || 0}{' '}
                          <span className="text-[8px] text-zinc-600">
                            NUEVAS
                          </span>
                        </span>
                        <span className="text-[8px] font-mono text-zinc-600">
                          TRGT: {METAS.colocacion_nuevas}
                        </span>
                      </div>
                      <div className="w-full bg-black rounded-full h-1 border border-zinc-800">
                        <div
                          className="bg-amber-500 h-1 rounded-full"
                          style={{
                            width: `${Math.min(
                              ((u.kpis?.colocacion?.nuevas || 0) /
                                METAS.colocacion_nuevas) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-end mb-1">
                        <span className="font-mono text-zinc-300 text-xs">
                          {totalCol}{' '}
                          <span className="text-[8px] text-zinc-600">
                            TOTAL
                          </span>
                        </span>
                        <span className="text-[8px] font-mono text-zinc-600">
                          TRGT: {METAS.colocacion_total}
                        </span>
                      </div>
                      <div className="w-full bg-black rounded-full h-1 border border-zinc-800">
                        <div
                          className="bg-zinc-500 h-1 rounded-full"
                          style={{
                            width: `${Math.min(
                              (totalCol / METAS.colocacion_total) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    title="Pagahorros"
                    value={u.kpis?.pagahorros}
                    meta={METAS.pagahorros}
                  />
                  <div className="w-full bg-zinc-900/60 p-4 rounded-xl border border-white/5 backdrop-blur-md flex flex-col justify-center items-center">
                    <span className="text-zinc-500 text-[9px] uppercase tracking-widest font-bold mb-2 block w-full text-left">
                      Cuentas Ah.
                    </span>
                    <CuentasAhorroStars
                      value={u.kpis?.cuentas_ahorro}
                      meta={METAS.cuentas_ahorro}
                    />
                  </div>
                </div>

                <div className="bg-black p-4 border border-zinc-800 rounded-xl">
                  <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-4">
                    RECUPERACIÓN RODAMIENTOS
                  </span>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 mb-3">
                    <div>
                      <span className="text-[8px] font-mono text-zinc-600 block">
                        BASE ASIGNADA
                      </span>
                      <span className="text-xs font-black text-zinc-300 font-mono">
                        {formatCurrency(u.kpis?.rodamientos?.base)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-mono text-zinc-600 block">
                        EFECTIVIDAD
                      </span>
                      <span className="text-xs font-black text-amber-500 font-mono">
                        {(u.kpis?.rodamientos?.base > 0
                          ? (u.kpis?.rodamientos?.recuperado /
                              u.kpis?.rodamientos?.base) *
                            100
                          : 0
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] font-mono text-zinc-600 block">
                        RECUPERADO
                      </span>
                      <span className="text-xs font-black text-emerald-500 font-mono">
                        {formatCurrency(u.kpis?.rodamientos?.recuperado)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-mono text-orange-500/70 block">
                        FALTA POR CUMPLIR
                      </span>
                      <span className="text-xs font-black text-orange-500 font-mono">
                        {formatCurrency(faltaRodamientos)}
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-zinc-900 h-1 overflow-hidden border border-black rounded-full mt-1">
                    <div
                      className="bg-amber-500 h-full shadow-[0_0_8px_rgba(245,158,11,0.8)] rounded-full"
                      style={{
                        width: `${Math.min(
                          u.kpis?.rodamientos?.base > 0
                            ? (u.kpis?.rodamientos?.recuperado /
                                u.kpis?.rodamientos?.base) *
                                100
                            : 0,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// --- PANEL GERENCIAL ÉLITE INTEGRADO ---
const ManagerPanel = memo(
  ({
    users,
    onClose,
    onBulkSave,
    globalSettings,
    onUpdateSettings,
    onAddUser,
    onDeleteUser,
    onRenameUser,
    onUpdateAvatar,
  }: any) => {
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState(false);
    const [tab, setTab] = useState('data');
    const [draftUsers, setDraftUsers] = useState(() =>
      JSON.parse(JSON.stringify(users))
    );
    const [draftSettings, setDraftSettings] = useState(
      () => globalSettings || { cut1: 10, cut2: 20, cut3: 30 }
    );

    const [newUserName, setNewUserName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editNameValue, setEditNameValue] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const pinInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (!isUnlocked && pinInputRef.current) pinInputRef.current.focus();
    }, [isUnlocked]);

    const submitPin = () => {
      if (pinInput === MANAGER_PIN) {
        setIsUnlocked(true);
      } else {
        setPinError(true);
        setPinInput('');
        if (pinInputRef.current) pinInputRef.current.focus();
      }
    };

    const handleDraftChange = (
      userId: string,
      fieldPath: string[],
      value: any
    ) => {
      setDraftUsers((prev: any) =>
        prev.map((u: any) => {
          if (u.id !== userId) return u;
          let newUser = { ...u };
          let current: any = newUser;
          for (let i = 0; i < fieldPath.length - 1; i++) {
            current = current[fieldPath[i]];
          }
          current[fieldPath[fieldPath.length - 1]] = value;
          return newUser;
        })
      );
    };

    const handleSave = () => {
      if (tab === 'data' || tab === 'points') {
        onBulkSave(draftUsers);
      } else if (tab === 'config') {
        onUpdateSettings(draftSettings);
        alert('CORTES ACTUALIZADOS CON ÉXITO.');
      } else {
        onClose();
      }
    };

    const handleImageUpload = (userId: string, e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event: any) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const MAX_SIZE = 150;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          if (ctx) {
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            const base64 = canvas.toDataURL('image/jpeg', 0.8);
            onUpdateAvatar(userId, base64);
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    };

    const handleAddUser = () => {
      if (newUserName.trim()) {
        onAddUser(newUserName.trim());
        setNewUserName('');
      }
    };

    const handleSaveRename = (id: string) => {
      if (editNameValue.trim()) {
        onRenameUser(id, editNameValue.trim());
      }
      setEditingId(null);
    };

    if (!isUnlocked) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/90 backdrop-blur-md p-6 animate-in fade-in duration-300">
          <div className="bg-black border border-zinc-800 p-8 rounded-2xl w-full max-w-xs relative shadow-[0_0_50px_rgba(0,0,0,1)]">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-500 hover:text-amber-500 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex justify-center mb-6">
              <Lock
                className="text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                size={40}
                strokeWidth={1.5}
              />
            </div>
            <h2 className="text-white text-center text-[10px] uppercase tracking-[0.3em] font-mono mb-8">
              System Auth
            </h2>
            <div className="flex flex-col gap-5">
              <input
                ref={pinInputRef}
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value.replace(/\D/g, ''));
                  setPinError(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && submitPin()}
                className={`w-full text-center text-2xl p-3 bg-zinc-900 text-amber-500 font-mono outline-none border transition-colors rounded shadow-inner ${
                  pinError
                    ? 'border-red-500 bg-red-950/20'
                    : 'border-zinc-800 focus:border-amber-500'
                }`}
                placeholder="____"
              />
              {pinError && (
                <p className="text-red-500 text-[9px] font-mono uppercase tracking-widest text-center mt-[-10px]">
                  AUTH_FAILED // RE-ENTER
                </p>
              )}
              <button
                onClick={submitPin}
                className="bg-amber-600 hover:bg-amber-500 text-black font-black uppercase tracking-[0.2em] text-xs py-4 rounded transition-colors shadow-[0_0_15px_rgba(245,158,11,0.3)] active:scale-95"
              >
                Initialize
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[100] bg-[#050505] flex flex-col p-4 animate-in fade-in duration-300">
        <header className="flex justify-between items-center mb-6 bg-black p-4 rounded-xl border border-zinc-800 shadow-md shrink-0">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">
              DATA_CONTROL
            </h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                onClick={() => setTab('data')}
                className={`text-[9px] font-mono font-bold uppercase tracking-widest px-3 py-1.5 rounded transition-colors ${
                  tab === 'data'
                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50'
                    : 'text-zinc-500 border border-transparent hover:text-zinc-300'
                }`}
              >
                Telemetría
              </button>
              <button
                onClick={() => setTab('roster')}
                className={`text-[9px] font-mono font-bold uppercase tracking-widest px-3 py-1.5 rounded transition-colors ${
                  tab === 'roster'
                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50'
                    : 'text-zinc-500 border border-transparent hover:text-zinc-300'
                }`}
              >
                Escudería
              </button>
              <button
                onClick={() => setTab('points')}
                className={`text-[9px] font-mono font-bold uppercase tracking-widest px-3 py-1.5 rounded transition-colors ${
                  tab === 'points'
                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50'
                    : 'text-zinc-500 border border-transparent hover:text-zinc-300'
                }`}
              >
                Puntos
              </button>
              <button
                onClick={() => setTab('config')}
                className={`text-[9px] font-mono font-bold uppercase tracking-widest px-3 py-1.5 rounded transition-colors ${
                  tab === 'config'
                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50'
                    : 'text-zinc-500 border border-transparent hover:text-zinc-300'
                }`}
              >
                Cortes
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-300 px-4 py-2 rounded text-[10px] uppercase tracking-widest font-bold transition-colors h-fit"
          >
            Cerrar
          </button>
        </header>

        {tab === 'data' ? (
          <div className="flex-1 overflow-auto min-h-0 bg-black rounded-xl shadow-xl border border-zinc-800 mb-28 hide-scrollbar relative">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
              <thead className="sticky top-0 z-40 bg-zinc-950 shadow-md">
                <tr className="text-amber-500 text-[9px] uppercase tracking-widest font-mono border-b border-zinc-800">
                  <th className="p-4 sticky left-0 top-0 bg-zinc-950 z-50 border-r border-zinc-800">
                    Piloto_ID
                  </th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Pre/Age</th>
                  <th className="p-4">Contención</th>
                  <th className="p-4">Nuevas</th>
                  <th className="p-4">Renovadas</th>
                  <th className="p-4">PagaAhorros</th>
                  <th className="p-4">Cuentas</th>
                  <th className="p-4">Base Rod. ($)</th>
                  <th className="p-4">Recuperado ($)</th>
                </tr>
              </thead>
              <tbody className="text-xs font-mono">
                {draftUsers.map((user: any) => (
                  <tr
                    key={user.id}
                    className="hover:bg-zinc-900/50 transition-colors border-b border-zinc-800/50"
                  >
                    <td className="p-4 font-black text-white sticky left-0 z-10 bg-[#0a0a0a] border-r border-zinc-800 shadow-[2px_0_5px_rgba(0,0,0,0.5)]">
                      {user.name}
                    </td>

                    <td className="p-2">
                      <select
                        value={user.status}
                        onChange={(e) =>
                          handleDraftChange(user.id, ['status'], e.target.value)
                        }
                        className="w-24 p-2 border border-zinc-800 rounded text-[10px] bg-black text-zinc-300 outline-none focus:border-amber-500 uppercase tracking-wider"
                      >
                        <option value="active">🟢 ACTIVE</option>
                        <option value="pits">🟡 PITS_WTG</option>
                        <option value="penalty">🔴 PNLT_ERR</option>
                      </select>
                    </td>

                    <td className="p-2 flex gap-2 justify-center">
                      <button
                        onClick={() =>
                          handleDraftChange(
                            user.id,
                            ['preventiva', 'realizada'],
                            !user.preventiva.realizada
                          )
                        }
                        className={`p-2 rounded transition-colors border ${
                          user.preventiva.realizada
                            ? 'bg-amber-900/30 text-amber-500 border-amber-500/50'
                            : 'bg-black text-zinc-700 border-zinc-800'
                        }`}
                      >
                        <PhoneCall size={14} />
                      </button>
                      <button
                        onClick={() =>
                          handleDraftChange(
                            user.id,
                            ['preventiva', 'agenda'],
                            !user.preventiva.agenda
                          )
                        }
                        className={`p-2 rounded transition-colors border ${
                          user.preventiva.agenda
                            ? 'bg-amber-900/30 text-amber-500 border-amber-500/50'
                            : 'bg-black text-zinc-700 border-zinc-800'
                        }`}
                      >
                        <BookOpen size={14} />
                      </button>
                    </td>

                    <td className="p-2">
                      <input
                        type="number"
                        value={user.kpis.contencion || ''}
                        onChange={(e) =>
                          handleDraftChange(
                            user.id,
                            ['kpis', 'contencion'],
                            Number(e.target.value)
                          )
                        }
                        className="w-20 p-2 border border-zinc-800 bg-black text-amber-400 rounded text-center outline-none focus:border-amber-500"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={user.kpis.colocacion.nuevas || ''}
                        onChange={(e) =>
                          handleDraftChange(
                            user.id,
                            ['kpis', 'colocacion', 'nuevas'],
                            Number(e.target.value)
                          )
                        }
                        className="w-16 p-2 border border-zinc-800 bg-black text-amber-400 rounded text-center outline-none focus:border-amber-500"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={user.kpis.colocacion.renovaciones || ''}
                        onChange={(e) =>
                          handleDraftChange(
                            user.id,
                            ['kpis', 'colocacion', 'renovaciones'],
                            Number(e.target.value)
                          )
                        }
                        className="w-16 p-2 border border-zinc-800 bg-black text-amber-400 rounded text-center outline-none focus:border-amber-500"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={user.kpis.pagahorros || ''}
                        onChange={(e) =>
                          handleDraftChange(
                            user.id,
                            ['kpis', 'pagahorros'],
                            Number(e.target.value)
                          )
                        }
                        className="w-16 p-2 border border-zinc-800 bg-black text-amber-400 rounded text-center outline-none focus:border-amber-500"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={user.kpis.cuentas_ahorro || ''}
                        onChange={(e) =>
                          handleDraftChange(
                            user.id,
                            ['kpis', 'cuentas_ahorro'],
                            Number(e.target.value)
                          )
                        }
                        className="w-16 p-2 border border-zinc-800 bg-black text-amber-400 rounded text-center outline-none focus:border-amber-500"
                      />
                    </td>
                    <td className="p-2">
                      <FormattedNumberInput
                        value={user.kpis.rodamientos.base}
                        onChange={(val: any) =>
                          handleDraftChange(
                            user.id,
                            ['kpis', 'rodamientos', 'base'],
                            val
                          )
                        }
                        className="w-28 p-2 border border-zinc-800 bg-black text-amber-400 rounded text-right outline-none focus:border-amber-500"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2">
                      <FormattedNumberInput
                        value={user.kpis.rodamientos.recuperado}
                        onChange={(val: any) =>
                          handleDraftChange(
                            user.id,
                            ['kpis', 'rodamientos', 'recuperado'],
                            val
                          )
                        }
                        className="w-28 p-2 border border-zinc-800 bg-black text-amber-400 rounded text-right outline-none focus:border-amber-500"
                        placeholder="0"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === 'roster' ? (
          <div className="flex-1 overflow-auto min-h-0 bg-black rounded-xl shadow-xl border border-zinc-800 mb-28 p-4 hide-scrollbar">
            <h3 className="text-white font-black font-mono text-sm mb-6 uppercase tracking-widest border-b border-zinc-800 pb-2">
              Gestión de Escudería
            </h3>

            <div className="mb-6 bg-zinc-900/50 p-3 border border-zinc-800 rounded flex gap-2">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="NUEVO PILOTO..."
                className="flex-1 bg-black border border-zinc-700 px-3 py-2 text-[10px] font-mono text-amber-500 outline-none uppercase focus:border-amber-500"
              />
              <button
                onClick={handleAddUser}
                disabled={!newUserName.trim()}
                className="bg-amber-600 text-black px-4 rounded font-black disabled:opacity-50 transition-transform active:scale-95"
              >
                <UserPlus size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {users.map((u: any) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between bg-[#0a0a0a] p-3 border border-zinc-800 rounded shadow-sm"
                >
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className="relative w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex-shrink-0 group overflow-hidden">
                      {u.avatar ? (
                        <img
                          src={u.avatar}
                          className="w-full h-full object-cover"
                          alt="avatar"
                        />
                      ) : (
                        <span className="text-xs font-black font-mono text-zinc-500 flex items-center justify-center w-full h-full">
                          {u.name.substring(0, 1).toUpperCase()}
                        </span>
                      )}
                      <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                        <Camera size={14} className="text-amber-500" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(u.id, e)}
                        />
                      </label>
                    </div>
                    {editingId === u.id ? (
                      <input
                        autoFocus
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && handleSaveRename(u.id)
                        }
                        className="flex-1 min-w-0 bg-black border border-amber-500 px-3 py-2 text-xs font-mono text-amber-500 uppercase rounded outline-none"
                      />
                    ) : (
                      <span className="font-black font-mono text-xs text-zinc-300 uppercase truncate">
                        {u.name}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 pl-4">
                    {confirmDeleteId === u.id ? (
                      <>
                        <button
                          onClick={() => onDeleteUser(u.id)}
                          className="bg-red-900/80 text-red-100 border border-red-600 px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                        >
                          DEL
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-zinc-500 p-2 hover:text-zinc-300 bg-zinc-900 rounded"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : editingId === u.id ? (
                      <>
                        <button
                          onClick={() => handleSaveRename(u.id)}
                          className="text-emerald-500 bg-emerald-950/30 border border-emerald-900 p-2 rounded"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-zinc-500 bg-zinc-900 border border-zinc-800 p-2 rounded"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(u.id);
                            setEditNameValue(u.name);
                          }}
                          className="text-zinc-500 hover:text-amber-500 bg-black border border-zinc-800 p-2 rounded transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(u.id)}
                          disabled={users.length <= 1}
                          className="text-zinc-500 hover:text-red-500 bg-black border border-zinc-800 p-2 rounded disabled:opacity-30 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : tab === 'points' ? (
          <div className="flex-1 overflow-auto min-h-0 bg-black rounded-xl shadow-xl border border-zinc-800 mb-28 p-4 hide-scrollbar">
            <h3 className="text-white font-black font-mono text-sm mb-2 uppercase tracking-widest border-b border-zinc-800 pb-2">
              Reconocimientos y Castigos
            </h3>
            <p className="text-[10px] text-zinc-500 font-mono mb-6">
              Añade puntos para premiar (ej: 5000) o negativos para penalizar
              (ej: -5000).
            </p>
            <div className="space-y-3">
              {draftUsers.map((user: any) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between bg-[#0a0a0a] p-3 border border-zinc-800 rounded shadow-sm"
                >
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <Kart3D
                      user={user}
                      className="w-10 h-10 flex-shrink-0"
                      emojiSize="text-lg"
                      isFloating={false}
                    />
                    <span className="font-black font-mono text-xs text-zinc-300 uppercase truncate">
                      {user.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 pl-4">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest text-right leading-tight">
                      Puntos
                      <br />
                      Extra
                    </span>
                    <input
                      type="number"
                      value={user.extraPoints === 0 ? '' : user.extraPoints}
                      onChange={(e) =>
                        handleDraftChange(
                          user.id,
                          ['extraPoints'],
                          Number(e.target.value)
                        )
                      }
                      className={`w-28 bg-black border ${
                        Number(user.extraPoints) < 0
                          ? 'border-red-900 text-red-500 focus:border-red-500'
                          : 'border-zinc-700 text-amber-500 focus:border-amber-500'
                      } text-right font-mono font-black text-sm py-2 px-3 rounded outline-none transition-colors`}
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto min-h-0 bg-black rounded-xl shadow-xl border border-zinc-800 mb-28 p-6 hide-scrollbar">
            <h3 className="text-white font-black font-mono text-sm mb-6 uppercase tracking-widest border-b border-zinc-800 pb-2">
              Configurar Fechas de Cortes
            </h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between bg-zinc-900/50 p-4 border border-zinc-800 rounded">
                <span className="text-amber-500 font-mono text-xs font-black uppercase tracking-widest">
                  Corte 1
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">
                    Día del mes:
                  </span>
                  <input
                    type="number"
                    value={draftSettings.cut1}
                    onChange={(e) =>
                      setDraftSettings({
                        ...draftSettings,
                        cut1: Number(e.target.value),
                      })
                    }
                    className="w-20 bg-black border border-zinc-700 text-amber-500 text-center font-mono font-black text-lg py-2 rounded outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-zinc-900/50 p-4 border border-zinc-800 rounded">
                <span className="text-amber-500 font-mono text-xs font-black uppercase tracking-widest">
                  Corte 2
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">
                    Día del mes:
                  </span>
                  <input
                    type="number"
                    value={draftSettings.cut2}
                    onChange={(e) =>
                      setDraftSettings({
                        ...draftSettings,
                        cut2: Number(e.target.value),
                      })
                    }
                    className="w-20 bg-black border border-zinc-700 text-amber-500 text-center font-mono font-black text-lg py-2 rounded outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-zinc-900/50 p-4 border border-zinc-800 rounded">
                <span className="text-amber-500 font-mono text-xs font-black uppercase tracking-widest">
                  Cierre de Mes
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">
                    Día del mes:
                  </span>
                  <input
                    type="number"
                    value={draftSettings.cut3}
                    onChange={(e) =>
                      setDraftSettings({
                        ...draftSettings,
                        cut3: Number(e.target.value),
                      })
                    }
                    className="w-20 bg-black border border-zinc-700 text-amber-500 text-center font-mono font-black text-lg py-2 rounded outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="fixed bottom-8 left-0 w-full px-4 flex justify-center z-50">
          <button
            onClick={handleSave}
            className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-[0.3em] py-4 px-12 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.5)] flex items-center gap-3 transition-all active:scale-95 border border-amber-300"
          >
            <Save size={20} strokeWidth={2.5} />
            {tab === 'data' || tab === 'points'
              ? 'OVERRIDE DATA'
              : tab === 'config'
              ? 'GUARDAR CORTES'
              : 'CERRAR ESCUDERÍA'}
          </button>
        </div>
      </div>
    );
  }
);

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showManagerPanel, setShowManagerPanel] = useState(false);
  const [users, setUsers] = useState(() => getUsersWithScores(INITIAL_USERS));
  const [globalSettings, setGlobalSettings] = useState({
    cut1: 10,
    cut2: 20,
    cut3: 30,
  });
  const [isLoadingData, setIsLoadingData] = useState(true);

  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();
  const monthProgress = (currentDay / daysInMonth) * 100;
  const monthName = new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(
    today
  );

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {}
    };
    initAuth();
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = collection(db, COLL_PATH);
        const unsubscribeSnapshot = onSnapshot(
          q,
          (snapshot) => {
            if (snapshot.empty) {
              INITIAL_USERS.forEach((u) => {
                setDoc(doc(db, COLL_PATH, u.id), u);
              });
            } else {
              setUsers(
                getUsersWithScores(
                  snapshot.docs.map((doc) => sanitizeUser(doc.data()))
                )
              );
              setIsLoadingData(false);
            }
          },
          () => {
            setUsers(getUsersWithScores(INITIAL_USERS));
            setIsLoadingData(false);
          }
        );

        const unsubscribeSettings = onSnapshot(
          doc(db, SETTINGS_PATH, 'global'),
          (docSnap) => {
            if (docSnap.exists()) {
              setGlobalSettings(docSnap.data() as any);
            } else {
              setDoc(doc(db, SETTINGS_PATH, 'global'), {
                cut1: 10,
                cut2: 20,
                cut3: daysInMonth,
              });
            }
          }
        );

        return () => {
          unsubscribeSnapshot();
          unsubscribeSettings();
        };
      }
    });
    return () => unsubscribeAuth();
  }, [daysInMonth]);

  const updateUserKpis = useCallback(
    async (id: string, newKpis: any, preventiva: any) => {
      try {
        await updateDoc(doc(db, COLL_PATH, id), {
          kpis: newKpis,
          preventiva: preventiva,
          isUpdated: true,
        });
      } catch (e) {}
    },
    []
  );

  const updateGlobalSettings = useCallback(async (newSettings: any) => {
    try {
      await setDoc(doc(db, SETTINGS_PATH, 'global'), newSettings, {
        merge: true,
      });
    } catch (e) {
      console.error('Error guardando settings:', e);
    }
  }, []);

  const handleAddUser = useCallback(
    async (name: string) => {
      const newId = String(
        Math.max(0, ...users.map((u) => parseInt(u.id) || 0)) + 1
      );
      const newUser = sanitizeUser({
        id: newId,
        name,
        status: 'pits',
        isUpdated: true,
      });
      try {
        await setDoc(doc(db, COLL_PATH, newId), newUser);
      } catch (e) {
        console.error(e);
      }
    },
    [users]
  );

  const handleDeleteUser = useCallback(
    async (id: string) => {
      if (users.length <= 1) return;
      try {
        await deleteDoc(doc(db, COLL_PATH, id));
      } catch (e) {
        console.error(e);
      }
    },
    [users]
  );

  const handleRenameUser = useCallback(async (id: string, newName: string) => {
    try {
      await updateDoc(doc(db, COLL_PATH, id), { name: newName });
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleUpdateAvatar = useCallback(async (id: string, base64: string) => {
    try {
      await updateDoc(doc(db, COLL_PATH, id), { avatar: base64 });
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleBulkSave = async (updatedUsers: any[]) => {
    try {
      const promises = updatedUsers.map((u) =>
        updateDoc(doc(db, COLL_PATH, u.id), {
          status: u.status,
          kpis: u.kpis,
          preventiva: u.preventiva,
          extraPoints: u.extraPoints || 0,
          isUpdated: true,
        })
      );
      await Promise.all(promises);
      alert(
        'SISTEMA ACTUALIZADO: TELEMETRÍA ÉLITE INYECTADA EN LOS SERVIDORES.'
      );
    } catch (e) {
      console.error('Error en sincronización masiva:', e);
      alert('ERROR DE CONEXIÓN CON EL SERVIDOR.');
    }
  };

  if (showSplash || isLoadingData)
    return <SplashScreen onComplete={() => setShowSplash(false)} />;

  const TABS = [
    { id: 'dashboard', icon: Home, label: 'Lobby' },
    { id: 'track', icon: Map, label: 'Pista' },
    { id: 'pits', icon: FastForward, label: 'Pits' },
    { id: 'ranking', icon: Trophy, label: 'Podio' },
    { id: 'garage', icon: Settings, label: 'Garage' },
  ];

  return (
    <div className="font-sans bg-[#050505] min-h-screen text-zinc-300 selection:bg-amber-500/30">
      {showManagerPanel && (
        <ManagerPanel
          users={users}
          onClose={() => setShowManagerPanel(false)}
          onBulkSave={handleBulkSave}
          globalSettings={globalSettings}
          onUpdateSettings={updateGlobalSettings}
          onAddUser={handleAddUser}
          onDeleteUser={handleDeleteUser}
          onRenameUser={handleRenameUser}
          onUpdateAvatar={handleUpdateAvatar}
        />
      )}

      {/* Fondos dinámicos ligeros */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-amber-600/5 rounded-full blur-[100px] pointer-events-none" />
      </div>

      <main className="relative z-10 max-w-md mx-auto min-h-screen bg-[#050505]/90 backdrop-blur-md overflow-x-hidden pb-4 border-x border-white/5">
        {activeTab === 'dashboard' && (
          <Dashboard
            users={users}
            openManagerPanel={() => setShowManagerPanel(true)}
            currentDay={currentDay}
            daysInMonth={daysInMonth}
            monthProgress={monthProgress}
          />
        )}
        {activeTab === 'track' && (
          <Track
            users={users}
            currentDay={currentDay}
            daysInMonth={daysInMonth}
            monthProgress={monthProgress}
            monthName={monthName}
            globalSettings={globalSettings}
          />
        )}
        {activeTab === 'pits' && (
          <Pits users={users} updateUserKpis={updateUserKpis} />
        )}
        {activeTab === 'ranking' && <Ranking users={users} />}
        {activeTab === 'garage' && <Garage users={users} />}
      </main>

      {/* BARRA DE NAVEGACIÓN ÉLITE */}
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="bg-black/95 backdrop-blur-xl border border-zinc-800 shadow-[0_20px_40px_rgba(0,0,0,0.8)] rounded-2xl px-6 py-4 flex items-center justify-between w-full max-w-md pointer-events-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center w-12 transition-all duration-300 ${
                  isActive
                    ? 'text-amber-500 -translate-y-1'
                    : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                <div
                  className={`absolute inset-0 bg-amber-500/10 rounded-full transition-transform duration-400 ease-out ${
                    isActive ? 'scale-110 opacity-100' : 'scale-0 opacity-0'
                  }`}
                  style={{ zIndex: -1 }}
                />
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 2}
                  className="mb-1"
                />
                <span
                  className={`text-[8px] font-mono uppercase tracking-widest transition-opacity duration-300 ${
                    isActive ? 'opacity-100' : 'opacity-0 absolute top-10'
                  }`}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-3 w-1 h-1 bg-amber-500 rounded-full shadow-[0_0_5px_rgba(245,158,11,1)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `,
        }}
      />
    </div>
  );
}
