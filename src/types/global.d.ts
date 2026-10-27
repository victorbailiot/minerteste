export {}; // Evita erro de múltiplas declarações

declare global {
  interface BigInt {
    toJSON(): number;
  }
}
