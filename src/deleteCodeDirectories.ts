import path from "path";
import fs from "fs";
import { isDirectory, isFile } from "./fsUtil";
import { logWarn } from "./loggingFunctions";

const modelSourceRegex = /\.rbxmx?/;

export const deleteCodeDirectories = (
	rojoProject: any,
	projectDirectory: string
) => {
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
			.relative(projectDirectory, codePath)
			.split(path.sep);
		let rootDirectory = relative.shift()!;
		if (rootDirectory !== ".." && rootDirectory !== ".")
			pathsToBeDeleted.push(rootDirectory);
	}
	pathsToBeDeleted = [...new Set(pathsToBeDeleted)];
	pathsToBeDeleted.forEach(async (codePath) => {
		if (!isDirectory(codePath)) return;
		let valid = true;
		(await fs.promises.readdir(codePath)).forEach((file) => {
			if (
				isFile(path.join(codePath, file)) &&
				modelSourceRegex.test(file)
			)
				valid = false;
		});
		if (valid) {
			fs.promises
				.rm(path.resolve(codePath), {
					recursive: true,
					force: true,
				})
				.catch(() =>
					logWarn(`Failed to delete the ${codePath} directory.`)
				);
		}
	});
};
