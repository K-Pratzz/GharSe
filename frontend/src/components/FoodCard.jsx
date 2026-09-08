import { Link } from 'react-router-dom';
import { imageUrl } from '../api/client';

const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' };

export default function FoodCard({ listing }) {
  const soldOut = listing.status === 'soldout' || listing.remainingQuantity <= 0;
  const sellerName = listing.sellerId?.userId?.name;
  const rating = listing.sellerId?.rating;

  return (
    <Link
      to={`/food/${listing._id}`}
      className="block bg-white rounded-card overflow-hidden border border-marigold-light/40 hover:shadow-md hover:-translate-y-0.5 transition"
    >
      <div className="h-36 bg-marigold-light/30 relative flex items-center justify-center">
        {listing.image ? (
          <img src={imageUrl(listing.image)} alt={listing.name} className="w-full h-full object-cover" />
        ) : (
          <span className="font-display text-3xl text-marigold-dark/60">{listing.name?.[0]}</span>
        )}
        {soldOut && (
          <div className="absolute inset-0 bg-ink/60 flex items-center justify-center">
            <span className="text-ivory font-display text-lg">Sold out</span>
          </div>
        )}
        <span className="absolute top-2 left-2 bg-ivory/90 text-xs px-2 py-0.5 rounded-full text-clay">
          {MEAL_LABEL[listing.mealType]}
        </span>
      </div>
      <div className="p-3">
        <h3 className="font-display text-lg leading-tight">{listing.name}</h3>
        <p className="text-sm text-clay mt-0.5">By {sellerName || 'a local cook'}</p>
        <div className="flex items-center justify-between mt-2 text-sm">
          <span className="text-tulsi-dark font-semibold">₹{listing.price}</span>
          {listing.distanceKm != null && <span className="text-clay">{listing.distanceKm} km away</span>}
        </div>
        <div className="flex items-center justify-between mt-1 text-xs text-clay">
          <span>{soldOut ? 'Sold out' : `${listing.remainingQuantity} portions left`}</span>
          {rating > 0 && <span>★ {rating}</span>}
        </div>
        <p className="text-xs text-clay mt-1">Ready by {listing.readyTime}</p>
      </div>
    </Link>
  );
}
