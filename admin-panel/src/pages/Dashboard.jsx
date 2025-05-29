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
  const [periodStats, setPeriodStats] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [dateError, setDateError] = useState('');
  const [showUsers, setShowUsers] = useState(false);
  const [users, setUsers] = useState([]);
  const [activeSection, setActiveSection] = useState('overview');
  const token = localStorage.getItem("admin-token");
  const [selectedOrderUser, setSelectedOrderUser] = useState(null);

  const fetchUsers = async () => {
    try {
      const response = await API.get("/admin/users/admin/users", { headers: { Authorization: `Bearer ${token}` } });
      setUsers(response.data);
    } catch (err) {
      console.error("Ошибка при загрузке пользователей:", err);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          API.get("/admin/stats", { headers: { Authorization: `Bearer ${token}` } }),
          API.get("/admin/orders", { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setStats(statsRes.data);
        
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

  useEffect(() => {
    const fetchPeriodStats = async () => {
      if (!dateRange.startDate || !dateRange.endDate) return;
      
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      
      if (start > end) {
        setDateError('Дата начала не может быть позже даты окончания');
        setPeriodStats(null);
        return;
      }
      
      setDateError('');
      try {
        const response = await API.get(
          `/admin/stats/period?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPeriodStats(response.data);
      } catch (err) {
        console.error("Ошибка при загрузке статистики за период:", err);
        setPeriodStats(null);
      }
    };
    fetchPeriodStats();
  }, [dateRange, token]);

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatAverageCheck = (revenue, orders) => {
    if (!revenue || !orders || orders === 0) return '0 ₽';
    return `${Math.round(revenue / orders).toLocaleString()} ₽`;
  };

  const fetchOrdersByStatus = async (status) => {
    try {
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

  const handleUsersClick = async () => {
    await fetchUsers();
    setShowUsers(true);
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
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center text-gray-800 mb-8">
          📊 Статистика магазина
        </h2>

        {/* Navigation Tabs */}
        <div className="flex space-x-4 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveSection('overview')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all duration-200 ${
              activeSection === 'overview'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 hover:shadow-sm'
            }`}
          >
            📈 Обзор
          </button>
          <button
            onClick={() => setActiveSection('period')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all duration-200 ${
              activeSection === 'period'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 hover:shadow-sm'
            }`}
          >
            📅 Статистика за период
          </button>
          <button
            onClick={() => setActiveSection('orders')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all duration-200 ${
              activeSection === 'orders'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 hover:shadow-sm'
            }`}
          >
            📦 Статусы заказов
          </button>
          <button
            onClick={() => setActiveSection('categories')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all duration-200 ${
              activeSection === 'categories'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 hover:shadow-sm'
            }`}
          >
            🛍 Продажи по категориям
          </button>
        </div>

        {/* Overview Section */}
        {activeSection === 'overview' && (
          <section className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                onClick={handleUsersClick}
              />
            </div>

            {/* Quick Stats Summary */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-6 border border-blue-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Основные показатели</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Средний чек</span>
                    <span className="font-medium text-gray-800">
                      {stats.totalOrders > 0 
                        ? `${Math.round(stats.totalRevenue / stats.totalOrders).toLocaleString()} ₽`
                        : '0 ₽'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Активных заказов</span>
                    <span className="font-medium text-gray-800">
                      {orderStats.pending_orders + orderStats.manual_processing_orders}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Требуют внимания</span>
                    <span className="font-medium text-red-600">
                      {orderStats.error_orders}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-white rounded-lg p-6 border border-green-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">✅ Статусы заказов</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Выполнено</span>
                    <span className="font-medium text-green-600">
                      {orderStats.delivered_orders}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">В обработке</span>
                    <span className="font-medium text-blue-600">
                      {orderStats.manual_processing_orders}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Ожидают оплаты</span>
                    <span className="font-medium text-yellow-600">
                      {orderStats.unpaid_orders}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Categories Preview */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">🏆 Топ категории</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.salesByCategory.slice(0, 3).map((cat, i) => {
                  const percent = ((cat.revenue / stats.totalRevenue) * 100).toFixed(1);
                  return (
                    <div
                      key={i}
                      className="bg-white rounded-lg p-4 border border-gray-100 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-800">{getCategoryLabel(cat.category)}</span>
                        <span className="text-sm text-blue-600 font-medium">{percent}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                      <div className="mt-2 flex justify-between text-sm text-gray-600">
                        <span>{cat.total} шт.</span>
                        <span>{cat.revenue.toLocaleString()} ₽</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Period Statistics Section */}
        {activeSection === 'period' && (
          <section className="bg-white rounded-lg shadow p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">📅 Выберите период</h3>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Начало периода</label>
                  <input
                    type="date"
                    name="startDate"
                    value={dateRange.startDate}
                    onChange={handleDateRangeChange}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Конец периода</label>
                  <input
                    type="date"
                    name="endDate"
                    value={dateRange.endDate}
                    onChange={handleDateRangeChange}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              {dateError && (
                <p className="text-red-500 text-center mt-4">{dateError}</p>
              )}
            </div>

            {periodStats && !dateError && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  <StatCard 
                    label="💸 Выручка за период" 
                    value={`${periodStats.period.total_revenue.toLocaleString()} ₽`}
                    subtitle={`${periodStats.period.total_orders} заказов`}
                  />
                  <StatCard 
                    label="📦 Средний чек" 
                    value={formatAverageCheck(periodStats.period.total_revenue, periodStats.period.total_orders)}
                    subtitle="Средняя сумма заказа"
                  />
                </div>

                {periodStats.monthly.length > 0 && (
                  <>
                    <h4 className="text-lg font-semibold mb-4 text-gray-800">📅 Помесячная статистика</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left border-b">
                            <th className="py-3 px-4 font-medium text-gray-600">Месяц</th>
                            <th className="py-3 px-4 font-medium text-gray-600">Выручка</th>
                            <th className="py-3 px-4 font-medium text-gray-600">Заказы</th>
                            <th className="py-3 px-4 font-medium text-gray-600">Средний чек</th>
                          </tr>
                        </thead>
                        <tbody>
                          {periodStats.monthly.map((month, i) => (
                            <tr key={i} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">
                                {new Date(month.month).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                              </td>
                              <td className="py-3 px-4">{month.revenue.toLocaleString()} ₽</td>
                              <td className="py-3 px-4">{month.total_orders}</td>
                              <td className="py-3 px-4">
                                {formatAverageCheck(month.revenue, month.total_orders)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        )}

        {/* Orders Status Section */}
        {activeSection === 'orders' && (
          <section className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-6 text-gray-800">📦 Статусы заказов</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
          </section>
        )}

        {/* Categories Section */}
        {activeSection === 'categories' && (
          <section className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-6 text-gray-800">🛍 Продажи по категориям</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {stats.salesByCategory.map((cat, i) => {
                const percent = ((cat.revenue / stats.totalRevenue) * 100).toFixed(1);
                return (
                  <div
                    key={i}
                    className="border rounded-lg p-4 bg-gray-50"
                  >
                    <div className="font-semibold text-gray-800 mb-2">{getCategoryLabel(cat.category)}</div>
                    <div className="text-sm text-gray-600 mb-3">
                      <span className="font-medium">{cat.total}</span> шт. · <span className="font-medium">{cat.revenue.toLocaleString()} ₽</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-blue-600 font-medium">
                      {percent}% от общей выручки
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-3 px-4 font-medium text-gray-600">Категория</th>
                    <th className="py-3 px-4 font-medium text-gray-600">Продано (шт.)</th>
                    <th className="py-3 px-4 font-medium text-gray-600">Выручка (₽)</th>
                    <th className="py-3 px-4 font-medium text-gray-600">% от выручки</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.salesByCategory.map((cat, i) => {
                    const percent = ((cat.revenue / stats.totalRevenue) * 100).toFixed(1);
                    return (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{getCategoryLabel(cat.category)}</td>
                        <td className="py-3 px-4">{cat.total}</td>
                        <td className="py-3 px-4">{cat.revenue.toLocaleString()}</td>
                        <td className="py-3 px-4">{percent}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* Modal for displaying users */}
      {showUsers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">Список пользователей</h3>
              <button
                onClick={() => setShowUsers(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                ✕
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-3 px-4 font-medium text-gray-600">ID</th>
                    <th className="py-3 px-4 font-medium text-gray-600">Имя пользователя</th>
                    <th className="py-3 px-4 font-medium text-gray-600">Имя</th>
                    <th className="py-3 px-4 font-medium text-gray-600">Фамилия</th>
                    <th className="py-3 px-4 font-medium text-gray-600">Дата регистрации</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.telegram_id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{user.telegram_id}</td>
                      <td className="py-3 px-4">{user.username || '-'}</td>
                      <td className="py-3 px-4">{user.first_name || '-'}</td>
                      <td className="py-3 px-4">{user.last_name || '-'}</td>
                      <td className="py-3 px-4">
                        {user.created_at ? new Date(user.created_at).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal for displaying orders by status */}
      {selectedStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                Заказы со статусом: {getStatusLabel(selectedStatus)}
              </h3>
              <button
                onClick={() => { setSelectedStatus(null); setSelectedOrderUser(null); }}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                ✕
              </button>
            </div>
            {selectedOrderUser && (
              users.length === 0 ? (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow text-center text-gray-500">Загрузка данных пользователя...</div>
              ) : (
                (() => {
                  const user = users.find(u => String(u.telegram_id) === String(selectedOrderUser.telegram_id));
                  return (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow flex flex-wrap gap-4 items-center">
                      <div className="flex-1 min-w-[180px]">
                        <div className="text-xs text-gray-500 mb-1">Telegram ID</div>
                        <div className="text-base font-bold text-gray-800">{selectedOrderUser.telegram_id}</div>
                      </div>
                      <div className="flex-1 min-w-[180px]">
                        <div className="text-xs text-gray-500 mb-1">Username</div>
                        <div className="text-base font-bold text-gray-800">{user && user.username ? user.username : '-'}</div>
                      </div>
                      <div className="flex-1 min-w-[180px]">
                        <div className="text-xs text-gray-500 mb-1">Имя</div>
                        <div className="text-base font-bold text-gray-800">{user && user.first_name ? user.first_name : '-'}</div>
                      </div>
                      <div className="flex-1 min-w-[180px]">
                        <div className="text-xs text-gray-500 mb-1">Фамилия</div>
                        <div className="text-base font-bold text-gray-800">{user && user.last_name ? user.last_name : '-'}</div>
                      </div>
                      <div className="flex-1 min-w-[180px]">
                        <div className="text-xs text-gray-500 mb-1">PUBG ID</div>
                        <div className="text-base font-bold text-gray-800">{selectedOrderUser.pubg_id}</div>
                      </div>
                      <div className="flex-1 min-w-[180px]">
                        <div className="text-xs text-gray-500 mb-1">PUBG nickname</div>
                        <div className="text-base font-bold text-gray-800">{selectedOrderUser.pubg_nickname}</div>
                      </div>
                      <button onClick={() => setSelectedOrderUser(null)} className="ml-auto text-gray-400 hover:text-gray-600 text-xl">✕</button>
                      <button onClick={fetchUsers} className="ml-4 px-3 py-1 bg-white border border-blue-300 rounded text-blue-600 hover:bg-blue-50 transition-all text-xs font-medium">Обновить данные пользователя</button>
                    </div>
                  );
                })()
              )
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-3 px-4 font-medium text-gray-600">ID</th>
                    <th className="py-3 px-4 font-medium text-gray-600">Статус</th>
                    <th className="py-3 px-4 font-medium text-gray-600">Название продукта</th>
                    <th className="py-3 px-4 font-medium text-gray-600">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    let amount = order.amount;
                    let products = order._products || (Array.isArray(order.products) ? order.products : []);
                    const productTitlesArr = products.map(p => p.title || p.name).filter(Boolean);
                    const productTitles = productTitlesArr.length > 0 ? productTitlesArr.join(', ') : 'N/A';
                    if (typeof amount !== 'number') {
                      amount = products.reduce((sum, p) => sum + ((p.price || p.amount || 0) * (p.qty || 1)), 0);
                    }
                    return (
                      <tr key={order.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={async () => {
                        await fetchUsers();
                        setSelectedOrderUser({
                          telegram_id: order.user_id,
                          pubg_id: order.pubg_id || '-',
                          pubg_nickname: order.nickname || '-'
                        });
                      }}>
                        <td className="py-3 px-4">{order.id}</td>
                        <td className="py-3 px-4">{getStatusLabel(order.status)}</td>
                        <td className="py-3 px-4">{productTitles}</td>
                        <td className="py-3 px-4">{amount ? amount.toLocaleString() : 'N/A'} ₽</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, subtitle, onClick }) {
  return (
    <div 
      className={`bg-white rounded-lg shadow p-6 transition-all duration-200 ${
        onClick 
          ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] border-2 border-transparent hover:border-blue-500' 
          : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium text-gray-600">{label}</div>
        {onClick && (
          <div className="text-blue-500 text-xs font-medium flex items-center">
            <span>Подробнее</span>
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-gray-800 mb-2">{value}</div>
      {subtitle && (
        <div className="text-xs text-gray-500 flex items-center">
          {subtitle}
        </div>
      )}
    </div>
  );
}

function StatusCard({ label, value, color, icon, subtitle, onClick }) {
  const colors = {
    green: 'bg-green-50 text-green-800',
    yellow: 'bg-yellow-50 text-yellow-800',
    red: 'bg-red-50 text-red-800',
    blue: 'bg-blue-50 text-blue-800'
  };

  return (
    <div 
      className={`border rounded-lg p-4 ${colors[color]} flex flex-col items-center cursor-pointer 
        transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-2 border-transparent hover:border-blue-500`}
      onClick={onClick}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-base font-medium mb-1">{label}</div>
      <div className="text-xl font-bold mb-1">{value}</div>
      {subtitle && (
        <div className="text-xs text-gray-600 text-center flex items-center">
          {subtitle}
          <span className="ml-2 text-blue-500 text-xs font-medium">
            (Нажмите для просмотра)
          </span>
        </div>
      )}
    </div>
  );
}


