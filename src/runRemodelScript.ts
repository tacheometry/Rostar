import child_process from "child_process";
import { logRemodel } from "./loggingFunctions";

export const runRemodelScript = (
	scriptPath: string,
	workingDirectory?: string
) =>
	new Promise<void>((resolve, reject) => {
		child_process.exec(
			`remodel run "${scriptPath}"`,
			{
				cwd: workingDirectory,
			},
			(err, stdout, stderr) => {
				stdout
					.split("\n")
					.filter((line) => line.trim() !== "")
					.forEach(logRemodel);
				if (err) {
					console.error(err);
					reject();
				} else resolve();
			}
		);
	});
