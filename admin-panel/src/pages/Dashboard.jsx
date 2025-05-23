import React, { useEffect, useState } from "react";
import API from "../api";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await API.get("/admin/stats");
      setStats(res.data);
    } catch (err) {
      console.error("❌ Ошибка при загрузке статистики:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getTotalRevenue = () =>
    stats?.salesByCategory?.reduce((sum, cat) => sum + cat.revenue, 0) || 0;

  if (loading) return <p className="p-4">Загрузка...</p>;
  if (!stats)
    return <p className="p-4 text-red-500">Ошибка при загрузке данных</p>;

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 via-white to-pink-50">
      <h2 className="text-4xl font-extrabold mb-8 text-center text-blue-900 drop-shadow">📊 Статистика магазина</h2>
      {/* Основные показатели */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
        <StatCard label="💸 Общая выручка" value={`${stats.totalRevenue} ₽`} />
        <StatCard label="📦 Количество заказов" value={stats.totalOrders} />
        <StatCard label="👥 Количество пользователей" value={stats.totalUsers} />
      </div>
      {/* Продажи по категориям */}
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-3xl mx-auto">
        <h3 className="text-2xl font-semibold mb-4 text-center text-blue-800">🛍 Продажи по категориям</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.salesByCategory.map((cat, i) => {
            const percent = (
              (cat.revenue / getTotalRevenue()) * 100
            ).toFixed(1);
            return (
              <div
                key={i}
                className="border rounded-xl p-4 shadow bg-blue-50 flex flex-col gap-2 items-start hover:shadow-lg transition"
              >
                <div className="font-semibold text-blue-900">{cat.category}</div>
                <div className="text-sm text-gray-500">
                  {cat.total} заказ(ов) · {cat.revenue} ₽
                </div>
                <div className="text-sm text-blue-600 font-semibold mt-auto">
                  +{percent}% от общей выручки
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white shadow rounded p-5 flex flex-col justify-center">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}


