import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isValidCpf } from "./cpf";

const PromoSchema = z.object({
  fullName: z.string().min(3, "Nome muito curto"),
  cpf: z.string().refine(isValidCpf, "CPF inválido"),
  phone: z.string().min(10, "Telefone inválido"),
  email: z.string().email("E-mail inválido"),
  fileBase64: z.string(),
  fileName: z.string(),
});

export type PromoStatus = "enviada" | "em_analise" | "aceita" | "recusada";

export interface PromoSubmission {
  id: string;
  fullName: string;
  cpf: string;
  status: PromoStatus;
  createdAt: string;
  fileName: string;
}

/**
 * Envia uma nota fiscal para análise via sistema de e-mail da plataforma.
 */
export const submitPromoReceipt = createServerFn({ method: "POST" })
  .validator((data: unknown) => PromoSchema.parse(data))
  .handler(async ({ data }) => {
    // Em um cenário real, salvaríamos no banco de dados e no Storage.
    console.log(`[Promo] Nova nota fiscal recebida de ${data.fullName} (${data.email})`);
    
    // Simulação de delay de rede
    await new Promise(r => setTimeout(r, 1200));

    return { 
      success: true, 
      message: "Nota fiscal enviada com sucesso! Nossa equipe irá analisar e você receberá um e-mail em breve." 
    };
  });

/**
 * Mock de busca de status de notas enviadas.
 * Em um cenário real, buscaria no banco de dados filtrando pelo CPF ou UserID.
 */
export const getMyPromoSubmissions = createServerFn({ method: "GET" })
  .validator((cpf: string) => z.string().parse(cpf))
  .handler(async ({ data: cpf }) => {
    // Retornando dados mockados para demonstração da nova funcionalidade
    return [
      {
        id: "1",
        fullName: "Usuário Teste",
        cpf: cpf,
        status: "aceita",
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        fileName: "nota_fiscal_mercado_1.pdf"
      },
      {
        id: "2",
        fullName: "Usuário Teste",
        cpf: cpf,
        status: "em_analise",
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        fileName: "nota_2.jpg"
      }
    ] as PromoSubmission[];
  });
