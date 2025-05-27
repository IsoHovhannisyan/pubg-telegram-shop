import React, { useEffect, useState } from "react";
import API from "../api";

const API_URL = process.env.REACT_APP_API_URL;
const ITEMS_PER_PAGE = 9; // 3x3 grid

const MANUAL_CATEGORIES = ["POPULARITY_ID", "POPULARITY_HOME", "CARS", "COSTUMES"];

const statusLabels = {
  unpaid: "Не оплачен",
  pending: "В обработке",
  manual_processing: "Менеджер",
  delivered: "Доставлен",
  error: "Ошибка",
};

export default function ManualPanel() {
  const [orders, setOrders] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [newOrderIds, setNewOrderIds] = useState(new Set());
  const [stockDecreasedOrders, setStockDecreasedOrders] = useState(new Set()); // Track orders with decreased stock

  const token = localStorage.getItem("admin-token");

  const fetchOrders = async () => {
    try {
      const res = await API.get(`${API_URL}/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Sort orders by newest first
      const sortedOrders = res.data.sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt);
        const dateB = new Date(b.created_at || b.createdAt);
        return dateB - dateA;
      });
      
      // Track new orders
      const currentOrderIds = new Set(orders.map(o => o.id));
      const newIds = sortedOrders
        .filter(o => !currentOrderIds.has(o.id))
        .map(o => o.id);
      
      if (newIds.length > 0) {
        setNewOrderIds(new Set(newIds));
        // Clear new order highlighting after 5 seconds
        setTimeout(() => {
          setNewOrderIds(new Set());
        }, 5000);
      }
      
      setOrders(sortedOrders);
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

      // No direct stock update/restore here. Backend handles it.

      await fetchOrders();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error && err.response.data.error.includes('Not enough stock')) {
        alert('Not enough stock available.');
      } else {
        console.error("❌ Ошибка при обновлении статуса:", err);
        alert("Не удалось обновить статус заказа");
      }
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchProducts();

    const refreshInterval = setInterval(() => {
      fetchOrders();
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, []);

  const getProductNameById = (id) => {
    const found = productsList.find((p) => p.id === id);
    return found ? found.name : `ID ${id} (неизвестно)`;
  };

  const manualOrders = orders.filter((o) => {
    if (showArchived) {
      // Show only delivered orders
      return o.status === 'delivered';
    } else {
      // Show only not delivered orders
      return o.status !== 'delivered';
    }
  }).filter((o) => {
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
  }).sort((a, b) => {
    // Sort strictly by time, newest first
    const timeA = new Date(a.time || a.created_at || a.createdAt);
    const timeB = new Date(b.time || b.created_at || b.createdAt);
    return timeB - timeA;
  });

  // Pagination logic
  const totalPages = Math.ceil(manualOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentOrders = manualOrders.slice(startIndex, endIndex);

  // Reset to first page when switching between active and archive
  useEffect(() => {
    setCurrentPage(1);
  }, [showArchived]);

  const getStatusButtons = (order) => {
    const buttons = [];

    // If order is unpaid, allow to mark as paid
    if (order.status === 'unpaid') {
      buttons.push(
        <button
          key="mark-paid"
          onClick={() => {
            if (window.confirm("Отметить заказ как 'Оплачен' и вернуть в обработку?")) {
              updateStatus(order.id, "pending");
            }
          }}
          className="flex-1 px-3 py-2 bg-green-100 text-green-800 rounded-lg font-semibold hover:bg-green-200 transition"
        >
          Оплачен
        </button>
      );
      return buttons;
    }

    // For orders in pending status, only allow to take into processing
    if (order.status === 'pending') {
      buttons.push(
        <button
          key="take"
          onClick={() => {
            if (window.confirm("Взять заказ в обработку?")) {
              updateStatus(order.id, "manual_processing");
            }
          }}
          className="flex-1 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg font-semibold hover:bg-blue-200 transition"
        >
          Взять в обработку
        </button>
      );
      return buttons;
    }

    // Only show 'Доставлен' and 'Ошибка' when status is 'manual_processing'
    if (order.status === 'manual_processing') {
      buttons.push(
        <button
          key="complete"
          onClick={() => {
            if (window.confirm("Отметить заказ как 'Доставлен'?")) {
              updateStatus(order.id, "delivered");
            }
          }}
          className="flex-1 px-3 py-2 bg-green-100 text-green-800 rounded-lg font-semibold hover:bg-green-200 transition"
        >
          Доставлен
        </button>,
        <button
          key="error"
          onClick={() => {
            if (window.confirm("Отметить заказ как 'Ошибка'?")) {
              updateStatus(order.id, "error");
            }
          }}
          className="flex-1 px-3 py-2 bg-red-100 text-red-800 rounded-lg font-semibold hover:bg-red-200 transition"
        >
          Ошибка
        </button>
      );
      return buttons;
    }

    if (order.status === 'error') {
      buttons.push(
        <button
          key="retry"
          onClick={() => {
            if (window.confirm("Вернуть заказ в обработку?")) {
              updateStatus(order.id, "manual_processing");
            }
          }}
          className="flex-1 px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg font-semibold hover:bg-yellow-200 transition"
        >
          Вернуть в обработку
        </button>
      );
    }

    return buttons;
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 via-white to-pink-50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-extrabold text-center text-blue-900 drop-shadow">🧑‍💼 Ручная доставка</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowArchived(false)}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              !showArchived 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Активные
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              showArchived 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Архив
          </button>
        </div>
      </div>
      {loading ? (
        <p className="text-center text-lg text-blue-700 animate-pulse">Загрузка...</p>
      ) : manualOrders.length === 0 ? (
        <p className="text-center text-gray-400 text-xl">
          {showArchived ? 'Нет доставленных заказов' : 'Нет заказов для ручной обработки'}
        </p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {currentOrders.map((order) => {
            const products = Array.isArray(order.products)
              ? order.products
              : JSON.parse(order.products || "[]");
              const isNew = newOrderIds.has(order.id);

            return (
                <div 
                  key={order.id} 
                  className={`bg-white border border-blue-100 rounded-xl shadow-lg p-4 flex flex-col justify-between transition-all
                    ${isNew ? 'ring-2 ring-green-500 animate-pulse' : 'hover:shadow-xl'}`}
                >
                <div>
                    <div className="mb-2 font-bold text-base text-blue-800 flex items-center gap-2">
                    <span className="inline-block bg-blue-100 text-blue-700 rounded px-2 py-0.5 text-xs font-semibold">Заказ #{order.id}</span>
                    <span className="ml-auto text-xs text-gray-400">{order.time ? new Date(order.time).toLocaleString() : "-"}</span>
                  </div>
                  <div className="mb-1 text-sm text-gray-700">
                    <span className="font-medium">PUBG ID:</span> <b>{order.pubg_id || "-"}</b>
                  </div>
                  <div className="mb-1 text-sm text-gray-700">
                    <span className="font-medium">Никнейм:</span> {order.nickname || "-"}
                  </div>
                    <ul className="text-sm mb-2 list-disc pl-5 max-h-20 overflow-y-auto pr-2 text-gray-800">
                    {products.map((p, i) => (
                      <li key={i}>
                        {getProductNameById(p.id)} × {p.qty}
                      </li>
                    ))}
                  </ul>
                    <div className="mb-2">
                    <span className="text-xs font-semibold mr-2">Статус:</span>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold shadow-sm
                      ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${order.status === 'manual_processing' ? 'bg-blue-100 text-blue-800' : ''}
                      ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : ''}
                      ${order.status === 'error' ? 'bg-red-100 text-red-800' : ''}
                        ${order.status === 'unpaid' ? 'bg-gray-100 text-gray-800' : ''}
                    `}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                    {getStatusButtons(order)}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <span className="sr-only">Previous</span>
                  &laquo;
                  </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                      ${currentPage === page
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                  >
                    {page}
                  </button>
                ))}
                  <button
                  onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <span className="sr-only">Next</span>
                  &raquo;
                  </button>
              </nav>
                </div>
          )}
        </>
      )}
    </div>
  );
}



