import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Wallet, 
  LayoutDashboard, 
  Receipt, 
  CheckSquare, 
  ShoppingCart, 
  Settings,
  Search,
  Database,
  RefreshCw,
  Users,
  X,
  LogOut
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../App';
import ProfileModal from '../pages/ProfileModal';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isFinance = location.pathname.startsWith('/finance');
  const isAdmin = location.pathname.startsWith('/admin');
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length > 1) {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
          const data = await res.json();
          setSearchResults(data);
          setShowResults(true);
        } catch (error) {
          console.error('Search failed:', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleResultClick = (id: string) => {
    navigate(`/requests/${id}`);
    setSearchQuery('');
    setShowResults(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/10 rounded-lg p-2">
              <Wallet className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">
                {isFinance ? 'ProcureFlow' : isAdmin ? 'Admin Portal' : 'Enterprise'}
              </h1>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                {isFinance ? 'Finance Portal' : isAdmin ? 'Configuration' : 'Reimbursement'}
              </p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {!isFinance && !isAdmin && (
            <>
              <NavItem to="/" icon={LayoutDashboard} label="Overview" />
              <NavItem to="/reimbursements" icon={Receipt} label="My Reimbursements" />
              <NavItem to="/approvals" icon={CheckSquare} label="Approvals" />
            </>
          )}

          {isFinance && (
            <>
              <div className="px-3 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Main</div>
              <NavItem to="/finance" icon={LayoutDashboard} label="Dashboard" />
              <NavItem to="/finance/reimbursements" icon={Wallet} label="Reimbursements" />
              <NavItem to="/finance/procurement" icon={ShoppingCart} label="Procurement" />
              <NavItem to="/finance/ap-entries" icon={Receipt} label="AP Entries" />
              
              <div className="px-3 pt-6 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Systems</div>
              <NavItem to="/finance/erp-sync" icon={RefreshCw} label="ERP Sync Hub" />
              <NavItem to="/finance/vendors" icon={Database} label="Vendor Database" />
            </>
          )}

          {isAdmin && (
            <>
              <div className="px-3 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Core Logic</div>
              <NavItem to="/admin" icon={CheckSquare} label="Approval Workflows" />
              <NavItem to="/admin/templates" icon={Receipt} label="Email Templates" />
              
              <div className="px-3 pt-6 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">System</div>
              <NavItem to="/admin/users" icon={Users} label="Users & Roles" />
              <NavItem to="/admin/settings" icon={Settings} label="Global Settings" />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex flex-col gap-2">
            <NavLink to="/" className={() => cn("text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-100", !isFinance && !isAdmin ? "bg-slate-100 text-blue-600" : "text-slate-600")}>Claimant Portal</NavLink>
            <NavLink to="/finance" className={() => cn("text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-100", isFinance ? "bg-slate-100 text-blue-600" : "text-slate-600")}>Finance Portal</NavLink>
            <NavLink to="/admin" className={() => cn("text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-100", isAdmin ? "bg-slate-100 text-blue-600" : "text-slate-600")}>Admin Portal</NavLink>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="relative w-96" ref={searchRef}>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length > 1 && setShowResults(true)}
              placeholder="Search claims, IDs, or requests..." 
              className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Search Results Dropdown */}
            {showResults && (
              <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                {isSearching ? (
                  <div className="p-4 text-sm text-slate-500 text-center">Searching...</div>
                ) : searchResults.length > 0 ? (
                  <div className="py-2">
                    {searchResults.map((res) => (
                      <button
                        key={res.id}
                        onClick={() => handleResultClick(res.id)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{res.description}</p>
                            <p className="text-xs text-slate-500 mt-0.5">ID: {res.id} • {res.claimant_name}</p>
                          </div>
                          <span className="text-xs font-bold text-slate-900">${res.amount.toLocaleString()}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-sm text-slate-500 text-center">No results found for "{searchQuery}"</div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="h-8 w-[1px] bg-slate-200"></div>
            <button 
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-3 pl-2 hover:bg-slate-50 rounded-lg transition-colors -mr-2 pr-2"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold leading-none">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500 mt-1">{user?.department || 'Department'}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border-2 border-blue-200">
                {user?.avatar || 'U'}
              </div>
            </button>
            <button 
              onClick={() => { logout(); navigate('/login'); }}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Profile Modal */}
        <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, icon: Icon, label, highlight }: { to: string, icon: any, label: string, highlight?: boolean }) {
  return (
    <NavLink 
      to={to} 
      end={to === '/' || to === '/finance' || to === '/admin'}
      className={({ isActive }) => cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
        isActive 
          ? "bg-blue-50 text-blue-600 font-semibold" 
          : highlight 
            ? "bg-blue-500/10 text-blue-600 font-medium hover:bg-blue-500/20" 
            : "text-slate-600 hover:bg-slate-100 font-medium"
      )}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </NavLink>
  );
}
