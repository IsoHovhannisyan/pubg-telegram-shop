import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import WebViewOverlay from '../components/WebViewOverlay';
import API from '../api';
import axios from 'axios';
import { Button } from '@mui/material';

const Payment = () => {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [showPaymentOverlay, setShowPaymentOverlay] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await API.get(`/admin/orders/public/public/${orderId}/status`);
        setOrder(response.data);
      } catch (err) {
        setError('Failed to load order details');
        console.error('Error fetching order:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const amount = searchParams.get('amount') || (order && order.amount);

  const handlePay = async () => {
    setProcessing(true);
    setError(null);
    try {
      let endpoint;
      if (selectedMethod === 'sbp') {
        endpoint = `${process.env.REACT_APP_API_URL}/freekassa/sbp-link`;
        const email = order && order.email ? order.email : 'test@yourshop.com';
        const response = await axios.post(endpoint, { orderId, amount, email });
        if (response.data && response.data.paymentUrl) {
          setPaymentDetails(response.data);
          setShowPaymentOverlay(true);
        } else {
          setError('Failed to get SBP payment details');
        }
      } else {
        endpoint = `${process.env.REACT_APP_API_URL}/freekassa/link`;
        const response = await axios.post(endpoint, { orderId, amount });
        if (response.data && response.data.link) {
          window.open(response.data.link, '_blank', 'noopener,noreferrer');
        } else {
          setError('Failed to get payment link');
        }
      }
    } catch (err) {
      setError('Failed to process payment');
      console.error('Payment error:', err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">{error || 'Order not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 font-sans">
      <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8 text-center rounded-t-3xl border-b-4 border-indigo-200">
          <h1 className="text-3xl font-extrabold text-white mb-1 tracking-tight drop-shadow">Оплата заказа</h1>
          <p className="text-indigo-100 text-lg">Заказ #{orderId}</p>
        </div>
        <div className="p-8 sm:p-10">
          <div className="mb-8 text-center">
            <p className="text-gray-400 mb-1 text-base">Сумма к оплате</p>
            <p className="text-4xl font-extrabold text-gray-800 tracking-wide">{amount} ₽</p>
          </div>
          <div className="space-y-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Выберите способ оплаты</h2>
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
              <div
                className={`flex-1 bg-gray-50 rounded-xl p-5 hover:bg-blue-50 cursor-pointer transition-all border-2 ${selectedMethod === 'card' ? 'border-blue-400 shadow-md' : 'border-transparent'}`}
                onClick={() => setSelectedMethod('card')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">Банковские карты</h3>
                    <p className="text-sm text-gray-500">Visa, Mastercard, МИР</p>
                  </div>
                </div>
              </div>
              <div
                className={`flex-1 bg-gray-50 rounded-xl p-5 hover:bg-green-50 cursor-pointer transition-all border-2 ${selectedMethod === 'sbp' ? 'border-green-400 shadow-md' : 'border-transparent'}`}
                onClick={() => setSelectedMethod('sbp')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">СБП</h3>
                    <p className="text-sm text-gray-500">Быстрый перевод по номеру телефона</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {selectedMethod === 'sbp' && amount < 1000 && (
            <div className="text-center text-red-500 font-medium mb-4">
              ⚠️ Оплата через СБП доступна только для сумм от 1000₽ и выше.
            </div>
          )}
          <Button
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            style={{ marginBottom: 16, fontWeight: 600, fontSize: '1.15rem', letterSpacing: '0.02em', borderRadius: '0.75rem', boxShadow: '0 2px 8px 0 rgba(60,60,120,0.08)' }}
            onClick={handlePay}
            disabled={processing || (selectedMethod === 'sbp' && amount < 1000)}
          >
            {selectedMethod === 'sbp' ? 'Оплатить через СБП' : 'Оплатить картой'}
          </Button>
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
        </div>
      </div>
      {showPaymentOverlay && paymentDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full relative border border-gray-200 animate-fade-in flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setShowPaymentOverlay(false)}
              aria-label="Закрыть"
            >
              &times;
            </button>
            <div className="overflow-y-auto px-2 sm:px-0 pt-2 pb-4 flex-1">
              <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">Оплата через СБП</h2>
              <div className="mb-4">
                <div className="mb-4 text-center">
                  <p className="text-gray-500 mb-2">Сумма к оплате:</p>
                  <p className="text-2xl font-bold text-gray-800">{amount} ₽</p>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">Для оплаты:</p>
                  <ol className="list-decimal list-inside text-gray-700 space-y-2">
                    <li>Откройте приложение вашего банка</li>
                    <li>Выберите оплату по QR-коду или СБП</li>
                    <li>Отсканируйте QR-код или введите данные получателя</li>
                    <li>Проверьте сумму и подтвердите оплату</li>
                  </ol>
                </div>
                {paymentDetails.paymentUrl && (
                  <div className="mb-4 text-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(paymentDetails.paymentUrl)}`}
                      alt="QR Code"
                      className="mx-auto w-56 h-56 rounded-xl border border-gray-200 shadow"
                    />
                    <div className="text-xs text-gray-500 mt-2">
                      Отсканируйте QR-код в вашем банковском приложении
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 p-2 pt-0 bg-white border-t border-gray-100 sticky bottom-0 z-10">
              <button
                className="w-full bg-green-600 text-white py-3 px-4 rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-lg font-semibold transition-all"
                onClick={() => {
                  setShowPaymentOverlay(false);
                  const pollInterval = setInterval(async () => {
                    try {
                      const response = await API.get(`/admin/orders/public/public/${orderId}/status`);
                      if (response.data.status === 'paid') {
                        clearInterval(pollInterval);
                        window.location.href = '/success';
                      }
                    } catch (err) {
                      console.error('Error polling payment status:', err);
                    }
                  }, 5000);
                  setTimeout(() => clearInterval(pollInterval), 300000);
                }}
              >
                Я оплатил(а)
              </button>
              <button
                className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-300 mt-2 text-lg font-semibold transition-all"
                onClick={() => setShowPaymentOverlay(false)}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payment; 