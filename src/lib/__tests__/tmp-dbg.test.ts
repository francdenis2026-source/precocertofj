import { describe, it } from "vitest";
import { classifyProductCategory } from "@/lib/product-category";
describe("x",()=>{it("y",()=>{
for (const n of ["Sequilhos Limão 350g","Milho Verde Olé Copo 120g","Chá Real Hortelã 10g","Creme para Pentear Natu Hair Kids Morango 1kg","Banana Prata kg","Tomate kg","Alface"]) console.log(n,"=>",classifyProductCategory(n));
})});
