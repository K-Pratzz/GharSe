import { useEffect, useState } from 'react';
import { api } from '../api/client';
import FoodCard from '../components/FoodCard';
import { useAuth } from '../context/AuthContext';

export default function Browse() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    mealType: '', dietaryType: '', pickup: false, delivery: false, maxPrice: '', sort: 'recent',
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { sort: filters.sort };
    if (filters.mealType) params.mealType = filters.mealType;
    if (filters.dietaryType) params.dietaryType = filters.dietaryType;
    if (filters.pickup) params.pickup = 'true';
    if (filters.delivery) params.delivery = 'true';
    if (filters.maxPrice) params.maxPrice = filters.maxPrice;
    if (user?.approximateLocation?.lat) {
      params.lat = user.approximateLocation.lat;
      params.lng = user.approximateLocation.lng;
    }

    api.get('/foods', { params }).then(({ data }) => {
      if (!cancelled) {
        setListings(data.listings);
        setLoading(false);
      }
    }).catch(() => setLoading(false));

    return () => { cancelled = true; };
  }, [filters, user]);

  function update(field, value) {
    setFilters((f) => ({ ...f, [field]: value }));
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-8">
      <h1 className="font-display text-3xl mb-1">Available near you</h1>
      <p className="text-clay mb-6">Today's home-cooked menus from local cooks.</p>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <select value={filters.mealType} onChange={(e) => update('mealType', e.target.value)} className="border border-marigold-light/60 rounded-full px-3 py-1.5 text-sm">
          <option value="">All meals</option>
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snacks">Snacks</option>
        </select>
        <select value={filters.dietaryType} onChange={(e) => update('dietaryType', e.target.value)} className="border border-marigold-light/60 rounded-full px-3 py-1.5 text-sm">
          <option value="">Veg &amp; non-veg</option>
          <option value="veg">Vegetarian</option>
          <option value="non-veg">Non-vegetarian</option>
        </select>
        <input
          type="number"
          placeholder="Max price"
          value={filters.maxPrice}
          onChange={(e) => update('maxPrice', e.target.value)}
          className="border border-marigold-light/60 rounded-full px-3 py-1.5 text-sm w-28"
        />
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={filters.pickup} onChange={(e) => update('pickup', e.target.checked)} /> Pickup
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={filters.delivery} onChange={(e) => update('delivery', e.target.checked)} /> Delivery
        </label>
        <select value={filters.sort} onChange={(e) => update('sort', e.target.value)} className="border border-marigold-light/60 rounded-full px-3 py-1.5 text-sm ml-auto">
          <option value="recent">Recently added</option>
          <option value="nearest">Nearest</option>
          <option value="price_low">Lowest price</option>
          <option value="rating">Highest rated</option>
        </select>
      </div>

      {loading && <p className="text-clay">Loading today's menus...</p>}
      {!loading && listings.length === 0 && (
        <p className="text-clay">No listings match your filters right now — try widening them or check back later.</p>
      )}

      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {listings.map((l) => (
          <FoodCard key={l._id} listing={l} />
        ))}
      </div>
    </div>
  );
}
