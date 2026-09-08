import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-30 bg-ivory/95 backdrop-blur border-b border-marigold-light/40">
      <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
        <Link to="/" className="font-display text-2xl text-tulsi-dark tracking-tight">
          GharSe
        </Link>

        <nav className="flex items-center gap-5 text-sm">
          {!user && (
            <>
              <Link to="/browse" className="hover:text-marigold-dark">Find food</Link>
              <Link to="/signup/seller" className="hover:text-marigold-dark">Become a home cook</Link>
              <Link to="/login" className="px-4 py-2 rounded-full bg-tulsi text-ivory hover:bg-tulsi-dark transition">
                Log in
              </Link>
            </>
          )}

          {user && user.role === 'customer' && (
            <>
              <Link to="/browse" className="hover:text-marigold-dark">Find food</Link>
              <Link to="/orders" className="hover:text-marigold-dark">My orders</Link>
              <span className="text-clay">Hi, {user.name.split(' ')[0]}</span>
              <button onClick={handleLogout} className="px-4 py-2 rounded-full border border-tulsi text-tulsi hover:bg-tulsi hover:text-ivory transition">
                Log out
              </button>
            </>
          )}

          {user && user.role === 'seller' && (
            <>
              <Link to="/seller/dashboard" className="hover:text-marigold-dark">Dashboard</Link>
              <Link to="/seller/orders" className="hover:text-marigold-dark">Orders</Link>
              <span className="text-clay">Hi, {user.name.split(' ')[0]}</span>
              <button onClick={handleLogout} className="px-4 py-2 rounded-full border border-tulsi text-tulsi hover:bg-tulsi hover:text-ivory transition">
                Log out
              </button>
            </>
          )}

          {user && user.role === 'admin' && (
            <>
              <Link to="/admin" className="hover:text-marigold-dark">Admin</Link>
              <span className="text-clay">Hi, {user.name.split(' ')[0]}</span>
              <button onClick={handleLogout} className="px-4 py-2 rounded-full border border-tulsi text-tulsi hover:bg-tulsi hover:text-ivory transition">
                Log out
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
