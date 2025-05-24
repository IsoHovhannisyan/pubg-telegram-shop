import React, { useState, useEffect } from "react";
import API from "../api";

const API_URL = process.env.REACT_APP_API_URL;

const categories = [
  "uc_by_id",
  "uc_by_login",
  "popularity_by_id",
  "popularity_home_by_id",
  "cars",
  "costumes", // եթե այս կատեգորիան կա
];

const categoryLabels = {
  uc_by_id: "ЮС по ID",
  uc_by_login: "ЮС по логину",
  popularity_by_id: "Популярность по ID",
  popularity_home_by_id: "Популярность дома",
  cars: "Машины",
  costumes: "Одежда / X-костюмы",
};

export default function Products() {
const [form, setForm] = useState({
  name: "",
  price: "",
  stock: "",
  category: categories[0], // ✅ Առաջին իրական կատեգորիան
  active: true,
  image: null,
  telegramId: ""
});

  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [preview, setPreview] = useState(null);

  const token = localStorage.getItem("admin-token");

  const fetchProducts = async () => {
    try {
      const res = await API.get(`${API_URL}/admin/products/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data);
      console.log("📦 Products fetched:", res.data);
    } catch (err) {
      console.error("❌ Ошибка при получении товаров:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "file") {
      setForm((prev) => ({ ...prev, image: files[0] }));
      if (files[0]) {
        setPreview(URL.createObjectURL(files[0]));
      } else {
        setPreview(null);
      }
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
      // Clear preview when category changes to types that don't need images
      if (name === "category" && (value === "popularity_by_id" || value === "uc_by_id")) {
        setPreview(null);
        setForm(prev => ({ ...prev, image: null }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      for (let key in form) {
        if (key !== "active" && form[key] !== null && form[key] !== undefined) {
          formData.append(key, form[key]);
        }
      }

      formData.append("status", form.active ? "active" : "inactive");

      if (editingId) {
        await API.put(`${API_URL}/admin/products/${editingId}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        await API.post(`${API_URL}/admin/products`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
      }
      resetForm();
      // Fetch products and sort them to show newest first
      const res = await API.get(`${API_URL}/admin/products/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data.sort((a, b) => b.id - a.id));
    } catch (err) {
      console.error("❌ Ошибка при сохранении товара:", err);
      alert("Ошибка при сохранении товара");
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Вы уверены, что хотите удалить этот товар?")) return;
    try {
      await API.delete(`${API_URL}/admin/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchProducts();
    } catch (err) {
      console.error("❌ Ошибка при удалении товара:", err);
      alert("Ошибка при удалении");
    }
  };

  const startEdit = (product) => {
    setForm({
      name: product.name || "",
      price: product.price || "",
      stock: product.stock || "",
      category: product.category || "UC_ID",
      active: product.active ?? true,
      image: null,
    });
    setEditingId(product.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setForm({
      name: "",
      price: "",
      stock: "",
      category: categories[0],
      active: true,
      image: null,
      telegramId: ""
    });
    setEditingId(null);
    setPreview(null);
  };

const sendPreviewWithImage = async () => {
  if (!form.image) {
    alert("⚠️ Пожалуйста, выберите изображение для предпросмотра");
    return;
  }

  if (!form.telegramId) {
    alert("⚠️ Пожалуйста, введите Telegram ID для предпросмотра");
    return;
  }

  const formData = new FormData();
  formData.append("name", form.name);
  formData.append("price", form.price);
  formData.append("stock", form.stock);
  formData.append("category", form.category);
  formData.append("type", form.type || "manual");
  formData.append("status", form.active ? "active" : "inactive");
  formData.append("image", form.image);
  formData.append("telegramId", form.telegramId);
  formData.append("isPreview", "true");

  try {
    await API.post(`${API_URL}/admin/products`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });
    alert("✅ Предпросмотр отправлен через Telegram");
  } catch (err) {
    console.error("❌ Ошибка предпросмотра:", err);
    alert("❌ Ошибка: не удалось отправить предпросмотр");
  }
};

   return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-blue-50 via-white to-pink-50">
      <h2 className="text-4xl font-extrabold mb-8 text-center text-blue-900 drop-shadow">🛒 Управление товарами</h2>
      {/* Форма добавления / редактирования */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 mb-10 max-w-3xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-1 font-medium">Название</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Название"
              className="w-full border rounded px-3 py-2 mb-2"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Цена</label>
            <input
              name="price"
              value={form.price}
              onChange={handleChange}
              placeholder="Цена"
              className="w-full border rounded px-3 py-2 mb-2"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Сток</label>
            <input
              name="stock"
              value={form.stock}
              onChange={handleChange}
              placeholder="Сток"
              className="w-full border rounded px-3 py-2 mb-2"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Категория</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 mb-2"
              required
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabels[cat]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium">Telegram ID</label>
            <input
              name="telegramId"
              value={form.telegramId}
              onChange={handleChange}
              placeholder="Telegram ID"
              className="w-full border rounded px-3 py-2 mb-2"
            />
          </div>
          {preview && (
            <div className="mb-4">
              <img 
                src={preview} 
                alt="Preview" 
                className="max-w-full h-auto max-h-48 rounded-lg shadow-md"
              />
            </div>
          )}
          {(form.category === "cars" || form.category === "costumes") && (
            <div>
              <label className="block mb-1 font-medium">Изображение</label>
              <input
                type="file"
                name="image"
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 mb-2"
                accept="image/*"
              />
            </div>
          )}
          <div>
            <label className="block mb-1 font-medium">Активен</label>
            <input
              type="checkbox"
              name="active"
              checked={form.active}
              onChange={handleChange}
              className="mb-2"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            {editingId ? "Сохранить изменения" : "Добавить товар"}
          </button>
          <button
            type="button"
            onClick={sendPreviewWithImage}
            className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            Отправить предпросмотр
          </button>
        </div>
      </form>
      {/* Add this before the products grid */}
      <div className="mb-6">
        <label className="block mb-2 font-medium text-blue-800">Фильтр по категории:</label>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="w-full md:w-64 border rounded px-3 py-2 bg-white"
        >
          <option value="ALL">Все категории</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {categoryLabels[cat]}
            </option>
          ))}
        </select>
      </div>
      {/* Список товаров */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h3 className="text-2xl font-semibold mb-6 text-blue-800">Список товаров</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products
            .filter(product => filterCategory === "ALL" || product.category === filterCategory)
            .map((product) => (
            <div key={product.id} className={`border rounded-xl p-6 shadow bg-blue-50 flex flex-col gap-2 hover:shadow-lg transition ${product.isNew ? 'ring-2 ring-green-500 animate-pulse' : ''}`}>
              <div className="flex justify-between items-start">
                <h4 className="font-semibold text-blue-900">{product.name}</h4>
                <span className={`px-2 py-1 rounded text-xs font-medium ${product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {product.status === 'active' ? 'Активен' : 'Неактивен'}
                </span>
              </div>
              <p>Цена: <span className="font-bold">{product.price} ₽</span></p>
              <p>Сток: <span className="font-bold">{product.stock}</span></p>
              <p>Категория: <span className="font-bold">{categoryLabels[product.category]}</span></p>
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  onClick={() => startEdit(product)}
                  className="bg-yellow-500 text-white px-4 py-1 rounded-lg hover:bg-yellow-600 transition text-xs"
                >
                  Редактировать
                </button>
                <button
                  onClick={() => deleteProduct(product.id)}
                  className="bg-red-600 text-white px-4 py-1 rounded-lg hover:bg-red-700 transition text-xs"
                >
                  Удалить
                </button>
                {product.image && (
                  <a
                    href={product.image}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-green-500 text-white px-4 py-1 rounded-lg hover:bg-green-600 transition text-xs"
                  >
                    Смотреть
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}









