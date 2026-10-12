'use client'

/**
 * Premium Chart Components — built on Recharts
 * Designed to feel like Stripe / Linear charts:
 *  - Gradient area fills
 *  - Smooth curves (monotone)
 *  - Crisp axes, no chart junk
 *  - Floating glass tooltips
 *  - Animated on mount
 */

import { ReactNode } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
  ComposedChart,
  Legend,
} from 'recharts'

// ─── Color palette (matches globals.css accent) ────────────────────────────
export const CHART_COLORS = {
  indigo:  '#6366f1',
  emerald: '#059669',
  rose:    '#f43f5e',
  amber:   '#f59e0b',
  violet:  '#8b5cf6',
  cyan:    '#06b6d4',
  slate:   '#64748b',
}

export const PIE_PALETTE = [
  '#6366f1', '#059669', '#f59e0b', '#f43f5e', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
  '#a855f7', '#3b82f6', '#10b981', '#e11d48', '#0ea5e9',
]

// ─── Formatters ────────────────────────────────────────────────────────────
export const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)

export const fmtCompact = (v: number) => {
  if (Math.abs(v) >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`
  if (Math.abs(v) >= 1_000)   return `₹${(v / 1_000).toFixed(1)}K`
  return `₹${v.toFixed(0)}`
}

// ─── Shared Tooltip ────────────────────────────────────────────────────────
export interface ChartTooltipProps {
  active?: boolean
  payload?: any[]
  label?: any
  formatValue?: (v: number) => string
  labelKey?: string
}

export function ChartTooltip({ active, payload, label, formatValue = fmt }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 10px 24px rgba(0,0,0,0.09), 0 2px 6px rgba(0,0,0,0.05)',
      fontSize: 12,
      minWidth: 160,
      fontFamily: 'Inter, sans-serif',
    }}>
      {label && (
        <div style={{
          color: '#9ca3af',
          fontSize: 10.5,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          marginBottom: 7,
          paddingBottom: 6,
          borderBottom: '1px solid #f0f1f3',
        }}>
          {label}
        </div>
      )}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: i > 0 ? 4 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ color: '#6b7280', fontWeight: 500 }}>{p.name}</span>
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#111827' }}>
            {formatValue(p.value as number)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── SVG Gradient Defs ─────────────────────────────────────────────────────
function GradientDefs({ id, color }: { id: string; color: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor={color} stopOpacity={0.18} />
        <stop offset="70%"  stopColor={color} stopOpacity={0.05} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </defs>
  )
}

// ─── Shared Axis styles ────────────────────────────────────────────────────
const axisStyle = {
  tick: { fontSize: 11, fill: '#9ca3af', fontFamily: 'Inter, sans-serif' },
  axisLine: false as const,
  tickLine: false as const,
}

// ─── Area Chart ────────────────────────────────────────────────────────────
interface AreaChartProps {
  data: any[]
  dataKey: string
  color?: string
  height?: number
  xKey?: string
  formatTick?: (v: any) => string
  formatTooltipValue?: (v: number) => string
  tooltipLabel?: string
  showGrid?: boolean
  referenceY?: number
  secondDataKey?: string
  secondColor?: string
}

export function PremiumAreaChart({
  data,
  dataKey,
  color = CHART_COLORS.indigo,
  height = 240,
  xKey = 'label',
  formatTick,
  formatTooltipValue = fmt,
  showGrid = true,
  referenceY,
  secondDataKey,
  secondColor = CHART_COLORS.emerald,
}: AreaChartProps) {
  const gradId = `area-${dataKey}`
  const gradId2 = `area-${secondDataKey}`

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.2} />
            <stop offset="80%"  stopColor={color} stopOpacity={0.03} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          {secondDataKey && (
            <linearGradient id={gradId2} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={secondColor} stopOpacity={0.18} />
              <stop offset="80%"  stopColor={secondColor} stopOpacity={0.03} />
              <stop offset="100%" stopColor={secondColor} stopOpacity={0} />
            </linearGradient>
          )}
        </defs>
        {showGrid && (
          <CartesianGrid
            strokeDasharray="0"
            stroke="#f0f1f3"
            vertical={false}
          />
        )}
        <XAxis
          dataKey={xKey}
          {...axisStyle}
          tickFormatter={formatTick}
          dy={6}
        />
        <YAxis
          {...axisStyle}
          tickFormatter={fmtCompact}
          width={54}
          dx={-4}
        />
        <Tooltip content={<ChartTooltip formatValue={formatTooltipValue} />} />
        {referenceY !== undefined && (
          <ReferenceLine y={referenceY} stroke="#e5e7eb" strokeDasharray="4 3" />
        )}
        {secondDataKey && (
          <Area
            type="monotone"
            dataKey={secondDataKey}
            stroke={secondColor}
            strokeWidth={2}
            fill={`url(#${gradId2})`}
            dot={false}
            activeDot={{ r: 4, fill: secondColor, strokeWidth: 2, stroke: '#fff' }}
          />
        )}
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradId})`}
          dot={false}
          activeDot={{ r: 4, fill: color, strokeWidth: 2, stroke: '#fff' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Bar Chart ─────────────────────────────────────────────────────────────
interface BarChartProps {
  data: any[]
  bars: { dataKey: string; color: string; name?: string }[]
  height?: number
  xKey?: string
  formatTick?: (v: any) => string
  stacked?: boolean
  rounded?: boolean
}

export function PremiumBarChart({
  data,
  bars,
  height = 240,
  xKey = 'label',
  formatTick,
  stacked = false,
  rounded = true,
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barCategoryGap="35%" margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <CartesianGrid strokeDasharray="0" stroke="#f0f1f3" vertical={false} />
        <XAxis dataKey={xKey} {...axisStyle} tickFormatter={formatTick} dy={6} />
        <YAxis {...axisStyle} tickFormatter={fmtCompact} width={54} dx={-4} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f3f4f6', radius: 6 }} />
        {bars.map((b, i) => (
          <Bar
            key={b.dataKey}
            dataKey={b.dataKey}
            name={b.name || b.dataKey}
            fill={b.color}
            stackId={stacked ? 'stack' : undefined}
            radius={rounded && !stacked ? [4, 4, 0, 0] : stacked && i === bars.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            maxBarSize={40}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Composed Net Flow Chart ────────────────────────────────────────────────
interface NetFlowChartProps {
  data: any[]
  height?: number
  xKey?: string
}

export function NetFlowChart({ data, height = 260, xKey = 'label' }: NetFlowChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} barCategoryGap="35%" margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="netflow-credit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.emerald} stopOpacity={0.25} />
            <stop offset="100%" stopColor={CHART_COLORS.emerald} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="0" stroke="#f0f1f3" vertical={false} />
        <XAxis dataKey={xKey} {...axisStyle} dy={6} />
        <YAxis {...axisStyle} tickFormatter={fmtCompact} width={54} dx={-4} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f3f4f6', radius: 6 }} />
        <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1} />
        <Bar dataKey="Debit" name="Outflow" fill={CHART_COLORS.rose} opacity={0.85} radius={[4, 4, 0, 0]} maxBarSize={36} />
        <Bar dataKey="Credit" name="Inflow" fill={CHART_COLORS.emerald} opacity={0.85} radius={[4, 4, 0, 0]} maxBarSize={36} />
        <Area
          type="monotone"
          dataKey="Net"
          name="Net Flow"
          stroke={CHART_COLORS.indigo}
          strokeWidth={2}
          fill="none"
          dot={false}
          activeDot={{ r: 4, fill: CHART_COLORS.indigo, strokeWidth: 2, stroke: '#fff' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ─── Pie / Donut Chart ─────────────────────────────────────────────────────
interface DonutChartProps {
  data: { name: string; value: number; color?: string }[]
  height?: number
  innerRadius?: number
  outerRadius?: number
  centerLabel?: ReactNode
}

export function DonutChart({
  data,
  height = 240,
  innerRadius = 60,
  outerRadius = 90,
  centerLabel,
}: DonutChartProps) {
  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            dataKey="value"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.color || PIE_PALETTE[i % PIE_PALETTE.length]}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const item = payload[0]
              return (
                <div style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 12,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                }}>
                  <div style={{ fontWeight: 700, color: '#111827', marginBottom: 2 }}>{item.name}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: item.payload?.color || '#6366f1' }}>
                    {fmt(item.value as number)}
                  </div>
                </div>
              )
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          {centerLabel}
        </div>
      )}
    </div>
  )
}

// ─── Legend ────────────────────────────────────────────────────────────────
interface ChartLegendProps {
  items: { label: string; color: string; value?: string }[]
}

export function ChartLegend({ items }: ChartLegendProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 12 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            background: item.color,
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 11.5, color: '#6b7280', fontWeight: 500 }}>{item.label}</span>
          {item.value && (
            <span style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#111827' }}>
              {item.value}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Stat KPI Card ─────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string
  delta?: string
  deltaPositive?: boolean
  icon?: ReactNode
  accentColor?: string
  children?: ReactNode
  onClick?: () => void
  href?: string
}

export function StatCard({
  label,
  value,
  delta,
  deltaPositive,
  icon,
  accentColor = '#6366f1',
  children,
  onClick,
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: '18px 20px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s cubic-bezier(0.16,1,0.3,1)',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        if (!onClick) return
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = '#d1d5db'
        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)'
        el.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = '#e5e7eb'
        el.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'
        el.style.transform = 'none'
      }}
    >
      {/* Accent strip */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 2,
        background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)`,
        borderRadius: '12px 12px 0 0',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{
          fontSize: 10.5,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#9ca3af',
        }}>
          {label}
        </span>
        {icon && (
          <div style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            background: `${accentColor}12`,
            border: `1px solid ${accentColor}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accentColor,
          }}>
            {icon}
          </div>
        )}
      </div>

      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 22,
        fontWeight: 700,
        color: '#111827',
        letterSpacing: '-0.5px',
        lineHeight: 1.2,
      }}>
        {value}
      </div>

      {delta && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          marginTop: 8,
          padding: '2px 8px',
          borderRadius: 5,
          fontSize: 10.5,
          fontWeight: 700,
          background: deltaPositive ? '#ecfdf5' : '#fef2f2',
          color: deltaPositive ? '#059669' : '#dc2626',
          border: `1px solid ${deltaPositive ? '#d1fae5' : '#fecaca'}`,
        }}>
          {deltaPositive ? '↑' : '↓'} {delta}
        </div>
      )}

      {children}
    </div>
  )
}
