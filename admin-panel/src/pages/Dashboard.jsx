import React, { useEffect, useState } from "react";
import API from "../api";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [orderStats, setOrderStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("admin-token");

  useEffect(() => {
  const fetchStats = async () => {
    try {
        const [statsRes, orderStatsRes] = await Promise.all([
          API.get("/admin/stats", { headers: { Authorization: `Bearer ${token}` } }),
          API.get("/admin/orders/stats/summary", { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setStats(statsRes.data);
        setOrderStats(orderStatsRes.data[0]);
    } catch (err) {
        console.error("Ошибка при загрузке статистики:", err);
    } finally {
      setLoading(false);
    }
  };
    fetchStats();
  }, [token]);

  const getCategoryLabel = (category) => {
    const labels = {
      uc_by_id: "UC по ID",
      uc_by_login: "UC по логину",
      popularity_by_id: "Популярность по ID",
      popularity_home_by_id: "Популярность дома",
      cars: "Машины",
      costumes: "X-костюмы"
    };
    return labels[category] || category;
  };

  const getStatusLabel = (status) => {
    const labels = {
      unpaid: 'Не оплачен',
      pending: 'В обработке',
      manual_processing: 'Менеджер',
      delivered: 'Доставлен',
      error: 'Ошибка'
    };
    return labels[status] || status;
  };

  if (loading) return <p className="p-4">Загрузка...</p>;
  if (!stats || !orderStats)
    return <p className="p-4 text-red-500">Ошибка при загрузке данных</p>;

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 via-white to-pink-50">
      <h2 className="text-4xl font-extrabold mb-8 text-center text-blue-900 drop-shadow">📊 Статистика магазина</h2>

      {/* Основные показатели */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
        <StatCard 
          label="💸 Общая выручка" 
          value={`${stats.totalRevenue.toLocaleString()} ₽`}
        />
        <StatCard 
          label="📦 Всего заказов" 
          value={stats.totalOrders}
        />
        <StatCard 
          label="👥 Пользователей" 
          value={stats.totalUsers}
        />
      </div>

      {/* Статусы заказов */}
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-4xl mx-auto mb-8">
        <h3 className="text-2xl font-semibold mb-4 text-center text-blue-800">📦 Статусы заказов</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatusCard
            label={getStatusLabel('delivered')}
            value={orderStats.delivered_orders}
            color="green"
          />
          <StatusCard
            label={getStatusLabel('manual_processing')}
            value={orderStats.pending_orders}
            color="blue"
          />
          <StatusCard
            label={getStatusLabel('pending')}
            value={orderStats.pending_orders}
            color="yellow"
          />
          <StatusCard
            label={getStatusLabel('unpaid')}
            value={orderStats.total_orders - (orderStats.delivered_orders + orderStats.pending_orders)}
            color="red"
          />
          <StatusCard
            label={getStatusLabel('error')}
            value={orderStats.error_orders || 0}
            color="red"
          />
        </div>
      </div>

      {/* Продажи по категориям */}
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-4xl mx-auto">
        <h3 className="text-2xl font-semibold mb-4 text-center text-blue-800">🛍 Продажи по категориям</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.salesByCategory.map((cat, i) => {
            const percent = ((cat.revenue / stats.totalRevenue) * 100).toFixed(1);
            return (
              <div
                key={i}
                className="border rounded-xl p-4 shadow bg-blue-50 flex flex-col gap-2 items-start hover:shadow-lg transition"
              >
                <div className="font-semibold text-blue-900">{getCategoryLabel(cat.category)}</div>
                <div className="text-sm text-gray-500">
                  {cat.total} заказ(ов) · {cat.revenue.toLocaleString()} ₽
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
                <div className="text-sm text-blue-600 font-semibold mt-1">
                  {percent}% от общей выручки
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
    <div className="bg-white shadow rounded-xl p-5 flex flex-col justify-center">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function StatusCard({ label, value, color }) {
  const colors = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800'
  };

  return (
    <div className={`border rounded-xl p-4 shadow ${colors[color]} flex flex-col items-center`}>
      <div className="text-lg font-semibold mb-2">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}


