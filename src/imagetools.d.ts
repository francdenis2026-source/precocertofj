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
declare module "*&url" {
  const src: string;
  export default src;
}
declare module "*&as=picture" {
  const value: {
    sources: Record<string, string>;
    img: { src: string; w: number; h: number };
  };
  export default value;
}
