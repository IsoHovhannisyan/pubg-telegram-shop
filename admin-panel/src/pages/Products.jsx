import React, { useState, useEffect } from "react";
import API from "../api";

const API_URL = process.env.REACT_APP_API_URL;
const ITEMS_PER_PAGE = 9; // 3x3 grid

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
  const [currentPage, setCurrentPage] = useState(1);
  const [newProductId, setNewProductId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const token = localStorage.getItem("admin-token");

  const fetchProducts = async () => {
    try {
      const res = await API.get(`${API_URL}/admin/products/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data.sort((a, b) => b.id - a.id));
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
      // Clear preview when category changes
      if (name === "category") {
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
      // Set type based on category
      formData.append("type", form.category === "uc_by_id" ? "auto" : "manual");

      let response;
      if (editingId) {
        response = await API.put(`${API_URL}/admin/products/${editingId}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        response = await API.post(`${API_URL}/admin/products`, formData, {
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

      if (!editingId) {
        const newProduct = res.data.find(p => p.id === response.data.id);
        setProducts(res.data.sort((a, b) => b.id - a.id));
        setNewProductId(newProduct ? newProduct.id : null);
        setCurrentPage(1);
        // Show success message
        setSuccessMessage(`Товар "${newProduct ? newProduct.name : ''}" успешно добавлен!`);
        setTimeout(() => {
          setNewProductId(null);
          setSuccessMessage("");
        }, 3000);
      } else {
        setProducts(res.data.sort((a, b) => b.id - a.id));
        setSuccessMessage("Изменения успешно сохранены!");
        setTimeout(() => setSuccessMessage(""), 3000);
      }
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

  // Add pagination logic
  let filteredProducts = products.filter(product => 
    filterCategory === "ALL" || product.category === filterCategory
  );

  // If newProductId is set, always show that product at the top (even if filtered out)
  let newProduct = null;
  if (newProductId) {
    newProduct = products.find(p => p.id === newProductId);
    if (newProduct) {
      filteredProducts = [newProduct, ...filteredProducts.filter(p => p.id !== newProductId)];
    }
  }

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to first page when changing category filter
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory]);

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-blue-50 via-white to-pink-50">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg text-lg font-semibold animate-fade-in-out">
          {successMessage}
        </div>
      )}
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
          {currentProducts.map((product) => (
            <div 
              key={product.id} 
              className={`border rounded-xl p-6 shadow bg-blue-50 flex flex-col gap-2 hover:shadow-lg transition
                ${product.isNew ? 'ring-4 ring-green-500 animate-pulse bg-green-50' : ''}`}
            >
              <div className="flex justify-between items-start">
                <h4 className="font-semibold text-blue-900">{product.name}</h4>
                <div className="flex items-center gap-2">
                  {product.isNew && (
                    <span className="px-2 py-1 bg-green-500 text-white rounded text-xs font-medium animate-bounce">
                      Новый
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {product.status === 'active' ? 'Активен' : 'Неактивен'}
                  </span>
                </div>
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
      </div>
    </div>
  );
}









