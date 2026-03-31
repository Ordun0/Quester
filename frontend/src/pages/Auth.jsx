// frontend/src/pages/Auth.jsx

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, loginSchema } from '../utils/validators';
import authService from '../services/auth.service';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

function Auth() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('register');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Formulario de Registro
  const {
    register: registerForm,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
    watch,
    reset: resetRegister,
    trigger: triggerRegister  // ✅ Renombrado
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur'
  });

  // Formulario de Login
  const {
    register: loginForm,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
    reset: resetLogin,
    trigger: triggerLogin  // ✅ Renombrado
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur'
  });

  const password = watch('password');

  // Manejar Registro
  const onRegisterSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const { confirmPassword, ...registerData } = data;
      const response = await authService.register(registerData);
      
      setSuccess(response.message || 'Account created, you can now log in');
      resetRegister();
      
      setTimeout(() => {
        setActiveTab('login');
        setSuccess('');
      }, 2000);
      
    } catch (err) {
      setError(err.message || 'Error al registrar usuario');
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar Login
  const onLoginSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authService.login(data);
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
      
      setSuccess('Login successful');
      resetLogin();
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
      
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  // Cambiar de tab y limpiar errores
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      
      {/* Logo y Título - FUERA del card */}
      <div className="mb-6 text-center">
        <img 
          src={logo} 
          alt="Quester Logo" 
          className="w-40 h-40 mx-auto object-contain"
        />
        <h1 className="text-5xl font-bold text-quester-purple mt-4 tracking-wide">
          QUESTER
        </h1>
      </div>

      {/* Card del Formulario */}
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => handleTabChange('login')}
            className={`flex-1 py-4 text-sm font-medium transition-all ${
              activeTab === 'login'
                ? 'text-quester-blue border-b-2 border-quester-blue bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('register')}
            className={`flex-1 py-4 text-sm font-medium transition-all ${
              activeTab === 'register'
                ? 'text-quester-blue border-b-2 border-quester-blue bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Contenido del Formulario */}
        <div className="p-8">
          
          {/* Mensajes de Error/Éxito */}
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

          {/* Formulario de Registro */}
          {activeTab === 'register' ? (
            <form onSubmit={handleRegisterSubmit(onRegisterSubmit)} className="space-y-5" noValidate>
              
              {/* Nombre Completo */}
              <div>
                <label htmlFor="nombreCompleto" className="block text-sm font-medium text-quester-dark mb-2">
                  Name
                </label>
                <input
                  id="nombreCompleto"
                  type="text"
                  {...registerForm('nombreCompleto')}
                  onBlur={() => triggerRegister('nombreCompleto')}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue focus:border-transparent ${
                    registerErrors.nombreCompleto 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: 'rgba(211, 225, 255, 0.15)' }}
                  placeholder="Your name"
                />
                {registerErrors.nombreCompleto && (
                  <p className="mt-1 text-xs text-red-600">{registerErrors.nombreCompleto.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-quester-dark mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  {...registerForm('email')}
                  onBlur={() => triggerRegister('email')}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue focus:border-transparent ${
                    registerErrors.email 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: 'rgba(211, 225, 255, 0.15)' }}
                  placeholder="you@example.com"
                />
                {registerErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{registerErrors.email.message}</p>
                )}
              </div>

              {/* Contraseña */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-quester-dark mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  {...registerForm('password')}
                  onBlur={() => triggerRegister('password')}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue focus:border-transparent ${
                    registerErrors.password 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: 'rgba(211, 225, 255, 0.15)' }}
                  placeholder="Your Password"
                />
                {registerErrors.password && (
                  <p className="mt-1 text-xs text-red-600">{registerErrors.password.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Mínimo 8 caracteres, 1 número y 1 caracter especial
                </p>
              </div>

              {/* Confirmar Contraseña */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-quester-dark mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  {...registerForm('confirmPassword')}
                  onBlur={() => triggerRegister('confirmPassword')}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue focus:border-transparent ${
                    registerErrors.confirmPassword 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: 'rgba(211, 225, 255, 0.15)' }}
                  placeholder="Your Password"
                />
                {registerErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">{registerErrors.confirmPassword.message}</p>
                )}
              </div>

              {/* Botón de Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-lg text-white font-medium text-base transition-all ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-quester-blue hover:bg-blue-600 shadow-md hover:shadow-lg'
                }`}
              >
                {isLoading ? 'Creating Account...' : 'Sign In'}
              </button>
            </form>

          ) : (
            /* Formulario de Login */
            <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="space-y-5" noValidate>
              
              {/* Email */}
              <div>
                <label htmlFor="loginEmail" className="block text-sm font-medium text-quester-dark mb-2">
                  Email
                </label>
                <input
                  id="loginEmail"
                  type="email"
                  {...loginForm('email')}
                  onBlur={() => triggerLogin('email')}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue focus:border-transparent ${
                    loginErrors.email 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: 'rgba(211, 225, 255, 0.15)' }}
                  placeholder="you@example.com"
                />
                {loginErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{loginErrors.email.message}</p>
                )}
              </div>

              {/* Contraseña */}
              <div>
                <label htmlFor="loginPassword" className="block text-sm font-medium text-quester-dark mb-2">
                  Password
                </label>
                <input
                  id="loginPassword"
                  type="password"
                  {...loginForm('password')}
                  onBlur={() => triggerLogin('password')}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue focus:border-transparent ${
                    loginErrors.password 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: 'rgba(211, 225, 255, 0.15)' }}
                  placeholder="Your Password"
                />
                {loginErrors.password && (
                  <p className="mt-1 text-xs text-red-600">{loginErrors.password.message}</p>
                )}
              </div>

              {/* Olvidé Contraseña */}
              <div className="text-right">
                <button 
                  type="button" 
                  className="text-xs text-quester-blue hover:text-blue-700 font-medium"
                  onClick={() => navigate('/forgot-password')}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Botón de Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-lg text-white font-medium text-base transition-all ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-quester-blue hover:bg-blue-600 shadow-md hover:shadow-lg'
                }`}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-center text-gray-500">
            © 2026 Quester. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Auth;