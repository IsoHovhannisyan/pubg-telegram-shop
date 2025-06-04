import React, { useEffect, useState, useCallback } from "react";
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

const STATUS_COLORS = {
  delivered: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  manual_processing: 'bg-blue-100 text-blue-800',
  error: 'bg-red-100 text-red-800',
  unpaid: 'bg-gray-100 text-gray-800'
};

const STATUS_LABELS = {
  delivered: "Выполнен",
  pending: "В обработке",
  manual_processing: "На ручной обработке",
  error: "Ошибка",
  unpaid: "Не оплачен"
};

const CATEGORY_LABELS = {
  uc_by_id: "UC по ID",
  uc_by_login: "UC по логину",
  popularity_by_id: "Популярность по ID",
  popularity_home_by_id: "Популярность дома",
  cars: "Машины",
  costumes: "Костюмы",
  costume: "Костюмы"
};

const getStatusColor = (status) => {
  return STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
};

const calculateTotalPrice = (products) => {
  return products.reduce((sum, p) => sum + ((p.price || p.amount || 0) * (p.qty || 1)), 0);
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
  const [usersCurrentPage, setUsersCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const USERS_PER_PAGE = 10;
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [userReferrals, setUserReferrals] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loadingUserData, setLoadingUserData] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await API.get("/admin/users/admin/users", { headers: { Authorization: `Bearer ${token}` } });
      setUsers(response.data);
    } catch (err) {
      console.error("Ошибка при загрузке пользователей:", err);
    }
  }, [token]);

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
  }, [token, fetchUsers]);

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
      costumes: "Костюмы",
      costume: "Костюмы"
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

  // Add search filter function
  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      String(user.telegram_id).includes(searchLower) ||
      (user.username && user.username.toLowerCase().includes(searchLower)) ||
      (user.first_name && user.first_name.toLowerCase().includes(searchLower)) ||
      (user.last_name && user.last_name.toLowerCase().includes(searchLower))
    );
  });

  // Update pagination to use filtered users
  const usersTotalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const usersStartIndex = (usersCurrentPage - 1) * USERS_PER_PAGE;
  const usersEndIndex = usersStartIndex + USERS_PER_PAGE;
  const currentUsers = filteredUsers.slice(usersStartIndex, usersEndIndex);

  // Update fetchUserDetails to ensure correct orders fetching
  const fetchUserDetails = async (userId) => {
    setLoadingUserData(true);
    try {
      // Fetch all orders and filter by user_id
      const allOrdersRes = await API.get(`/admin/orders`, { headers: { Authorization: `Bearer ${token}` } });
      const userOrders = allOrdersRes.data.filter(o => String(o.user_id) === String(userId));
      // Fetch referrals for this user
      const referralsRes = await API.get(`/admin/referrals/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      // Optionally, fetch referral points
      // const referralPointsRes = await API.get(`/admin/referrals/points/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      setUserOrders(userOrders);
      setUserReferrals(referralsRes.data);
      // setUserStats(referralPointsRes.data); // If you want to show referral points
    } catch (err) {
      console.error("Ошибка при загрузке данных пользователя:", err);
    } finally {
      setLoadingUserData(false);
    }
  };

  // Add this function to handle user click
  const handleUserClick = async (user) => {
    setSelectedUser(user);
    await fetchUserDetails(user.telegram_id);
  };

  // Calculate total purchases for the user, excluding unpaid orders
  const totalPurchases = userOrders.reduce((sum, order) => {
    if (order.status === 'unpaid') return sum;
    const products = Array.isArray(order.products) ? order.products : JSON.parse(order.products || "[]");
    return sum + products.reduce((s, p) => s + ((p.price || p.amount || 0) * (p.qty || 1)), 0);
  }, 0);

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
                {stats.salesByCategory
                  .sort((a, b) => b.revenue - a.revenue) // Sort by revenue in descending order
                  .slice(0, 3)
                  .map((cat, i) => {
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

                {/* Category Breakdown */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold mb-4 text-gray-800">🛍 Выручка по категориям</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {periodStats.categories.map((cat, i) => {
                      const percent = ((cat.revenue / periodStats.period.total_revenue) * 100).toFixed(1);
                      return (
                        <div
                          key={i}
                          className="border rounded-lg p-4 bg-gray-50"
                        >
                          <div className="font-semibold text-gray-800 mb-2">{getCategoryLabel(cat.category)}</div>
                          <div className="text-sm text-gray-600 mb-3">
                            <span className="font-medium">{cat.total}</span> товаров · <span className="font-medium">{cat.revenue.toLocaleString()} ₽</span>
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
                </div>

                {periodStats.monthly.length > 0 && (
                  <>
                    <h4 className="text-lg font-semibold mb-4 text-gray-800">Ежемесячная статистика</h4>
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
                      <span className="font-medium">{cat.total}</span> товаров · <span className="font-medium">{cat.revenue.toLocaleString()} ₽</span>
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
                    <th className="py-3 px-4 font-medium text-gray-600">Продано товаров</th>
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
            
            {/* Add search input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Поиск по ID, имени пользователя, имени или фамилии..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setUsersCurrentPage(1); // Reset to first page when searching
                }}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
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
                  {currentUsers.map((user) => (
                    <tr 
                      key={user.telegram_id} 
                      className="border-b hover:bg-gray-50 cursor-pointer group" 
                      onClick={() => handleUserClick(user)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span>{user.telegram_id}</span>
                          <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            👆 Нажмите для просмотра деталей
                          </span>
                        </div>
                      </td>
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
            {/* Pagination Controls */}
            {usersTotalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setUsersCurrentPage(page => Math.max(1, page - 1))}
                    disabled={usersCurrentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    &laquo;
                  </button>
                  {Array.from({ length: usersTotalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setUsersCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                        ${usersCurrentPage === page
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setUsersCurrentPage(page => Math.min(usersTotalPages, page + 1))}
                    disabled={usersCurrentPage === usersTotalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    &raquo;
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add the user details modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">
                Информация о пользователе
              </h3>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setUserOrders([]);
                  setUserReferrals([]);
                  setUserStats(null);
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                ✕
              </button>
            </div>

            {loadingUserData ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Basic User Information */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="text-lg font-semibold mb-2">Основная информация</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Telegram ID</p>
                      <p className="font-medium">{selectedUser.telegram_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Username</p>
                      <p className="font-medium">@{selectedUser.username || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Имя</p>
                      <p className="font-medium">{selectedUser.first_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Фамилия</p>
                      <p className="font-medium">{selectedUser.last_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Дата регистрации</p>
                      <p className="font-medium">
                        {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Сумма всех покупок</p>
                      <p className="font-bold text-blue-700 text-lg">{totalPurchases.toLocaleString()} ₽</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Приглашено пользователей</p>
                      <p className="font-bold text-green-700 text-lg">{userReferrals.filter(Boolean).length}</p>
                    </div>
                  </div>
                </div>

                {/* User Statistics */}
                {userStats && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold mb-4">Статистика</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <p className="text-sm text-gray-600">Всего заказов</p>
                        <p className="text-xl font-bold text-blue-600">{userStats.totalOrders}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <p className="text-sm text-gray-600">Общая сумма</p>
                        <p className="text-xl font-bold text-blue-600">{userStats.totalSpent?.toLocaleString()} ₽</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <p className="text-sm text-gray-600">Средний чек</p>
                        <p className="text-xl font-bold text-blue-600">
                          {userStats.averageOrderValue?.toLocaleString()} ₽
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* User Orders */}
                <div className="bg-white rounded-lg border">
                  <h4 className="text-lg font-semibold p-4 border-b">История заказов</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-2 text-left">ID</th>
                          <th className="px-4 py-2 text-left">PUBG ID</th>
                          <th className="px-4 py-2 text-left">Никнейм</th>
                          <th className="px-4 py-2 text-left">Дата</th>
                          <th className="px-4 py-2 text-left">Статус</th>
                          <th className="px-4 py-2 text-left">Сумма</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userOrders.map((order) => {
                          const products = Array.isArray(order.products) ? order.products : JSON.parse(order.products || "[]");
                          const amount = products.reduce((sum, p) => sum + ((p.price || p.amount || 0) * (p.qty || 1)), 0);
                          return (
                            <tr key={order.id} className="border-t hover:bg-gray-50">
                              <td className="px-4 py-2">{order.id}</td>
                              <td className="px-4 py-2">{order.pubg_id || '-'}</td>
                              <td className="px-4 py-2">{order.nickname || '-'}</td>
                              <td className="px-4 py-2">
                                {
                                  (() => {
                                    const dateStr = order.time || order.created_at || order.createdAt;
                                    const dateObj = dateStr ? new Date(dateStr) : null;
                                    return dateObj && !isNaN(dateObj) ? dateObj.toLocaleString() : '-';
                                  })()
                                }
                              </td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                                  {getStatusLabel(order.status)}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                {amount.toLocaleString()} ₽
                              </td>
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


