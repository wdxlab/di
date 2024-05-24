import 'reflect-metadata';

const isInjectableMarker = Symbol.for('wdxlab.di.decorators.injectable');
const injectableOptionsMarker = Symbol.for('wdxlab.di.decorators.injectable.options');

const defaultOptions: InjectableDescription = { mode: 'singleton' };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T> = new (...args: any[]) => T;
export type DynamicInjectable = InjectableDescription & {
  injectable: Constructor<unknown>;
};
export type Mode = 'singleton' | 'on-demand';

export type InjectableDescription = {
  mode?: Mode;
  imports?: Array<DynamicInjectable>;
  provides?: { [key: string | symbol]: unknown };
  useFactory?: ((declaration: InjectableDescription) => unknown) | false;
  useGuard?: ((instance: unknown, declaration: InjectableDescription) => boolean) | false;
};

export function Injectable(description?: InjectableDescription): ClassDecorator {
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

export function getInjectableOptions(
  target: Constructor<unknown>,
): InjectableDescription | null {
  return Reflect.getMetadata(injectableOptionsMarker, target) ?? null;
}
