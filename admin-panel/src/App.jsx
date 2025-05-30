import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  Navigate,
} from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Activator from './pages/Activator';
import ManualPanel from './pages/ManualPanel';
import Login from './pages/Login';
import PrivateRoute from './components/PrivateRoute';
import UcCodes from './pages/UcCodes';
import Referrals from './pages/Referrals';
import Settings from './pages/Settings';
import Broadcast from './pages/Broadcast';
import axios from 'axios';
import { FiSettings } from 'react-icons/fi';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('admin-token') || '');

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [token]);

  return (
    <Router>
      <div className="flex min-h-screen">
        {/* Sidebar (only when logged in) */}
        {token && (
          <aside className="w-64 bg-gray-100 p-4 shadow-xl">
            <h1 className="text-2xl font-bold mb-4">Админ-панель</h1>
            <nav className="flex flex-col gap-2 mb-4">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  isActive ? "underline text-blue-700 font-semibold" : "hover:underline"
                }
              >
                Статистика
              </NavLink>
              <NavLink
                to="/products"
                className={({ isActive }) =>
                  isActive ? "underline text-blue-700 font-semibold" : "hover:underline"
                }
              >
                Товары
              </NavLink>
              <NavLink
                to="/orders"
                className={({ isActive }) =>
                  isActive ? "underline text-blue-700 font-semibold" : "hover:underline"
                }
              >
                Заказы
              </NavLink>
              <NavLink
                to="/referrals"
                className={({ isActive }) =>
                  isActive ? "underline text-blue-700 font-semibold" : "hover:underline"
                }
              >
                👥 Рефералы
              </NavLink>
              <NavLink
                to="/activator"
                className={({ isActive }) =>
                  isActive ? "underline text-blue-700 font-semibold" : "hover:underline"
                }
              >
                Активация
              </NavLink>
              <NavLink
                to="/manual"
                className={({ isActive }) =>
                  isActive ? "underline text-blue-700 font-semibold" : "hover:underline"
                }
              >
                Ручная доставка
              </NavLink>
              <NavLink
                to="/uc-codes"
                className={({ isActive }) =>
                  isActive ? "underline text-blue-700 font-semibold" : "hover:underline"
                }
              >
                💾 UC-коды
              </NavLink>
              <NavLink
                to="/broadcast"
                className={({ isActive }) =>
                  isActive ? "underline text-blue-700 font-semibold" : "hover:underline"
                }
              >
                📢 Рассылка
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 mt-2 text-gray-700 rounded-lg hover:bg-blue-100 transition ${isActive ? 'bg-blue-200 font-bold' : ''}`
                }
              >
                <FiSettings className="mr-2 text-xl" />
                Настройки
              </NavLink>
            </nav>
            <button
              onClick={() => {
                localStorage.removeItem('admin-token');
                setToken('');
                window.location.href = '/login';
              }}
              className="text-sm text-red-600 hover:underline mt-4"
            >
              🔓 Выйти
            </button>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 bg-white p-6">
          <Routes>
            <Route path="/login" element={<Login setToken={setToken} />} />
            <Route
              path="/"
              element={
                token ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/products" element={<PrivateRoute><Products /></PrivateRoute>} />
            <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
            <Route path="/referrals" element={<PrivateRoute><Referrals /></PrivateRoute>} />
            <Route path="/activator" element={<PrivateRoute><Activator /></PrivateRoute>} />
            <Route path="/manual" element={<PrivateRoute><ManualPanel /></PrivateRoute>} />
            <Route path="/uc-codes" element={<PrivateRoute><UcCodes /></PrivateRoute>} />
            <Route path="/broadcast" element={<PrivateRoute><Broadcast /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}



