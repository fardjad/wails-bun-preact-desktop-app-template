type ConsoleMethodName = {
  [Key in keyof Console]: Console[Key] extends (...args: never[]) => unknown
    ? Key
    : never;
}[keyof Console];

type ConsoleCalls = Partial<Record<ConsoleMethodName, unknown[][]>>;

export function mockConsole(methods: ConsoleMethodName[] = ["error"]) {
  const calls: ConsoleCalls = {};
  const originals = new Map<
    ConsoleMethodName,
    (...args: unknown[]) => unknown
  >();
  const consoleMethods = console as unknown as Record<
    ConsoleMethodName,
    (...args: unknown[]) => unknown
  >;

  for (const method of methods) {
    calls[method] = [];
    originals.set(method, consoleMethods[method]);
    consoleMethods[method] = (...args: unknown[]) => {
      calls[method]!.push(args);
    };
  }

  return {
    calls,
    restore() {
      for (const [method, original] of originals) {
        consoleMethods[method] = original;
      }
    },
  };
}
