import chalk from "chalk";

export const loggingFunction =
	(
		prefix: string,
		colorFunction: chalk.Chalk = chalk.blue,
		consoleFunction:
			| typeof console["log"]
			| typeof console["error"] = console.log
	) =>
	(message: string) =>
		consoleFunction(colorFunction("[" + prefix + "]") + " " + message);

export const logInfo = loggingFunction("INFO");

export const logDone = loggingFunction("DONE", chalk.green);

export const logWarn = loggingFunction("WARN", chalk.yellow, console.warn);

export const logError = loggingFunction("ERROR", chalk.red, console.error);
