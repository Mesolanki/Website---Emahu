'use client';

export async function logAnalyticsEvent({ type, productId, sellerId }) {
  try {
    if (!sellerId) return;

    let userId = '';
    if (typeof window !== 'undefined') {
      const buyerUserStr = localStorage.getItem('emahu_buyer_user');
      if (buyerUserStr) {
        try {
          userId = JSON.parse(buyerUserStr).id || JSON.parse(buyerUserStr)._id || '';
        } catch (e) {}
      }
      if (!userId) {
        userId = localStorage.getItem('emahu_guest_id') || '';
      }
    }

    let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        apiUrl = apiUrl.replace('localhost', hostname).replace('127.0.0.1', hostname);
      } else {
        apiUrl = apiUrl.replace('localhost', '127.0.0.1');
      }
    }
    await fetch(apiUrl + '/api/analytics/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type,
        productId,
        sellerId: sellerId.toString(),
        userId
      })
    });
  } catch (err) {
    console.warn('Failed to log analytics event:', err);
  }
}
