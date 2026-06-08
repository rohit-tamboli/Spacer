import React, { useState } from 'react';
import { PlotFilter } from '../types';
import { Search, Menu } from 'lucide-react';

interface PlotStatusFilterProps {
  filter: PlotFilter;
  setFilter: (filter: PlotFilter) => void;
  allPlotsOpacity: number;
  setAllPlotsOpacity: (opacity: number) => void;
}

export default function PlotStatusFilter({ filter, setFilter, allPlotsOpacity, setAllPlotsOpacity }: PlotStatusFilterProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter({
      ...filter,
      search: e.target.value,
    });
  };
  const resetFilters = () => {
    setFilter({
      search: '',
      status: 'all',
      minArea: 0,
      maxArea: 300000,
      minPrice: 0,
      maxPrice: 300000,
      facing: 'all',
      showRed: true,
      showGreen: true,
      showBlue: true,
    });
    setAllPlotsOpacity(0.6);
    setIsMenuOpen(false);
  };

  const menuOptions = [
    { label: 'Red Plots', key: 'showRed' as const, bg: 'bg-red-500' },
    { label: 'Green Plots', key: 'showGreen' as const, bg: 'bg-green-500' },
    { label: 'Blue Plots', key: 'showBlue' as const, bg: 'bg-blue-500' },
  ];

  return (
    <div className="absolute top-4 left-4 z-20">
      <div className="flex gap-2 items-center bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm p-1.5 rounded-xl border border-stone-200 dark:border-stone-800 shadow-lg">
        {/* Search Bar */}
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 w-4 h-4 text-stone-400 dark:text-stone-500" />
          <input
            type="text"
            placeholder="Search plot..."
            value={filter.search}
            onChange={handleSearch}
            className="pl-9 pr-3 py-1.5 rounded-lg text-xs border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-400 w-32"
          />
        </div>

        {/* Toggle All Plots Visibility Button */}
        <button
          onClick={() => setAllPlotsOpacity(allPlotsOpacity === 0 ? 0.6 : 0)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
             allPlotsOpacity === 0 
               ? 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700' 
               : 'bg-stone-800 text-white hover:bg-stone-700'
          }`}
        >
          {allPlotsOpacity === 0 ? "Show All Plots" : "Hide All Plots"}
        </button>

        {/* Hamburger Menu */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm rounded-xl border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden z-30">
          {menuOptions.map((option) => (
            <button
              key={option.key}
              onClick={() => {
                setFilter({ ...filter, [option.key]: !filter[option.key] });
              }}
              className={`flex items-center justify-between gap-2 w-full px-4 py-2 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 ${
                filter[option.key] ? 'text-stone-900 dark:text-white' : 'text-stone-500 dark:text-stone-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${option.bg}`}></div>
                {option.label}
              </div>
              <span>{filter[option.key] ? 'ON' : 'OFF'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
