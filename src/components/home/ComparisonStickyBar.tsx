import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, X, ShoppingBarChart as BarChart, ArrowRight, Trash2 } from 'lucide-react';
import { useComparisonList } from '@/hooks/use-comparison-list';
import { useNavigate } from '@tanstack/react-router';
import { Price } from '@/components/ds/Price';
import { Button } from '@/components/ui/button';

export function ComparisonStickyBar() {
  const { items, removeItem, clear } = useComparisonList();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(items.length > 0);
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl"
        >
          <div className="pc-card bg-surface/90 backdrop-blur-xl border-primary/30 shadow-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
              <div className="flex -space-x-3 items-center mr-2">
                {items.slice(0, 3).map((item, idx) => (
                  <div 
                    key={item.id} 
                    className="h-10 w-10 rounded-xl bg-primary border-2 border-surface flex items-center justify-center text-[10px] font-black"
                    title={item.name}
                  >
                    {item.name.charAt(0)}
                  </div>
                ))}
                {items.length > 3 && (
                  <div className="h-10 w-10 rounded-xl bg-muted border-2 border-surface flex items-center justify-center text-[10px] font-black">
                    +{items.length - 3}
                  </div>
                )}
              </div>
              <div className="shrink-0">
                <p className="text-[11px] font-black uppercase tracking-wider">{items.length} ITENS</p>
                <p className="text-[9px] text-muted-foreground font-bold uppercase">NA LISTA DE COMPARAÇÃO</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={clear}
                className="h-10 w-10 rounded-xl hover:bg-danger/10 hover:text-danger"
                aria-label="Limpar lista"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => navigate({ to: '/comparador' })}
                className="pc-button-primary h-10 px-6 rounded-xl flex items-center gap-2 whitespace-nowrap"
              >
                <Scale className="h-4 w-4" />
                <span>Comparar</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
