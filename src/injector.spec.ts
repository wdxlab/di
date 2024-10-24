import { Injectable } from './decorators/injectable';
import { InjectArg } from './decorators/injectArg';
import { Injector } from './injector';

const injector = new Injector();

afterEach(() => injector.clear());

describe('.fn', () => {
  it('should work', () => {
    @Injectable()
    class Bar {
      constructor(@InjectArg('some') readonly some: string) {}
    }
    @Injectable()
    class Foo {
      constructor(readonly bar: Bar) {}
    }

    @Injectable()
    class Simple {
      readonly some = 'hello';
    }

    const fn = injector.fn(
      (simple: Simple, foo: Foo) => {
        return `${simple.some}-${foo.bar.some}-FOO`;
      },
      [
        Simple,
        {
          injectable: Foo,
          imports: [{ injectable: Bar, provides: { some: '123' } }],
        },
      ],
    );

    expect(fn()).toBe('hello-123-FOO');
  });
});
