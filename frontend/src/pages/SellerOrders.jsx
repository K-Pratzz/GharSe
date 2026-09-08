import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';

const NEXT_ACTIONS = {
  placed: [{ status: 'accepted', label: 'Accept' }, { status: 'rejected', label: 'Reject' }],
  accepted: [{ status: 'preparing', label: 'Start preparing' }, { status: 'cancelled', label: 'Cancel' }],
  preparing: [{ status: 'ready', label: 'Mark ready' }, { status: 'cancelled', label: 'Cancel' }],
  ready: [{ status: 'out_for_delivery', label: 'Out for delivery' }, { status: 'completed', label: 'Completed (picked up)' }],
  out_for_delivery: [{ status: 'completed', label: 'Completed' }],
  completed: [],
  rejected: [],
  cancelled: [],
};

export default function SellerOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  function load() {
    api.get('/orders').then(({ data }) => setOrders(data.orders)).catch((err) => setError(apiErrorMessage(err)));
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(orderId, status, reason) {
    setError('');
    try {
      await api.put(`/orders/${orderId}/status`, { status, rejectionReason: reason });
      setRejectingId(null);
      setRejectionReason('');
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  const active = orders.filter((o) => !['completed', 'rejected', 'cancelled'].includes(o.status));
  const done = orders.filter((o) => ['completed', 'rejected', 'cancelled'].includes(o.status));

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <h1 className="font-display text-3xl mb-6">Manage orders</h1>
      {error && <p className="text-red-700 text-sm mb-4">{error}</p>}

      <h2 className="font-medium text-lg mb-3">Incoming &amp; active</h2>
      {active.length === 0 && <p className="text-clay text-sm mb-6">No active orders right now.</p>}
      <div className="space-y-3 mb-8">
        {active.map((o) => (
          <div key={o._id} className="bg-white rounded-card border border-marigold-light/50 p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">#{o.orderNumber} · {o.customerId?.name}</p>
                <p className="text-sm text-clay">
                  {o.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')} · ₹{o.total}
                </p>
                <p className="text-xs text-clay mt-1">
                  {o.fulfillmentType === 'pickup' ? 'Pickup' : `Delivery to ${o.deliveryLocality}`} ·{' '}
                  {new Date(o.createdAt).toLocaleString()}
                </p>
              </div>
              <span className="text-sm font-medium text-marigold-dark">{o.status.replace(/_/g, ' ')}</span>
            </div>

            {rejectingId === o._id ? (
              <div className="mt-3">
                <input
                  className="w-full border border-marigold-light/60 rounded-lg px-3 py-2 mb-2 focus-ring text-sm"
                  placeholder="Reason for rejecting"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(o._id, 'rejected', rejectionReason)}
                    disabled={!rejectionReason}
                    className="px-4 py-1.5 rounded-full bg-red-700 text-ivory text-sm disabled:opacity-50"
                  >
                    Confirm reject
                  </button>
                  <button onClick={() => setRejectingId(null)} className="px-4 py-1.5 rounded-full border border-marigold-light/60 text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 mt-3">
                {(NEXT_ACTIONS[o.status] || []).map((action) =>
                  action.status === 'rejected' ? (
                    <button key={action.status} onClick={() => setRejectingId(o._id)} className="px-4 py-1.5 rounded-full border border-red-700 text-red-700 text-sm">
                      {action.label}
                    </button>
                  ) : (
                    <button
                      key={action.status}
                      onClick={() => updateStatus(o._id, action.status)}
                      className="px-4 py-1.5 rounded-full bg-tulsi text-ivory text-sm hover:bg-tulsi-dark"
                    >
                      {action.label}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 className="font-medium text-lg mb-3">History</h2>
      <div className="space-y-2">
        {done.map((o) => (
          <div key={o._id} className="bg-white/60 rounded-card border border-marigold-light/40 p-3 text-sm flex justify-between">
            <span>#{o.orderNumber} · {o.items.map((i) => i.name).join(', ')}</span>
            <span className={o.status === 'completed' ? 'text-tulsi-dark' : 'text-red-700'}>{o.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
