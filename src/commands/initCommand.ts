import path from "path";
import fs from "fs";
import child_process from "child_process";
import { isDirectory } from "../fsUtil";
import { logDone, logError, logInfo } from "../loggingFunctions";

const DEFAULT_FOREMAN_CONFIG = `[tools]
rojo = { source = "rojo-rbx/rojo", version = "~7.0.0" }
remodel = { source = "rojo-rbx/remodel", version = "~0.9.0" }
`;

const rbxlExpression = /\.rbxlx?/;
const lockExpression = /\.rbxlx?\.lock/;

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
	if (
		!options.force &&
		fs
			.readdirSync(directory)
			.filter(
				(file) =>
					!(rbxlExpression.test(file) || lockExpression.test(file))
			).length !== 0
	)
		return logError(
			'The directory is not empty! To ignore this warning run the command with "--force".'
		);

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

	logDone(`Initialized project in ${directory}.`);
};
