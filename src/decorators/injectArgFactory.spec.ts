import { Injector } from '../injector';
import { Injectable } from './injectable';
import { InjectArgFactory } from './injectArgFactory';

beforeEach(() => Injector.clear());

it('should work', () => {
  class Inj {
    constructor(readonly some: number) {}
  }

  @Injectable()
  class Foo {
    constructor(
      @InjectArgFactory((_contextGetter, Target) => new Target(123))
      readonly inj: Inj,
    ) {}
  }

  const foo = Injector.instantiate(Foo);

  expect(foo.inj.some).toBe(123);
});
