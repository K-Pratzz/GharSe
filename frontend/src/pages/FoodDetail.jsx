import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, apiErrorMessage, imageUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function FoodDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [otherListings, setOtherListings] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [fulfillmentType, setFulfillmentType] = useState('pickup');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [deliveryLocality, setDeliveryLocality] = useState('');
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/foods/${id}`).then(({ data }) => {
      setListing(data.listing);
      setOtherListings(data.otherListings);
      setFulfillmentType(data.listing.pickupAvailable ? 'pickup' : 'delivery');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="max-w-4xl mx-auto px-5 py-16 text-clay">Loading...</div>;
  if (!listing) return <div className="max-w-4xl mx-auto px-5 py-16 text-clay">This listing could not be found.</div>;

  const soldOut = listing.status === 'soldout' || listing.remainingQuantity <= 0;
  const subtotal = listing.price * quantity;
  const deliveryFee = fulfillmentType === 'delivery' ? listing.deliveryFee : 0;
  const total = subtotal + deliveryFee;

  async function handleOrder() {
    if (!user) return navigate('/login');
    if (user.role !== 'customer') {
      setError('Only customer accounts can place orders.');
      return;
    }
    setError('');
    setPlacing(true);
    try {
      const { data } = await api.post('/orders', {
        listingId: listing._id,
        quantity,
        fulfillmentType,
        deliveryLocality,
        paymentMethod,
      });
      navigate(`/orders/${data.order._id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setPlacing(false);
    }
  }

  const seller = listing.sellerId;

  return (
    <div className="max-w-4xl mx-auto px-5 py-8 grid md:grid-cols-2 gap-8">
      <div>
        <div className="h-64 bg-marigold-light/30 rounded-card overflow-hidden flex items-center justify-center mb-4">
          {listing.image ? (
            <img src={imageUrl(listing.image)} alt={listing.name} className="w-full h-full object-cover" />
          ) : (
            <span className="font-display text-6xl text-marigold-dark/60">{listing.name[0]}</span>
          )}
        </div>
        <h1 className="font-display text-3xl">{listing.name}</h1>
        <p className="text-clay mt-1">{listing.description}</p>

        <div className="mt-4 text-sm space-y-1">
          <p><span className="text-clay">Seller:</span> {seller?.userId?.name} {seller?.verificationStatus === 'verified' && <span className="text-tulsi-dark">✓ Verified</span>}</p>
          <p><span className="text-clay">Rating:</span> {seller?.rating > 0 ? `★ ${seller.rating} (${seller.ratingCount} reviews)` : 'No reviews yet'}</p>
          <p><span className="text-clay">Quantity remaining:</span> {listing.remainingQuantity}</p>
          <p><span className="text-clay">Ready by:</span> {listing.readyTime}</p>
          <p><span className="text-clay">Type:</span> {listing.dietaryType === 'veg' ? 'Vegetarian' : 'Non-vegetarian'}</p>
          {listing.ingredients?.length > 0 && <p><span className="text-clay">Ingredients:</span> {listing.ingredients.join(', ')}</p>}
          {listing.allergens?.length > 0 && <p><span className="text-clay">Allergens:</span> {listing.allergens.join(', ')}</p>}
        </div>

        <Link to={`/sellers/${seller?._id}`} className="inline-block mt-4 text-marigold-dark font-medium text-sm">
          View cook profile →
        </Link>

        {otherListings.length > 0 && (
          <div className="mt-6">
            <p className="text-sm text-clay mb-2">Also available from this cook today</p>
            <div className="flex flex-wrap gap-2">
              {otherListings.map((o) => (
                <Link key={o._id} to={`/food/${o._id}`} className="text-sm px-3 py-1.5 bg-white border border-marigold-light/50 rounded-full hover:border-marigold">
                  {o.name} · ₹{o.price}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-card border border-marigold-light/50 p-5 h-fit">
        {soldOut ? (
          <p className="font-display text-xl text-red-700">Sold out</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm text-clay">Quantity</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-8 h-8 rounded-full border border-marigold-light/60">-</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity((q) => Math.min(listing.remainingQuantity, q + 1))} className="w-8 h-8 rounded-full border border-marigold-light/60">+</button>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-clay mb-1">Fulfillment</p>
              <div className="flex gap-2">
                {listing.pickupAvailable && (
                  <button
                    onClick={() => setFulfillmentType('pickup')}
                    className={`px-4 py-2 rounded-full text-sm border ${fulfillmentType === 'pickup' ? 'bg-tulsi text-ivory border-tulsi' : 'border-marigold-light/60'}`}
                  >
                    Pickup
                  </button>
                )}
                {listing.deliveryAvailable && (
                  <button
                    onClick={() => setFulfillmentType('delivery')}
                    className={`px-4 py-2 rounded-full text-sm border ${fulfillmentType === 'delivery' ? 'bg-tulsi text-ivory border-tulsi' : 'border-marigold-light/60'}`}
                  >
                    Delivery (₹{listing.deliveryFee})
                  </button>
                )}
              </div>
            </div>

            {fulfillmentType === 'delivery' && (
              <div className="mb-4">
                <label className="block text-sm text-clay mb-1">Delivery locality</label>
                <input
                  className="w-full border border-marigold-light/60 rounded-lg px-3 py-2 focus-ring"
                  value={deliveryLocality}
                  onChange={(e) => setDeliveryLocality(e.target.value)}
                  placeholder="Your locality"
                />
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm text-clay mb-1">Payment</p>
              <div className="flex gap-2">
                <button onClick={() => setPaymentMethod('cash')} className={`px-4 py-2 rounded-full text-sm border ${paymentMethod === 'cash' ? 'bg-tulsi text-ivory border-tulsi' : 'border-marigold-light/60'}`}>
                  Cash
                </button>
                <button onClick={() => setPaymentMethod('upi')} className={`px-4 py-2 rounded-full text-sm border ${paymentMethod === 'upi' ? 'bg-tulsi text-ivory border-tulsi' : 'border-marigold-light/60'}`}>
                  UPI
                </button>
              </div>
            </div>

            <div className="border-t border-marigold-light/40 pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-clay">Food subtotal</span><span>₹{subtotal}</span></div>
              <div className="flex justify-between"><span className="text-clay">Delivery fee</span><span>₹{deliveryFee}</span></div>
              <div className="flex justify-between font-semibold text-base"><span>Total</span><span>₹{total}</span></div>
            </div>

            {error && <p className="text-red-700 text-sm mt-3">{error}</p>}

            <button
              onClick={handleOrder}
              disabled={placing}
              className="w-full mt-4 py-3 rounded-full bg-marigold text-ink font-medium hover:bg-marigold-dark hover:text-ivory transition disabled:opacity-60"
            >
              {placing ? 'Placing order...' : 'Order now'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
