#!/usr/bin/env node

import { Command } from "commander";
import { unpackCommand } from "./commands/unpackCommand";
import { initCommand } from "./commands/initCommand";
import { packCommand } from "./commands/packCommand";

const program = new Command();

program
	.command("init [directory]")
	.option("--force", "initialize the directory even if it's not empty")
	.description("Initialize a Rojo/Rostar project in a directory.")
	.action(initCommand);

program
	.command("unpack <game>", {
		isDefault: true,
	})
	.description(
		"From a place id or rbxl/rbxlx file, extract scripts as defined in the Rojo project file, and extract other models into rbxm or rbxmx files."
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
		"--no-overwrite-project",
		"whether to overwrite the project file in a way that all assets and scripts are used"
	)
	.option(
		"--assets-directory <assetsDirectory>",
		"where to place rbxm/rbxmx files",
		"DataModel"
	)
	.action(unpackCommand);

program
	.command("pack")
	.description(
		'Build a Rojo project into a rbxl/rbxlx file. Wrapper around "rojo build".'
	)
	.argument("[file]", "the rbxl/rbxlx file to write to")
	.option(
		"--project [project]",
		"the Rojo project file to use",
		"default.project.json"
	)
	.action(packCommand);

program.parse(process.argv);
