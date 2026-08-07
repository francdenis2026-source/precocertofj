import { type ProductGroup } from "@/lib/price-search.functions";
import { Price } from "@/components/ds/Price";
import { Badge } from "@/components/ds/Badge";
import { ProductImage } from "@/components/ds/ProductImage";
import { Clock, Store, TrendingDown, ArrowRight, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

export function PremiumOfferCard({ group, isBest, storeId = "general" }: { group: ProductGroup; isBest?: boolean; storeId?: string }) {
  const bestPrice = group.prices[0];
  const priceChange = group.prices.length > 1 ? (group.prices[0].price - group.prices[1].price) : 0;
  
  return (
    <motion.div
      layout
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Link 
        to="/loja/$id/produto/$slug" 
        params={{ id: bestPrice.marketId || storeId, slug: group.productName.toLowerCase().replace(/\s+/g, '-') }}
        className="group flex flex-col h-full bg-white rounded-3xl border border-gray-100 hover:border-blue-200 overflow-hidden hover:shadow-2xl hover:shadow-blue-600/5 transition-all duration-500 active:scale-[0.98]"
      >
        <div className="relative aspect-square bg-white flex items-center justify-center p-6 sm:p-8">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gray-50/50 scale-90 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <ProductImage 
            name={group.productName} 
            alt={group.productName}
            className="relative z-10 object-contain w-full h-full drop-shadow-md transition-transform duration-700 group-hover:scale-110" 
          />
          
          {isBest && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-xl shadow-lg shadow-green-500/20 border-2 border-white">
              <TrendingDown size={12} strokeWidth={3} />
              Menor Preço
            </div>
          )}

          {priceChange < 0 && (
             <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-xl shadow-lg border-2 border-white">
                <Clock size={10} /> {Math.abs(priceChange).toFixed(0)}% Off
             </div>
          )}
        </div>

        <div className="px-5 pb-6 flex flex-col flex-1">
          <div className="flex-1 mb-4">
            <h3 className="text-sm sm:text-base font-black text-gray-900 leading-[1.3] line-clamp-2 mb-1.5 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
              {group.productName}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate max-w-[120px]">
                <Store className="inline h-3 w-3 mr-1" /> {bestPrice.marketName}
              </span>
              <div className="h-1 w-1 rounded-full bg-gray-200" />
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                OFERTA
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-xs font-black text-blue-600 uppercase">R$</span>
                <span className="text-2xl font-black text-gray-900 leading-none tracking-tighter">
                  {bestPrice.price.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                   {group.prices.length} LOJAS DISPONÍVEIS
                </span>
                <div className="h-8 w-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-600/20 transition-all duration-300">
                  <ArrowRight size={14} strokeWidth={3} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
