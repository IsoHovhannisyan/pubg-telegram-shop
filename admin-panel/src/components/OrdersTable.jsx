import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { updateOrderStatus } from '../api';

const API_URL = process.env.REACT_APP_API_URL;
const ADMIN_TOKEN = process.env.REACT_APP_ADMIN_TOKEN;

const MANUAL_CATEGORIES = ["POPULARITY_ID", "POPULARITY_HOME", "CARS", "COSTUMES"];

const statusLabels = {
  unpaid: 'Не оплачен',
  pending: 'В обработке',
  manual_processing: 'Менеджер',
  delivered: 'Доставлен',
  error: 'Ошибка'
};

const ITEMS_PER_PAGE = 10;

export default function OrdersTable() {
  const [orders, setOrders] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [status, setStatus] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [processingOrder, setProcessingOrder] = useState(null);
  const [sortByNewest, setSortByNewest] = useState(true);
  const [showDelivered, setShowDelivered] = useState(false);
  const [stockDecreasedOrders, setStockDecreasedOrders] = useState(new Set());

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/products/admin`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      });
      setProductsList(res.data);
    } catch (err) {
      console.error("❌ Ошибка при получении товаров:", err);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/orders`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      });
      // Sort orders by newest first
      const sortedOrders = res.data.sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt);
        const dateB = new Date(b.created_at || b.createdAt);
        return sortByNewest ? dateB - dateA : dateA - dateB;
      });
      console.log('All orders:', sortedOrders);
      console.log('Delivered orders:', sortedOrders.filter(order => order.status === 'delivered'));
      setOrders(sortedOrders);
    } catch (err) {
      alert('Ошибка загрузки заказов');
    }
    setLoading(false);
  };

  const needsManualProcessing = (order) => {
    if (order.status === 'delivered') return false;

    const prods = Array.isArray(order.products)
      ? order.products
      : JSON.parse(order.products || "[]");

    return prods.some(
      (p) =>
        p.type === "manual" ||
        MANUAL_CATEGORIES.includes(p.category) ||
        productsList.find(
          (pr) => pr.id === p.id && MANUAL_CATEGORIES.includes(pr.category)
        )
    );
  };

  const openOrder = (order) => {
    setSelectedOrder(order);
    setStatus(order.status);
    setDeliveryNote(order.delivery_note || '');
    setSaveMessage('');
  };

  const updateStatus = async (orderId, status) => {
    if (selectedOrder.status === 'unpaid' && status === 'delivered') {
      setSaveMessage('Нельзя отметить неоплаченный заказ как доставленный!');
      return;
    }

    setSaving(true);
    try {
      await axios.patch(`${API_URL}/admin/orders/${orderId}`, {
        status,
        nickname: selectedOrder.nickname
      }, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      });

      // Decrease stock if marking as paid (unpaid -> pending) and not already decreased
      if (status === 'pending' && selectedOrder.status === 'unpaid' && !stockDecreasedOrders.has(orderId)) {
        const prods = Array.isArray(selectedOrder.products)
          ? selectedOrder.products
          : JSON.parse(selectedOrder.products || "[]");
        for (const p of prods) {
          try {
            await axios.post(
              `${API_URL}/admin/stock/update`,
              { product_id: p.id, quantity: p.qty },
              { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
            );
          } catch (err) {
            console.error(`Ошибка при уменьшении стока для товара ${p.id}:`, err);
          }
        }
        setStockDecreasedOrders(new Set([...stockDecreasedOrders, orderId]));
      }

      // Decrease stock if marking as delivered and not already decreased
      if (status === 'delivered' && !stockDecreasedOrders.has(orderId)) {
        const prods = Array.isArray(selectedOrder.products)
          ? selectedOrder.products
          : JSON.parse(selectedOrder.products || "[]");
        for (const p of prods) {
          try {
            await axios.post(
              `${API_URL}/admin/stock/update`,
              { product_id: p.id, quantity: p.qty },
              { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
            );
          } catch (err) {
            console.error(`Ошибка при уменьшении стока для товара ${p.id}:`, err);
          }
        }
        setStockDecreasedOrders(new Set([...stockDecreasedOrders, orderId]));
      }

      // Restore stock if marking as error and it was previously decreased
      if (status === 'error' && stockDecreasedOrders.has(orderId)) {
        const prods = Array.isArray(selectedOrder.products)
          ? selectedOrder.products
          : JSON.parse(selectedOrder.products || "[]");
        for (const p of prods) {
          try {
            await axios.post(
              `${API_URL}/admin/stock/restore`,
              { product_id: p.id, quantity: p.qty },
              { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
            );
          } catch (err) {
            console.error(`Ошибка при восстановлении стока для товара ${p.id}:`, err);
          }
        }
        const newSet = new Set(stockDecreasedOrders);
        newSet.delete(orderId);
        setStockDecreasedOrders(newSet);
      }

      // Send delivery notification if status is 'delivered'
      if (status === 'delivered') {
        const order = orders.find(o => o.id === orderId);
        if (order && order.user_id) {
          try {
            await axios.post(
              `${API_URL}/admin/orders/notify-delivery`,
              { 
                userId: order.user_id,
                orderId: order.id,
                pubgId: order.pubg_id,
                nickname: order.nickname
              },
              {
                headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
              }
            );
          } catch (err) {
            if (err.response?.data?.message) {
              alert(`Статус обновлен, но ${err.response.data.message}`);
            } else {
              console.error("❌ Ошибка при отправке уведомления:", err);
              alert("Статус обновлен, но не удалось отправить уведомление");
            }
          }
        }
      }

      await fetchOrders();
      setSaveMessage('Статус успешно обновлен');
      setTimeout(() => {
        setSaveMessage('');
        setSelectedOrder(null);
      }, 1000);
    } catch (err) {
      console.error("❌ Ошибка при обновлении статуса:", err);
      setSaveMessage('Ошибка при обновлении статуса');
    } finally {
      setSaving(false);
    }
  };

  const getAvailableStatuses = (order) => {
    const statuses = [];
    
    if (order.status === 'unpaid') {
      statuses.push(
        { value: 'unpaid', label: 'Не оплачен' },
        { value: 'pending', label: 'Подтвердить оплату' }
      );
      return statuses;
    }
    
    statuses.push(
      { value: 'pending', label: 'В обработке' },
      { value: 'manual_processing', label: 'Менеджер' },
      { value: 'delivered', label: 'Доставлен' },
      { value: 'error', label: 'Ошибка' }
    );
    
    return statuses;
  };

  const getProductNameById = (id) => {
    const product = productsList.find(p => p.id === id);
    return product ? product.name : id;
  };

  const formatProductList = (products) => {
    if (!Array.isArray(products)) return '';
    
    return products.map(p => {
      const productName = getProductNameById(p.id);
      const type = p.type === 'auto' ? '(по входу)' : 
                  p.type === 'manual' ? '(по ID)' :
                  p.type === 'costume' ? '(X-Костюм)' : '';
      return `${productName} × ${p.qty} ${type}`;
    }).join(', ');
  };

  const formatProductDetails = (products) => {
    if (!Array.isArray(products)) return '';
    
    return products.map(p => {
      const type = p.type === 'auto' ? '(по входу)' : 
                  p.type === 'manual' ? '(по ID)' :
                  p.type === 'costume' ? '(X-Костюм)' : '';
      return `${p.qty} шт. ${type}`;
    }).join(', ');
  };

  const calculateTotalPrice = (products) => {
    if (!Array.isArray(products)) return 0;
    return products.reduce((total, p) => total + (p.price * p.qty), 0);
  };

  const filteredOrders = orders.filter(order => {
    const isDelivered = order.status === 'delivered';
    const isManualOrder = needsManualProcessing(order);
    
    if (showArchived) {
      return isDelivered;
    } else {
      // Show all non-delivered orders, including pending orders
      return !isDelivered;
    }
  });

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  // Reset to first page when switching between active and archive
  useEffect(() => {
    setCurrentPage(1);
  }, [showArchived]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setProcessingOrder(orderId);
      await updateOrderStatus(orderId, newStatus);
      await fetchOrders();
      setSaveMessage('Статус успешно обновлен');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    } finally {
      setProcessingOrder(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'manual_processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'unpaid':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'delivered':
        return 'Доставлен';
      case 'manual_processing':
        return 'Ручная обработка';
      case 'pending':
        return 'В обработке';
      case 'unpaid':
        return 'Неоплачен';
      case 'error':
        return 'Ошибка';
      default:
        return status;
    }
  };

  const getUserSmiley = (userId) => {
    if (!userId) return '';
    const lastDigit = userId.toString().slice(-1);
    const smileys = ['😊', '😎', '🤖', '👾', '🎮', '🎯', '🎲', '🎪', '🎨', '🎭'];
    return smileys[parseInt(lastDigit)] || '👤';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Таблица заказов</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setSortByNewest(!sortByNewest)}
            className={`px-3 py-1 rounded ${sortByNewest ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            {sortByNewest ? 'Сначала новые' : 'Сначала старые'}
          </button>
          <button
            onClick={() => setShowArchived(false)}
            className={`px-3 py-1 rounded ${!showArchived ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Активные
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`px-3 py-1 rounded ${showArchived ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Архив
          </button>
        </div>
      </div>
      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
              <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PUBG ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Продукт
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сумма
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
              </tr>
            </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.pubg_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-md">
                        {formatProductList(Array.isArray(order.products) ? order.products : JSON.parse(order.products || "[]"))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {calculateTotalPrice(Array.isArray(order.products) ? order.products : JSON.parse(order.products || "[]"))} ₽
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.created_at ? new Date(order.created_at).toLocaleString() : order.createdAt ? new Date(order.createdAt).toLocaleString() : ""}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      onClick={() => openOrder(order)}
                    >
                        Детали
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Назад
                </button>
                <button
                  onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Вперед
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Показано <span className="font-medium">{startIndex + 1}</span> -{' '}
                    <span className="font-medium">{Math.min(endIndex, filteredOrders.length)}</span> из{' '}
                    <span className="font-medium">{filteredOrders.length}</span> заказов
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      <span className="sr-only">Previous</span>
                      &laquo;
                    </button>
                    {[...Array(totalPages)].map((_, index) => (
                      <button
                        key={index + 1}
                        onClick={() => setCurrentPage(index + 1)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === index + 1
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      <span className="sr-only">Next</span>
                      &raquo;
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedOrder && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={() => setSelectedOrder(null)} />
          <div className="fixed top-1/2 left-1/2 z-50 bg-white rounded-lg shadow-lg p-6 w-full max-w-md transform -translate-x-1/2 -translate-y-1/2">
            <h3 className="text-xl font-bold mb-2">
              Заказ #{selectedOrder.id}
              {needsManualProcessing(selectedOrder) && (
                <span className="ml-2 text-sm text-blue-600">(Ручная обработка)</span>
              )}
            </h3>
            <p className="mb-1">Пользователь: <span className="font-mono">{selectedOrder.user_id}</span></p>
            <p className="mb-1">PUBG ID: <span className="font-mono">{selectedOrder.pubg_id}</span></p>
            <p className="mb-1">Никнейм: <span className="font-mono">{selectedOrder.nickname}</span></p>
            <div className="mb-2">
              <span className="block mb-1 font-medium">Товары:</span>
              <ul className="list-disc pl-5 text-sm">
                {Array.isArray(selectedOrder.products) ? selectedOrder.products.map((p, i) => {
                  const productName = getProductNameById(p.id);
                  const type = p.type === 'auto' ? '(по входу)' : 
                              p.type === 'manual' ? '(по ID)' :
                              p.type === 'costume' ? '(X-Костюм)' : '';
                  return (
                    <li key={i} className="text-gray-700">
                      {productName} × {p.qty} {type}
                    </li>
                  );
                }) : []}
              </ul>
            </div>
            <label className="block mb-2">
              <span className="block mb-1">Статус:</span>
              <select
                className="w-full border rounded px-2 py-1"
                value={status}
                onChange={e => setStatus(e.target.value)}
                disabled={saving}
              >
                {getAvailableStatuses(selectedOrder).map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block mb-2">
              <span className="block mb-1">Примечание к доставке:</span>
              <textarea
                className="w-full border rounded px-2 py-1 min-h-[60px]"
                value={deliveryNote}
                onChange={e => setDeliveryNote(e.target.value)}
                disabled={saving}
              />
            </label>
            {saveMessage && (
              <div className={`mb-2 text-center font-semibold ${saveMessage.includes('успешно') || saveMessage.includes('Успешно') ? 'text-green-600' : 'text-red-600'}`}>{saveMessage}</div>
            )}
            <div className="flex gap-2 mt-4">
              <button
                className={`flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={() => updateStatus(selectedOrder.id, status)}
                disabled={saving}
              >
                {saving ? 'Сохраняется...' : 'Сохранить'}
              </button>
              <button
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
                onClick={() => setSelectedOrder(null)}
                disabled={saving}
              >
                {saving ? 'Закрытие...' : 'Закрыть'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 