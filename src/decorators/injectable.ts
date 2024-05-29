import 'reflect-metadata';

const isInjectableMarker = Symbol.for('wdxlab.di.decorators.injectable');
const injectableOptionsMarker = Symbol.for('wdxlab.di.decorators.injectable.options');

const defaultOptions: InjectableDescription<Constructor<unknown>> = { mode: 'singleton' };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T> = new (...args: any[]) => T;
export type ConstructorResult<T extends Constructor<unknown>> =
  T extends Constructor<infer U> ? U : never;
export type MapToConstructor<T> = T extends [infer U, ...infer V]
  ? [Constructor<U>, ...MapToConstructor<V>]
  : T extends [infer U]
    ? [Constructor<U>]
    : T extends []
      ? []
      : never;
export type DynamicInjectable<T extends Constructor<unknown>> =
  InjectableDescription<T> & {
    injectable: T;
  };
export type Mode = 'singleton' | 'on-demand';

export type InjectableDescription<T extends Constructor<unknown>> = {
  mode?: Mode;
  imports?: Array<DynamicInjectable<Constructor<unknown>>>;
  provides?: { [key: string | symbol]: unknown };
  useFactory?: (declaration: InjectableDescription<T>) => ConstructorResult<T> | null;
  useGuard?: (instance: unknown, declaration: InjectableDescription<T>) => boolean;
};

export function Injectable<T extends Constructor<unknown>>(
  description?: InjectableDescription<T>,
): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(isInjectableMarker, true, target);
    Reflect.defineMetadata(
      injectableOptionsMarker,
      { ...defaultOptions, ...description },
      target,
    );
  };
}

export function isInjectable(target: Constructor<unknown>): boolean {
  return Reflect.hasMetadata(isInjectableMarker, target);
}

export function getInjectableOptions<T extends Constructor<unknown>>(
  target: T,
): InjectableDescription<T> | null {
  return Reflect.getMetadata(injectableOptionsMarker, target) ?? null;
}
