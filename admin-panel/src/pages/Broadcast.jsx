import React, { useState } from "react";
import API from "../api";

export default function Broadcast() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const token = localStorage.getItem("admin-token");

  const sendBroadcast = async () => {
    if (!message.trim()) {
      setStatus("Введите сообщение для рассылки");
      return;
    }
    setSending(true);
    setStatus("");
    try {
      await API.post(
        "/admin/broadcast",
        { message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus("✅ Сообщение успешно отправлено всем пользователям!");
      setMessage("");
    } catch (err) {
      setStatus("❌ Ошибка при отправке рассылки");
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 via-white to-pink-50">
      <h2 className="text-4xl font-extrabold mb-8 text-center text-blue-900 drop-shadow">📢 Рассылка</h2>
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-6">
        <textarea
          className="w-full p-3 border border-gray-300 rounded-lg mb-4 min-h-[120px]"
          placeholder="Введите текст сообщения для рассылки..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          disabled={sending}
        />
        <button
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition ${sending ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          onClick={sendBroadcast}
          disabled={sending}
        >
          {sending ? 'Отправка...' : 'Отправить всем пользователям'}
        </button>
        {status && <div className="mt-4 text-center font-semibold text-blue-700">{status}</div>}
      </div>
    </div>
  );
} 