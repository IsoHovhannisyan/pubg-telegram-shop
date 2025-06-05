import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import API from '../api';
import { FaCreditCard, FaQrcode, FaLock } from 'react-icons/fa';

const Payment = () => {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await API.get(`/orders/public/${orderId}/status`);
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

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const amount = searchParams.get('amount') || order.amount;
      const response = await API.post('/freekassa/link', { orderId, amount });
      const { link } = response.data;
      
      // Instead of redirecting, we'll handle the payment internally
      if (selectedMethod === 'card') {
        // Handle card payment
        window.location.href = link;
      } else if (selectedMethod === 'sbp') {
        // Handle SBP payment
        const sbpResponse = await API.post('/freekassa/sbp-link', { orderId, amount });
        window.location.href = sbpResponse.data.sbpLink;
      }
    } catch (err) {
      setError('Payment processing failed');
      console.error('Payment error:', err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">{error || 'Order not found'}</p>
        </div>
      </div>
    );
  }

  const amount = searchParams.get('amount') || order.amount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Payment</h1>
          <p className="text-gray-600">Order #{orderId}</p>
        </div>

        {/* Payment Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Amount Display */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-center">
            <p className="text-blue-100 mb-2">Amount to Pay</p>
            <p className="text-4xl font-bold text-white">{amount} ₽</p>
          </div>

          {/* Payment Methods */}
          <div className="p-6">
            <div className="space-y-4">
              <button
                onClick={() => setSelectedMethod('card')}
                className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                  selectedMethod === 'card'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <FaCreditCard className="text-2xl text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Credit/Debit Card</p>
                    <p className="text-sm text-gray-500">Visa, Mastercard, MIR</p>
                  </div>
                </div>
                {selectedMethod === 'card' && (
                  <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-white"></div>
                  </div>
                )}
              </button>

              <button
                onClick={() => setSelectedMethod('sbp')}
                className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                  selectedMethod === 'sbp'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <FaQrcode className="text-2xl text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">SBP (СБП)</p>
                    <p className="text-sm text-gray-500">Fast Bank Transfer</p>
                  </div>
                </div>
                {selectedMethod === 'sbp' && (
                  <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-white"></div>
                  </div>
                )}
              </button>
            </div>

            {/* Security Notice */}
            <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-500">
              <FaLock className="text-gray-400" />
              <span>Secure payment powered by Freekassa</span>
            </div>

            {/* Pay Button */}
            <button
              onClick={handlePayment}
              disabled={processing}
              className={`mt-6 w-full py-3 px-4 rounded-lg text-white font-medium transition-all ${
                processing
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {processing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                'Pay Now'
              )}
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Your payment is secured by Freekassa</p>
          <p className="mt-1">Need help? Contact our support</p>
        </div>
      </div>
    </div>
  );
};

export default Payment; 