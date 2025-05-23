import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;
const ADMIN_TOKEN = process.env.REACT_APP_ADMIN_TOKEN;

const statusLabels = {
  unpaid: 'Не оплачен',
  manual_processing: 'Обрабатывается вручную',
  delivered: 'Доставлен',
  // add other statuses as needed
};

export default function OrdersTable() {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [status, setStatus] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/orders`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      });
      setOrders(res.data);
    } catch (err) {
      alert('Ошибка загрузки заказов');
    }
    setLoading(false);
  };

  const openOrder = (order) => {
    setSelectedOrder(order);
    setStatus(order.status);
    setDeliveryNote(order.delivery_note || '');
    setSaveMessage('');
  };

  const updateStatus = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      await axios.patch(`${API_URL}/admin/orders/${selectedOrder.id}`, {
        status,
        nickname: selectedOrder.nickname
      }, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      });
      setSaveMessage('Успешно сохранено!');
      setTimeout(() => {
        setSelectedOrder(null);
        fetchOrders();
      }, 800);
    } catch (err) {
      setSaveMessage('Ошибка сохранения!');
    }
    setSaving(false);
  };

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4">Таблица заказов</h2>
      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="p-3 font-semibold">ID</th>
                <th className="p-3 font-semibold">Пользователь</th>
                <th className="p-3 font-semibold">PUBG ID</th>
                <th className="p-3 font-semibold">Никнейм</th>
                <th className="p-3 font-semibold">Статус</th>
                <th className="p-3 font-semibold">Дата</th>
                <th className="p-3 font-semibold">Товары</th>
                <th className="p-3 font-semibold">Действия</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, idx) => (
                <tr
                  key={order.id}
                  className={
                    `transition hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`
                  }
                >
                  <td className="p-3 font-semibold text-gray-800">{order.id}</td>
                  <td className="p-3">{order.user_id}</td>
                  <td className="p-3">{order.pubg_id}</td>
                  <td className="p-3">{order.nickname}</td>
                  <td className="p-3">{statusLabels[order.status] || order.status}</td>
                  <td className="p-3">{new Date(order.time).toLocaleString()}</td>
                  <td className="p-3">{Array.isArray(order.products) ? order.products.map(p => `${p.name || p.id} x${p.qty}`).join(', ') : ''}</td>
                  <td className="p-3">
                    <button
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                      onClick={() => openOrder(order)}
                    >
                      Подробнее
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={() => setSelectedOrder(null)} />
          {/* Modal */}
          <div className="fixed top-1/2 left-1/2 z-50 bg-white rounded-lg shadow-lg p-6 w-full max-w-md transform -translate-x-1/2 -translate-y-1/2">
            <h3 className="text-xl font-bold mb-2">Заказ #{selectedOrder.id}</h3>
            <p className="mb-1">Пользователь: <span className="font-mono">{selectedOrder.user_id}</span></p>
            <p className="mb-1">PUBG ID: <span className="font-mono">{selectedOrder.pubg_id}</span></p>
            <p className="mb-1">Никнейм: <span className="font-mono">{selectedOrder.nickname}</span></p>
            <p className="mb-2">Товары: <span className="font-mono">{Array.isArray(selectedOrder.products) ? selectedOrder.products.map(p => `${p.name || p.id} x${p.qty}`).join(', ') : ''}</span></p>
            <label className="block mb-2">
              <span className="block mb-1">Статус:</span>
              <select
                className="w-full border rounded px-2 py-1"
                value={status}
                onChange={e => setStatus(e.target.value)}
                disabled={saving}
              >
                <option value="unpaid">Не оплачен</option>
                <option value="manual_processing">Обрабатывается вручную</option>
                <option value="delivered">Доставлен</option>
                {/* add other statuses as needed */}
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
                onClick={updateStatus}
                disabled={saving}
              >
                {saving ? 'Сохраняется...' : 'Сохранить'}
              </button>
              <button
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
                onClick={() => setSelectedOrder(null)}
                disabled={saving}
              >
                Закрыть
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 