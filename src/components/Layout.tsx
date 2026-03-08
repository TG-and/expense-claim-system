import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  LogOut,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Keyboard
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../App';
import ProfileModal from '../pages/ProfileModal';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed';
const SIDEBAR_WIDTH = {
  EXPANDED: 'w-72',
  COLLAPSED: 'w-20'
};

function getInitialSidebarState(): boolean {
  if (typeof window === 'undefined') return false;
  
  const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  if (stored !== null) {
    return stored === 'true';
  }
  
  return window.innerWidth < 768;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isFinance = location.pathname.startsWith('/finance');
  const isAdmin = location.pathname.startsWith('/admin');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(getInitialSidebarState);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key === 's') {
        event.preventDefault();
        if (!isMobile) {
          setIsCollapsed(prev => !prev);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile]);

  useEffect(() => {
    setShowMobileMenu(false);
  }, [location.pathname]);

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

  const toggleSidebar = useCallback(() => {
    if (!isMobile) {
      setIsCollapsed(prev => !prev);
    }
  }, [isMobile]);

  const sidebarWidth = isCollapsed ? SIDEBAR_WIDTH.COLLAPSED : SIDEBAR_WIDTH.EXPANDED;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Mobile Overlay */}
      {isMobile && showMobileMenu && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out z-50",
          sidebarWidth,
          isMobile 
            ? `fixed inset-y-0 left-0 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}` 
            : "relative"
        )}
        role="navigation"
        aria-label={isCollapsed ? "Sidebar collapsed" : "Sidebar expanded"}
      >
        {/* Header */}
        <div className={cn("p-4 border-b border-slate-200 transition-all duration-300", isCollapsed ? "px-2" : "px-6")}>
          <div className={cn("flex items-center gap-3", isCollapsed ? "justify-center" : "")}>
            <div className="bg-blue-500/10 rounded-lg p-2 shrink-0">
              <Wallet className="w-6 h-6 text-blue-600" />
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <h1 className="text-lg font-bold leading-none truncate">
                  {isFinance ? 'ProcureFlow' : isAdmin ? 'Admin Portal' : 'ClaimFlow'}
                </h1>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold truncate">
                  {isFinance ? 'Finance Portal' : isAdmin ? 'Configuration' : 'Reimbursement'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className={cn(
            "hidden md:flex absolute top-16 z-10 p-1.5 rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-300",
            isCollapsed 
              ? "left-1/2 -translate-x-1/2" 
              : "right-[-12px]",
            !isMobile && "hover:bg-slate-50"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand (Alt+S)" : "Collapse (Alt+S)"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          )}
        </button>
        
        {/* Navigation */}
        <nav className={cn(
          "flex-1 py-6 space-y-2 overflow-y-auto overflow-x-hidden transition-all duration-300",
          isCollapsed ? "px-2" : "px-4"
        )}>
          {!isFinance && !isAdmin && (
            <>
              <NavItem to="/" icon={LayoutDashboard} label="Overview" isCollapsed={isCollapsed} />
              <NavItem to="/reimbursements" icon={Receipt} label="My Reimbursements" isCollapsed={isCollapsed} />
              <NavItem to="/approvals" icon={CheckSquare} label="Approvals" isCollapsed={isCollapsed} />
            </>
          )}

          {isFinance && (
            <>
              <div className={cn("text-xs font-semibold text-slate-400 uppercase tracking-wider", isCollapsed ? "px-0 text-center py-2" : "px-3 pb-2")}>
                {!isCollapsed && "Main"}
              </div>
              <NavItem to="/finance" icon={LayoutDashboard} label="Dashboard" isCollapsed={isCollapsed} />
              <NavItem to="/finance/reimbursements" icon={Wallet} label="Reimbursements" isCollapsed={isCollapsed} />
              <NavItem to="/finance/procurement" icon={ShoppingCart} label="Procurement" isCollapsed={isCollapsed} />
              <NavItem to="/finance/ap-entries" icon={Receipt} label="AP Entries" isCollapsed={isCollapsed} />
              
              <div className={cn("text-xs font-semibold text-slate-400 uppercase tracking-wider", isCollapsed ? "px-0 text-center py-2" : "px-3 pt-6 pb-2")}>
                {!isCollapsed && "Systems"}
              </div>
              <NavItem to="/finance/erp-sync" icon={RefreshCw} label="ERP Sync Hub" isCollapsed={isCollapsed} />
              <NavItem to="/finance/vendors" icon={Database} label="Vendor Database" isCollapsed={isCollapsed} />
            </>
          )}

          {(isAdmin || user?.role === 'Admin') && (
            <>
              <div className={cn("text-xs font-semibold text-slate-400 uppercase tracking-wider", isCollapsed ? "px-0 text-center py-2" : "px-3 pb-2")}>
                {!isCollapsed && "Core Logic"}
              </div>
              <NavItem to="/admin" icon={CheckSquare} label="Workflows" isCollapsed={isCollapsed} />
              <NavItem to="/admin/templates" icon={Receipt} label="Email Templates" isCollapsed={isCollapsed} />
              
              <div className={cn("text-xs font-semibold text-slate-400 uppercase tracking-wider", isCollapsed ? "px-0 text-center py-2" : "px-3 pt-6 pb-2")}>
                {!isCollapsed && "System"}
              </div>
              <NavItem to="/admin/users" icon={Users} label="Users & Roles" isCollapsed={isCollapsed} />
              <NavItem to="/admin/settings" icon={Settings} label="Global Settings" isCollapsed={isCollapsed} />
            </>
          )}
        </nav>

        {/* Portal Switcher */}
        <div className={cn("p-4 border-t border-slate-200 transition-all duration-300", isCollapsed ? "px-2" : "")}>
          <div className={cn("flex flex-col gap-2", isCollapsed ? "items-center" : "")}>
            <NavLink 
              to="/" 
              className={({ isActive }) => cn(
                "text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 w-full text-center",
                !isFinance && !isAdmin ? "bg-slate-100 text-blue-600" : "text-slate-600",
                isCollapsed && "px-2"
              )}
              title="Claimant Portal"
            >
              {isCollapsed ? <LayoutDashboard className="w-5 h-5 mx-auto" /> : "Claimant Portal"}
            </NavLink>
            {user?.role === 'Admin' && (
              <NavLink 
                to="/admin" 
                className={({ isActive }) => cn(
                  "text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 w-full text-center",
                  isAdmin ? "bg-slate-100 text-blue-600" : "text-slate-600",
                  isCollapsed && "px-2"
                )}
                title="Admin Portal"
              >
                {isCollapsed ? <Settings className="w-5 h-5 mx-auto" /> : "Admin Portal"}
              </NavLink>
            )}
          </div>
        </div>

        {/* Keyboard Shortcut Hint */}
        {!isCollapsed && !isMobile && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-slate-400 justify-center">
              <Keyboard className="w-3 h-3" />
              <span>Alt + S</span>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        {isMobile && (
          <header className="h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
            <button 
              onClick={() => setShowMobileMenu(true)}
              className="p-2 hover:bg-slate-100 rounded-lg"
              aria-label="Open menu"
            >
              <PanelLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{isFinance ? 'ProcureFlow' : isAdmin ? 'Admin' : 'ClaimFlow'}</span>
            </div>
            <button 
              onClick={() => setShowProfileModal(true)}
              className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border-2 border-blue-200"
            >
              {user?.avatar || 'U'}
            </button>
          </header>
        )}

        {/* Desktop Header */}
        {!isMobile && (
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
        )}

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

function NavItem({ to, icon: Icon, label, isCollapsed, highlight }: { to: string, icon: any, label: string, isCollapsed?: boolean, highlight?: boolean }) {
  return (
    <NavLink 
      to={to} 
      end={to === '/' || to === '/finance' || to === '/admin'}
      className={({ isActive }) => cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300",
        isActive 
          ? "bg-blue-50 text-blue-600 font-semibold" 
          : highlight 
            ? "bg-blue-500/10 text-blue-600 font-medium hover:bg-blue-500/20" 
            : "text-slate-600 hover:bg-slate-100 font-medium",
        isCollapsed ? "justify-center px-2" : "",
        isCollapsed && "tooltip"
      )}
      title={isCollapsed ? label : undefined}
      aria-label={isCollapsed ? label : undefined}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}
