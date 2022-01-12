import hasbin from "hasbin";
import fs from "fs";
import path from "path";
import { logError, loggingFunction } from "../loggingFunctions";
import { runConsoleCommand } from "../runConsoleCommand";

export const packCommand = (
	file: string | undefined,
	options: {
		project: string;
	}
) => {
	if (!hasbin.sync("rojo"))
		return logError(
			'The "rojo" executable needs to be in your system PATH.'
		);

	try {
		const rojoProject = JSON.parse(
			fs.readFileSync(path.resolve(options.project)).toString()
		);
		file ??= rojoProject.name + ".rbxl";
	} catch {}

	const logger = loggingFunction("ROJO");

	runConsoleCommand(
		`rojo build ${options.project} --output="${file}"`,
		logger,
		undefined,
		logger
	).catch(() => {});
};
