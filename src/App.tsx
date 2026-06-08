import React, { useState, useEffect } from 'react';
import { Plot, Booking, PlotFilter } from './types';
import TwoDMap from './components/TwoDMap';
import ThreeDMap from './components/ThreeDMap';
import AdminPanel from './components/AdminPanel';
import AdminPlotCustomizerPopup from './components/AdminPlotCustomizerPopup';
import PlotDetailsPopup from './components/PlotDetailsPopup';
import {
  Landmark,
  Layers,
  Map,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';

export default function App() {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isDetailsPopupOpen, setIsDetailsPopupOpen] = useState<boolean>(false); // Added
  const [showAdminConsole, setShowAdminConsole] = useState<boolean>(false);
  const [layoutSettings, setLayoutSettings] = useState<{ activeLayout: 'demo' | 'custom', lastUpdated?: number }>({ activeLayout: 'custom' });
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [activeAdminShapeEditId, setActiveAdminShapeEditId] = useState<string | null>(null);
  const [isEditingPopupOpen, setIsEditingPopupOpen] = useState<boolean>(true);
  const [popupEditingPreview, setPopupEditingPreview] = useState<{ plotId: string; points: { x: number; y: number }[] } | null>(null);
  const [allPlotsOpacity, setAllPlotsOpacity] = useState<number>(0);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'Spider') {
      setIsAdminUnlocked(true);
      setShowAdminConsole(true);
      setShowPasswordModal(false);
      setPasswordError('');
      setPasswordInput('');
    } else {
      setPasswordError('Invalid Password');
    }
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Search/Filter State
  const [filter, setFilter] = useState<PlotFilter>({
    search: '',
    status: 'all',
    minArea: 0,
    maxArea: 30000,
    minPrice: 0,
    maxPrice: 300000,
    facing: 'all',
    showRed: true,
    showGreen: true,
    showBlue: true,
  });

  const loadData = async () => {
    try {
      const plotsRes = await fetch('/api/plots');
      if (plotsRes.ok) {
        const data = await plotsRes.json();
        setPlots(data);
        
        // Keep selected plot up-to-date with server modifications
        setSelectedPlot(currentSelected => {
          if (currentSelected) {
            const matched = data.find((p: Plot) => p.id === currentSelected.id);
            if (matched) return matched;
          }
          return currentSelected;
        });
      }

      const bookingsRes = await fetch('/api/bookings');
      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data);
      }

      const settingsRes = await fetch('/api/layout/settings');
      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        setLayoutSettings(sData);
      }
    } catch (err) {
      console.error('Error loading data from server:', err);
    }
  };

  useEffect(() => {
    loadData();
    // Short polling for multi-user real-time status updates every 10 seconds
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectPlot = (plot: Plot) => {
    setSelectedPlot(plot);
    setIsDetailsPopupOpen(true);
    setIsEditingPopupOpen(false);
  };

  const handlePlotUpdate = async (updatedPlot: Plot) => {
    setPlots(prev => prev.map(p => p.id === updatedPlot.id ? updatedPlot : p));
    // Optionally:
    // await fetch('/api/plots/' + updatedPlot.id, { method: 'PUT', body: JSON.stringify(updatedPlot) });
  };

  // Status Filter and Search parameters execution
  const filteredPlots = plots.filter((plot) => {
    const searchMatch = filter.search.trim()
      ? plot.plotNumber.toUpperCase().includes(filter.search.toUpperCase().trim())
      : true;

    const statusMatch = filter.status === 'all'
      ? true
      : plot.status === filter.status;

    const colorMatch = 
      (filter.showRed && plot.status === 'booked') ||
      (filter.showGreen && plot.status === 'available') ||
      (filter.showBlue && plot.status === 'sold');
        
    const facingMatch = filter.facing === 'all'
      ? true
      : plot.facing === filter.facing;

    const areaMatch = plot.area >= filter.minArea && plot.area <= filter.maxArea;
    const priceMatch = plot.price >= filter.minPrice && plot.price <= filter.maxPrice;

    if (filter.search.trim()) {
      return searchMatch;
    }

    return statusMatch && colorMatch && facingMatch && areaMatch && priceMatch;
  });

  return (
    <div className="min-h-screen font-sans transition-colors duration-300 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      
      {/* 1. Header Toolbar */}
      <header className="sticky top-0 z-40 border-b transition-colors duration-300 bg-white/80 dark:bg-stone-950/80 border-stone-200 dark:border-stone-800 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-row items-center justify-between gap-3">
          <h1 className="text-lg font-bold tracking-tight">SpacerX</h1>

          {/* Toggle View & controls */}
          <div className="flex items-center flex-wrap gap-2.5">
            
            {/* View Switcher Button [ 2D View ] [ 3D View ] */}
            <div className="bg-stone-100 dark:bg-stone-900 p-1 rounded-xl border border-stone-200/60 dark:border-stone-800 flex gap-0.5">
              <button
                onClick={() => setViewMode('2d')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === '2d'
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
                id="btn-toggle-2d"
              >
                <Layers className="w-3.5 h-3.5" /> 2D
              </button>
              <button
                onClick={() => setViewMode('3d')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === '3d'
                    ? 'bg-white dark:bg-stone-800 text-stone-950 dark:text-white shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
                id="btn-toggle-3d"
              >
                <Map className="w-3.5 h-3.5" /> 3D
              </button>
            </div>

            {/* Admin toggle Button */}
            <button
              onClick={() => {
                if (isAdminUnlocked) {
                  setShowAdminConsole(!showAdminConsole);
                } else {
                  setShowPasswordModal(true);
                }
              }}
              className={`px-3.5 py-2 border rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                isAdminUnlocked
                  ? showAdminConsole
                    ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-300 text-sky-700 dark:text-sky-400 font-bold'
                    : 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 text-indigo-700 dark:text-indigo-400 font-bold'
                  : 'bg-stone-900 hover:bg-stone-800 text-white border-transparent'
              }`}
              id="btn-admin-panel-toggle"
            >
              <div className="w-5 h-5 flex items-center justify-center font-bold text-[10px] bg-white/20 rounded-[4px]">A</div>
            </button>
          </div>
        </div>
        
      </header>

      {/* 2. Main Page Layout Grid Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-8">
        
        {/* Main Explorer Map Section (Always visible) */}
        <div className="w-full flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Map View Container */}
          <div className="flex-1 w-full flex flex-col gap-6">
            
            {/* MAP VIEWER PORTAL */}
            <div className="transition-transform w-full">
              {viewMode === '2d' ? (
                <TwoDMap
                  plots={filteredPlots}
                  selectedPlot={selectedPlot}
                  onSelectPlot={handleSelectPlot}
                  searchQuery={filter.search}
                  activeLayout={layoutSettings.activeLayout}
                  lastUpdated={layoutSettings.lastUpdated}
                  onReloadLayout={loadData}
                  popupEditingPreview={popupEditingPreview}
                  onPlotUpdate={handlePlotUpdate}
                  allPlotsOpacity={allPlotsOpacity}
                  setAllPlotsOpacity={setAllPlotsOpacity}
                  filter={filter}
                  setFilter={setFilter}
                  isAdmin={isAdminUnlocked}
                />
              ) : (
                <ThreeDMap
                  plots={filteredPlots}
                  selectedPlot={selectedPlot}
                  onSelectPlot={handleSelectPlot}
                  searchQuery={filter.search}
                  activeLayout={layoutSettings.activeLayout}
                  popupEditingPreview={popupEditingPreview}
                  allPlotsOpacity={allPlotsOpacity}
                  setAllPlotsOpacity={setAllPlotsOpacity}
                  filter={filter}
                  setFilter={setFilter}
                  isAdmin={isAdminUnlocked}
                />
              )}
            </div>
          </div>

        </div>

        {/* Dynamic Admin console section at the bottom (collapsible inline) */}
        {isAdminUnlocked && showAdminConsole && (
          <div className="transition-all animate-in fade-in slide-in-from-top-4 duration-300 border-t border-stone-200/80 pt-6">
            <AdminPanel
              plots={plots}
              bookings={bookings}
              onPlotsUpdated={setPlots}
              onBookingsUpdated={setBookings}
              onReloadData={loadData}
              activeLayout={layoutSettings.activeLayout}
              isAdminUnlocked={isAdminUnlocked}
              onLock={() => {
                setIsAdminUnlocked(false);
                setShowAdminConsole(false);
              }}
              initialShapeEditingPlotId={activeAdminShapeEditId}
              onClearInitialShapeEditingPlotId={() => setActiveAdminShapeEditId(null)}
              onSelectPlot={handleSelectPlot}
              allPlotsOpacity={allPlotsOpacity}
              onAllPlotsOpacityChange={setAllPlotsOpacity}
            />
          </div>
        )}

      </main>

      {/* Plot Details Popup */}
      {selectedPlot && (
        <PlotDetailsPopup
          plot={selectedPlot}
          isOpen={isDetailsPopupOpen}
          onClose={() => setIsDetailsPopupOpen(false)}
          isAdmin={isAdminUnlocked}
          onEdit={() => {
            setIsDetailsPopupOpen(false);
            setPopupEditingPreview(null);
            setIsEditingPopupOpen(true);
          }}
          onDelete={() => {
            alert('Delete plot functionality coming soon');
          }}
        />
      )}

      {/* Admin Plot Customization Popup Window */}
      {selectedPlot && isAdminUnlocked && isEditingPopupOpen && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full font-sans animate-in slide-in-from-bottom-4 duration-300 shadow-2xl">
          <AdminPlotCustomizerPopup
            key={selectedPlot.id}
            plot={selectedPlot}
            plots={plots}
            onPointsChange={(pts) => {
              setPopupEditingPreview({ plotId: selectedPlot.id, points: pts });
            }}
            onSave={() => {
              loadData();
              setIsEditingPopupOpen(false);
              setPopupEditingPreview(null);
            }}
            onClose={() => {
              setIsEditingPopupOpen(false);
              setPopupEditingPreview(null);
            }}
          />
        </div>
      )}


      {/* 3. Password Input Dialog Modal */}
      {showPasswordModal && (
        <div id="admin-password-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 shadow-xl max-w-sm w-full relative">
            <h3 className="text-base font-bold text-stone-900 dark:text-white mb-1.5">Admin Security Access</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
              Please enter the administrator password to unlock the custom Plot Customization tools.
            </p>

            {passwordError && (
              <div id="admin-password-error" className="mb-4 p-2.5 bg-red-50 dark:bg-red-950/20 text-red-750 dark:text-red-400 text-xs rounded-lg border border-red-200/50 dark:border-red-900/40 font-semibold text-center">
                ⚠️ {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[9.5px] uppercase font-bold tracking-wider text-stone-450 dark:text-stone-500">Security Password</label>
                <input
                  type="password"
                  autoFocus
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter Password"
                  className="w-full p-2.5 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-stone-400 dark:focus:ring-stone-600"
                  id="admin-password-input"
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordInput('');
                    setPasswordError('');
                  }}
                  className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 font-bold text-xs rounded-xl cursor-pointer"
                  id="btn-admin-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-stone-900 hover:bg-stone-850 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm transition-colors animate"
                  id="btn-admin-submit"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
