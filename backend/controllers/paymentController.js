const Order = require('../models/Order');
const User = require('../models/User');
const PlatformSettings = require('../models/PlatformSettings');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');

// Helper: get or initialize the singleton settings doc
const getSettings = async () => {
  let settings = await PlatformSettings.findOne({ docId: 'global' });
  if (!settings) {
    settings = await PlatformSettings.create({ docId: 'global', platformFeePercent: 4 });
  }
  return settings;
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get current platform fee settings
// @route   GET /api/payment/settings
// @access  Public (seller & admin both need to read it)
// ─────────────────────────────────────────────────────────────────────────────
exports.getPlatformSettings = async (req, res) => {
  try {
    const settings = await getSettings();
    res.status(200).json({
      success: true,
      platformFeePercent: settings.platformFeePercent,
      platformFeeName: settings.platformFeeName,
      lastUpdatedBy: settings.lastUpdatedBy,
      updatedAt: settings.updatedAt
    });
  } catch (error) {
    console.error('getPlatformSettings error:', error);
    res.status(500).json({ success: false, error: 'Server error fetching platform settings' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update platform fee % (admin only)
// @route   PUT /api/payment/settings
// @access  Private (Admin)
// ─────────────────────────────────────────────────────────────────────────────
exports.updatePlatformSettings = async (req, res) => {
  try {
    const { platformFeePercent, platformFeeName } = req.body;

    if (platformFeePercent === undefined || platformFeePercent < 0 || platformFeePercent > 100) {
      return res.status(400).json({ success: false, error: 'Platform fee must be between 0 and 100' });
    }

    const settings = await getSettings();
    const oldPercent = settings.platformFeePercent;

    // Record history
    settings.feeHistory.push({
      oldPercent,
      newPercent: Number(platformFeePercent),
      changedBy: req.user?.email || 'admin',
      changedAt: new Date()
    });

    settings.platformFeePercent = Number(platformFeePercent);
    if (platformFeeName) settings.platformFeeName = platformFeeName;
    settings.lastUpdatedBy = req.user?.email || 'admin';

    await settings.save();

    res.status(200).json({
      success: true,
      message: `Platform fee updated from ${oldPercent}% to ${platformFeePercent}%`,
      platformFeePercent: settings.platformFeePercent,
      platformFeeName: settings.platformFeeName
    });
  } catch (error) {
    console.error('updatePlatformSettings error:', error);
    res.status(500).json({ success: false, error: 'Server error updating platform settings' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Release payment for an order (seller-initiated)
// @route   POST /api/payment/release/:orderId
// @access  Private (Seller)
// ─────────────────────────────────────────────────────────────────────────────
exports.releasePayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Find order
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Check order is in releasable state
    const releasableStatuses = ['DELIVERED', 'COMPLETED', '🔓 FUNDS RELEASED'];
    if (!releasableStatuses.includes(order.status) && order.deliveryStatus !== 'delivered') {
      return res.status(400).json({
        success: false,
        error: `Payment can only be released for DELIVERED or COMPLETED orders. Current status: ${order.status}`
      });
    }

    // Check not already released
    if (order.paymentReleased) {
      return res.status(400).json({
        success: false,
        error: 'Payment has already been released for this order',
        releasedAt: order.paymentReleasedAt,
        sellerNetPayout: order.sellerNetPayout
      });
    }

    // Get current platform fee
    const settings = await getSettings();
    const feePercent = settings.platformFeePercent;

    // Calculate amounts using productAmount if available, else total
    const orderTotal = order.total || 0;
    const productAmount = order.productAmount || orderTotal;
    const penaltyAmount = order.penaltyAmount || 0;
    const feeAmount = parseFloat(((productAmount * feePercent) / 100).toFixed(2));
    const netPayout = parseFloat((productAmount - feeAmount - penaltyAmount).toFixed(2));

    // Update order
    order.paymentReleased = true;
    order.paymentReleasedAt = new Date();
    order.paymentStatus = 'released';
    order.status = '🔓 FUNDS RELEASED';
    order.platformFeePercent = feePercent;
    order.platformFeeAmount = feeAmount;
    order.sellerNetPayout = netPayout;

    // Add timeline event
    order.timeline = order.timeline || [];
    order.timeline.push({
      status: '🔓 FUNDS RELEASED',
      label: 'Payment Released',
      desc: `₹${netPayout} released to seller after ${feePercent}% Emahu fee (₹${feeAmount})${penaltyAmount > 0 ? ` and ₹${penaltyAmount} penalty` : ''}.`,
      date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    });

    await order.save();

    // ── Send In-App Notification to seller ──
    try {
      const sellerUser = await User.findOne({ email: order.sellerEmail });
      if (sellerUser) {
        await Notification.create({
          recipient: sellerUser._id,
          title: '💰 Payment Released!',
          message: `Order #${orderId}: ₹${netPayout} has been released to your account after ${feePercent}% Emahu platform fee (₹${feeAmount} deducted from ₹${productAmount}).`,
          type: 'success'
        });
      }
    } catch (notifErr) {
      console.warn('Failed to create notification for payment release:', notifErr.message);
    }

    // ── Send Email to seller ──
    try {
      if (order.sellerEmail) {
        const releaseDate = new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'full',
          timeStyle: 'short'
        });
        sendEmail({
          to: order.sellerEmail,
          subject: `💰 Payment Released – Order #${orderId} | Emahu Marketplace`,
          text: `Dear Seller,\n\nGreat news! Your payment for Order #${orderId} has been released.\n\nPAYMENT BREAKDOWN\n─────────────────────\nOrder Total (Products): ₹${productAmount}\nEmahu Platform Fee (${feePercent}%): - ₹${feeAmount}\n${penaltyAmount > 0 ? `Admin Penalty Deduction: - ₹${penaltyAmount} (${order.penaltyReason || 'Penalty'})\n` : ''}Net Payout to You: ₹${netPayout}\n─────────────────────\n\nRelease Date: ${releaseDate}\n\nThank you for selling on Emahu Marketplace!\n\nBest Regards,\nEmahu Team`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
              <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px 28px; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 1.6rem;">💰 Payment Released!</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 0.95rem;">Order #${orderId}</p>
              </div>
              <div style="padding: 28px; background: #fff;">
                <p style="color: #374151; font-size: 0.95rem; margin-bottom: 24px;">Dear Seller, your payment has been processed and released to your account.</p>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
                  <h3 style="color: #0f172a; margin: 0 0 16px 0; font-size: 1rem;">Payment Breakdown</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #475569; font-size: 0.88rem;">Order Total (Products)</td>
                      <td style="padding: 8px 0; text-align: right; color: #0f172a; font-weight: 600;">₹${productAmount}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #dc2626; font-size: 0.88rem;">Emahu Platform Fee (${feePercent}%)</td>
                      <td style="padding: 8px 0; text-align: right; color: #dc2626; font-weight: 600;">− ₹${feeAmount}</td>
                    </tr>
                    ${penaltyAmount > 0 ? `
                    <tr>
                      <td style="padding: 8px 0; color: #dc2626; font-size: 0.88rem;">Admin Penalty Deduction (${order.penaltyReason || 'Penalty'})</td>
                      <td style="padding: 8px 0; text-align: right; color: #dc2626; font-weight: 600;">− ₹${penaltyAmount}</td>
                    </tr>
                    ` : ''}
                    <tr style="border-top: 2px solid #e2e8f0;">
                      <td style="padding: 12px 0 4px; color: #0f172a; font-size: 1rem; font-weight: 700;">Net Payout to You</td>
                      <td style="padding: 12px 0 4px; text-align: right; color: #16a34a; font-size: 1.15rem; font-weight: 800;">₹${netPayout}</td>
                    </tr>
                  </table>
                </div>

                <p style="color: #64748b; font-size: 0.82rem; margin: 0;">Released on: ${releaseDate}</p>
              </div>
              <div style="background: #f8fafc; padding: 16px 28px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; font-size: 0.78rem; margin: 0;">Thank you for selling on <strong style="color: #10b981;">Emahu Marketplace</strong></p>
              </div>
            </div>
          `
        }).catch(emailErr => {
          console.warn('Failed to send payment release email asynchronously:', emailErr.message);
        });
      }
    } catch (emailErr) {
      console.warn('Failed to construct payment release email:', emailErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Payment released successfully',
      orderId,
      orderTotal,
      productAmount,
      platformFeePercent: feePercent,
      platformFeeAmount: feeAmount,
      sellerNetPayout: netPayout,
      releasedAt: order.paymentReleasedAt,
      newStatus: order.status
    });
  } catch (error) {
    console.error('releasePayment error:', error);
    res.status(500).json({ success: false, error: 'Server error releasing payment: ' + error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all released payments (admin view)
// @route   GET /api/payment/released
// @access  Private (Admin)
// ─────────────────────────────────────────────────────────────────────────────
exports.getReleasedPayments = async (req, res) => {
  try {
    const orders = await Order.find({ paymentReleased: true })
      .sort({ paymentReleasedAt: -1 })
      .select('orderId sellerEmail total productAmount platformFeePercent platformFeeAmount sellerNetPayout paymentReleasedAt status deliveryAddress items');

    const totalReleased = orders.reduce((sum, o) => sum + (o.sellerNetPayout || 0), 0);
    const totalFeeCollected = orders.reduce((sum, o) => sum + (o.platformFeeAmount || 0), 0);

    res.status(200).json({
      success: true,
      count: orders.length,
      totalReleased: parseFloat(totalReleased.toFixed(2)),
      totalFeeCollected: parseFloat(totalFeeCollected.toFixed(2)),
      orders
    });
  } catch (error) {
    console.error('getReleasedPayments error:', error);
    res.status(500).json({ success: false, error: 'Server error fetching released payments' });
  }
};
