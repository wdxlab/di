import 'reflect-metadata';
import { ArgumentsOf, Func, FunctionPropertyNames } from '../injector';

const methodsMarker = Symbol.for('wdxlab.di.decorators.methods');

export type MethodInfo<T, K extends FunctionPropertyNames<T>> = {
  name: string | symbol;
  descriptor: TypedPropertyDescriptor<(...args: ArgumentsOf<T[K]>) => unknown>;
  options: MethodOptions;
};

type MethodInfoMap = Map<
  string | number | symbol,
  MethodInfo<Record<string, Func>, FunctionPropertyNames<Record<string, Func>>>
>;

export type MethodOptions = {
  meta: Record<string | number | symbol, unknown>;
};

export function Method<T, K extends FunctionPropertyNames<T>>(
  options?: MethodOptions,
): MethodDecorator {
  return (target, key, descriptor) => {
    const existing: MethodInfoMap =
      Reflect.getMetadata(methodsMarker, target.constructor) ?? new Map();

    if (!existing.has(key)) {
      const data: MethodInfo<T, K> = {
        name: key,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        descriptor,
        options: { ...options, meta: { ...options?.meta } },
      };
      existing.set(data.name, data);
    } else if (options?.meta) {
      Object.assign(existing.get(key)!.options.meta, options.meta);
    }

    Reflect.defineMetadata(methodsMarker, existing, target.constructor);
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function getMethods(target: any): MethodInfoMap {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (
    Reflect.getMetadata(
      methodsMarker,
      typeof target === 'function' ? target : target.constructor,
    ) ?? (new Map() as MethodInfoMap)
  );
}

export function getMethodInfo<T, K extends FunctionPropertyNames<T>>(
  target: T,
  methodName: K,
): MethodInfo<T, K> | null {
  // eslint-disable-next-line @typescript-eslint/ban-types
  const methods = getMethods(target);
  return (methods.get(methodName) as MethodInfo<T, K> | undefined) ?? null;
}
