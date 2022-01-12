import path from "path";
import fs from "fs";
import { deleteFilesInDirectory, isDirectory, isFile } from "../fsUtil";
import {
	logDone,
	logError,
	loggingFunction,
	logInfo,
	logWarn,
} from "../loggingFunctions";
import { writeRostarDataFile } from "../writeRostarDataFile";
import { runConsoleCommand } from "../runConsoleCommand";
import { deleteCodeDirectories } from "../deleteCodeDirectories";

export const unpackCommand = async (
	placeFilePath: string,
	options: {
		project: string;
		lua: boolean;
		modelFormat: string;
		overwriteProjectFile: true | undefined;
		models: boolean;
	}
) => {
	placeFilePath = path.resolve(placeFilePath);
	const rojoProjectPath = path.resolve(options.project);
	const shouldOverwriteProjectFile = !!options.overwriteProjectFile;
	const shouldUnpackLua = options.lua;
	const shouldUnpackModels = options.models;
	const modelFormat = options.modelFormat;

	if (modelFormat !== "rbxm" && modelFormat !== "rbxmx")
		return logError('The model format must be either "rbxm" or "rbxmx".');

	if (!isFile(placeFilePath))
		return logError("The place file could not be found!");
	if (!isFile(rojoProjectPath))
		return logError("The Rojo project file could not be found!");

	const rootProjectDirectory = path.resolve(path.join(rojoProjectPath, ".."));

	if (options.models) {
		const assetsFolder = path.join(rootProjectDirectory, "assets");
		logInfo("Deleting files in the assets directory...");
		fs.promises
			.rm(assetsFolder, {
				recursive: true,
				force: true,
			})
			.catch(() =>
				logWarn("Deleting files in the assets directory failed.")
			);
	}

	if (options.lua) {
		const rojoProject = JSON.parse(
			fs.readFileSync(rojoProjectPath).toString()
		);
		deleteCodeDirectories(rojoProject, rootProjectDirectory);
	}

	const rostarDataPath = path.join(rootProjectDirectory, "RostarData.json");
	logInfo("Writing Rostar temporary file...");
	await writeRostarDataFile(rostarDataPath, rojoProjectPath, placeFilePath, {
		shouldOverwriteProjectFile,
		shouldUnpackLua,
		shouldUnpackModels,
		modelFormat,
	});

	logInfo("Running Remodel script...");
	runConsoleCommand(
		`remodel run ${path.join(__dirname, "../../.remodel/UnpackFiles.lua")}`,
		loggingFunction("REMODEL"),
		rootProjectDirectory
	)
		.then(() => logDone(`Unpacked ${path.basename(placeFilePath)}`))
		.catch(() =>
			logError(`Failed unpacking ${path.basename(placeFilePath)}`)
		)
		.finally(() => fs.unlinkSync(rostarDataPath));
};
