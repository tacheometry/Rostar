<div align="center">
	<img src="assets/logo.svg" alt="Rostar logo" width="20%"/>
	<h1>Rostar</h1>
	Dead simple fully managed Rojo helper for Roblox projects
</div>

## Description

Rostar is a command-line tool that unpacks/packs Roblox place files (`rbxl`/`rbxlx`) into model files and `.lua` scripts in the filesystem, for use with [Rojo](https://rojo.space/). It is useful to both developers that prefer Roblox Studio, but also to Rojo users that would like a fully managed workflow without a hassle.

**Think of it like being able to treat your .rblx files like a .zip file.**

We made this for users who do all of their work in Roblox Studio, who also wanted an easy way to get access to a tree of files for .git to work against.

If you wish to use full Rojo, this can also be a good starting point, but fair warning as Rostar doesn't support customizing your file layout...


**Example usage: **

>rostar unpack myplace.rbxl

{A filesystem is created containing .lua files, models, and folders in a best-attempt to recreate the myplace.rblx Roblox Studio workspace}

>rostar pack newplace.rbxl

{packs the previously unpacked filesystem back into newplace.rbxl, ready to be loaded into Roblox Studio}


## Documentation

https://tacheometry.github.io/Rostar
