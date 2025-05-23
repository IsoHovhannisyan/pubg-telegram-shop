import React, { useEffect, useState } from "react";
import API from "../api";

export default function Referrals() {
  const [summary, setSummary] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("admin-token");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, referralsRes] = await Promise.all([
          API.get("/admin/referrals/summary", { headers: { Authorization: `Bearer ${token}` } }),
          API.get("/admin/referrals", { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setSummary(summaryRes.data);
        setReferrals(referralsRes.data);
      } catch (err) {
        console.error("Ошибка при загрузке рефералов:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 via-white to-pink-50">
      <h2 className="text-4xl font-extrabold mb-8 text-center text-blue-900 drop-shadow">👥 Реферальная система</h2>
      {loading ? (
        <p className="text-center text-lg text-blue-700 animate-pulse">Загрузка...</p>
      ) : (
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
                  <li key={i}>
                    <span className="font-bold">{r.referred_by}</span>: {r.invited_count} приглашённых
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {/* Table of all referrals */}
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-5xl mx-auto">
            <h3 className="text-2xl font-semibold mb-6 text-blue-800">Все рефералы</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 font-semibold">ID</th>
                    <th className="p-3 font-semibold">Пригласивший (referred_by)</th>
                    <th className="p-3 font-semibold">Приглашённый (user_id)</th>
                    <th className="p-3 font-semibold">Уровень</th>
                    <th className="p-3 font-semibold">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((ref) => (
                    <tr key={ref.id} className="transition hover:bg-blue-50">
                      <td className="p-3">{ref.id}</td>
                      <td className="p-3">{ref.referred_by}</td>
                      <td className="p-3">{ref.user_id}</td>
                      <td className="p-3">{ref.level}</td>
                      <td className="p-3">{ref.created_at ? new Date(ref.created_at).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 