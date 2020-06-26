declare module 'posthtml/lib/api' {
  export function match(query: { tag: string }, cb: (node: {
    content: {
      tag: string;
      attrs: Record<string, string>;
    }[]
  }) => unknown): void;
}