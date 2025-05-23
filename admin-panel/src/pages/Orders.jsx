import React from 'react';
import OrdersTable from '../components/OrdersTable';

export default function Orders() {
  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 via-white to-pink-50">
      <h2 className="text-4xl font-extrabold mb-8 text-center text-blue-900 drop-shadow">📦 Управление заказами</h2>
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-5xl mx-auto">
        <OrdersTable />
      </div>
    </div>
  );
}









