import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { identifier, password });
      login(data.token, data.user, data.sellerProfile);
      if (data.user.role === 'seller') navigate('/seller/dashboard');
      else if (data.user.role === 'admin') navigate('/admin');
      else navigate('/browse');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-5 py-16">
      <h1 className="font-display text-3xl mb-6">Log in to GharSe</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-clay mb-1">Email or phone</label>
          <input
            className="w-full border border-marigold-light/60 rounded-lg px-3 py-2 focus-ring"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-clay mb-1">Password</label>
          <input
            type="password"
            className="w-full border border-marigold-light/60 rounded-lg px-3 py-2 focus-ring"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-red-700 text-sm">{error}</p>}
        <button
          disabled={loading}
          className="w-full py-3 rounded-full bg-tulsi text-ivory font-medium hover:bg-tulsi-dark transition disabled:opacity-60"
        >
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>
      <p className="text-sm text-clay mt-5">
        New here?{' '}
        <Link to="/signup/customer" className="text-marigold-dark font-medium">
          Sign up as a customer
        </Link>{' '}
        or{' '}
        <Link to="/signup/seller" className="text-marigold-dark font-medium">
          become a home cook
        </Link>
        .
      </p>
      <p className="text-xs text-clay mt-6">
        Demo accounts (password: password123) — admin@gharse.app, anita@gharse-demo.app (seller),
        aarav@gharse-demo.app (customer).
      </p>
    </div>
  );
}
