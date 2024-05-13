/* eslint-disable @typescript-eslint/ban-types */

import { getMethods } from './decorators';
import {
  Constructor,
  DynamicInjectable,
  getInjectableOptions,
  InjectableDescription,
  isInjectable,
} from './decorators/injectable';
import { getInjectionParamFactories } from './decorators/injectArgFactory';

type Func = (...args: unknown[]) => unknown;
type FunctionProperties<T> = { [K in keyof T as T[K] extends Func ? K : never]: T[K] };
type FunctionPropertyNames<T> = keyof FunctionProperties<T>;

export type DebugInfo = {
  className?: string;
  methodName?: string | number | symbol;
  paramIx?: number;
};

function prepareErrorTextParts(
  TargetClass: Constructor<unknown>,
  info?: DebugInfo,
): string {
  return [
    info?.className || TargetClass.name,
    info?.methodName == null ? '' : `.${String(info.methodName)}`,
    info?.paramIx == null ? '' : `[${info.paramIx}]`,
  ]
    .filter(Boolean)
    .join('');
}

function prepareErrorTargetType(TargetClass: Constructor<unknown>): string {
  return TargetClass?.name || TargetClass?.constructor.name || typeof TargetClass;
}

export class NotInjectableError extends Error {
  constructor(TargetClass: Constructor<unknown>, info?: DebugInfo) {
    const textParts = prepareErrorTextParts(TargetClass, info);
    const targetType = prepareErrorTargetType(TargetClass);

    super(`This class is not injectable (${textParts}: ${targetType})`);
  }
}

export class Injector {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected instanceInjectableDescription = new WeakMap<any, InjectableDescription>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected singletonStorage = new Map<Constructor<unknown>, any>();

  static getInstance(): Injector {
    if (!this.instance) {
      this.instance = new Injector();
    }

    return this.instance;
  }

  static instantiate<T>(
    module: Constructor<T>,
    mergeInjectableDescription?: InjectableDescription,
  ): T {
    return this.getInstance().instantiate(module, mergeInjectableDescription);
  }

  static callMethod<T, K extends FunctionPropertyNames<T>>(
    target: T,
    methodName: K,
    mergeInjectableDescription?: InjectableDescription,
  ): FunctionProperties<T>[K] extends Func
    ? ReturnType<FunctionProperties<T>[K]>
    : never {
    return this.getInstance().callMethod(target, methodName, mergeInjectableDescription);
  }

  static get<T>(clazz: Constructor<T>): T | null {
    return this.getInstance().get(clazz);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fn<T extends (...args: any[]) => unknown>(
    fn: T,
    params: Array<Constructor<unknown> | DynamicInjectable>,
  ): () => ReturnType<T> {
    return this.getInstance().fn(fn, params);
  }

  static clear(): void {
    this.getInstance().instanceInjectableDescription = new WeakMap();
    this.getInstance().singletonStorage.clear();
  }

  protected static instance: Injector;

  protected constructor() {}

  protected instantiate<T>(
    TargetClass: Constructor<T>,
    mergeInjectableDescription?: InjectableDescription,
    debug?: DebugInfo,
  ): T {
    if (!isInjectable(TargetClass)) {
      throw new NotInjectableError(TargetClass, debug);
    }

    const existing = this.getExisting(TargetClass);

    if (existing) {
      return existing;
    }

    let existingInjectableDescription = getInjectableOptions(TargetClass) ?? {
      mode: 'singleton',
      imports: [],
      provides: {},
    };
    const useFactory =
      mergeInjectableDescription?.useFactory ?? existingInjectableDescription.useFactory;

    if (mergeInjectableDescription) {
      existingInjectableDescription = this.mergeInjectableDescriptions(
        existingInjectableDescription,
        mergeInjectableDescription,
      );
    }

    // eslint-disable-next-line init-declarations
    let instance: T;

    if (useFactory) {
      instance = useFactory({
        ...existingInjectableDescription,
        useFactory: false,
      }) as T;
    } else {
      const args = this.resolveArgs(TargetClass, existingInjectableDescription);

      instance = new TargetClass(...args);
    }

    this.instanceInjectableDescription.set(instance, existingInjectableDescription);
    this.handleInstance(TargetClass, instance);

    return instance;
  }

  protected callMethod<T, K extends FunctionPropertyNames<T>>(
    target: T,
    methodName: K,
    mergeInjectableDescription?: InjectableDescription,
  ): FunctionProperties<T>[K] extends Func
    ? ReturnType<FunctionProperties<T>[K]>
    : never {
    const methodInfo = getMethods(target).get(methodName);

    if (!methodInfo) {
      throw new Error(
        `Can't call method without any Method-decorator: ${String(methodName)}`,
      );
    }

    const injectableDescription = this.mergeInjectableDescriptions(
      this.instanceInjectableDescription.get(target),
      mergeInjectableDescription,
    );
    const args = this.resolveArgs(target, methodName, injectableDescription);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return methodInfo.descriptor.value!.call(target, ...args);
  }

  protected get<T>(clazz: Constructor<T>): T | null {
    return this.singletonStorage.get(clazz) ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected fn<T extends (...args: any[]) => any>(
    fn: T,
    params: Array<Constructor<unknown> | DynamicInjectable>,
  ): () => ReturnType<T> {
    return () => {
      const args = params.map((param) => {
        if (typeof param === 'function') {
          return this.instantiate(param);
        }

        return this.instantiate(param.injectable, param);
      });

      return fn(...args);
    };
  }

  protected getParams(clazz: Constructor<unknown>): Constructor<unknown>[];
  protected getParams<T, K extends FunctionPropertyNames<T>>(
    instance: T,
    propertyName: K,
  ): Constructor<unknown>[];

  protected getParams(
    clazzOrInstance: Constructor<unknown> | {},
    propertyName?: string,
  ): Constructor<unknown>[] {
    if (propertyName != null) {
      return (
        Reflect.getMetadata('design:paramtypes', clazzOrInstance, propertyName) ?? []
      );
    }

    return Reflect.getMetadata('design:paramtypes', clazzOrInstance) ?? [];
  }

  protected getExisting<T>(Module: Constructor<T>): T | null {
    const options = getInjectableOptions(Module);

    if (options?.mode === 'singleton') {
      return this.singletonStorage.get(Module) ?? null;
    }

    return null;
  }

  protected handleInstance<T>(Module: Constructor<T>, instance: T): void {
    const options = getInjectableOptions(Module);

    if (options?.mode === 'singleton') {
      this.singletonStorage.set(Module, instance);
    }
  }

  protected resolveArgs(
    Module: Constructor<unknown>,
    mergeInjectableDescription?: InjectableDescription,
  ): Array<unknown>;

  protected resolveArgs<T, K extends FunctionPropertyNames<T>>(
    instance: T,
    methodName: K,
    mergeInjectableDescription?: InjectableDescription,
  ): Array<unknown>;

  protected resolveArgs(
    Module: Constructor<unknown> | {},
    methodName?: string | number | symbol | InjectableDescription,
    mergeInjectableDescription?: InjectableDescription,
  ): Array<unknown> {
    if (methodName && typeof methodName === 'object') {
      mergeInjectableDescription = methodName;
      methodName = undefined;
    }
    const params =
      typeof Module === 'function'
        ? this.getParams(Module as Constructor<unknown>)
        : this.getParams(Module, methodName as keyof typeof Module);
    const injectionFactoryMap =
      typeof Module === 'function'
        ? getInjectionParamFactories(Module as Constructor<unknown>)
        : getInjectionParamFactories(Module, methodName as keyof typeof Module);

    return params.map((p, ix) => {
      const debug: DebugInfo = {
        className: typeof Module === 'function' ? Module.name : Module.constructor.name,
        methodName: methodName,
        paramIx: ix,
      };
      const injectionFactory = injectionFactoryMap.get(ix);
      const injectableDescription = this.mergeInjectableDescriptions(
        this.instanceInjectableDescription.get(p),
        mergeInjectableDescription,
      );

      if (injectionFactory) {
        return injectionFactory(injectableDescription, p);
      }

      const description = injectableDescription.imports?.find(
        (item) => item.injectable === p,
      );

      return this.instantiate(
        p,
        this.mergeInjectableDescriptions(
          { provides: injectableDescription.provides },
          description,
        ),
        debug,
      );
    });
  }

  protected mergeInjectableDescriptions(
    existingInjectableDescription?: InjectableDescription,
    mergeInjectableDescription?: InjectableDescription,
  ): InjectableDescription {
    return {
      imports: [
        ...(mergeInjectableDescription?.imports ?? []),
        ...(existingInjectableDescription?.imports ?? []),
      ],
      provides: {
        ...existingInjectableDescription?.provides,
        ...mergeInjectableDescription?.provides,
      },
      useFactory: mergeInjectableDescription?.useFactory,
    };
  }
}
