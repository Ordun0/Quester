// frontend/src/pages/ResetPassword.jsx

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema } from '../utils/validators';
import authService from '../services/auth.service';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/logo.png';

function ResetPassword() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur'
  });

  const password = watch('newPassword');

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await authService.resetPassword(data);
      setSuccess('Password reset successfully! Redirecting to login...');
      
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Error al resetear contraseña');
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-quester-dark">Reset Password</h2>
              <p className="text-sm text-gray-600 mt-2">
                Enter your recovery code and new password
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

            {/* Token */}
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-quester-dark mb-2">
                Recovery Code
              </label>
              <input
                id="token"
                type="text"
                {...register('token')}
                onBlur={() => trigger('token')}
                className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue focus:border-transparent ${
                  errors.token ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                style={{ backgroundColor: 'rgba(211, 225, 255, 0.15)' }}
                placeholder="Enter your recovery code"
              />
              {errors.token && (
                <p className="mt-1 text-xs text-red-600">{errors.token.message}</p>
              )}
            </div>

            {/* Nueva Contraseña */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-quester-dark mb-2">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                {...register('newPassword')}
                onBlur={() => trigger('newPassword')}
                className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue focus:border-transparent ${
                  errors.newPassword ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                style={{ backgroundColor: 'rgba(211, 225, 255, 0.15)' }}
                placeholder="Your new password"
              />
              {errors.newPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Mínimo 8 caracteres, 1 número y 1 caracter especial
              </p>
            </div>

            {/* Confirmar Contraseña */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-quester-dark mb-2">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                onBlur={() => trigger('confirmPassword')}
                className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue focus:border-transparent ${
                  errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                style={{ backgroundColor: 'rgba(211, 225, 255, 0.15)' }}
                placeholder="Confirm your new password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
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
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>

            {/* Volver a Login */}
            <div className="text-center mt-4">
              <Link to="/auth" className="text-xs text-quester-blue hover:text-blue-700 font-medium">
                ← Back to Login
              </Link>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-center text-gray-500">© 2026 Quester. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;