import fs from "fs";
import path from "path";

export interface DataOptions {
	rojoProjectPath: string;
	placeLocation: string;
	placeType: "file" | "web";
	shouldOverwriteProjectFile: boolean;
	shouldUnpackLua: boolean;
	shouldUnpackModels: boolean;
	modelFormat: "rbxm" | "rbxmx";
	assetsDirectory: string;
}
export const writeRostarDataFile = (
	filePath: string,
	dataObject: DataOptions
) => {
	return fs.promises
		.mkdir(path.dirname(filePath), { recursive: true })
		.then(() =>
			fs.promises.writeFile(filePath, JSON.stringify(dataObject), {
				encoding: "utf-8",
				flag: "w+",
			})
		);
};
