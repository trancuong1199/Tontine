import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  RefreshCw, Send, FileText, Landmark, BarChart3, Bot,
  ArrowUpRight, TrendingUp, Activity,
  ExternalLink
} from 'lucide-react';
import { BrowserProvider, Contract, formatUnits, type Eip1193Provider } from 'ethers';
import { getTransactionHistory } from '../lib/TransactionHistory';
import type { Transaction } from '../lib/TransactionHistory';
import { RightSidebar } from './RightSidebar';
import { globalRpcProvider } from '../utils/arcChain';
import type { ViewState } from '../lib/navigation';

// Arc Testnet token addresses
const TOKEN_ADDRESSES = {
  USDC: '0x3600000000000000000000000000000000000000', // native
  EURC: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
  cirBTC: '0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF',
};
const ARC_CHAIN_ID = '0x4CEF52';
const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];

// Declared outside Dashboard to avoid "component created during render" lint warning
interface TokenCardProps {
  symbol: string;
  balance: string;
  color: string;
  icon: string;
  loading: boolean;
}
const TokenCard: React.FC<TokenCardProps> = ({ symbol, balance, color, icon, loading }) => (
  <div
    className="glass-panel"
    style={{
      padding: '1.1rem 1.25rem', borderRadius: '16px', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
      cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
    }}
    onMouseOver={e => {
      (e.currentTarget).style.transform = 'translateY(-2px)';
      (e.currentTarget).style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
    }}
    onMouseOut={e => {
      (e.currentTarget).style.transform = 'translateY(0)';
      (e.currentTarget).style.boxShadow = '';
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%',
        background: `${color}22`, border: `2px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.1rem', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
          {symbol}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Arc Testnet</div>
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{
        fontWeight: 800, fontSize: '1.05rem',
        color: loading ? 'var(--text-secondary)' : 'var(--text-primary)',
        fontFamily: "'Space Grotesk', sans-serif",
        fontVariantNumeric: 'tabular-nums',
      }}>
        {loading ? '...' : balance}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{symbol}</div>
    </div>
  </div>
);

interface DashboardProps {
  connectedAccount: string | null;
  navigateTo: (view: ViewState) => void;
  getProvider: () => Eip1193Provider | null;
}

interface Balances {
  usdc: string;
  eurc: string;
  cirbtc: string;
  loading: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  connectedAccount,
  navigateTo,
  getProvider,
}) => {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [balances, setBalances] = useState<Balances>({
    usdc: '—', eurc: '—', cirbtc: '—', loading: false,
  });
  const [refreshing, setRefreshing] = useState(false);

  // ── Real balances from chain ──────────────────────────────────────────────
  const fetchBalances = useCallback(async () => {
    if (!connectedAccount) {
      setBalances({ usdc: '—', eurc: '—', cirbtc: '—', loading: false });
      return;
    }
    setBalances(prev => ({ ...prev, loading: true }));
    try {
      const eth = getProvider();
      // globalRpcProvider is JsonRpcProvider, BrowserProvider extends it — use a union
      let provider: InstanceType<typeof BrowserProvider> | typeof globalRpcProvider = globalRpcProvider;
      if (eth) {
        try {
          const chainIdHex = await eth.request({ method: 'eth_chainId' }) as string;
          if (chainIdHex?.toLowerCase() === ARC_CHAIN_ID.toLowerCase()) {
            provider = new BrowserProvider(eth);
          }
        } catch { /* provider fallback */ }
      }

      // USDC: native gas balance (18 dec) → display
      const nativeBal = await provider.getBalance(connectedAccount);
      const usdcDisplay = parseFloat(formatUnits(nativeBal, 18)).toFixed(4);

      // EURC: ERC-20 (6 dec)
      const eurcContract = new Contract(TOKEN_ADDRESSES.EURC, ERC20_ABI, provider);
      const eurcBal = (await eurcContract.balanceOf(connectedAccount)) as bigint;
      const eurcDisplay = parseFloat(formatUnits(eurcBal, 6)).toFixed(4);

      // cirBTC: ERC-20 (8 dec)
      const btcContract = new Contract(TOKEN_ADDRESSES.cirBTC, ERC20_ABI, provider);
      const btcBal = (await btcContract.balanceOf(connectedAccount)) as bigint;
      const btcDisplay = parseFloat(formatUnits(btcBal, 8)).toFixed(6);

      setBalances({ usdc: usdcDisplay, eurc: eurcDisplay, cirbtc: btcDisplay, loading: false });
    } catch (err) {
      console.warn('Balance fetch failed', err);
      setBalances(prev => ({ ...prev, loading: false }));
    }
  }, [connectedAccount, getProvider]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBalances();
    setRefreshing(false);
  };

  useEffect(() => {
    const fetchTxs = () => {
      const history = getTransactionHistory();
      const filtered = connectedAccount
        ? history.filter(
            tx =>
              tx.from.toLowerCase() === connectedAccount.toLowerCase() ||
              tx.to.toLowerCase() === connectedAccount.toLowerCase()
          )
        : history;
      setTxs(filtered.slice(0, 5));
    };
    const onSwapExecuted = () => { void fetchBalances(); };
    fetchTxs();
    void fetchBalances();
    window.addEventListener('transaction_history_updated', fetchTxs);
    window.addEventListener('swap_executed', onSwapExecuted);
    return () => {
      window.removeEventListener('transaction_history_updated', fetchTxs);
      window.removeEventListener('swap_executed', onSwapExecuted);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedAccount, fetchBalances]);

  // ── Pie data: only shown when balances are loaded ─────────────────────────
  const hasBalances = balances.usdc !== '—';
  const usdcNum = hasBalances ? parseFloat(balances.usdc) : 0;
  const eurcNum = hasBalances ? parseFloat(balances.eurc) * 1.08 : 0;   // approx USD
  const btcNum = hasBalances ? parseFloat(balances.cirbtc) * 60000 : 0; // approx USD
  const totalUsd = usdcNum + eurcNum + btcNum;

  const pieData = hasBalances && totalUsd > 0
    ? [
        { name: 'USDC', value: (usdcNum / totalUsd) * 100, color: '#0d9488' },
        { name: 'EURC', value: (eurcNum / totalUsd) * 100, color: '#0ea5e9' },
        { name: 'cirBTC', value: (btcNum / totalUsd) * 100, color: '#a855f7' },
      ]
    : [
        { name: 'USDC', value: 60, color: '#0d9488' },
        { name: 'EURC', value: 25, color: '#0ea5e9' },
        { name: 'cirBTC', value: 15, color: '#a855f7' },
      ];

  const activityData = [
    { name: 'Mon', txs: 12 },
    { name: 'Tue', txs: 28 },
    { name: 'Wed', txs: 18 },
    { name: 'Thu', txs: 35 },
    { name: 'Fri', txs: txs.length > 0 ? txs.length * 6 : 22 },
    { name: 'Sat', txs: 14 },
    { name: 'Sun', txs: txs.length > 0 ? txs.length * 8 + 5 : 30 },
  ];

  return (
    <>
      {/* Responsive 2-col: stacks to 1-col below 1100px */}
      <style>{`
        .dashboard-layout {
          display: flex;
          gap: 1.5rem;
          width: 100%;
          align-items: flex-start;
        }
        .dashboard-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1.5rem; }
        .dashboard-sidebar { width: 310px; flex-shrink: 0; }
        @media (max-width: 1100px) {
          .dashboard-layout { flex-direction: column; }
          .dashboard-sidebar { width: 100%; }
        }
      `}</style>
    <div className="dashboard-layout">

      {/* ── LEFT: Main dashboard ────────────────────────────────────────── */}
      <div className="dashboard-main">

        {/* Welcome + refresh */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{
              fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-primary)',
              margin: 0, fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: '-0.02em',
            }}>
              {connectedAccount
                ? `${connectedAccount.slice(0, 6)}...${connectedAccount.slice(-4)}`
                : 'BAVI Finance'}
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              {connectedAccount ? 'Arc Testnet — live balances' : 'Connect wallet to see live balances'}
            </p>
          </div>
          {connectedAccount && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh balances"
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                borderRadius: '10px', padding: '8px', cursor: 'pointer',
                color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
                transition: 'all 0.2s',
              }}
            >
              <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          )}
        </div>

        {/* Token balances grid */}
        <div>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Your Assets
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
            <TokenCard symbol="USDC" balance={balances.usdc} color="#0d9488" icon="🪙" loading={balances.loading} />
            <TokenCard symbol="EURC" balance={balances.eurc} color="#0ea5e9" icon="💶" loading={balances.loading} />
            <TokenCard symbol="cirBTC" balance={balances.cirbtc} color="#a855f7" icon="₿" loading={balances.loading} />
          </div>
        </div>

        {/* Charts row: Portfolio + Activity — stacks on narrow */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px,1fr) minmax(0,1.7fr)', gap: '1.25rem' }}
          className="chart-row-grid">
          <style>{`.chart-row-grid { } @media(max-width:700px){ .chart-row-grid{ grid-template-columns:1fr !important; } }`}</style>

          {/* Portfolio donut */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 1rem', fontFamily: "'Space Grotesk', sans-serif" }}>
              Portfolio
            </h3>
            <div style={{ position: 'relative', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={68} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
                  {hasBalances ? `$${totalUsd.toFixed(0)}` : '—'}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Total</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '0.75rem' }}>
              {[
                { label: 'USDC', color: '#0d9488', pct: totalUsd > 0 ? ((usdcNum / totalUsd) * 100).toFixed(1) : '—' },
                { label: 'EURC', color: '#0ea5e9', pct: totalUsd > 0 ? ((eurcNum / totalUsd) * 100).toFixed(1) : '—' },
                { label: 'cirBTC', color: '#a855f7', pct: totalUsd > 0 ? ((btcNum / totalUsd) * 100).toFixed(1) : '—' },
              ].map(e => (
                <div key={e.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: e.color }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{e.label}</span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{e.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity chart */}
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
                Activity (7d)
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Activity size={13} /> Live
              </span>
            </div>
            <div style={{ height: '190px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <defs>
                    <linearGradient id="grad-activity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.8rem' }} />
                  <Area type="monotone" dataKey="txs" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={1} fill="url(#grad-activity)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quick Actions</h3>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Swap', icon: <RefreshCw size={14} />, view: 'swap', primary: true },
              { label: 'Send', icon: <Send size={14} />, view: 'payments' },
              { label: 'Invoices', icon: <FileText size={14} />, view: 'memos' },
              { label: 'Treasury', icon: <Landmark size={14} />, view: 'merchant-treasury' },
              { label: 'AI Auto-Pay', icon: <Bot size={14} />, view: 'agent-stack' },
              { label: 'Analytics', icon: <BarChart3 size={14} />, view: 'analytics' },
            ].map(a => (
              <button
                key={a.view}
                onClick={() => navigateTo(a.view as ViewState)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '0.55rem 1rem', borderRadius: '10px',
                  border: a.primary ? 'none' : '1px solid var(--border-color)',
                  background: a.primary ? 'linear-gradient(135deg, #0d9488, #0ea5e9)' : 'var(--bg-tertiary)',
                  color: a.primary ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: a.primary ? '0 4px 12px rgba(13,148,136,0.25)' : 'none',
                }}
              >
                {a.icon}{a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recent transactions table */}
        <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
              Recent Transactions
            </h3>
            <button
              onClick={() => navigateTo('analytics')}
              style={{ background: 'transparent', border: 'none', color: '#0ea5e9', fontSize: '0.825rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              View all <ArrowUpRight size={13} />
            </button>
          </div>

          {txs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              <TrendingUp size={32} style={{ opacity: 0.25, marginBottom: '8px' }} />
              <div>No transactions yet.</div>
              <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Your activity will appear here after your first swap or transfer.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['Type', 'From', 'To', 'Amount', 'Time', 'Status'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {txs.map(tx => (
                    <tr
                      key={tx.id}
                      style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', cursor: tx.explorerUrl ? 'pointer' : 'default' }}
                      onClick={() => tx.explorerUrl && window.open(tx.explorerUrl, '_blank')}
                    >
                      <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {tx.action.includes('Swap') ? <RefreshCw size={13} color="#0ea5e9" /> : <Send size={13} color="#0d9488" />}
                          {tx.action}
                          {tx.explorerUrl && <ExternalLink size={11} color="var(--text-muted)" />}
                        </span>
                      </td>
                      <td style={{ padding: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{tx.from.slice(0, 6)}…{tx.from.slice(-4)}</td>
                      <td style={{ padding: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{tx.to.slice(0, 6)}…{tx.to.slice(-4)}</td>
                      <td style={{ padding: '10px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{tx.amount} {tx.tokenSymbol || 'USDC'}</td>
                      <td style={{ padding: '10px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          background: tx.status === 'COMPLETE' ? 'rgba(16,185,129,0.12)' : tx.status === 'PENDING' ? 'rgba(234,179,8,0.12)' : 'rgba(239,68,68,0.12)',
                          color: tx.status === 'COMPLETE' ? '#10b981' : tx.status === 'PENDING' ? '#eab308' : '#ef4444',
                          padding: '3px 8px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                        }}>
                          {tx.status === 'COMPLETE' ? 'Success' : tx.status === 'PENDING' ? 'Pending' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ── RIGHT: Swap widget + activity feed ─────────────────────────── */}
      <div className="dashboard-sidebar">
        <RightSidebar connectedAccount={connectedAccount} getProvider={getProvider} navigateTo={navigateTo} />
      </div>

    </div>
    </>
  );
};
