// frontend/src/pages/ForgotPassword.jsx

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema } from '../utils/validators';
import authService from '../services/auth.service';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/logo.png';

function ForgotPassword() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur'
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await authService.forgotPassword(data);
      setSuccess('Recovery code sent to your email. Please check your inbox.');
    } catch (err) {
      setError(err.message || 'Error al solicitar recuperación');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      
      {/* Logo y Título */}
      <div className="mb-6 text-center">
        <img src={logo} alt="Quester Logo" className="w-40 h-40 mx-auto object-contain" />
        <h1 className="text-5xl font-bold text-quester-purple mt-4 tracking-wide">QUESTER</h1>
      </div>

      {/* Card */}
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          
          {/* Mensajes */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}

          {!success ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-quester-dark">Forgot Password</h2>
                <p className="text-sm text-gray-600 mt-2">
                  Enter your email and we'll send you a recovery code
                </p>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-quester-dark mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  onBlur={() => trigger('email')}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue focus:border-transparent ${
                    errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: 'rgba(211, 225, 255, 0.15)' }}
                  placeholder="you@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Botón */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-lg text-white font-medium text-base transition-all ${
                  isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-quester-blue hover:bg-blue-600 shadow-md hover:shadow-lg'
                }`}
              >
                {isLoading ? 'Sending...' : 'Send Recovery Code'}
              </button>

              {/* Volver a Login */}
              <div className="text-center mt-4">
                <Link to="/auth" className="text-xs text-quester-blue hover:text-blue-700 font-medium">
                  ← Back to Login
                </Link>
              </div>
            </form>
          ) : (
            /* Éxito - Redirigir a Reset Password */
            <div className="text-center py-8">
              <svg className="w-16 h-16 mx-auto text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-700 mb-4">Check your email for the recovery code</p>
              <button
                onClick={() => navigate('/reset-password')}
                className="w-full py-3 px-4 bg-quester-blue hover:bg-blue-600 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                Continue to Reset Password
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-center text-gray-500">© 2026 Quester. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;