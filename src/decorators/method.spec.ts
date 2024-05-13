import { getMethods, Method } from './method';

it('should work', () => {
  class Foo {
    fooMethod(): void {}

    @Method()
    barMethod(): void {}

    @Method('meta')
    bazMethod(): void {}
  }

  const foo = new Foo();
  const methods = getMethods(foo);

  expect([...methods]).toEqual([
    [
      'barMethod',
      {
        name: 'barMethod',
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
        meta: 'meta',
        descriptor: Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(foo),
          'bazMethod',
        ),
      },
    ],
  ]);
});
