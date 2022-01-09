import chalk from "chalk";

export const logInfo = (message: string) => {
	console.error(chalk.blue("[INFO]") + " " + message);
};

export const logDone = (message: string) => {
	console.log(chalk.green("[DONE]") + " " + message);
};

export const logRemodel = (message: string) => {
	console.log(chalk.blue("[REMODEL]") + " " + message);
};

export const logWarn = (message: string) => {
	console.error(chalk.yellow("[WARN]") + " " + message);
};

export const logError = (message: string) => {
	console.error(chalk.red("[ERROR]") + " " + message);
};
