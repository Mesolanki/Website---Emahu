$file = "e:\emahu\Website---Emahu\frontend-web\src\app\seller\dashboard\page.jsx"
$lines = Get-Content $file

$startLine = 2928 - 1  # 0-indexed
$endLine   = 3235 - 1  # 0-indexed, inclusive

$newBlock = @'
      {/* --- ORDER DETAILS & ACTION PANEL MODAL --- */}
      {selectedDetailedOrderId && selectedDetailedOrder && (() => {
        const isSeller = sellerUser && (sellerUser.role === 'seller' || localStorage.getItem('emahu_seller_logged_in') === 'true');
        const ownsOrder = selectedDetailedOrder.items?.some(item => {
          const sellerUserId = sellerUser?._id || sellerUser?.id;
          if (typeof item.seller === 'string') {
            return sellerUserId && item.seller.toString() === sellerUserId.toString();
          }
          const itemSellerId = item.seller?._id || item.seller?.id;
          return (itemSellerId && sellerUserId && itemSellerId.toString() === sellerUserId.toString()) ||
                 (item.seller?.email && sellerUser?.email && item.seller.email === sellerUser.email);
        });

        const ORDER_STAGES = [
          { key: 'PENDING_APPROVAL', label: 'Pending',     icon: '\u23f3' },
          { key: 'APPROVED',         label: 'Approved',    icon: '\u2705' },
          { key: 'DELIVERY_ASSIGNED',label: 'Assigned',    icon: '\ud83d\ude9a' },
          { key: 'LABEL_GENERATED',  label: 'Label',       icon: '\ud83c\udff7\ufe0f' },
          { key: 'READY_FOR_PICKUP', label: 'Ready',       icon: '\ud83d\udce6' },
          { key: 'PICKED_UP',        label: 'Picked Up',   icon: '\ud83d\ude80' },
          { key: 'IN_TRANSIT',       label: 'In Transit',  icon: '\ud83d\ude9b' },
          { key: 'OUT_FOR_DELIVERY', label: 'Out Delivery',icon: '\ud83d\udef5' },
          { key: 'DELIVERED',        label: 'Delivered',   icon: '\ud83c\udf89' },
          { key: 'COMPLETED',        label: 'Completed',   icon: '\u2714\ufe0f' },
        ];
        const currentStageIdx = ORDER_STAGES.findIndex(s => s.key === selectedDetailedOrder.status);
        const isRejected  = selectedDetailedOrder.status === 'REJECTED' || !!selectedDetailedOrder.sellerRejected;
        const isCompleted = selectedDetailedOrder.status === 'COMPLETED' || selectedDetailedOrder.status === 'DELIVERED';

        const stColorMap = {
          PENDING_APPROVAL: { bg:'#fffbeb', text:'#d97706', border:'#fcd34d' },
          APPROVED:         { bg:'#f0fdf4', text:'#16a34a', border:'#86efac' },
          DELIVERY_ASSIGNED:{ bg:'#eff6ff', text:'#2563eb', border:'#93c5fd' },
          LABEL_GENERATED:  { bg:'#f0f9ff', text:'#0369a1', border:'#7dd3fc' },
          READY_FOR_PICKUP: { bg:'#fff7ed', text:'#ea580c', border:'#fdba74' },
          PICKED_UP:        { bg:'#f5f3ff', text:'#7c3aed', border:'#c4b5fd' },
          IN_TRANSIT:       { bg:'#faf5ff', text:'#7c3aed', border:'#d8b4fe' },
          OUT_FOR_DELIVERY: { bg:'#fff1f2', text:'#e11d48', border:'#fda4af' },
          DELIVERED:        { bg:'#f0fdf4', text:'#15803d', border:'#4ade80' },
          COMPLETED:        { bg:'#f0fdf4', text:'#15803d', border:'#4ade80' },
          REJECTED:         { bg:'#fef2f2', text:'#dc2626', border:'#fca5a5' },
        };
        const sc = isRejected ? stColorMap.REJECTED : (stColorMap[selectedDetailedOrder.status] || { bg:'#f8fafc', text:'#475569', border:'#cbd5e1' });

        return (
          <div className="modal-overlay" style={{ zIndex: 9998, backgroundColor: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}>
            <div style={{
              background: '#ffffff', color: '#0f172a', width: '95vw', maxWidth: '940px',
              borderRadius: '18px', border: '1px solid #e2e8f0', overflow: 'hidden',
              boxShadow: '0 30px 70px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column',
              maxHeight: '92vh'
            }}>
              {/* Header */}
              <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '1.1rem' }}>\ud83d\udccb</span>
                    <h3 style={{ color: '#fff', margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>Order Details &amp; Action Panel</h3>
                  </div>
                  <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.78rem' }}>Order #{selectedDetailedOrder.orderId} &nbsp;\u00b7&nbsp; {selectedDetailedOrder.date}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '0.77rem', fontWeight: '700', background: sc.bg, color: sc.text, border: `1.5px solid ${sc.border}` }}>
                    {isRejected ? '\u274c Rejected' : `${ORDER_STAGES[currentStageIdx]?.icon || ''} ${ORDER_STAGES[currentStageIdx]?.label || selectedDetailedOrder.status}`}
                  </span>
                  <button onClick={() => { setSelectedDetailedOrderId(null); setSelectedCarrier(''); }}
                    style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#fff', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>

              {/* Stage Progress Bar */}
              {!isRejected && !isCompleted && (
                <div style={{ padding: '14px 28px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', overflowX: 'auto', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0', minWidth: 'max-content' }}>
                    {ORDER_STAGES.map((stage, si) => {
                      const done = currentStageIdx > si;
                      const curr = currentStageIdx === si;
                      return (
                        <div key={stage.key} style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', width: '64px' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: '700', background: done ? '#16a34a' : curr ? '#2563eb' : '#e2e8f0', color: (done || curr) ? '#fff' : '#94a3b8', boxShadow: curr ? '0 0 0 3px rgba(37,99,235,0.22)' : 'none', transition: 'all 0.3s' }}>
                              {done ? '\u2713' : stage.icon}
                            </div>
                            <span style={{ fontSize: '0.6rem', fontWeight: curr ? '700' : '500', color: curr ? '#2563eb' : done ? '#16a34a' : '#94a3b8', textAlign: 'center', lineHeight: 1.2 }}>{stage.label}</span>
                          </div>
                          {si < ORDER_STAGES.length - 1 && (
                            <div style={{ width: '20px', height: '2px', background: done ? '#16a34a' : '#e2e8f0', marginBottom: '16px', flexShrink: 0, transition: 'background 0.3s' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Body */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', flex: 1, overflowY: 'auto', minHeight: 0 }}>

                {/* LEFT: Info */}
                <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px', borderRight: '1px solid #f0f0f0', overflowY: 'auto' }}>

                  {/* Order Info */}
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700', color: '#64748b', marginBottom: '12px' }}>\ud83d\udce6 Order Information</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem' }}>
                      {[['Order ID', <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#0f172a' }}>{selectedDetailedOrder.orderId}</span>],
                        ['Date', selectedDetailedOrder.date],
                        ['Payment', <span style={{ color: '#16a34a', fontWeight: '600' }}>\ud83d\udd12 Secured in Emahu</span>],
                      ].map(([label, val], i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < 2 ? '1px solid #f0f0f0' : 'none', paddingBottom: i < 2 ? '8px' : '0' }}>
                          <span style={{ color: '#64748b' }}>{label}</span>
                          <strong>{val}</strong>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '2px' }}>
                        <span style={{ color: '#64748b' }}>Order Total</span>
                        <strong style={{ color: '#16a34a', fontSize: '1rem' }}>\u20b9{selectedDetailedOrder.total?.toLocaleString('en-IN')}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Customer */}
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700', color: '#64748b', marginBottom: '12px' }}>\ud83d\udc64 Customer</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.84rem' }}>
                      <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{selectedDetailedOrder.deliveryAddress?.fullName || 'N/A'}</strong>
                      <span style={{ color: '#475569' }}>\ud83d\udcde {selectedDetailedOrder.deliveryAddress?.phone || '\u2014'}</span>
                      <span style={{ color: '#475569' }}>\u2709\ufe0f {selectedDetailedOrder.deliveryAddress?.email || '\u2014'}</span>
                    </div>
                  </div>

                  {/* Address */}
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700', color: '#64748b', marginBottom: '10px' }}>\ud83d\udccd Delivery Address</div>
                    <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: '1.65', margin: 0 }}>
                      {selectedDetailedOrder.deliveryAddress?.address}<br/>
                      {selectedDetailedOrder.deliveryAddress?.city}, {selectedDetailedOrder.deliveryAddress?.stateName} \u2014 {selectedDetailedOrder.deliveryAddress?.pincode}
                    </p>
                  </div>

                  {/* Products */}
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700', color: '#64748b', marginBottom: '12px' }}>\ud83d\uded2 Ordered Items</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedDetailedOrder.items?.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '8px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          {item.img && item.img.startsWith('http') ? (
                            <img src={item.img} alt={item.name} style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '7px', flexShrink: 0, border: '1px solid #e2e8f0' }} />
                          ) : (
                            <div style={{ width: '42px', height: '42px', background: '#f1f5f9', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>{item.img || '\ud83d\udce6'}</div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.84rem', fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                            <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '2px' }}>{item.brand} \u00b7 Qty: {item.quantity}</div>
                          </div>
                          <strong style={{ fontSize: '0.84rem', color: '#0f172a', flexShrink: 0 }}>\u20b9{item.price?.toLocaleString('en-IN')}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Log */}
                  {selectedDetailedOrder.timeline?.length > 0 && (
                    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700', color: '#64748b', marginBottom: '12px' }}>\ud83d\udd50 Activity Log</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[...selectedDetailedOrder.timeline].reverse().map((t, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <span style={{ color: '#16a34a', fontSize: '0.7rem', marginTop: '3px', flexShrink: 0 }}>\u25cf</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <strong style={{ fontSize: '0.8rem', color: '#0f172a', display: 'block' }}>{t.label || t.status}</strong>
                              {t.desc && <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#475569' }}>{t.desc}</p>}
                            </div>
                            <span style={{ fontSize: '0.71rem', color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>{t.date || ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT: Actions */}
                <div style={{ padding: '22px 22px', background: '#fafbfc', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700', color: '#64748b' }}>\u26a1 Action Panel</div>

                  {(!isSeller || !ownsOrder) ? (
                    <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', color: '#dc2626', fontSize: '0.84rem' }}>
                      \u26a0\ufe0f You do not have permissions to execute actions on this order.
                    </div>
                  ) : (
                    <>
                      {/* PENDING_APPROVAL */}
                      {selectedDetailedOrder.status === 'PENDING_APPROVAL' && (
                        <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: '12px', padding: '18px' }}>
                          <p style={{ fontSize: '0.82rem', color: '#92400e', fontWeight: '600', margin: '0 0 14px 0' }}>\u23f3 Awaiting your decision. Approve or reject this order.</p>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => handleApproveOrder(selectedDetailedOrder.orderId)} disabled={!!orderLoading[selectedDetailedOrder.orderId]}
                              style={{ flex: 1, padding: '11px 0', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', opacity: orderLoading[selectedDetailedOrder.orderId] ? 0.6 : 1 }}>
                              {orderLoading[selectedDetailedOrder.orderId] ? '\u23f3 Approving...' : '\u2713 Approve Order'}
                            </button>
                            <button onClick={() => { setSelectedOrderId(selectedDetailedOrder.orderId); setRejectionReasonType('Out of Stock'); setCustomRejectReason(''); setIsRejectModalOpen(true); }} disabled={!!orderLoading[selectedDetailedOrder.orderId]}
                              style={{ flex: 1, padding: '11px 0', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', opacity: orderLoading[selectedDetailedOrder.orderId] ? 0.6 : 1 }}>
                              \u2715 Reject Order
                            </button>
                          </div>
                        </div>
                      )}

                      {/* APPROVED */}
                      {selectedDetailedOrder.status === 'APPROVED' && (
                        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                            <span style={{ width: '22px', height: '22px', background: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: '700' }}>\u2713</span>
                            <span style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: '700' }}>Order Approved \u2014 Assign Delivery Partner</span>
                          </div>
                          <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Select Courier Partner</label>
                          <select value={selectedCarrier} onChange={e => setSelectedCarrier(e.target.value)} disabled={!!orderLoading[selectedDetailedOrder.orderId]}
                            style={{ width: '100%', height: '40px', border: '1.5px solid #d1d5db', borderRadius: '8px', padding: '0 10px', fontSize: '0.85rem', color: '#0f172a', background: '#fff', marginBottom: '12px', outline: 'none', cursor: 'pointer' }}>
                            <option value="">\u2014 Select Courier Partner \u2014</option>
                            <option value="Delhivery">\ud83d\ude9a Delhivery</option>
                            <option value="Blue Dart">\ud83d\udd35 Blue Dart</option>
                            <option value="XpressBees">\ud83d\udc1d XpressBees</option>
                            <option value="DTDC">\ud83d\udce6 DTDC</option>
                            <option value="Ecom Express">\u26a1 Ecom Express</option>
                            <option value="India Post">\ud83c\uddee\ud83c\uddf3 India Post</option>
                          </select>
                          <button onClick={() => handleAssignAndGenerateLabel(selectedDetailedOrder.orderId, selectedCarrier)} disabled={!selectedCarrier || !!orderLoading[selectedDetailedOrder.orderId]}
                            style={{ width: '100%', padding: '12px 0', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem', border: 'none', cursor: selectedCarrier ? 'pointer' : 'not-allowed', background: selectedCarrier ? '#4f46e5' : '#e2e8f0', color: selectedCarrier ? '#fff' : '#94a3b8', opacity: orderLoading[selectedDetailedOrder.orderId] ? 0.6 : 1 }}>
                            {orderLoading[selectedDetailedOrder.orderId] ? '\u23f3 Generating...' : '\ud83c\udff7\ufe0f Generate Shipping Label'}
                          </button>
                        </div>
                      )}

                      {/* DELIVERY_ASSIGNED */}
                      {selectedDetailedOrder.status === 'DELIVERY_ASSIGNED' && (
                        <div style={{ background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: '12px', padding: '18px' }}>
                          <p style={{ fontSize: '0.82rem', color: '#1e3a8a', fontWeight: '600', margin: '0 0 14px 0' }}>\ud83d\ude9a Delivery partner assigned. Print label & mark ready for pickup.</p>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => { setActiveLabelOrder(selectedDetailedOrder); setIsLabelModalOpen(true); }}
                              style={{ flex: 1, padding: '11px 0', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}>
                              \ud83d\udda8\ufe0f Print Label
                            </button>
                            <button onClick={() => handleMarkReadyForPickup(selectedDetailedOrder.orderId)} disabled={!!orderLoading[selectedDetailedOrder.orderId]}
                              style={{ flex: 1, padding: '11px 0', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', opacity: orderLoading[selectedDetailedOrder.orderId] ? 0.6 : 1 }}>
                              {orderLoading[selectedDetailedOrder.orderId] ? '\u23f3 Processing...' : '\ud83d\udce6 Mark Ready'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* LABEL_GENERATED */}
                      {selectedDetailedOrder.status === 'LABEL_GENERATED' && (
                        <div style={{ background: '#f0f9ff', border: '1.5px solid #7dd3fc', borderRadius: '12px', padding: '18px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                            {['Payment \u2705','Approved \u2705','Assigned \u2705','Label Ready \u2705'].map(t => (
                              <span key={t} style={{ fontSize: '0.72rem', color: '#15803d', background: '#dcfce7', padding: '3px 10px', borderRadius: '20px', fontWeight: '600' }}>{t}</span>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => { setActiveLabelOrder(selectedDetailedOrder); setIsLabelModalOpen(true); }}
                              style={{ flex: 1, padding: '11px 0', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}>
                              \ud83d\udda8\ufe0f Print Label
                            </button>
                            <button onClick={() => handleMarkReadyForPickup(selectedDetailedOrder.orderId)} disabled={!!orderLoading[selectedDetailedOrder.orderId]}
                              style={{ flex: 1, padding: '11px 0', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', opacity: orderLoading[selectedDetailedOrder.orderId] ? 0.6 : 1 }}>
                              {orderLoading[selectedDetailedOrder.orderId] ? '\u23f3 Processing...' : '\ud83d\udce6 Mark Ready for Pickup'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* READY_FOR_PICKUP */}
                      {selectedDetailedOrder.status === 'READY_FOR_PICKUP' && (
                        <div style={{ background: '#fff7ed', border: '1.5px solid #fdba74', borderRadius: '12px', padding: '18px' }}>
                          <p style={{ fontSize: '0.82rem', color: '#9a3412', fontWeight: '600', margin: '0 0 14px 0' }}>\u23f3 Package packed & ready. Click when courier agent collects it.</p>
                          <button onClick={() => handleAdvanceStatus(selectedDetailedOrder.orderId, 'PICKED_UP')} disabled={!!orderLoading[selectedDetailedOrder.orderId]}
                            style={{ width: '100%', padding: '12px 0', background: '#ea580c', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', opacity: orderLoading[selectedDetailedOrder.orderId] ? 0.6 : 1 }}>
                            {orderLoading[selectedDetailedOrder.orderId] ? '\u23f3 Processing...' : '\ud83d\ude80 Mark as Picked Up by Courier'}
                          </button>
                        </div>
                      )}

                      {/* PICKED_UP / IN_TRANSIT / OUT_FOR_DELIVERY */}
                      {['PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY'].includes(selectedDetailedOrder.status) && (
                        <div style={{ background: '#faf5ff', border: '1.5px solid #d8b4fe', borderRadius: '12px', padding: '18px' }}>
                          <p style={{ fontSize: '0.8rem', color: '#6d28d9', fontWeight: '600', margin: '0 0 14px 0' }}>
                            {selectedDetailedOrder.status === 'PICKED_UP' && '\ud83d\ude80 Package picked up. Advance to In Transit.'}
                            {selectedDetailedOrder.status === 'IN_TRANSIT' && '\ud83d\ude9b Package in transit. Mark Out for Delivery when near local hub.'}
                            {selectedDetailedOrder.status === 'OUT_FOR_DELIVERY' && '\ud83d\udef5 Out for delivery. Mark delivered once drop-off is complete.'}
                          </p>
                          {selectedDetailedOrder.status === 'PICKED_UP' && (
                            <button onClick={() => handleAdvanceStatus(selectedDetailedOrder.orderId, 'IN_TRANSIT')} disabled={!!orderLoading[selectedDetailedOrder.orderId]}
                              style={{ width: '100%', padding: '11px 0', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', opacity: orderLoading[selectedDetailedOrder.orderId] ? 0.6 : 1 }}>
                              {orderLoading[selectedDetailedOrder.orderId] ? '\u23f3 Processing...' : '\ud83d\ude9b Mark In Transit'}
                            </button>
                          )}
                          {selectedDetailedOrder.status === 'IN_TRANSIT' && (
                            <button onClick={() => handleAdvanceStatus(selectedDetailedOrder.orderId, 'OUT_FOR_DELIVERY')} disabled={!!orderLoading[selectedDetailedOrder.orderId]}
                              style={{ width: '100%', padding: '11px 0', background: '#a855f7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', opacity: orderLoading[selectedDetailedOrder.orderId] ? 0.6 : 1 }}>
                              {orderLoading[selectedDetailedOrder.orderId] ? '\u23f3 Processing...' : '\ud83d\udef5 Mark Out for Delivery'}
                            </button>
                          )}
                          {selectedDetailedOrder.status === 'OUT_FOR_DELIVERY' && (
                            <button onClick={() => handleAdvanceStatus(selectedDetailedOrder.orderId, 'DELIVERED')} disabled={!!orderLoading[selectedDetailedOrder.orderId]}
                              style={{ width: '100%', padding: '11px 0', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', opacity: orderLoading[selectedDetailedOrder.orderId] ? 0.6 : 1 }}>
                              {orderLoading[selectedDetailedOrder.orderId] ? '\u23f3 Processing...' : '\ud83c\udf89 Mark Delivered'}
                            </button>
                          )}
                        </div>
                      )}

                      {/* COMPLETED / DELIVERED */}
                      {isCompleted && (
                        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
                          <div style={{ fontSize: '2.8rem', marginBottom: '10px' }}>\ud83c\udf89</div>
                          <p style={{ color: '#15803d', fontWeight: '700', fontSize: '1rem', margin: '0 0 4px 0' }}>Transaction Completed</p>
                          <p style={{ color: '#4ade80', fontSize: '0.8rem', margin: 0 }}>Funds will be released after buyer confirmation.</p>
                        </div>
                      )}

                      {/* REJECTED */}
                      {isRejected && (
                        <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '12px', padding: '18px' }}>
                          <div style={{ color: '#dc2626', fontWeight: '700', fontSize: '1rem', marginBottom: '8px' }}>\u274c Order Rejected</div>
                          {selectedDetailedOrder.rejectionReason && (
                            <div style={{ background: '#fff', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 12px', fontSize: '0.82rem', color: '#7f1d1d' }}>
                              <strong>Reason:</strong> {selectedDetailedOrder.rejectionReason}
                            </div>
                          )}
                          <p style={{ fontSize: '0.77rem', color: '#94a3b8', marginTop: '10px', marginBottom: 0 }}>Emahu funds will be automatically returned to the buyer.</p>
                        </div>
                      )}

                      {/* Carrier details if assigned */}
                      {selectedDetailedOrder.carrier && !['PENDING_APPROVAL','APPROVED','REJECTED'].includes(selectedDetailedOrder.status) && (
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700', color: '#64748b', marginBottom: '10px' }}>\ud83d\ude9a Carrier Details</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Partner</span><strong>{selectedDetailedOrder.carrier}</strong></div>
                            {selectedDetailedOrder.trackingId && (
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Tracking #</span><strong style={{ color: '#4f46e5', fontFamily: 'monospace', fontSize: '0.78rem' }}>{selectedDetailedOrder.trackingId}</strong></div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div style={{ borderTop: '1px solid #e2e8f0', padding: '14px 28px', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc', flexShrink: 0 }}>
                <button onClick={() => { setSelectedDetailedOrderId(null); setSelectedCarrier(''); }}
                  style={{ padding: '9px 24px', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '8px', color: '#475569', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
'@

$before = $lines[0..($startLine-1)]
$after  = $lines[($endLine+1)..($lines.Count-1)]
$result = $before + $newBlock.Split("`n") + $after
$result | Set-Content $file -Encoding UTF8
Write-Host "Done: replaced lines $($startLine+1) to $($endLine+1)"
