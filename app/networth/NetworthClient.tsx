'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import ModalPortal from '@/components/ui/ModalPortal'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Treemap
} from 'recharts'
import {
  TrendingUp, TrendingDown, Landmark, CreditCard,
  PiggyBank, Building2, Target, RefreshCw,
  Wallet, CalendarDays, AlertTriangle, CheckCircle2,
  Plus, Trash2, Edit3, Calculator, Shield,
  ArrowUpRight, ArrowDownRight, Clock, HelpCircle,
  Coins, Percent, Flame, Check, ChevronRight, Zap,
  BarChart3, ArrowRight, X, Info, HandCoins,
  Maximize2, Minimize2, Layers, TableProperties,
  ArrowLeft, CheckCircle, ChevronDown, Compass,
  SlidersHorizontal, Eye, EyeOff, Search, Grid, LayoutDashboard,
  Plane, Home, GraduationCap, Award, Activity
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────

interface FD {
  id: string
  nickname?: string
  bank_name: string
  principal: number
  rate: number
  compounding: string
  payout_type?: string
  start_date: string
  maturity_date: string
  status: string
  notes?: string
}

interface Loan {
  id: string
  nickname?: string
  loan_type: string
  lender_name: string
  original_amount: number
  disbursement_date: string
  roi: number
  tenure_months: number
  emi_amount: number
  emi_day: number
  rate_type: string
  notes?: string
}

interface MoneyLent {
  id: string
  borrower_name: string
  amount_lent: number
  amount_recovered: number
  interest_rate: number
  lent_date: string
  expected_return_date?: string
  status: string
  notes?: string
}

interface Investment {
  id: string
  name: string
  type: string
  invested_amount: number
  current_value: number
  units?: number
  notes?: string
}

interface PhysicalAsset {
  id: string
  name: string
  type: string
  purchase_value: number
  current_value: number
  purchase_date?: string
  notes?: string
}

interface CreditCardItem {
  id: string
  card_name: string
  bank_name: string
  card_limit: number
  current_balance: number
  statement_date: number
  due_date_offset: number
}

interface Snapshot {
  snapshot_date: string
  net_worth: number
  total_assets: number
  total_liabilities: number
}

interface Goal {
  id: string
  name: string
  icon_name?: string
  target_amount: number
  current_amount: number
  target_date?: string
  color: string
  notes?: string
}

// ─── Formatters & Calculators ──────────────────────────────────────────────

function fmt(n: number): string {
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function fmtFull(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function calcFDValue(fd: FD): number {
  const p = Number(fd.principal) || 0
  const r = (Number(fd.rate) || 0) / 100
  const start = new Date(fd.start_date || Date.now())
  const end = new Date(fd.maturity_date || Date.now())
  const now = new Date()
  const cap = now > end ? end : now
  const years = Math.max(0, (cap.getTime() - start.getTime()) / (365.25 * 86400000))
  if (fd.compounding === 'simple') return p * (1 + r * years)
  const n = fd.compounding === 'monthly' ? 12 : fd.compounding === 'quarterly' ? 4 : fd.compounding === 'half_yearly' ? 2 : 1
  return p * Math.pow(1 + r / n, n * years)
}

function calcFDMaturityValue(p: number, rPct: number, years: number, compounding: string): number {
  const r = rPct / 100
  if (compounding === 'simple') return p * (1 + r * years)
  const n = compounding === 'monthly' ? 12 : compounding === 'quarterly' ? 4 : compounding === 'half_yearly' ? 2 : 1
  return p * Math.pow(1 + r / n, n * years)
}

function calcLoanOutstanding(loan: Loan): number {
  const r = (Number(loan.roi) || 0) / 100 / 12
  const emi = Number(loan.emi_amount) || 0
  const disbursed = new Date(loan.disbursement_date || Date.now())
  const paidMonths = Math.max(0, Math.floor((Date.now() - disbursed.getTime()) / (30.44 * 86400000)))
  const remaining = Number(loan.tenure_months) - paidMonths
  if (remaining <= 0 || r === 0) return 0
  return emi * (1 - Math.pow(1 + r, -remaining)) / r
}

function calcMonthlyEMI(principal: number, annualRate: number, tenureMonths: number): number {
  if (principal <= 0 || tenureMonths <= 0) return 0
  if (annualRate <= 0) return principal / tenureMonths
  const r = annualRate / 100 / 12
  return (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1)
}

function renderGoalIcon(iconName?: string) {
  switch (iconName) {
    case 'Shield': return <Shield size={18} className="text-emerald-500" />
    case 'Plane': return <Plane size={18} className="text-blue-500" />
    case 'Home': return <Home size={18} className="text-amber-500" />
    case 'GraduationCap': return <GraduationCap size={18} className="text-purple-500" />
    default: return <Target size={18} className="text-blue-500" />
  }
}

function CustomChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '10px 14px',
      fontSize: 12,
      boxShadow: 'var(--shadow)',
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, display: 'flex', gap: 14, justifyContent: 'space-between', marginTop: 3 }}>
          <span style={{ fontWeight: 500 }}>{p.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmtFull(Number(p.value))}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function NetWorthClient() {
  const [activeTab, setActiveTab] = useState<'overview' | 'loans' | 'goals' | 'fds' | 'assets' | 'calculators'>('overview')
  const [chartView, setChartView] = useState<'area' | 'bar'>('area')
  const [treemapView, setTreemapView] = useState<'all' | 'liquid'>('all')
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null)
  const [hoveredTile, setHoveredTile] = useState<{ id: string; name: string; value: number; categoryTitle: string; color: string; pct: string } | null>(null)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)

  // Data states
  const [fds, setFds] = useState<FD[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [moneyLent, setMoneyLent] = useState<MoneyLent[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [physicalAssets, setPhysicalAssets] = useState<PhysicalAsset[]>([])
  const [creditCards, setCreditCards] = useState<CreditCardItem[]>([])
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [bankBalance, setBankBalance] = useState<number>(0)

  // Modals state
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [showContributeModal, setShowContributeModal] = useState<Goal | null>(null)
  const [showFdModal, setShowFdModal] = useState(false)
  const [showLoanModal, setShowLoanModal] = useState(false)
  const [showLentModal, setShowLentModal] = useState(false)
  const [showRecoverModal, setShowRecoverModal] = useState<MoneyLent | null>(null)
  const [showAssetModal, setShowAssetModal] = useState(false)
  const [showSimulatorModal, setShowSimulatorModal] = useState<Loan | null>(null)
  const [showAmortizationModal, setShowAmortizationModal] = useState<Loan | null>(null)
  const [showUpdateBalanceModal, setShowUpdateBalanceModal] = useState(false)

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3500)
  }

  // Load Initial Data
  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/networth')
      const json = await res.json()

      if (json && !json.error) {
        setFds(json.fds || [])
        setLoans(json.loans || [])
        setMoneyLent(json.moneyLent || [])
        setInvestments(json.investments || [])
        setPhysicalAssets(json.physicalAssets || [])
        setCreditCards(json.creditCards || [])
        setSnapshots(json.snapshots || [])
        setGoals(json.goals || [])
        setBankBalance(Number(json.bankBalance || 0))
      } else {
        const savedLocal = localStorage.getItem('acount_networth_data_v4')
        if (savedLocal) {
          try {
            const localData = JSON.parse(savedLocal)
            setFds(localData.fds || [])
            setLoans(localData.loans || [])
            setMoneyLent(localData.moneyLent || [])
            setInvestments(localData.investments || [])
            setPhysicalAssets(localData.physicalAssets || [])
            setCreditCards(localData.creditCards || [])
            setSnapshots(localData.snapshots || [])
            setGoals(localData.goals || [])
            setBankBalance(Number(localData.bankBalance || 0))
          } catch (_) {}
        }
      }
    } catch (err) {
      console.error('Failed to load net worth data:', err)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const persistLocal = useCallback((newData: any) => {
    localStorage.setItem('acount_networth_data_v4', JSON.stringify(newData))
  }, [])

  // ── Calculated Balance Sheet Totals ───────────────────────────────────────

  const totalFDValue = useMemo(() => fds.reduce((sum, fd) => sum + calcFDValue(fd), 0), [fds])
  const totalInvestments = useMemo(() => investments.reduce((sum, i) => sum + Number(i.current_value || 0), 0), [investments])
  const totalPhysical = useMemo(() => physicalAssets.reduce((sum, a) => sum + Number(a.current_value || 0), 0), [physicalAssets])
  const totalLentReceivables = useMemo(() => moneyLent.reduce((sum, l) => sum + Math.max(0, Number(l.amount_lent) - Number(l.amount_recovered || 0)), 0), [moneyLent])
  const totalLiquidCash = useMemo(() => bankBalance + totalFDValue, [bankBalance, totalFDValue])
  const totalAssets = useMemo(() => bankBalance + totalFDValue + totalInvestments + totalPhysical + totalLentReceivables, [bankBalance, totalFDValue, totalInvestments, totalPhysical, totalLentReceivables])

  const totalLoanOutstanding = useMemo(() => loans.reduce((sum, l) => sum + calcLoanOutstanding(l), 0), [loans])
  const totalCreditCardDues = useMemo(() => creditCards.reduce((sum, c) => sum + Number(c.current_balance || 0), 0), [creditCards])
  const totalLiabilities = useMemo(() => totalLoanOutstanding + totalCreditCardDues, [totalLoanOutstanding, totalCreditCardDues])

  const netWorth = useMemo(() => totalAssets - totalLiabilities, [totalAssets, totalLiabilities])
  const liquidNetWorth = useMemo(() => totalLiquidCash + (investments.filter(i => ['mutual_fund', 'stock'].includes(i.type)).reduce((s, i) => s + Number(i.current_value || 0), 0)) - totalLiabilities, [totalLiquidCash, investments, totalLiabilities])
  const debtToAssetRatio = useMemo(() => totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0, [totalLiabilities, totalAssets])

  // Asset Allocation for Charts
  const assetAllocationData = useMemo(() => [
    { name: 'Liquid Bank', value: bankBalance, color: '#10b981' },
    { name: 'Fixed Deposits', value: totalFDValue, color: '#06b6d4' },
    { name: 'Equities & Mutual Funds', value: investments.filter(i => ['mutual_fund', 'stock', 'us_stock'].includes(i.type)).reduce((s, i) => s + Number(i.current_value), 0), color: '#3b82f6' },
    { name: 'Gold & Bonds', value: investments.filter(i => ['gold_physical', 'sgb', 'gold_etf', 'digital_gold'].includes(i.type)).reduce((s, i) => s + Number(i.current_value), 0), color: '#f59e0b' },
    { name: 'Provident & Pension (EPF)', value: investments.filter(i => ['epf', 'ppf', 'nps'].includes(i.type)).reduce((s, i) => s + Number(i.current_value), 0), color: '#8b5cf6' },
    { name: 'Money Lent (Receivables)', value: totalLentReceivables, color: '#14b8a6' },
    { name: 'Real Estate & Assets', value: totalPhysical, color: '#64748b' },
  ].filter(d => d.value > 0), [bankBalance, totalFDValue, investments, totalLentReceivables, totalPhysical])

  // ── Category Wealth Treemap Definition ────────────────────────────────────

  const categoryBlocks = useMemo(() => {
    const isGoldItem = (item: { name?: string; type?: string }) =>
      ['gold_physical', 'sgb', 'gold_etf', 'digital_gold'].includes(item.type || '') ||
      /gold|jewel|silver|diamond/i.test(item.name || '')

    const goldInvestmentItems = investments.filter(i => isGoldItem(i))
    const goldPhysicalItems = physicalAssets.filter(a => isGoldItem(a))
    const allGoldItems = [
      ...goldInvestmentItems.map(i => ({ name: i.name || 'Gold Holding', value: Number(i.current_value) || 0 })),
      ...goldPhysicalItems.map(a => ({ name: a.name || 'Gold Jewellery', value: Number(a.current_value) || 0 }))
    ].sort((a, b) => b.value - a.value)
    const goldVal = allGoldItems.reduce((s, i) => s + i.value, 0)

    const actualPhysicalAssets = physicalAssets.filter(a => !isGoldItem(a))
    const physicalVal = actualPhysicalAssets.reduce((s, a) => s + Number(a.current_value), 0)

    const equityItems = investments.filter(i => ['mutual_fund', 'stock', 'us_stock'].includes(i.type) && !isGoldItem(i))
    const equityVal = equityItems.reduce((s, i) => s + Number(i.current_value), 0)

    const providentItems = investments.filter(i => ['epf', 'ppf', 'nps'].includes(i.type) && !isGoldItem(i))
    const providentVal = providentItems.reduce((s, i) => s + Number(i.current_value), 0)

    const rawList = [
      {
        id: 'equities',
        title: 'Stocks & Mutual Funds',
        value: equityVal,
        color: '#2563eb',
        palette: ['#1d4ed8', '#2563eb', '#3b82f6', '#4f94fc', '#60a5fa', '#7ebbfa', '#93c5fd'],
        icon: TrendingUp,
        tag: equityItems.length === 1 ? '1 Fund' : `${equityItems.length} Funds & Stocks`,
        summary: 'Direct equity shares and mutual funds',
        count: equityItems.length,
        items: equityItems.length > 0
          ? equityItems.map(i => ({ name: i.name || 'Equity Holding', value: Number(i.current_value) || 0 })).sort((a, b) => b.value - a.value)
          : [{ name: 'Stocks & Mutual Funds', value: equityVal }],
      },
      {
        id: 'fds',
        title: 'Fixed Deposits',
        value: totalFDValue,
        color: '#0891b2',
        palette: ['#0e7490', '#0891b2', '#06b6d4', '#14b8a6', '#22d3ee', '#38bdf8', '#67e8f9'],
        icon: Landmark,
        tag: fds.length === 1 ? '1 Deposit' : `${fds.length} Deposits`,
        summary: 'Bank term deposits & compounding FDs',
        count: fds.length,
        items: fds.length > 0
          ? fds.map(f => ({ name: f.bank_name || f.nickname || 'Fixed Deposit', value: calcFDValue(f) })).sort((a, b) => b.value - a.value)
          : [{ name: 'Fixed Deposits', value: totalFDValue }],
      },
      {
        id: 'provident',
        title: 'Retirement (EPF / PPF)',
        value: providentVal,
        color: '#7c3aed',
        palette: ['#6d28d9', '#7c3aed', '#8b5cf6', '#9d6ef7', '#a78bfa', '#bfa6fb', '#c4b5fd'],
        icon: Shield,
        tag: 'Long-term corpus',
        summary: 'EPF, PPF, NPS & retirement accounts',
        count: providentItems.length,
        items: providentItems.length > 0
          ? providentItems.map(i => ({ name: i.name || (i.type ? i.type.toUpperCase() : 'Retirement Fund'), value: Number(i.current_value) || 0 })).sort((a, b) => b.value - a.value)
          : [{ name: 'Retirement (EPF / PPF)', value: providentVal }],
      },
      {
        id: 'cash',
        title: 'Bank Cash Balance',
        value: bankBalance,
        color: '#059669',
        palette: ['#047857', '#059669', '#10b981', '#2dd4bf', '#34d399', '#5eead4', '#6ee7b7'],
        icon: Wallet,
        tag: 'Liquid Cash',
        summary: 'Operational bank balance for daily expenses',
        count: 1,
        items: [{ name: 'Bank Savings & Cash', value: bankBalance }],
      },
      {
        id: 'gold',
        title: 'Gold & Precious Metals',
        value: goldVal,
        color: '#d97706',
        palette: ['#b45309', '#d97706', '#f59e0b', '#f97316', '#fbbf24', '#fcd34d', '#fde047'],
        icon: Coins,
        tag: allGoldItems.length === 1 ? '1 Holding' : `${allGoldItems.length} Holdings`,
        summary: 'Physical gold jewellery, SGBs & digital gold',
        count: allGoldItems.length,
        items: allGoldItems.length > 0
          ? allGoldItems
          : [{ name: 'Gold & Precious Metals', value: goldVal }],
      },
      {
        id: 'lent',
        title: 'Money Lent (P2P)',
        value: totalLentReceivables,
        color: '#e11d48',
        palette: ['#be123c', '#e11d48', '#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#ffe4e6'],
        icon: HandCoins,
        tag: moneyLent.length === 1 ? '1 Note' : `${moneyLent.length} Receivables`,
        summary: 'Personal loans to friends, family & peers',
        count: moneyLent.length,
        items: moneyLent.length > 0
          ? moneyLent.map(l => ({ name: l.borrower_name || 'P2P Receivable', value: Math.max(0, (Number(l.amount_lent) || 0) - (Number(l.amount_recovered) || 0)) })).sort((a, b) => b.value - a.value)
          : [{ name: 'Money Lent', value: totalLentReceivables }],
      },
      {
        id: 'physical',
        title: 'Real Estate & Vehicles',
        value: physicalVal,
        color: '#475569',
        palette: ['#334155', '#475569', '#526e8c', '#64748b', '#788fa6', '#94a3b8', '#a9b8ca'],
        icon: Building2,
        tag: actualPhysicalAssets.length === 1 ? '1 Asset' : `${actualPhysicalAssets.length} Properties & Vehicles`,
        summary: 'Land, apartments, cars and physical assets',
        count: actualPhysicalAssets.length,
        items: actualPhysicalAssets.length > 0
          ? actualPhysicalAssets.map(a => ({ name: a.name || 'Property', value: Number(a.current_value) || 0 })).sort((a, b) => b.value - a.value)
          : [{ name: 'Real Estate & Vehicles', value: physicalVal }],
      }
    ]

    return rawList.sort((a, b) => b.value - a.value)
  }, [bankBalance, totalFDValue, investments, physicalAssets, totalLentReceivables, fds, moneyLent])

  const hoveredBlock = useMemo(() => {
    if (!hoveredBlockId) return null
    return categoryBlocks.find(b => b.id === hoveredBlockId) || null
  }, [categoryBlocks, hoveredBlockId])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSaveGoal = async (goalData: Partial<Goal>) => {
    try {
      if (editingGoal) {
        const updated = goals.map(g => g.id === editingGoal.id ? { ...g, ...goalData } as Goal : g)
        setGoals(updated)
        persistLocal({ fds, loans, moneyLent, investments, physicalAssets, goals: updated, bankBalance })
        await fetch('/api/networth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_goal', id: editingGoal.id, data: goalData })
        }).catch(() => {})
        showToast('Goal updated successfully')
      } else {
        const newGoal: Goal = {
          id: `goal-${Date.now()}`,
          name: goalData.name || 'New Goal',
          icon_name: goalData.icon_name || 'Target',
          target_amount: Number(goalData.target_amount) || 100000,
          current_amount: Number(goalData.current_amount) || 0,
          target_date: goalData.target_date,
          color: goalData.color || '#3b82f6',
          notes: goalData.notes
        }
        const updated = [...goals, newGoal]
        setGoals(updated)
        persistLocal({ fds, loans, moneyLent, investments, physicalAssets, goals: updated, bankBalance })
        await fetch('/api/networth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create_goal', data: newGoal })
        }).catch(() => {})
        showToast('New Goal created')
      }
    } catch (_) {
      showToast('Saved locally')
    } finally {
      setShowGoalModal(false)
      setEditingGoal(null)
    }
  }

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Remove this financial goal?')) return
    const updated = goals.filter(g => g.id !== id)
    setGoals(updated)
    persistLocal({ fds, loans, moneyLent, investments, physicalAssets, goals: updated, bankBalance })
    await fetch('/api/networth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_goal', id })
    }).catch(() => {})
    showToast('Goal removed')
  }

  const handleContributeGoal = async (goalId: string, addAmount: number) => {
    const updated = goals.map(g => {
      if (g.id === goalId) {
        return { ...g, current_amount: Math.min(g.target_amount, g.current_amount + addAmount) }
      }
      return g
    })
    setGoals(updated)
    persistLocal({ fds, loans, moneyLent, investments, physicalAssets, goals: updated, bankBalance })
    await fetch('/api/networth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_goal',
        id: goalId,
        data: { current_amount: updated.find(g => g.id === goalId)?.current_amount }
      })
    }).catch(() => {})
    setShowContributeModal(null)
    showToast(`Added ${fmtFull(addAmount)} to goal`)
  }

  const handleSaveFD = async (fdData: Partial<FD>) => {
    const newFd: FD = {
      id: `fd-${Date.now()}`,
      nickname: fdData.nickname || 'Term Deposit',
      bank_name: fdData.bank_name || 'HDFC Bank',
      principal: Number(fdData.principal) || 100000,
      rate: Number(fdData.rate) || 7.0,
      compounding: fdData.compounding || 'quarterly',
      payout_type: fdData.payout_type || 'cumulative',
      start_date: fdData.start_date || new Date().toISOString().split('T')[0],
      maturity_date: fdData.maturity_date || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      status: 'active',
      notes: fdData.notes
    }
    const updated = [...fds, newFd]
    setFds(updated)
    persistLocal({ fds: updated, loans, moneyLent, investments, physicalAssets, goals, bankBalance })
    await fetch('/api/networth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_fd', data: newFd })
    }).catch(() => {})
    setShowFdModal(false)
    showToast('Fixed Deposit recorded')
  }

  const handleDeleteFD = async (id: string) => {
    if (!confirm('Remove this Fixed Deposit record?')) return
    const updated = fds.filter(f => f.id !== id)
    setFds(updated)
    persistLocal({ fds: updated, loans, moneyLent, investments, physicalAssets, goals, bankBalance })
    await fetch('/api/networth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_fd', id })
    }).catch(() => {})
    showToast('Fixed Deposit removed')
  }

  const handleSaveLoan = async (loanData: Partial<Loan>) => {
    const principal = Number(loanData.original_amount) || 500000
    const roi = Number(loanData.roi) || 8.5
    const tenure = Number(loanData.tenure_months) || 60
    const calculatedEmi = Math.round(calcMonthlyEMI(principal, roi, tenure))

    const newLoan: Loan = {
      id: `loan-${Date.now()}`,
      nickname: loanData.nickname || 'Bank Loan',
      loan_type: loanData.loan_type || 'personal',
      lender_name: loanData.lender_name || 'Bank',
      original_amount: principal,
      disbursement_date: loanData.disbursement_date || new Date().toISOString().split('T')[0],
      roi,
      tenure_months: tenure,
      emi_amount: loanData.emi_amount ? Number(loanData.emi_amount) : calculatedEmi,
      emi_day: Number(loanData.emi_day) || 5,
      rate_type: loanData.rate_type || 'fixed',
      notes: loanData.notes
    }
    const updated = [...loans, newLoan]
    setLoans(updated)
    persistLocal({ fds, loans: updated, moneyLent, investments, physicalAssets, goals, bankBalance })
    await fetch('/api/networth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_loan', data: newLoan })
    }).catch(() => {})
    setShowLoanModal(false)
    showToast('Loan recorded')
  }

  const handleDeleteLoan = async (id: string) => {
    if (!confirm('Remove this Loan liability record?')) return
    const updated = loans.filter(l => l.id !== id)
    setLoans(updated)
    persistLocal({ fds, loans: updated, moneyLent, investments, physicalAssets, goals, bankBalance })
    await fetch('/api/networth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_loan', id })
    }).catch(() => {})
    showToast('Loan removed')
  }

  const handleSaveLent = async (lentData: Partial<MoneyLent>) => {
    const newLent: MoneyLent = {
      id: `lent-${Date.now()}`,
      borrower_name: lentData.borrower_name || 'Borrower',
      amount_lent: Number(lentData.amount_lent) || 10000,
      amount_recovered: Number(lentData.amount_recovered) || 0,
      interest_rate: Number(lentData.interest_rate) || 0,
      lent_date: lentData.lent_date || new Date().toISOString().split('T')[0],
      expected_return_date: lentData.expected_return_date,
      status: 'active',
      notes: lentData.notes
    }
    const updated = [...moneyLent, newLent]
    setMoneyLent(updated)
    persistLocal({ fds, loans, moneyLent: updated, investments, physicalAssets, goals, bankBalance })
    await fetch('/api/networth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_lent', data: newLent })
    }).catch(() => {})
    setShowLentModal(false)
    showToast('Money lent recorded')
  }

  const handleRecoverLent = async (lentId: string, recoveredAmount: number) => {
    const updated = moneyLent.map(l => {
      if (l.id === lentId) {
        const newRecovered = Math.min(l.amount_lent, Number(l.amount_recovered) + recoveredAmount)
        return { ...l, amount_recovered: newRecovered, status: newRecovered >= l.amount_lent ? 'settled' : 'active' }
      }
      return l
    })
    setMoneyLent(updated)
    persistLocal({ fds, loans, moneyLent: updated, investments, physicalAssets, goals, bankBalance })
    await fetch('/api/networth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_lent',
        id: lentId,
        data: { amount_recovered: updated.find(l => l.id === lentId)?.amount_recovered }
      })
    }).catch(() => {})
    setShowRecoverModal(null)
    showToast(`Received ${fmtFull(recoveredAmount)} repayment`)
  }

  const handleDeleteLent = async (id: string) => {
    if (!confirm('Remove this lending record?')) return
    const updated = moneyLent.filter(l => l.id !== id)
    setMoneyLent(updated)
    persistLocal({ fds, loans, moneyLent: updated, investments, physicalAssets, goals, bankBalance })
    await fetch('/api/networth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_lent', id })
    }).catch(() => {})
    showToast('Lending record removed')
  }

  const handleSaveAsset = async (assetData: any) => {
    if (assetData.isPhysical) {
      const newAsset: PhysicalAsset = {
        id: `phys-${Date.now()}`,
        name: assetData.name || 'Physical Asset',
        type: assetData.type || 'property',
        purchase_value: Number(assetData.purchase_value) || 100000,
        current_value: Number(assetData.current_value) || Number(assetData.purchase_value) || 100000,
        purchase_date: assetData.purchase_date,
        notes: assetData.notes
      }
      const updated = [...physicalAssets, newAsset]
      setPhysicalAssets(updated)
      persistLocal({ fds, loans, moneyLent, investments, physicalAssets: updated, goals, bankBalance })
      await fetch('/api/networth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_asset', data: newAsset })
      }).catch(() => {})
      showToast('Physical asset recorded')
    } else {
      const newInv: Investment = {
        id: `inv-${Date.now()}`,
        name: assetData.name || 'Investment',
        type: assetData.type || 'mutual_fund',
        invested_amount: Number(assetData.invested_amount) || 50000,
        current_value: Number(assetData.current_value) || Number(assetData.invested_amount) || 50000,
        notes: assetData.notes
      }
      const updated = [...investments, newInv]
      setInvestments(updated)
      persistLocal({ fds, loans, moneyLent, investments: updated, physicalAssets, goals, bankBalance })
      await fetch('/api/networth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_investment', data: newInv })
      }).catch(() => {})
      showToast('Investment recorded')
    }
    setShowAssetModal(false)
  }

  const handleDeleteInvestment = async (id: string) => {
    if (!confirm('Remove this investment?')) return
    const updated = investments.filter(i => i.id !== id)
    setInvestments(updated)
    persistLocal({ fds, loans, moneyLent, investments: updated, physicalAssets, goals, bankBalance })
    await fetch('/api/networth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_investment', id })
    }).catch(() => {})
    showToast('Investment removed')
  }

  const handleDeletePhysical = async (id: string) => {
    if (!confirm('Remove this physical asset?')) return
    const updated = physicalAssets.filter(a => a.id !== id)
    setPhysicalAssets(updated)
    persistLocal({ fds, loans, moneyLent, investments, physicalAssets, goals, bankBalance })
    await fetch('/api/networth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_asset', id })
    }).catch(() => {})
    showToast('Asset removed')
  }

  const handleUpdateBankBalance = async (newVal: number) => {
    setBankBalance(newVal)
    persistLocal({ fds, loans, moneyLent, investments, physicalAssets, goals, bankBalance: newVal, snapshots })
    setShowUpdateBalanceModal(false)
    showToast('Liquid Bank balance updated')
  }

  const handleTakeSnapshot = async () => {
    try {
      const today = new Date().toISOString().slice(0, 7)
      const newSnap: Snapshot = {
        snapshot_date: today,
        net_worth: netWorth,
        total_assets: totalAssets,
        total_liabilities: totalLiabilities
      }
      const existing = snapshots.filter(s => s.snapshot_date !== today)
      const updated = [...existing, newSnap]
      setSnapshots(updated)
      persistLocal({ fds, loans, moneyLent, investments, physicalAssets, goals, bankBalance, snapshots: updated })
      await fetch('/api/networth', { method: 'POST', headers: { 'Content-Type': 'application/json' } }).catch(() => {})
      showToast('Monthly Net Worth checkpoint recorded')
    } catch (_) {
      showToast('Record saved locally')
    }
  }

  const handleNavigateCategory = (blockId: string) => {
    if (blockId === 'cash') {
      setShowUpdateBalanceModal(true)
    } else if (blockId === 'fds') {
      setActiveTab('fds')
    } else if (blockId === 'lent') {
      setActiveTab('loans')
    } else if (['physical', 'equities', 'provident', 'gold'].includes(blockId)) {
      setActiveTab('assets')
    }
  }

  return (
    <div>
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold border border-slate-700 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle size={16} className="text-blue-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header mb-5">
        <div>
          <h1 className="page-title">Net Worth</h1>
          <p className="page-subtitle">
            Consolidated balance sheet, investments, assets, and liabilities
          </p>
        </div>
        <div className="header-actions" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Quick Bank Cash Button */}
          <button
            onClick={() => setShowUpdateBalanceModal(true)}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, height: 34, padding: '0 12px', cursor: 'pointer' }}
            title="Click to update liquid bank cash"
          >
            <Wallet size={13} style={{ color: 'var(--green)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Cash:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt(bankBalance)}</span>
            <Edit3 size={11} style={{ opacity: 0.6, marginLeft: 2 }} />
          </button>

          {/* Record Checkpoint */}
          <button
            onClick={handleTakeSnapshot}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, height: 34, padding: '0 12px', cursor: 'pointer' }}
            title="Save current snapshot to database"
          >
            <RefreshCw size={13} />
            <span>Save Snapshot</span>
          </button>

          {/* + Add Entry Menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, height: 34, padding: '0 14px', cursor: 'pointer' }}
            >
              <Plus size={14} />
              <span>Add Entry</span>
              <ChevronDown size={13} style={{ opacity: 0.8, transform: showAddMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>

            {showAddMenu && (
              <>
                <div
                  onClick={() => setShowAddMenu(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 6px)',
                    zIndex: 50,
                    width: 220,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <button
                    onClick={() => { setShowAddMenu(false); setShowAssetModal(true) }}
                    className="dropdown-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12.5,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    <Building2 size={15} style={{ color: '#64748b' }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>Investment / Asset</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Stocks, MFs, Gold, Property</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { setShowAddMenu(false); setShowFdModal(true) }}
                    className="dropdown-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12.5,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    <Landmark size={15} style={{ color: '#0891b2' }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>Fixed Deposit</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Bank term deposits & FDs</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { setShowAddMenu(false); setShowLoanModal(true) }}
                    className="dropdown-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12.5,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    <CreditCard size={15} style={{ color: '#dc2626' }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>Loan / EMI</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Home, car, personal loan</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { setShowAddMenu(false); setShowLentModal(true) }}
                    className="dropdown-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12.5,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    <HandCoins size={15} style={{ color: '#059669' }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>Money Lent (P2P)</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Receivables from friends/peers</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { setShowAddMenu(false); setShowGoalModal(true) }}
                    className="dropdown-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12.5,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    <Target size={15} style={{ color: '#2563eb' }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>Financial Goal</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Target & savings milestones</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab Navigation Bar ────────────────────────────────────────────── */}
      <div className="mb-6" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard, count: null },
          { id: 'loans', label: 'Loans & Lending', icon: CreditCard, count: loans.length + moneyLent.length },
          { id: 'goals', label: 'Goals', icon: Target, count: goals.length },
          { id: 'fds', label: 'Fixed Deposits', icon: Landmark, count: fds.length },
          { id: 'assets', label: 'Investments & Assets', icon: Building2, count: investments.length + physicalAssets.length },
          { id: 'calculators', label: 'Calculators', icon: Calculator, count: null },
        ].map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '10px 15px',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={14} style={{ opacity: isActive ? 1 : 0.65 }} />
              <span>{tab.label}</span>
              {tab.count !== null && tab.count > 0 && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 999,
                  background: isActive ? 'var(--accent-subtle)' : 'var(--bg-subtle)',
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: CLEAN HOME OVERVIEW + SEAMLESS FITTED TREEMAP                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* ── KPI Balance Sheet Metrics (Clean, Perfectly Aligned) ──────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {/* Card 1: Consolidated Net Worth */}
            <div
              className="kpi-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 118,
                padding: '16px 18px',
              }}
            >
              <div>
                <div className="kpi-header" style={{ marginBottom: 6 }}>
                  <span className="kpi-label">Consolidated Net Worth</span>
                  <div className="kpi-icon-wrap" style={{ background: 'var(--green-subtle)', color: 'var(--green)' }}>
                    <Wallet size={14} />
                  </div>
                </div>
                <div className="kpi-value" style={{ fontSize: 24, fontWeight: 700 }}>
                  {fmt(netWorth)}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 6, fontSize: 11 }}>
                <span className="kpi-tag positive" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <TrendingUp size={11} /> {((totalAssets / (totalLiabilities || 1))).toFixed(1)}x Coverage
                </span>
                <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  Liquid: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{fmt(totalAssets - totalPhysical)}</strong>
                </span>
              </div>
            </div>

            {/* Card 2: Gross Total Assets */}
            <div
              className="kpi-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 118,
                padding: '16px 18px',
              }}
            >
              <div>
                <div className="kpi-header" style={{ marginBottom: 6 }}>
                  <span className="kpi-label">Gross Total Assets</span>
                  <div className="kpi-icon-wrap" style={{ background: 'var(--green-subtle)', color: 'var(--green)' }}>
                    <Landmark size={14} />
                  </div>
                </div>
                <div className="kpi-value" style={{ color: 'var(--green)', fontSize: 24, fontWeight: 700 }}>
                  +{fmt(totalAssets)}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 6, fontSize: 11 }}>
                <span className="kpi-tag positive" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {categoryBlocks.length} Asset Classes
                </span>
                <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  Cash: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{fmt(bankBalance)}</strong>
                </span>
              </div>
            </div>

            {/* Card 3: Total Debt Obligations */}
            <div
              className="kpi-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 118,
                padding: '16px 18px',
              }}
            >
              <div>
                <div className="kpi-header" style={{ marginBottom: 6 }}>
                  <span className="kpi-label">Total Debt Obligations</span>
                  <div className="kpi-icon-wrap" style={{ background: 'var(--red-subtle)', color: 'var(--red)' }}>
                    <CreditCard size={14} />
                  </div>
                </div>
                <div className="kpi-value" style={{ color: 'var(--red)', fontSize: 24, fontWeight: 700 }}>
                  −{fmt(totalLiabilities)}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 6, fontSize: 11 }}>
                <span className="kpi-tag negative" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <ArrowDownRight size={11} /> {loans.length} Active {loans.length === 1 ? 'Loan' : 'Loans'}
                </span>
                <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  EMI: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{fmt(loans.reduce((s, l) => s + Number(l.emi_amount), 0))}/mo</strong>
                </span>
              </div>
            </div>

            {/* Card 4: Debt-to-Asset Ratio */}
            <div
              className="kpi-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 118,
                padding: '16px 18px',
              }}
            >
              <div>
                <div className="kpi-header" style={{ marginBottom: 6 }}>
                  <span className="kpi-label">Debt-to-Asset Ratio</span>
                  <div className="kpi-icon-wrap">
                    <Shield size={14} />
                  </div>
                </div>
                <div className="kpi-value" style={{ fontSize: 24, fontWeight: 700 }}>
                  {debtToAssetRatio.toFixed(1)}%
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 6, fontSize: 11 }}>
                <span className={`kpi-tag ${debtToAssetRatio < 35 ? 'positive' : 'negative'}`} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {debtToAssetRatio < 35 ? 'Healthy Balance' : 'Moderate Leverage'}
                </span>
                <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 10.5 }}>
                  Target: &lt;35%
                </span>
              </div>
            </div>
          </div>

          {/* ── CLEAN WEALTH ALLOCATION BOARD (PERCENT & MONEY FOCUSED) ── */}
          {(() => {
            const visibleBlocks = treemapView === 'liquid' ? categoryBlocks.filter(b => b.id !== 'physical') : categoryBlocks
            const currentTotal = visibleBlocks.reduce((s, b) => s + b.value, 0) || 1
            const topBlock = treemapView === 'all' ? visibleBlocks[0] : null
            const treemapLeaves = visibleBlocks
              .filter(b => b.value > 0)
              .flatMap(b => {
                const validItems = ((b as any).items || []).filter((it: any) => it.value > 0)
                const sorted = [...validItems].sort((a: any, b: any) => b.value - a.value)
                const list = sorted.length > 0 ? sorted : [{ name: b.title, value: b.value }]
                const palette = (b as any).palette || [b.color]
                return list.map((it: any, idx: number) => ({
                  id: `${b.id}-${idx}`,
                  categoryId: b.id,
                  categoryTitle: b.title,
                  categoryColor: b.color,
                  categoryTotal: b.value,
                  name: it.name,
                  value: it.value,
                  color: palette[idx % palette.length],
                  isFirstInCategory: idx === 0,
                  itemCount: list.length,
                  pct: ((it.value / currentTotal) * 100).toFixed(1),
                  categoryPct: ((b.value / currentTotal) * 100).toFixed(1),
                }))
              })

            return (
              <div className="card mb-6" style={{ padding: '20px 22px' }}>
                <div className="card-header" style={{ marginBottom: 16 }}>
                  <div>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Layers size={16} style={{ color: 'var(--accent)' }} />
                      Where is my money?
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                      Breakdown of your assets and savings by percentage and value. Click any category to view details.
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* View Toggle */}
                    <div style={{ display: 'inline-flex', background: 'var(--bg-subtle)', padding: 2, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <button
                        onClick={() => setTreemapView('all')}
                        style={{
                          padding: '5px 12px',
                          fontSize: 11.5,
                          fontWeight: 700,
                          borderRadius: 'var(--radius-sm)',
                          background: treemapView === 'all' ? 'var(--bg-surface)' : 'transparent',
                          color: treemapView === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
                          boxShadow: treemapView === 'all' ? 'var(--shadow-xs)' : 'none',
                          cursor: 'pointer',
                          border: 'none',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        All Assets ({fmt(totalAssets)})
                      </button>
                      <button
                        onClick={() => setTreemapView('liquid')}
                        style={{
                          padding: '5px 12px',
                          fontSize: 11.5,
                          fontWeight: 700,
                          borderRadius: 'var(--radius-sm)',
                          background: treemapView === 'liquid' ? 'var(--bg-surface)' : 'transparent',
                          color: treemapView === 'liquid' ? 'var(--text-primary)' : 'var(--text-muted)',
                          boxShadow: treemapView === 'liquid' ? 'var(--shadow-xs)' : 'none',
                          cursor: 'pointer',
                          border: 'none',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        Liquid & Market Only ({fmt(totalAssets - totalPhysical)})
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── HIERARCHICAL TREEMAP + RIGHT-SIDE LEGEND (MATCHING REFERENCE IMAGE) ── */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    gap: 16,
                    marginBottom: 20,
                  }}
                  className="flex-col lg:flex-row"
                >
                  {/* Treemap Visual Canvas */}
                  <div
                    onMouseMove={(e) => {
                      setCursorPos({ x: e.clientX, y: e.clientY })
                    }}
                    onMouseLeave={() => {
                      setHoveredTile(null)
                      setCursorPos(null)
                    }}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: 280,
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <Treemap
                        data={treemapLeaves}
                        dataKey="value"
                        aspectRatio={16 / 9}
                        isAnimationActive={false}
                        content={(props: any) => {
                          const { x, y, width, height, id, name, value, color, categoryId, categoryTitle, categoryColor, categoryTotal, isFirstInCategory, itemCount, pct } = props
                          if (!width || !height || width < 4 || height < 4) return <g />

                          const isHovered = hoveredTile?.id === id
                          const isCompact = width < 90 || height < 45
                          const isTiny = width < 55 || height < 30
                          const fillColor = color || categoryColor || '#2563eb'

                          return (
                            <g
                              transform={`translate(${x},${y})`}
                              onClick={() => handleNavigateCategory(categoryId || id)}
                              onMouseEnter={(e) => {
                                setHoveredTile({
                                  id,
                                  name,
                                  value,
                                  categoryTitle: categoryTitle || name,
                                  color: fillColor,
                                  pct: pct || ((value / currentTotal) * 100).toFixed(1),
                                })
                                setCursorPos({ x: e.clientX, y: e.clientY })
                              }}
                              onMouseMove={(e) => {
                                setCursorPos({ x: e.clientX, y: e.clientY })
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              {/* Solid Rectangular Tile with Crisp White 2px Border Matching Reference */}
                              <rect
                                x={0}
                                y={0}
                                width={width}
                                height={height}
                                fill={fillColor}
                                fillOpacity={isHovered ? 0.96 : 1}
                                stroke="#ffffff"
                                strokeWidth={2}
                                style={{
                                  transition: 'filter 0.12s ease',
                                  filter: isHovered ? 'brightness(1.1)' : 'none',
                                }}
                              />

                              {/* Centered Bold White Text matching reference: Name (Amount) */}
                              {!isTiny && (
                                <foreignObject x={4} y={4} width={Math.max(0, width - 8)} height={Math.max(0, height - 8)}>
                                  <div
                                    style={{
                                      height: '100%',
                                      width: '100%',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: isFirstInCategory && itemCount > 1 && height > 75 ? 'space-between' : 'center',
                                      alignItems: 'center',
                                      textAlign: 'center',
                                      color: '#ffffff',
                                      pointerEvents: 'none',
                                      overflow: 'hidden',
                                      padding: '2px',
                                    }}
                                  >
                                    {/* Category Header Banner if first in group & space allows */}
                                    {isFirstInCategory && itemCount > 1 && height > 75 && width > 100 && (
                                      <div
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 800,
                                          letterSpacing: '0.02em',
                                          opacity: 0.95,
                                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          width: '100%',
                                        }}
                                      >
                                        {categoryTitle} ({fmt(categoryTotal)})
                                      </div>
                                    )}

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', maxWidth: '100%' }}>
                                      <div
                                        style={{
                                          fontSize: isCompact ? 11 : 13,
                                          fontWeight: 700,
                                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                          lineHeight: 1.2,
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          maxWidth: Math.max(20, width - 10),
                                        }}
                                      >
                                        {name}
                                      </div>

                                      <div
                                        style={{
                                          fontFamily: 'var(--font-mono)',
                                          fontSize: isCompact ? 10.5 : 12,
                                          fontWeight: 600,
                                          opacity: 0.95,
                                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                          marginTop: 2,
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        ({fmt(value)})
                                      </div>
                                    </div>

                                    {/* Balanced Bottom Spacer when category header is shown */}
                                    {isFirstInCategory && itemCount > 1 && height > 75 && width > 100 && <div style={{ height: 2 }} />}
                                  </div>
                                </foreignObject>
                              )}
                            </g>
                          )
                        }}
                      />
                    </ResponsiveContainer>
                  </div>

                  {/* Right Side Category Legend Matching Reference Image */}
                  <div
                    style={{
                      width: 220,
                      flexShrink: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 2 }}>
                      Asset Classes
                    </div>
                    {visibleBlocks.filter(b => b.value > 0).map(b => (
                      <div
                        key={b.id}
                        onClick={() => handleNavigateCategory(b.id)}
                        className="group"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 9,
                          cursor: 'pointer',
                          padding: '3px 4px',
                          borderRadius: 'var(--radius-sm)',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        <span
                          style={{
                            width: 13,
                            height: 13,
                            background: b.color,
                            borderRadius: 2,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {b.title}
                          </span>
                          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {fmt(b.value)} ({((b.value / currentTotal) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── CLEAN, BALANCED ASSET CARDS GRID ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                  {visibleBlocks.map(block => {
                    const Icon = block.icon
                    const pct = Number(((block.value / currentTotal) * 100).toFixed(1))

                    return (
                      <div
                        key={block.id}
                        onClick={() => handleNavigateCategory(block.id)}
                        className="transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md cursor-pointer group"
                        title={`Click to manage ${block.title}`}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)',
                          padding: '16px 18px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: 'var(--shadow-xs)',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Subtle Top Indicator Accent */}
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 3,
                            background: block.color,
                            opacity: 0.85,
                          }}
                        />

                        <div>
                          {/* Header: Icon + Title + Percentage */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                              <div
                                style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: 'var(--radius-sm)',
                                  background: `${block.color}15`,
                                  color: block.color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <Icon size={16} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {block.title}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {block.tag}
                                </div>
                              </div>
                            </div>

                            {/* Percentage Badge */}
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                fontSize: 12,
                                padding: '2px 8px',
                                borderRadius: 999,
                                background: `${block.color}15`,
                                color: block.color,
                                border: `1px solid ${block.color}35`,
                                flexShrink: 0,
                              }}
                            >
                              {pct}%
                            </span>
                          </div>

                          {/* Big Clear Valuation */}
                          <div style={{ margin: '10px 0 6px' }}>
                            <div
                              style={{
                                fontSize: 22,
                                fontWeight: 800,
                                fontFamily: 'var(--font-mono)',
                                color: 'var(--text-primary)',
                                letterSpacing: '-0.02em',
                                lineHeight: 1.1,
                              }}
                            >
                              {fmtFull(block.value)}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 3, fontWeight: 500 }}>
                              {fmt(block.value)}
                            </div>
                          </div>

                          <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.35, margin: '6px 0 0' }}>
                            {block.summary}
                          </p>
                        </div>

                        {/* Footer Share Progress Bar */}
                        <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
                            <span style={{ color: 'var(--text-muted)' }}>Share of wealth</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>{pct}%</span>
                          </div>
                          <div style={{ height: 4, width: '100%', background: 'var(--bg-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${Math.min(100, Math.max(3, pct))}%`,
                                background: block.color,
                                borderRadius: 2,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* ── CURSOR FLOATING INSPECTION TOOLTIP (MATCHING TREEMAP HOVER) ── */}
                {hoveredTile && cursorPos && (
                  <div
                    style={{
                      position: 'fixed',
                      left: (typeof window !== 'undefined' && cursorPos.x > window.innerWidth - 260) ? cursorPos.x - 225 : cursorPos.x + 12,
                      top: (typeof window !== 'undefined' && cursorPos.y > window.innerHeight - 130) ? cursorPos.y - 110 : cursorPos.y + 12,
                      zIndex: 99999,
                      pointerEvents: 'none',
                      background: 'var(--bg-surface)',
                      border: `1.5px solid ${hoveredTile.color}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(0, 0, 0, 0.1)',
                      minWidth: 165,
                      maxWidth: 240,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: hoveredTile.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {hoveredTile.categoryTitle}
                        </span>
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 999,
                          background: `${hoveredTile.color}20`,
                          color: hoveredTile.color,
                        }}
                      >
                        {hoveredTile.pct}%
                      </span>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {hoveredTile.name}
                    </div>

                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                      {fmtFull(hoveredTile.value)}
                    </div>

                    <div style={{ fontSize: 9.5, opacity: 0.8, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                      Click to open {hoveredTile.categoryTitle} ↗
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── 2-COLUMN BALANCED LOWER LAYOUT (Matching Home Cards & Table) ────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Asset Class Table & Live Constituent Breakdown */}
            <div className="lg:col-span-7 card" style={{ padding: '20px 22px' }}>
              <div className="card-header" style={{ marginBottom: 14 }}>
                <div>
                  <div className="card-title">Constituent Asset Holdings & Balances</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Click any category to open and manage its underlying assets
                  </div>
                </div>
                <button
                  onClick={() => setShowUpdateBalanceModal(true)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 11, padding: '4px 10px' }}
                >
                  <Edit3 size={12} /> Update Cash
                </button>
              </div>

              <div className="table-container">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Asset Category</th>
                        <th>Holdings</th>
                        <th style={{ textAlign: 'right' }}>Valuation</th>
                        <th style={{ textAlign: 'right' }}>Weight</th>
                        <th style={{ width: 32 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryBlocks.map(block => {
                        const pct = ((block.value / (totalAssets || 1)) * 100).toFixed(1)
                        const Icon = block.icon
                        const isHovered = hoveredBlockId === block.id

                        return (
                          <tr
                            key={block.id}
                            onClick={() => handleNavigateCategory(block.id)}
                            onMouseEnter={() => setHoveredBlockId(block.id)}
                            onMouseLeave={() => setHoveredBlockId(null)}
                            title={`Click to open ${block.title}`}
                            style={{
                              background: isHovered ? 'var(--bg-subtle)' : undefined,
                              cursor: 'pointer',
                              transition: 'background 0.1s ease'
                            }}
                          >
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 'var(--radius-sm)',
                                    background: `${block.color}18`,
                                    color: block.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}
                                >
                                  <Icon size={14} />
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 12.5 }}>{block.title}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{block.summary}</div>
                                </div>
                              </div>
                            </td>
                            <td className="td-muted">
                              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                                {block.tag}
                              </span>
                            </td>
                            <td className="td-mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {fmtFull(block.value)}
                            </td>
                            <td className="td-mono" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                              {pct}%
                            </td>
                            <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                              <ChevronRight size={14} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Historical Trajectory & Portfolio Split */}
            <div className="lg:col-span-5 space-y-6">
              {/* Historical Trajectory Curve */}
              <div className="card" style={{ padding: '20px 22px' }}>
                <div className="card-header" style={{ marginBottom: 12 }}>
                  <div>
                    <div className="card-title">Net Worth Over Time</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      Monthly wealth checkpoints from your database
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, background: 'var(--bg-subtle)', padding: 3, borderRadius: 'var(--radius-sm)' }}>
                    <button
                      onClick={() => setChartView('area')}
                      className={`filter-chip ${chartView === 'area' ? 'active' : ''}`}
                      style={{ fontSize: 11, padding: '2px 8px', height: 24 }}
                    >
                      Area
                    </button>
                    <button
                      onClick={() => setChartView('bar')}
                      className={`filter-chip ${chartView === 'bar' ? 'active' : ''}`}
                      style={{ fontSize: 11, padding: '2px 8px', height: 24 }}
                    >
                      Bar
                    </button>
                  </div>
                </div>

                {snapshots.length === 0 ? (
                  <div style={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '0 20px' }}>
                    <Activity size={22} style={{ marginBottom: 6, opacity: 0.5 }} />
                    <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>No snapshots recorded yet</span>
                    <span style={{ fontSize: 11, marginTop: 2 }}>Monthly checkpoints are saved to your database as your balances update.</span>
                  </div>
                ) : (
                  <div style={{ height: 180, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {chartView === 'area' ? (
                        <AreaChart data={snapshots}>
                          <defs>
                            <linearGradient id="nwG" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                          <XAxis dataKey="snapshot_date" tick={{ fontSize: 10.5, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10.5, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Area type="monotone" name="Net Worth" dataKey="net_worth" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#nwG)" />
                        </AreaChart>
                      ) : (
                        <BarChart data={snapshots}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                          <XAxis dataKey="snapshot_date" tick={{ fontSize: 10.5, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10.5, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Bar dataKey="total_assets" name="Gross Assets" fill="#16a34a" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="total_liabilities" name="Liabilities" fill="#dc2626" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Asset Allocation Split Donut */}
              <div className="card" style={{ padding: '20px 22px' }}>
                <div className="card-header" style={{ marginBottom: 10 }}>
                  <div className="card-title">Portfolio Asset Split</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Distribution across {assetAllocationData.length} classes</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, height: 150 }}>
                  <div style={{ width: '45%', height: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={assetAllocationData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={34} outerRadius={52} paddingAngle={3}>
                          {assetAllocationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ width: '55%', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', maxHeight: 140, paddingRight: 4 }}>
                    {assetAllocationData.map(item => (
                      <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                          <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)', marginLeft: 6 }}>
                          {((item.value / (totalAssets || 1)) * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: LOANS, EMIs & LENDING SUITE                                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'loans' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Loans, EMIs & Lending Manager</h2>
              <span className="text-xs text-slate-500">Track liabilities you owe with live amortization, plus money you lent to others.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLoanModal(true)}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                <Plus size={14} />
                <span>Borrow Loan</span>
              </button>
              <button
                onClick={() => setShowLentModal(true)}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                <HandCoins size={14} />
                <span>Lend Money</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HandCoins size={16} className="text-emerald-500" />
              <span>Money You Lent to Others (Receivable Asset)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {moneyLent.map(lent => {
                const pending = Math.max(0, Number(lent.amount_lent) - Number(lent.amount_recovered))
                const recoveredPct = Math.min(100, Math.round((Number(lent.amount_recovered) / (Number(lent.amount_lent) || 1)) * 100))

                return (
                  <div
                    key={lent.id}
                    className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-emerald-500/30 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">{lent.borrower_name}</span>
                            {lent.interest_rate > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 font-mono">
                                {lent.interest_rate}% p.a.
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">Lent on {new Date(lent.lent_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                        </div>
                        <button onClick={() => handleDeleteLent(lent.id)} className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 my-3">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                          <span className="text-[10px] uppercase font-semibold text-slate-400">Pending</span>
                          <div className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{fmt(pending)}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                          <span className="text-[10px] uppercase font-semibold text-slate-400">Total Lent</span>
                          <div className="text-sm font-extrabold font-mono text-slate-800 dark:text-slate-200">{fmtFull(lent.amount_lent)}</div>
                        </div>
                      </div>

                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>Recovered: {recoveredPct}%</span>
                          <span>{fmt(lent.amount_recovered)}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${recoveredPct}%` }} />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowRecoverModal(lent)}
                      className="w-full py-2 text-xs font-bold rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle size={14} /> Record Repayment
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard size={16} className="text-rose-500" />
              <span>Borrowing & Debt Obligations (Liabilities)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loans.map(loan => {
                const outstanding = calcLoanOutstanding(loan)
                const paidAmount = Math.max(0, Number(loan.original_amount) - outstanding)
                const paidPct = Math.min(100, Math.round((paidAmount / (loan.original_amount || 1)) * 100))

                return (
                  <div
                    key={loan.id}
                    className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">{loan.lender_name}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 font-mono">
                              {loan.roi}% p.a.
                            </span>
                          </div>
                          <span className="text-xs text-slate-400">{loan.nickname || loan.loan_type}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setShowSimulatorModal(loan)} className="text-blue-600 hover:text-blue-700 p-1 cursor-pointer">
                            <Zap size={15} />
                          </button>
                          <button onClick={() => handleDeleteLoan(loan.id)} className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 my-3">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                          <span className="text-[10px] uppercase font-semibold text-slate-400">Outstanding</span>
                          <div className="text-sm font-extrabold font-mono text-rose-600 dark:text-rose-400">{fmt(outstanding)}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                          <span className="text-[10px] uppercase font-semibold text-slate-400">Monthly EMI</span>
                          <div className="text-sm font-extrabold font-mono text-slate-800 dark:text-slate-200">{fmtFull(loan.emi_amount)}</div>
                        </div>
                      </div>

                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>Repaid: {paidPct}%</span>
                          <span>Total: {fmt(loan.original_amount)}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-blue-600 h-full rounded-full" style={{ width: `${paidPct}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button onClick={() => setShowSimulatorModal(loan)} className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition flex items-center justify-center gap-1 cursor-pointer">
                        <Zap size={13} /> Pre-pay Sim
                      </button>
                      <button onClick={() => setShowAmortizationModal(loan)} className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition flex items-center justify-center gap-1 cursor-pointer">
                        <TableProperties size={13} /> Schedule
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: FINANCIAL GOALS                                              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'goals' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Financial Goals & Milestones</h2>
              <span className="text-xs text-slate-500">Plan milestones and let compounding calculate your monthly savings SIP requirement.</span>
            </div>
            <button
              onClick={() => { setEditingGoal(null); setShowGoalModal(true) }}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              <Plus size={15} />
              <span>Create Financial Goal</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {goals.map(goal => {
              const pct = Math.min(100, Math.round((goal.current_amount / (goal.target_amount || 1)) * 100))
              const remaining = Math.max(0, goal.target_amount - goal.current_amount)
              const daysLeft = goal.target_date ? Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / 86400000) : null
              const monthsLeft = daysLeft ? Math.max(1, Math.ceil(daysLeft / 30.44)) : 12
              const reqMonthly = Math.round(remaining / monthsLeft)

              return (
                <div
                  key={goal.id}
                  className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-xs">
                          {renderGoalIcon(goal.icon_name)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{goal.name}</h4>
                          <span className="text-[11px] text-slate-400">
                            {goal.target_date ? `Due in ${monthsLeft} months` : 'Open timeline'}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteGoal(goal.id)} className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="my-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white">{fmt(goal.current_amount)}</span>
                        <span className="text-xs font-medium text-slate-400 font-mono">/ {fmt(goal.target_amount)}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: goal.color }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                        <span>{pct}% Achieved</span>
                        <span>{fmt(remaining)} to go</span>
                      </div>
                    </div>

                    {remaining > 0 && (
                      <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 mb-3">
                        <span className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold block">Required Monthly SIP</span>
                        <div className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400">
                          {fmtFull(reqMonthly)}/month
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setShowContributeModal(goal)}
                    className="w-full py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus size={14} /> Add Funds to Goal
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: FIXED DEPOSITS                                               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'fds' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Fixed Deposits & Term Wealth</h2>
              <span className="text-xs text-slate-500">Live compounding accrued value against verified Scheduled Bank deposits.</span>
            </div>
            <button
              onClick={() => setShowFdModal(true)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              <Plus size={15} />
              <span>Add Fixed Deposit</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fds.map(fd => {
              const liveVal = calcFDValue(fd)
              const maturityVal = calcFDMaturityValue(fd.principal, fd.rate, (new Date(fd.maturity_date).getTime() - new Date(fd.start_date).getTime()) / (365.25 * 86400000), fd.compounding)
              const accruedProfit = Math.max(0, liveVal - fd.principal)

              return (
                <div
                  key={fd.id}
                  className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{fd.bank_name}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 font-mono">
                            {fd.rate}% p.a.
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">{fd.nickname || 'Term Deposit'}</span>
                      </div>
                      <button onClick={() => handleDeleteFD(fd.id)} className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 my-3">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                        <span className="text-[10px] uppercase font-semibold text-slate-400">Current Value</span>
                        <div className="text-sm font-extrabold font-mono text-cyan-600 dark:text-cyan-400">{fmtFull(liveVal)}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                        <span className="text-[10px] uppercase font-semibold text-slate-400">At Maturity</span>
                        <div className="text-sm font-extrabold font-mono text-slate-800 dark:text-slate-200">{fmtFull(maturityVal)}</div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-500 mb-3">
                      <div className="flex justify-between">
                        <span>Principal Invested:</span>
                        <span className="font-mono font-bold">{fmtFull(fd.principal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Accrued Interest:</span>
                        <span className="font-mono font-bold text-emerald-600">+{fmtFull(accruedProfit)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Maturity Date:</span>
                        <span>{new Date(fd.maturity_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 5: INVESTMENTS & REAL ASSETS                                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'assets' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Equities, Gold, Retirals & Properties</h2>
              <span className="text-xs text-slate-500">Live valuations across liquid market investments and illiquid tangible holdings.</span>
            </div>
            <button
              onClick={() => setShowAssetModal(true)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              <Plus size={15} />
              <span>Add Asset / Investment</span>
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-500" />
              <span>Financial & Market Holdings</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {investments.map(inv => {
                const gain = Number(inv.current_value) - Number(inv.invested_amount)
                const gainPct = (((gain) / (Number(inv.invested_amount) || 1)) * 100).toFixed(1)

                return (
                  <div
                    key={inv.id}
                    className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{inv.name}</h4>
                          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">{inv.type.replace('_', ' ')}</span>
                        </div>
                        <button onClick={() => handleDeleteInvestment(inv.id)} className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 my-3">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                          <span className="text-[10px] uppercase font-semibold text-slate-400">Current</span>
                          <div className="text-sm font-extrabold font-mono text-slate-900 dark:text-white">{fmtFull(inv.current_value)}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                          <span className="text-[10px] uppercase font-semibold text-slate-400">Invested</span>
                          <div className="text-sm font-extrabold font-mono text-slate-500">{fmtFull(inv.invested_amount)}</div>
                        </div>
                      </div>

                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">Total Return:</span>
                        <span className={`font-bold ${gain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {gain >= 0 ? '+' : ''}{fmt(gain)} ({gainPct}%)
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 size={16} className="text-slate-500" />
              <span>Real Estate & Physical Assets</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {physicalAssets.map(asset => (
                <div
                  key={asset.id}
                  className="rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{asset.name}</h4>
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">{asset.type}</span>
                      </div>
                      <button onClick={() => handleDeletePhysical(asset.id)} className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 my-3">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                        <span className="text-[10px] uppercase font-semibold text-slate-400">Market Val</span>
                        <div className="text-sm font-extrabold font-mono text-slate-900 dark:text-white">{fmt(asset.current_value)}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                        <span className="text-[10px] uppercase font-semibold text-slate-400">Purchase</span>
                        <div className="text-sm font-extrabold font-mono text-slate-500">{fmt(asset.purchase_value)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 6: CFO INTERACTIVE FINANCIAL CALCULATORS                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'calculators' && (
        <CfoCalculatorsSuite
          currentNetWorth={netWorth}
          totalLiquidCash={totalLiquidCash}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODALS & DIALOGS (100% FIXED FULLSCREEN BACKDROP WITHOUT CLIPPING)  */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      {/* Update Bank Balance Modal */}
      {showUpdateBalanceModal && (
        <ModalPortal>
          <UpdateBalanceModal
            currentBalance={bankBalance}
            onClose={() => setShowUpdateBalanceModal(false)}
            onSave={handleUpdateBankBalance}
          />
        </ModalPortal>
      )}

      {/* Goal Modal */}
      {showGoalModal && (
        <ModalPortal>
          <GoalModal
            goal={editingGoal}
            onClose={() => { setShowGoalModal(false); setEditingGoal(null) }}
            onSave={handleSaveGoal}
          />
        </ModalPortal>
      )}

      {/* Goal Contribution Modal */}
      {showContributeModal && (
        <ModalPortal>
          <ContributeGoalModal
            goal={showContributeModal}
            onClose={() => setShowContributeModal(null)}
            onAdd={amt => handleContributeGoal(showContributeModal.id, amt)}
          />
        </ModalPortal>
      )}

      {/* FD Modal */}
      {showFdModal && (
        <ModalPortal>
          <FDModal
            onClose={() => setShowFdModal(false)}
            onSave={handleSaveFD}
          />
        </ModalPortal>
      )}

      {/* Loan Modal */}
      {showLoanModal && (
        <ModalPortal>
          <LoanModal
            onClose={() => setShowLoanModal(false)}
            onSave={handleSaveLoan}
          />
        </ModalPortal>
      )}

      {/* Money Lent Modal */}
      {showLentModal && (
        <ModalPortal>
          <MoneyLentModal
            onClose={() => setShowLentModal(false)}
            onSave={handleSaveLent}
          />
        </ModalPortal>
      )}

      {/* Recover Lent Modal */}
      {showRecoverModal && (
        <ModalPortal>
          <RecoverLentModal
            lent={showRecoverModal}
            onClose={() => setShowRecoverModal(null)}
            onRecover={amt => handleRecoverLent(showRecoverModal.id, amt)}
          />
        </ModalPortal>
      )}

      {/* Asset Modal (with full Type Dropdown) */}
      {showAssetModal && (
        <ModalPortal>
          <AssetModal
            onClose={() => setShowAssetModal(false)}
            onSave={handleSaveAsset}
          />
        </ModalPortal>
      )}

      {/* Pre-payment Simulator Modal */}
      {showSimulatorModal && (
        <ModalPortal>
          <PrepaymentSimulatorModal
            loan={showSimulatorModal}
            onClose={() => setShowSimulatorModal(null)}
          />
        </ModalPortal>
      )}

      {/* Amortization Schedule Modal */}
      {showAmortizationModal && (
        <ModalPortal>
          <AmortizationScheduleModal
            loan={showAmortizationModal}
            onClose={() => setShowAmortizationModal(null)}
          />
        </ModalPortal>
      )}
    </div>
  )
}

// ─── Interactive CFO Calculators Suite Component ─────────────────────────────

function CfoCalculatorsSuite({ currentNetWorth, totalLiquidCash }: { currentNetWorth: number, totalLiquidCash: number }) {
  const [calcTab, setCalcTab] = useState<'fire' | 'sip' | 'loan' | 'fd'>('fire')

  // FIRE Calculator State
  const [fireExpense, setFireExpense] = useState(100000)
  const [fireSwr, setFireSwr] = useState(4.0) // 4% Rule
  const [fireInflation, setFireInflation] = useState(6.0)
  const [yearsToRetire, setYearsToRetire] = useState(15)

  // SIP Calculator State
  const [sipMonthly, setSipMonthly] = useState(25000)
  const [sipReturnRate, setSipReturnRate] = useState(12)
  const [sipYears, setSipYears] = useState(15)
  const [sipStepUp, setSipStepUp] = useState(10) // 10% annual step-up

  // Loan Prepayment Calculator State
  const [loanPrincipal, setLoanPrincipal] = useState(4500000)
  const [loanRate, setLoanRate] = useState(8.5)
  const [loanTenureYears, setLoanTenureYears] = useState(20)
  const [loanPrepayMonthly, setLoanPrepayMonthly] = useState(5000)

  // FD Calculator State
  const [fdPrincipal, setFdPrincipal] = useState(250000)
  const [fdRate, setFdRate] = useState(7.25)
  const [fdTenureMonths, setFdTenureMonths] = useState(24)
  const [fdCompounding, setFdCompounding] = useState<'quarterly' | 'monthly' | 'yearly'>('quarterly')

  // FIRE Computed Values
  const annualExpense = fireExpense * 12
  const targetFireCorpus = (annualExpense * 100) / fireSwr
  const leanFireCorpus = targetFireCorpus * 0.75
  const fatFireCorpus = targetFireCorpus * 1.5
  const futureAnnualExpense = annualExpense * Math.pow(1 + fireInflation / 100, yearsToRetire)
  const inflationAdjustedTarget = (futureAnnualExpense * 100) / fireSwr

  // SIP Computed Values (with Step-Up support)
  const sipResult = useMemo(() => {
    let invested = 0
    let corpus = 0
    let monthlyRate = sipReturnRate / 100 / 12
    let currentSip = sipMonthly

    for (let yr = 1; yr <= sipYears; yr++) {
      for (let m = 1; m <= 12; m++) {
        invested += currentSip
        corpus = (corpus + currentSip) * (1 + monthlyRate)
      }
      currentSip = currentSip * (1 + sipStepUp / 100)
    }

    const returns = Math.max(0, corpus - invested)
    return { invested: Math.round(invested), returns: Math.round(returns), total: Math.round(corpus) }
  }, [sipMonthly, sipReturnRate, sipYears, sipStepUp])

  // Loan Computed Values
  const loanResult = useMemo(() => {
    const p = loanPrincipal
    const r = loanRate / 100 / 12
    const n = loanTenureYears * 12
    if (r <= 0 || n <= 0 || p <= 0) return { emi: 0, totalInterest: 0, interestSaved: 0, monthsSaved: 0, newMonths: 0 }

    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    const baseTotalInterest = (emi * n) - p

    // With Prepayment
    const newEmi = emi + loanPrepayMonthly
    let balance = p
    let months = 0
    let newTotalInterest = 0
    while (balance > 0 && months < n * 2) {
      months++
      const interest = balance * r
      newTotalInterest += interest
      const principalPaid = Math.min(balance, newEmi - interest)
      balance = Math.max(0, balance - principalPaid)
    }

    const interestSaved = Math.max(0, baseTotalInterest - newTotalInterest)
    const monthsSaved = Math.max(0, n - months)

    return {
      emi: Math.round(emi),
      totalInterest: Math.round(baseTotalInterest),
      interestSaved: Math.round(interestSaved),
      monthsSaved,
      newMonths: months
    }
  }, [loanPrincipal, loanRate, loanTenureYears, loanPrepayMonthly])

  // FD Computed Values
  const fdResult = useMemo(() => {
    const p = fdPrincipal
    const r = fdRate / 100
    const years = fdTenureMonths / 12
    const n = fdCompounding === 'monthly' ? 12 : fdCompounding === 'quarterly' ? 4 : 1
    const maturity = p * Math.pow(1 + r / n, n * years)
    const interest = Math.max(0, maturity - p)
    return { maturity: Math.round(maturity), interest: Math.round(interest) }
  }, [fdPrincipal, fdRate, fdTenureMonths, fdCompounding])

  return (
    <div className="space-y-6">
      <div className="card" style={{ padding: '16px 20px', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator size={18} className="text-blue-600" />
              <span>Financial Planning Tools & Calculators</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Plan your retirement, calculate SIP wealth growth, optimize loan prepayments, and compute fixed deposit returns.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'fire', label: 'FIRE Retirement', icon: Flame },
              { id: 'sip', label: 'SIP Compounding', icon: TrendingUp },
              { id: 'loan', label: 'EMI & Prepayment', icon: CreditCard },
              { id: 'fd', label: 'Fixed Deposit Growth', icon: Landmark },
            ].map(tab => {
              const Icon = tab.icon
              const isActive = calcTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setCalcTab(tab.id as any)}
                  className={`filter-chip ${isActive ? 'active' : ''}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── FIRE Retirement Calculator ────────────────────────────── */}
      {calcTab === 'fire' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 card" style={{ padding: '22px' }}>
            <div className="card-header" style={{ marginBottom: 16 }}>
              <div className="card-title flex items-center gap-2">
                <Flame size={16} className="text-rose-500" />
                FIRE Retirement Parameters
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Monthly Living Expenses (Current ₹)</span>
                  <span className="font-mono text-rose-600 font-bold">{fmtFull(fireExpense)}/mo</span>
                </div>
                <input
                  type="range"
                  min={25000}
                  max={500000}
                  step={5000}
                  value={fireExpense}
                  onChange={e => setFireExpense(Number(e.target.value))}
                  className="w-full accent-rose-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Safe Withdrawal Rate (% SWR)</label>
                  <select
                    className="select w-full"
                    value={fireSwr}
                    onChange={e => setFireSwr(Number(e.target.value))}
                  >
                    <option value={4.0}>4.0% (Standard 25x Rule)</option>
                    <option value={3.5}>3.5% (Conservative 28.5x)</option>
                    <option value={3.0}>3.0% (Ultra Safe 33x)</option>
                    <option value={4.5}>4.5% (Aggressive 22x)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Expected Inflation (% p.a.)</label>
                  <select
                    className="select w-full"
                    value={fireInflation}
                    onChange={e => setFireInflation(Number(e.target.value))}
                  >
                    <option value={5.0}>5.0% Inflation</option>
                    <option value={6.0}>6.0% Inflation (India Avg)</option>
                    <option value={7.0}>7.0% Inflation</option>
                    <option value={8.0}>8.0% Inflation</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Time Horizon to Retirement (Years)</span>
                  <span className="font-mono text-blue-600 font-bold">{yearsToRetire} Years</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={35}
                  step={1}
                  value={yearsToRetire}
                  onChange={e => setYearsToRetire(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="card" style={{ padding: '22px' }}>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Target FIRE Corpus (Today's Value)</span>
              <div className="text-3xl font-extrabold font-mono text-rose-600 my-1">{fmt(targetFireCorpus)}</div>
              <div className="text-xs text-slate-500">Generates {fmtFull(fireExpense)}/mo forever at {fireSwr}% safe withdrawal.</div>

              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Lean FIRE (75% Budget)</span>
                  <div className="text-base font-extrabold font-mono text-slate-800 dark:text-slate-200">{fmt(leanFireCorpus)}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Fat FIRE (150% Budget)</span>
                  <div className="text-base font-extrabold font-mono text-slate-800 dark:text-slate-200">{fmt(fatFireCorpus)}</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '18px 22px' }}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Inflation-Adjusted Target in {yearsToRetire} yrs</span>
                  <div className="text-2xl font-extrabold font-mono text-blue-600 mt-0.5">{fmt(inflationAdjustedTarget)}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400">Future Monthly Need</span>
                  <div className="text-sm font-bold font-mono text-slate-700 dark:text-slate-300">{fmt(futureAnnualExpense / 12)}/mo</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SIP Wealth Compounder ──────────────────────────────────── */}
      {calcTab === 'sip' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 card" style={{ padding: '22px' }}>
            <div className="card-header" style={{ marginBottom: 16 }}>
              <div className="card-title flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-500" />
                SIP Compounding Parameters
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Monthly Investment (₹)</span>
                  <span className="font-mono text-emerald-600 font-bold">{fmtFull(sipMonthly)}/mo</span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={200000}
                  step={1000}
                  value={sipMonthly}
                  onChange={e => setSipMonthly(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Expected Annual Return (% CAGR)</span>
                  <span className="font-mono text-blue-600 font-bold">{sipReturnRate}% p.a.</span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={24}
                  step={0.5}
                  value={sipReturnRate}
                  onChange={e => setSipReturnRate(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Tenure (Years)</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{sipYears} yrs</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={35}
                    step={1}
                    value={sipYears}
                    onChange={e => setSipYears(Number(e.target.value))}
                    className="w-full accent-slate-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Annual Step-Up (%)</span>
                    <span className="font-mono text-purple-600 font-bold">{sipStepUp}%/yr</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={25}
                    step={5}
                    value={sipStepUp}
                    onChange={e => setSipStepUp(Number(e.target.value))}
                    className="w-full accent-purple-600"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 card" style={{ padding: '22px' }}>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Total Maturity Corpus</span>
            <div className="text-3xl font-extrabold font-mono text-emerald-600 my-1">{fmt(sipResult.total)}</div>
            <span className="text-xs text-slate-500 font-mono">Full Amount: {fmtFull(sipResult.total)}</span>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Invested</span>
                <div className="text-lg font-extrabold font-mono text-slate-700 dark:text-slate-300">{fmt(sipResult.invested)}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                <span className="text-[10px] uppercase font-bold text-emerald-600">Wealth Gain (Returns)</span>
                <div className="text-lg font-extrabold font-mono text-emerald-600">+{fmt(sipResult.returns)}</div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-slate-500 font-mono">
                <span>Invested: {((sipResult.invested / (sipResult.total || 1)) * 100).toFixed(0)}%</span>
                <span>Returns: {((sipResult.returns / (sipResult.total || 1)) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden flex">
                <div className="bg-slate-400 h-full" style={{ width: `${(sipResult.invested / (sipResult.total || 1)) * 100}%` }} />
                <div className="bg-emerald-500 h-full" style={{ width: `${(sipResult.returns / (sipResult.total || 1)) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Loan EMI & Pre-payment Optimizer ──────────────────────── */}
      {calcTab === 'loan' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 card" style={{ padding: '22px' }}>
            <div className="card-header" style={{ marginBottom: 16 }}>
              <div className="card-title flex items-center gap-2">
                <CreditCard size={16} className="text-rose-500" />
                Loan & Pre-payment Parameters
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Loan Principal Amount (₹)</span>
                  <span className="font-mono text-slate-900 dark:text-white font-bold">{fmt(loanPrincipal)}</span>
                </div>
                <input
                  type="range"
                  min={100000}
                  max={15000000}
                  step={50000}
                  value={loanPrincipal}
                  onChange={e => setLoanPrincipal(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600 dark:text-slate-400">ROI (% p.a.)</span>
                    <span className="font-mono text-rose-600 font-bold">{loanRate}%</span>
                  </div>
                  <input
                    type="range"
                    min={6.0}
                    max={18.0}
                    step={0.1}
                    value={loanRate}
                    onChange={e => setLoanRate(Number(e.target.value))}
                    className="w-full accent-rose-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Tenure (Years)</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{loanTenureYears} yrs</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    step={1}
                    value={loanTenureYears}
                    onChange={e => setLoanTenureYears(Number(e.target.value))}
                    className="w-full accent-slate-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Extra Monthly Pre-payment (₹)</span>
                  <span className="font-mono text-emerald-600 font-bold">+{fmtFull(loanPrepayMonthly)}/mo</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50000}
                  step={1000}
                  value={loanPrepayMonthly}
                  onChange={e => setLoanPrepayMonthly(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 card" style={{ padding: '22px' }}>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Monthly Base EMI</span>
            <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white my-1">{fmtFull(loanResult.emi)}</div>
            <div className="text-xs text-slate-500">Total Standard Interest: <strong className="font-mono text-rose-600">{fmt(loanResult.totalInterest)}</strong></div>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                <span className="text-[10px] uppercase font-bold text-emerald-600">Interest Saved</span>
                <div className="text-xl font-extrabold font-mono text-emerald-600">{fmt(loanResult.interestSaved)}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40">
                <span className="text-[10px] uppercase font-bold text-blue-600">Tenure Reduced By</span>
                <div className="text-lg font-extrabold font-mono text-blue-600">{Math.floor(loanResult.monthsSaved / 12)}y {loanResult.monthsSaved % 12}m</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <span>New Effective Tenure:</span>
              <span className="font-mono font-bold text-blue-600">{Math.floor(loanResult.newMonths / 12)}y {loanResult.newMonths % 12}m ({loanResult.newMonths} months)</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Fixed Deposit Maturity Engine ─────────────────────────── */}
      {calcTab === 'fd' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 card" style={{ padding: '22px' }}>
            <div className="card-header" style={{ marginBottom: 16 }}>
              <div className="card-title flex items-center gap-2">
                <Landmark size={16} className="text-cyan-500" />
                FD Term Parameters
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Deposit Principal (₹)</span>
                  <span className="font-mono text-cyan-600 font-bold">{fmtFull(fdPrincipal)}</span>
                </div>
                <input
                  type="range"
                  min={10000}
                  max={2500000}
                  step={10000}
                  value={fdPrincipal}
                  onChange={e => setFdPrincipal(Number(e.target.value))}
                  className="w-full accent-cyan-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Interest Rate (% p.a.)</span>
                    <span className="font-mono text-cyan-600 font-bold">{fdRate}%</span>
                  </div>
                  <input
                    type="range"
                    min={4.0}
                    max={9.5}
                    step={0.05}
                    value={fdRate}
                    onChange={e => setFdRate(Number(e.target.value))}
                    className="w-full accent-cyan-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Tenure (Months)</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{fdTenureMonths}m</span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={120}
                    step={3}
                    value={fdTenureMonths}
                    onChange={e => setFdTenureMonths(Number(e.target.value))}
                    className="w-full accent-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Compounding Frequency</label>
                <select
                  className="select w-full"
                  value={fdCompounding}
                  onChange={e => setFdCompounding(e.target.value as any)}
                >
                  <option value="quarterly">Quarterly Compounding (Indian Banks Standard)</option>
                  <option value="monthly">Monthly Compounding</option>
                  <option value="yearly">Annual Compounding</option>
                </select>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 card" style={{ padding: '22px' }}>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Maturity Payout Value</span>
            <div className="text-3xl font-extrabold font-mono text-cyan-600 my-1">{fmt(fdResult.maturity)}</div>
            <div className="text-xs text-slate-500 font-mono">Full Amount: {fmtFull(fdResult.maturity)}</div>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400">Principal Deposited</span>
                <div className="text-lg font-extrabold font-mono text-slate-700 dark:text-slate-300">{fmtFull(fdPrincipal)}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40">
                <span className="text-[10px] uppercase font-bold text-cyan-600">Total Interest Earned</span>
                <div className="text-lg font-extrabold font-mono text-cyan-600">+{fmtFull(fdResult.interest)}</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
              Effective Annual Yield: <strong className="font-mono text-cyan-600">{(((fdResult.maturity - fdPrincipal) / (fdPrincipal || 1)) / (fdTenureMonths / 12) * 100).toFixed(2)}% p.a.</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-Modal Components (Full-screen Fixed Backdrops) ──────────────────────

function UpdateBalanceModal({ currentBalance, onClose, onSave }: { currentBalance: number, onClose: () => void, onSave: (val: number) => void }) {
  const [val, setVal] = useState(String(currentBalance))

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 999999,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet size={16} className="text-emerald-500" />
            <span>Update Liquid Bank Balance</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-3">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Operational Bank Balance (₹)</label>
          <input
            type="number"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            value={val}
            onChange={e => setVal(e.target.value)}
            autoFocus
          />
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">Cancel</button>
          <button onClick={() => onSave(Number(val))} className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer">Save Balance</button>
        </div>
      </div>
    </div>
  )
}

function GoalModal({ goal, onClose, onSave }: { goal: Goal | null, onClose: () => void, onSave: (d: Partial<Goal>) => void }) {
  const [name, setName] = useState(goal?.name || '')
  const [iconName, setIconName] = useState(goal?.icon_name || 'Target')
  const [targetAmount, setTargetAmount] = useState(goal ? String(goal.target_amount) : '')
  const [currentAmount, setCurrentAmount] = useState(goal ? String(goal.current_amount) : '')
  const [targetDate, setTargetDate] = useState(goal?.target_date || '')
  const [color, setColor] = useState(goal?.color || '#3b82f6')

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 999999,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{goal ? 'Edit Goal' : 'Create Financial Goal'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Icon</label>
              <select className="w-full text-xs py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={iconName} onChange={e => setIconName(e.target.value)}>
                <option value="Target">Target</option>
                <option value="Shield">Shield</option>
                <option value="Plane">Plane</option>
                <option value="Home">Home</option>
                <option value="GraduationCap">Education</option>
              </select>
            </div>
            <div className="col-span-3">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Goal Name</label>
              <input className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" placeholder="e.g. Emergency Fund" value={name} onChange={e => setName(e.target.value)} autoFocus />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Target Amount (₹)</label>
              <input type="number" className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" placeholder="500000" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Saved So Far (₹)</label>
              <input type="number" className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" placeholder="100000" value={currentAmount} onChange={e => setCurrentAmount(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Target Date</label>
            <input type="date" className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 cursor-pointer">Cancel</button>
          <button onClick={() => onSave({ name, icon_name: iconName, target_amount: Number(targetAmount), current_amount: Number(currentAmount || 0), target_date: targetDate, color })} className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 cursor-pointer" disabled={!name || !targetAmount}>Save Goal</button>
        </div>
      </div>
    </div>
  )
}

function ContributeGoalModal({ goal, onClose, onAdd }: { goal: Goal, onClose: () => void, onAdd: (amt: number) => void }) {
  const [amt, setAmt] = useState('')
  const remaining = Math.max(0, goal.target_amount - goal.current_amount)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 999999,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {renderGoalIcon(goal.icon_name)}
            <span>Add Funds to {goal.name}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-500">Remaining to target: <strong className="text-blue-600 font-mono">{fmt(remaining)}</strong></p>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Contribution Amount (₹)</label>
            <input type="number" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" placeholder="10000" value={amt} onChange={e => setAmt(e.target.value)} autoFocus />
          </div>
          <div className="flex gap-2">
            {[5000, 10000, 25000, 50000].map(val => (
              <button key={val} onClick={() => setAmt(String(val))} className="flex-1 py-1.5 text-[11px] font-mono font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer">
                +{fmt(val)}
              </button>
            ))}
          </div>
        </div>
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 cursor-pointer">Cancel</button>
          <button onClick={() => onAdd(Number(amt))} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white cursor-pointer" disabled={!amt || Number(amt) <= 0}>Add Contribution</button>
        </div>
      </div>
    </div>
  )
}

function FDModal({ onClose, onSave }: { onClose: () => void, onSave: (d: any) => void }) {
  const [bankName, setBankName] = useState('HDFC Bank')
  const [nickname, setNickname] = useState('')
  const [principal, setPrincipal] = useState('')
  const [rate, setRate] = useState('7.25')
  const [compounding, setCompounding] = useState('quarterly')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [maturityDate, setMaturityDate] = useState(new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 999999,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Landmark size={18} className="text-cyan-500" />
            <span>Add Fixed Deposit (FD)</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Bank Name</label>
              <input className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" placeholder="e.g. HDFC Bank" value={bankName} onChange={e => setBankName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Nickname (Optional)</label>
              <input className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" placeholder="e.g. Emergency FD" value={nickname} onChange={e => setNickname(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Principal (₹)</label>
              <input type="number" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" placeholder="100000" value={principal} onChange={e => setPrincipal(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Interest Rate (% p.a.)</label>
              <input type="number" step="0.05" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" placeholder="7.25" value={rate} onChange={e => setRate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Compounding</label>
              <select className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={compounding} onChange={e => setCompounding(e.target.value)}>
                <option value="quarterly">Quarterly (Most Common)</option>
                <option value="monthly">Monthly</option>
                <option value="half_yearly">Half Yearly</option>
                <option value="yearly">Yearly</option>
                <option value="simple">Simple Interest</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Maturity Date</label>
              <input type="date" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={maturityDate} onChange={e => setMaturityDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 cursor-pointer">Cancel</button>
          <button onClick={() => onSave({ bank_name: bankName, nickname, principal: Number(principal), rate: Number(rate), compounding, start_date: startDate, maturity_date: maturityDate })} className="px-4 py-2 text-xs font-bold rounded-xl bg-cyan-600 text-white cursor-pointer" disabled={!principal}>Save FD</button>
        </div>
      </div>
    </div>
  )
}

function LoanModal({ onClose, onSave }: { onClose: () => void, onSave: (d: any) => void }) {
  const [lenderName, setLenderName] = useState('')
  const [loanType, setLoanType] = useState('home')
  const [originalAmount, setOriginalAmount] = useState('')
  const [roi, setRoi] = useState('8.5')
  const [tenureMonths, setTenureMonths] = useState('240')
  const [disbursementDate, setDisbursementDate] = useState(new Date().toISOString().split('T')[0])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 999999,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard size={18} className="text-rose-500" />
            <span>Add Loan Liability</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Lender / Bank</label>
              <input className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" placeholder="e.g. SBI Home Loans" value={lenderName} onChange={e => setLenderName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Loan Type</label>
              <select className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={loanType} onChange={e => setLoanType(e.target.value)}>
                <option value="home">Home Loan</option>
                <option value="car">Vehicle / Auto Loan</option>
                <option value="personal">Personal Loan</option>
                <option value="education">Education Loan</option>
                <option value="business">Business Loan</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Principal Amount (₹)</label>
              <input type="number" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" placeholder="2500000" value={originalAmount} onChange={e => setOriginalAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Interest Rate (% p.a.)</label>
              <input type="number" step="0.1" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" placeholder="8.75" value={roi} onChange={e => setRoi(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Tenure (Months)</label>
              <input type="number" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" placeholder="240" value={tenureMonths} onChange={e => setTenureMonths(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Disbursement Date</label>
              <input type="date" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={disbursementDate} onChange={e => setDisbursementDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 cursor-pointer">Cancel</button>
          <button onClick={() => onSave({ lender_name: lenderName, loan_type: loanType, original_amount: Number(originalAmount), roi: Number(roi), tenure_months: Number(tenureMonths), disbursement_date: disbursementDate })} className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white cursor-pointer" disabled={!lenderName || !originalAmount || !tenureMonths}>Save Loan</button>
        </div>
      </div>
    </div>
  )
}

function MoneyLentModal({ onClose, onSave }: { onClose: () => void, onSave: (d: any) => void }) {
  const [borrowerName, setBorrowerName] = useState('')
  const [amountLent, setAmountLent] = useState('')
  const [amountRecovered, setAmountRecovered] = useState('')
  const [interestRate, setInterestRate] = useState('0')
  const [lentDate, setLentDate] = useState(new Date().toISOString().split('T')[0])
  const [expectedReturnDate, setExpectedReturnDate] = useState('')

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 999999,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <HandCoins size={18} className="text-emerald-500" />
            <span>Record Money Lent</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Borrower Name (Person / Business)</label>
            <input className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" placeholder="e.g. Rohan Sharma" value={borrowerName} onChange={e => setBorrowerName(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Amount Lent (₹)</label>
              <input type="number" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" placeholder="50000" value={amountLent} onChange={e => setAmountLent(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Already Recovered (₹)</label>
              <input type="number" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" placeholder="0" value={amountRecovered} onChange={e => setAmountRecovered(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Date Lent</label>
              <input type="date" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={lentDate} onChange={e => setLentDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Expected Return Date</label>
              <input type="date" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" value={expectedReturnDate} onChange={e => setExpectedReturnDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 cursor-pointer">Cancel</button>
          <button onClick={() => onSave({ borrower_name: borrowerName, amount_lent: Number(amountLent), amount_recovered: Number(amountRecovered || 0), interest_rate: Number(interestRate || 0), lent_date: lentDate, expected_return_date: expectedReturnDate })} className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer" disabled={!borrowerName || !amountLent}>Save Receivable</button>
        </div>
      </div>
    </div>
  )
}

function RecoverLentModal({ lent, onClose, onRecover }: { lent: MoneyLent, onClose: () => void, onRecover: (amt: number) => void }) {
  const [amt, setAmt] = useState('')
  const pending = Math.max(0, Number(lent.amount_lent) - Number(lent.amount_recovered))

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 999999,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Record Repayment from {lent.borrower_name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-500">
            Pending Balance: <strong className="text-emerald-600 font-mono">{fmtFull(pending)}</strong>
          </p>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Amount Returned (₹)</label>
            <input type="number" className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono" placeholder="Enter amount" value={amt} onChange={e => setAmt(e.target.value)} autoFocus />
          </div>
          <button onClick={() => setAmt(String(pending))} className="w-full py-1.5 text-xs font-mono font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 cursor-pointer">
            Full Settlement ({fmt(pending)})
          </button>
        </div>
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 cursor-pointer">Cancel</button>
          <button onClick={() => onRecover(Number(amt))} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white cursor-pointer" disabled={!amt || Number(amt) <= 0}>Confirm</button>
        </div>
      </div>
    </div>
  )
}

function AssetModal({ onClose, onSave }: { onClose: () => void, onSave: (d: any) => void }) {
  const [isPhysical, setIsPhysical] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('mutual_fund')
  const [investedAmount, setInvestedAmount] = useState('')
  const [currentValue, setCurrentValue] = useState('')

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 999999,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 size={18} className="text-blue-600" />
            <span>Add Asset & Investment Holding</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-3">
          {/* Market vs Physical Mode Switch */}
          <div className="flex gap-2 mb-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => { setIsPhysical(false); setType('mutual_fund') }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${!isPhysical ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Market / Liquid Investment
            </button>
            <button
              onClick={() => { setIsPhysical(true); setType('property') }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${isPhysical ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Physical / Real Estate
            </button>
          </div>

          {/* Type Dropdown Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Asset Classification Type</label>
            <select
              className="select w-full"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              {!isPhysical ? (
                <>
                  <option value="mutual_fund">Mutual Fund / Index Fund / SIP</option>
                  <option value="stock">Direct Indian Equities (NSE/BSE)</option>
                  <option value="us_stock">US Stocks / Global ETFs</option>
                  <option value="sgb">Sovereign Gold Bond (SGB)</option>
                  <option value="gold_etf">Gold ETF / Digital Gold</option>
                  <option value="epf">Employee Provident Fund (EPF)</option>
                  <option value="ppf">Public Provident Fund (PPF)</option>
                  <option value="nps">National Pension Scheme (NPS)</option>
                  <option value="bonds">Corporate / Govt Bonds</option>
                  <option value="crypto">Crypto / Digital Assets</option>
                </>
              ) : (
                <>
                  <option value="property">Residential Property / Apartment</option>
                  <option value="commercial">Commercial Real Estate / Office</option>
                  <option value="land">Agricultural Land / Plot</option>
                  <option value="jewellery">Physical Gold & Jewellery</option>
                  <option value="vehicle">Car / Automobile Market Value</option>
                  <option value="art">Art, Collectibles & Luxury Goods</option>
                </>
              )}
            </select>
          </div>

          {/* Asset Name */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Asset Name / Scheme</label>
            <input
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              placeholder={isPhysical ? 'e.g. 2BHK Apartment (Powai)' : 'e.g. Parag Parikh Flexi Cap Fund'}
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Cost vs Market Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                {isPhysical ? 'Purchase Cost (₹)' : 'Invested Cost Basis (₹)'}
              </label>
              <input
                type="number"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                placeholder="100000"
                value={investedAmount}
                onChange={e => setInvestedAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">Current Market Value (₹)</label>
              <input
                type="number"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                placeholder="140000"
                value={currentValue}
                onChange={e => setCurrentValue(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 cursor-pointer">Cancel</button>
          <button
            onClick={() => onSave({ isPhysical, name, type, invested_amount: Number(investedAmount), purchase_value: Number(investedAmount), current_value: Number(currentValue || investedAmount) })}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
            disabled={!name || !investedAmount}
          >
            Save Asset
          </button>
        </div>
      </div>
    </div>
  )
}

function PrepaymentSimulatorModal({ loan, onClose }: { loan: Loan, onClose: () => void }) {
  const [extraMonthly, setExtraMonthly] = useState(5000)
  const currentOutstanding = calcLoanOutstanding(loan)
  const r = Number(loan.roi) / 100 / 12
  const currentEmi = Number(loan.emi_amount)

  const simulated = useMemo(() => {
    if (r <= 0 || currentOutstanding <= 0) return { monthsSaved: 0, interestSaved: 0, newTenureMonths: 0 }
    const newEmi = currentEmi + extraMonthly
    const ratio = (currentOutstanding * r) / newEmi
    if (ratio >= 1) return { monthsSaved: 0, interestSaved: 0, newTenureMonths: 0 }
    const newMonths = Math.ceil(-Math.log(1 - ratio) / Math.log(1 + r))
    const oldRatio = (currentOutstanding * r) / currentEmi
    const oldRemainingMonths = oldRatio < 1 ? Math.ceil(-Math.log(1 - oldRatio) / Math.log(1 + r)) : loan.tenure_months
    const oldTotalInterest = (currentEmi * oldRemainingMonths) - currentOutstanding
    const newTotalInterest = (newEmi * newMonths) - currentOutstanding
    const interestSaved = Math.max(0, oldTotalInterest - newTotalInterest)
    const monthsSaved = Math.max(0, oldRemainingMonths - newMonths)
    return { monthsSaved, interestSaved: Math.round(interestSaved), newTenureMonths: newMonths }
  }, [currentOutstanding, currentEmi, extraMonthly, r, loan.tenure_months])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 999999,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap size={18} className="text-blue-500" />
            <span>Pre-payment Debt Simulator</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500">
            {loan.lender_name} • Balance: <strong className="font-mono text-slate-900 dark:text-white">{fmt(currentOutstanding)}</strong> @ {loan.roi}%
          </p>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span>Extra Pre-payment:</span>
              <span className="text-blue-600 font-mono">+{fmtFull(extraMonthly)}/mo</span>
            </div>
            <input type="range" min={1000} max={50000} step={1000} value={extraMonthly} onChange={e => setExtraMonthly(Number(e.target.value))} className="w-full accent-blue-600" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-600">Interest Saved</span>
              <div className="text-xl font-extrabold font-mono text-emerald-600">{fmt(simulated.interestSaved)}</div>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-center">
              <span className="text-[10px] uppercase font-bold text-blue-600">Debt-Free Sooner</span>
              <div className="text-lg font-extrabold font-mono text-blue-600">{Math.floor(simulated.monthsSaved / 12)}y {simulated.monthsSaved % 12}m</div>
            </div>
          </div>
        </div>
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white cursor-pointer">Close</button>
        </div>
      </div>
    </div>
  )
}

function AmortizationScheduleModal({ loan, onClose }: { loan: Loan, onClose: () => void }) {
  const schedule = useMemo(() => {
    const list: any[] = []
    let balance = Number(loan.original_amount)
    const monthlyRate = Number(loan.roi) / 100 / 12
    const emi = Number(loan.emi_amount)
    const totalMonths = Math.min(36, Number(loan.tenure_months))
    for (let m = 1; m <= totalMonths && balance > 0; m++) {
      const interest = balance * monthlyRate
      const principalPaid = Math.min(balance, emi - interest)
      balance = Math.max(0, balance - principalPaid)
      list.push({ month: m, principal: Math.round(principalPaid), interest: Math.round(interest), balance: Math.round(balance) })
    }
    return list
  }, [loan])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 999999,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TableProperties size={16} className="text-blue-500" />
            <span>{loan.lender_name} Amortization Schedule</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X size={16} /></button>
        </div>
        <div className="p-6 max-h-72 overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-semibold">
                <th className="pb-2">Month</th>
                <th className="pb-2">Principal</th>
                <th className="pb-2">Interest</th>
                <th className="pb-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {schedule.map(row => (
                <tr key={row.month}>
                  <td className="py-2 text-slate-600 dark:text-slate-400">M{row.month}</td>
                  <td className="py-2 text-emerald-600">{fmtFull(row.principal)}</td>
                  <td className="py-2 text-rose-600">{fmtFull(row.interest)}</td>
                  <td className="py-2 text-right font-bold text-slate-800 dark:text-slate-200">{fmtFull(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white cursor-pointer">Close</button>
        </div>
      </div>
    </div>
  )
}
