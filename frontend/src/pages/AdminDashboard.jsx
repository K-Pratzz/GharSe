import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../api/client';

const TABS = ['Overview', 'Sellers', 'Listings', 'Orders', 'Complaints', 'Settings'];

export default function AdminDashboard() {
  const [tab, setTab] = useState('Overview');

  return (
    <div className="max-w-6xl mx-auto px-5 py-8">
      <h1 className="font-display text-3xl mb-6">Admin dashboard</h1>
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm border ${tab === t ? 'bg-tulsi text-ivory border-tulsi' : 'border-marigold-light/60 text-clay'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <Overview />}
      {tab === 'Sellers' && <Sellers />}
      {tab === 'Listings' && <Listings />}
      {tab === 'Orders' && <Orders />}
      {tab === 'Complaints' && <Complaints />}
      {tab === 'Settings' && <Settings />}
    </div>
  );
}

function Overview() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/admin/stats').then(({ data }) => setStats(data)); }, []);
  if (!stats) return <p className="text-clay">Loading...</p>;
  const items = [
    ['Customers', stats.customers], ['Sellers', stats.sellers], ['Pending verification', stats.pendingSellers],
    ['Active listings', stats.activeListings], ['Total orders', stats.totalOrders], ['Open complaints', stats.openComplaints],
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {items.map(([label, value]) => (
        <div key={label} className="bg-white rounded-card border border-marigold-light/50 p-4">
          <p className="text-2xl font-display">{value}</p>
          <p className="text-xs text-clay mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
}

function Sellers() {
  const [sellers, setSellers] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [error, setError] = useState('');

  function load() {
    api.get('/admin/sellers', { params: filter ? { verificationStatus: filter } : {} }).then(({ data }) => setSellers(data.sellers));
  }
  useEffect(() => { load(); }, [filter]);

  async function setVerification(id, status) {
    setError('');
    try {
      await api.put(`/admin/sellers/${id}/verify`, { status });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['pending', 'verified', 'rejected', ''].map((s) => (
          <button key={s || 'all'} onClick={() => setFilter(s)} className={`px-3 py-1 rounded-full text-sm border ${filter === s ? 'bg-marigold text-ink border-marigold' : 'border-marigold-light/60'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>
      {error && <p className="text-red-700 text-sm mb-3">{error}</p>}
      <div className="space-y-3">
        {sellers.length === 0 && <p className="text-clay text-sm">No sellers in this category.</p>}
        {sellers.map((s) => (
          <div key={s._id} className="bg-white rounded-card border border-marigold-light/50 p-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{s.userId?.name}</p>
              <p className="text-xs text-clay">{s.userId?.email} · {s.userId?.phone} · {s.userId?.locality}</p>
              <p className="text-xs text-clay">Status: {s.verificationStatus}</p>
            </div>
            <div className="flex gap-2">
              {s.verificationStatus !== 'verified' && (
                <button onClick={() => setVerification(s._id, 'verified')} className="px-3 py-1.5 rounded-full bg-tulsi text-ivory text-sm">Approve</button>
              )}
              {s.verificationStatus !== 'rejected' && (
                <button onClick={() => setVerification(s._id, 'rejected')} className="px-3 py-1.5 rounded-full border border-red-700 text-red-700 text-sm">Reject</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Listings() {
  const [listings, setListings] = useState([]);
  function load() { api.get('/admin/listings').then(({ data }) => setListings(data.listings)); }
  useEffect(() => { load(); }, []);

  async function setStatus(id, status) {
    await api.put(`/admin/listings/${id}/status`, { status });
    load();
  }

  return (
    <div className="space-y-2">
      {listings.map((l) => (
        <div key={l._id} className="bg-white rounded-card border border-marigold-light/50 p-3 flex justify-between items-center text-sm">
          <div>
            <span className="font-medium">{l.name}</span> · {l.sellerId?.userId?.name} · ₹{l.price} · {l.status}
          </div>
          <div className="flex gap-2">
            {l.status !== 'hidden' && <button onClick={() => setStatus(l._id, 'hidden')} className="px-3 py-1 rounded-full border border-marigold-light/60">Hide</button>}
            {l.status === 'hidden' && <button onClick={() => setStatus(l._id, 'active')} className="px-3 py-1 rounded-full border border-tulsi text-tulsi">Unhide</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Orders() {
  const [orders, setOrders] = useState([]);
  useEffect(() => { api.get('/admin/orders').then(({ data }) => setOrders(data.orders)); }, []);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm bg-white rounded-card border border-marigold-light/50">
        <thead>
          <tr className="text-left border-b border-marigold-light/40">
            <th className="p-3">Order</th><th>Customer</th><th>Seller</th><th>Amount</th><th>Status</th><th>Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o._id} className="border-b border-marigold-light/20">
              <td className="p-3">#{o.orderNumber}</td>
              <td>{o.customerId?.name}</td>
              <td>{o.sellerId?.userId?.name}</td>
              <td>₹{o.total}</td>
              <td>{o.status.replace(/_/g, ' ')}</td>
              <td>{new Date(o.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [resolutionDrafts, setResolutionDrafts] = useState({});

  function load() { api.get('/admin/complaints').then(({ data }) => setComplaints(data.complaints)); }
  useEffect(() => { load(); }, []);

  async function updateComplaint(id, status) {
    await api.put(`/admin/complaints/${id}`, { status, resolution: resolutionDrafts[id] });
    load();
  }

  return (
    <div className="space-y-3">
      {complaints.length === 0 && <p className="text-clay text-sm">No complaints.</p>}
      {complaints.map((c) => (
        <div key={c._id} className="bg-white rounded-card border border-marigold-light/50 p-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">{c.category.replace(/_/g, ' ')} · Order #{c.orderId?.orderNumber}</span>
            <span className="text-clay">{c.status}</span>
          </div>
          <p className="text-sm text-clay mb-2">{c.description}</p>
          <p className="text-xs text-clay mb-2">
            Customer: {c.customerId?.name} · Seller: {c.sellerId?.userId?.name}
          </p>
          <input
            className="w-full border border-marigold-light/60 rounded-lg px-3 py-1.5 mb-2 text-sm"
            placeholder="Resolution notes"
            defaultValue={c.resolution}
            onChange={(e) => setResolutionDrafts((d) => ({ ...d, [c._id]: e.target.value }))}
          />
          <div className="flex gap-2">
            <button onClick={() => updateComplaint(c._id, 'investigating')} className="px-3 py-1 rounded-full border border-marigold-light/60 text-sm">Investigating</button>
            <button onClick={() => updateComplaint(c._id, 'resolved')} className="px-3 py-1 rounded-full bg-tulsi text-ivory text-sm">Resolve</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Settings() {
  const [commission, setCommission] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.get('/admin/commission').then(({ data }) => setCommission(String(data.commissionPercent))); }, []);

  async function save() {
    await api.put('/admin/commission', { commissionPercent: Number(commission) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="bg-white rounded-card border border-marigold-light/50 p-5 max-w-sm">
      <label className="block text-sm text-clay mb-1">Platform commission (%)</label>
      <input
        type="number"
        className="w-full border border-marigold-light/60 rounded-lg px-3 py-2 mb-3"
        value={commission}
        onChange={(e) => setCommission(e.target.value)}
      />
      <button onClick={save} className="px-5 py-2 rounded-full bg-marigold text-ink font-medium hover:bg-marigold-dark hover:text-ivory transition">
        Save
      </button>
      {saved && <p className="text-tulsi-dark text-sm mt-2">Saved.</p>}
    </div>
  );
}
