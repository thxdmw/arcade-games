export function listenWithFallback(server, preferredPort, options = {}) {
  const host = options.host ?? "0.0.0.0";
  const maxAttempts = options.maxAttempts ?? 10;
  const onRetry = options.onRetry ?? (() => {});

  return new Promise((resolve, reject) => {
    const attempt = (port, remainingAttempts) => {
      const handleListening = () => {
        server.off("error", handleError);
        resolve(port);
      };
      const handleError = (error) => {
        server.off("listening", handleListening);
        if (error.code !== "EADDRINUSE" || remainingAttempts <= 1) {
          reject(error);
          return;
        }

        const nextPort = port + 1;
        onRetry(port, nextPort);
        setImmediate(() => attempt(nextPort, remainingAttempts - 1));
      };

      server.once("listening", handleListening);
      server.once("error", handleError);
      server.listen(port, host);
    };

    attempt(preferredPort, maxAttempts);
  });
}
