import { getMethods, Method } from './method';
import { Injector } from '../injector';
import { InjectArg } from './injectArg';

it('should work', () => {
  class Foo {
    fooMethod(): void {}

    @Method()
    barMethod(): void {}

    @Method({ meta: 'meta' })
    bazMethod(): void {}

    @Method<Foo, []>({
      useGuard: (instance, args, decl) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return instance.fooMethod && args[1] === 'ok' && decl.provides?.ok === true;
      },
    })
    guardedMethod(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      @InjectArg('foo') foo: undefined,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      @InjectArg('bar') bar: unknown,
    ): number {
      return 123;
    }
  }

  const foo = new Foo();
  const methods = getMethods(foo);

  expect(Injector.callMethod(foo, 'guardedMethod')).toBe(null);
  expect(
    Injector.callMethod(foo, 'guardedMethod', {
      provides: { foo: 1, bar: 'ok', ok: true },
    }),
  ).toBe(123);

  expect([...methods]).toEqual([
    [
      'barMethod',
      {
        name: 'barMethod',
        options: undefined,
        descriptor: Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(foo),
          'barMethod',
        ),
      },
    ],
    [
      'bazMethod',
      {
        name: 'bazMethod',
        options: { meta: 'meta' },
        descriptor: Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(foo),
          'bazMethod',
        ),
      },
    ],
    [
      'guardedMethod',
      {
        name: 'guardedMethod',
        options: { useGuard: expect.any(Function) },
        descriptor: Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(foo),
          'guardedMethod',
        ),
      },
    ],
  ]);
});
