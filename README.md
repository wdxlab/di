# @WDXLab/DI

Dependency Injection for TypeScript

[![npm version](https://badge.fury.io/js/%40wdxlab%2Fdi.svg)](https://badge.fury.io/js/%40wdxlab%2Fdi)

## Installation

```sh
npm install @wdxlab/di --save
```

## Usage

**tsconfig.json**
```json5
{
  "compilerOptions": {
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  },
}
```

Simple example:

```ts
import {Injector, Injectable} from "@wdxlab/di";

@Injectable()
class Foo {
    sum(a: number, b: number) {
        return a + b;
    }
}

@Injectable()
class Bar {
    constructor(protected foo: Foo) {}

    sum(a: number, b: number) {
        return this.foo.sum(a, b);
    }
}

const injector = new Injector();
const bar = injector.instantiate(Bar);

console.log(bar.sum(1, 2)); // 3
```

**‼️ TODO: describe docs below ‼️**

## Methods

### instantiate(module, description?)
### callMethod(target, methodName, description?)
### get(clazz)
### fn(fn, params)
### clear()

## Decorators

### Injectable(description?)

Class decorator

#### isInjectable(target)
#### getInjectableOptions(target)

### InjectArg(name)

Parameter decorator

### InjectArgFactory(factory)

Parameter decorator

#### getInjectionParamFactories(target, key?)

### Method(meta?)

Method decorator

#### getMethods(target)
