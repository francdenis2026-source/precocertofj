declare module "*&as=srcset" {
  const src: string;
  export default src;
}
declare module "*?format=avif" {
  const src: string;
  export default src;
}
declare module "*?format=webp" {
  const src: string;
  export default src;
}
declare module "*&as=picture" {
  type PictureSource = { src: string; srcset?: string; w?: number; h?: number };
  const value: {
    sources: Record<string, string>;
    img: { src: string; w: number; h: number };
  };
  export default value;
}
