import React, { useEffect, useState } from "react";
import API from "../api";

const API_URL = process.env.REACT_APP_API_URL;

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const token = localStorage.getItem("admin-token");

  const fetchOrders = async () => {
    try {
      const res = await API.get(`${API_URL}/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data);
    } catch (err) {
      console.error("❌ Ошибка при получении заказов:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await API.get(`${API_URL}/admin/products/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProductsList(res.data);
    } catch (err) {
      console.error("❌ Ошибка при получении товаров:", err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  const updateStatus = async (orderId, status) => {
    const confirmChange = window.confirm("Вы уверены, что хотите изменить статус?");
    if (!confirmChange) return;
    try {
      await API.patch(
        `${API_URL}/admin/orders/${orderId}`,
        { status },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status } : order
        )
      );
    } catch (err) {
      console.error("❌ Ошибка при обновлении статуса:", err);
      alert("Не удалось обновить статус");
    }
  };

  const parseProducts = (order) => {
    try {
      if (typeof order.products === "string") {
        return JSON.parse(order.products);
      } else if (Array.isArray(order.products)) {
        return order.products;
      } else {
        return [];
      }
    } catch (e) {
      return [];
    }
  };

  const getProductName = (id) => {
    const found = productsList.find((p) => p.id === id);
    return found ? found.name : id;
  };

  const filteredOrders = statusFilter
    ? orders.filter((o) => o.status === statusFilter)
    : orders;

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">📦 Управление заказами</h2>

      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm">Фильтр по статусу:</label>
        <select
          onChange={(e) => setStatusFilter(e.target.value)}
          value={statusFilter}
          className="border px-2 py-1 rounded"
        >
          <option value="">Все</option>
          <option value="unpaid">Неоплаченные</option> {/* ✅ Ավելացվեց */}
          <option value="pending">В обработке</option>
          <option value="manual_processing">Менеджер</option>
          <option value="delivered">Доставлен</option>
          <option value="error">Ошибка</option>
        </select>
      </div>

      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">ID</th>
                <th className="border p-2">Пользователь</th>
                <th className="border p-2">Товары</th>
                <th className="border p-2">PUBG ID</th>
                <th className="border p-2">Никнейм</th>
                <th className="border p-2">Время</th>
                <th className="border p-2">Статус</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const products = parseProducts(order);
                return (
                  <tr key={order.id} className="border-b align-top">
                    <td className="border p-2 font-semibold text-gray-800">
                      #{order.id}
                    </td>
                    <td className="border p-2">{order.user_id}</td>
                    <td className="border p-2 max-h-32 overflow-y-auto">
                      <div className="max-h-20 overflow-y-auto">
                        {products.length ? (
                          products.map((item, idx) => (
                            <div key={idx}>
                              {getProductName(item.id)} × {item.qty}
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400 italic">Нет товаров</div>
                        )}
                      </div>
                    </td>
                    <td className="border p-2">{order.pubg_id || "-"}</td>
                    <td className="border p-2">{order.nickname || "-"}</td>
                    <td className="border p-2">
                      {order.time
                        ? new Date(order.time).toLocaleString()
                        : "-"}
                    </td>
                    <td className="border p-2">
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        className={`px-3 py-2 rounded-xl text-sm font-medium border shadow-sm transition-all duration-150
                          ${
                            order.status === "delivered"
                            ? "bg-green-100 text-green-800 border-green-300"
                            : order.status === "error"
                            ? "bg-red-100 text-red-800 border-red-300"
                            : order.status === "manual_processing"
                            ? "bg-blue-100 text-blue-800 border-blue-300"
                            : order.status === "unpaid"
                            ? "bg-gray-100 text-gray-700 border-gray-300"
                            : "bg-yellow-100 text-yellow-800 border-yellow-300"
                          }`}
                        >
                        <option value="unpaid">Неоплачен</option>
                        <option value="pending">В обработке</option>
                        <option value="manual_processing">Менеджер</option>
                        <option value="delivered">Доставлен</option>
                        <option value="error">Ошибка</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}









