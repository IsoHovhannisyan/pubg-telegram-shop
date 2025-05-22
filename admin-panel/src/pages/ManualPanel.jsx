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
      console.error("Ошибка при получении заказов:", err);
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
      console.error("Ошибка при получении товаров:", err);
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
      console.error("Ошибка при обновлении статуса:", err);
      alert("Не удалось обновить статус");
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
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">🧑‍💼 Ручная доставка</h2>

      {loading ? (
        <p>Загрузка...</p>
      ) : manualOrders.length === 0 ? (
        <p className="text-gray-500">Нет заказов на ручную обработку</p>
      ) : (
        <div className="space-y-4">
          {manualOrders.map((order) => {
            const products = Array.isArray(order.products)
              ? order.products
              : JSON.parse(order.products || "[]");

            return (
              <div key={order.id} className="p-4 border rounded shadow">
                <div className="mb-1 font-semibold">
                  Заказ #{order.id} — PUBG ID: <b>{order.pubg_id || "-"}</b>
                </div>
                <div className="text-sm text-gray-700 mb-1">
                  Ник: {order.nickname || "-"}
                </div>
                <div className="text-xs text-gray-500 mb-1">
                  Время:{" "}
                  {order.time ? new Date(order.time).toLocaleString() : "-"}
                </div>
                <ul className="text-sm mb-2 list-disc pl-4 max-h-32 overflow-y-auto pr-2">
                  {products.map((p, i) => (
                    <li key={i}>
                      {getProductNameById(p.id)} × {p.qty}
                    </li>
                  ))}
                </ul>
                <div className="text-sm mb-2">
                  Статус:{" "}
                  <span className="font-medium">
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (window.confirm("Отметить заказ как 'Менеджер'?")) {
                        updateStatus(order.id, "manual_processing");
                      }
                    }}
                    className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded"
                  >
                    Менеджер
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("Отметить заказ как 'Доставлен'?")) {
                        updateStatus(order.id, "delivered");
                      }
                    }}
                    className="px-3 py-1 bg-green-200 text-green-800 rounded"
                  >
                    Доставлен
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("Отметить заказ как 'Ошибка'?")) {
                        updateStatus(order.id, "error");
                      }
                    }}
                    className="px-3 py-1 bg-red-200 text-red-800 rounded"
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



