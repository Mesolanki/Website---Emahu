import React from 'react';
import { Activity, ShieldAlert, Zap, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';

export interface GatewayInfo {
  id: string;
  name: string;
  supportedMethods: string;
  supportedCountries: string;
  priority: number;
  processingFeePercent: number;
  successRate: number;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  simulation: {
    simulate5xx: boolean;
    simulateTimeout: boolean;
  };
}

interface DashboardProps {
  gateways: GatewayInfo[];
  transactions: any[];
  onToggleSimulation: (gatewayName: string, type: 'simulate5xx' | 'simulateTimeout', value: boolean) => void;
  onReset: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  gateways,
  transactions,
  onToggleSimulation,
  onReset,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="text-brand-500 w-5 h-5" />
            Gateway Router Registry
          </h2>
          <p className="text-xs text-gray-400 mt-1">Real-time health status, circuit breakers & transaction logs</p>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset All
        </button>
      </div>

      {/* Gateway Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {gateways.map((gw) => {
          const isHealthy = gw.healthStatus === 'HEALTHY';
          const isDegraded = gw.healthStatus === 'DEGRADED';
          
          let cbColor = 'text-green-400 bg-green-500/10 border-green-500/20';
          if (gw.circuitBreakerState === 'OPEN') {
            cbColor = 'text-red-400 bg-red-500/10 border-red-500/20';
          } else if (gw.circuitBreakerState === 'HALF_OPEN') {
            cbColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
          }

          return (
            <div key={gw.id} className="glass-card rounded-xl p-4 flex flex-col justify-between relative overflow-hidden transition-all hover:border-slate-700/80">
              {/* Health Indicator bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${
                isHealthy ? 'bg-green-500' : isDegraded ? 'bg-amber-500' : 'bg-red-500'
              }`} />

              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white text-base">{gw.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${cbColor}`}>
                    {gw.circuitBreakerState}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-1.5 text-xs text-gray-400 mt-2 border-b border-slate-800 pb-3">
                  <div>Priority Weight:</div>
                  <div className="text-right text-gray-200 font-medium">{gw.priority}</div>
                  
                  <div>Processing Fee:</div>
                  <div className="text-right text-gray-200 font-medium">{gw.processingFeePercent}%</div>

                  <div>Base Success Rate:</div>
                  <div className="text-right text-gray-200 font-medium">{(gw.successRate * 100).toFixed(0)}%</div>

                  <div>Regions:</div>
                  <div className="text-right text-gray-200 font-medium max-w-[100px] truncate text-[10px]">{gw.supportedCountries}</div>
                </div>
              </div>

              {/* Simulation Controls */}
              <div className="mt-4 pt-1">
                <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">Simulate Outage</span>
                <div className="flex flex-col gap-2 mt-2">
                  <label className="flex items-center justify-between text-xs cursor-pointer group">
                    <span className="text-gray-300 group-hover:text-gray-200 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                      5xx Server Error
                    </span>
                    <input
                      type="checkbox"
                      checked={gw.simulation.simulate5xx}
                      onChange={(e) => onToggleSimulation(gw.name, 'simulate5xx', e.target.checked)}
                      className="w-3.5 h-3.5 text-brand-600 bg-gray-700 border-gray-600 rounded focus:ring-brand-500"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs cursor-pointer group">
                    <span className="text-gray-300 group-hover:text-gray-200 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Latency/Timeout
                    </span>
                    <input
                      type="checkbox"
                      checked={gw.simulation.simulateTimeout}
                      onChange={(e) => onToggleSimulation(gw.name, 'simulateTimeout', e.target.checked)}
                      className="w-3.5 h-3.5 text-brand-600 bg-gray-700 border-gray-600 rounded focus:ring-brand-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transaction Logs */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          Live Orchestrator Routing Logs
        </h3>

        <div className="max-h-[280px] overflow-y-auto space-y-2 pr-2">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-500">
              No transactions run yet. Submit a checkout payment to view routing logs.
            </div>
          ) : (
            transactions.map((tx) => {
              const gatewaysTried = tx.pgTried.split(',').filter(Boolean);
              const isSuccess = tx.status === 'SUCCESS';
              const isFailed = tx.status === 'FAILED';

              return (
                <div key={tx.id} className="text-xs bg-slate-900/50 border border-slate-800 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] text-gray-500">ID: {tx.id.substring(0, 8)}...</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        isSuccess 
                          ? 'text-green-400 bg-green-950/40' 
                          : isFailed 
                          ? 'text-red-400 bg-red-950/40' 
                          : 'text-yellow-400 bg-yellow-950/40'
                      }`}>
                        {isSuccess ? <ShieldCheck className="w-3 h-3" /> : isFailed ? <ShieldAlert className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        {tx.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-400 text-[11px]">
                    <div>Amount:</div>
                    <div className="text-right text-white font-medium">{tx.amount.toFixed(2)} {tx.currency}</div>
                    
                    <div>Location:</div>
                    <div className="text-right text-gray-300">{tx.billingCountry} {tx.billingState ? `(${tx.billingState})` : ''} - {tx.billingZip}</div>

                    <div>Payment Mode:</div>
                    <div className="text-right text-gray-300">{tx.paymentMethod}</div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-gray-500 mr-1">Trace:</span>
                    {gatewaysTried.map((gw: string, idx: number) => {
                      const isLast = idx === gatewaysTried.length - 1;
                      const badgeBg = isSuccess && isLast ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/20';
                      return (
                        <div key={gw} className="flex items-center gap-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${badgeBg}`}>
                            {gw}
                          </span>
                          {!isLast && <span className="text-gray-600">→</span>}
                        </div>
                      );
                    })}
                  </div>
                  
                  {tx.failureReason && (
                    <div className="text-[10px] text-red-400/90 bg-red-950/20 border border-red-900/30 rounded p-1.5 mt-1 font-mono">
                      Error: {tx.failureReason}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
