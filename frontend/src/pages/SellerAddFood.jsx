import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';

const TODAY = new Date().toISOString().slice(0, 10);

export default function SellerAddFood() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', description: '', price: '', quantity: '', mealType: 'lunch', date: TODAY,
    readyTime: '', pickupAvailable: true, deliveryAvailable: false, deliveryRadiusKm: '2',
    deliveryFee: '0', dietaryType: 'veg', ingredients: '', allergens: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append('image', imageFile);

      const { data } = await api.post('/foods', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess(data.message);
      setTimeout(() => navigate('/seller/dashboard'), 900);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-5 py-10">
      <h1 className="font-display text-3xl mb-6">Add today's food</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Dish name" value={form.name} onChange={(v) => update('name', v)} required />
        <div>
          <label className="block text-sm text-clay mb-1">Description</label>
          <textarea className="w-full border border-marigold-light/60 rounded-lg px-3 py-2 focus-ring" rows={2}
            value={form.description} onChange={(e) => update('description', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-clay mb-1">Photo (optional)</label>
          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (₹)" type="number" value={form.price} onChange={(v) => update('price', v)} required />
          <Field label="Quantity" type="number" value={form.quantity} onChange={(v) => update('quantity', v)} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-clay mb-1">Meal type</label>
            <select className="w-full border border-marigold-light/60 rounded-lg px-3 py-2" value={form.mealType} onChange={(e) => update('mealType', e.target.value)}>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snacks">Snacks</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-clay mb-1">Vegetarian?</label>
            <select className="w-full border border-marigold-light/60 rounded-lg px-3 py-2" value={form.dietaryType} onChange={(e) => update('dietaryType', e.target.value)}>
              <option value="veg">Vegetarian</option>
              <option value="non-veg">Non-vegetarian</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date" type="date" value={form.date} onChange={(v) => update('date', v)} required />
          <Field label="Ready time" value={form.readyTime} onChange={(v) => update('readyTime', v)} placeholder="e.g. 1:30 PM" required />
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.pickupAvailable} onChange={(e) => update('pickupAvailable', e.target.checked)} /> Pickup available
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.deliveryAvailable} onChange={(e) => update('deliveryAvailable', e.target.checked)} /> Delivery available
          </label>
        </div>

        {form.deliveryAvailable && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Delivery radius (km)" type="number" value={form.deliveryRadiusKm} onChange={(v) => update('deliveryRadiusKm', v)} />
            <Field label="Delivery fee (₹)" type="number" value={form.deliveryFee} onChange={(v) => update('deliveryFee', v)} />
          </div>
        )}

        <Field label="Ingredients (comma separated)" value={form.ingredients} onChange={(v) => update('ingredients', v)} />
        <Field label="Allergens (comma separated, optional)" value={form.allergens} onChange={(v) => update('allergens', v)} />

        {error && <p className="text-red-700 text-sm">{error}</p>}
        {success && <p className="text-tulsi-dark text-sm">{success}</p>}

        <button disabled={loading} className="w-full py-3 rounded-full bg-marigold text-ink font-medium hover:bg-marigold-dark hover:text-ivory transition disabled:opacity-60">
          {loading ? 'Publishing...' : 'Publish listing'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required, placeholder }) {
  return (
    <div>
      <label className="block text-sm text-clay mb-1">{label}</label>
      <input
        type={type}
        className="w-full border border-marigold-light/60 rounded-lg px-3 py-2 focus-ring"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
      />
    </div>
  );
}
