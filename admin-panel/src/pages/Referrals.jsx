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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-y-16 items-center">
        <h2 className="text-4xl font-extrabold text-center text-blue-900 drop-shadow mb-8">👥 Реферальная система</h2>
        
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
              {/* Total Referrals Card */}
              <div className="bg-white rounded-2xl shadow-lg p-8 min-h-[180px] flex flex-col items-center border border-gray-200 w-full">
                <div className="flex items-center gap-3 mb-2">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 text-blue-700 text-2xl">
                    <span role="img" aria-label="ref">👥</span>
                  </span>
                  <span className="text-3xl font-bold text-gray-900">{summary?.referralStats?.total_referrals ?? 0}</span>
                </div>
                <div className="text-base font-medium text-gray-700 mb-1">Всего приглашений</div>
                <div className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-700">1 уровень:</span> {summary?.referralStats?.level1_count ?? 0}<br/>
                  <span className="font-semibold text-gray-700">2 уровень:</span> {summary?.referralStats?.level2_count ?? 0}
                </div>
              </div>

              {/* Top Referrers Card */}
              <div className="bg-white rounded-2xl shadow-lg p-8 min-h-[180px] flex flex-col items-center border border-gray-200 w-full">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 text-yellow-600 text-2xl">
                    <span role="img" aria-label="top">🏆</span>
                  </span>
                  <span className="text-lg font-semibold text-gray-800">Топ рефереры</span>
                </div>
                <ul className="w-full text-sm text-gray-700 space-y-2 mt-2">
                  {referrals
                    .slice()
                    .sort((a, b) => (b.referral_points || 0) - (a.referral_points || 0))
                    .slice(0, 3)
                    .map((r, i) => (
                      <li key={i} className={`flex items-center justify-between gap-4 p-3 rounded-lg ${i === 0 ? 'border border-yellow-200 bg-yellow-50' : 'border border-gray-100 bg-gray-50'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-base font-bold ${i === 0 ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-700'}`}>{i + 1}</span>
                          <span className="font-medium text-gray-900">{r.username || r.first_name || r.last_name || r.referred_by}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-800">{r.level1_referrals} приглашённых</div>
                          <div className="text-xs text-gray-500">
                            L1: <span className="font-semibold text-gray-700">{r.level1_referrals}</span> | L2: <span className="font-semibold text-gray-700">{r.level2_referrals}</span>
                          </div>
                          <div className="text-green-600 font-semibold">{r.referral_points?.toLocaleString()} баллов</div>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            </div>

            {/* Table of all referrals */}
            <div className="bg-white rounded-2xl shadow-lg p-8 w-full border border-gray-200">
              <h3 className="text-2xl font-semibold mb-6 text-blue-800 text-center">Все рефереры</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 font-semibold">Реферер</th>
                      <th className="p-3 font-semibold">Приглашено</th>
                      <th className="p-3 font-semibold">L1</th>
                      <th className="p-3 font-semibold">L2</th>
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
                        <td className="p-3">{ref.level1_referrals || 0}</td>
                        <td className="p-3">{ref.level2_referrals || 0}</td>
                        <td className="p-3">{ref.total_orders || 0}</td>
                        <td className="p-3">{ref.total_revenue?.toLocaleString() || 0} баллов</td>
                        <td className="p-3">{ref.referral_points?.toLocaleString() || 0}</td>
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
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
                    <table className="w-full text-sm">
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
                            <td className="py-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                ref.level === 1 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                              }`}>
                                Уровень {ref.level}
                              </span>
                            </td>
                            <td className="py-2">{ref.total_orders || 0}</td>
                            <td className="py-2">{ref.total_revenue?.toLocaleString() || 0} баллов</td>
                            <td className="py-2">
                              <div className="text-green-600">
                                {ref.commission?.toLocaleString() || 0} баллов
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

                  {/* Level summary and explanation */}
                  {(() => {
                    const level1 = userReferrals.filter(r => r.level === 1);
                    const level2 = userReferrals.filter(r => r.level === 2);
                    const stats = refs => ({
                      count: refs.length,
                      orders: refs.reduce((sum, r) => sum + Number(r.total_orders || 0), 0),
                      revenue: refs.reduce((sum, r) => sum + Number(r.total_revenue || 0), 0),
                      commission: refs.reduce((sum, r) => sum + Number(r.commission || 0), 0),
                    });
                    const s1 = stats(level1);
                    const s2 = stats(level2);
                    const total = {
                      count: s1.count + s2.count,
                      orders: s1.orders + s2.orders,
                      revenue: s1.revenue + s2.revenue,
                      commission: s1.commission + s2.commission
                    };
                    return (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <div className="font-semibold mb-2">Сводка по уровням:</div>
                        <div className="text-sm mb-2">
                          <div>✅ 3% с каждого заказа приглашённого друга (1 уровень)</div>
                          <div>✅ 1% с каждого заказа друга вашего друга (2 уровень)</div>
                          <div className="text-gray-500 italic">Баллы начисляются только за оплаченные заказы.</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="font-medium text-blue-800">Уровень 1 (3%)</div>
                            <div>Приглашено: {s1.count} чел</div>
                            <div>Заказов: {s1.orders}</div>
                            <div>Комиссия: {s1.commission} баллов</div>
                          </div>
                          <div>
                            <div className="font-medium text-green-800">Уровень 2 (1%)</div>
                            <div>Приглашено: {s2.count} чел</div>
                            <div>Заказов: {s2.orders}</div>
                            <div>Комиссия: {s2.commission} баллов</div>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t text-sm font-medium">
                          Всего: {total.count} чел, {total.orders} заказов, {total.commission} баллов
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 