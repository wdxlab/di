import 'reflect-metadata';

const methodsMarker = Symbol.for('wdxlab.di.decorators.methods');

export type MethodInfo = {
  name: string;
  descriptor: TypedPropertyDescriptor<(...args: unknown[]) => unknown>;
  meta?: unknown;
};

export type MethodInfoMap = Map<string | number | symbol, MethodInfo>;

export function Method(meta?: unknown): MethodDecorator {
  return (target, key, descriptor) => {
    const data: MethodInfo = {
      name: key as string,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      descriptor: descriptor,
      meta,
    };
    const existing: MethodInfoMap =
      Reflect.getMetadata(methodsMarker, target) ?? new Map();
    existing.set(data.name, data);
    Reflect.defineMetadata(methodsMarker, existing, target);
  };
}

export function getMethods(target: unknown): MethodInfoMap {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return Reflect.getMetadata(methodsMarker, target as {}) ?? (new Map() as MethodInfoMap);
}
