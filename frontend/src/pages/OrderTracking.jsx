import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import StatusStepper from '../components/StatusStepper';

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [complaintCategory, setComplaintCategory] = useState('food_quality');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [complaintSubmitted, setComplaintSubmitted] = useState(false);

  function load() {
    api.get(`/orders/${id}`).then(({ data }) => setOrder(data.order)).catch((err) => setError(apiErrorMessage(err)));
  }

  useEffect(() => { load(); }, [id]);

  if (error) return <div className="max-w-2xl mx-auto px-5 py-16 text-red-700">{error}</div>;
  if (!order) return <div className="max-w-2xl mx-auto px-5 py-16 text-clay">Loading order...</div>;

  async function submitReview(e) {
    e.preventDefault();
    setReviewError('');
    try {
      await api.post('/reviews', { orderId: order._id, rating, comment });
      setReviewSubmitted(true);
    } catch (err) {
      setReviewError(apiErrorMessage(err));
    }
  }

  async function submitComplaint(e) {
    e.preventDefault();
    try {
      await api.post('/complaints', { orderId: order._id, category: complaintCategory, description: complaintDesc });
      setComplaintSubmitted(true);
      setComplaintOpen(false);
    } catch (err) {
      setReviewError(apiErrorMessage(err));
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <Link to="/orders" className="text-sm text-marigold-dark">← Back to my orders</Link>
      <h1 className="font-display text-3xl mt-2">Order #{order.orderNumber}</h1>

      <div className="bg-white rounded-card border border-marigold-light/50 p-5 mt-5">
        {order.items.map((item) => (
          <div key={item.listingId} className="flex justify-between text-sm mb-1">
            <span>{item.name} × {item.quantity}</span>
            <span>₹{item.price * item.quantity}</span>
          </div>
        ))}
        <div className="border-t border-marigold-light/40 mt-2 pt-2 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-clay">Delivery fee</span><span>₹{order.deliveryFee}</span></div>
          <div className="flex justify-between font-semibold"><span>Total</span><span>₹{order.total}</span></div>
        </div>
        <p className="text-xs text-clay mt-2">
          {order.fulfillmentType === 'pickup' ? 'Pickup' : `Delivery to ${order.deliveryLocality}`} ·{' '}
          {order.paymentMethod === 'cash' ? 'Cash' : 'UPI'} ({order.paymentStatus.replace(/_/g, ' ')})
        </p>
      </div>

      <div className="mt-6">
        <h2 className="font-medium mb-3">Status</h2>
        <StatusStepper status={order.status} fulfillmentType={order.fulfillmentType} />
        {order.status === 'rejected' && order.rejectionReason && (
          <p className="text-sm text-clay mt-2">Reason: {order.rejectionReason}</p>
        )}
      </div>

      {order.status === 'completed' && !reviewSubmitted && (
        <form onSubmit={submitReview} className="mt-6 bg-white rounded-card border border-marigold-light/50 p-5">
          <h2 className="font-medium mb-3">Rate this order</h2>
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} onClick={() => setRating(n)} className={`text-2xl ${n <= rating ? 'text-marigold-dark' : 'text-marigold-light'}`}>★</button>
            ))}
          </div>
          <textarea
            className="w-full border border-marigold-light/60 rounded-lg px-3 py-2 mb-3 focus-ring"
            placeholder="How was the food?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {reviewError && <p className="text-red-700 text-sm mb-2">{reviewError}</p>}
          <button className="px-5 py-2 rounded-full bg-marigold text-ink font-medium hover:bg-marigold-dark hover:text-ivory transition">
            Submit review
          </button>
        </form>
      )}
      {reviewSubmitted && <p className="mt-6 text-tulsi-dark">Thanks for your review!</p>}

      {['completed', 'rejected'].includes(order.status) && !complaintSubmitted && (
        <div className="mt-6">
          {!complaintOpen ? (
            <button onClick={() => setComplaintOpen(true)} className="text-sm text-clay underline">
              Report an issue with this order
            </button>
          ) : (
            <form onSubmit={submitComplaint} className="bg-white rounded-card border border-marigold-light/50 p-5">
              <h2 className="font-medium mb-3">Report an issue</h2>
              <select value={complaintCategory} onChange={(e) => setComplaintCategory(e.target.value)} className="w-full border border-marigold-light/60 rounded-lg px-3 py-2 mb-3">
                <option value="food_quality">Food quality</option>
                <option value="missing_item">Missing item</option>
                <option value="wrong_item">Wrong item</option>
                <option value="seller_issue">Seller issue</option>
                <option value="delivery_issue">Delivery issue</option>
                <option value="other">Other</option>
              </select>
              <textarea
                required
                className="w-full border border-marigold-light/60 rounded-lg px-3 py-2 mb-3 focus-ring"
                placeholder="Describe what happened"
                value={complaintDesc}
                onChange={(e) => setComplaintDesc(e.target.value)}
              />
              <button className="px-5 py-2 rounded-full bg-tulsi text-ivory font-medium hover:bg-tulsi-dark transition">
                Submit complaint
              </button>
            </form>
          )}
        </div>
      )}
      {complaintSubmitted && <p className="mt-4 text-tulsi-dark text-sm">Your complaint has been submitted. Our team will look into it.</p>}
    </div>
  );
}
