import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout';
import ConfirmModal from '../components/modal';
import NotificationModal from '../components/notifications';
import { 
  Plus, Search, X, AlertTriangle, 
  Edit2, Upload, ArrowRightLeft, Building2, Trash2 
} from 'lucide-react';
import Papa from 'papaparse';

interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  costPrice: number;
  stockLevel: number;
  minStock: number;
  tags: string[];
  inventory?: {
    quantity: number;
    warehouse: { name: string; location: string };
  }[];
}

// We need this helper to peek inside the JWT token and see if the user is an Admin
const getUserRole = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload).role;
  } catch (e) { return null; }
};

const Inventory = () => {
  const userRole = getUserRole(); 
  const navigate = useNavigate();
  
  // These hold our main data from the database
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // We need these for the "Transfer Stock" feature
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferData, setTransferData] = useState({
    productId: 0, fromWarehouseId: '', toWarehouseId: '', quantity: ''
  });

  // State to control the "View Details" popup for stock levels
  const [viewStockProduct, setViewStockProduct] = useState<Product | null>(null);

  // States for the Add/Edit Product form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    sku: '', name: '', description: '', category: '', 
    tags: '', price: '', stockLevel: '', minStock: '10',
    costPrice: ''
  });

 
  
  //  For Deletion Confirmation
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);

  // For General Notifications (Success/Error messages)
  const [notification, setNotification] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info'
  });

  // Helper to quickly show a notification popup
  const showNotify = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ isOpen: true, title, message, type });
  };

  useEffect(() => {
    fetchProducts();
    fetchWarehouses();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }
      const response = await axios.get('http://localhost:3000/api/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
      setLoading(false);
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get('http://localhost:3000/api/warehouses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWarehouses(res.data);
    } catch(e) {}
  };

  // Prepares the transfer modal with empty values
  const openTransferModal = (product: Product) => {
    setTransferData({ 
        productId: product.id, 
        fromWarehouseId: '', 
        toWarehouseId: '', 
        quantity: '' 
    });
    setIsTransferModalOpen(true);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation before sending to backend
    if (transferData.fromWarehouseId === transferData.toWarehouseId) {
      showNotify("Invalid Transfer", "Source and Destination warehouses cannot be the same.", "error");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/api/inventory/transfer', {
        productId: transferData.productId,
        fromWarehouseId: Number(transferData.fromWarehouseId),
        toWarehouseId: Number(transferData.toWarehouseId),
        quantity: Number(transferData.quantity)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Success! Close modal and show nice popup
      setIsTransferModalOpen(false);
      showNotify("Transfer Successful", "Stock has been moved between warehouses.", "success");
      fetchProducts(); 
    } catch (error: any) {
      showNotify("Transfer Failed", error.response?.data?.error || "Could not move stock.", "error");
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ sku: '', name: '', description: '', category: '', tags: '', price: '', stockLevel: '', minStock: '10', costPrice: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      category: product.category,
      tags: product.tags.join(', '),
      price: String(product.price),
      stockLevel: String(product.stockLevel),
      minStock: String(product.minStock),
      costPrice: String(product.costPrice || 0),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      if (editingId) {
        await axios.put(`http://localhost:3000/api/products/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotify("Product Updated", "The product details have been saved.", "success");
      } else {
        await axios.post('http://localhost:3000/api/products', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotify("Product Created", "New product has been added to inventory.", "success");
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      showNotify("Error", "Operation failed. Please check your inputs.", "error");
    }
  };

  // Instead of confirm(), we open our custom modal
  const confirmArchive = (id: number) => {
    setProductToDelete(id);
    setIsDeleteModalOpen(true);
  };

  // This runs only when user clicks "Yes" in the modal
  const handleArchive = async () => {
    if (!productToDelete) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3000/api/products/${productToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProducts();
      // showNotify("Archived", "Product has been archived.", "success");
    } catch (error) {
      showNotify("Error", "Failed to archive product.", "error");
    }
  };

  // Filter logic for the search bar
  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase();
    const inName = (p.name || "").toLowerCase().includes(term);
    const inSku = (p.sku || "").toLowerCase().includes(term);
    const inCategory = (p.category || "").toLowerCase().includes(term);
    const inTags = p.tags && p.tags.some(t => t.toLowerCase().includes(term));
    return inName || inSku || inCategory || inTags;
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        const token = localStorage.getItem('token');
        try {
          const response = await axios.post('http://localhost:3000/api/products/bulk', results.data, {
             headers: { Authorization: `Bearer ${token}` }
          });
          
          // Show the result 
          const res = response.data.results;
          const msg = `Success: ${res.success}\nFailed: ${res.failed}\n\n${res.errors.length > 0 ? "Errors:\n" + res.errors.join('\n') : ''}`;
          
          showNotify("Import Finished", msg, res.failed > 0 ? 'info' : 'success');
          
          fetchProducts();
        } catch (error) {
          showNotify("Import Failed", "Could not process the CSV file.", "error");
        }
      }
    });
  };

  return (
    <Layout title="Inventory Management">
      
      {/* 1. Archive Confirmation Modal */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleArchive}
        title="Archive Product?"
        message="Are you sure you want to archive this product? This will remove it from the active inventory list."
        isDestructive={true} 
      />

      {/* 2. Notification Modal (Success/Error popups) */}
      <NotificationModal 
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Toolbar Section */}
        <div className="p-5 border-b border-gray-100 flex gap-4 justify-between items-center bg-gray-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name, SKU, tags..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <input type="file" accept=".csv" id="csvUpload" className="hidden" onChange={handleFileUpload} />
            <label htmlFor="csvUpload" className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 shadow-sm transition font-medium cursor-pointer">
              <Upload size={20} /> Import CSV
            </label>
            <button onClick={handleOpenCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm transition font-medium">
              <Plus size={20} /> Add Product
            </button>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 border-b">Product Info</th>
                <th className="p-4 border-b">Category</th>
                <th className="p-4 border-b">Price</th>
                <th className="p-4 border-b">Total Stock</th>
                <th className="p-4 border-b">Status</th>
                <th className="p-4 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No products found.</td></tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-blue-50/50 transition duration-150">
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{product.name || "Unknown"}</p>
                      <p className="font-mono text-xs text-gray-500">{product.sku || "NO-SKU"}</p>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {product.category || "Uncategorized"}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">${Number(product.price).toFixed(2)}</td>
                    
                    {/* Clickable stock count to view warehouse details */}
                    <td className="p-4">
                        <button 
                            onClick={() => setViewStockProduct(product)}
                            className="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                            title="Click to see warehouse breakdown"
                        >
                            {product.stockLevel || 0}
                        </button>
                    </td>

                    <td className="p-4">
                      {(product.stockLevel || 0) <= (product.minStock || 10) ? (
                        <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-bold w-fit">
                          <AlertTriangle size={12} /> Low Stock
                        </span>
                      ) : (
                        <span className="text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-bold">
                          In Stock
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      <button onClick={() => openTransferModal(product)} className="text-gray-400 hover:text-blue-600 p-2 transition" title="Transfer Stock">
                        <ArrowRightLeft size={18} />
                      </button>
                      <button onClick={() => handleOpenEdit(product)} className="text-gray-400 hover:text-blue-600 p-2 transition" title="Edit Product">
                        <Edit2 size={18} />
                      </button>
                      {userRole === 'ADMIN' && (
                      <button onClick={() => confirmArchive(product.id)} className="text-gray-400 hover:text-red-600 p-2 transition" title="Archive">
                        <Trash2 size={18} />
                      </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warehouse Breakdown Popup */}
      {viewStockProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-blue-50">
                    <h3 className="font-bold text-gray-800">Stock Breakdown</h3>
                    <button onClick={() => setViewStockProduct(null)} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">
                    <div className="text-sm text-gray-500 mb-4">
                        Locations for <strong>{viewStockProduct.name}</strong>
                    </div>
                    
                    <div className="space-y-3">
                        {viewStockProduct.inventory && viewStockProduct.inventory.length > 0 ? (
                            viewStockProduct.inventory.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-md shadow-sm text-blue-600">
                                            <Building2 size={16} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800 text-sm">{item.warehouse.name}</div>
                                            <div className="text-xs text-gray-400">{item.warehouse.location || 'No location'}</div>
                                        </div>
                                    </div>
                                    <span className="font-mono font-bold text-lg text-blue-700">
                                        {item.quantity}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-gray-400 py-4 italic">
                                No stock recorded in any warehouse.
                            </div>
                        )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">Total System Stock</span>
                        <span className="text-xl font-bold text-gray-900">{viewStockProduct.stockLevel}</span>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Create/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">{editingId ? "Edit Product" : "Add New Inventory Item"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU Code *</label>
                <input required disabled={!!editingId} placeholder="e.g. ELEC-001" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input required placeholder="e.g. Wireless Mouse" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea placeholder="Product details..." className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 h-20" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option value="">Select Category...</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Home & Garden">Home & Garden</option>
                  <option value="Automotive">Automotive</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <input placeholder="fragile, best-seller" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price ($) *</label>
                <input required type="number" step="0.01" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              </div>
              <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price ($)</label>
              <input type="number" placeholder="0.00"  step="0.01" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-yellow-50" value={formData.costPrice}   onChange={e => setFormData({...formData, costPrice: e.target.value})} />
              <p className="text-[10px] text-gray-500 mt-1">For valuation reports</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock</label>
                  <input type="number" disabled={!!editingId} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" value={formData.stockLevel} onChange={e => setFormData({...formData, stockLevel: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Low Alert At</label>
                  <input type="number" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.minStock} onChange={e => setFormData({...formData, minStock: e.target.value})} />
                </div>
              </div>
              <div className="col-span-2 pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md">{editingId ? "Update Product" : "Create Product"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internal Stock Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><ArrowRightLeft className="text-blue-600" /> Transfer Stock</h3>
            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                  <select required className="w-full p-2 border rounded-lg bg-white" value={transferData.fromWarehouseId} onChange={e => setTransferData({...transferData, fromWarehouseId: e.target.value})}>
                    <option value="">Select...</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                  <select required className="w-full p-2 border rounded-lg bg-white" value={transferData.toWarehouseId} onChange={e => setTransferData({...transferData, toWarehouseId: e.target.value})}>
                    <option value="">Select...</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Move</label>
                <input type="number" required min="1" className="w-full p-2 border rounded-lg" placeholder="e.g. 50" value={transferData.quantity} onChange={e => setTransferData({...transferData, quantity: e.target.value})} />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsTransferModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Confirm Transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Inventory;