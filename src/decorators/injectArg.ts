import { InjectArgFactory } from './injectArgFactory';

export function InjectArg(name: string): ParameterDecorator {
  return InjectArgFactory((descriptor) => descriptor.provides?.[name]);
}
