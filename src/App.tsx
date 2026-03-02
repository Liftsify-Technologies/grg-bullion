/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, AlertCircle, Clock, ShoppingCart, List, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RateItem {
  id: string;
  name: string;
  bid: string;
  ask: string;
  high: string;
  low: string;
}

interface Order {
  id: number;
  item_name: string;
  rate: number;
  quantity: number;
  total_amount: number;
  timestamp: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'rates' | 'orders'>('rates');
  const [data, setData] = useState<RateItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Order Modal State
  const [selectedItem, setSelectedItem] = useState<RateItem | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [orderSuccess, setOrderSuccess] = useState<boolean>(false);

  const fetchRates = async () => {
    try {
      const response = await fetch('/api/rates');
      if (!response.ok) {
        throw new Error(`Failed to fetch rates: ${response.status} ${response.statusText}`);
      }
      const text = await response.text();
      let jsonData;
      try {
        jsonData = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse JSON:", text.substring(0, 100));
        throw new Error("Invalid response format from server");
      }
      setData(jsonData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch live rates. Retrying...');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (response.ok) {
        const jsonData = await response.json();
        setOrders(jsonData);
      }
    } catch (err) {
      console.error("Failed to fetch orders", err);
    }
  };

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  const handleBuyClick = (item: RateItem) => {
    setSelectedItem(item);
    setQuantity(10); // Minimum 10 grams
    setOrderSuccess(false);
  };

  const confirmOrder = async () => {
    if (!selectedItem) return;

    // Rule: Our rate is 5000 more than the current rate (Ask price) ONLY for "India Gold" and "India Silver"
    const isPremiumItem = selectedItem.name === "India Gold" || selectedItem.name === "India Silver";
    const baseRate = parseFloat(selectedItem.ask.replace(/,/g, '')) || 0;
    const finalRate = isPremiumItem ? baseRate + 5000 : baseRate;
    
    // Calculate total amount: (Rate for 10g / 10) * Quantity in grams
    // If it's not a premium item, we assume the rate is per unit (or per 10g depending on item, but keeping logic consistent for now)
    // For now, applying the /10 logic to everything as per previous instruction "this price is for 10 grams".
    const ratePerGram = finalRate / 10;
    const totalAmount = ratePerGram * quantity;

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item_name: selectedItem.name,
          rate: finalRate,
          quantity: quantity,
          total_amount: totalAmount
        }),
      });

      if (response.ok) {
        setOrderSuccess(true);
        setTimeout(() => {
          setSelectedItem(null);
          setOrderSuccess(false);
          // Refresh orders if we are on that tab (or just pre-fetch)
          fetchOrders();
        }, 1500);
      } else {
        alert('Failed to place order');
      }
    } catch (e) {
      console.error(e);
      alert('Error placing order');
    }
  };

  const renderRates = () => {
    if (!data || data.length === 0) {
       return (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500 font-medium">No rates available at the moment.</p>
          </div>
       );
    }

    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.map((item) => {
          const askPrice = parseFloat(item.ask.replace(/,/g, '')) || 0;
          const isPremiumItem = item.name === "India Gold" || item.name === "India Silver";
          const displayPrice = isPremiumItem ? askPrice + 5000 : askPrice;

          return (
            <motion.div 
              key={item.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 flex flex-col group"
            >
              <div className="p-6 border-b border-gray-50 bg-gradient-to-br from-gray-50 to-white">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-emerald-700 transition-colors">
                    {item.name}
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                    LIVE
                  </span>
                </div>
              </div>
              
              <div className="p-6 flex-grow">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Market Bid</span>
                    <span className={`text-xl font-mono font-bold tracking-tight ${item.bid === '-' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {item.bid}
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Market Ask</span>
                    <span className={`text-xl font-mono font-bold tracking-tight ${item.ask === '-' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {item.ask}
                    </span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 mb-5 border border-emerald-100/50 shadow-inner">
                   <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">Our Buy Rate</span>
                   </div>
                   <div className="text-3xl font-mono font-bold text-emerald-700 text-center tracking-tight py-1">
                      {isNaN(displayPrice) ? '-' : displayPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                   </div>
                   {isPremiumItem && (
                     <div className="flex justify-center items-center space-x-1 text-[10px] text-emerald-600/80 font-medium">
                        <span>Market</span>
                        <span>+</span>
                        <span className="font-bold">5000 Badla</span>
                     </div>
                   )}
                </div>

                <button
                  onClick={() => handleBuyClick(item)}
                  disabled={item.ask === '-'}
                  className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center transform active:scale-[0.98]"
                >
                  <ShoppingCart className="w-4 h-4 mr-2.5" />
                  Place Order
                </button>

                <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs font-medium">
                   <div className="flex justify-between items-center">
                     <span className="text-gray-400">High</span>
                     <span className="font-mono text-gray-600">{item.high}</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-gray-400">Low</span>
                     <span className="font-mono text-gray-600">{item.low}</span>
                   </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const renderOrders = () => {
    if (orders.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="bg-gray-50 p-4 rounded-full mb-4">
            <ShoppingCart className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No orders yet</h3>
          <p className="text-gray-500 mt-2 max-w-xs mx-auto">Your order history will appear here once you place an order from the Live Rates tab.</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Order ID</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Item</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Rate (10g)</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Qty (g)</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Total</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Time</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{order.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{order.item_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                    {order.rate.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600 font-bold">
                    {order.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-emerald-600 font-bold">
                    {order.total_amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {new Date(order.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 inline-flex text-[10px] leading-tight font-bold uppercase rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Completed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gray-900 p-2.5 rounded-xl shadow-lg shadow-gray-200">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">GRG Bullion</h1>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Premium Trading Platform</p>
            </div>
          </div>
          <div className="flex items-center space-x-6 text-sm">
             <div className="hidden md:flex items-center text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
               <Clock className="w-4 h-4 mr-2 text-gray-400" />
               <span className="font-mono font-medium">{lastUpdated.toLocaleTimeString()}</span>
             </div>
             <div className="flex items-center">
                <span className={`flex h-3 w-3 relative`}>
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${error ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${error ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                </span>
                <span className={`ml-2 font-bold text-xs uppercase tracking-wide ${error ? 'text-red-600' : 'text-emerald-600'}`}>
                    {error ? 'Offline' : 'Live Feed'}
                </span>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Navigation Tabs */}
        <div className="flex space-x-2 bg-white p-1.5 rounded-2xl mb-10 w-fit shadow-sm border border-gray-100 mx-auto md:mx-0">
          <button
            onClick={() => setActiveTab('rates')}
            className={`flex items-center px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === 'rates' 
                ? 'bg-gray-900 text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <TrendingUp className="w-4 h-4 mr-2.5" />
            Live Rates
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === 'orders' 
                ? 'bg-gray-900 text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <List className="w-4 h-4 mr-2.5" />
            My Orders
          </button>
        </div>

        {error && (
          <div className="mb-8 bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center text-red-700 shadow-sm">
            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {loading && !data && activeTab === 'rates' ? (
          <div className="flex flex-col items-center justify-center h-80">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-gray-100 border-t-gray-900 rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-400 mt-4 font-medium animate-pulse">Connecting to live feed...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'rates' ? renderRates() : renderOrders()}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Order Confirmation Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Confirm Order</h3>
                    <p className="text-gray-500 text-sm mt-1">Review your purchase details</p>
                  </div>
                  <button onClick={() => setSelectedItem(null)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {!orderSuccess ? (
                  <>
                    <div className="bg-gray-50 rounded-2xl p-5 mb-6 space-y-4 border border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-500">Item</span>
                        <span className="font-bold text-gray-900 text-lg">{selectedItem.name}</span>
                      </div>
                      
                      <div className="h-px bg-gray-200"></div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-500">Market Rate</span>
                        <span className="font-mono font-medium text-gray-700">{selectedItem.ask}</span>
                      </div>
                      
                      {(selectedItem.name === "India Gold" || selectedItem.name === "India Silver") && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-500">Badla (Premium)</span>
                          <span className="font-mono font-medium text-emerald-600">+ 5,000.00</span>
                        </div>
                      )}
                      
                      <div className="h-px bg-gray-200"></div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-500">Rate (10g)</span>
                        <span className="font-mono font-bold text-gray-900">
                          {((parseFloat(selectedItem.ask.replace(/,/g, '')) || 0) + (selectedItem.name === "India Gold" || selectedItem.name === "India Silver" ? 5000 : 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-sm font-medium text-gray-500">Quantity (grams)</span>
                        <div className="flex items-center space-x-3">
                          <button 
                            onClick={() => setQuantity(Math.max(10, quantity - 1))}
                            className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold shadow-sm disabled:opacity-50 transition-colors"
                            disabled={quantity <= 10}
                          >
                            -
                          </button>
                          <input 
                            type="number" 
                            min="10"
                            value={quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) {
                                setQuantity(val);
                              } else {
                                setQuantity(0); // Allow clearing to type
                              }
                            }}
                            onBlur={() => {
                              if (quantity < 10) setQuantity(10);
                            }}
                            className="font-mono font-bold text-lg w-20 text-center bg-white border border-gray-200 rounded-lg py-1.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                          />
                          <button 
                            onClick={() => setQuantity(quantity + 1)}
                            className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 font-bold shadow-sm transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                         <span className="text-xs text-gray-400 font-medium">Min: 10g</span>
                      </div>
                    </div>

                    <div className="bg-gray-900 rounded-xl p-4 mb-6 flex justify-between items-center shadow-lg shadow-gray-200">
                      <span className="text-gray-400 font-medium text-sm">Total Amount</span>
                      <span className="text-2xl font-mono font-bold text-white">
                        {((((parseFloat(selectedItem.ask.replace(/,/g, '')) || 0) + (selectedItem.name === "India Gold" || selectedItem.name === "India Silver" ? 5000 : 0)) / 10) * quantity).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                      </span>
                    </div>

                    <div className="flex space-x-3">
                      <button 
                        onClick={() => setSelectedItem(null)}
                        className="flex-1 py-3.5 px-4 bg-white border border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={confirmOrder}
                        className="flex-[2] py-3.5 px-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex justify-center items-center"
                      >
                        Confirm Purchase
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center py-8">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                      <Check className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h4 className="text-2xl font-black text-gray-900 mb-2">Order Placed!</h4>
                    <p className="text-gray-500 text-center max-w-xs">
                      Successfully purchased <span className="font-bold text-gray-900">{quantity}x {selectedItem.name}</span>
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

