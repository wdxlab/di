/* eslint-disable @typescript-eslint/ban-types */

import { ConstructorResult, getMethodInfo, MapToConstructor } from './decorators';
import {
  Constructor,
  DynamicInjectable,
  getInjectableOptions,
  InjectableDescription,
  isInjectable,
} from './decorators/injectable';
import { getInjectionParamFactories } from './decorators/injectArgFactory';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Func = (...args: any[]) => any;
export type FunctionProperties<T> = {
  [K in keyof T as T[K] extends Func ? K : never]: T[K];
};
export type FunctionPropertyNames<T> = keyof FunctionProperties<T>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ArgumentsOf<T> = T extends (...args: infer A) => any ? A : never;
export type ReturnTypeOf<
  T,
  K extends FunctionPropertyNames<T>,
> = FunctionProperties<T>[K] extends Func ? ReturnType<FunctionProperties<T>[K]> : never;

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
  protected instanceInjectableDescription = new WeakMap<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any,
    InjectableDescription<Constructor<unknown>>
  >();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected singletonStorage = new Map<Constructor<unknown>, any>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instantiate<T extends Constructor<any>>(
    TargetClass: T,
    mergeInjectableDescription?: InjectableDescription<T>,
    debug?: DebugInfo,
  ): ConstructorResult<T> | null {
    if (!isInjectable(TargetClass)) {
      throw new NotInjectableError(TargetClass, debug);
    }

    let existingInjectableDescription = getInjectableOptions(TargetClass) ?? {
      mode: 'singleton',
      imports: [],
      provides: {},
    };
    const useFactory = existingInjectableDescription.useFactory;
    const useGuard = existingInjectableDescription.useGuard;

    if (mergeInjectableDescription) {
      existingInjectableDescription = this.mergeInjectableDescriptions(
        existingInjectableDescription,
        mergeInjectableDescription,
      );
    }

    const existing = this.getExisting(TargetClass);

    if (existing) {
      if (useGuard) {
        if (useGuard(existing, existingInjectableDescription)) {
          return existing;
        }

        return null;
      }

      return existing;
    }

    if (useGuard) {
      if (!useGuard(null, existingInjectableDescription)) {
        return null;
      }
    }

    let instance: ConstructorResult<T> | null;

    if (useFactory) {
      instance = useFactory({
        ...existingInjectableDescription,
      });

      if (instance === null) {
        return null;
      }
    } else {
      const args = this.resolveArgs(TargetClass, existingInjectableDescription);
      instance = new TargetClass(...args);
    }

    this.instanceInjectableDescription.set(instance, existingInjectableDescription);
    this.handleInstance(TargetClass, instance);

    return instance;
  }

  callMethod<T, K extends FunctionPropertyNames<T>>(
    target: T,
    methodName: K,
    mergeInjectableDescription?: InjectableDescription<Constructor<T>>,
  ): FunctionProperties<T>[K] extends Func
    ? ReturnType<FunctionProperties<T>[K]> | null
    : never {
    const methodInfo = getMethodInfo(target, methodName);

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

    if (methodInfo?.options?.useGuard) {
      if (!methodInfo.options.useGuard(target, args, injectableDescription)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return null as any;
      }
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return methodInfo.descriptor.value!.call(target, ...args);
  }

  get<T>(clazz: Constructor<T>): T | null {
    return this.singletonStorage.get(clazz) ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn<T extends (...args: any[]) => any>(
    fn: T,
    params: Array<Constructor<unknown> | DynamicInjectable<Constructor<unknown>>>,
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

  getParams<T extends Constructor<unknown>>(
    clazz: T,
  ): MapToConstructor<ConstructorParameters<T>>;
  getParams<T, K extends FunctionPropertyNames<T>>(
    instance: T,
    propertyName: K,
  ): Constructor<unknown>[];

  getParams(
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

  resolveArgs<T extends Constructor<unknown>>(
    Module: T,
    mergeInjectableDescription?: InjectableDescription<Constructor<unknown>>,
  ): ConstructorParameters<T>;
  resolveArgs<T, K extends FunctionPropertyNames<T>>(
    instance: T,
    methodName: K,
    mergeInjectableDescription?: InjectableDescription<Constructor<T>>,
  ): ArgumentsOf<T[K]>;
  resolveArgs<T extends Constructor<unknown>>(
    Module: T | ConstructorResult<T>,
    methodName?: string | number | symbol | InjectableDescription<Constructor<unknown>>,
    mergeInjectableDescription?: InjectableDescription<Constructor<unknown>>,
  ): Array<unknown> {
    if (methodName && typeof methodName === 'object') {
      mergeInjectableDescription = methodName;
      methodName = undefined;
    }
    const params =
      typeof Module === 'function'
        ? this.getParams(Module as T)
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.getParams(Module, methodName as any);
    const injectionFactoryMap =
      typeof Module === 'function'
        ? getInjectionParamFactories(Module as T)
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          getInjectionParamFactories(Module, methodName as any);

    return params.map((p, ix) => {
      const debug: DebugInfo = {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
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

  clear(): void {
    this.instanceInjectableDescription = new WeakMap();
    this.singletonStorage.clear();
  }

  protected getExisting<T extends Constructor<unknown>>(
    Module: T,
  ): ConstructorResult<T> | null {
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

  protected mergeInjectableDescriptions(
    existingInjectableDescription?: InjectableDescription<Constructor<unknown>>,
    mergeInjectableDescription?: InjectableDescription<Constructor<unknown>>,
  ): InjectableDescription<Constructor<unknown>> {
    return {
      imports: [
        ...(mergeInjectableDescription?.imports ?? []),
        ...(existingInjectableDescription?.imports ?? []),
      ],
      provides: {
        ...existingInjectableDescription?.provides,
        ...mergeInjectableDescription?.provides,
      },
      useFactory: existingInjectableDescription?.useFactory,
      useGuard: existingInjectableDescription?.useGuard,
    };
  }
}
