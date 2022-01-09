import path from "path";
import fs from "fs";
import { deleteFilesInDirectory, isFile } from "../fsUtil";
import { logDone, logError, logInfo, logWarn } from "../loggingFunctions";
import { writeRostarDataFile } from "../writeRostarDataFile";
import { runRemodelScript } from "../runRemodelScript";

export const unpackCommand = async (
	placeFilePath: string,
	options: {
		project: string;
		lua: boolean;
		depth: string;
		modelFormat: string;
		deleteAssets: string;
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
	const instanceDepth = parseFloat(options.depth); // using float intentionally to catch mistakes

	if (
		isNaN(instanceDepth) ||
		instanceDepth < 0 ||
		Math.floor(instanceDepth) !== instanceDepth
	)
		return logError(
			"The depth value must be an integer higher or equal to 0."
		);
	if (modelFormat !== "rbxm" && modelFormat !== "rbxmx")
		return logError('The model format must be either "rbxm" or "rbxmx".');

	if (!isFile(placeFilePath)) return logError("Invalid place file!");
	if (!isFile(rojoProjectPath)) return logError("Invalid project.json file!");

	const rootProjectDirectory = path.resolve(path.join(rojoProjectPath, ".."));
	const assetsFolder = path.join(rootProjectDirectory, "assets");
	if (options.deleteAssets) {
		logInfo("Deleting files in the assets directory...");
		deleteFilesInDirectory(assetsFolder).catch(() =>
			logWarn("Deleting files in the assets folder failed.")
		);
	}

	const rojoProject = JSON.parse(fs.readFileSync(rojoProjectPath).toString());
	{
		const modelSourceRegex = /\.rbxmx?/;
		const codePaths: string[] = [];
		const stack = [rojoProject.tree];
		while (stack.length > 0) {
			const currentNode = stack.pop();
			for (const property in currentNode) {
				const value = currentNode[property];
				if (property === "$path" && !modelSourceRegex.test(value)) {
					codePaths.push(value);
				} else if (
					property !== "$properties" &&
					typeof value === "object" &&
					!Array.isArray(value)
				) {
					stack.push(value);
				}
			}
		}
		let pathsToBeDeleted = [];
		for (let codePath of codePaths) {
			codePath = path.resolve(codePath);
			const relative = path
				.relative(rootProjectDirectory, codePath)
				.split(path.sep);
			let rootDirectory = relative.shift()!;
			if (rootDirectory !== ".." && rootDirectory !== ".")
				pathsToBeDeleted.push(rootDirectory);
		}
		pathsToBeDeleted = [...new Set(pathsToBeDeleted)];
		await Promise.allSettled(
			pathsToBeDeleted.map((codePath) =>
				fs.promises
					.unlink(path.resolve(codePath))
					.catch(() =>
						logWarn(`Failed to delete the ${codePath} directory.`)
					)
			)
		);
	}

	const rostarDataPath = path.join(
		rootProjectDirectory,
		"assets/RostarData.json"
	);
	logInfo("Writing Rostar temporary file...");
	await writeRostarDataFile(rostarDataPath, rojoProjectPath, placeFilePath, {
		shouldOverwriteProjectFile,
		shouldUnpackLua,
		shouldUnpackModels,
		modelFormat,
		instanceDepth,
	});

	logInfo("Running Remodel script...");
	runRemodelScript(
		path.join(__dirname, "../../.remodel/UnpackFiles.lua"),
		rootProjectDirectory
	)
		.then(() => logDone(`Unpacked ${path.basename(placeFilePath)}`))
		.catch(() =>
			logError(`Failed unpacking ${path.basename(placeFilePath)}`)
		)
		.finally(() => fs.unlinkSync(rostarDataPath));
};
