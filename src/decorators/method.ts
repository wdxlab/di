import 'reflect-metadata';
import { InjectableDescription } from './injectable';
import { ArgumentsOf, Func, FunctionPropertyNames, ReturnTypeOf } from '../injector';

const methodsMarker = Symbol.for('wdxlab.di.decorators.methods');

export type MethodInfo<T, K extends FunctionPropertyNames<T>> = {
  name: string;
  descriptor: TypedPropertyDescriptor<(...args: ArgumentsOf<T[K]>) => unknown>;
  options?: MethodOptions<T, K>;
};

type MethodInfoMap = Map<
  string | number | symbol,
  MethodInfo<Record<string, Func>, FunctionPropertyNames<Record<string, Func>>>
>;

export type MethodGuard<T, K extends FunctionPropertyNames<T>> = (
  instance: T,
  args: ArgumentsOf<T[K]>,
  decl: InjectableDescription,
) => boolean;
export type MethodOptions<T, K extends FunctionPropertyNames<T>> = {
  useGuard?: MethodGuard<T, K>;
  onDirectCall?: (...args: ArgumentsOf<T[K]>) => ReturnTypeOf<T, K>;
  meta?: unknown;
};

export function Method<T, K extends FunctionPropertyNames<T>>(
  options?: MethodOptions<T, K>,
): MethodDecorator {
  return (target, key, descriptor) => {
    const data: MethodInfo<T, K> = {
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

    if (options?.onDirectCall) {
      return {
        ...descriptor,
        value: function (...args: ArgumentsOf<T[K]>): unknown {
          return options.onDirectCall!.call(this, ...args);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    }

    return;
  };
}

export function getMethods(target: unknown): MethodInfoMap {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return Reflect.getMetadata(methodsMarker, target as {}) ?? (new Map() as MethodInfoMap);
}

export function getMethodInfo<T, K extends FunctionPropertyNames<T>>(
  target: T,
  methodName: K,
): MethodInfo<T, K> | null {
  // eslint-disable-next-line @typescript-eslint/ban-types
  const methods = getMethods(target);
  return (methods.get(methodName) as MethodInfo<T, K> | undefined) ?? null;
}
