import { Injector } from '../injector';
import { InjectArg } from './injectArg';
import { Injectable } from './injectable';
import { OnDirectCall } from './onDirectCall';

const injector = new Injector();

beforeEach(() => injector.clear());

it('should work', () => {
  @Injectable()
  class Foo {
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

test('multiple', () => {
  const steps: string[] = [];

  @Injectable()
  class Foo {
    @OnDirectCall<Foo, 'directCallMethod'>((next, a, b) => {
      if (a === 'ok') {
        steps.push('1');
      }

      return next(a, b);
    })
    @OnDirectCall<Foo, 'directCallMethod'>((next, a, b) => {
      if (b === 'ok') {
        steps.push('2');
      }

      return next(a, b);
    })
    directCallMethod(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      @InjectArg('a') a: string,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      @InjectArg('b') b: string,
    ): boolean | string {
      return `${a}, ${b}`;
    }
  }

  const foo = injector.instantiate(Foo)!;
  expect(injector.callMethod(foo, 'directCallMethod')).toBe('undefined, undefined');
  expect(steps).toEqual([]);
  steps.length = 0;

  expect(
    injector.callMethod(foo, 'directCallMethod', {
      provides: { a: '1', b: '2' },
    }),
  ).toBe('1, 2');
  expect(steps).toEqual([]);

  expect(foo.directCallMethod('1', '2'));
  expect(steps).toEqual([]);

  expect(foo.directCallMethod('ok', '2'));
  expect(steps).toEqual(['1']);
  steps.length = 0;

  expect(foo.directCallMethod('1', 'ok'));
  expect(steps).toEqual(['2']);
  steps.length = 0;

  expect(foo.directCallMethod('ok', 'ok'));
  expect(steps).toEqual(['1', '2']);
  steps.length = 0;
});
