import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Organiza e padroniza as categorias dos produtos em todos os estabelecimentos.
 * Classifica produtos baseados em palavras-chave e define categorias globais.
 */
export const organizeAllProducts = createServerFn({ method: "POST" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const categories = [
      { name: 'Mercearia', keywords: ['arroz', 'feijão', 'açúcar', 'sal', 'óleo', 'macarrão', 'café', 'farinha', 'biscoito', 'bolacha', 'massa', 'molho', 'extrato', 'tempero', 'caldo', 'conserva', 'enlatado', 'snack', 'doce', 'chocolate', 'gelatina', 'pudim', 'sobremesa', 'pipoca', 'cereal', 'matinal', 'farinaceo'] },
      { name: 'Açougue', keywords: ['carne', 'frango', 'linguiça', 'bovino', 'suíno', 'peixe', 'frutos do mar', 'bacon', 'presunto', 'salame', 'mortadela', 'patinho', 'músculo', 'coxão', 'picanha', 'maminha', 'costela', 'cupim', 'pernil', 'lombo', 'sobrecoxa', 'asa', 'peito', 'fígado', 'coração', 'moela'] },
      { name: 'Bebidas', keywords: ['refrigerante', 'suco', 'cerveja', 'vinho', 'água', 'leite', 'bebida', 'energético', 'isotônico', 'refresco', 'chá', 'café pronto', 'achocolatado', 'iogurte', 'danone'] },
      { name: 'Limpeza', keywords: ['detergente', 'sabão', 'amaciante', 'desinfetante', 'cloro', 'água sanitária', 'multiuso', 'limpa', 'lustra', 'alvejante', 'esponja', 'palha de aço', 'pano', 'saco de lixo', 'inseticida', 'ododorizador'] },
      { name: 'Higiene', keywords: ['shampoo', 'condicionador', 'sabonete', 'creme', 'pasta de dente', 'escova', 'absorvente', 'desodorante', 'papel higiênico', 'fralda', 'lenço', 'algodão', 'curativo', 'barbeador', 'lâmina', 'espuma', 'gel', 'perfume', 'colônia'] },
      { name: 'Hortifruti', keywords: ['banana', 'maçã', 'laranja', 'uva', 'limão', 'mamão', 'melancia', 'tomate', 'cebola', 'batata', 'cenoura', 'alface', 'couve', 'fruta', 'verdura', 'legume', 'ovos', 'alho', 'pimentão', 'abóbora', 'chuchu', 'abobrinha', 'beterraba', 'repolho'] },
      { name: 'Padaria', keywords: ['pão', 'bolo', 'torta', 'salgado', 'bisnaguinha', 'torrada', 'rosca', 'sonho', 'quibe', 'coxinha', 'empada', 'esfirra', 'brioche', 'baguete'] },
      { name: 'Laticínios', keywords: ['queijo', 'manteiga', 'margarina', 'requeijão', 'creme de leite', 'leite condensado', 'ricota', 'provolone', 'mussarela', 'prato', 'parmesão', 'iogurte'] },
      { name: 'Infantil', keywords: ['papinha', 'mumu', 'sustagem', 'mucilon', 'neston', 'nan', 'aptamil', 'fralda descartável', 'lenço umedecido'] },
      { name: 'Farmácia', keywords: ['remédio', 'medicamento', 'vitamina', 'suplemento', 'dipirona', 'paracetamol', 'ibuprofeno', 'curativo', 'gaze', 'esparadrapo'] },
      { name: 'Outros', keywords: ['bazar', 'pet', 'racionamento', 'lâmpada', 'pilha', 'bateria', 'papelaria', 'brinquedo'] }
    ];

    let updatedCount = 0;

    for (const cat of categories) {
      const { data, error } = await supabaseAdmin
        .from("product_catalog")
        .update({ category: cat.name })
        .or(cat.keywords.map(k => `display_name.ilike.%${k}%`).join(','))
        .filter('category', 'is', null)
        .select('id');
      
      if (!error) updatedCount += (data as any)?.length || 0;
    }

    // Padronização final para quem já tinha categoria mas escrita diferente
    for (const cat of categories) {
      await supabaseAdmin
        .from("product_catalog")
        .update({ category: cat.name })
        .ilike("category", cat.name);
    }

    return { ok: true, updatedCount };
  });
