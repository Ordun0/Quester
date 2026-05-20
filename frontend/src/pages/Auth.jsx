// frontend/src/pages/Auth.jsx

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, loginSchema } from '../utils/validators';
import authService from '../services/auth.service';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

function Auth() {
  const navigate = useNavigate();
  
  // Estados existentes
  const [activeTab, setActiveTab] = useState('register');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // ✅ NUEVOS ESTADOS PARA TAREA 30 (Contador de intentos y bloqueo)
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(null);
  const [countdown, setCountdown] = useState(0);

  // Formulario de Registro
  const {
    register: registerForm,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
    watch,
    reset: resetRegister,
    trigger: triggerRegister
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
    trigger: triggerLogin
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur'
  });

  const password = watch('password');

  // ✅ NUEVO: Verificar bloqueo al montar el componente (persistencia con sessionStorage)
  useEffect(() => {
    const checkLockoutStatus = () => {
      try {
        const lockoutData = sessionStorage.getItem('loginLockout');
        
        if (lockoutData) {
          const { lockedUntil, countdown: storedCountdown } = JSON.parse(lockoutData);
          const now = Date.now();
          
          if (lockedUntil && new Date(lockedUntil).getTime() > now) {
            // Aún está bloqueado - restaurar estado
            const remainingSeconds = Math.ceil((new Date(lockedUntil).getTime() - now) / 1000);
            setIsLocked(true);
            setLockoutTime(lockedUntil);
            setCountdown(Math.max(0, remainingSeconds));
            console.log('🔒 Lockout restored from sessionStorage:', remainingSeconds, 'seconds remaining');
          } else {
            // El bloqueo expiró, limpiar
            sessionStorage.removeItem('loginLockout');
            console.log('🔓 Lockout expired, cleared from sessionStorage');
          }
        }
      } catch (e) {
        console.warn('⚠️ Failed to parse lockout data from sessionStorage:', e);
        sessionStorage.removeItem('loginLockout');
      }
    };
    
    checkLockoutStatus();
  }, []);

  // ✅ EFECTO PARA COUNTDOWN DE BLOQUEO (Tarea 30) - ACTUALIZADO CON PERSISTENCIA
  useEffect(() => {
    let timer;
    
    if (isLocked && countdown > 0) {
      // Guardar estado en sessionStorage para persistencia al recargar
      if (lockoutTime) {
        try {
          sessionStorage.setItem('loginLockout', JSON.stringify({
            lockedUntil: lockoutTime,
            countdown: countdown
          }));
        } catch (e) {
          console.warn('⚠️ Failed to save lockout to sessionStorage:', e);
        }
      }
      
      timer = setInterval(() => {
        setCountdown(prev => {
          const newCount = prev - 1;
          // Limpiar sessionStorage cuando expira
          if (newCount <= 0) {
            sessionStorage.removeItem('loginLockout');
          }
          return newCount;
        });
      }, 1000);
    } else if (countdown === 0 && isLocked) {
      // El bloqueo expiró - liberar cuenta
      setIsLocked(false);
      setLockoutTime(null);
      setAttemptsRemaining(3); // Resetear a 3 intentos
      sessionStorage.removeItem('loginLockout');
      console.log('🔓 Account unlocked, countdown reached 0');
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLocked, countdown, lockoutTime]);

  // ✅ FUNCIÓN PARA FORMATEAR TIEMPO (MM:SS)
  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

  // ✅ ACTUALIZADO: Manejo completo de errores de login con contador de intentos
  const onLoginSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authService.login(data);
    
      // ✅ RF-05.02 - Guardar en sessionStorage en lugar de localStorage
      authService.saveToken(response.data.token, response.data);
    
      setSuccess('Login successful');
      resetLogin();
    
      // ✅ Resetear contador de intentos y limpiar bloqueo
      setAttemptsRemaining(null);
      setIsLocked(false);
      setCountdown(0);
      setLockoutTime(null);
      sessionStorage.removeItem('loginLockout'); // ← Limpiar persistencia
    
      // RF-02.04 - Redirigir al Dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    
    } catch (err) {
      console.error('❌ Login error:', err);
      
      // ✅ MANEJO DE ERRORES DE LOGIN CON CONTADOR DE INTENTOS (Tarea 30)
      
      // Caso 1: Cuenta bloqueada por muchos intentos fallidos
      if (err.error === 'ACCOUNT_LOCKED') {
        console.log('🔒 Account locked by backend');
        setIsLocked(true);
        
        // Calcular countdown desde lockedUntil (si el backend lo envía)
        if (err.lockedUntil) {
          const lockoutEnd = new Date(err.lockedUntil).getTime();
          const now = Date.now();
          const remainingSeconds = Math.ceil((lockoutEnd - now) / 1000);
          
          setLockoutTime(err.lockedUntil);
          setCountdown(Math.max(0, remainingSeconds));
          
          setError(`Account locked. Try again in ${formatCountdown(Math.max(0, remainingSeconds))}`);
          console.log('⏱️ Lockout countdown set to:', remainingSeconds, 'seconds');
        } else {
          // Fallback si el backend no envía lockedUntil
          const defaultLockoutMinutes = 5;
          setCountdown(defaultLockoutMinutes * 60);
          setError(`Account locked. Try again in ${defaultLockoutMinutes} minutes`);
          console.log('⏱️ Using default lockout:', defaultLockoutMinutes, 'minutes');
        }
        
      } 
      // Caso 2: Contraseña incorrecta con información de intentos restantes
      else if (err.error === 'WRONG_PASSWORD' && err.attemptsRemaining !== undefined) {
        const attemptsLeft = err.attemptsRemaining;
        console.log('🔐 Wrong password, attempts remaining:', attemptsLeft);
        
        if (attemptsLeft > 0) {
          setAttemptsRemaining(attemptsLeft);
          setError(`${attemptsLeft} ${attemptsLeft === 1 ? 'attempt' : 'attempts'} remaining before account is locked`);
        } else {
          // Se acabaron los intentos, bloquear inmediatamente
          console.log('🔒 No attempts remaining, locking account');
          setIsLocked(true);
          setCountdown(5 * 60); // 5 minutos por defecto (coincide con backend)
          setError('Account locked. Try again in 5 minutes');
        }
        
      } 
      // Caso 3: Errores de auth genéricos (no revelar información sensible)
      else if (err.error === 'EMAIL_NOT_FOUND' || err.error === 'WRONG_PASSWORD') {
        console.log('🔐 Auth error:', err.error);
        // Para seguridad, no mostrar si el email existe o no
        setError('Invalid email or password');
        
      } 
      // Caso 4: Error genérico o de red
      else {
        console.error('❌ Unknown login error:', err);
        setError(err.message || 'Error al iniciar sesión. Please try again.');
      }
      
    } finally {
      setIsLoading(false);
    } 
  };

  // Cambiar de tab y limpiar errores
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
    // ✅ No resetear intentos al cambiar de tab
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
              
              {/* ✅ MENSAJE DE BLOQUEO (Tarea 30) */}
              {isLocked && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="font-medium">Account Locked</span>
                  </div>
                  <p className="mt-1 text-xs">
                    Too many failed attempts. Try again in{' '}
                    <span className="font-mono font-bold">{formatCountdown(countdown)}</span>
                  </p>
                </div>
              )}

              {/* ✅ MENSAJE DE INTENTOS RESTANTES (Tarea 30) */}
              {!isLocked && attemptsRemaining !== null && attemptsRemaining > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-medium">Warning</span>
                  </div>
                  <p className="mt-1 text-xs">
                    {attemptsRemaining} {attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining before account is locked
                  </p>
                </div>
              )}

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
                  disabled={isLocked}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue focus:border-transparent ${
                    loginErrors.email 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-200'
                  } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ backgroundColor: isLocked ? '#f3f4f6' : 'rgba(211, 225, 255, 0.15)' }}
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
                  disabled={isLocked}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue focus:border-transparent ${
                    loginErrors.password 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-200'
                  } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ backgroundColor: isLocked ? '#f3f4f6' : 'rgba(211, 225, 255, 0.15)' }}
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
                  disabled={isLocked}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Botón de Submit */}
              <button
                type="submit"
                disabled={isLoading || isLocked}
                className={`w-full py-3 px-4 rounded-lg text-white font-medium text-base transition-all ${
                  isLoading || isLocked
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-quester-blue hover:bg-blue-600 shadow-md hover:shadow-lg'
                }`}
              >
                {isLocked ? 'Account Locked' : isLoading ? 'Signing In...' : 'Sign In'}
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