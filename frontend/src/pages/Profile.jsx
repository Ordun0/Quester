// frontend/src/pages/Profile.jsx

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/auth.service';
import logo from '../assets/logo.png';
import { profileSchema, changePasswordSchema } from '../utils/validators';

function Profile() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'password', 'delete'

  // Formulario de Perfil (nombre)
  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfile,
    trigger: triggerProfile
  } = useForm({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur'
  });

  // Formulario de Contraseña
  const {
    register: passwordRegister,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
    trigger: triggerPassword,
    watch
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onBlur'
  });

  const newPassword = watch('newPassword');

  // ✅ RF-04.01 - Cargar información del perfil al montar
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      // ✅ RF-05.02 - Usar sessionStorage en lugar de localStorage
      const token = authService.getToken();
      if (!token) {
        navigate('/auth');
        return;
      }

      const response = await authService.getProfile(token);
      setUser(response.data);
      
      // Resetear formulario con datos del usuario
      resetProfile({
        nombreCompleto: response.data.nombreCompleto
      });
    } catch (err) {
      console.error('Error loading profile:', err);
      if (err.error === 'TOKEN_EXPIRED' || err.error === 'INVALID_TOKEN') {
        // ✅ RF-05.02 - Limpieza de tokens
        authService.logout();
        navigate('/auth');
      }
    }
  };

  // ✅ RF-04.02 - Actualizar nombre completo
  const onProfileSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // ✅ RF-05.02 - Usar sessionStorage
      const token = authService.getToken();
      const response = await authService.updateProfile(token, data);
      
      // ✅ RF-04.05.01 - Mostrar mensaje de confirmación
      setSuccess('Profile updated');
      setUser(response.data);
      resetProfile({ nombreCompleto: response.data.nombreCompleto });
      
      // ✅ RF-05.02 - Actualizar user en sessionStorage
      const storedUser = JSON.parse(sessionStorage.getItem('user'));
      if (storedUser) {
        storedUser.nombreCompleto = response.data.nombreCompleto;
        sessionStorage.setItem('user', JSON.stringify(storedUser));
      }
    } catch (err) {
      setError(err.message || 'Error updating profile');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ RF-04.03 - Cambiar contraseña
  const onPasswordSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // ✅ RF-05.02 - Usar sessionStorage
      const token = authService.getToken();
      await authService.changePassword(token, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword
      });
      
      // ✅ RF-04.05.01 - Mostrar mensaje de confirmación
      setSuccess('Profile updated');
      resetPassword();
    } catch (err) {
      setError(err.message || 'Error changing password');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ RF-05.01 - Cerrar sesión
  const handleLogout = () => {
    // ✅ RF-05.02.01 - Eliminar de localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // ✅ RF-05.02.02 - Eliminar de sessionStorage
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    
    // ✅ RF-05.02.03 - Eliminar datos sensibles temporales
    sessionStorage.clear();
    
    // ✅ RF-05.01.02 - Redirigir a login
    navigate('/auth');
  };

  // ✅ RF-04.01.03-04 - Generar iniciales con color
  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    const first = parts[0]?.[0] || '';
    const last = parts[parts.length - 1]?.[0] || '';
    return (first + last).toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      '#2E2D88', // Quester Purple
      '#1F75FE', // Quester Blue
      '#10B981', // Green
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#8B5CF6', // Violet
      '#EC4899', // Pink
      '#06B6D4'  // Cyan
    ];
    
    if (!name) return colors[0];
    
    // Generar índice basado en el nombre para consistencia
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  // Loading state
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-quester-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      
      {/* Header - Consistente con Dashboard */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src={logo} alt="Quester Logo" className="w-12 h-12 object-contain" />
              <h1 className="text-2xl font-bold text-quester-purple tracking-wide">QUESTER</h1>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              {/* Avatar con iniciales */}
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                style={{ backgroundColor: getAvatarColor(user.nombreCompleto) }}
                title={user.nombreCompleto}
              >
                {getInitials(user.nombreCompleto)}
              </div>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-quester-blue font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-quester-dark">Profile Settings</h2>
          <p className="text-gray-600 mt-2">Manage your account information</p>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-4 text-sm font-medium transition-all ${
                activeTab === 'profile'
                  ? 'text-quester-blue border-b-2 border-quester-blue'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Profile Information
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`pb-4 text-sm font-medium transition-all ${
                activeTab === 'password'
                  ? 'text-quester-blue border-b-2 border-quester-blue'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Change Password
            </button>
            <button
              onClick={() => setActiveTab('delete')}
              className={`pb-4 text-sm font-medium transition-all ${
                activeTab === 'delete'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-500 hover:text-red-600'
              }`}
            >
              Delete Account
            </button>
          </nav>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">

            {/* ===========================================
                TAB 1: PROFILE INFORMATION (RF-04.01, RF-04.02)
                =========================================== */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
                
                {/* Nombre Completo - Editable */}
                <div>
                  <label htmlFor="nombreCompleto" className="block text-sm font-medium text-quester-dark mb-2">
                    Full Name
                  </label>
                  <input
                    id="nombreCompleto"
                    type="text"
                    {...profileRegister('nombreCompleto')}
                    onBlur={() => triggerProfile('nombreCompleto')}
                    className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue focus:border-transparent ${
                      profileErrors.nombreCompleto 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: profileErrors.nombreCompleto ? '#FEF2F2' : 'rgba(211, 225, 255, 0.15)' }}
                    placeholder="Your full name"
                  />
                  {profileErrors.nombreCompleto && (
                    <p className="mt-1 text-xs text-red-600">{profileErrors.nombreCompleto.message}</p>
                  )}
                </div>

                {/* Email - Read Only (RF-04.04) */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-quester-dark mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={user.email}
                    readOnly
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">Email cannot be changed after registration</p>
                </div>

                {/* Visual Identifier Preview (RF-04.01.03-04) */}
                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-quester-dark mb-3">
                    Visual Identifier
                  </label>
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                      style={{ backgroundColor: getAvatarColor(user.nombreCompleto) }}
                    >
                      {getInitials(user.nombreCompleto)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Your initials in a circle with auto-assigned color</p>
                      <p className="text-xs text-gray-500">Updates automatically when you change your name</p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-lg text-white font-medium text-base transition-all ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-quester-blue hover:bg-blue-600 shadow-md hover:shadow-lg'
                  }`}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            )}

            {/* ===========================================
                TAB 2: CHANGE PASSWORD (RF-04.03)
                =========================================== */}
            {activeTab === 'password' && (
              <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-6">
                
                {/* Current Password */}
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-quester-dark mb-2">
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    {...passwordRegister('currentPassword')}
                    onBlur={() => triggerPassword('currentPassword')}
                    className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue focus:border-transparent ${
                      passwordErrors.currentPassword 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: passwordErrors.currentPassword ? '#FEF2F2' : 'rgba(211, 225, 255, 0.15)' }}
                    placeholder="Your current password"
                  />
                  {passwordErrors.currentPassword && (
                    <p className="mt-1 text-xs text-red-600">{passwordErrors.currentPassword.message}</p>
                  )}
                </div>

                {/* New Password (RF-04.03.01-02) */}
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-quester-dark mb-2">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    {...passwordRegister('newPassword')}
                    onBlur={() => triggerPassword('newPassword')}
                    className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue focus:border-transparent ${
                      passwordErrors.newPassword 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: passwordErrors.newPassword ? '#FEF2F2' : 'rgba(211, 225, 255, 0.15)' }}
                    placeholder="Your new password"
                  />
                  {passwordErrors.newPassword && (
                    <p className="mt-1 text-xs text-red-600">{passwordErrors.newPassword.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Mínimo 8 caracteres, 1 número y 1 caracter especial
                  </p>
                </div>

                {/* Confirm New Password (RF-04.03.01-03) */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-quester-dark mb-2">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    {...passwordRegister('confirmPassword')}
                    onBlur={() => triggerPassword('confirmPassword')}
                    className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-quester-blue focus:border-transparent ${
                      passwordErrors.confirmPassword 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: passwordErrors.confirmPassword ? '#FEF2F2' : 'rgba(211, 225, 255, 0.15)' }}
                    placeholder="Confirm your new password"
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-600">{passwordErrors.confirmPassword.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 px-4 rounded-lg text-white font-medium text-base transition-all ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-quester-blue hover:bg-blue-600 shadow-md hover:shadow-lg'
                  }`}
                >
                  {isLoading ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            )}

            {/* ===========================================
                TAB 3: DELETE ACCOUNT (RF-04.05)
                =========================================== */}
            {activeTab === 'delete' && (
              <div className="space-y-6">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">⚠️ Warning: This action cannot be undone</h3>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• All your saved trips will be permanently deleted</li>
                    <li>• All your personal data will be removed</li>
                    <li>• All active sessions will be invalidated</li>
                    <li>• You will be redirected to the home page</li>
                  </ul>
                </div>

                <div className="pt-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" id="confirmDelete" className="w-4 h-4 text-red-600 rounded" />
                    <span className="text-sm text-gray-700">I understand and want to delete my account</span>
                  </label>
                </div>
				<button
				  onClick={async () => {
					if (document.getElementById('confirmDelete').checked) {
					  setIsLoading(true);
					  setError('');
					  
					  try {
						const token = sessionStorage.getItem('token');
						await authService.deleteAccount(token);
						
						// ✅ RF-05.02 - Limpiar todos los tokens
						authService.logout();
						
						// ✅ RF-04.05.05 - Redirigir a inicio
						navigate('/auth');
						
					  } catch (err) {
						setError(err.message || 'Error deleting account');
						setIsLoading(false);
					  }
					}
				  }}
				  disabled={!document.getElementById('confirmDelete')?.checked || isLoading}
				  className={`w-full py-3 px-4 rounded-lg text-white font-medium text-base transition-all ${
					!document.getElementById('confirmDelete')?.checked || isLoading
					  ? 'bg-gray-300 cursor-not-allowed'
					  : 'bg-red-600 hover:bg-red-700 shadow-md hover:shadow-lg'
				  }`}
				>
				  {isLoading ? 'Deleting...' : 'Delete My Account'}
				</button>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-center text-gray-500">
              © 2026 Quester. All rights reserved.
            </p>
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-6 text-center">
          <Link to="/dashboard" className="text-sm text-quester-blue hover:text-blue-700 font-medium">
            ← Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

export default Profile;