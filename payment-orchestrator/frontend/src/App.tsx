import { useState, useEffect } from 'react';
import { CheckoutForm } from './components/CheckoutForm';
import { Dashboard, GatewayInfo } from './components/Dashboard';
import { ShieldCheck, Activity } from 'lucide-react';

function App() {
  const [gateways, setGateways] = useState<GatewayInfo[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  const fetchRegistry = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/payment/registry');
      const data = await response.json();
      if (Array.isArray(data)) {
        setGateways(data);
      }
    } catch (err) {
      console.error('Error fetching registry:', err);
    }
  };

  useEffect(() => {
    fetchRegistry();
    const interval = setInterval(fetchRegistry, 2500); // Poll registry updates every 2.5s for CB state transitions!
    return () => clearInterval(interval);
  }, []);

  const handlePaymentInitiate = async (payload: any) => {
    const idempotencyKey = `idemp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const body = { ...payload, idempotencyKey };

    const response = await fetch('http://localhost:5001/api/payment/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Trigger webhook callback simulator for SUCCESS transactions to test webhook listener updates
    if (data.success && data.transaction) {
      setTimeout(async () => {
        try {
          await fetch('http://localhost:5001/api/payment/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transactionId: data.transaction.id,
              status: 'SUCCESS',
              gateway: data.routingTrace[data.routingTrace.length - 1],
              signature: 'mock_sha256_sig',
            }),
          });
        } catch (err) {
          console.error('Webhook trigger simulation failed:', err);
        }
      }, 800);
    }

    // Refresh configurations and transactions list
    await fetchRegistry();
    if (data.transaction) {
      setTransactions((prev) => [data.transaction, ...prev]);
    }

    return data;
  };

  const handleToggleSimulation = async (gatewayName: string, type: 'simulate5xx' | 'simulateTimeout', value: boolean) => {
    try {
      const gw = gateways.find((g) => g.name === gatewayName);
      if (!gw) return;

      const simPayload = {
        name: gatewayName,
        simulate5xx: type === 'simulate5xx' ? value : gw.simulation.simulate5xx,
        simulateTimeout: type === 'simulateTimeout' ? value : gw.simulation.simulateTimeout,
      };

      await fetch('http://localhost:5001/api/payment/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simPayload),
      });

      await fetchRegistry();
    } catch (err) {
      console.error('Error toggling simulation:', err);
    }
  };

  const handleReset = async () => {
    try {
      await fetch('http://localhost:5001/api/payment/reset', { method: 'POST' });
      setTransactions([]);
      await fetchRegistry();
    } catch (err) {
      console.error('Error resetting registry:', err);
    }
  };

  return (
    <div className="relative min-h-screen text-gray-100 overflow-hidden pb-12">
      {/* Background ambient glows */}
      <div className="ambient-glow-purple top-[-100px] left-[-100px]" />
      <div className="ambient-glow-blue bottom-[-100px] right-[-100px]" />

      {/* Navbar */}
      <nav className="glass-panel border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight">Antigravity</span>
              <span className="text-[10px] uppercase font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full ml-2.5 border border-brand-500/20">
                Orchestrator
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Routing Core Engine v1.0.0
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 pt-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Checkout */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center gap-2 text-white">
            <Activity className="w-4 h-4 text-brand-500" />
            <span className="font-semibold text-sm">Customer View</span>
          </div>
          <CheckoutForm onPaymentInitiate={handlePaymentInitiate} />
        </div>

        {/* Right Side: Registry Dashboard */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-2 text-white">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-sm">Orchestration Controller</span>
          </div>
          <Dashboard
            gateways={gateways}
            transactions={transactions}
            onToggleSimulation={handleToggleSimulation}
            onReset={handleReset}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
