/**
 * Auditoria de categorias — trava as distorções encontradas no catálogo real.
 *
 * Cada caso abaixo é um produto que estava classificado errado antes da
 * revisão da taxonomia (julho/2026). As regras avaliam TIPO de produto antes
 * de SABOR/INGREDIENTE, então aromas de fruta em cosméticos e recheios em
 * biscoitos não podem mais puxar o item para hortifruti/carnes.
 */
import { describe, it, expect } from "vitest";
import { classifyCategory, CATEGORY_LABELS, PRODUCT_CATEGORIES } from "@/lib/product-category";

describe("classificação de categorias", () => {
  it("todo slug canônico tem rótulo", () => {
    for (const slug of PRODUCT_CATEGORIES) {
      expect(CATEGORY_LABELS[slug], slug).toBeTruthy();
    }
  });

  const cases: Array<[string, string]> = [
    // cosmético com aroma de fruta não é hortifruti
    ["Kit Hidra Maracujá Tropical Shampoo 300ml + Condicionador 300ml", "cabelo"],
    ["Gelatina Salon Line Melancia 550g", "cabelo"],
    ["Creme Salon Line Kids Hidratação Chiclete 300ml", "cabelo"],
    ["Coloracao Niely Cor & Ton 2.1 Preto Jabuticaba", "cabelo"],
    // limpeza com aroma / apelo de perfume
    ["Lava-Louças Minuano Maçã", "limpeza"],
    ["Amaciante Comfort Lavanda 10x Mais Perfume", "limpeza"],
    ["Limpa Alumínio Politriz Limão 500ml", "limpeza"],
    ["Desinfetante Pinho Sol Limão 500ml", "limpeza"],
    // biscoito com sabor salgado não é carne
    ["Biscoito Club Social Presunto 141g", "biscoitos"],
    ["Bolacha Cream Cracker Manteiga Pack 3x300g", "biscoitos"],
    ["Biscoito Tortinhas Maracujá Marilan 140g", "biscoitos"],
    // higiene bucal ganha categoria própria
    ["Creme Dental Colgate Tandy Uva 50g", "bucal"],
    ["Antisséptico Bucal Listerine Melancia Hortelã 500ml", "bucal"],
    // graxa de sapato não é congelado
    ["TINTA NUGGET LIQUIDO PRETO 60ML", "bazar"],
    ["Incenso No.3 Repelente de Mosquito 30 peças", "bazar"],
    // pele x higiene x perfumaria
    ["Protetor Solar Neutrogena Sun Fresh FPS 70", "cuidados_pele"],
    ["Desodorante Creme Herbíssimo Talco 55g", "higiene"],
    ["Removedor de Esmalte Farmax com Acetona 100ml", "perfumaria"],
    ["Papel Higiênico Mili Folha Tripla 4 rolos 20m", "papel_descartaveis"],
    // alimentos
    ["SARDINHA GOMES DA COSTA COM OLEO 125G", "prontos"],
    ["Miojo Nissin Nosso Sabor Carne 70g", "prontos"],
    ["MOLHO DE TOMATE PREDILECTA TRADICIONAL 300G", "condimentos"],
    ["Tomate Hernandes Grande e Médio 1kg", "hortifruti"],
    ["Arroz Miragina Branco 5kg", "mercearia"],
    ["Salgadinho Cheetos Mix de Queijos 131g", "snacks"],
    ["CAPPUCCINO AVELÃ 3 CORAÇÕES 110G", "bebidas_em_po"],
    ["Creatina Max Titanium 300g", "suplementos"],
    ["Barrage Carrapaticida Veterinário 20ml", "pet"],
    ["Fralda MamyPoko Proteção à Noite", "infantil"],
  ];

  it.each(cases)("%s → %s", (name, expected) => {
    expect(classifyCategory(name)).toBe(expected);
  });
});
