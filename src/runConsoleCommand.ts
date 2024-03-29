import child_process from "child_process";
import { logError } from "./loggingFunctions";

export const runConsoleCommand = (
	command: string,
	loggingFunction: (message: string) => void,
	workingDirectory?: string,
	errorFunction = logError
) =>
	new Promise<[string, string]>((resolve, reject) => {
		child_process.exec(
			command,
			{
				cwd: workingDirectory,
			},
			(err, stdout, stderr) => {
				stdout
					.split("\n")
					.filter((line) => line.trim() !== "")
					.forEach(loggingFunction);
				stderr
					.split("\n")
					.filter((line) => line.trim() !== "")
					.forEach(errorFunction);
				if (err) {
					reject([stdout, stderr]);
				} else resolve([stdout, stderr]);
			}
		);
	});
