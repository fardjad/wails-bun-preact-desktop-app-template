type WailsEnvironment = {
  environment?: {
    OS?: string;
  };
};

export function withWailsOS<T>(os: string, run: () => T): T {
  const windowWithWails = window as Window & { _wails?: WailsEnvironment };
  const previousEnvironment = windowWithWails._wails;

  windowWithWails._wails = {
    environment: { OS: os },
  };

  try {
    return run();
  } finally {
    if (previousEnvironment === undefined) {
      delete windowWithWails._wails;
    } else {
      windowWithWails._wails = previousEnvironment;
    }
  }
}
