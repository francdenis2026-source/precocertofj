import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PromoSchema = z.object({
  fullName: z.string().min(3),
  cpf: z.string().min(11).max(14),
  phone: z.string().min(10),
  email: z.string().email(),
  fileBase64: z.string(),
  fileName: z.string(),
});

/**
 * Envia uma nota fiscal para análise via sistema de e-mail da plataforma.
 */
export const submitPromoReceipt = createServerFn({ method: "POST" })
  .validator((data: unknown) => PromoSchema.parse(data))
  .handler(async ({ data }) => {
    // Em um cenário real, salvaríamos no Storage e enviaríamos o e-mail.
    // Como estamos simulando a integração, vamos apenas logar e retornar sucesso.
    console.log(`[Promo] Nova nota fiscal recebida de ${data.fullName} (${data.email})`);
    
    // Simulação de delay de rede
    await new Promise(r => setTimeout(r, 1200));

    return { 
      success: true, 
      message: "Nota fiscal enviada com sucesso! Nossa equipe irá analisar e você receberá um e-mail em breve." 
    };
  });
