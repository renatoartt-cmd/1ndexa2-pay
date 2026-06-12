import React, { useState } from 'react';
import { ShoppingBag, Star, ShieldCheck, CreditCard, Wallet, Lock, CheckCircle, ChevronRight, Download } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { calculateUserCapital } from '../lib/calculations';
import * as api from '../lib/api';

export function MarketplacePage() {
  const { user } = useAuth();
  const { products, orders, deposits, withdrawals, accruals, refresh } = useData();
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'external'>('balance');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successOrder, setSuccessOrder] = useState<string | null>(null);

  if (!user) return null;

  const activeProducts = products.filter(p => p.isActive);
  const userOrders = orders.filter(o => o.userId === user.id);
  
  const currentCapital = calculateUserCapital(user.id, deposits, withdrawals, accruals);

  const handlePurchase = async (product: any) => {
    if (paymentMethod === 'balance' && currentCapital < product.price) {
      alert('Saldo insuficiente. Por favor recarga tu billetera o usa otro método de pago.');
      return;
    }

    setIsProcessing(true);
    try {
      if (paymentMethod === 'balance') {
        // Create withdrawal to deduct balance
        await api.createWithdrawal({
          userId: user.id,
          amount: product.price,
          type: 'capital',
          network: 'TRC20',
          walletAddress: 'MARKETPLACE_PURCHASE',
        });
      }

      const newOrder = await api.createOrder({
        userId: user.id,
        productId: product.id,
        amount: product.price,
        paymentMethod: paymentMethod,
        status: paymentMethod === 'balance' ? 'completed' : 'pending',
        licenseDataRevealed: paymentMethod === 'balance' ? product.licenseData : null
      });

      // If it was internal balance, we'll mark the withdrawal as approved too in a robust system.
      // But for simplicity, we let the admin approve it or we just trust the order status.

      await refresh();
      setSuccessOrder(newOrder.id);
    } catch (e) {
      console.error(e);
      alert('Error procesando la compra');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderProductDetails = (product: any) => {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl max-w-2xl w-full border border-gray-700 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          
          <div className="relative h-64 w-full bg-gray-900">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-transparent"></div>
            <button 
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black p-2 rounded-full text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2 block">{product.category}</span>
                <h2 className="text-2xl font-bold text-white mb-2">{product.name}</h2>
              </div>
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                ${product.price}
              </div>
            </div>
            
            <p className="text-gray-400 mb-6 leading-relaxed">
              {product.description}
            </p>

            <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-700 mb-6">
              <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
                <ShieldCheck className="text-green-400 w-5 h-5" />
                Método de Pago
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setPaymentMethod('balance')}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    paymentMethod === 'balance' 
                      ? 'border-cyan-500 bg-cyan-500/10 text-white' 
                      : 'border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <Wallet className={paymentMethod === 'balance' ? 'text-cyan-400' : 'text-gray-500'} />
                  <span className="font-medium">Saldo Interno</span>
                  <span className="text-xs">
                    (Disponible: ${currentCapital.toFixed(2)})
                  </span>
                </button>
                
                <button
                  onClick={() => setPaymentMethod('external')}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    paymentMethod === 'external' 
                      ? 'border-purple-500 bg-purple-500/10 text-white' 
                      : 'border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <CreditCard className={paymentMethod === 'external' ? 'text-purple-400' : 'text-gray-500'} />
                  <span className="font-medium">Binance / Tarjeta</span>
                  <span className="text-xs">(Requiere aprobación)</span>
                </button>
              </div>
            </div>

            {paymentMethod === 'external' && (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
                <p className="text-blue-200 text-sm">
                  <strong>Nota:</strong> Al pagar con método externo, tu orden quedará "Pendiente" hasta que envíes el comprobante al Administrador. Una vez aprobado, se revelará la clave de acceso.
                </p>
              </div>
            )}
            
            {paymentMethod === 'balance' && currentCapital < product.price && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
                <p className="text-red-400 text-sm">
                  <strong>Saldo insuficiente:</strong> Necesitas ${product.price} pero solo tienes ${currentCapital.toFixed(2)}.
                </p>
              </div>
            )}

            <button
              onClick={() => handlePurchase(product)}
              disabled={isProcessing || (paymentMethod === 'balance' && currentCapital < product.price)}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {isProcessing ? 'Procesando...' : (
                <>
                  <Lock className="w-5 h-5" />
                  Confirmar y Revelar Acceso
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSuccessModal = () => {
    const order = orders.find(o => o.id === successOrder);
    if (!order) return null;
    const product = products.find(p => p.id === order.productId);

    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl max-w-md w-full border border-gray-700 p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-500"></div>
          
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">¡Compra Exitosa!</h2>
          <p className="text-gray-400 mb-8">
            Has adquirido <span className="text-white font-medium">{product?.name}</span>
          </p>

          {order.status === 'completed' ? (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-8 text-left">
              <p className="text-sm text-gray-400 mb-2 font-medium">Tu clave / enlace de acceso:</p>
              <div className="bg-black/50 p-4 rounded-lg flex items-center justify-between border border-gray-800">
                <code className="text-green-400 font-mono text-sm break-all">
                  {order.licenseDataRevealed || 'Procesando licencia...'}
                </code>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Guarda este dato de forma segura. Puedes verlo en cualquier momento en tu historial de compras.
              </p>
            </div>
          ) : (
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-6 mb-8 text-left">
              <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Esperando Aprobación
              </h3>
              <p className="text-sm text-purple-200">
                Como elegiste pago externo, tu licencia está bloqueada hasta que el administrador apruebe la orden.
              </p>
            </div>
          )}

          <button
            onClick={() => setSuccessOrder(null)}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6 md:p-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3">
              <ShoppingBag className="text-cyan-400 w-8 h-8" />
              Marketplace
            </h1>
            <p className="text-gray-400 mt-2">Productos digitales y accesos premium.</p>
          </div>
          
          <div className="hidden md:flex bg-gray-900 rounded-xl p-4 border border-gray-700 items-center gap-4">
            <div className="bg-gray-800 p-3 rounded-lg">
              <Wallet className="text-cyan-400 w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Saldo Disponible</p>
              <p className="text-2xl font-black text-white">${currentCapital.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Products Grid */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Star className="text-yellow-400 w-5 h-5" />
            Catálogo Exclusivo
          </h2>
          
          {activeProducts.length === 0 ? (
            <div className="bg-gray-800/50 rounded-2xl p-12 text-center border border-gray-700 border-dashed">
              <ShoppingBag className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Aún no hay productos disponibles en el Marketplace.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeProducts.map(product => (
                <div key={product.id} className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden hover:border-cyan-500/50 transition-colors group">
                  <div className="h-48 relative overflow-hidden bg-gray-900">
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-transparent"></div>
                    <span className="absolute top-4 left-4 bg-gray-900/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-cyan-400 border border-cyan-500/30">
                      {product.category}
                    </span>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{product.name}</h3>
                    <p className="text-gray-400 text-sm mb-6 line-clamp-2">{product.description}</p>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-2xl font-black text-white">${product.price}</span>
                      <button 
                        onClick={() => setSelectedProduct(product.id)}
                        className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                      >
                        Ver Detalles
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Orders */}
        {userOrders.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Download className="text-green-400 w-5 h-5" />
              Mis Compras y Accesos
            </h2>
            <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                  <thead className="bg-gray-900/50 text-xs uppercase font-semibold text-gray-300">
                    <tr>
                      <th className="px-6 py-4">Producto</th>
                      <th className="px-6 py-4">Monto</th>
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4">Acceso / Licencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {userOrders.map(order => {
                      const p = products.find(prod => prod.id === order.productId);
                      return (
                        <tr key={order.id} className="hover:bg-gray-700/30 transition-colors">
                          <td className="px-6 py-4 font-medium text-white">
                            {p?.name || 'Producto Desconocido'}
                          </td>
                          <td className="px-6 py-4">${order.amount}</td>
                          <td className="px-6 py-4">{new Date(order.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              order.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                              order.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                              'bg-yellow-500/10 text-yellow-400'
                            }`}>
                              {order.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {order.status === 'completed' && order.licenseDataRevealed ? (
                              <code className="bg-gray-900 px-2 py-1 rounded border border-gray-700 text-cyan-400">
                                {order.licenseDataRevealed}
                              </code>
                            ) : (
                              <span className="text-gray-500 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Oculto
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedProduct && renderProductDetails(products.find(p => p.id === selectedProduct))}
      {successOrder && renderSuccessModal()}
    </div>
  );
}
