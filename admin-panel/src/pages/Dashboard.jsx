import React, { useEffect, useState } from "react";
import API from "../api";

const STATUS_ICONS = {
  delivered: "✅",
  pending: "🕒",
  manual_processing: "🛠",
  error: "❗️",
  unpaid: "💸"
};

const STATUS_SUBTITLES = {
  delivered: "Заказ успешно выполнен",
  pending: "Ожидает выполнения",
  manual_processing: "На ручной обработке",
  error: "Требует внимания",
  unpaid: "Ожидает оплаты"
};

const STAT_SUBTITLES = {
  "💸 Общая выручка": "Сумма всех оплаченных заказов",
  "📦 Всего заказов": "Количество всех заказов",
  "👥 Пользователей": "Зарегистрировано в системе"
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [orderStats, setOrderStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [orders, setOrders] = useState([]);
  const token = localStorage.getItem("admin-token");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          API.get("/admin/stats", { headers: { Authorization: `Bearer ${token}` } }),
          API.get("/admin/orders", { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setStats(statsRes.data);
        
        // Calculate counts using the same logic as fetchOrdersByStatus
        const orders = ordersRes.data;
        const counts = {
          delivered_orders: orders.filter(order => order.status === 'delivered').length,
          manual_processing_orders: orders.filter(order => order.status === 'manual_processing').length,
          pending_orders: orders.filter(order => order.status === 'pending').length,
          unpaid_orders: orders.filter(order => order.status === 'unpaid').length,
          error_orders: orders.filter(order => order.status === 'error').length
        };
        setOrderStats(counts);
      } catch (err) {
        console.error("Ошибка при загрузке статистики:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token]);

  const fetchOrdersByStatus = async (status) => {
    try {
      // Always fetch all orders, then filter on frontend
      const response = await API.get(`/admin/orders`, { headers: { Authorization: `Bearer ${token}` } });
      let filtered = response.data.filter(order => {
        if (status === 'unpaid') return order.status === 'unpaid';
        if (status === 'manual_processing') return order.status === 'manual_processing';
        if (status === 'error') return order.status === 'error';
        return order.status === status;
      });
      const ordersWithProducts = filtered.map(order => {
        const products = Array.isArray(order.products) ? order.products : JSON.parse(order.products || "[]");
        return {
          ...order,
          amount: products.reduce((sum, p) => sum + ((p.price || p.amount || 0) * (p.qty || 1)), 0),
          _products: products
        };
      });
      setOrders(ordersWithProducts);
      setSelectedStatus(status);
    } catch (err) {
      console.error("Ошибка при загрузке заказов:", err);
    }
  };

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
          subtitle={STAT_SUBTITLES["💸 Общая выручка"]}
        />
        <StatCard 
          label="📦 Всего заказов" 
          value={stats.totalOrders}
          subtitle={STAT_SUBTITLES["📦 Всего заказов"]}
        />
        <StatCard 
          label="👥 Пользователей" 
          value={stats.totalUsers}
          subtitle={STAT_SUBTITLES["👥 Пользователей"]}
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
            icon={STATUS_ICONS.delivered}
            subtitle={STATUS_SUBTITLES.delivered}
            onClick={() => fetchOrdersByStatus('delivered')}
          />
          <StatusCard
            label={getStatusLabel('manual_processing')}
            value={orderStats.manual_processing_orders}
            color="blue"
            icon={STATUS_ICONS.manual_processing}
            subtitle={STATUS_SUBTITLES.manual_processing}
            onClick={() => fetchOrdersByStatus('manual_processing')}
          />
          <StatusCard
            label={getStatusLabel('pending')}
            value={orderStats.pending_orders}
            color="yellow"
            icon={STATUS_ICONS.pending}
            subtitle={STATUS_SUBTITLES.pending}
            onClick={() => fetchOrdersByStatus('pending')}
          />
          <StatusCard
            label={getStatusLabel('unpaid')}
            value={orderStats.unpaid_orders}
            color="red"
            icon={STATUS_ICONS.unpaid}
            subtitle={STATUS_SUBTITLES.unpaid}
            onClick={() => fetchOrdersByStatus('unpaid')}
          />
          <StatusCard
            label={getStatusLabel('error')}
            value={orderStats.error_orders}
            color="red"
            icon={STATUS_ICONS.error}
            subtitle={STATUS_SUBTITLES.error}
            onClick={() => fetchOrdersByStatus('error')}
          />
        </div>
      </div>

      {/* Продажи по категориям */}
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-4xl mx-auto">
        <h3 className="text-2xl font-semibold mb-4 text-center text-blue-800">🛍 Продажи по категориям</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {stats.salesByCategory.map((cat, i) => {
            const percent = ((cat.revenue / stats.totalRevenue) * 100).toFixed(1);
            return (
              <div
                key={i}
                className="border rounded-xl p-4 shadow bg-blue-50 flex flex-col gap-2 items-start hover:shadow-lg transition"
              >
                <div className="font-semibold text-blue-900 text-lg">{getCategoryLabel(cat.category)}</div>
                <div className="text-sm text-gray-500">
                  <span className="font-semibold">{cat.total}</span> шт. · <span className="font-semibold">{cat.revenue.toLocaleString()} ₽</span>
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
        {/* Таблица по категориям */}
        <table className="w-full mt-6 text-sm border-t">
          <thead>
            <tr className="text-left text-gray-600 border-b">
              <th className="py-2">Категория</th>
              <th className="py-2">Продано (шт.)</th>
              <th className="py-2">Выручка (₽)</th>
              <th className="py-2">% от выручки</th>
            </tr>
          </thead>
          <tbody>
            {stats.salesByCategory.map((cat, i) => {
              const percent = ((cat.revenue / stats.totalRevenue) * 100).toFixed(1);
              return (
                <tr key={i} className="border-b hover:bg-blue-50">
                  <td className="py-2 font-semibold">{getCategoryLabel(cat.category)}</td>
                  <td className="py-2">{cat.total}</td>
                  <td className="py-2">{cat.revenue.toLocaleString()}</td>
                  <td className="py-2">{percent}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal for displaying orders by status */}
      {selectedStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-4xl w-full">
            <h3 className="text-2xl font-semibold mb-4 text-center text-blue-800">Заказы со статусом: {getStatusLabel(selectedStatus)}</h3>
            <table className="w-full text-sm border-t">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2">ID</th>
                  <th className="py-2">Статус</th>
                  <th className="py-2">Название продукта</th>
                  <th className="py-2">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  // Debug log for troubleshooting
                  console.log('Order in modal:', order);
                  let amount = order.amount;
                  let products = order._products || (Array.isArray(order.products) ? order.products : []);
                  // Filter out empty product titles
                  const productTitlesArr = products.map(p => p.title || p.name).filter(Boolean);
                  const productTitles = productTitlesArr.length > 0 ? productTitlesArr.join(', ') : 'N/A';
                  if (typeof amount !== 'number') {
                    amount = products.reduce((sum, p) => sum + ((p.price || p.amount || 0) * (p.qty || 1)), 0);
                  }
                  // Debug: print all statuses in the orders array
                  if (orders.length && orders[0] === order) {
                    console.log('All statuses in modal:', orders.map(o => o.status));
                  }
                  return (
                    <tr key={order.id} className="border-b hover:bg-blue-50">
                      <td className="py-2">{order.id}</td>
                      <td className="py-2">{getStatusLabel(order.status)}</td>
                      <td className="py-2">{productTitles}</td>
                      <td className="py-2">{amount ? amount.toLocaleString() : 'N/A'} ₽</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => setSelectedStatus(null)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, subtitle }) {
  return (
    <div className="bg-white shadow rounded-xl p-5 flex flex-col justify-center">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-3xl font-extrabold text-blue-900 mb-1">{value}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}

function StatusCard({ label, value, color, icon, subtitle, onClick }) {
  const colors = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800'
  };

  return (
    <div 
      className={`border rounded-xl p-4 shadow ${colors[color]} flex flex-col items-center cursor-pointer hover:shadow-lg transition`}
      onClick={onClick}
    >
      <div className="text-3xl mb-1">{icon}</div>
      <div className="text-lg font-semibold mb-1">{label}</div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 text-center mt-1">{subtitle}</div>}
    </div>
  );
}


