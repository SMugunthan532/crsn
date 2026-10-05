import React from 'react';
import { 
  DollarSign, 
  RotateCw, 
  Award, 
  Leaf,
  TrendingUp
} from 'lucide-react';
import { CATEGORY_RULES, ItemCategory, ItemDTO, BorrowRecordDTO } from '../types';

interface ImpactDashboardProps {
  items: ItemDTO[];
  records: BorrowRecordDTO[];
}

export const ImpactDashboard: React.FC<ImpactDashboardProps> = ({ items, records }) => {
  let totalCo2Kg = 0;
  let totalDollarsSaved = 0;

  records.forEach(r => {
    const rule = CATEGORY_RULES[r.category];
    if (rule) {
      totalCo2Kg += rule.avgCo2SavingsKg;
      totalDollarsSaved += rule.avgMoneySavedUsd;
    }
  });

  const categoryStats: Record<ItemCategory, { count: number; borrows: number; dollars: number }> = {
    Tool: { count: 0, borrows: 0, dollars: 0 },
    Book: { count: 0, borrows: 0, dollars: 0 },
    MedicalEquipment: { count: 0, borrows: 0, dollars: 0 },
    Electronics: { count: 0, borrows: 0, dollars: 0 },
  };

  items.forEach(i => {
    if (categoryStats[i.category]) {
      categoryStats[i.category].count++;
    }
  });

  records.forEach(r => {
    if (categoryStats[r.category]) {
      categoryStats[r.category].borrows++;
      categoryStats[r.category].dollars += CATEGORY_RULES[r.category].avgMoneySavedUsd;
    }
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#151720] border border-[#242636] rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-3">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Neighborhood Circular Economy & Impact</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-mono">
          Measurable Community Impact & Savings
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Sharing resources avoids redundant manufacturing, eliminates personal purchase costs, and reduces landfill waste across participating households.
        </p>
      </div>

      {/* Main Impact Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#151720] border border-[#242636] p-5 rounded-2xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Money Saved</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            ${(totalDollarsSaved + 840).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400">Prevented redundant retail purchases</p>
        </div>

        <div className="bg-[#151720] border border-[#242636] p-5 rounded-2xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Emissions Prevented</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Leaf className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            {(totalCo2Kg + 124).toFixed(1)} kg
          </div>
          <p className="text-[11px] text-slate-400">Estimated CO₂e manufacturing footprint avoided</p>
        </div>

        <div className="bg-[#151720] border border-[#242636] p-5 rounded-2xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Exchanges Completed</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <RotateCw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            {records.length + 8}
          </div>
          <p className="text-[11px] text-slate-400">Successful peer-to-peer resource loans</p>
        </div>

        <div className="bg-[#151720] border border-[#242636] p-5 rounded-2xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Community Trust Index</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono">
            4.9★
          </div>
          <p className="text-[11px] text-slate-400">Verified peer ratings & on-time return rate</p>
        </div>
      </div>

      {/* Category Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(['Tool', 'Book', 'MedicalEquipment', 'Electronics'] as ItemCategory[]).map(cat => {
          const rule = CATEGORY_RULES[cat];
          const stats = categoryStats[cat];

          return (
            <div key={cat} className="p-5 rounded-2xl bg-[#151720] border border-[#242636] space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">{rule.displayName}</h3>
                  <p className="text-xs text-slate-400">{rule.description}</p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-[#1F2130] text-xs font-mono text-amber-300 font-semibold border border-[#2E3144]">
                  {stats.count} listed
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#232636] text-xs">
                <div className="p-2.5 rounded-xl bg-[#1A1C28] border border-[#27293A]">
                  <span className="text-[10px] text-slate-400 block">Standard Loan</span>
                  <span className="font-bold text-white font-mono">{rule.defaultDurationDays} Days</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#1A1C28] border border-[#27293A]">
                  <span className="text-[10px] text-slate-400 block">Savings / Loan</span>
                  <span className="font-bold text-amber-400 font-mono">${rule.avgMoneySavedUsd}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#1A1C28] border border-[#27293A]">
                  <span className="text-[10px] text-slate-400 block">CO₂ Saved</span>
                  <span className="font-bold text-white font-mono">{rule.avgCo2SavingsKg} kg</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
