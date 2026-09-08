import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function SignupSeller() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', locality: '',
    deliveryRadiusKm: '2', pickupAvailable: true, deliveryAvailable: false,
    categories: '', bio: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: 'seller',
        locality: form.locality,
        deliveryRadiusKm: Number(form.deliveryRadiusKm),
        pickupAvailable: form.pickupAvailable,
        deliveryAvailable: form.deliveryAvailable,
        categories: form.categories ? form.categories.split(',').map((s) => s.trim()) : [],
        bio: form.bio,
      });
      login(data.token, data.user, data.sellerProfile);
      navigate('/seller/dashboard');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-16">
      <h1 className="font-display text-3xl mb-2">Become a home cook</h1>
      <p className="text-clay mb-6">
        Sell extra portions of the food you already prepare and earn from your local community.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" value={form.name} onChange={(v) => update('name', v)} required />
          <Field label="Phone" value={form.phone} onChange={(v) => update('phone', v)} required />
        </div>
        <Field label="Email" type="email" value={form.email} onChange={(v) => update('email', v)} />
        <Field label="Password" type="password" value={form.password} onChange={(v) => update('password', v)} required />
        <Field label="Locality / approximate address" value={form.locality} onChange={(v) => update('locality', v)} required />
        <Field label="Food categories" value={form.categories} onChange={(v) => update('categories', v)} placeholder="e.g. North Indian, Tiffin" />
        <div>
          <label className="block text-sm text-clay mb-1">Short bio</label>
          <textarea
            className="w-full border border-marigold-light/60 rounded-lg px-3 py-2 focus-ring"
            rows={2}
            value={form.bio}
            onChange={(e) => update('bio', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 items-end">
          <Field label="Serving radius (km)" type="number" value={form.deliveryRadiusKm} onChange={(v) => update('deliveryRadiusKm', v)} />
          <div className="flex gap-4 pb-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.pickupAvailable} onChange={(e) => update('pickupAvailable', e.target.checked)} />
              Pickup
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.deliveryAvailable} onChange={(e) => update('deliveryAvailable', e.target.checked)} />
              Delivery
            </label>
          </div>
        </div>
        {error && <p className="text-red-700 text-sm">{error}</p>}
        <button
          disabled={loading}
          className="w-full py-3 rounded-full bg-tulsi text-ivory font-medium hover:bg-tulsi-dark transition disabled:opacity-60"
        >
          {loading ? 'Creating account...' : 'Submit for verification'}
        </button>
        <p className="text-xs text-clay">
          Your account will be marked "verification pending" until GharSe reviews your details.
          You can add listings once approved.
        </p>
      </form>
      <p className="text-sm text-clay mt-5">
        Already registered? <Link to="/login" className="text-marigold-dark font-medium">Log in</Link>
      </p>
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
