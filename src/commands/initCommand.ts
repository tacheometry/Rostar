import path from "path";
import fs from "fs";
import { isDirectory } from "../fsUtil";
import {
	logDone,
	logError,
	loggingFunction,
	logInfo,
} from "../loggingFunctions";
import hasbin from "hasbin";
import { runConsoleCommand } from "../runConsoleCommand";

const DEFAULT_ROKIT_CONFIG = `[tools]
rojo = "rojo-rbx/rojo@7.4.4"
lune = "lune-org/lune@0.8.9"
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
			"rokit.toml",
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

	fs.writeFileSync(path.join(directory, "rokit.toml"), DEFAULT_ROKIT_CONFIG);
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

	if (hasbin.sync("rokit")) {
		logInfo("Rokit has been detected");
		const rokitLog = loggingFunction("ROKIT");
		await runConsoleCommand(
			"rokit install",
			rokitLog,
			undefined,
			rokitLog
		).catch(() => {});
	}

	logDone(`Initialized project in ${directory}.`);
};
