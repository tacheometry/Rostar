import child_process from "child_process";
import { logError } from "./loggingFunctions";

export const runConsoleCommand = (
	command: string,
	loggingFunction: (message: string) => void,
	workingDirectory?: string,
	errorFunction = logError
) =>
	new Promise<void>((resolve, reject) => {
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
				if (err || stderr.length > 0) {
					stderr
						.split("\n")
						.filter((line) => line.trim() !== "")
						.forEach(errorFunction);
					reject();
				} else resolve();
			}
		);
	});
