import { ArgumentsOf, FunctionPropertyNames, ReturnTypeOf } from '../injector';
import { Method } from './method';

export type DirectCallHandler<T, K extends FunctionPropertyNames<T>> = (
  next: (...args: ArgumentsOf<T[K]>) => ReturnTypeOf<T, K>,
  ...args: ArgumentsOf<T[K]>
) => ReturnTypeOf<T, K>;

export function OnDirectCall<T, K extends FunctionPropertyNames<T>>(
  handler: DirectCallHandler<T, K>,
): MethodDecorator {
  return (target, key, descriptor) => {
    Method()(target, key, descriptor);

    const original = descriptor.value as (
      ...args: ArgumentsOf<T[K]>
    ) => ReturnTypeOf<T, K>;

    return {
      ...descriptor,
      value: function (this: T, ...args: ArgumentsOf<T[K]>): ReturnTypeOf<T, K> {
        return handler.call(this, original.bind(this), ...args);
      } as (typeof descriptor)['value'],
    };
  };
}
