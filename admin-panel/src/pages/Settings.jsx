import React, { useEffect, useState } from "react";
import API from "../api";

export default function Settings() {
  const [status, setStatus] = useState({
    shop_open: true,
    orders_enabled: true,
    shop_closed_message: "",
    orders_disabled_message: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem("admin-token");

  const fetchStatus = async () => {
    try {
      const res = await API.get("/admin/settings/shop-status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus(res.data);
    } catch (err) {
      console.error("Ошибка при получении настроек:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async () => {
    setSaving(true);
    try {
      await API.post("/admin/settings/shop-status", status, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Настройки успешно сохранены");
    } catch (err) {
      console.error("Ошибка при сохранении:", err);
      alert("Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleChange = (key, value) => {
    setStatus(prev => ({ ...prev, [key]: value }));
  };

  return (
  <div className="p-6 max-w-2xl">
    <h2 className="text-2xl font-bold mb-4">⚙️ Настройки магазина</h2>

    {loading ? (
      <p>Загрузка...</p>
    ) : (
      <div className="space-y-6">
        {/* Магазин открыт / закрыт */}
        <div className="flex items-center justify-between bg-white p-4 border rounded shadow">
          <div>
            <div className="font-semibold text-lg">
              Магазин сейчас:{" "}
              <span
                className={
                  status.shop_open ? "text-green-600" : "text-red-600"
                }
              >
                {status.shop_open ? "ОТКРЫТ" : "ЗАКРЫТ"}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Клиенты не смогут оформить заказ, если магазин закрыт
            </div>
          </div>
          <button
            onClick={() => handleChange("shop_open", !status.shop_open)}
            className={`px-4 py-2 rounded text-white font-semibold ${
              status.shop_open ? "bg-red-600" : "bg-green-600"
            }`}
          >
            {status.shop_open ? "Закрыть магазин" : "Открыть магазин"}
          </button>
        </div>

        {/* ❗️ Только если магазин открыт */}
        {status.shop_open && (
          <>
            {/* Заказы разрешены */}
            <div className="flex items-center justify-between bg-white p-4 border rounded shadow">
              <div>
                <div className="font-semibold text-lg">
                  Заказы:{" "}
                  <span
                    className={
                      status.orders_enabled
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {status.orders_enabled ? "РАЗРЕШЕНЫ" : "ЗАПРЕЩЕНЫ"}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  При выключении — пользователи не смогут подтвердить заказ
                </div>
              </div>
              <button
                onClick={() =>
                  handleChange("orders_enabled", !status.orders_enabled)
                }
                className={`px-4 py-2 rounded text-white font-semibold ${
                  status.orders_enabled ? "bg-red-600" : "bg-green-600"
                }`}
              >
                {status.orders_enabled
                  ? "Запретить заказы"
                  : "Разрешить заказы"}
              </button>
            </div>

            {/* Сообщения */}
            <div className="bg-white p-4 border rounded shadow space-y-4">
              <div>
                <label className="block font-medium mb-1">
                  Сообщение при закрытом магазине:
                </label>
                <textarea
                  value={status.shop_closed_message}
                  onChange={e =>
                    handleChange("shop_closed_message", e.target.value)
                  }
                  rows={2}
                  className="w-full border rounded p-2 text-sm"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">
                  Сообщение при отключенных заказах:
                </label>
                <textarea
                  value={status.orders_disabled_message}
                  onChange={e =>
                    handleChange("orders_disabled_message", e.target.value)
                  }
                  rows={2}
                  className="w-full border rounded p-2 text-sm"
                />
              </div>
            </div>
          </>
        )}
        <button
          onClick={updateStatus}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded font-semibold"
        >
          💾 Сохранить изменения
        </button>
      </div>
    )}
  </div>
);

}

