import path from "path";
import fs from "fs";
import { isFile } from "../fsUtil";
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
	fromPlace: string,
	options: {
		project: string;
		lua: boolean;
		modelFormat: string;
		overwriteProject: boolean;
		models: boolean;
		assetsDirectory: string;
	}
) => {
	const rojoProjectPath = path.resolve(options.project);
	const shouldOverwriteProjectFile = options.overwriteProject;
	const shouldUnpackLua = options.lua;
	const shouldUnpackModels = options.models;
	const modelFormat = options.modelFormat;
	const assetsDirectory = options.assetsDirectory;

	if (modelFormat !== "rbxm" && modelFormat !== "rbxmx")
		return logError('The model format must be either "rbxm" or "rbxmx".');

	let placeLocation, placeType: "file" | "web";
	const placeFile = path.resolve(fromPlace);
	if (isFile(placeFile)) {
		placeLocation = placeFile;
		placeType = "file";
	} else if (parseInt(fromPlace)) {
		placeLocation = fromPlace;
		placeType = "web";
	} else {
		return logError("The place could not be found!");
	}

	const rootProjectDirectory = path.resolve(path.join(rojoProjectPath, ".."));
	if (isFile(rojoProjectPath)) {
		if (options.models) {
			const assetsFolder = path.join(
				rootProjectDirectory,
				assetsDirectory
			);
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
	}

	if (!shouldOverwriteProjectFile && !isFile(rojoProjectPath))
		return logError("The Rojo project file could not be found!");

	const remodelLogFunction = loggingFunction("REMODEL");

	// Test Remodel's existence and version
	{
		const remodelVersion = await runConsoleCommand(
			"remodel -V",
			() => {},
			rootProjectDirectory
		)
			.catch(() => {
				logError(
					"Could not run Remodel in the project directory. Is Remodel configured correctly?"
				);
				return null;
			})
			.then((result) =>
				result
					? result[0].replace("remodel ", "").replace("\n", "")
					: null
			);
		if (!remodelVersion) return;
		const splitVersion = remodelVersion.split(".").map((v) => parseInt(v));
		if (splitVersion[1] < 11)
			return logError(
				`Found Remodel with version ${remodelVersion}, but version >= 0.11 is needed!`
			);
	}

	const rostarDataPath = path.join(rootProjectDirectory, "RostarData.json");
	logInfo("Writing Rostar temporary file...");
	await writeRostarDataFile(rostarDataPath, {
		rojoProjectPath,
		placeLocation,
		placeType,
		shouldOverwriteProjectFile,
		shouldUnpackLua,
		shouldUnpackModels,
		modelFormat,
		assetsDirectory,
	});

	logInfo("Running Remodel script...");
	runConsoleCommand(
		`remodel run ${path.join(__dirname, "../../.remodel/UnpackFiles.lua")}`,
		remodelLogFunction,
		rootProjectDirectory,
		remodelLogFunction
	)
		.then((std: [string, string]) => {
			if (std[1].includes("is not a known Foreman tool")) {
				logInfo(
					`The previous error might be related to not having a valid "foreman.toml" file inside your project.`
				);
				logInfo(
					`One can be created automatically by running \"rostar init\".`
				);

				return logError(`Failed unpacking ${path.basename(fromPlace)}`);
			}

			logDone(`Unpacked ${path.basename(fromPlace)}`);
		})
		.catch((std: [string, string]) => {
			logError(`Failed unpacking ${path.basename(fromPlace)}`);
		})
		.finally(() => fs.unlinkSync(rostarDataPath));
};
