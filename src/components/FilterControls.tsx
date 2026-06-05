import React from 'react';
import { PlotFilter, Plot } from '../types';
import { Search, SlidersHorizontal, Eye, X, Compass, Columns } from 'lucide-react';

interface FilterControlsProps {
  filter: PlotFilter;
  onChangeFilter: (filter: PlotFilter) => void;
  availableFacings: string[];
  totalCounts: {
    all: number;
    available: number;
    booked: number;
    ongoing: number;
    sold: number;
  };
}

export default function FilterControls({
  filter,
  onChangeFilter,
  availableFacings,
  totalCounts,
}: FilterControlsProps) {

  const handleStatusClick = (status: 'all' | 'available' | 'booked' | 'ongoing' | 'sold') => {
    onChangeFilter({ ...filter, status });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeFilter({ ...filter, search: e.target.value });
  };

  const handleFacingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeFilter({ ...filter, facing: e.target.value });
  };

  const clearFilters = () => {
    onChangeFilter({
      search: '',
      status: 'all',
      minArea: 0,
      maxArea: 30000,
      minPrice: 0,
      maxPrice: 300000,
      facing: 'all',
    });
  };

  // Quick preset area/price bounds
  const handleRangePreset = (minArea: number, maxArea: number) => {
    onChangeFilter({ ...filter, minArea, maxArea });
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200/80 p-5 shadow-lg flex flex-col gap-4">
      {/* Search Input Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-400" />
          <input
            type="text"
            value={filter.search}
            onChange={handleSearchChange}
            placeholder="Search plot number (e.g., A-01, B-03)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 transition-all text-sm"
            id="input-filter-search"
          />
          {filter.search && (
            <button
              onClick={() => onChangeFilter({ ...filter, search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-250 rounded-full"
            >
              <X className="w-3 h-3 text-stone-500" />
            </button>
          )}
        </div>

        {/* Facing Dropdown Filter */}
        <div className="flex items-center gap-2 bg-stone-50/50 border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700">
          <Compass className="w-4 h-4 text-stone-400" />
          <select
            value={filter.facing}
            onChange={handleFacingChange}
            className="bg-transparent focus:outline-none cursor-pointer text-stone-800 font-medium"
            id="select-filter-facing"
          >
            <option value="all">Any Facing Direction</option>
            {availableFacings.map(f => (
              <option key={f} value={f}>{f} Facing</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Tabs: Quick Status Filter buttons */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-stone-100">
        <button
          onClick={() => handleStatusClick('all')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter.status === 'all'
              ? 'bg-stone-900 border border-stone-950 text-white shadow-sm'
              : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200'
          }`}
          id="btn-status-all"
        >
          🌐 View All ({totalCounts.all})
        </button>
        <button
          onClick={() => handleStatusClick('available')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter.status === 'available'
              ? 'bg-green-600 border border-green-700 text-white shadow-sm'
              : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200'
          }`}
          id="btn-status-available"
        >
          🟢 Available ({totalCounts.available})
        </button>
        <button
          onClick={() => handleStatusClick('booked')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter.status === 'booked'
              ? 'bg-red-600 border border-red-700 text-white shadow-sm'
              : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
          }`}
          id="btn-status-booked"
        >
          🔴 Booked ({totalCounts.booked})
        </button>
        <button
          onClick={() => handleStatusClick('ongoing')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter.status === 'ongoing'
              ? 'bg-yellow-500 border border-yellow-600 text-white shadow-sm'
              : 'bg-yellow-55 hover:bg-yellow-100 text-yellow-800 border border-yellow-250'
          }`}
          id="btn-status-ongoing"
        >
          🟡 Reserved ({totalCounts.ongoing})
        </button>
        <button
          onClick={() => handleStatusClick('sold')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter.status === 'sold'
              ? 'bg-stone-500 border border-stone-650 text-white shadow-sm'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300'
          }`}
          id="btn-status-sold"
        >
          ⚫ Sold ({totalCounts.sold})
        </button>

        {/* Clear Filter preset marker */}
        {(filter.search || filter.status !== 'all' || filter.facing !== 'all' || filter.minArea > 0) && (
          <button
            onClick={clearFilters}
            className="ml-auto text-xs text-red-500 hover:text-red-700 font-semibold underline underline-offset-4"
            id="btn-clear-filters"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Preset Area Filter slider tags */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mt-1 text-xs text-stone-500">
        <div className="flex items-center gap-1">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Quick Area Presets:</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleRangePreset(0, 450)}
            className={`px-2.5 py-1 rounded bg-stone-100 cursor-pointer border border-stone-200/50 hover:bg-stone-200 text-[11px] font-medium leading-none ${
              filter.maxArea === 450 ? 'bg-stone-800 text-white hover:bg-stone-800 border-transparent' : ''
            }`}
          >
            Compact &lt; 450 SQ.M
          </button>
          <button
            onClick={() => handleRangePreset(450, 520)}
            className={`px-2.5 py-1 rounded bg-stone-100 cursor-pointer border border-stone-200/50 hover:bg-stone-200 text-[11px] font-medium leading-none ${
              filter.minArea === 450 && filter.maxArea === 520 ? 'bg-stone-800 text-white hover:bg-stone-800 border-transparent' : ''
            }`}
          >
            Standard 450-520 SQ.M
          </button>
          <button
            onClick={() => handleRangePreset(520, 1000)}
            className={`px-2.5 py-1 rounded bg-stone-100 cursor-pointer border border-stone-200/50 hover:bg-stone-200 text-[11px] font-medium leading-none ${
              filter.minArea === 520 ? 'bg-stone-800 text-white hover:bg-stone-800 border-transparent' : ''
            }`}
          >
            Premium 520+ SQ.M
          </button>
        </div>
      </div>
    </div>
  );
}
