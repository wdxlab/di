import { getMethods, Method } from './method';
import { Injector } from '../injector';
import { InjectArg } from './injectArg';
import { Injectable } from './injectable';
import { UseGuard } from './useGuard';
import { OnDirectCall } from './onDirectCall';

const injector = new Injector();

@Injectable()
class Foo {
  fooMethod(): void {}

  @Method()
  barMethod(): void {}

  @Method({ meta: { some: 'value' } })
  bazMethod(): void {}

  @UseGuard<Foo, 'guardedMethod'>((instance, args, decl) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return instance.fooMethod && args[1] === 'ok' && decl.provides?.ok === true;
  })
  guardedMethod(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @InjectArg('foo') foo: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @InjectArg('bar') bar: number,
  ): number {
    return 123;
  }

  @OnDirectCall<Foo, 'directCallMethod'>((_, a, b) =>
    a === 'ok' && b === 'ok'
      ? `direct call, ${a}, ${b}`
      : `direct call and not ok, ${a}, ${b}`,
  )
  directCallMethod(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @InjectArg('a') a: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @InjectArg('b') b: string,
  ): boolean | string {
    return `hooked, ${a}, ${b}`;
  }
}

beforeEach(() => injector.clear());

test('useGuard', () => {
  const foo = new Foo();

  expect(injector.callMethod(foo, 'guardedMethod')).toBe(null);
  expect(
    injector.callMethod(foo, 'guardedMethod', {
      provides: { foo: 1, bar: 'ok', ok: true },
    }),
  ).toBe(123);
});

test('onDirectCall', () => {
  const foo = injector.instantiate(Foo)!;
  expect(injector.callMethod(foo, 'directCallMethod')).toBe(
    'hooked, undefined, undefined',
  );
  expect(
    injector.callMethod(foo, 'directCallMethod', {
      provides: { a: 'ok', b: 'ok' },
    }),
  ).toBe('hooked, ok, ok');
  expect(foo.directCallMethod('ok', 'ok')).toBe('direct call, ok, ok');
  expect(injector.instantiate(Foo)!.directCallMethod('ok', 'ok')).toBe(
    'direct call, ok, ok',
  );
  expect(foo.directCallMethod('foo', 'bar')).toBe('direct call and not ok, foo, bar');
});

test('getMethods', () => {
  const foo = new Foo();
  const expectedMethods = [
    [
      'barMethod',
      {
        name: 'barMethod',
        options: { meta: {} },
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
        options: { meta: { some: 'value' } },
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
        options: { meta: {} },
        descriptor: Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(foo),
          'guardedMethod',
        ),
      },
    ],
    [
      'directCallMethod',
      {
        name: 'directCallMethod',
        options: { meta: {} },
        descriptor: {
          ...Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(foo),
            'directCallMethod',
          ),
          value: expect.any(Function),
        },
      },
    ],
  ];

  expect([...getMethods(foo)]).toEqual(expectedMethods);
  expect([...getMethods(Foo)]).toEqual(expectedMethods);
});
