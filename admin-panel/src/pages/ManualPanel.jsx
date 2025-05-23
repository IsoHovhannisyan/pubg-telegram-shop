import React, { useEffect, useState } from "react";
import API from "../api";

const API_URL = process.env.REACT_APP_API_URL;

const MANUAL_CATEGORIES = ["POPULARITY_ID", "POPULARITY_HOME", "CARS", "COSTUMES"];

const statusLabels = {
  pending: "В обработке",
  manual_processing: "Менеджер",
  delivered: "Доставлен",
  error: "Ошибка",
};

export default function ManualPanel() {
  const [orders, setOrders] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const updateStatus = async (orderId, status) => {
    try {
      await API.patch(
        `${API_URL}/admin/orders/${orderId}`,
        { status },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchOrders();
    } catch (err) {
      console.error("❌ Ошибка при обновлении статуса:", err);
      alert("Не удалось обновить статус заказа");
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  const getProductNameById = (id) => {
    const found = productsList.find((p) => p.id === id);
    return found ? found.name : `ID ${id} (неизвестно)`;
  };

  const manualOrders = orders.filter((o) => {
    const prods = Array.isArray(o.products)
      ? o.products
      : JSON.parse(o.products || "[]");

    return prods.some(
      (p) =>
        p.type === "manual" ||
        MANUAL_CATEGORIES.includes(p.category) ||
        productsList.find(
          (pr) => pr.id === p.id && MANUAL_CATEGORIES.includes(pr.category)
        )
    );
  });

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 via-white to-pink-50">
      <h2 className="text-4xl font-extrabold mb-8 text-center text-blue-900 drop-shadow">🧑‍💼 Ручная доставка</h2>
      {loading ? (
        <p className="text-center text-lg text-blue-700 animate-pulse">Загрузка...</p>
      ) : manualOrders.length === 0 ? (
        <p className="text-center text-gray-400 text-xl">Нет заказов для ручной обработки</p>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {manualOrders.map((order) => {
            const products = Array.isArray(order.products)
              ? order.products
              : JSON.parse(order.products || "[]");

            return (
              <div key={order.id} className="bg-white border border-blue-100 rounded-2xl shadow-xl p-6 flex flex-col justify-between transition-transform hover:scale-[1.025] hover:shadow-2xl">
                <div>
                  <div className="mb-2 font-bold text-lg text-blue-800 flex items-center gap-2">
                    <span className="inline-block bg-blue-100 text-blue-700 rounded px-2 py-0.5 text-xs font-semibold">Заказ #{order.id}</span>
                    <span className="ml-auto text-xs text-gray-400">{order.time ? new Date(order.time).toLocaleString() : "-"}</span>
                  </div>
                  <div className="mb-1 text-sm text-gray-700">
                    <span className="font-medium">PUBG ID:</span> <b>{order.pubg_id || "-"}</b>
                  </div>
                  <div className="mb-1 text-sm text-gray-700">
                    <span className="font-medium">Никнейм:</span> {order.nickname || "-"}
                  </div>
                  <ul className="text-sm mb-3 list-disc pl-5 max-h-24 overflow-y-auto pr-2 text-gray-800">
                    {products.map((p, i) => (
                      <li key={i}>
                        {getProductNameById(p.id)} × {p.qty}
                      </li>
                    ))}
                  </ul>
                  <div className="mb-3">
                    <span className="text-xs font-semibold mr-2">Статус:</span>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold shadow-sm
                      ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${order.status === 'manual_processing' ? 'bg-blue-100 text-blue-800' : ''}
                      ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : ''}
                      ${order.status === 'error' ? 'bg-red-100 text-red-800' : ''}
                    `}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      if (window.confirm("Отметить заказ как 'Менеджер'?")) {
                        updateStatus(order.id, "manual_processing");
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg font-semibold hover:bg-blue-200 transition"
                  >
                    Менеджер
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("Отметить заказ как 'Доставлен'?")) {
                        updateStatus(order.id, "delivered");
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-green-100 text-green-800 rounded-lg font-semibold hover:bg-green-200 transition"
                  >
                    Доставлен
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("Отметить заказ как 'Ошибка'?")) {
                        updateStatus(order.id, "error");
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-red-100 text-red-800 rounded-lg font-semibold hover:bg-red-200 transition"
                  >
                    Ошибка
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



