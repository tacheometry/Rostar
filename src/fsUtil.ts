import * as fs from "fs";

export const isFile = (path: fs.PathLike) => {
	try {
		return fs.lstatSync(path).isFile();
	} catch {
		return false;
	}
};

export const isDirectory = (path: fs.PathLike) => {
	try {
		return fs.lstatSync(path).isDirectory();
	} catch {
		return false;
	}
};

export const deleteFilesInDirectory = (path: fs.PathLike) => {
	return fs.promises
		.readdir(path)
		.then((f) => Promise.all(f.map((e) => fs.promises.unlink(e))));
};
