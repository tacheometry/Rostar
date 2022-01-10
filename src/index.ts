#!/usr/bin/env node

import { Command } from "commander";
import { unpackCommand } from "./commands/unpackCommand";
import { initCommand } from "./commands/initCommand";

const program = new Command();

program
	.command("init [directory]")
	.option("--force", "initialize the directory even if it's not empty")
	.description("Initialize a Rojo/Rostar project in a directory.")
	.action(initCommand);

program
	.command("unpack <game>")
	.description(
		"From a rbxl/rbxlx file, extract scripts from the $path properties in the Rojo project file and place them into the filesystem, and extract the other instances into rbxm/rbxmx files to be used in the Rojo project file."
	)
	.option(
		"-p, --project <project>",
		"the path to the Rojo project file",
		"default.project.json"
	)
	.option(
		"--no-models",
		"don't unpack non-script instances into rbxm/rbxmx files"
	)
	.option(
		"--model-format <format>",
		"whether to store models in rbxm (binary) or rbxmx (XML - better for git diffs)",
		"rbxm"
	)
	.option("--no-lua", "don't unpack Roblox scripts into files")
	.option(
		"--no-delete-assets",
		"whether to delete existing files in the assets folder"
	)
	.option(
		"--overwrite-project-file",
		"whether to overwrite the project file in a way that all assets and scripts are used"
	)
	.action(unpackCommand);

program.parse(process.argv);
