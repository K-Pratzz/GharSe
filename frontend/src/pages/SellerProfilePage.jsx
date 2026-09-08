import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, imageUrl } from '../api/client';

export default function SellerProfilePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/sellers/${id}`).then(({ data }) => setData(data));
  }, [id]);

  if (!data) return <div className="max-w-3xl mx-auto px-5 py-16 text-clay">Loading...</div>;

  const { seller, menu, reviews } = data;

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-16 h-16 rounded-full bg-marigold-light/30 flex items-center justify-center overflow-hidden">
          {seller.profilePhoto ? (
            <img src={imageUrl(seller.profilePhoto)} className="w-full h-full object-cover" />
          ) : (
            <span className="font-display text-2xl text-marigold-dark/60">{seller.userId?.name?.[0]}</span>
          )}
        </div>
        <div>
          <h1 className="font-display text-2xl">{seller.userId?.name}</h1>
          <p className="text-sm text-clay">{seller.userId?.locality}</p>
        </div>
        {seller.verificationStatus === 'verified' && (
          <span className="ml-auto text-sm text-tulsi-dark bg-tulsi/10 px-3 py-1 rounded-full">✓ Verified</span>
        )}
      </div>

      <p className="text-clay mb-4">{seller.bio}</p>

      <div className="flex gap-6 text-sm mb-6">
        <span>{seller.rating > 0 ? `★ ${seller.rating}` : 'No ratings yet'}</span>
        <span>{seller.ratingCount} reviews</span>
        <span>{seller.totalOrders} completed orders</span>
      </div>

      <h2 className="font-medium text-lg mb-3">Today's menu</h2>
      {menu.length === 0 && <p className="text-clay text-sm mb-6">No active listings right now — check back later.</p>}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {menu.map((m) => (
          <Link key={m._id} to={`/food/${m._id}`} className="bg-white rounded-card border border-marigold-light/50 p-4 hover:border-marigold">
            <p className="font-medium">{m.name}</p>
            <p className="text-sm text-clay">₹{m.price} · {m.remainingQuantity} left</p>
          </Link>
        ))}
      </div>

      <h2 className="font-medium text-lg mb-3">Reviews</h2>
      {reviews.length === 0 && <p className="text-clay text-sm">No reviews yet.</p>}
      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r._id} className="bg-white rounded-card border border-marigold-light/50 p-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{r.customerId?.name}</span>
              <span className="text-marigold-dark">★ {r.rating}</span>
            </div>
            {r.comment && <p className="text-sm text-clay">{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
