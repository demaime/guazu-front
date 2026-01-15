import React, { useState } from 'react';
import { Wifi, WifiOff, MapPin, ChevronDown, CheckCircle2, Clock, Calendar, Users, TrendingUp, Send, RefreshCw, Eye, X, User, Menu, Home, CheckSquare, Settings, LogOut } from 'lucide-react';

export default function GuazuRedesign() {
  const [activeTab, setActiveTab] = useState('activas');
  const [isOnline, setIsOnline] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingSync] = useState(3);
  const [showMenu, setShowMenu] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const quotasData = {
    varones: {
      total: 15,
      target: 33,
      ranges: [
        { range: '18-29', completed: 5, target: 13 },
        { range: '30-54', completed: 8, target: 16 },
        { range: '55-69', completed: 4, target: 4 },
        { range: '70+', completed: 2, target: 8 }
      ]
    },
    mujeres: {
      total: 8,
      target: 32,
      ranges: [
        { range: '18-29', completed: 5, target: 4 },
        { range: '30-54', completed: 4, target: 17 },
        { range: '55-69', completed: 2, target: 4 },
        { range: '70+', completed: 3, target: 7 }
      ]
    }
  };

  const getQuotaStatus = (completed, target) => {
    if (completed >= target) return { bgColor: 'bg-green-500/20', textColor: 'text-green-400', borderColor: 'border-green-500/30', status: 'complete' };
    return { bgColor: 'bg-slate-700/50', textColor: 'text-gray-200', borderColor: 'border-slate-600', status: 'incomplete' };
  };

  return (
    <div className="min-h-screen bg-slate-900 relative">
      {/* Side Menu */}
      {showMenu && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowMenu(false)}
          ></div>
          
          {/* Menu Panel */}
          <div className="fixed left-0 top-0 bottom-0 w-72 bg-slate-800 z-50 shadow-2xl">
            <div className="flex flex-col h-full">
              {/* Menu Header */}
              <div className="bg-indigo-600 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                    <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full"></div>
                  </div>
                  <div>
                    <h2 className="font-bold text-white">Juan Pérez</h2>
                    <p className="text-xs text-indigo-200">Encuestador</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowMenu(false)}
                  className="p-2 hover:bg-indigo-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 py-4">
                <button className="w-full px-4 py-3 flex items-center gap-3 bg-indigo-600/20 text-white border-l-4 border-indigo-600">
                  <Home className="w-5 h-5" />
                  <span className="font-semibold">Mis Encuestas</span>
                </button>
                <button className="w-full px-4 py-3 flex items-center gap-3 text-gray-300 hover:bg-slate-700 border-l-4 border-transparent">
                  <CheckSquare className="w-5 h-5" />
                  <span>Finalizadas</span>
                </button>
                <button className="w-full px-4 py-3 flex items-center gap-3 text-gray-300 hover:bg-slate-700 border-l-4 border-transparent">
                  <User className="w-5 h-5" />
                  <span>Mi Perfil</span>
                </button>
                <button className="w-full px-4 py-3 flex items-center gap-3 text-gray-300 hover:bg-slate-700 border-l-4 border-transparent">
                  <Settings className="w-5 h-5" />
                  <span>Configuración</span>
                </button>
              </div>

              {/* Menu Footer */}
              <div className="p-4 border-t border-slate-700">
                <button className="w-full px-4 py-3 flex items-center gap-3 text-red-400 hover:bg-slate-700 rounded-lg">
                  <LogOut className="w-5 h-5" />
                  <span className="font-semibold">Cerrar sesión</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <div className="bg-indigo-600 shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setShowMenu(true)}
              className="p-2 hover:bg-indigo-700 rounded-lg"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <div className="w-5 h-5 border-3 border-indigo-600 border-t-transparent rounded-full"></div>
              </div>
              <h1 className="text-xl font-bold text-white">Guazú</h1>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsOnline(!isOnline)}
                className="p-2 rounded-lg hover:bg-indigo-700 relative"
              >
                {isOnline ? (
                  <Wifi className="w-5 h-5 text-green-300" />
                ) : (
                  <>
                    <WifiOff className="w-5 h-5 text-gray-300" />
                    {pendingSync > 0 && (
                      <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {pendingSync}
                      </span>
                    )}
                  </>
                )}
              </button>
              <button className="p-2 rounded-lg hover:bg-indigo-700">
                <MapPin className="w-5 h-5 text-white" />
              </button>
              <button 
                onClick={handleRefresh}
                className="p-2 rounded-lg hover:bg-indigo-700"
              >
                <RefreshCw className={`w-5 h-5 text-white transition-transform ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Title Section */}
      <div className="bg-slate-800 px-4 py-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Hola, Juan! 👋</h2>
          <p className="text-sm text-gray-400">Tenés 2 encuestas activas</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-24 space-y-4">
        {/* Survey Card 1 - With Quotas */}
        <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
          <div className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Encuesta de Prueba</h3>
                <p className="text-xs text-gray-400">Sin descripción</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Tiempo restante</div>
                    <div className="text-sm font-semibold text-white">80 días</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Casos completados</div>
                    <div className="text-sm font-semibold text-white">23/65</div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: '35%' }}></div>
                </div>
                <span className="absolute right-0 -top-5 text-xs font-semibold text-gray-400">35%</span>
              </div>

              {/* Quotas Section */}
              <div className="bg-slate-700/50 rounded-xl p-3">
                <div className="mb-3">
                  <span className="text-xs font-semibold text-gray-300">Cuotas</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {/* Varones */}
                  {quotasData.varones.ranges.map((item, idx) => {
                    const status = getQuotaStatus(item.completed, item.target);
                    return (
                      <div key={idx} className={`${status.bgColor} rounded-lg p-2 text-center border ${status.borderColor}`}>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <span className="text-sm text-gray-300">♂</span>
                          <span className="text-[10px] text-gray-400">{item.range}</span>
                        </div>
                        <div className={`text-sm font-bold ${status.textColor}`}>
                          {item.completed}/{item.target}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Mujeres */}
                  {quotasData.mujeres.ranges.map((item, idx) => {
                    const status = getQuotaStatus(item.completed, item.target);
                    return (
                      <div key={idx} className={`${status.bgColor} rounded-lg p-2 text-center border ${status.borderColor}`}>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <span className="text-sm text-gray-300">♀</span>
                          <span className="text-[10px] text-gray-400">{item.range}</span>
                        </div>
                        <div className={`text-sm font-bold ${status.textColor}`}>
                          {item.completed}/{item.target}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 pb-4">
            <div className="grid grid-cols-3 gap-2">
              <button className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-gray-300 font-semibold py-3.5 rounded-xl transition-colors flex flex-col items-center justify-center gap-1">
                <Eye className="w-4 h-4" />
                <span className="text-xs">Probar</span>
              </button>
              <button className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-gray-300 font-semibold py-3.5 rounded-xl transition-colors flex flex-col items-center justify-center gap-1">
                <Send className="w-4 h-4" />
                <span className="text-xs">Enviados</span>
              </button>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-lg flex flex-col items-center justify-center gap-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Responder</span>
              </button>
            </div>
          </div>
        </div>

        {/* Survey Card 2 - Without Quotas */}
        <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
          <div className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1">Encuesta Municipal 2025</h3>
                <p className="text-xs text-gray-400">Estudio de opinión ciudadana</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Tiempo restante</div>
                    <div className="text-sm font-semibold text-white">45 días</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Casos completados</div>
                    <div className="text-sm font-semibold text-white">8/50</div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: '16%' }}></div>
                </div>
                <span className="absolute right-0 -top-5 text-xs font-semibold text-gray-400">16%</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 pb-4">
            <div className="grid grid-cols-3 gap-2">
              <button className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-gray-300 font-semibold py-3.5 rounded-xl transition-colors flex flex-col items-center justify-center gap-1">
                <Eye className="w-4 h-4" />
                <span className="text-xs">Probar</span>
              </button>
              <button className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-gray-300 font-semibold py-3.5 rounded-xl transition-colors flex flex-col items-center justify-center gap-1">
                <Send className="w-4 h-4" />
                <span className="text-xs">Enviados</span>
              </button>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-lg flex flex-col items-center justify-center gap-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs">Responder</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Status Notification */}
      <div className={`fixed bottom-6 left-4 right-4 border text-white rounded-xl p-3 shadow-xl ${
        isOnline ? 'bg-green-700 border-green-600' : 'bg-yellow-600 border-yellow-500'
      }`}>
        <div className="flex items-start gap-3">
          <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isOnline ? 'text-green-200' : 'text-yellow-200'}`} />
          <div className="flex-1 text-sm">
            <div className="font-semibold mb-0.5">Modo {isOnline ? 'Online' : 'Offline'} activo</div>
            <div className={`text-xs ${isOnline ? 'text-green-100' : 'text-yellow-100'}`}>
              {isOnline 
                ? 'Sincronizando respuestas en tiempo real'
                : `${pendingSync} casos pendientes de sincronizar`}
            </div>
          </div>
          <button className={`text-xs font-semibold ${isOnline ? 'text-green-200 hover:text-green-100' : 'text-yellow-200 hover:text-yellow-100'}`}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}