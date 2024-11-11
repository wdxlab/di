import { Injector } from '../injector';
import { InjectArg } from './injectArg';
import { Injectable } from './injectable';
import { UseGuard } from './useGuard';

const injector = new Injector();

beforeEach(() => injector.clear());

it('should work', () => {
  @Injectable()
  class Foo {
    fooMethod(): void {}

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
  }

  const foo = new Foo();

  expect(injector.callMethod(foo, 'guardedMethod')).toBe(null);
  expect(
    injector.callMethod(foo, 'guardedMethod', {
      provides: { foo: 1, bar: 'ok', ok: true },
    }),
  ).toBe(123);
});

test('multiple', () => {
  const steps: string[] = [];

  @Injectable()
  class Foo {
    @UseGuard<Foo, 'guardedMethod'>((instance, args) => {
      try {
        expect(instance).toBeInstanceOf(Foo);
        expect(args[0]).toBeTruthy();
        steps.push('1');
        return true;
      } catch {
        return false;
      }
    })
    @UseGuard<Foo, 'guardedMethod'>((instance, args) => {
      try {
        expect(instance).toBeInstanceOf(Foo);
        expect(args[1]).toBeTruthy();
        steps.push('2');
        return true;
      } catch {
        return false;
      }
    })
    guardedMethod(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      @InjectArg('foo') foo: string,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      @InjectArg('bar') bar: number,
    ): number {
      return 123;
    }
  }

  const foo = new Foo();

  expect(injector.callMethod(foo, 'guardedMethod')).toBe(null);

  expect(
    injector.callMethod(foo, 'guardedMethod', {
      provides: { foo: 1, bar: null },
    }),
  ).toBe(null);
  expect(steps).toEqual(['1']);
  steps.length = 0;

  expect(
    injector.callMethod(foo, 'guardedMethod', {
      provides: { foo: null, bar: 1 },
    }),
  ).toBe(null);
  expect(steps).toEqual([]);
  steps.length = 0;

  expect(
    injector.callMethod(foo, 'guardedMethod', {
      provides: { foo: 1, bar: 1 },
    }),
  ).toBe(123);
  expect(steps).toEqual(['1', '2']);
});
