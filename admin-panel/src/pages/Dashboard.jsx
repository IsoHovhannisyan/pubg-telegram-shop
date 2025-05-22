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
    <div className="p-6 space-y-6">
      <h2 className="text-3xl font-bold mb-4">📊 Панель статистики</h2>

      {/* Основные показатели */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard label="💸 Общая выручка" value={`${stats.totalRevenue} ₽`} />
        <StatCard label="📦 Всего заказов" value={stats.totalOrders} />
        <StatCard label="👥 Всего пользователей" value={stats.totalUsers} />
      </div>

      {/* Продажи по категориям */}
      <div>
        <h3 className="text-xl font-semibold mb-2">🛍 Продажи по категориям</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.salesByCategory.map((cat, i) => {
            const percent = (
              (cat.revenue / getTotalRevenue()) *
              100
            ).toFixed(1);

            return (
              <div
                key={i}
                className="border rounded p-4 shadow bg-white flex justify-between items-center"
              >
                <div>
                  <div className="font-semibold">{cat.category}</div>
                  <div className="text-sm text-gray-500">
                    {cat.total} заказ(ов) · {cat.revenue} ₽
                  </div>
                </div>
                <div className="text-sm text-blue-600 font-semibold">
                  +{percent}%
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


