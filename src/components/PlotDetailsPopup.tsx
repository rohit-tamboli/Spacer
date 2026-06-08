import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, AreaChart, Ruler, Tag, FileText } from 'lucide-react';
import { Plot } from '../types';

interface PlotDetailsPopupProps {
  plot: Plot;
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function PlotDetailsPopup({ plot, isOpen, onClose, isAdmin, onEdit, onDelete }: PlotDetailsPopupProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            className="relative bg-[#1e1b4b] border border-indigo-900 rounded-3xl p-6 shadow-2xl max-w-md w-full text-stone-100 overflow-hidden"
          >
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-indigo-800/50 hover:bg-indigo-700/50 rounded-full transition-colors"
            >
              <X size={20} className="text-white" />
            </button>

            {/* Content */}
            <h2 className="text-2xl font-bold mb-1">Plot Details</h2>
            <p className="text-indigo-200 text-sm mb-6">{plot.location} - {plot.plotNumber}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <DetailItem icon={MapPin} label="Status" value={plot.status.toUpperCase()} />
              <DetailItem icon={AreaChart} label="Area" value={`${plot.area} SQ.M`} />
              <DetailItem icon={Ruler} label="Facing" value={plot.facing} />
              <DetailItem icon={Tag} label="Road Width" value={`${plot.roadWidth} FT`} />
            </div>

            <div className="bg-indigo-900/30 p-4 rounded-xl mb-6">
              <div className="flex items-center gap-2 mb-2 text-indigo-300">
                <FileText size={16} />
                <span className="text-xs font-semibold uppercase tracking-wider">Description</span>
              </div>
              <p className="text-sm text-stone-200">
                {plot.description || 'No description available.'}
              </p>
            </div>

            {isAdmin && (
              <div className="flex gap-3 pt-4 border-t border-indigo-800">
                <button
                  onClick={onEdit}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm text-white transition-all"
                >
                  Edit Plot
                </button>
                <button
                  onClick={onDelete}
                  className="flex-1 py-2 rounded-xl bg-red-900/50 hover:bg-red-800/50 text-red-200 font-bold text-sm transition-all"
                >
                  Delete
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="bg-indigo-900/40 p-3 rounded-xl border border-indigo-800/50">
      <div className="flex items-center gap-2 text-indigo-300 mb-1">
        <Icon size={14} />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
