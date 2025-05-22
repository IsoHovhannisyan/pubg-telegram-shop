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
        setMessage("✅ Կոդը հաջողությամբ ավելացվեց");
        setCode("");
        fetchTestCodes();
      } else {
        setMessage("❌ Սխալ առաջացավ․ " + (data.error || "Չհաջողվեց"));
      }
    } catch (err) {
      console.error("❌ Խնդիր կա հարցման ժամանակ:", err);
      setMessage("❌ Սերվերի սխալ․ փորձիր նորից");
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
    <div className="max-w-lg mx-auto mt-10 p-6 bg-white rounded-2xl shadow-md">
      <h2 className="text-xl font-bold mb-4">➕ Ավելացնել UC կոդ</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">UC փաթեթ</label>
          <select
            className="w-full border p-2 rounded-xl"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            disabled={testMode} // ❗ Disable when in test mode
          >
            <option value="60uc">60uc</option>
            <option value="325uc">325uc</option>
            <option value="660uc">660uc</option>
            <option value="1800uc">1800uc</option>
            <option value="3850uc">3850uc</option>
            <option value="8100uc">8100uc</option>
          </select>
        </div>
        <div>
          <label className="block mb-1 font-medium">UC redeem կոդ</label>
          <input
            type="text"
            className="w-full border p-2 rounded-xl"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ABCD-EFGH-IJKL"
            required
          />
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={testMode}
            onChange={() => setTestMode(!testMode)}
            id="testModeToggle"
          />
          <label htmlFor="testModeToggle" className="text-sm">
            🧪 Ավելացնել որպես փորձնական (test_uc)
          </label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 w-full"
        >
          {loading ? "Ուղարկվում է..." : "Ավելացնել կոդ"}
        </button>
      </form>
      {message && (
        <div className="mt-4 text-center text-sm font-medium text-gray-700">
          {message}
        </div>
      )}

      {testCodes.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-bold mb-2">🧪 Test_uc կոդեր</h3>
          <ul className="text-sm list-disc ml-5">
            {testCodes.map((c, i) => (
              <li key={i}>
                {c.code} ({c.productName})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}



