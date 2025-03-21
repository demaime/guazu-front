'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { userService } from '@/services/user.service';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader } from '@/components/ui/Loader';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';

export default function ConfiguracionPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const token = authService.getToken();
    if (!token) {
      router.replace('/login');
    }
  }, []);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdatePassword = async () => {
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('Las contraseñas nuevas no coinciden');
      }

      const token = authService.getToken();
      const user = authService.getUser();
      
      await userService.updatePassword(
        user._id,
        passwordData.currentPassword,
        passwordData.newPassword,
        token
      );

      setSuccessMessage('Contraseña actualizada correctamente');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordSection(false);
    } catch (err) {
      setError(err.message || 'Error al actualizar la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'borrar mi perfil') {
      return;
    }

    setIsLoading(true);
    try {
      const token = authService.getToken();
      const user = authService.getUser();
      
      await userService.deleteAccount(user._id, token);
      authService.logout();
      router.replace('/login');
    } catch (err) {
      setError(err.message || 'Error al eliminar la cuenta');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Configuración</h1>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md"
          >
            {error}
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-md"
          >
            {successMessage}
          </motion.div>
        )}

        {/* Sección de Apariencia */}
        <div className="bg-[var(--card-background)] border border-[var(--card-border)] rounded-lg shadow-sm">
          <div className="p-6">
            <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Apariencia</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Personaliza el aspecto visual de la aplicación
            </p>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-[var(--text-primary)]">
                  Modo oscuro
                </h4>
                <p className="text-sm text-[var(--text-secondary)]">
                  {theme === 'dark' ? 'Activado' : 'Desactivado'}
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="relative inline-flex h-10 w-20 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 bg-gray-200 dark:bg-gray-700"
              >
                <span className="sr-only">Cambiar tema</span>
                <span
                  className={`pointer-events-none relative inline-block h-9 w-9 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    theme === 'dark' ? 'translate-x-10' : 'translate-x-0'
                  }`}
                >
                  {theme === 'dark' ? (
                    <Moon className="h-6 w-6 text-gray-900 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  ) : (
                    <Sun className="h-6 w-6 text-gray-900 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Sección de Zona de Peligro */}
        <div className="bg-[var(--card-background)] border border-[var(--card-border)] rounded-lg shadow-sm">
          <div className="p-6">
            <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Zona de peligro</h2>
            
            {/* Cambiar contraseña */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-medium text-[var(--text-primary)]">Cambiar contraseña</h3>
                <button
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="link-action text-sm text-primary"
                >
                  {showPasswordSection ? 'Cancelar' : 'Cambiar'}
                </button>
              </div>

              <AnimatePresence>
                {showPasswordSection && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <div className="space-y-4">
                      <input
                        type="password"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="Contraseña actual"
                        className="w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900"
                      />
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Nueva contraseña"
                        className="w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900"
                      />
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="Confirmar nueva contraseña"
                        className="w-full px-3 py-2 bg-white/60 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 focus:border-transparent text-gray-900"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={handleUpdatePassword}
                          disabled={isLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? <Loader size="sm" /> : 'Confirmar'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Eliminar cuenta */}
            <div className="pt-6 border-t border-[var(--card-border)]">
              <h3 className="text-base font-medium text-[var(--text-primary)] mb-2">Eliminar cuenta</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, estate seguro.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="btn-danger"
              >
                Eliminar cuenta
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modal de confirmación para eliminar cuenta */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[var(--card-background)] rounded-lg p-6 max-w-md w-full mx-4 border border-[var(--card-border)]"
            >
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">
                ¿Estás seguro de que quieres eliminar tu cuenta?
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                Esta acción no se puede deshacer. Esto eliminará permanentemente tu cuenta y todos tus datos.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Por favor escribe "borrar mi perfil" para confirmar:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--input-background)] border border-[var(--input-border)] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-[var(--text-primary)]"
                  placeholder="borrar mi perfil"
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--button-secondary)] rounded-md hover:bg-opacity-80 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'borrar mi perfil' || isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-[var(--secondary)] rounded-md hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader size="sm" /> : 'Eliminar definitivamente'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 