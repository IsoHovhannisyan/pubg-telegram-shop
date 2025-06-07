import React, { useState, useEffect } from 'react';
import API from '../api';

const API_URL = process.env.REACT_APP_API_URL;

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    shop_open: true,
    orders_enabled: true,
    shop_closed_custom_message: '',
    shop_closed_message: "🛠 Магазин временно недоступен.",
    orders_disabled_message: "❗️Извините, в данный момент заказы недоступны.",
    x_costumes_enabled: true,
    cars_enabled: true
  });

  const token = localStorage.getItem("admin-token");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await API.get(`${API_URL}/admin/settings/shop-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(res.data);
    } catch (err) {
      console.error("❌ Ошибка при получении настроек:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings) => {
    setSaving(true);
    try {
      await API.post(`${API_URL}/admin/settings/shop-status`, newSettings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(newSettings);
      alert("✅ Настройки успешно сохранены");
    } catch (err) {
      console.error("❌ Ошибка при сохранении настроек:", err);
      alert("❌ Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 via-white to-pink-50">
        <p className="text-center text-lg text-blue-700 animate-pulse">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 via-white to-pink-50">
      <h2 className="text-4xl font-extrabold mb-8 text-center text-blue-900 drop-shadow">⚙️ Настройки магазина</h2>

      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-6">
        <div className="space-y-10">
          {/* Shop Section */}
          <div>
            <h3 className="text-2xl font-bold text-blue-800 mb-4 border-b pb-2">Витрина магазина</h3>
            <div className="space-y-4">
              {/* Shop Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h4 className="text-lg font-semibold text-gray-800">Статус магазина</h4>
                  <p className="text-sm text-gray-600">Включить или выключить весь магазин</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.shop_open}
                    onChange={(e) => updateSettings({ ...settings, shop_open: e.target.checked })}
                    disabled={saving}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              {/* Custom Closed Message */}
              {!settings.shop_open && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Сообщение при закрытии магазина (показывается пользователям)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                    value={settings.shop_closed_custom_message || ''}
                    onChange={(e) => setSettings({ ...settings, shop_closed_custom_message: e.target.value })}
                    disabled={saving}
                    placeholder="Например: Магазин закрыт на техобслуживание до 18:00 или по другой причине..."
                  />
                  <div className="text-xs text-gray-500">
                    Если оставить поле пустым, будет показано стандартное сообщение: <br />
                    <span className="italic">{settings.shop_closed_message}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Temporary Products Section */}
          <div>
            <h3 className="text-2xl font-bold text-blue-800 mb-4 border-b pb-2">Временные товары</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* X-Costumes Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h4 className="text-lg font-semibold text-gray-800">X-костюмы</h4>
                  <p className="text-sm text-gray-600">Показывать или скрыть X-костюмы в магазине</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.x_costumes_enabled}
                    onChange={(e) => updateSettings({ ...settings, x_costumes_enabled: e.target.checked })}
                    disabled={saving}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              {/* Cars Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h4 className="text-lg font-semibold text-gray-800">Машины</h4>
                  <p className="text-sm text-gray-600">Показывать или скрыть машины в магазине</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.cars_enabled}
                    onChange={(e) => updateSettings({ ...settings, cars_enabled: e.target.checked })}
                    disabled={saving}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Orders Section */}
          <div>
            <h3 className="text-2xl font-bold text-blue-800 mb-4 border-b pb-2">Оформление заказов</h3>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <h4 className="text-lg font-semibold text-gray-800">Прием заказов</h4>
                <p className="text-sm text-gray-600">Разрешить или запретить оформление заказов</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.orders_enabled}
                  onChange={(e) => updateSettings({ ...settings, orders_enabled: e.target.checked })}
                  disabled={saving}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* System Messages Section */}
          <div>
            <h3 className="text-2xl font-bold text-blue-800 mb-4 border-b pb-2">Системные сообщения</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Сообщение при отключенных заказах
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="2"
                  value={settings.orders_disabled_message}
                  onChange={(e) => setSettings({ ...settings, orders_disabled_message: e.target.value })}
                  disabled={saving}
                  placeholder="Введите сообщение, которое увидят пользователи при отключенных заказах"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-6 border-t mt-8">
            <button
              onClick={() => updateSettings(settings)}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition
                ${saving 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {saving ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

