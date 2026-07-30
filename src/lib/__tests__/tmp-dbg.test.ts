import { describe, it } from "vitest";
import { classifyCategory } from "@/lib/product-category";
describe("x",()=>{it("y",()=>{
for (const n of ["Sequilhos Limão 350g","Milho Verde Olé Copo 120g","Chá Real Hortelã 10g","Creme para Pentear Natu Hair Kids Morango 1kg","Banana Prata kg","Tomate kg","Alface","Cebola kg","Batata inglesa 1kg","Cheiro verde maço","Maçã Fuji un"]) console.log(n,"=>",classifyCategory(n));
})});
