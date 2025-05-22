import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = ({ setToken }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await axios.post('http://localhost:3001/admin/login', {
        username,
        password
      });

      const token = res.data.token;

      localStorage.setItem('admin-token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setToken(token); // ✅ Վերահաստատում ենք՝ App-ը rerender անի
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('Неверное имя пользователя или пароль');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center">Вход в админ-панель</h2>

        <input
          type="text"
          placeholder="Մուտքանուն"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-3 border rounded-xl mb-4"
        />
        <input
          type="password"
          placeholder="Գաղտնաբառ"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border rounded-xl mb-4"
        />
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold"
        >
          Մուտք գործել
        </button>
      </div>
    </div>
  );
};

export default Login;


