import { useEffect, useState } from "react";

export let logs: string[] = [];

export const logPrefix = "Info: ";
export const errorPrefix = "Error: ";
export const warnPrefix = "Warn: ";

function formatErrorStack(stack: string) {
  const stackLines = stack.split("\n");

  stackLines.forEach((line, i) => {
    if (line.trimStart().startsWith("at ")) {
      // strip remote address
      line = line.replace(/\(http.*:\/\/.*?\//, "(");
      // strip URI params
      line = line.replace(/\/\/.*?:/, ":");

      stackLines[i] = line;
    }
  });

  stack = stackLines.join("\n");

  if (stack.startsWith(errorPrefix)) {
    stack = stack.slice(errorPrefix.length);
  }

  return stack;
}

function formatMessage(message: any) {
  /* eslint-disable @typescript-eslint/no-unsafe-member-access */
  if (typeof message == "object" && typeof message.stack == "string") {
    return formatErrorStack(message.stack as string);
  } else if (typeof message == "string") {
    return message;
  } else {
    return JSON.stringify(message);
  }
}

export function log(data: any) {
  const message = formatMessage(data);
  console.log(message);
  logs.push(logPrefix + message);
  updateListeners();
}

export function logError(error: any) {
  const message = formatMessage(error);
  console.error(message);
  logs.push(errorPrefix + message);
  updateListeners();
}

export function logWarning(warning: any) {
  const message = formatMessage(warning);
  console.warn(message);
  logs.push(warnPrefix + message);
  updateListeners();
}

export function clearLog() {
  logs = [];
  updateListeners();
}

// listeners

const logListeners = new Set<() => void>();

export function useLogs() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const subscription = () => {
      setVersion(version + 1);
    };

    logListeners.add(subscription);

    return () => {
      logListeners.delete(subscription);
    };
  }, []);

  return logs;
}

function updateListeners() {
  logListeners.forEach((listener) => listener());
}
