import React from 'react';
import {
  ArrowUpRight,
  Utensils,
  Car,
  ShoppingBag,
  Coffee,
  Tag,
  CreditCard,
  DollarSign,
  Wallet,
  MoreHorizontal,
  Folder,
} from 'lucide-react';
import { TopCategoryTileItem } from '../../services/moneyDerivedStats';
import { useTranslation } from '../../services/i18n';
import { triggerHaptic } from '../../services/motion';

interface TopCategoryTilesProps {
  tiles: TopCategoryTileItem[];
  onSelectCategory: (categoryId: string) => void;
  onSelectIncome: () => void;
  className?: string;
}

// Icon helper with graceful fallback
const CategoryIcon: React.FC<{ iconName: string; className?: string }> = ({ iconName, className = 'w-4 h-4' }) => {
  const norm = iconName.toLowerCase();
  if (norm.includes('food') || norm.includes('utensil') || norm.includes('restaurant')) return <Utensils className={className} />;
  if (norm.includes('car') || norm.includes('transport') || norm.includes('fuel')) return <Car className={className} />;
  if (norm.includes('shop') || norm.includes('bag')) return <ShoppingBag className={className} />;
  if (norm.includes('coffee') || norm.includes('cafe')) return <Coffee className={className} />;
  if (norm.includes('wallet')) return <Wallet className={className} />;
  if (norm.includes('dollar') || norm.includes('money')) return <DollarSign className={className} />;
  if (norm.includes('card') || norm.includes('credit')) return <CreditCard className={className} />;
  if (norm.includes('more') || norm.includes('other')) return <MoreHorizontal className={className} />;
  if (norm.includes('tag')) return <Tag className={className} />;
  return <Folder className={className} />;
};

export const TopCategoryTiles: React.FC<TopCategoryTilesProps> = ({
  tiles,
  onSelectCategory,
  onSelectIncome,
  className = '',
}) => {
  const { t } = useTranslation();

  const displayTiles = tiles.slice(0, 3);

  return (
    <div className={`grid grid-cols-2 gap-2.5 ${className}`}>
      {/* 3 Top Category GlassTiles */}
      {displayTiles.map(tile => (
        <button
          key={tile.id}
          onClick={() => {
            triggerHaptic('light');
            onSelectCategory(tile.id);
          }}
          className="relative h-[92px] p-3 rounded-[18px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08]  flex flex-col justify-between text-start active:scale-95 transition-all tap-target group"
        >
          {/* Top Row: Icon on Start, 32px Glass Arrow Button on End */}
          <div className="flex items-center justify-between w-full">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] text-[var(--text-1)] border border-white/10 group-hover:scale-105 transition-transform">
              <CategoryIcon iconName={tile.icon} className="w-4 h-4" />
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.05] group-hover:bg-white/[0.12] text-[var(--text-2)] group-hover:text-[var(--text-1)] border border-white/10 transition-colors">
              <ArrowUpRight className="w-4 h-4 rtl:rotate-90" />
            </div>
          </div>

          {/* Bottom: Name 15px/500 */}
          <span className="text-[15px] font-medium text-[var(--text-1)] truncate w-full">
            {tile.name}
          </span>
        </button>
      ))}

      {/* 1 Glowing Accent Income Tile */}
      <button
        onClick={() => {
          triggerHaptic('light');
          onSelectIncome();
        }}
        className="relative h-[92px] p-3 rounded-[18px] flex flex-col justify-between text-start active:scale-95 transition-all tap-target group"
        style={{
          background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
          boxShadow: '0 0 24px rgb(var(--accent-rgb)/.5)',
          color: 'var(--on-accent, #0B0F17)',
        }}
      >
        {/* Top Row: Dollar/Income Icon + White Arrow */}
        <div className="flex items-center justify-between w-full">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-black/15 text-inherit border border-black/10 group-hover:scale-105 transition-transform">
            <DollarSign className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/25 group-hover:bg-white/40 text-inherit border border-white/30 transition-colors">
            <ArrowUpRight className="w-4 h-4 stroke-[2.5] rtl:rotate-90" />
          </div>
        </div>

        {/* Bottom: Name 15px/500 */}
        <span className="text-[15px] font-medium text-inherit truncate w-full">
          {t('finance.incomeTile', 'Income')}
        </span>
      </button>
    </div>
  );
};
