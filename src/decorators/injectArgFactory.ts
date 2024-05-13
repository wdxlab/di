/* eslint-disable @typescript-eslint/ban-types */
import 'reflect-metadata';

import { Constructor, InjectableDescription } from './injectable';
import FunctionPropertyNames = jest.FunctionPropertyNames;

const injectionTypeArgMarker = Symbol.for('wdxlab.di.decorators.injection.type');

export type FactoryData = {
  key: number;
  factory: InjectionFactoryFn;
};

export type InjectionFactoryFn = (
  descriptor: InjectableDescription,
  target: Constructor<unknown>,
) => unknown;

export function InjectArgFactory(factory: InjectionFactoryFn): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    const existing: FactoryData[] =
      Reflect.getMetadata(injectionTypeArgMarker, target, propertyKey!) ?? [];

    existing.push({ key: parameterIndex, factory });
    Reflect.defineMetadata(injectionTypeArgMarker, existing, target, propertyKey!);
  };
}

export function getInjectionParamFactories(
  target: Constructor<unknown>,
): Map<number, InjectionFactoryFn>;
export function getInjectionParamFactories<T, K extends FunctionPropertyNames<T>>(
  target: T,
  key: K,
): Map<number, InjectionFactoryFn>;
export function getInjectionParamFactories(
  target: Constructor<unknown> | {},
  key?: string | symbol | number,
): Map<number, InjectionFactoryFn> {
  let params: FactoryData[] = [];

  if (typeof target === 'function') {
    params = Reflect.getMetadata(injectionTypeArgMarker, target) ?? [];
  } else {
    params =
      Reflect.getMetadata(injectionTypeArgMarker, target, key as keyof typeof target) ??
      [];
  }

  return params.reduce((previousValue, { key, factory }) => {
    previousValue.set(key, factory);
    return previousValue;
  }, new Map());
}
