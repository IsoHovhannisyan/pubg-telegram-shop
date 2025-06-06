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
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);
  const [confirmationTimeout, setConfirmationTimeout] = useState(false);

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
        console.log('[SBP][Frontend] Sending SBP payment request:', { endpoint, orderId, amount, email });
        const response = await axios.post(endpoint, { orderId, amount, email });
        console.log('[SBP][Frontend] Received SBP payment response:', response.data);
        if (response.data && response.data.sbpUrl) {
          setPaymentDetails({
            ...response.data,
            url: response.data.sbpUrl
          });
          setShowPaymentOverlay(true);
        } else {
          setError('Ошибка: SBP ссылка не получена');
        }
      } else {
        endpoint = `${process.env.REACT_APP_API_URL}/freekassa/link`;
        const response = await axios.post(endpoint, { orderId, amount, paymentMethod: 'card' });
        if (response.data && response.data.link) {
          setPaymentDetails({
            paymentUrl: response.data.link
          });
          setShowPaymentOverlay(true);
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
          <div className="mb-8">
            <p className="text-gray-600 mb-4 text-center">Выберите способ оплаты</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSelectedMethod('card')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedMethod === 'card'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex flex-col items-center">
                  <svg className="w-8 h-8 mb-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 4H4C2.89543 4 2 4.89543 2 6V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V6C22 4.89543 21.1046 4 20 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 10H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-sm font-medium">Банковская карта</span>
                </div>
              </button>
              <button
                onClick={() => setSelectedMethod('sbp')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedMethod === 'sbp'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex flex-col items-center">
                  <svg className="w-8 h-8 mb-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-sm font-medium">СБП</span>
                </div>
              </button>
            </div>
          </div>
          <button
            onClick={handlePay}
            disabled={processing}
            className={`w-full py-4 px-6 rounded-xl text-white font-semibold text-lg transition-all ${
              processing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
            }`}
          >
            {processing ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Обработка...
              </div>
            ) : (
              'Оплатить'
            )}
          </button>
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
              <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">
                {selectedMethod === 'sbp' ? 'Оплата через СБП' : 'Оплата картой'}
              </h2>
              <div className="mb-4">
                <div className="mb-4 text-center">
                  <p className="text-gray-500 mb-2">Сумма к оплате:</p>
                  <p className="text-2xl font-bold text-gray-800">{amount} ₽</p>
                </div>
                {selectedMethod === 'sbp' ? (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2">Для оплаты:</p>
                    <ol className="list-decimal list-inside text-gray-700 space-y-2">
                      <li>Откройте приложение вашего банка</li>
                      <li>Выберите оплату по QR-коду или СБП</li>
                      <li>Отсканируйте QR-код или введите данные получателя</li>
                      <li>Проверьте сумму и подтвердите оплату</li>
                    </ol>
                  </div>
                ) : (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2">Для оплаты картой:</p>
                    <ol className="list-decimal list-inside text-gray-700 space-y-2">
                      <li>Введите данные вашей карты</li>
                      <li>Проверьте сумму платежа</li>
                      <li>Подтвердите оплату</li>
                    </ol>
                  </div>
                )}
                {(selectedMethod === 'sbp') ? (
                  paymentDetails && paymentDetails.sbpUrl ? (
                    <div className="mb-4 text-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(paymentDetails.sbpUrl)}`}
                        alt="QR Code"
                        className="mx-auto w-56 h-56 rounded-xl border border-gray-200 shadow"
                      />
                      <div className="text-xs text-gray-500 mt-2">
                        Отсканируйте QR-код в вашем банковском приложении
                      </div>
                    </div>
                  ) : error ? (
                    <div className="text-red-500 text-center">{error}</div>
                  ) : null
                ) : (
                  paymentDetails && paymentDetails.paymentUrl && (
                    <div className="mb-4 text-center">
                      <iframe
                        src={paymentDetails.paymentUrl}
                        className="w-full h-[500px] border-0 rounded-xl"
                        title="Payment Form"
                      />
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 p-2 pt-0 bg-white border-t border-gray-100 sticky bottom-0 z-10">
              {selectedMethod === 'sbp' && (
                <button
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-lg font-semibold transition-all"
                  onClick={() => {
                    setWaitingForConfirmation(true);
                    setConfirmationTimeout(false);
                    const pollInterval = setInterval(async () => {
                      try {
                        const response = await API.get(`/admin/orders/public/public/${orderId}/status`);
                        if (response.data.status === 'paid') {
                          clearInterval(pollInterval);
                          setWaitingForConfirmation(false);
                          window.location.href = '/success';
                        }
                      } catch (err) {
                        console.error('Error polling payment status:', err);
                      }
                    }, 5000);
                    setTimeout(() => {
                      clearInterval(pollInterval);
                      setWaitingForConfirmation(false);
                      setConfirmationTimeout(true);
                    }, 120000);
                    setShowPaymentOverlay(false);
                  }}
                >
                  Я оплатил(а)
                </button>
              )}
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
      {waitingForConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-8 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <div className="text-lg font-semibold text-gray-800 mb-2 text-center">Ожидаем подтверждения оплаты...</div>
            <div className="text-gray-500 text-center text-sm mb-4">Обычно это занимает не более 1-2 минут.</div>
            <button
              className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-xl hover:bg-gray-300 font-semibold mt-2"
              onClick={() => {
                setWaitingForConfirmation(false);
                setShowPaymentOverlay(true);
              }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
      {confirmationTimeout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-8 flex flex-col items-center">
            <div className="text-3xl mb-2">❗</div>
            <div className="text-lg font-semibold text-gray-800 mb-2 text-center">Платёж пока не подтверждён</div>
            <div className="text-gray-500 text-center text-sm mb-4">Если вы уже оплатили, пожалуйста, подождите ещё немного или обратитесь в поддержку.</div>
            <button
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-xl hover:bg-blue-700 font-semibold mb-2"
              onClick={() => {
                setConfirmationTimeout(false);
                setShowPaymentOverlay(true);
              }}
            >
              Попробовать ещё раз
            </button>
            <a
              href="https://t.me/inv1s_shop"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full block text-center bg-gray-200 text-gray-700 py-2 px-4 rounded-xl hover:bg-gray-300 font-semibold"
            >
              Связаться с поддержкой
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payment; 