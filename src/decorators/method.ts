import 'reflect-metadata';
import { InjectableDescription } from './injectable';

const methodsMarker = Symbol.for('wdxlab.di.decorators.methods');

export type MethodInfo<T, A extends readonly unknown[]> = {
  name: string;
  descriptor: TypedPropertyDescriptor<(...args: A) => unknown>;
  options?: MethodOptions<T, A>;
};

type MethodInfoMap = Map<string | number | symbol, MethodInfo<unknown, unknown[]>>;

export type MethodGuard<T, A extends readonly unknown[]> = (
  instance: T,
  args: A,
  decl: InjectableDescription,
) => boolean;
export type MethodOptions<T, A extends readonly unknown[]> = {
  useGuard?: MethodGuard<T, A>;
  meta?: unknown;
};

export function Method<T, A extends readonly unknown[]>(
  options?: MethodOptions<T, A>,
): MethodDecorator {
  return (target, key, descriptor) => {
    const data: MethodInfo<T, A> = {
      name: key as string,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      descriptor: descriptor,
      options,
    };
    const existing: MethodInfoMap =
      Reflect.getMetadata(methodsMarker, target) ?? new Map();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    existing.set(data.name, data as any);
    Reflect.defineMetadata(methodsMarker, existing, target);
  };
}

export function getMethods(target: unknown): MethodInfoMap {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return Reflect.getMetadata(methodsMarker, target as {}) ?? (new Map() as MethodInfoMap);
}
