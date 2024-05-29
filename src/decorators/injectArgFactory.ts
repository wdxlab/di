/* eslint-disable @typescript-eslint/ban-types */
import 'reflect-metadata';

import { Constructor, ConstructorResult, InjectableDescription } from './injectable';
import FunctionPropertyNames = jest.FunctionPropertyNames;

const injectionTypeArgMarker = Symbol.for('wdxlab.di.decorators.injection.type');

type FactoryData<T extends Constructor<unknown>> = {
  key: number;
  factory: InjectionFactoryFn<T>;
};

export type InjectionFactoryFn<T extends Constructor<unknown>> = (
  descriptor: InjectableDescription<T>,
  target: T,
) => unknown;

export function InjectArgFactory<T extends Constructor<unknown>>(
  factory: InjectionFactoryFn<T>,
): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    const existing: FactoryData<T>[] =
      Reflect.getMetadata(injectionTypeArgMarker, target, propertyKey!) ?? [];

    existing.push({ key: parameterIndex, factory });
    Reflect.defineMetadata(injectionTypeArgMarker, existing, target, propertyKey!);
  };
}

export function getInjectionParamFactories(
  target: Constructor<unknown>,
): Map<number, InjectionFactoryFn<Constructor<unknown>>>;
export function getInjectionParamFactories<T, K extends FunctionPropertyNames<T>>(
  target: T,
  key: K,
): Map<number, InjectionFactoryFn<Constructor<unknown>>>;
export function getInjectionParamFactories<T extends Constructor<unknown>>(
  target: T | ConstructorResult<T>,
  key?: string | symbol | number,
): Map<number, InjectionFactoryFn<Constructor<unknown>>> {
  let params: FactoryData<Constructor<unknown>>[] = [];

  if (typeof target === 'function') {
    params = Reflect.getMetadata(injectionTypeArgMarker, target) ?? [];
  } else {
    params =
      Reflect.getMetadata(injectionTypeArgMarker, target as T, key as string) ?? [];
  }

  return params.reduce((previousValue, { key, factory }) => {
    previousValue.set(key, factory);
    return previousValue;
  }, new Map());
}
