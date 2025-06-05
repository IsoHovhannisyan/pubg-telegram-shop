import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import WebViewOverlay from '../components/WebViewOverlay';
import API from '../api';
import axios from 'axios';

const Payment = () => {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [overlayUrl, setOverlayUrl] = useState(null);
  const [sbpDetails, setSbpDetails] = useState(null);
  const [showSbpOverlay, setShowSbpOverlay] = useState(false);

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
      let endpoint, key;
      if (selectedMethod === 'sbp') {
        endpoint = `${process.env.REACT_APP_API_URL}/freekassa/sbp-link`;
        // Use a placeholder email for now; replace with real user email if available
        const email = order && order.email ? order.email : 'test@yourshop.com';
        const response = await axios.post(endpoint, { orderId, amount, email });
        if (response.data && (response.data.bankName || response.data.phone || response.data.qrCodeData)) {
          setSbpDetails(response.data);
          setShowSbpOverlay(true);
        } else {
          setError('Failed to get SBP payment details');
        }
        setProcessing(false);
        return;
      } else {
        endpoint = `${process.env.REACT_APP_API_URL}/freekassa/link`;
        key = 'link';
      }
      const response = await axios.post(endpoint, { orderId, amount });
      if (response.data && response.data[key]) {
        window.open(response.data[key], '_blank', 'noopener,noreferrer');
      } else {
        setError('Failed to get payment link');
      }
    } catch (err) {
      setError('Failed to get payment link');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* SBP Payment Overlay */}
      {showSbpOverlay && sbpDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setShowSbpOverlay(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4 text-center">Оплата через СБП</h2>
            <div className="mb-4">
              <div className="mb-2">
                <span className="font-semibold">Банк:</span> {sbpDetails.bankName || '—'}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Телефон получателя:</span> <span className="select-all">{sbpDetails.phone || '—'}</span>
              </div>
              <div className="mb-2">
                <span className="font-semibold">Сумма:</span> {sbpDetails.amount || amount} ₽
              </div>
              {sbpDetails.qrCodeData && (
                <div className="mb-2 text-center">
                  <img src={sbpDetails.qrCodeData} alt="QR Code" className="mx-auto w-40 h-40" />
                  <div className="text-xs text-gray-500 mt-1">Отсканируйте QR-код в вашем банковском приложении</div>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center gap-2 mt-4">
              <button
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                onClick={() => { setShowSbpOverlay(false); /* Polling can be added here */ }}
              >
                Я оплатил(а)
              </button>
              <button
                className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 mt-2"
                onClick={() => setShowSbpOverlay(false)}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
      {overlayUrl && (
        <WebViewOverlay url={overlayUrl}>
          {/* You can show a loading spinner or a message here if you want */}
        </WebViewOverlay>
      )}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Payment Details</h1>
            <p className="text-blue-100">Order #{orderId}</p>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Amount */}
            <div className="mb-6 text-center">
              <p className="text-gray-500 mb-2">Amount to Pay</p>
              <p className="text-3xl font-bold text-gray-800">{amount} ₽</p>
            </div>

            {/* Payment Methods */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Select Payment Method</h2>
              {/* Bank Cards */}
              <div
                className={`bg-gray-50 rounded-lg p-4 hover:bg-gray-100 cursor-pointer transition-colors ${selectedMethod === 'card' ? 'ring-2 ring-blue-400' : ''}`}
                onClick={() => setSelectedMethod('card')}
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Bank Cards</h3>
                    <p className="text-sm text-gray-500">Visa, Mastercard, MIR</p>
                  </div>
                </div>
              </div>
              {/* SBP */}
              <div
                className={`bg-gray-50 rounded-lg p-4 hover:bg-gray-100 cursor-pointer transition-colors ${selectedMethod === 'sbp' ? 'ring-2 ring-green-400' : ''}`}
                onClick={() => setSelectedMethod('sbp')}
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">SBP</h3>
                    <p className="text-sm text-gray-500">Fast Bank Transfer</p>
                  </div>
                </div>
              </div>
              {/* Other Methods (not implemented, just UI) */}
              <div className="bg-gray-50 rounded-lg p-4 cursor-not-allowed opacity-50">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Other Methods</h3>
                    <p className="text-sm text-gray-500">Electronic Wallets, etc.</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Pay Button */}
            <button
              className="mt-8 w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              onClick={handlePay}
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Pay'}
            </button>
            {/* Security Notice */}
            <div className="mt-8 text-center">
              <div className="flex items-center justify-center text-gray-500 mb-2">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Secure Payment</span>
              </div>
              <p className="text-sm text-gray-500">Your payment information is encrypted and secure</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment; 