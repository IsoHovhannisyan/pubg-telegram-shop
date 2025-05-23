import React, { useEffect, useState } from "react";
import API from "../api";

const API_URL = process.env.REACT_APP_API_URL;
const TOKEN = process.env.REACT_APP_ADMIN_TOKEN;
const ACTIVATOR_URL = process.env.REACT_APP_ACTIVATOR_URL;

export default function Activator() {
  const [orders, setOrders] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await API.get(`${API_URL}/admin/orders`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
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
      const res = await API.get(`${API_URL}/admin/products`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      });
      setProductsList(res.data);
    } catch (err) {
      console.error("❌ Ошибка при получении товаров:", err);
    }
  };

  const activateOrder = async (order) => {
    try {
      const products = Array.isArray(order.products)
        ? order.products
        : JSON.parse(order.products);

      const result = await API.post(`${ACTIVATOR_URL}/activate`, {
        id: order.pubg_id,
        items: products.map((item) => ({ code: item.id, qty: item.qty })),
      });

      if (result.data.success) {
        await API.post(
          `${API_URL}/admin/update-status`,
          { orderId: order.id, status: "delivered" },
          { headers: { Authorization: `Bearer ${TOKEN}` } }
        );
        alert(`✅ Заказ #${order.id} успешно активирован!`);
        fetchOrders();
      } else {
        throw new Error("Активатор вернул ошибку");
      }
    } catch (err) {
      console.error("❌ Ошибка при активации:", err);
      alert(`❌ Ошибка при активации заказа #${order.id}`);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  console.log(orders);
  

  const pendingUCOrders = orders.filter(
    (o) =>
      o.category === "uc_by_id" &&
      JSON.stringify(o.products).includes("uc_")
  );

  const getProductNameById = (id) => {
    const found = productsList.find((p) => p.id === id);
    return found ? found.name : id;
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50">
      <h2 className="text-3xl font-bold mb-4 text-center">⚙️ Автоматическая активация заказов</h2>
      {loading ? (
        <p className="text-center">Загрузка...</p>
      ) : pendingUCOrders.length === 0 ? (
        <p className="text-center text-gray-500">Нет заказов для автоматической активации</p>
      ) : (
        <div className="space-y-4">
          {pendingUCOrders.map((order) => {
            const products = Array.isArray(order.products)
              ? order.products
              : JSON.parse(order.products);

            return (
              <div key={order.id} className="p-4 border rounded shadow bg-white">
                <div className="mb-2 font-semibold">
                  Заказ #{order.id} — PUBG ID: <b>{order.pubg_id}</b>
                </div>
                <ul className="text-sm mb-2">
                  {products.map((p, i) => (
                    <li key={i}>
                      {getProductNameById(p.id)} × {p.qty}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => activateOrder(order)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                  Активировать заказ
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}




