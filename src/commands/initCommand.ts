import path from "path";
import fs from "fs";
import child_process from "child_process";
import { isDirectory } from "../fsUtil";
import {
	logDone,
	logError,
	loggingFunction,
	logInfo,
} from "../loggingFunctions";
import hasbin from "hasbin";
import { runConsoleCommand } from "../runConsoleCommand";

const DEFAULT_FOREMAN_CONFIG = `[tools]
rojo = { github = "rojo-rbx/rojo", version = "7.2.1" }
remodel = { github = "rojo-rbx/remodel", version = "0.11.0" }
`;

export const initCommand = async (
	directory: string = ".",
	options: {
		force: undefined | true;
	}
) => {
	directory = path.resolve(directory);

	if (!fs.existsSync(directory)) fs.mkdirSync(directory);
	else if (!isDirectory(directory))
		return logError("The path must be a directory!");

	if (!options.force) {
		const fileNamesToCheck = new Set([
			"foreman.toml",
			".gitignore",
			"default.project.json",
		]);
		fileNamesToCheck.forEach((fileName) => {
			if (!fs.existsSync(path.join(directory, fileName)))
				fileNamesToCheck.delete(fileName);
		});

		if (fileNamesToCheck.size > 0) {
			logError(
				`Cannot initialize the directory because of the following files: ${[
					...fileNamesToCheck,
				].join(", ")}`
			);
			logInfo(`Bypass this warning by running "rostar init --force".`);
			return;
		}
	}

	fs.writeFileSync(
		path.join(directory, "foreman.toml"),
		DEFAULT_FOREMAN_CONFIG
	);
	fs.writeFileSync(
		path.join(directory, ".gitignore"),
		`/*.rbxlx.lock
/*.rbxl.lock`
	);
	fs.writeFileSync(
		path.join(directory, "default.project.json"),
		`{
  "name": "Rostar Project",
  "tree": {
    "$className": "DataModel"
  }
}
`
	);

	if (hasbin.sync("foreman")) {
		logInfo("Foreman has been detected");
		const foremanLog = loggingFunction("FOREMAN");
		await runConsoleCommand(
			"foreman install",
			foremanLog,
			undefined,
			foremanLog
		).catch(() => {});
	}

	logDone(`Initialized project in ${directory}.`);
};
