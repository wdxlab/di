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

  const baz1 = Injector.instantiate(Baz)!;
  const baz2 = Injector.instantiate(Baz)!;

  expect(baz1).toBeInstanceOf(Baz);
  expect(baz2).toBeInstanceOf(Baz);
  expect(baz1).not.toBe(baz2);
  expect(baz1).not.toBe(baz2);
  expect(baz1.foo).toBe(baz2.foo);
  expect(baz1.bar).not.toBe(baz2.bar);
});

describe('useFactory', () => {
  it('should work', () => {
    @Injectable()
    class Bar {
      constructor(readonly some: number) {}
    }

    @Injectable<typeof Foo>({
      useFactory(decl) {
        const instance = new Foo(new Bar(decl.provides?.forBar as number));
        instance.foo();
        return instance;
      },
    })
    class Foo {
      fooed: boolean = false;

      constructor(readonly bar: Bar) {}

      foo(): void {
        this.fooed = true;
      }
    }

    const foo = Injector.instantiate(Foo, {
      provides: {
        forBar: 123,
      },
    })!;

    expect(foo.bar.some).toBe(123);
    expect(foo.fooed).toBe(true);
  });

  it('should return null if no instance', () => {
    @Injectable()
    class Bar {
      constructor(readonly some: number) {}
    }

    @Injectable<typeof Foo>({
      useFactory(decl) {
        if (decl.provides?.ok) {
          const instance = new Foo(new Bar(decl.provides?.forBar as number));
          instance.foo((decl.provides?.ok as string | undefined) ?? '');
          return instance;
        }

        return null;
      },
    })
    class Foo {
      fooed: string = '';

      constructor(readonly bar: Bar) {}

      foo(value: string): void {
        this.fooed = value;
      }
    }

    expect(
      Injector.instantiate(Foo, {
        imports: [{ injectable: Bar, provides: { some: 123 } }],
      }),
    ).toBeNull();

    const foo = Injector.instantiate(Foo, {
      provides: { ok: 'ok', forBar: 123 },
    })!;

    expect(foo.bar.some).toBe(123);
    expect(foo.fooed).toBe('ok');
  });
});

test('useGuard', () => {
  @Injectable()
  class Bar {
    constructor(
      @InjectArg('some')
      readonly some: number,
    ) {}
  }

  @Injectable<typeof Foo>({
    useGuard(exising, decl) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return counter < 2 || !!(exising && decl.provides?.ok);
    },
  })
  class Foo {
    fooed: boolean = false;

    constructor(readonly bar: Bar) {}

    foo(): void {
      this.fooed = true;
    }
  }

  let counter = 0;
  const foo = Injector.instantiate(Foo, {
    imports: [{ injectable: Bar, provides: { some: 123 } }],
  })!;

  counter++;
  expect(Injector.instantiate(Foo)).toStrictEqual(foo);

  counter++;
  expect(Injector.instantiate(Foo)).toStrictEqual(null);
  expect(Injector.instantiate(Foo)).toStrictEqual(null);

  counter = 1;
  expect(Injector.instantiate(Foo)).toStrictEqual(foo);

  counter = 2;
  expect(Injector.instantiate(Foo, { provides: { ok: false } })).toStrictEqual(null);
  expect(Injector.instantiate(Foo, { provides: { ok: true } })).toStrictEqual(foo);
});
