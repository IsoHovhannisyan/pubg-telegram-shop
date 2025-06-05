import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { FaCreditCard, FaQrcode } from 'react-icons/fa';

const Payment = () => {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const amount = searchParams.get('amount');
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await axios.get(`/api/orders/${orderId}`);
        setOrder(response.data);
      } catch (err) {
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const handlePayment = async () => {
    setProcessing(true);
    try {
      // Get payment link from our backend
      const response = await axios.post('/api/payment/link', {
        orderId,
        amount
      });

      // Create an iframe to handle the payment
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      // Load the payment form in the iframe
      iframe.src = response.data.link;

      // Listen for payment completion
      window.addEventListener('message', (event) => {
        if (event.data.type === 'payment_complete') {
          // Handle successful payment
          window.location.href = `/payment/success/${orderId}`;
        }
      });
    } catch (err) {
      setError('Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="px-6 py-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Payment</h2>
            <p className="text-gray-600">Order #{orderId}</p>
          </div>

          <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-600">Amount to pay:</span>
              <span className="text-2xl font-bold text-gray-900">{amount} ₽</span>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setSelectedMethod('card')}
                className={`w-full flex items-center justify-between p-4 rounded-lg border ${
                  selectedMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center">
                  <FaCreditCard className="text-2xl text-gray-600 mr-3" />
                  <span className="text-gray-900">Credit/Debit Card</span>
                </div>
                {selectedMethod === 'card' && (
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                )}
              </button>

              <button
                onClick={() => setSelectedMethod('sbp')}
                className={`w-full flex items-center justify-between p-4 rounded-lg border ${
                  selectedMethod === 'sbp' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center">
                  <FaQrcode className="text-2xl text-gray-600 mr-3" />
                  <span className="text-gray-900">SBP</span>
                </div>
                {selectedMethod === 'sbp' && (
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                )}
              </button>
            </div>

            <button
              onClick={handlePayment}
              disabled={processing}
              className="mt-8 w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {processing ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Processing...
                </div>
              ) : (
                'Pay Now'
              )}
            </button>

            <div className="mt-6 text-center text-sm text-gray-500">
              <p>🔒 Secure payment powered by Freekassa</p>
              <p className="mt-1">Your payment information is encrypted and secure</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment; 