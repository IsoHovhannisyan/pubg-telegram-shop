import React, { useState, useEffect } from "react";
import API from "../api";

const API_URL = process.env.REACT_APP_API_URL;

const categories = [
  "uc_by_id",
  "popularity_by_id",
  "popularity_home_by_id",
  "cars",
  "costumes", // եթե այս կատեգորիան կա
];

const categoryLabels = {
  uc_by_id: "ЮС по ID",
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
    }else if (type === "file") {
      setForm((prev) => ({ ...prev, image: files[0] }));
      setPreview(URL.createObjectURL(files[0])); // ✅ Ահա սա ներսում
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
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

        // ✅ Ուղարկենք `status`, ոչ թե `active`
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
      fetchProducts();
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
      category: "UC_ID",
      active: true,
      image: null,
    });
    setEditingId(null);
    setPreview(null);
  };

const sendPreviewWithImage = async () => {
  if (!form.image) {
    alert("⚠️ Խնդրում ենք ընտրել նկար նախադիտման համար");
    return;
  }

  if (!form.telegramId) {
    alert("⚠️ Խնդրում ենք մուտքագրել Telegram ID նախադիտման համար");
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
  formData.append("telegramId", form.telegramId);  // ✅ վերցնում ենք input-ից
  formData.append("isPreview", "true");            // ✅ preview flag

  try {
    await API.post(`${API_URL}/admin/products`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });
    alert("✅ Preview ուղարկվել է Telegram-ով");
  } catch (err) {
    console.error("❌ Նախադիտման սխալ:", err);
    alert("❌ Սխալ՝ չհաջողվեց ուղարկել preview");
  }
};

   return (
    <div className="p-4 max-w-4xl">
      <h2 className="text-2xl font-bold mb-4">🛒 Управление товарами</h2>
      {/* Форма добавления / редактирования */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Название"
            className="input"
            required
          />
          <input
            name="price"
            value={form.price}
            onChange={handleChange}
            placeholder="Цена"
            type="number"
            className="input"
            required
          />
          <input
            name="stock"
            value={form.stock}
            onChange={handleChange}
            placeholder="Количество"
            type="number"
            className="input"
            required
          />
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="input"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabels[cat]}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="active"
              checked={form.active}
              onChange={handleChange}
            />
            Активен
          </label>

          {["cars", "costumes"].includes(form.category) && (
            <input
              type="file"
              name="image"
              accept="image/*"
              onChange={handleChange}
              className="input"
            />
          )}
          {preview && (
            <img
              src={preview}
              alt="Preview"
              className="w-32 h-32 object-cover rounded border mt-2"
            />
          )}
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {editingId ? "Обновить товар" : "Добавить товар"}
        </button>
        <button
          type="button"
          className="bg-purple-600 text-white px-4 py-2 rounded ml-2"
          onClick={sendPreviewWithImage}
        >
          📤 Просмотр в Telegram
        </button>
        <input
          name="telegramId"
          value={form.telegramId || ""}
          onChange={handleChange}
          placeholder="Telegram ID (նախադիտման համար)"
          className="input col-span-2"
        />
      </form>
        {/*filter */}
      <div className="mb-4">
        <label className="mr-2 font-medium">Фильтр по категории:</label>
        <select
          className="input"
          value={filterCategory}
          onChange={(e) => {
            console.log("✅ Selected filter:", e.target.value);
            setFilterCategory(e.target.value);
          }}
        >
          <option value="ALL">Все</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {categoryLabels[cat]}
            </option>
          ))}
        </select>
      </div>

      {/* Список товаров (с фильтрацией) */}
      <div className="space-y-2">
        {products
          .filter((p) => {
            const productCat = (p.category || "").toUpperCase().trim();
            const filterCat = filterCategory.toUpperCase().trim();
            return filterCat === "ALL" || productCat === filterCat;
            })
          .map((product) => (
            <div
              key={product.id}
              className="p-3 border rounded flex justify-between items-center"
            >
              <div>
                <div className="font-semibold">{product.name}</div>
                <div className="text-sm text-gray-600">
                  {categoryLabels[product.category] || product.category} |{" "}
                  {product.price} ₽ | {product.stock} шт
                </div>
                <div
                  className={`text-xs mt-1 ${
                    product.status === "active" ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {product.status === "active" ? "Активен" : "Неактивен"}
                </div>
                <div className="flex gap-4 mt-2">
                  <button
                    onClick={() => startEdit(product)}
                    className="text-blue-600 text-sm underline"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => deleteProduct(product.id)}
                    className="text-red-600 text-sm underline"
                  >
                    Удалить
                  </button>
                </div>
              </div>
              {product.imageUrl && (
                <img
                  src={product.imageUrl}
                  alt="cover"
                  className="w-12 h-12 object-cover rounded"
                />
              )}
            </div>
          ))}
      </div>
    </div>
  );
}









