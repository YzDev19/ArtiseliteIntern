import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Warehouse, 
  ArrowDownLeft, 
  ArrowUpRight, 
  FileText, 
  Users, 
  LogOut, 
  Menu, 
  X,
  History // Imported History icon
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  title: string;
}

const Layout = ({ children, title }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState('');

  // Extract user role from JWT token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (e) {
        console.error("Invalid token");
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Define sidebar navigation items
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Package, label: 'Inventory', path: '/inventory' },
    { icon: Warehouse, label: 'Warehouses', path: '/warehouses' },
    { icon: ArrowDownLeft, label: 'Inbound (Receive)', path: '/inbound' },
    { icon: ArrowUpRight, label: 'Outbound (Dispatch)', path: '/outbound' },
    { icon: History, label: 'Transactions', path: '/transactions' }, // Added back
    { icon: FileText, label: 'Reports', path: '/reports' },
  ];

  // Only Admin users can see the User Management link
  if (userRole === 'ADMIN') {
    menuItems.push({ icon: Users, label: 'User Management', path: '/users' });
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      {/* Sidebar for Desktop screens */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-gray-200 shadow-sm z-20">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
            A
          </div>
          <span className="text-xl font-bold text-gray-800 tracking-tight">Artiselite</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-30 shadow-sm">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                A
            </div>
            <span className="text-lg font-bold text-gray-800">Artiselite</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden pt-16 md:pt-0 bg-gray-50/50">
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between shadow-sm z-10">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">{title}</h1>
          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end mr-2 hidden sm:flex">
                <span className="text-sm font-bold text-gray-700 leading-tight">
                    {userRole === 'ADMIN' ? 'Administrator' : userRole === 'MANAGER' ? 'Manager' : 'Operator'}
                </span>
                <span className="text-xs text-gray-400 font-medium">Active Session</span>
             </div>
             <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg shadow-inner ring-2 ring-white">
               {userRole ? userRole[0] : 'U'}
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-gray-800/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="absolute top-16 left-0 w-64 h-full bg-white shadow-xl p-4 animate-slide-in" onClick={e => e.stopPropagation()}>
                <nav className="space-y-1">
                  {menuItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                        location.pathname === item.path 
                            ? 'bg-blue-50 text-blue-600' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <item.icon size={20} />
                        {item.label}
                    </Link>
                  ))}
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 mt-4 border-t border-gray-100 pt-4"
                  >
                    <LogOut size={20} />
                    Sign Out
                  </button>
                </nav>
            </div>
        </div>
      )}
    </div>
  );
};

export default Layout;