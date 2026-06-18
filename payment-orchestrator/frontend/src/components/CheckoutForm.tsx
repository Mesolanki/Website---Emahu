import React, { useState, useEffect } from 'react';
import { ShieldCheck, Loader2, CreditCard, Landmark, Wallet, Layers, MapPin } from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
}

interface CheckoutFormProps {
  onPaymentInitiate: (payload: {
    amount: number;
    currency: string;
    paymentMethod: string;
    paymentMethodType: string;
    billingEmail: string;
    country: string;
    state: string;
    zip: string;
  }) => Promise<{ success: boolean; routingTrace: string[]; gatewayResponse?: any }>;
}

const PRESETS = [
  { label: '🇮🇳 India (UPI, Cards, NetBanking)', country: 'IN', state: 'MH', zip: '400001', currency: 'INR', amount: 4500 },
  { label: '🇺🇸 United States (Stripe, Apple Pay)', country: 'US', state: 'NY', zip: '10001', currency: 'USD', amount: 59 },
  { label: '🇳🇱 Netherlands (iDEAL, Klarna)', country: 'NL', state: 'NH', zip: '1012', currency: 'EUR', amount: 49 },
  { label: '🇬🇧 United Kingdom (Apple Pay, Klarna)', country: 'GB', state: 'ENG', zip: 'EC1A', currency: 'GBP', amount: 35 },
];

export const CheckoutForm: React.FC<CheckoutFormProps> = ({ onPaymentInitiate }) => {
  const [country, setCountry] = useState('IN');
  const [state, setState] = useState('MH');
  const [zip, setZip] = useState('400001');
  const [currency, setCurrency] = useState('INR');
  const [amount, setAmount] = useState(4500); // This represents the subtotal
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [email, setEmail] = useState('shopper@enterprise.com');
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [loadingMethods, setLoadingMethods] = useState(false);
  
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean;
    trace: string[];
    details?: string;
  } | null>(null);

  // Fetch available methods and delivery fee on address change
  useEffect(() => {
    const fetchMethods = async () => {
      if (!country) return;
      setLoadingMethods(true);
      try {
        const response = await fetch('http://localhost:5001/api/payment/methods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country, state, zip }),
        });
        const data = await response.json();
        if (data.paymentMethods) {
          setPaymentMethods(data.paymentMethods);
          setDeliveryFee(data.deliveryPricing?.deliveryFee || 0);
          // Auto select first available method
          if (data.paymentMethods.length > 0) {
            setSelectedMethod(data.paymentMethods[0]);
          } else {
            setSelectedMethod(null);
          }
        }
      } catch (err) {
        console.error('Error loading payment methods:', err);
      } finally {
        setLoadingMethods(false);
      }
    };

    const debounce = setTimeout(fetchMethods, 300);
    return () => clearTimeout(debounce);
  }, [country, state, zip]);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setCountry(preset.country);
    setState(preset.state);
    setZip(preset.zip);
    setCurrency(preset.currency);
    setAmount(preset.amount);
    setPaymentResult(null);
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'CARD':
        return <CreditCard className="w-5 h-5 text-blue-400" />;
      case 'NETBANKING':
        return <Landmark className="w-5 h-5 text-emerald-400" />;
      case 'WALLET':
        return <Wallet className="w-5 h-5 text-purple-400" />;
      case 'UPI':
        return <Layers className="w-5 h-5 text-indigo-400" />;
      default:
        return <CreditCard className="w-5 h-5 text-gray-400" />;
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod) return;

    const totalAmount = amount + deliveryFee;

    setProcessing(true);
    setPaymentResult(null);
    setProcessingStatus(`Initiating payment orchestration for ${selectedMethod.name}...`);

    try {
      // Simulate real-time trace update delay
      await new Promise((r) => setTimeout(r, 600));

      const payload = {
        amount: totalAmount,
        currency,
        paymentMethod: selectedMethod.name,
        paymentMethodType: selectedMethod.type,
        billingEmail: email,
        country,
        state,
        zip,
      };

      const res = await onPaymentInitiate(payload);

      // Render step by step failover if trace contains multiple gateways
      if (res.routingTrace.length > 1) {
        for (let i = 0; i < res.routingTrace.length - 1; i++) {
          setProcessingStatus(`Transient failure on ${res.routingTrace[i]} (Timeout/5xx). Triggering automatic failover to ${res.routingTrace[i + 1]}...`);
          await new Promise((r) => setTimeout(r, 1200));
        }
      }

      setProcessingStatus(`Processing completed on ${res.routingTrace[res.routingTrace.length - 1] || 'Orchestrator'}!`);
      await new Promise((r) => setTimeout(r, 600));

      setPaymentResult({
        success: res.success,
        trace: res.routingTrace,
        details: res.success 
          ? `Successfully processed transaction via ${res.routingTrace.join(' → ')}. Gateway TxID: ${res.gatewayResponse?.gatewayTransactionId}`
          : 'Payment routing failed. All registered payment gateways returned errors.',
      });
    } catch (err) {
      setPaymentResult({
        success: false,
        trace: [],
        details: 'API connection error.',
      });
    } finally {
      setProcessing(false);
      setProcessingStatus('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Location Presets */}
      <div className="glass-card rounded-xl p-4 border border-brand-500/10">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-brand-500" />
          Test Delivery Address Presets
        </h3>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className="text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-gray-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-all"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleCheckoutSubmit} className="glass-panel rounded-xl p-6 space-y-5 shadow-2xl relative overflow-hidden">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Smart Checkout Engine
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Dynamically routes using smart multi-PG lookup</p>
        </div>

        {/* Address and Info Fields */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3">
            <label className="block text-[10px] font-semibold uppercase text-gray-400 tracking-wider mb-1">Billing Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase text-gray-400 tracking-wider mb-1">Country (ISO-2)</label>
            <input
              type="text"
              required
              maxLength={2}
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-lg px-3 py-2 text-xs text-white text-center font-bold tracking-wider outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase text-gray-400 tracking-wider mb-1">State</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase text-gray-400 tracking-wider mb-1">Zip Code</label>
            <input
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition-all"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-[10px] font-semibold uppercase text-gray-400 tracking-wider mb-1">Amount</label>
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition-all font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase text-gray-400 tracking-wider mb-1">Currency</label>
            <input
              type="text"
              required
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="w-full bg-slate-900 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-lg px-3 py-2 text-xs text-white text-center font-bold outline-none transition-all"
            />
          </div>
        </div>

        {/* Localized Payment Methods */}
        <div className="space-y-2">
          <label className="block text-[10px] font-semibold uppercase text-gray-400 tracking-wider mb-1">Available Local Payment Options</label>
          
          {loadingMethods ? (
            <div className="flex items-center gap-2 py-4 justify-center text-xs text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
              Scanning matching methods for {country}...
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="text-center py-5 text-xs text-amber-400/80 bg-amber-950/10 border border-amber-900/30 rounded-lg">
              No localized configurations found for country: "{country}"
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {paymentMethods.map((pm) => {
                const isSelected = selectedMethod?.id === pm.id;
                return (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setSelectedMethod(pm)}
                    className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-brand-500 bg-brand-500/10 text-white shadow-md shadow-brand-500/5'
                        : 'border-slate-800 bg-slate-900/40 text-gray-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {getMethodIcon(pm.type)}
                      <div>
                        <div className="text-xs font-semibold">{pm.name}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">{pm.type}</div>
                      </div>
                    </div>
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-brand-500 bg-brand-500' : 'border-gray-600'
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Order Summary Breakdown */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3.5 space-y-2 text-xs">
          <div className="flex justify-between text-gray-400">
            <span>Items Subtotal:</span>
            <span className="font-semibold text-gray-200">{amount.toLocaleString()} {currency}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Shipping & Delivery Fee:</span>
            <span className="font-semibold text-gray-200">{deliveryFee.toLocaleString()} {currency}</span>
          </div>
          <div className="border-t border-slate-800 my-1.5" />
          <div className="flex justify-between text-sm font-bold text-white">
            <span>Total:</span>
            <span className="text-brand-400">{(amount + deliveryFee).toLocaleString()} {currency}</span>
          </div>
        </div>

        {/* Submit button / Processing feedback */}
        <div className="pt-1">
          {processing ? (
            <div className="w-full bg-slate-900 border border-brand-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                <span className="text-xs text-gray-200 font-semibold">Executing Routing Engine</span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono leading-relaxed">{processingStatus}</p>
            </div>
          ) : (
            <button
              type="submit"
              disabled={!selectedMethod || loadingMethods}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-brand-500/20 outline-none"
            >
              <ShieldCheck className="w-4 h-4" />
              Pay {(amount + deliveryFee).toLocaleString()} {currency}
            </button>
          )}
        </div>

        {/* Results Panel */}
        {paymentResult && (
          <div className={`p-4 rounded-xl border ${
            paymentResult.success 
              ? 'bg-green-950/20 border-green-500/30 text-green-200' 
              : 'bg-red-950/20 border-red-500/30 text-red-200'
          }`}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ShieldCheck className={`w-4 h-4 ${paymentResult.success ? 'text-green-400' : 'text-red-400'}`} />
              {paymentResult.success ? 'Transaction Authorized' : 'Transaction Declined'}
            </h4>
            <p className="text-xs text-gray-300 font-mono mt-1">{paymentResult.details}</p>
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-gray-400">Execution Route:</span>
              {paymentResult.trace.map((gw, idx) => (
                <span key={gw} className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-800 rounded text-gray-200">
                  {gw}
                </span>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
