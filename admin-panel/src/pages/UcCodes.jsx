import React, { useState, useEffect } from "react";

export default function UcCodes() {
  const [code, setCode] = useState("");
  const [productName, setProductName] = useState("60uc");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [testCodes, setTestCodes] = useState([]);
  const [testMode, setTestMode] = useState(true); // ✅ Նոր state՝ testMode toggle-ի համար
  const token = localStorage.getItem("admin-token");

  const API_URL = process.env.REACT_APP_API_URL;

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    await delay(1000 + Math.random() * 2000);

    try {
      const res = await fetch(`${API_URL}/activator/add-uc-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code,
          productName: testMode ? "test_uc" : productName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage("✅ Код успешно добавлен");
        setCode("");
        fetchTestCodes();
      } else {
        setMessage("❌ Произошла ошибка: " + (data.error || "Не удалось"));
      }
    } catch (err) {
      console.error("❌ Խնդիր կա հարցման ժամանակ:", err);
      setMessage("❌ Ошибка сервера. Попробуйте еще раз");
    } finally {
      setLoading(false);
    }
  };

  const fetchTestCodes = async () => {
    try {
      const res = await fetch(`${API_URL}/activator/list-codes`);
      const data = await res.json();
      setTestCodes(data.testCodes || []);
    } catch (err) {
      console.error("❌ Fetch fail:", err);
    }
  };

  useEffect(() => {
    fetchTestCodes();
  }, []);

  return (
    <div className="p-6 space-y-6 bg-gray-50">
      <h2 className="text-3xl font-bold mb-4 text-center">💾 UC-коды</h2>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">Добавить новый код</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Код</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Введите код"
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Добавить
          </button>
        </form>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">Список кодов</h3>
        <ul className="space-y-2">
          {testCodes.map((c) => (
            <li key={c.id} className="flex justify-between items-center p-2 border rounded">
              <span>{c.code} ({c.productName})</span>
              <button
                onClick={() => {
                  // Implement the delete logic here
                }}
                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}



