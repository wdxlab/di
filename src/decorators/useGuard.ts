import 'reflect-metadata';
import { Constructor, InjectableDescription } from './injectable';
import { ArgumentsOf, FunctionPropertyNames } from '../injector';
import { Method } from './method';

const useGuardMarker = Symbol.for('wdxlab.di.decorators.methods.useGuard');

export type MethodGuard<T, K extends FunctionPropertyNames<T>> = (
  instance: T,
  args: ArgumentsOf<T[K]>,
  decl: InjectableDescription<Constructor<T>>,
) => boolean;

export function UseGuard<T, K extends FunctionPropertyNames<T>>(
  guard: MethodGuard<T, K>,
): MethodDecorator {
  return (target, key, descriptor) => {
    Method()(target, key, descriptor);

    let existing = Reflect.getMetadata(useGuardMarker, target.constructor, key) as
      | MethodGuard<T, K>[]
      | undefined;

    if (!existing) {
      existing = [];
      Reflect.defineMetadata(useGuardMarker, existing, target.constructor, key);
    }

    existing.unshift((instance, args, decl) => guard(instance, args, decl));
  };
}

export function getGuards<T, K extends FunctionPropertyNames<T>>(
  target: T,
  key: K,
): MethodGuard<T, K>[] {
  return (
    (Reflect.getMetadata(
      useGuardMarker,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      typeof target === 'function' ? target : target.constructor,
      key as K,
    ) as MethodGuard<T, K>[]) ?? []
  );
}
