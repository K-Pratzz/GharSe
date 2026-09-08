import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Landing from './pages/Landing';
import Login from './pages/Login';
import SignupCustomer from './pages/SignupCustomer';
import SignupSeller from './pages/SignupSeller';
import Browse from './pages/Browse';
import FoodDetail from './pages/FoodDetail';
import OrderHistory from './pages/OrderHistory';
import OrderTracking from './pages/OrderTracking';
import SellerProfilePage from './pages/SellerProfilePage';
import SellerDashboard from './pages/SellerDashboard';
import SellerAddFood from './pages/SellerAddFood';
import SellerOrders from './pages/SellerOrders';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup/customer" element={<SignupCustomer />} />
          <Route path="/signup/seller" element={<SignupSeller />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/food/:id" element={<FoodDetail />} />
          <Route path="/sellers/:id" element={<SellerProfilePage />} />

          <Route path="/orders" element={<ProtectedRoute role="customer"><OrderHistory /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />

          <Route path="/seller/dashboard" element={<ProtectedRoute role="seller"><SellerDashboard /></ProtectedRoute>} />
          <Route path="/seller/add-food" element={<ProtectedRoute role="seller"><SellerAddFood /></ProtectedRoute>} />
          <Route path="/seller/orders" element={<ProtectedRoute role="seller"><SellerOrders /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="border-t border-marigold-light/40 py-6 text-center text-xs text-clay">
        GharSe — a local marketplace connecting home cooks with their community.
      </footer>
    </div>
  );
}

function NotFound() {
  return <div className="max-w-2xl mx-auto px-5 py-16 text-center text-clay">Page not found.</div>;
}
