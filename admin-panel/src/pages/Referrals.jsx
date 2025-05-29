import React, { useEffect, useState } from "react";
import API, { getReferralPoints } from "../api";

export default function Referrals() {
  const [summary, setSummary] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userReferrals, setUserReferrals] = useState([]);
  const token = localStorage.getItem("admin-token");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchData = async () => {
    try {
      setError(null);
      const [summaryRes, referralsRes] = await Promise.all([
        API.get("/admin/referrals/summary", { headers: { Authorization: `Bearer ${token}` } }),
        API.get("/admin/referrals", { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setSummary(summaryRes.data);
      setReferrals(referralsRes.data);
    } catch (err) {
      console.error("Ошибка при загрузке рефералов:", err);
      setError("Не удалось загрузить данные. Пожалуйста, попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleUserClick = async (userId) => {
    try {
      setError(null);
      const response = await API.get(`/admin/referrals/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserReferrals(response.data);
      setSelectedUser(userId);
    } catch (err) {
      console.error("Ошибка при загрузке рефералов пользователя:", err);
      setError("Не удалось загрузить детали рефералов. Пожалуйста, попробуйте позже.");
    }
  };

  const handleRetry = () => {
    setLoading(true);
    fetchData();
  };

  // Pagination logic for referrals table
  const totalPages = Math.ceil(referrals.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentReferrals = referrals.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 via-white to-pink-50">
      <h2 className="text-4xl font-extrabold mb-8 text-center text-blue-900 drop-shadow">👥 Реферальная система</h2>
      
      {error && (
        <div className="max-w-5xl mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={handleRetry}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Попробовать снова
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center text-lg text-blue-700 animate-pulse">Загрузка...</p>
      ) : !error && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
            <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col items-center">
              <div className="text-2xl font-bold text-blue-800 mb-2">{summary?.totalReferrals ?? 0}</div>
              <div className="text-gray-600">Всего приглашений</div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col items-center">
              <div className="text-lg font-semibold text-blue-900 mb-2">Топ рефереры</div>
              <ul className="text-sm text-gray-700 space-y-1">
                {(summary?.topReferrers || []).map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-4">
                    <span className="font-bold">{r.referred_by}</span>
                    <div className="text-right">
                      <div>{r.invited_count} приглашённых</div>
                      <div className="text-green-600">{r.total_revenue?.toLocaleString()} ₽</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Table of all referrals */}
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-5xl mx-auto">
            <h3 className="text-2xl font-semibold mb-6 text-blue-800">Все рефереры</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 font-semibold">Реферер</th>
                    <th className="p-3 font-semibold">Приглашено</th>
                    <th className="p-3 font-semibold">Заказы</th>
                    <th className="p-3 font-semibold">Выручка</th>
                    <th className="p-3 font-semibold">Реферальные баллы</th>
                    <th className="p-3 font-semibold">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {currentReferrals.map((ref) => (
                    <tr key={ref.referred_by} className="border-b hover:bg-blue-50">
                      <td className="p-3">
                        {ref.username || ref.first_name || ref.last_name || ref.referred_by}
                      </td>
                      <td className="p-3">{ref.total_referrals || 0}</td>
                      <td className="p-3">{ref.total_orders || 0}</td>
                      <td className="p-3">{ref.total_revenue?.toLocaleString() || 0} ₽</td>
                      <td className="p-3">{ref.referral_points || 0}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleUserClick(ref.referred_by)}
                          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                        >
                          Детали
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    &laquo;
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                        ${currentPage === page
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    &raquo;
                  </button>
                </nav>
              </div>
            )}
          </div>

          {/* User Referrals Modal */}
          {selectedUser && userReferrals.length > 0 && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 max-w-4xl w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-semibold text-blue-800">
                    Рефералы пользователя {selectedUser}
                  </h3>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-left">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2">Пользователь</th>
                        <th className="py-2">Уровень</th>
                        <th className="py-2">Заказы</th>
                        <th className="py-2">Выручка</th>
                        <th className="py-2">Комиссия</th>
                        <th className="py-2">Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userReferrals.map((ref) => (
                        <tr key={ref.id} className="border-b hover:bg-blue-50">
                          <td className="py-2">
                            {ref.username || ref.first_name || ref.last_name || ref.user_id}
                          </td>
                          <td className="py-2">{ref.level}</td>
                          <td className="py-2">{ref.total_orders || 0}</td>
                          <td className="py-2">{ref.total_revenue?.toLocaleString() || 0} ₽</td>
                          <td className="py-2">
                            <div className="text-green-600">
                              {ref.commission?.toLocaleString() || 0} ₽
                              <span className="text-gray-500 text-xs ml-1">
                                ({ref.commission_rate}%)
                              </span>
                            </div>
                          </td>
                          <td className="py-2">
                            {ref.created_at ? new Date(ref.created_at).toLocaleString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 