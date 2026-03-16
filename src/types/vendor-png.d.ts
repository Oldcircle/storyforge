declare module "png-chunks-extract" {
  export interface PngChunk {
    name: string;
    data: Uint8Array;
  }

  export default function extract(data: Uint8Array): PngChunk[];
}

declare module "png-chunk-text" {
  const pngText: {
    decode(data: Uint8Array): { keyword: string; text: string };
  };

  export default pngText;
}
