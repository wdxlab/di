import { Injector } from '../injector';
import { Injectable } from './injectable';
import { InjectArg } from './injectArg';

beforeEach(() => Injector.clear());

test('singleton', () => {
  @Injectable({ mode: 'singleton' })
  class Foo {}
  @Injectable({ mode: 'on-demand' })
  class Bar {}
  @Injectable({ mode: 'on-demand' })
  class Baz {
    constructor(
      readonly foo: Foo,
      readonly bar: Bar,
    ) {}
  }

  const baz1 = Injector.instantiate(Baz);
  const baz2 = Injector.instantiate(Baz);

  expect(baz1).toBeInstanceOf(Baz);
  expect(baz2).toBeInstanceOf(Baz);
  expect(baz1).not.toBe(baz2);
  expect(baz1).not.toBe(baz2);
  expect(baz1.foo).toBe(baz2.foo);
  expect(baz1.bar).not.toBe(baz2.bar);
});

test('useFactory', () => {
  @Injectable()
  class Bar {
    constructor(
      @InjectArg('some')
      readonly some: number,
    ) {}
  }

  @Injectable()
  class Foo {
    fooed: boolean = false;

    constructor(readonly bar: Bar) {}

    foo(): void {
      this.fooed = true;
    }
  }

  const foo = Injector.instantiate(Foo, {
    imports: [{ injectable: Bar, provides: { some: 123 } }],
    useFactory(decl) {
      const instance = Injector.instantiate(Foo, decl);
      instance.foo();
      return instance;
    },
  });

  expect(foo.bar.some).toBe(123);
  expect(foo.fooed).toBe(true);
});
