import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { Home, Map, FastForward, Trophy, Settings, ChevronRight, TrendingUp, Target, Award, Zap, Save, AlertCircle, DollarSign, PiggyBank, ShieldAlert, Lock, Unlock, Flag, Power, ShieldCheck, PhoneCall, Activity, Wrench, Ban, CheckCircle, Users, UserPlus, Edit2, Trash2, X, Check, CalendarDays, Star, BookOpen, RefreshCw, Hexagon, AlertTriangle, Crosshair, Clock, Camera } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDnRCHJ-ilQgyqSG5JOuzXaiwkz61xUjUk",
  authDomain: "rally-comercial-fc4ab.firebaseapp.com",
  projectId: "rally-comercial-fc4ab",
  storageBucket: "rally-comercial-fc4ab.firebasestorage.app",
  messagingSenderId: "657588773433",
  appId: "1:657588773433:web:40432aa188fcf0f484e3e8",
  measurementId: "G-2DF0LJHBM2"
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
  cuentas_ahorro: 3 
};

// --- FUNCIONES DE LÓGICA ---
function sanitizeUser(u: any) {
  return {
    id: u?.id || String(Math.random()),
    name: u?.name || 'Piloto',
    avatar: u?.avatar || null,
    status: u?.status || 'pits',
    isUpdated: !!u?.isUpdated,
    score: Number(u?.score) || 0,
    extraPoints: Number(u?.extraPoints) || 0,
    kpis: {
      contencion: Number(u?.kpis?.contencion) || 0,
      colocacion: { nuevas: Number(u?.kpis?.colocacion?.nuevas) || 0, renovaciones: Number(u?.kpis?.colocacion?.renovaciones) || 0 },
      rodamientos: { base: Number(u?.kpis?.rodamientos?.base) || 0, recuperado: Number(u?.kpis?.rodamientos?.recuperado) || 0 },
      pagahorros: Number(u?.kpis?.pagahorros) || 0,
      cuentas_ahorro: Number(u?.kpis?.cuentas_ahorro) || 0,
    },
    preventiva: { realizada: !!u?.preventiva?.realizada, agenda: !!u?.preventiva?.agenda }
  };
}

const RAW_INITIAL_USERS = [
  { id: '1', name: 'Ingrid' }, { id: '2', name: 'Stefania' }, { id: '3', name: 'Angela' },
  { id: '4', name: 'Richard' }, { id: '5', name: 'Fredy' }, { id: '6', name: 'María R.' },
  { id: '7', name: 'Néstor' }, { id: '8', name: 'Yhon' }, { id: '9', name: 'Eibar' },
  { id: '10', name: 'Luis' }, { id: '11', name: 'Liliana' }, { id: '12', name: 'Carlos' },
  { id: '13', name: 'Nohemi' }, { id: '14', name: 'Carolina' }, { id: '15', name: 'Juan' },
];

const INITIAL_USERS = RAW_INITIAL_USERS.map(sanitizeUser);

function formatNumber(num: number) {
  return new Intl.NumberFormat('es-CO').format(Number(num) || 0);
}

function formatCurrency(num: number) {
  return '$' + new Intl.NumberFormat('es-CO').format(Number(num) || 0);
}

function calculateScore(kpis: any, status: string, extraPoints = 0) {
  if (!kpis) return 0;
  let score = 0;
  score += (METAS.contencion > 0 ? Math.min(kpis.contencion / METAS.contencion, 1) : 0) * 300;
  score += (METAS.colocacion_total > 0 ? Math.min((kpis.colocacion.nuevas + kpis.colocacion.renovaciones) / METAS.colocacion_total, 1) : 0) * 150;
  score += (METAS.colocacion_nuevas > 0 ? Math.min(kpis.colocacion.nuevas / METAS.colocacion_nuevas, 1) : 0) * 150;
  score += (METAS.pagahorros > 0 ? Math.min(kpis.pagahorros / METAS.pagahorros, 1) : 0) * 150;
  score += (METAS.cuentas_ahorro > 0 ? Math.min(kpis.cuentas_ahorro / METAS.cuentas_ahorro, 1) : 0) * 150;
  score += (kpis.rodamientos.base > 0 ? Math.min(kpis.rodamientos.recuperado / kpis.rodamientos.base, 1) : 0) * 150;
  
  let finalScore = Math.round(score * 100);
  if (status === 'penalty') finalScore -= 15000;
  finalScore += Number(extraPoints) || 0;
  return Math.max(0, finalScore);
}

function getLeague(score: number) {
  const safeScore = Number(score) || 0;
  if (safeScore >= 80000) return { name: 'Diamante', color: 'from-fuchsia-600 to-purple-800', text: 'text-fuchsia-400', border: 'border-fuchsia-500/50' };
  if (safeScore >= 60000) return { name: 'Oro', color: 'from-amber-400 to-amber-600', text: 'text-amber-400', border: 'border-amber-500/50' };
  if (safeScore >= 40000) return { name: 'Plata', color: 'from-zinc-300 to-zinc-500', text: 'text-zinc-300', border: 'border-zinc-400/50' };
  return { name: 'Bronce', color: 'from-orange-700 to-amber-900', text: 'text-orange-600', border: 'border-orange-700/50' };
}

function getBadges(user: any, allUsers: any[]) {
  let badges = [];
  if (!user || user.status !== 'active') return badges;
  const activeUsers = allUsers.filter(u => u.status === 'active');
  if (activeUsers.length === 0) return badges;

  const maxContencion = Math.max(0, ...activeUsers.map(u => u.kpis.contencion));
  const maxNuevas = Math.max(0, ...activeUsers.map(u => u.kpis.colocacion.nuevas));
  const maxRecuperacionRatio = Math.max(0, ...activeUsers.map(u => u.kpis.rodamientos.base > 0 ? (u.kpis.rodamientos.recuperado / u.kpis.rodamientos.base) : 0));
  const maxPaga = Math.max(0, ...activeUsers.map(u => u.kpis.pagahorros));
  
  const userRecuperacionRatio = user.kpis.rodamientos.base > 0 ? (user.kpis.rodamientos.recuperado / user.kpis.rodamientos.base) : 0;

  if (user.kpis.contencion === maxContencion && maxContencion > 0) badges.push({ id: 'cont', name: 'Guardián', Icon: ShieldCheck, colorClass: 'text-cyan-400', bgClass: 'bg-cyan-900/30 border-cyan-500/30 text-cyan-400', desc: 'Mejor Contención' });
  if (user.kpis.colocacion.nuevas === maxNuevas && maxNuevas > 0) badges.push({ id: 'col', name: 'Top Closer', Icon: Target, colorClass: 'text-emerald-400', bgClass: 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400', desc: 'Líder en Nuevas' });
  if (userRecuperacionRatio === maxRecuperacionRatio && maxRecuperacionRatio > 0) badges.push({ id: 'rod', name: 'Titán', Icon: TrendingUp, colorClass: 'text-orange-400', bgClass: 'bg-orange-900/30 border-orange-500/30 text-orange-400', desc: 'Líder en Rodamientos' });
  if (user.kpis.pagahorros === maxPaga && maxPaga > 0) badges.push({ id: 'pag', name: 'As Ahorro', Icon: PiggyBank, colorClass: 'text-purple-400', bgClass: 'bg-purple-900/30 border-purple-500/30 text-purple-400', desc: 'Líder en Pagahorros' });
  
  if (user.preventiva?.realizada && user.preventiva?.agenda) badges.push({ id: 'prev', name: 'Impecable', Icon: Activity, colorClass: 'text-rose-400', bgClass: 'bg-rose-900/30 border-rose-500/30 text-rose-400', desc: 'Requisitos Cumplidos' });

  return badges;
}

function getUsersWithScores(users: any[]) {
  return users.map(u => {
    const safeUser = sanitizeUser(u);
    return { ...safeUser, score: calculateScore(safeUser.kpis, safeUser.status, safeUser.extraPoints) };
  });
}

function getVehicleData(id: string | number) {
  const themes = [
    { color: 'text-red-500', bg: 'from-red-500 to-red-900', border: 'border-red-500/50' },
    { color: 'text-orange-500', bg: 'from-orange-400 to-orange-800', border: 'border-orange-500/50' },
    { color: 'text-amber-500', bg: 'from-amber-400 to-amber-800', border: 'border-amber-500/50' },
    { color: 'text-emerald-500', bg: 'from-emerald-400 to-emerald-800', border: 'border-emerald-500/50' },
    { color: 'text-cyan-500', bg: 'from-cyan-400 to-cyan-800', border: 'border-cyan-500/50' },
    { color: 'text-blue-500', bg: 'from-blue-500 to-blue-900', border: 'border-blue-500/50' },
    { color: 'text-indigo-500', bg: 'from-indigo-400 to-indigo-800', border: 'border-indigo-500/50' },
    { color: 'text-purple-500', bg: 'from-purple-500 to-purple-900', border: 'border-purple-500/50' },
    { color: 'text-fuchsia-500', bg: 'from-fuchsia-400 to-fuchsia-800', border: 'border-fuchsia-500/50' },
    { color: 'text-rose-500', bg: 'from-rose-500 to-rose-900', border: 'border-rose-500/50' },
  ];
  return themes[(parseInt(String(id)) - 1) % themes.length] || themes[0];
}

// --- COMPONENTES UI ÉLITE Y COLORIDOS ---

const Kart3D = memo(({ user, className = "w-24 h-24", emojiSize = "text-5xl", isFloating = true }: any) => {
  if (!user) return null;
  const vData = getVehicleData(user.id);
  const isActive = user.status === 'active';
  const isPits = user.status === 'pits';
  
  const initial = user.name.substring(0, 1).toUpperCase();

  const auraClass = isActive ? `bg-gradient-to-br ${vData.bg} opacity-50 blur-xl group-hover:opacity-80` :
                    isPits ? 'bg-amber-400 opacity-30 blur-xl' : 'bg-zinc-600 opacity-20 blur-sm';

  const pedestalClass = isActive ? `bg-zinc-900/90 border-t border-b-4 border-black ${vData.border} border-2` :
                        isPits ? 'bg-amber-900/40 border-amber-500/50 border-t border-b-4 border-black border-2' :
                        'bg-zinc-900/30 border-zinc-800 border-t border-b-2 border-black';

  const textAnimClass = isActive ? `${vData.color} drop-shadow-[0_0_15px_currentColor] transform -translate-y-1` :
                         isPits ? 'text-amber-500 opacity-90' : 'text-zinc-600 opacity-60';
  
  const imgAnimClass = isActive ? 'shadow-[0_0_20px_rgba(255,255,255,0.4)] transform -translate-y-1' :
                         isPits ? 'sepia-[.4] opacity-90' : 'grayscale opacity-60';

  return (
    <div className={`relative flex items-center justify-center ${className} transition-transform duration-300 hover:scale-110 ${isFloating && isActive ? 'animate-float' : ''}`}>
      <div className={`absolute inset-0 rounded-full transition-all duration-500 ${auraClass}`} />
      <div className={`absolute inset-1 backdrop-blur-md rounded-full shadow-2xl transition-colors duration-500 ${pedestalClass} flex items-center justify-center overflow-hidden`}>
         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4px_4px]" />
      </div>
      {user.avatar ? (
        <img src={user.avatar} className={`relative z-10 w-[75%] h-[75%] rounded-full object-cover border-2 border-black transition-all duration-500 ${imgAnimClass}`} alt={user.name} />
      ) : (
        <span className={`relative z-10 ${emojiSize} font-black font-mono transition-all duration-500 ${textAnimClass} select-none`}>
          {initial}
        </span>
      )}
    </div>
  );
}, (prev: any, next: any) => prev.user?.id === next.user?.id && prev.user?.status === next.user?.status && prev.user?.score === next.user?.score && prev.user?.avatar === next.user?.avatar && prev.isFloating === next.isFloating);

const FormattedNumberInput = memo(({ value, onChange, disabled, className, placeholder = "0" }: any) => {
  const safeValue = Number(value) || 0;
  const [displayValue, setDisplayValue] = useState(formatNumber(safeValue));
  useEffect(() => { setDisplayValue(formatNumber(Number(value) || 0)); }, [value]);
  const handleChange = (e: any) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numValue = Number(rawValue);
    setDisplayValue(formatNumber(numValue));
    onChange(numValue);
  };
  return <input type="text" inputMode="numeric" value={displayValue === "0" && !safeValue ? '' : displayValue} onChange={handleChange} disabled={disabled} placeholder={placeholder} className={className} />;
});

// Tarjeta Genérica con Colores Semánticos (Pastel Neón)
const MetricCard = memo(({ title, value, meta, type = 'normal', theme = 'amber' }: any) => {
  const valNum = Number(value) || 0;
  const metaNum = Number(meta) || 0;
  const percentage = metaNum > 0 ? Math.min((valNum / metaNum) * 100, 100) : 0;
  
  const themes: any = {
    amber: { bg: 'from-zinc-900/80 to-amber-950/20', border: 'border-amber-500/20', text: 'text-amber-500/70', bar: 'from-amber-600 to-amber-400' },
    blue: { bg: 'from-blue-950/30 to-blue-900/10', border: 'border-blue-400/30', text: 'text-blue-300', bar: 'from-blue-500 to-cyan-400' },
    emerald: { bg: 'from-emerald-950/30 to-teal-900/10', border: 'border-emerald-400/30', text: 'text-emerald-300', bar: 'from-emerald-600 to-emerald-400' },
    purple: { bg: 'from-purple-950/30 to-fuchsia-900/10', border: 'border-fuchsia-400/30', text: 'text-fuchsia-300', bar: 'from-purple-500 to-fuchsia-400' },
    orange: { bg: 'from-orange-950/30 to-red-900/10', border: 'border-orange-400/30', text: 'text-orange-300', bar: 'from-orange-500 to-red-400' }
  };
  const t = themes[theme] || themes.amber;

  return (
    <div className={`w-full bg-gradient-to-br ${t.bg} p-5 rounded-2xl border ${t.border} backdrop-blur-xl relative overflow-hidden group transition-all shadow-lg`}>
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
      <span className={`${t.text} text-[10px] uppercase tracking-widest font-black mb-1.5 block`}>{title}</span>
      <div className="flex items-end justify-between mb-3">
        <span className="text-2xl leading-none font-black text-white font-mono drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
          {type === 'money' ? formatCurrency(valNum) : valNum}{type === 'percent' ? '%' : ''}
        </span>
        <span className="text-zinc-400 text-[10px] font-mono font-bold">TRGT: {type === 'money' ? formatCurrency(metaNum) : metaNum}{type === 'percent' ? '%' : ''}</span>
      </div>
      <div className="w-full bg-black/60 rounded-full h-1.5 mb-1 border border-zinc-800/50 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${t.bar} relative`} style={{ width: `${percentage}%` }}>
            <div className="absolute right-0 top-0 w-3 h-full bg-white/60 rounded-full blur-[2px]"></div>
        </div>
      </div>
    </div>
  );
});

const CuentasAhorroStars = memo(({ value, meta = 3, activeColor = 'text-amber-400 fill-amber-400', glow = 'drop-shadow-[0_0_15px_rgba(251,191,36,1)]' }: any) => {
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
                ? `${activeColor} ${glow} scale-110`
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
      setProgress(p => {
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
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2a1300] via-black to-black text-white transition-opacity duration-700 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'} p-4 md:p-10`}>
      <div className="relative w-full max-w-md md:max-w-5xl lg:max-w-6xl aspect-[4/5] md:aspect-video bg-black/60 backdrop-blur-2xl border border-amber-500/30 rounded-[2.5rem] md:rounded-[3rem] shadow-[0_0_80px_rgba(245,158,11,0.2)] flex flex-col items-center justify-center overflow-hidden transition-all duration-500">
        
        <div className="absolute top-0 left-0 md:left-20 w-40 md:w-64 h-40 md:h-64 bg-amber-500/30 blur-[80px] rounded-full mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-0 right-0 md:right-20 w-40 md:w-64 h-40 md:h-64 bg-amber-500/30 blur-[80px] rounded-full mix-blend-screen pointer-events-none" />

        <div className="absolute top-8 md:top-12 w-full px-10 md:px-16 flex justify-between items-center z-20">
           <div className="border border-amber-500/40 px-3 md:px-4 py-1 md:py-1.5 flex items-center gap-1 rounded-lg bg-amber-950/20">
             <span className="text-[9px] md:text-[11px] font-black font-mono tracking-widest text-amber-500">POPAYÁN</span>
           </div>
           <Hexagon size={24} className="text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)] md:w-8 md:h-8" />
        </div>

        <div className="relative w-full flex flex-col items-center justify-center z-20 mt-8 md:mt-0">
          <div className="text-center select-none z-10 relative">
            <div className="text-[7rem] md:text-[12rem] lg:text-[14rem] leading-[0.75] md:leading-[0.8] font-black tracking-tighter text-white drop-shadow-2xl transition-all">RAL</div>
            <div className="text-[7rem] md:text-[12rem] lg:text-[14rem] leading-[0.75] md:leading-[0.8] font-black tracking-tighter text-white relative drop-shadow-2xl transition-all">
              LY<span className="text-transparent" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.3)' }}>.</span>
              <div className="absolute bottom-2 md:bottom-6 left-[-20px] md:left-[-30px] w-6 h-6 md:w-8 md:h-8 border-[3px] md:border-[4px] border-amber-500 rounded-full blur-[1px] shadow-[0_0_15px_rgba(245,158,11,1)]" />
            </div>
          </div>
          <img 
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
            alt="Abstract 3D Art"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] min-w-[400px] md:w-[110%] md:min-w-[800px] object-cover mix-blend-screen opacity-90 z-20 pointer-events-none transition-all"
            style={{ 
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 65%, rgba(0,0,0,0) 100%)', 
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 65%, rgba(0,0,0,0) 100%)',
              filter: 'grayscale(100%) sepia(100%) hue-rotate(-5deg) saturate(800%) brightness(1.4)'
            }}
          />
        </div>

        <div className="absolute bottom-32 md:bottom-12 md:left-16 flex flex-col items-center md:items-start z-30">
           <div className="text-[8px] md:text-[10px] font-mono tracking-[0.6em] text-zinc-300 text-center md:text-left leading-relaxed uppercase font-black bg-black/40 md:bg-transparent px-6 md:px-0 py-3 md:py-0 rounded-2xl md:rounded-none backdrop-blur-md md:backdrop-blur-none border border-white/5 md:border-none">
             DIRECCIÓN & <br className="md:hidden"/>
             <span className="text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]">TELEMETRÍA COMERCIAL</span>
           </div>
        </div>

        <div className="absolute bottom-10 md:bottom-12 md:right-16 flex flex-col items-center md:items-end z-30 w-full px-12 md:px-0 md:w-1/3">
           <div className="flex justify-between md:justify-end md:gap-4 w-full mb-2">
             <span className="text-[7px] md:text-[9px] font-black font-mono tracking-widest text-amber-500/70 uppercase">Cargando Plataforma...</span>
             <span className="text-[7px] md:text-[9px] font-black font-mono tracking-widest text-amber-500 uppercase drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]">{progress}%</span>
           </div>
           <div className="w-full md:w-48 h-1.5 md:h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
             <div className="h-full bg-gradient-to-r from-amber-600 to-amber-300 transition-all duration-75 ease-linear shadow-[0_0_12px_rgba(245,158,11,1)] relative" style={{ width: `${progress}%` }}>
                <div className="absolute right-0 top-0 w-3 h-full bg-white rounded-full blur-[2px]"></div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

// --- VISTAS PRINCIPALES ---
const Dashboard = ({ users, openManagerPanel, currentDay, daysInMonth, monthProgress }: any) => {
  const { topUser, officeStats } = useMemo(() => {
    const tUser = users.length > 0 ? [...users].sort((a: any, b: any) => b.score - a.score)[0] : null;
    
    const totals = users.reduce((acc: any, u: any) => {
      acc.contencion += (u.kpis?.contencion || 0);
      acc.nuevas += (u.kpis?.colocacion?.nuevas || 0);
      acc.renovadas += (u.kpis?.colocacion?.renovaciones || 0);
      acc.pagahorros += (u.kpis?.pagahorros || 0);
      acc.cuentas += (u.kpis?.cuentas_ahorro || 0);
      acc.rodBase += (u.kpis?.rodamientos?.base || 0);
      acc.rodRecup += (u.kpis?.rodamientos?.recuperado || 0);
      return acc;
    }, { contencion: 0, nuevas: 0, renovadas: 0, pagahorros: 0, cuentas: 0, rodBase: 0, rodRecup: 0 });

    const oStats = {
      avgContencion: users.length > 0 ? totals.contencion / users.length : 0,
      totalColocacion: totals.nuevas + totals.renovadas,
      ...totals
    };

    return { topUser: tUser, officeStats: oStats };
  }, [users]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="mb-10 relative z-10 md:flex md:items-center md:justify-between">
        <div className="mb-6 md:mb-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(245,158,11,1)]" />
            <h2 className="text-amber-500/80 font-black text-[11px] uppercase tracking-[0.4em]">Panel Central</h2>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter drop-shadow-lg">RALLY <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600">COMERCIAL</span></h1>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 md:items-center">
          <div className="bg-gradient-to-br from-zinc-900/80 to-amber-950/20 rounded-2xl p-5 border border-amber-500/20 backdrop-blur-xl shadow-lg md:min-w-[250px]">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-amber-500" />
                <span className="font-mono text-zinc-300 font-bold text-[11px] uppercase tracking-widest">Tiempo Días</span>
              </div>
              <span className="text-amber-400 font-mono text-sm font-black drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]">[{currentDay}/{daysInMonth}]</span>
            </div>
            <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden border border-zinc-800">
              <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 relative" style={{ width: `${monthProgress}%` }}>
                 <div className="absolute right-0 top-0 w-4 h-full bg-white/50 blur-[2px]"></div>
              </div>
            </div>
          </div>

          <button onClick={openManagerPanel} className="relative z-10 bg-gradient-to-b from-amber-900/40 to-black text-white rounded-2xl p-5 flex items-center justify-between shadow-[0_10px_30px_rgba(245,158,11,0.1)] active:scale-95 transition-all border border-amber-500/30 hover:border-amber-400 group md:min-w-[220px]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center group-hover:bg-amber-500/20 transition-colors relative overflow-hidden">
                <Power size={22} className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              </div>
              <div className="text-left">
                 <h3 className="font-black text-sm uppercase tracking-[0.2em] text-white">Dir. Deportiva</h3>
                 <p className="text-[9px] font-mono text-amber-500/70 uppercase tracking-widest mt-1">Setup General</p>
              </div>
            </div>
            <Lock size={16} className="text-amber-500/50 group-hover:text-amber-400 transition-colors" />
          </button>
        </div>
      </header>

      {/* TELEMETRÍA DE OFICINA (COLORES PASTEL NEÓN) */}
      <div className="relative z-10 bg-black/40 rounded-[2.5rem] p-6 md:p-8 border border-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden mb-8 group">
        <h3 className="text-white font-black text-lg md:text-xl tracking-widest uppercase mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
          <Activity className="text-amber-500" /> Rendimiento de Oficina
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          
          {/* AZUL PASTEL: Contención */}
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-400/30 rounded-2xl p-5 flex flex-col justify-between shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:border-blue-400/50 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/20 blur-[20px] rounded-full" />
            <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest block mb-4 flex items-center gap-1.5"><ShieldCheck size={12}/> Prom. Contención</span>
            <div className="mt-auto">
              <div className="flex justify-between items-end mb-1.5">
                 <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Global</span>
                 <span className="text-3xl font-black text-blue-100 font-mono drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]">{officeStats.avgContencion.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-blue-950/50 rounded-full h-1.5 mt-2 border border-blue-900/30 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.8)]" style={{ width: `${Math.min(officeStats.avgContencion, 100)}%` }} />
              </div>
            </div>
          </div>

          {/* VERDE PASTEL: Colocación */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-400/30 rounded-2xl p-5 flex flex-col justify-between shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:border-emerald-400/50 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/20 blur-[20px] rounded-full" />
            <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest block mb-3 flex items-center gap-1.5"><Target size={12}/> Colocación</span>
            <div className="grid grid-cols-2 gap-2 mb-3 mt-auto">
              <div>
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">Nuevas</span>
                <span className="text-xl font-black text-white font-mono">{officeStats.nuevas}</span>
              </div>
              <div className="text-right">
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block">Renov.</span>
                <span className="text-xl font-black text-white font-mono">{officeStats.renovadas}</span>
              </div>
            </div>
            <div className="border-t border-emerald-500/20 pt-2 flex justify-between items-center">
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Total</span>
              <span className="text-2xl font-black text-emerald-300 font-mono drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">{officeStats.totalColocacion}</span>
            </div>
          </div>

          {/* MORADO PASTEL: Ahorro */}
          <div className="bg-gradient-to-br from-fuchsia-500/10 to-purple-500/5 border border-fuchsia-400/30 rounded-2xl p-5 flex flex-col justify-between shadow-[0_0_15px_rgba(217,70,239,0.15)] hover:border-fuchsia-400/50 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-fuchsia-500/20 blur-[20px] rounded-full" />
            <span className="text-[10px] text-fuchsia-400 font-black uppercase tracking-widest block mb-3 flex items-center gap-1.5"><PiggyBank size={12}/> Retención</span>
            <div className="space-y-3 mt-auto">
              <div className="flex justify-between items-end">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Pagahorros</span>
                <span className="text-2xl font-black text-fuchsia-100 font-mono drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]">{officeStats.pagahorros}</span>
              </div>
              <div className="flex justify-between items-end border-t border-fuchsia-500/20 pt-2">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Cuentas Ah.</span>
                <span className="text-xl font-black text-fuchsia-300 font-mono">{officeStats.cuentas}</span>
              </div>
            </div>
          </div>

          {/* NARANJA PASTEL: Rodamientos */}
          <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-400/30 rounded-2xl p-5 flex flex-col justify-between shadow-[0_0_15px_rgba(249,115,22,0.15)] hover:border-orange-400/50 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/20 blur-[20px] rounded-full" />
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] text-orange-400 font-black uppercase tracking-widest flex items-center gap-1.5"><TrendingUp size={12}/> Rodamientos</span>
              <span className="text-[10px] font-black text-amber-400 font-mono drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]">
                {officeStats.rodBase > 0 ? ((officeStats.rodRecup / officeStats.rodBase) * 100).toFixed(1) : 0}%
              </span>
            </div>
            
            <div className="space-y-2 mb-2 mt-auto">
              <div className="flex justify-between items-end">
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">Base</span>
                <span className="text-xs font-black text-zinc-200 font-mono">{formatCurrency(officeStats.rodBase)}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider">Recuperado</span>
                <span className="text-xs font-black text-emerald-400 font-mono">{formatCurrency(officeStats.rodRecup)}</span>
              </div>
            </div>

            <div className="border-t border-orange-500/20 pt-2 mt-1">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Falta</span>
                <span className="text-sm font-black text-red-400 font-mono drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]">
                  {formatCurrency(Math.max(0, officeStats.rodBase - officeStats.rodRecup))}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* LÍDER INDIVIDUAL (CON MÉTRICAS COLOREADAS) */}
      {topUser ? (
        <div className="relative z-10 bg-white/5 rounded-[2.5rem] p-8 md:p-10 border border-white/10 backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden mt-8">
           <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_20px_rgba(245,158,11,0.8)]" />
           <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
           
           <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-8">
             <div className="flex flex-col justify-center">
               <div className="flex items-center space-x-3 mb-4">
                 <div className="inline-flex items-center space-x-1.5 bg-amber-500/20 border border-amber-500/50 rounded-full px-4 py-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                   <Trophy size={14} className="text-amber-400" />
                   <span className="text-amber-400 text-[10px] font-black uppercase tracking-[0.2em]">P1 / Líder Actual</span>
                 </div>
               </div>
               <h3 className="text-white text-4xl md:text-5xl font-black mb-2 tracking-tight drop-shadow-lg uppercase">{topUser.name}</h3>
               <div className="flex items-center gap-3 mt-2 bg-black/40 w-fit px-4 py-2 rounded-xl border border-white/5">
                 <Zap size={20} className="text-amber-500 animate-pulse" fill="currentColor" />
                 <p className="text-amber-400 font-mono text-2xl font-black drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]">
                   {formatNumber(topUser.score)} <span className="text-xs text-zinc-400 uppercase tracking-widest">Puntos</span>
                 </p>
               </div>
             </div>
             <div className="flex-shrink-0">
               <Kart3D user={topUser} className="w-28 h-28 md:w-36 md:h-36" emojiSize="text-6xl" isFloating={true} />
             </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <MetricCard title="Contención Global" value={topUser.kpis?.contencion} meta={METAS.contencion} type="percent" theme="blue" />
              <MetricCard title="Pagahorros Semanal" value={topUser.kpis?.pagahorros} meta={METAS.pagahorros} theme="purple" />
              
              <div className="bg-gradient-to-br from-fuchsia-900/20 to-purple-900/10 p-5 rounded-2xl border border-fuchsia-400/30 backdrop-blur-xl flex flex-col justify-center items-center shadow-[0_0_15px_rgba(217,70,239,0.1)] hover:border-fuchsia-400/50 transition-colors">
                <span className="text-fuchsia-300 text-[10px] uppercase tracking-widest font-black mb-3 block w-full text-center">Apertura Cuentas Ahorro</span>
                <CuentasAhorroStars value={topUser.kpis?.cuentas_ahorro} meta={METAS.cuentas_ahorro} activeColor="text-fuchsia-400 fill-fuchsia-400" glow="drop-shadow-[0_0_15px_rgba(217,70,239,0.8)]" />
                <span className="text-[9px] font-mono text-fuchsia-400/70 font-bold mt-3">OBJETIVO: {METAS.cuentas_ahorro} UND</span>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-900/20 to-teal-900/10 p-5 rounded-2xl border border-emerald-400/30 backdrop-blur-xl flex flex-col justify-center shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:border-emerald-400/50 transition-colors">
                 <span className="text-emerald-300 text-[10px] uppercase tracking-widest font-black mb-3 block">Matriz de Colocación</span>
                 <div className="flex justify-between items-center mb-2 border-b border-emerald-500/20 pb-2">
                   <div>
                     <span className="text-emerald-50 font-mono text-2xl font-black drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]">{topUser.kpis?.colocacion?.nuevas || 0}</span>
                     <span className="text-emerald-400 font-mono text-[9px] ml-2 tracking-widest font-bold">NUEVAS</span>
                   </div>
                   <span className="text-[9px] font-mono text-emerald-500/70 font-bold">M: {METAS.colocacion_nuevas}</span>
                 </div>
                 <div className="flex justify-between items-center pt-1">
                   <div>
                     <span className="text-emerald-300 font-mono text-xl font-black drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">{(topUser.kpis?.colocacion?.nuevas || 0) + (topUser.kpis?.colocacion?.renovaciones || 0)}</span>
                     <span className="text-emerald-500/70 font-mono text-[9px] ml-2 tracking-widest font-bold">TOTAL</span>
                   </div>
                   <span className="text-[9px] font-mono text-emerald-500/70 font-bold">M: {METAS.colocacion_total}</span>
                 </div>
             </div>
           </div>
        </div>
      ) : (
        <div className="bg-zinc-900/60 backdrop-blur-xl rounded-3xl p-10 text-center border border-amber-500/20 mt-12 shadow-2xl">
           <h3 className="font-mono text-amber-500 font-bold text-sm tracking-widest uppercase">Esperando Telemetría de Pilotos...</h3>
        </div>
      )}
    </div>
  );
};

const Pits = ({ users, updateUserKpis }: any) => {
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const user = users.find((u: any) => u.id === selectedUserId) || users[0];
  const [formData, setFormData] = useState({ kpis: user?.kpis, preventiva: user?.preventiva });

  useEffect(() => {
    if (users.length > 0 && !users.find((u: any) => u.id === selectedUserId)) setSelectedUserId(users[0].id);
  }, [users, selectedUserId]);

  useEffect(() => {
    if (user) setFormData({ kpis: { ...user.kpis }, preventiva: { ...user.preventiva } });
  }, [selectedUserId, user]);

  if (users.length === 0) return <div className="p-12 text-center text-amber-500 font-mono font-bold mt-12 bg-black/40 rounded-3xl border border-white/5">SIN PILOTOS.</div>;

  const handleInputChange = (category: string, field: string, subfield: string | null, value: any) => {
    if (!isUnlocked) return; 
    const finalValue = typeof value === 'boolean' ? value : (value === '' ? 0 : Number(value));
    setFormData((prev: any) => {
      const updated = { ...prev };
      if (subfield) updated[category] = { ...updated[category], [field]: { ...updated[category][field], [subfield]: finalValue } };
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
    <div className="pb-40 pt-8 px-4 md:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col relative max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-8 border-b border-amber-500/20 pb-6">
        <div>
          <h2 className="text-amber-500 font-bold text-[10px] uppercase tracking-[0.4em] mb-2 drop-shadow-md">Carga de Datos Manual</h2>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase drop-shadow-lg">PITS ENTRY</h1>
        </div>
        <button onClick={() => setIsUnlocked(!isUnlocked)} className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest border transition-all shadow-lg ${isUnlocked ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-amber-500/20' : 'bg-black text-zinc-500 border-zinc-800'}`}>
           {isUnlocked ? <><Unlock size={14} /><span>Módulo Abierto</span></> : <><Lock size={14} /><span>Bloqueado</span></>}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        <div className="lg:w-1/3 flex overflow-x-auto lg:overflow-visible lg:grid lg:grid-cols-2 gap-4 pb-4 lg:pb-0 hide-scrollbar snap-x">
          {users.map((u: any) => (
            <button key={u.id} onClick={() => setSelectedUserId(u.id)} className={`snap-center flex-shrink-0 relative w-24 lg:w-full py-4 rounded-2xl border transition-all duration-300 ${selectedUserId === u.id ? 'bg-gradient-to-b from-zinc-900 to-amber-950/40 border-amber-500 shadow-[0_10px_20px_rgba(245,158,11,0.2)] scale-105 lg:scale-100' : 'bg-black/50 border-zinc-800/80 opacity-60 hover:opacity-100 hover:bg-zinc-900'}`}>
              <div className="flex flex-col lg:flex-row items-center lg:px-4 gap-3">
                <div className={`transition-transform ${selectedUserId === u.id ? 'scale-110 lg:scale-100' : ''}`}>
                  <Kart3D user={u} className="w-12 h-12 lg:w-10 lg:h-10" emojiSize="text-xl" isFloating={false} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest mt-2 lg:mt-0 ${selectedUserId === u.id ? 'text-amber-400 drop-shadow-md' : 'text-zinc-500'}`}>{u.name}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="lg:w-2/3 relative">
          <div className={`w-full bg-gradient-to-br from-black/80 to-zinc-900/60 backdrop-blur-2xl rounded-[2.5rem] p-6 md:p-10 border transition-all duration-500 shadow-[0_20px_60px_rgba(0,0,0,0.6)] ${isUnlocked ? 'border-amber-500/50 shadow-amber-500/10' : 'border-zinc-800/80'}`}>
            {!isUnlocked && (
              <div className="absolute inset-0 z-20 backdrop-blur-xl bg-black/80 rounded-[2.5rem] flex flex-col items-center justify-center p-8 border border-zinc-800/50">
                 <Lock size={48} className="text-zinc-700 mb-6" strokeWidth={1} />
                 <p className="text-[11px] font-mono font-bold text-zinc-500 tracking-[0.3em] uppercase text-center max-w-sm leading-relaxed">Módulo de inyección bloqueado. Requiere desbloqueo superior para alterar telemetría.</p>
              </div>
            )}

            <div className="space-y-8">
              <div className="bg-amber-950/10 p-6 rounded-2xl border border-amber-500/20 shadow-inner">
                 <span className="text-amber-500 text-[10px] uppercase tracking-widest font-black mb-5 block flex items-center gap-2"><CheckCircle size={14}/> Requisitos de Arranque</span>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="flex justify-between items-center bg-black/40 px-4 py-3 rounded-xl border border-white/5">
                     <span className="text-[11px] font-mono font-bold text-zinc-300 uppercase">Preventiva Call</span>
                     <button onClick={() => handleInputChange('preventiva', 'realizada', null, !formData.preventiva?.realizada)} className={`w-14 h-7 rounded-full border transition-all relative ${formData.preventiva?.realizada ? 'bg-amber-500/20 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-black border-zinc-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-transform duration-300 ${formData.preventiva?.realizada ? 'bg-amber-400 left-8' : 'bg-zinc-600 left-1'}`} />
                     </button>
                   </div>
                   <div className="flex justify-between items-center bg-black/40 px-4 py-3 rounded-xl border border-white/5">
                     <span className="text-[11px] font-mono font-bold text-zinc-300 uppercase">Agenda Set</span>
                     <button onClick={() => handleInputChange('preventiva', 'agenda', null, !formData.preventiva?.agenda)} className={`w-14 h-7 rounded-full border transition-all relative ${formData.preventiva?.agenda ? 'bg-amber-500/20 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-black border-zinc-700'}`}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full transition-transform duration-300 ${formData.preventiva?.agenda ? 'bg-amber-400 left-8' : 'bg-zinc-600 left-1'}`} />
                     </button>
                   </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black/40 p-5 rounded-2xl border border-zinc-800/80">
                  <label className="text-[10px] font-black text-amber-500/70 uppercase tracking-[0.2em] mb-2 block">Contención (%)</label>
                  <input type="number" value={formData.kpis?.contencion === 0 ? '' : formData.kpis?.contencion} onChange={e => handleInputChange('kpis', 'contencion', null, e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white text-xl font-mono font-black outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner" placeholder="0" />
                </div>
                <div className="bg-black/40 p-5 rounded-2xl border border-zinc-800/80">
                  <label className="text-[10px] font-black text-amber-500/70 uppercase tracking-[0.2em] mb-2 block">Cuentas Ahorro</label>
                  <input type="number" value={formData.kpis?.cuentas_ahorro === 0 ? '' : formData.kpis?.cuentas_ahorro} onChange={e => handleInputChange('kpis', 'cuentas_ahorro', null, e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white text-xl font-mono font-black outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner" placeholder="0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 bg-black/40 p-5 rounded-2xl border border-zinc-800/80">
                <div className="col-span-2"><span className="text-[10px] font-black text-amber-500/70 uppercase tracking-[0.2em]">Colocación</span></div>
                <div>
                  <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Nuevas</label>
                  <input type="number" value={formData.kpis?.colocacion?.nuevas === 0 ? '' : formData.kpis?.colocacion?.nuevas} onChange={e => handleInputChange('kpis', 'colocacion', 'nuevas', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white text-lg font-mono font-black outline-none focus:border-amber-500 transition-all" placeholder="0" />
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Renovadas</label>
                  <input type="number" value={formData.kpis?.colocacion?.renovaciones === 0 ? '' : formData.kpis?.colocacion?.renovaciones} onChange={e => handleInputChange('kpis', 'colocacion', 'renovaciones', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white text-lg font-mono font-black outline-none focus:border-amber-500 transition-all" placeholder="0" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/40 p-5 rounded-2xl border border-zinc-800/80">
                <div className="col-span-1 md:col-span-2"><span className="text-[10px] font-black text-amber-500/70 uppercase tracking-[0.2em]">Recuperación & Pagos</span></div>
                <div>
                  <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Rodamientos (Base)</label>
                  <FormattedNumberInput value={formData.kpis?.rodamientos?.base} onChange={(val: any) => handleInputChange('kpis', 'rodamientos', 'base', val)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-amber-400 text-lg font-mono font-black outline-none focus:border-amber-500 transition-all" placeholder="$0" />
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Rodamientos (Recup.)</label>
                  <FormattedNumberInput value={formData.kpis?.rodamientos?.recuperado} onChange={(val: any) => handleInputChange('kpis', 'rodamientos', 'recuperado', val)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-emerald-400 text-lg font-mono font-black outline-none focus:border-emerald-500 transition-all" placeholder="$0" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Pagahorros</label>
                  <input type="number" value={formData.kpis?.pagahorros === 0 ? '' : formData.kpis?.pagahorros} onChange={e => handleInputChange('kpis', 'pagahorros', null, e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white text-lg font-mono font-black outline-none focus:border-amber-500 transition-all" placeholder="0" />
                </div>
              </div>
            </div>

            <button 
              onClick={handleSave} 
              disabled={isSaving || saveSuccess || !isUnlocked}
              className={`w-full mt-10 font-black uppercase tracking-[0.3em] text-xs py-5 rounded-xl active:scale-95 transition-all duration-300 flex justify-center items-center gap-3 border ${
                saveSuccess
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : isSaving
                  ? 'bg-amber-900/30 text-amber-600 border-amber-900 cursor-not-allowed'
                  : 'bg-amber-500 text-black border-amber-400 shadow-[0_10px_30px_rgba(245,158,11,0.3)] hover:bg-amber-400 hover:shadow-[0_10px_40px_rgba(245,158,11,0.5)]'
              }`}
            >
              {saveSuccess ? (
                <><CheckCircle size={20} /> ¡TELEMETRÍA ACTUALIZADA!</>
              ) : isSaving ? (
                <><RefreshCw size={20} className="animate-spin" /> PROCESANDO CONEXIÓN...</>
              ) : (
                <><Save size={20} /> INYECTAR DATOS EN SERVIDOR</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Ranking = memo(({ users }: any) => {
  if (users.length === 0) return <div className="p-12 text-center text-amber-500 font-mono font-bold mt-12 bg-black/40 rounded-3xl border border-white/5">SIN PILOTOS.</div>;
  const sorted = [...users].sort((a: any, b: any) => b.score - a.score);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  
  const podiumUsers = [top3[1], top3[0], top3[2]];

  return (
    <div className="pb-32 pt-8 px-4 md:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-16 border-b border-amber-500/20 pb-6 text-center md:text-left">
        <div className="w-full md:w-auto">
          <h2 className="text-amber-500 font-bold text-[10px] uppercase tracking-[0.4em] mb-2 drop-shadow-md">Clasificación Global</h2>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase drop-shadow-lg">PODIO DE HONOR</h1>
        </div>
      </div>

      <div className="flex items-end justify-center h-64 md:h-80 mb-20 space-x-2 md:space-x-6">
        {podiumUsers.map((u, i) => {
          if (!u) return null;
          const isGold = i === 1; const isSilver = i === 0; const isBronze = i === 2;
          const height = isGold ? 'h-56 md:h-72' : isSilver ? 'h-40 md:h-56' : 'h-32 md:h-44';
          const bg = isGold ? 'bg-gradient-to-t from-black via-amber-950/40 to-amber-500/20 border-t-amber-400 shadow-[0_-10px_40px_rgba(245,158,11,0.3)]' 
                   : isSilver ? 'bg-gradient-to-t from-black via-zinc-900/60 to-zinc-400/20 border-t-zinc-300 shadow-[0_-5px_20px_rgba(212,212,216,0.2)]'
                   : 'bg-gradient-to-t from-black via-orange-950/40 to-orange-600/20 border-t-orange-500 shadow-[0_-5px_20px_rgba(249,115,22,0.2)]';
          const rank = isGold ? 1 : isSilver ? 2 : 3;

          return (
            <div key={u.id} className={`relative w-28 md:w-40 ${height} ${bg} rounded-t-2xl flex flex-col items-center justify-end pb-6 border-t-4 border-l border-r border-white/5 backdrop-blur-sm transition-all duration-500 hover:scale-105`}>
              <div className="absolute bottom-full mb-6 w-full flex justify-center drop-shadow-[0_15px_15px_rgba(0,0,0,0.8)]">
                <Kart3D user={u} className={isGold ? 'w-28 h-28 md:w-36 md:h-36' : 'w-20 h-20 md:w-24 md:h-24'} emojiSize={isGold ? "text-6xl" : "text-4xl"} isFloating={isGold} />
              </div>
              <span className={`font-black text-6xl md:text-8xl absolute top-4 select-none opacity-20 drop-shadow-xl ${isGold ? 'text-amber-400' : isSilver ? 'text-zinc-200' : 'text-orange-500'}`}>{rank}</span>
              <span className="text-white font-black text-xs md:text-sm uppercase tracking-widest truncate w-full text-center px-2 drop-shadow-md">{u.name}</span>
              <span className={`font-mono text-[9px] md:text-[10px] font-bold mt-1 ${isGold ? 'text-amber-400' : isSilver ? 'text-zinc-400' : 'text-orange-400'}`}>{formatNumber(u.score)} PTS</span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {rest.map((u: any, i) => {
          const league = getLeague(u.score);
          return (
            <div key={u.id} className="bg-black/60 backdrop-blur-xl rounded-[2rem] p-5 flex items-center justify-between border border-amber-500/10 hover:border-amber-500/40 hover:bg-zinc-900/60 transition-all shadow-lg group">
              <div className="flex items-center space-x-5">
                <span className="text-zinc-600 font-mono font-black text-lg w-8 text-center group-hover:text-amber-500 transition-colors">#{i + 4}</span>
                <Kart3D user={u} className="w-14 h-14" emojiSize="text-2xl" isFloating={false} />
                <div className="flex flex-col">
                  <span className="font-black text-white text-sm uppercase tracking-widest">{u.name}</span>
                  <span className={`text-[9px] font-mono font-bold uppercase tracking-[0.2em] mt-1 ${league.text}`}>{league.name}</span>
                </div>
              </div>
              <span className="font-mono font-black text-amber-500 text-lg drop-shadow-[0_0_5px_rgba(245,158,11,0.4)]">{formatNumber(u.score)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// NUEVO GARAGE: COLORES PASTEL NEÓN SEMÁNTICOS
const Garage = memo(({ users }: any) => {
  if (users.length === 0) return <div className="p-12 text-center text-amber-500 font-mono font-bold mt-12 bg-black/40 rounded-3xl border border-white/5">SIN PILOTOS.</div>;
  return (
    <div className="pb-32 pt-8 px-4 md:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-10 border-b border-zinc-800 pb-6 text-center md:text-left">
        <div className="w-full md:w-auto">
          <h2 className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.4em] mb-2 drop-shadow-md">Telemetría Desglosada</h2>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase drop-shadow-lg">GARAGE DATA</h1>
        </div>
      </div>

      <div className="space-y-12">
        {users.map((u: any) => {
          const totalCol = (u.kpis?.colocacion?.nuevas || 0) + (u.kpis?.colocacion?.renovaciones || 0);
          const faltaRodamientos = Math.max(0, (u.kpis?.rodamientos?.base || 0) - (u.kpis?.rodamientos?.recuperado || 0));
          const pRodamientos = u.kpis?.rodamientos?.base > 0 ? (u.kpis?.rodamientos?.recuperado / u.kpis?.rodamientos?.base) * 100 : 0;
          const pContencion = Math.min((u.kpis?.contencion / METAS.contencion) * 100, 100);
          const pNuevas = Math.min(((u.kpis?.colocacion?.nuevas || 0) / METAS.colocacion_nuevas) * 100, 100);
          const pPagahorros = Math.min(((u.kpis?.pagahorros || 0) / METAS.pagahorros) * 100, 100);

          return (
            <div key={u.id} className="bg-black/80 backdrop-blur-2xl rounded-[2.5rem] border border-zinc-800/80 shadow-[0_15px_40px_rgba(0,0,0,0.5)] overflow-hidden">
              
              {/* Cabecera del Piloto */}
              <div className="bg-gradient-to-r from-zinc-900 to-black p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 gap-4">
                <div className="flex items-center space-x-5">
                  <Kart3D user={u} className="w-16 h-16 md:w-20 md:h-20" emojiSize="text-3xl" isFloating={false} />
                  <div>
                    <h3 className="font-black text-white text-2xl tracking-widest uppercase drop-shadow-md">{u.name}</h3>
                    <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg mt-2 inline-flex items-center gap-2">
                      <Zap size={14} className="text-amber-500" />
                      <span className="text-[11px] font-mono font-black text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]">{formatNumber(u.score)} PTS</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Grid de Colores Semánticos Pastel */}
              <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* AZUL PASTEL: Contención */}
                <div className="bg-gradient-to-br from-blue-900/30 to-blue-950/10 border border-blue-400/30 rounded-[2rem] p-6 shadow-inner relative overflow-hidden group hover:border-blue-400/50 transition-colors">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[40px] rounded-full pointer-events-none" />
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-blue-300 text-[10px] uppercase tracking-[0.2em] font-black flex items-center gap-2"><ShieldCheck size={14}/> Contención</span>
                  </div>
                  <div className="flex items-end justify-between mb-3">
                    <span className="text-4xl font-black text-white font-mono drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">{u.kpis?.contencion}%</span>
                    <span className="text-blue-200/50 font-mono text-[10px] font-bold tracking-widest">TRGT: {METAS.contencion}%</span>
                  </div>
                  <div className="w-full bg-blue-950/50 rounded-full h-2 border border-blue-900/30 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.8)] relative" style={{ width: `${pContencion}%` }}>
                      <div className="absolute right-0 top-0 w-3 h-full bg-white rounded-full blur-[2px]"></div>
                    </div>
                  </div>
                </div>

                {/* VERDE PASTEL: Colocación */}
                <div className="bg-gradient-to-br from-emerald-900/30 to-teal-950/10 border border-emerald-400/30 rounded-[2rem] p-6 shadow-inner relative overflow-hidden group hover:border-emerald-400/50 transition-colors">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full pointer-events-none" />
                  <div className="flex justify-between items-start mb-6">
                     <span className="text-emerald-300 text-[10px] uppercase tracking-[0.2em] font-black flex items-center gap-2"><Target size={14}/> Colocación</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <span className="font-mono font-black text-white text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">{u.kpis?.colocacion?.nuevas || 0} <span className="text-[9px] text-emerald-200/50 uppercase tracking-widest">NUEVAS</span></span>
                      </div>
                      <div className="w-full bg-emerald-950/50 rounded-full h-1.5 border border-emerald-900/30 overflow-hidden">
                        <div className="bg-emerald-400 h-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" style={{width: `${pNuevas}%`}} />
                      </div>
                      <span className="text-[9px] font-mono font-bold text-emerald-400/70 mt-1 block">M: {METAS.colocacion_nuevas}</span>
                    </div>
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <span className="font-mono font-black text-emerald-300 text-2xl drop-shadow-[0_0_8px_rgba(110,231,183,0.5)]">{totalCol} <span className="text-[9px] text-emerald-200/50 uppercase tracking-widest">TOTAL</span></span>
                      </div>
                      <div className="w-full bg-emerald-950/50 rounded-full h-1.5 border border-emerald-900/30 overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" style={{width: `${Math.min((totalCol/METAS.colocacion_total)*100, 100)}%`}} />
                      </div>
                      <span className="text-[9px] font-mono font-bold text-emerald-400/70 mt-1 block">M: {METAS.colocacion_total}</span>
                    </div>
                  </div>
                </div>

                {/* MORADO PASTEL: Ahorro */}
                <div className="bg-gradient-to-br from-purple-900/30 to-fuchsia-950/10 border border-purple-400/30 rounded-[2rem] p-6 shadow-inner relative overflow-hidden group hover:border-purple-400/50 transition-colors">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[40px] rounded-full pointer-events-none" />
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-purple-300 text-[10px] uppercase tracking-[0.2em] font-black flex items-center gap-2"><PiggyBank size={14}/> Retención y Ahorro</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="w-1/2 pr-4 border-r border-purple-400/20">
                      <span className="text-[10px] text-purple-200/50 font-black tracking-widest uppercase block mb-1">Pagahorros</span>
                      <span className="text-3xl font-black text-white font-mono block mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">{u.kpis?.pagahorros || 0}</span>
                      <div className="w-full bg-purple-950/50 rounded-full h-1.5 border border-purple-900/30 overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-500 to-fuchsia-400 h-full shadow-[0_0_10px_rgba(168,85,247,0.8)]" style={{width: `${pPagahorros}%`}} />
                      </div>
                      <span className="text-[9px] font-mono font-bold text-purple-400/70 mt-1 block">M: {METAS.pagahorros}</span>
                    </div>
                    <div className="w-1/2 pl-4 flex flex-col justify-center items-center relative z-10">
                      <span className="text-[10px] text-purple-200/50 font-black tracking-widest uppercase block mb-2">Cuentas Ah.</span>
                      <CuentasAhorroStars value={u.kpis?.cuentas_ahorro} meta={METAS.cuentas_ahorro} activeColor="text-fuchsia-300 fill-fuchsia-300" glow="drop-shadow-[0_0_15px_rgba(217,70,239,0.8)]" />
                    </div>
                  </div>
                </div>

                {/* NARANJA PASTEL: Rodamientos */}
                <div className="bg-gradient-to-br from-orange-900/30 to-red-950/10 border border-orange-400/30 rounded-[2rem] p-6 shadow-inner relative overflow-hidden group hover:border-orange-400/50 transition-colors">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[40px] rounded-full pointer-events-none" />
                   <div className="flex justify-between items-start mb-6">
                     <span className="text-orange-300 text-[10px] uppercase tracking-[0.2em] font-black flex items-center gap-2"><TrendingUp size={14}/> Recuperación</span>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-y-4 gap-x-4 mb-4 relative z-10">
                     <div>
                       <span className="text-[9px] font-mono font-bold text-orange-200/50 uppercase tracking-widest block mb-1">Base</span>
                       <span className="text-sm font-black text-white drop-shadow-md font-mono">{formatCurrency(u.kpis?.rodamientos?.base)}</span>
                     </div>
                     <div className="text-right">
                       <span className="text-[9px] font-mono font-bold text-orange-200/50 uppercase tracking-widest block mb-1">Efectividad</span>
                       <span className="text-xl font-black text-orange-300 font-mono drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]">
                         {pRodamientos.toFixed(1)}%
                       </span>
                     </div>
                     <div>
                       <span className="text-[9px] font-mono font-bold text-orange-200/50 uppercase tracking-widest block mb-1">Recuperado</span>
                       <span className="text-sm font-black text-white drop-shadow-md font-mono">{formatCurrency(u.kpis?.rodamientos?.recuperado)}</span>
                     </div>
                     <div className="text-right">
                       <span className="text-[9px] font-mono font-bold text-red-400/70 uppercase tracking-widest block mb-1">Falta</span>
                       <span className="text-sm font-black text-red-300 font-mono">{formatCurrency(faltaRodamientos)}</span>
                     </div>
                   </div>

                   <div className="w-full bg-orange-950/40 h-2 overflow-hidden border border-orange-900/30 rounded-full mt-2 relative z-10">
                     <div className="bg-gradient-to-r from-red-600 to-orange-400 h-full shadow-[0_0_10px_rgba(249,115,22,0.8)] rounded-full transition-all duration-1000 relative" style={{width: `${Math.min(pRodamientos, 100)}%`}}>
                        <div className="absolute right-0 top-0 w-3 h-full bg-white rounded-full blur-[2px]"></div>
                     </div>
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
const ManagerPanel = memo(({ users, onClose, onBulkSave, globalSettings, onUpdateSettings, onAddUser, onDeleteUser, onRenameUser, onUpdateAvatar }: any) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [tab, setTab] = useState('data'); 
  const [draftUsers, setDraftUsers] = useState(() => JSON.parse(JSON.stringify(users)));
  const [draftSettings, setDraftSettings] = useState(() => globalSettings || { cut1: 10, cut2: 20, cut3: 30 });

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
      setPinError(true); setPinInput('');
      if (pinInputRef.current) pinInputRef.current.focus();
    }
  };

  const handleDraftChange = (userId: string, fieldPath: string[], value: any) => {
    setDraftUsers((prev: any) => prev.map((u: any) => {
      if (u.id !== userId) return u;
      let newUser = { ...u };
      let current: any = newUser;
      for (let i = 0; i < fieldPath.length - 1; i++) {
        current = current[fieldPath[i]];
      }
      current[fieldPath[fieldPath.length - 1]] = value;
      return newUser;
    }));
  };

  const handleSave = () => {
    if (tab === 'data' || tab === 'points') {
      onBulkSave(draftUsers);
    } else if (tab === 'config') {
      onUpdateSettings(draftSettings);
      alert("CORTES ACTUALIZADOS CON ÉXITO.");
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
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        }
        if(ctx) {
          canvas.width = width; canvas.height = height;
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/95 backdrop-blur-2xl p-6 animate-in fade-in duration-300">
        <div className="bg-black border border-amber-500/20 p-10 rounded-[2.5rem] w-full max-w-sm relative shadow-[0_0_80px_rgba(245,158,11,0.15)] overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 to-amber-400" />
          <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-amber-500 transition-colors bg-zinc-900/50 p-2 rounded-full">
            <X size={20} />
          </button>
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Lock className="text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" size={40} strokeWidth={1.5} />
            </div>
          </div>
          <h2 className="text-white text-center text-[11px] uppercase tracking-[0.4em] font-black font-mono mb-8 drop-shadow-md">System Auth Required</h2>
          <div className="flex flex-col gap-6">
            <div className="relative">
              <input 
                ref={pinInputRef} type="password" inputMode="numeric" maxLength={4} value={pinInput}
                onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, '')); setPinError(false); }}
                onKeyDown={(e) => e.key === 'Enter' && submitPin()}
                className={`w-full text-center text-4xl p-5 bg-zinc-950 text-amber-400 font-mono font-black outline-none border-2 transition-all rounded-2xl shadow-inner ${pinError ? 'border-red-500/50 bg-red-950/10 shadow-[0_0_15px_rgba(220,38,38,0.2)]' : 'border-zinc-800 focus:border-amber-500/50 focus:shadow-[0_0_20px_rgba(245,158,11,0.1)]'}`}
                placeholder="••••"
              />
              {pinError && <p className="absolute -bottom-6 w-full text-red-500 text-[9px] font-black font-mono uppercase tracking-widest text-center animate-pulse">AUTH_FAILED // RE-ENTER</p>}
            </div>
            <button onClick={submitPin} className="mt-2 bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black uppercase tracking-[0.3em] text-xs py-5 rounded-xl transition-all shadow-[0_10px_20px_rgba(245,158,11,0.3)] active:scale-95 border border-amber-400">
              Initialize Access
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#050505] flex flex-col p-4 md:p-8 animate-in fade-in duration-300">
      <header className="flex flex-col md:flex-row md:justify-between md:items-start mb-6 bg-black/60 backdrop-blur-xl p-5 md:p-6 rounded-[2rem] border border-amber-500/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] shrink-0 gap-4">
        <div className="w-full md:w-auto overflow-hidden">
          <div className="flex items-center justify-between mb-4 md:mb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-amber-500" />
              <h2 className="text-xl font-black text-white tracking-widest uppercase">Dir. Deportiva</h2>
            </div>
            <button onClick={onClose} className="md:hidden bg-red-950/30 border border-red-900 text-red-500 p-2 rounded-xl hover:bg-red-900 hover:text-white transition-colors"><X size={16}/></button>
          </div>
          <div className="flex overflow-x-auto hide-scrollbar gap-2 md:gap-3 pb-2 w-full snap-x">
            <button onClick={() => setTab('data')} className={`snap-start whitespace-nowrap flex-shrink-0 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all ${tab === 'data' ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white'}`}>Telemetría</button>
            <button onClick={() => setTab('roster')} className={`snap-start whitespace-nowrap flex-shrink-0 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all ${tab === 'roster' ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white'}`}>Escudería</button>
            <button onClick={() => setTab('points')} className={`snap-start whitespace-nowrap flex-shrink-0 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all ${tab === 'points' ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white'}`}>Premios/Multas</button>
            <button onClick={() => setTab('config')} className={`snap-start whitespace-nowrap flex-shrink-0 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all ${tab === 'config' ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white'}`}>Cortes</button>
          </div>
        </div>
        <button onClick={onClose} className="hidden md:flex bg-red-950/30 border border-red-900 hover:bg-red-900 text-red-500 hover:text-white px-6 py-3 rounded-xl text-[10px] uppercase tracking-[0.2em] font-black transition-colors w-full md:w-auto items-center justify-center gap-2 mt-2 md:mt-0">
          <Power size={14} /> Cerrar Panel
        </button>
      </header>

      {tab === 'data' ? (
        <div className="flex-1 overflow-auto min-h-0 bg-zinc-950/80 rounded-[2.5rem] shadow-2xl border border-white/5 mb-28 custom-scrollbar relative" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
            <thead className="sticky top-0 z-40 bg-zinc-900 shadow-md">
              <tr className="text-amber-500 text-[10px] uppercase tracking-widest font-black font-mono border-b border-zinc-800">
                <th className="p-5 sticky left-0 top-0 bg-zinc-900 z-50 border-r border-zinc-800">Piloto_ID</th>
                <th className="p-5 text-center">Status</th>
                <th className="p-5 text-center">Pre/Age</th>
                <th className="p-5 text-center">Contención</th>
                <th className="p-5 text-center">Nuevas</th>
                <th className="p-5 text-center">Renovadas</th>
                <th className="p-5 text-center">PagaAhorros</th>
                <th className="p-5 text-center">Cuentas</th>
                <th className="p-5 text-right">Base Rod. ($)</th>
                <th className="p-5 text-right">Recuperado ($)</th>
              </tr>
            </thead>
            <tbody className="text-xs font-mono">
              {draftUsers.map((user: any) => (
                <tr key={user.id} className="hover:bg-black transition-colors border-b border-zinc-900">
                  <td className="p-4 font-black text-white sticky left-0 z-10 bg-zinc-950 border-r border-zinc-800 shadow-[5px_0_15px_rgba(0,0,0,0.5)] uppercase tracking-wider">
                    {user.name}
                  </td>
                  
                  <td className="p-3">
                    <select 
                      value={user.status}
                      onChange={(e) => handleDraftChange(user.id, ['status'], e.target.value)}
                      className="w-full min-w-[120px] p-2.5 border border-zinc-800 rounded-lg text-[10px] font-black bg-black text-zinc-300 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 uppercase tracking-widest cursor-pointer"
                    >
                      <option value="active">🟢 ACTIVE_R</option>
                      <option value="pits">🟡 PITS_WTG</option>
                      <option value="penalty">🔴 PNLT_ERR</option>
                    </select>
                  </td>

                  <td className="p-3 flex gap-2 justify-center items-center h-full">
                    <button 
                      onClick={() => handleDraftChange(user.id, ['preventiva', 'realizada'], !user.preventiva.realizada)}
                      className={`p-2.5 rounded-lg transition-colors border shadow-inner ${user.preventiva.realizada ? 'bg-emerald-950/30 text-emerald-500 border-emerald-900/50' : 'bg-black text-zinc-700 border-zinc-800'}`}
                    >
                      <PhoneCall size={16} />
                    </button>
                    <button 
                      onClick={() => handleDraftChange(user.id, ['preventiva', 'agenda'], !user.preventiva.agenda)}
                      className={`p-2.5 rounded-lg transition-colors border shadow-inner ${user.preventiva.agenda ? 'bg-emerald-950/30 text-emerald-500 border-emerald-900/50' : 'bg-black text-zinc-700 border-zinc-800'}`}
                    >
                      <BookOpen size={16} />
                    </button>
                  </td>

                  <td className="p-3"><input type="number" value={user.kpis.contencion || ''} onChange={(e) => handleDraftChange(user.id, ['kpis', 'contencion'], Number(e.target.value))} className="w-24 mx-auto block p-3 border border-zinc-800 bg-black text-amber-400 font-black rounded-xl text-center outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all shadow-inner" /></td>
                  <td className="p-3"><input type="number" value={user.kpis.colocacion.nuevas || ''} onChange={(e) => handleDraftChange(user.id, ['kpis', 'colocacion', 'nuevas'], Number(e.target.value))} className="w-20 mx-auto block p-3 border border-zinc-800 bg-black text-amber-400 font-black rounded-xl text-center outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all shadow-inner" /></td>
                  <td className="p-3"><input type="number" value={user.kpis.colocacion.renovaciones || ''} onChange={(e) => handleDraftChange(user.id, ['kpis', 'colocacion', 'renovaciones'], Number(e.target.value))} className="w-20 mx-auto block p-3 border border-zinc-800 bg-black text-amber-400 font-black rounded-xl text-center outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all shadow-inner" /></td>
                  <td className="p-3"><input type="number" value={user.kpis.pagahorros || ''} onChange={(e) => handleDraftChange(user.id, ['kpis', 'pagahorros'], Number(e.target.value))} className="w-20 mx-auto block p-3 border border-zinc-800 bg-black text-amber-400 font-black rounded-xl text-center outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all shadow-inner" /></td>
                  <td className="p-3"><input type="number" value={user.kpis.cuentas_ahorro || ''} onChange={(e) => handleDraftChange(user.id, ['kpis', 'cuentas_ahorro'], Number(e.target.value))} className="w-20 mx-auto block p-3 border border-zinc-800 bg-black text-amber-400 font-black rounded-xl text-center outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all shadow-inner" /></td>
                  <td className="p-3"><FormattedNumberInput value={user.kpis.rodamientos.base} onChange={(val: any) => handleDraftChange(user.id, ['kpis', 'rodamientos', 'base'], val)} className="w-32 block ml-auto p-3 border border-zinc-800 bg-black text-amber-400 font-black rounded-xl text-right outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all shadow-inner" placeholder="0"/></td>
                  <td className="p-3"><FormattedNumberInput value={user.kpis.rodamientos.recuperado} onChange={(val: any) => handleDraftChange(user.id, ['kpis', 'rodamientos', 'recuperado'], val)} className="w-32 block ml-auto p-3 border border-zinc-800 bg-black text-emerald-400 font-black rounded-xl text-right outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all shadow-inner" placeholder="0"/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === 'roster' ? (
        <div className="flex-1 overflow-auto min-h-0 bg-zinc-950/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/5 mb-28 p-6 md:p-8 hide-scrollbar max-w-4xl mx-auto w-full">
           <h3 className="text-white font-black font-mono text-sm md:text-base mb-8 uppercase tracking-widest border-b border-zinc-800 pb-4 flex items-center gap-3"><Users size={20} className="text-amber-500"/> Gestión de Escudería</h3>
           
           <div className="mb-8 bg-black/60 p-4 border border-zinc-800 rounded-2xl flex gap-3 shadow-inner">
              <input type="text" value={newUserName} onChange={e=>setNewUserName(e.target.value)} placeholder="NUEVO PILOTO..." className="flex-1 bg-zinc-950 border border-zinc-800 px-4 py-3 text-xs font-black font-mono text-amber-500 outline-none uppercase focus:border-amber-500 rounded-xl transition-colors" />
              <button onClick={handleAddUser} disabled={!newUserName.trim()} className="bg-gradient-to-b from-amber-500 to-amber-600 text-black px-8 rounded-xl font-black disabled:opacity-50 transition-all active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center gap-2 uppercase tracking-widest text-[10px]"><UserPlus size={16}/> Reclutar</button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {users.map((u: any) => (
               <div key={u.id} className="flex items-center justify-between bg-black/40 p-4 md:p-5 border border-zinc-800/80 rounded-[2rem] shadow-sm hover:border-amber-500/30 transition-colors group">
                 <div className="flex items-center space-x-5 flex-1 min-w-0">
                   <div className="relative w-14 h-14 rounded-full bg-zinc-900 border-2 border-zinc-800 flex-shrink-0 group-hover:border-amber-500/50 transition-colors overflow-hidden shadow-lg">
                     {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" alt="avatar" /> : <span className="text-lg font-black font-mono text-zinc-600 flex items-center justify-center w-full h-full bg-zinc-950">{u.name.substring(0,1).toUpperCase()}</span>}
                     <label className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity backdrop-blur-sm">
                       <Camera size={20} className="text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,1)]" />
                       <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(u.id, e)} />
                     </label>
                   </div>
                   {editingId === u.id ? (
                     <input autoFocus value={editNameValue} onChange={e=>setEditNameValue(e.target.value)} onKeyDown={e=>e.key==='Enter' && handleSaveRename(u.id)} className="flex-1 min-w-0 bg-black border border-amber-500 px-3 py-2 text-sm font-black font-mono text-amber-500 uppercase rounded-xl outline-none shadow-inner" />
                   ) : (
                     <span className="font-black font-mono text-sm text-zinc-200 uppercase tracking-widest truncate">{u.name}</span>
                   )}
                 </div>
                 <div className="flex gap-2 pl-4">
                   {confirmDeleteId === u.id ? (
                     <>
                       <button onClick={() => onDeleteUser(u.id)} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-colors">CONFIRMAR</button>
                       <button onClick={() => setConfirmDeleteId(null)} className="text-zinc-400 p-2 hover:text-white bg-zinc-900 rounded-xl border border-zinc-800 transition-colors"><X size={18}/></button>
                     </>
                   ) : editingId === u.id ? (
                     <>
                       <button onClick={() => handleSaveRename(u.id)} className="text-emerald-500 bg-emerald-950/30 border border-emerald-900/50 p-2.5 rounded-xl hover:bg-emerald-900/50 transition-colors"><Check size={18}/></button>
                       <button onClick={() => setEditingId(null)} className="text-zinc-500 bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl hover:text-white transition-colors"><X size={18}/></button>
                     </>
                   ) : (
                     <>
                       <button onClick={() => {setEditingId(u.id); setEditNameValue(u.name);}} className="text-zinc-500 hover:text-amber-500 bg-black border border-zinc-800 p-2.5 rounded-xl transition-colors"><Edit2 size={18}/></button>
                       <button onClick={() => setConfirmDeleteId(u.id)} disabled={users.length <= 1} className="text-zinc-500 hover:text-red-500 bg-black border border-zinc-800 p-2.5 rounded-xl disabled:opacity-30 transition-colors"><Trash2 size={18}/></button>
                     </>
                   )}
                 </div>
               </div>
             ))}
           </div>
        </div>
      ) : tab === 'points' ? (
        <div className="flex-1 overflow-auto min-h-0 bg-zinc-950/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/5 mb-28 p-6 md:p-8 hide-scrollbar max-w-4xl mx-auto w-full">
           <h3 className="text-white font-black font-mono text-sm md:text-base mb-2 uppercase tracking-widest border-b border-zinc-800 pb-4 flex items-center gap-3"><Award size={20} className="text-amber-500"/> Reconocimientos y Castigos</h3>
           <p className="text-[11px] text-zinc-500 font-mono mb-8 bg-amber-950/10 p-4 rounded-xl border border-amber-500/10 shadow-inner">Añade puntos para premiar (ej: 5000) o negativos para penalizar (ej: -5000). El impacto es inmediato en el Score Global.</p>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {draftUsers.map((user: any) => (
               <div key={user.id} className="flex items-center justify-between bg-black/40 p-4 md:p-5 border border-zinc-800/80 rounded-[2rem] shadow-sm hover:border-amber-500/20 transition-colors">
                 <div className="flex items-center space-x-4 flex-1 min-w-0">
                   <Kart3D user={user} className="w-14 h-14 flex-shrink-0" emojiSize="text-2xl" isFloating={false} />
                   <span className="font-black font-mono text-sm text-zinc-200 uppercase tracking-widest truncate">{user.name}</span>
                 </div>
                 <div className="flex items-center gap-3 pl-4">
                    <span className="text-[9px] font-black font-mono text-zinc-600 uppercase tracking-widest text-right leading-tight">Puntos<br/>Extra</span>
                    <input 
                      type="number" 
                      value={user.extraPoints === 0 ? '' : user.extraPoints} 
                      onChange={(e) => handleDraftChange(user.id, ['extraPoints'], Number(e.target.value))} 
                      className={`w-28 md:w-32 bg-zinc-950 border-2 ${Number(user.extraPoints) < 0 ? 'border-red-900/50 text-red-500 focus:border-red-500' : 'border-zinc-800 text-amber-500 focus:border-amber-500/50'} text-right font-mono font-black text-lg py-3 px-4 rounded-xl outline-none transition-colors shadow-inner`}
                      placeholder="0"
                    />
                 </div>
               </div>
             ))}
           </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto min-h-0 bg-zinc-950/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/5 mb-28 p-6 md:p-8 hide-scrollbar max-w-2xl mx-auto w-full">
           <h3 className="text-white font-black font-mono text-sm md:text-base mb-8 uppercase tracking-widest border-b border-zinc-800 pb-4 flex items-center gap-3"><Settings size={20} className="text-amber-500"/> Configuración de Cortes</h3>
           
           <div className="space-y-6">
             <div className="flex flex-col md:flex-row md:items-center justify-between bg-black/40 p-6 md:p-8 border border-zinc-800/80 rounded-[2rem] gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <span className="text-white font-mono text-sm font-black uppercase tracking-widest">Corte 1</span>
                </div>
                <div className="flex items-center gap-4 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 font-mono text-[10px] font-bold uppercase tracking-widest pl-2">Día del mes:</span>
                  <input type="number" value={draftSettings.cut1} onChange={e => setDraftSettings({...draftSettings, cut1: Number(e.target.value)})} className="w-20 bg-black border-none text-amber-500 text-center font-mono font-black text-xl py-2 rounded-lg outline-none focus:ring-1 focus:ring-amber-500/50" />
                </div>
             </div>

             <div className="flex flex-col md:flex-row md:items-center justify-between bg-black/40 p-6 md:p-8 border border-zinc-800/80 rounded-[2rem] gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <span className="text-white font-mono text-sm font-black uppercase tracking-widest">Corte 2</span>
                </div>
                <div className="flex items-center gap-4 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 font-mono text-[10px] font-bold uppercase tracking-widest pl-2">Día del mes:</span>
                  <input type="number" value={draftSettings.cut2} onChange={e => setDraftSettings({...draftSettings, cut2: Number(e.target.value)})} className="w-20 bg-black border-none text-amber-500 text-center font-mono font-black text-xl py-2 rounded-lg outline-none focus:ring-1 focus:ring-amber-500/50" />
                </div>
             </div>

             <div className="flex flex-col md:flex-row md:items-center justify-between bg-black/40 p-6 md:p-8 border border-zinc-800/80 rounded-[2rem] gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                  <span className="text-white font-mono text-sm font-black uppercase tracking-widest">Cierre de Mes</span>
                </div>
                <div className="flex items-center gap-4 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 font-mono text-[10px] font-bold uppercase tracking-widest pl-2">Día del mes:</span>
                  <input type="number" value={draftSettings.cut3} onChange={e => setDraftSettings({...draftSettings, cut3: Number(e.target.value)})} className="w-20 bg-black border-none text-amber-500 text-center font-mono font-black text-xl py-2 rounded-lg outline-none focus:ring-1 focus:ring-amber-500/50" />
                </div>
             </div>
           </div>
        </div>
      )}

      <div className="fixed bottom-8 left-0 w-full px-4 flex justify-center z-50 pointer-events-none">
        <button 
          onClick={handleSave}
          className="pointer-events-auto bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black font-black text-xs uppercase tracking-[0.3em] py-5 px-16 rounded-[2rem] shadow-[0_15px_30px_rgba(245,158,11,0.3)] flex items-center gap-3 transition-all active:scale-95 border border-amber-300"
        >
          <Save size={20} strokeWidth={2.5} />
          {tab === 'data' || tab === 'points' ? 'INYECTAR OVERRIDE GLOBAL' : tab === 'config' ? 'GUARDAR CORTES' : 'CERRAR GESTIÓN'}
        </button>
      </div>
    </div>
  );
});

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showManagerPanel, setShowManagerPanel] = useState(false);
  const [users, setUsers] = useState(() => getUsersWithScores(INITIAL_USERS));
  const [globalSettings, setGlobalSettings] = useState({ cut1: 10, cut2: 20, cut3: 30 });
  const [isLoadingData, setIsLoadingData] = useState(true);

  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const monthProgress = (currentDay / daysInMonth) * 100;

  useEffect(() => {
    const initAuth = async () => { try { await signInAnonymously(auth); } catch (err) {} };
    initAuth();
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = collection(db, COLL_PATH);
        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          if (snapshot.empty) { INITIAL_USERS.forEach(u => { setDoc(doc(db, COLL_PATH, u.id), u); }); } 
          else { setUsers(getUsersWithScores(snapshot.docs.map(doc => sanitizeUser(doc.data())))); setIsLoadingData(false); }
        }, () => { setUsers(getUsersWithScores(INITIAL_USERS)); setIsLoadingData(false); });
        
        const unsubscribeSettings = onSnapshot(doc(db, SETTINGS_PATH, 'global'), (docSnap) => {
          if (docSnap.exists()) { setGlobalSettings(docSnap.data() as any); }
          else { setDoc(doc(db, SETTINGS_PATH, 'global'), { cut1: 10, cut2: 20, cut3: daysInMonth }); }
        });

        return () => { unsubscribeSnapshot(); unsubscribeSettings(); };
      }
    });
    return () => unsubscribeAuth();
  }, [daysInMonth]);

  const updateUserKpis = useCallback(async (id: string, newKpis: any, preventiva: any) => {
    try { await updateDoc(doc(db, COLL_PATH, id), { kpis: newKpis, preventiva: preventiva, isUpdated: true }); } catch (e) {}
  }, []);

  const updateGlobalSettings = useCallback(async (newSettings: any) => {
    try { await setDoc(doc(db, SETTINGS_PATH, 'global'), newSettings, { merge: true }); }
    catch (e) { console.error("Error guardando settings:", e); }
  }, []);

  const handleAddUser = useCallback(async (name: string) => {
    const newId = String(Math.max(0, ...users.map(u => parseInt(u.id) || 0)) + 1);
    const newUser = sanitizeUser({ id: newId, name, status: 'pits', isUpdated: true });
    try { await setDoc(doc(db, COLL_PATH, newId), newUser); } catch (e) { console.error(e); }
  }, [users]);

  const handleDeleteUser = useCallback(async (id: string) => {
    if (users.length <= 1) return;
    try { await deleteDoc(doc(db, COLL_PATH, id)); } catch (e) { console.error(e); }
  }, [users]);

  const handleRenameUser = useCallback(async (id: string, newName: string) => {
    try { await updateDoc(doc(db, COLL_PATH, id), { name: newName }); } catch (e) { console.error(e); }
  }, []);

  const handleUpdateAvatar = useCallback(async (id: string, base64: string) => {
    try { await updateDoc(doc(db, COLL_PATH, id), { avatar: base64 }); } catch (e) { console.error(e); }
  }, []);

  const handleBulkSave = async (updatedUsers: any[]) => {
    try {
      const promises = updatedUsers.map(u => 
        updateDoc(doc(db, COLL_PATH, u.id), { 
          status: u.status,
          kpis: u.kpis,
          preventiva: u.preventiva,
          extraPoints: u.extraPoints || 0,
          isUpdated: true
        })
      );
      await Promise.all(promises);
      alert("SISTEMA ACTUALIZADO: TELEMETRÍA ÉLITE INYECTADA EN LOS SERVIDORES.");
    } catch (e) {
      console.error("Error en sincronización masiva:", e);
      alert("ERROR DE CONEXIÓN CON EL SERVIDOR.");
    }
  };

  if (showSplash || isLoadingData) return <SplashScreen onComplete={() => setShowSplash(false)} />;

  const TABS = [
    { id: 'dashboard', icon: Home, label: 'Lobby' },
    { id: 'pits', icon: FastForward, label: 'Pits' },
    { id: 'ranking', icon: Trophy, label: 'Podio' },
    { id: 'garage', icon: Settings, label: 'Métricas' },
  ];

  return (
    <div className="font-sans bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#2a1300] via-[#050505] to-[#000000] min-h-screen text-zinc-300 selection:bg-amber-500/30">
      
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

      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-amber-600/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-600/5 rounded-full blur-[100px] pointer-events-none" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto min-h-screen px-4 md:px-8 pb-40 pt-8 overflow-x-hidden">
        {activeTab === 'dashboard' && <Dashboard users={users} openManagerPanel={() => setShowManagerPanel(true)} currentDay={currentDay} daysInMonth={daysInMonth} monthProgress={monthProgress} />}
        {activeTab === 'pits' && <Pits users={users} updateUserKpis={updateUserKpis} />}
        {activeTab === 'ranking' && <Ranking users={users} />}
        {activeTab === 'garage' && <Garage users={users} />}
      </main>

      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="bg-black/80 backdrop-blur-2xl border border-amber-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-3xl px-6 md:px-10 py-4 flex items-center justify-between w-full max-w-sm md:max-w-xl pointer-events-auto transition-all">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center w-12 md:w-20 transition-all duration-500 ${isActive ? 'text-amber-400 -translate-y-2' : 'text-zinc-500 hover:text-zinc-300 hover:-translate-y-1'}`}
              >
                <div className={`absolute inset-0 bg-amber-500/10 rounded-full transition-transform duration-500 ease-out ${isActive ? 'scale-[1.3] opacity-100' : 'scale-0 opacity-0'}`} style={{ zIndex: -1 }} />
                <Icon size={isActive ? 24 : 22} strokeWidth={isActive ? 2.5 : 2} className="mb-1 transition-all" />
                <span className={`text-[8px] md:text-[9px] font-black font-mono uppercase tracking-widest transition-opacity duration-300 ${isActive ? 'opacity-100 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]' : 'opacity-0 absolute top-10'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-4 w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,1)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); border-radius: 10px; margin: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.4); border-radius: 10px; border: 2px solid transparent; background-clip: padding-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(245, 158, 11, 0.8); border: 2px solid transparent; background-clip: padding-box; }
        .custom-scrollbar::-webkit-scrollbar-corner { background: transparent; }
      `}} />
    </div>
  );
}
