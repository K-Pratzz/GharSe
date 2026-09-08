import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

const STATUS_COLOR = {
  placed: 'text-marigold-dark', accepted: 'text-marigold-dark', preparing: 'text-marigold-dark',
  ready: 'text-tulsi-dark', out_for_delivery: 'text-tulsi-dark', completed: 'text-tulsi-dark',
  rejected: 'text-red-700', cancelled: 'text-red-700',
};

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders').then(({ data }) => { setOrders(data.orders); setLoading(false); });
  }, []);

  const current = orders.filter((o) => !['completed', 'rejected', 'cancelled'].includes(o.status));
  const past = orders.filter((o) => ['completed', 'rejected', 'cancelled'].includes(o.status));

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <h1 className="font-display text-3xl mb-6">My orders</h1>
      {loading && <p className="text-clay">Loading...</p>}

      {!loading && (
        <>
          <Section title="Current orders" orders={current} empty="No active orders." />
          <Section title="Previous orders" orders={past} empty="No past orders yet." />
        </>
      )}
    </div>
  );
}

function Section({ title, orders, empty }) {
  return (
    <div className="mb-8">
      <h2 className="font-medium text-lg mb-3">{title}</h2>
      {orders.length === 0 && <p className="text-clay text-sm">{empty}</p>}
      <div className="space-y-3">
        {orders.map((o) => (
          <Link key={o._id} to={`/orders/${o._id}`} className="block bg-white rounded-card border border-marigold-light/50 p-4 hover:border-marigold">
            <div className="flex justify-between items-center">
              <span className="font-medium">#{o.orderNumber}</span>
              <span className={`text-sm font-medium ${STATUS_COLOR[o.status]}`}>{o.status.replace(/_/g, ' ')}</span>
            </div>
            <p className="text-sm text-clay mt-1">
              {o.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')} · ₹{o.total}
            </p>
            <p className="text-xs text-clay mt-1">{new Date(o.createdAt).toLocaleString()}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
