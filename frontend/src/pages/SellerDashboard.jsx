import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { imageUrl } from '../api/client';

export default function SellerDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/sellers/dashboard').then(({ data }) => setData(data));
  }, []);

  if (!data) return <div className="max-w-5xl mx-auto px-5 py-16 text-clay">Loading...</div>;

  const { seller, listings, summary } = data;
  const active = listings.filter((l) => l.status === 'active');
  const soldOut = listings.filter((l) => l.status === 'soldout');

  return (
    <div className="max-w-5xl mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl">Today's menu</h1>
          {seller.verificationStatus !== 'verified' && (
            <p className="text-sm mt-1 px-3 py-1 inline-block rounded-full bg-marigold-light/40 text-clay">
              Verification {seller.verificationStatus} — {seller.verificationStatus === 'pending' ? 'you can add listings once approved.' : 'contact support for details.'}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Link to="/seller/add-food" className="px-5 py-2.5 rounded-full bg-marigold text-ink font-medium hover:bg-marigold-dark hover:text-ivory transition">
            Add today's food
          </Link>
          <Link to="/seller/orders" className="px-5 py-2.5 rounded-full border border-tulsi text-tulsi font-medium hover:bg-tulsi hover:text-ivory transition">
            Manage orders
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Active listings" value={summary.activeListings} />
        <Stat label="Sold out" value={summary.soldOutListings} />
        <Stat label="Pending orders" value={summary.pendingOrders} />
        <Stat label="Total earnings" value={`₹${summary.totalEarnings}`} />
      </div>

      <h2 className="font-medium text-lg mb-3">Active dishes</h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {active.length === 0 && <p className="text-clay text-sm">No active listings — add today's menu to go live.</p>}
        {active.map((l) => <ListingRow key={l._id} listing={l} />)}
      </div>

      {soldOut.length > 0 && (
        <>
          <h2 className="font-medium text-lg mb-3">Sold out</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {soldOut.map((l) => <ListingRow key={l._id} listing={l} />)}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white rounded-card border border-marigold-light/50 p-4">
      <p className="text-2xl font-display">{value}</p>
      <p className="text-xs text-clay mt-1">{label}</p>
    </div>
  );
}

function ListingRow({ listing }) {
  return (
    <div className="bg-white rounded-card border border-marigold-light/50 p-4">
      <div className="flex gap-3">
        <div className="w-14 h-14 rounded-lg bg-marigold-light/30 flex-shrink-0 overflow-hidden flex items-center justify-center">
          {listing.image ? <img src={imageUrl(listing.image)} className="w-full h-full object-cover" /> : <span className="font-display text-marigold-dark/60">{listing.name[0]}</span>}
        </div>
        <div className="flex-1">
          <p className="font-medium">{listing.name}</p>
          <p className="text-xs text-clay">₹{listing.price} · {listing.remainingQuantity}/{listing.quantity} left</p>
          <p className="text-xs text-clay">{listing.mealType} · ready {listing.readyTime}</p>
        </div>
      </div>
    </div>
  );
}
