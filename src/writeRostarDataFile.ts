import fs from "fs";
import path from "path";

export const writeRostarDataFile = (
	filePath: string,
	rojoProjectPath: string,
	placeFilePath: string,
	extraOptions: Record<string, unknown> = {}
) => {
	const dataObject = {
		...extraOptions,
		rojoProjectPath,
		placeFilePath,
	};
	return fs.promises
		.mkdir(path.dirname(filePath), { recursive: true })
		.then(() =>
			fs.promises.writeFile(filePath, JSON.stringify(dataObject), {
				encoding: "utf-8",
				flag: "w+",
			})
		);
};
