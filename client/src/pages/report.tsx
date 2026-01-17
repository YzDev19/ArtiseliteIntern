import { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/layout';
import { Building2, Tag, Download, TrendingUp, PieChart, Wallet } from 'lucide-react';

interface ReportItem {
  name: string;
  totalCost: number;   // The actual money spent acquiring this stock
  totalRetail: number; // The potential money to be made if sold
  count: number;
}

const Reports = () => {
  const [warehouseData, setWarehouseData] = useState<ReportItem[]>([]);
  const [categoryData, setCategoryData] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:3000/api/reports/valuation', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWarehouseData(res.data.byWarehouse);
      setCategoryData(res.data.byCategory);
    } catch (error) {
      console.error("Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  // We calculate grand totals on the client side to avoid extra DB calls
  const totalAssetCost = warehouseData.reduce((sum, w) => sum + w.totalCost, 0);
  const totalRetailValue = warehouseData.reduce((sum, w) => sum + w.totalRetail, 0);
  const totalPotentialProfit = totalRetailValue - totalAssetCost;
  const profitMargin = totalRetailValue > 0 ? (totalPotentialProfit / totalRetailValue) * 100 : 0;

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <Layout title="Financial Reports">
        <div className="flex h-96 items-center justify-center text-gray-400 animate-pulse">
          Generating financial analysis...
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Financial Reports">
      
      {/* Header Actions */}
      <div className="flex justify-end mb-6 print:hidden">
        <button 
          onClick={handlePrint} 
          className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition shadow-sm font-medium"
        >
          <Download size={18} /> Export / Print
        </button>
      </div>

      {/* 1. Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Total Asset Cost */}
        <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
           <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                 <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Wallet size={24} />
                 </div>
                 <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">ASSETS</span>
              </div>
              <p className="text-gray-500 text-sm font-medium">Total Inventory Cost</p>
              <h2 className="text-3xl font-bold text-gray-800 mt-1">${totalAssetCost.toLocaleString()}</h2>
           </div>
           {/* Decorative circle */}
           <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-100 rounded-full opacity-50"></div>
        </div>

        {/* Potential Revenue */}
        <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border border-purple-100 shadow-sm relative overflow-hidden">
           <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                 <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                    <TrendingUp size={24} />
                 </div>
                 <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded-full">REVENUE</span>
              </div>
              <p className="text-gray-500 text-sm font-medium">Potential Retail Value</p>
              <h2 className="text-3xl font-bold text-gray-800 mt-1">${totalRetailValue.toLocaleString()}</h2>
           </div>
           <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-purple-100 rounded-full opacity-50"></div>
        </div>

        {/* Profit Forecast */}
        <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-xl border border-green-100 shadow-sm relative overflow-hidden">
           <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                 <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                    <PieChart size={24} />
                 </div>
                 <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">PROFIT</span>
              </div>
              <p className="text-gray-500 text-sm font-medium">Est. Margin ({profitMargin.toFixed(1)}%)</p>
              <h2 className="text-3xl font-bold text-green-700 mt-1">${totalPotentialProfit.toLocaleString()}</h2>
           </div>
           <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-green-100 rounded-full opacity-50"></div>
        </div>
      </div>

      {/* 2. Detailed Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Warehouse Valuation Report */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
          <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Building2 className="text-blue-600" size={20} /> Cost by Warehouse
            </h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="p-4">Location</th>
                <th className="p-4 text-right">Items</th>
                <th className="p-4 text-right">Asset Distribution</th>
                <th className="p-4 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {warehouseData.map((w, i) => {
                // Calculate percentage for the visual bar
                const percent = totalAssetCost > 0 ? (w.totalCost / totalAssetCost) * 100 : 0;
                return (
                  <tr key={i} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-medium text-gray-800">{w.name}</td>
                    <td className="p-4 text-right text-gray-500">{w.count.toLocaleString()}</td>
                    <td className="p-4 w-32">
                        {/* Visual bar representing value share */}
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${percent}%` }}></div>
                        </div>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-gray-800">
                        ${w.totalCost.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {warehouseData.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-400 italic">No warehouse data available.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Category Valuation Report */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
          <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Tag className="text-purple-600" size={20} /> Cost by Category
            </h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="p-4">Category</th>
                <th className="p-4 text-right">Share</th>
                <th className="p-4 text-right">Retail Value</th>
                <th className="p-4 text-right">Asset Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categoryData.map((c, i) => {
                const percent = totalAssetCost > 0 ? (c.totalCost / totalAssetCost) * 100 : 0;
                return (
                  <tr key={i} className="hover:bg-gray-50 transition">
                    <td className="p-4 font-medium text-gray-800">{c.name}</td>
                    <td className="p-4 w-24">
                        <div className="flex items-center gap-2 justify-end">
                            <span className="text-xs text-gray-400">{percent.toFixed(0)}%</span>
                            <div className="w-12 bg-gray-100 rounded-full h-1.5">
                                <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${percent}%` }}></div>
                            </div>
                        </div>
                    </td>
                    <td className="p-4 text-right text-gray-400">${c.totalRetail.toLocaleString()}</td>
                    <td className="p-4 text-right font-mono font-bold text-green-700">${c.totalCost.toLocaleString()}</td>
                  </tr>
                );
              })}
              {categoryData.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-400 italic">No category data available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Reports;