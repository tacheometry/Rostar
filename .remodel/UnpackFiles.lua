local informationFile = json.fromString(remodel.readFile("RostarData.json"))
local initialRojoProject = json.fromString(remodel.readFile(informationFile.rojoProjectPath))
local shouldOverwriteProjectFile = informationFile.shouldOverwriteProjectFile
local shouldUnpackLua = informationFile.shouldUnpackLua
local shouldUnpackModels = informationFile.shouldUnpackModels
local modelFileExtension = informationFile.modelFormat
local DataModel = remodel.readPlaceFile(informationFile.placeFilePath)

local BASE_ASSETS_FOLDER = "assets"
local WHITELISTED_SERVICES = {
	["Workspace"] = true,
	["Players"] = true,
	["Lighting"] = true,
	["ReplicatedFirst"] = true,
	["ReplicatedStorage"] = true,
	["ServerScriptService"] = true,
	["ServerStorage"] = true,
	["StarterGui"] = true,
	["StarterPack"] = true,
	["StarterPlayer"] = true,
	["SoundService"] = true,
	["Chat"] = true,
	["LocalizationService"] = true,
	["TestService"] = true,
	["MaterialService"] = true,
}

local function reverseTable(tbl)
	local rev = {}
	local size = #tbl
	for i, value in ipairs(tbl) do
		rev[size - i + 1] = value
	end
	return rev
end

local function shallowCopyArray(tbl)
	local newTbl = {}
	for i, v in ipairs(tbl) do
		newTbl[i] = v
	end
	return newTbl
end

local function prependCopy(tbl, ...)
	local cp = shallowCopyArray(tbl)
	for _, element in ipairs({ ... }) do
		table.insert(cp, 1, element)
	end
	return cp
end

local function appendCopy(tbl, ...)
	local cp = shallowCopyArray(tbl)
	for _, element in ipairs({ ... }) do
		table.insert(cp, element)
	end
	return cp
end

local function splitString(str, sep)
	local tbl = {}
	for str in string.gmatch(str, "([^" .. sep .. "]+)") do
		table.insert(tbl, str)
	end
	return tbl
end

local function isLuaSourceContainer(className)
	return className == "Script" or className == "LocalScript" or className == "ModuleScript"
end

local function formatScriptFile(baseName, className)
	local suffix = (className == "Script" and ".server") or (className == "LocalScript" and ".client") or ""
	return baseName .. suffix .. ".lua"
end

local function isInstancePure(instance)
	return isLuaSourceContainer(instance.ClassName) or instance.ClassName == "Folder"
end

local function formatModelFile(baseName)
	return baseName .. "." .. modelFileExtension
end

local function joinPath(pathSegments)
	return table.concat(pathSegments, "/")
end

local function makeFileParentDirectory(segments)
	local size = #segments
	local newSegments = {}
	for i, segment in ipairs(segments) do
		if i ~= size then
			newSegments[i] = segment
		end
	end
	remodel.createDirAll(joinPath(newSegments))
end

local function addEntryToProjectNode(node, entrySegments, value, noClassName)
	for i, segment in ipairs(entrySegments) do
		node[segment] = node[segment] or {}
		node = node[segment]
		if not node["$className"] and (i ~= #entrySegments) and (i ~= 1) and not noClassName then
			node["$className"] = "Folder"
		end
	end
	node["$path"] = value
end

local function writeModelFile(instance, pathSegments)
	makeFileParentDirectory(pathSegments)
	remodel.writeModelFile(instance, joinPath(pathSegments))
end

local function writeFile(pathSegments, content)
	makeFileParentDirectory(pathSegments)
	remodel.writeFile(joinPath(pathSegments), content)
end

local function isService(instance)
	return instance.Parent == DataModel
end

local function isCodeTree(instance)
	local toCheck = instance:GetDescendants()
	table.insert(toCheck, instance)
	for _, descendant in ipairs(toCheck) do
		if not isInstancePure(descendant) then
			return false
		end
	end
	return true
end

local function shouldInstanceGetMergedInParentModel(instance)
	local basicCheck = (not isInstancePure(instance))
		and instance.ClassName ~= "Folder"
		and instance.ClassName ~= "Model"
		and instance.ClassName ~= "StarterCharacterScripts"
		and instance.ClassName ~= "StarterPlayerScripts"

	if basicCheck then
		return true
	end

	-- Detect name conflicts
	local clonedParent = instance.Parent:Clone()
	local foundChild = clonedParent:FindFirstChild(instance.Name)
	foundChild:Destroy()
	return clonedParent:FindFirstChild(instance.Name) ~= nil
end

local function getInstancePath(instance)
	local parents = {}
	local currentInstance = instance
	while currentInstance.Parent ~= DataModel do
		table.insert(parents, currentInstance.Parent)
		currentInstance = currentInstance.Parent
	end
	parents = reverseTable(parents)
	return parents
end

local function getAssetParent(instance)
	local path = {}
	local instancePath = getInstancePath(instance)
	for _, segment in ipairs(instancePath) do
		table.insert(path, segment.Name)
	end
	return path
end

local function findInstanceFromPath(pathSegments)
	local currentInstance = DataModel
	while currentInstance and #pathSegments > 0 do
		local pathSegment = table.remove(pathSegments, 1)
		currentInstance = currentInstance:FindFirstChild(pathSegment)
	end
	return currentInstance
end

local function canNodeForInstanceBeExpanded(instance)
	return instance.ClassName == "Folder"
		or isService(instance)
		or instance.ClassName == "StarterPlayerScripts"
		or instance.ClassName == "StarterCharacterScripts"
end

local function shouldNodeForInstanceBeExpanded(instance)
	if not canNodeForInstanceBeExpanded(instance) then
		return false
	end
	local shouldBeExpanded = true
	if instance.ClassName == "Folder" then
		shouldBeExpanded = false
		for _, child in ipairs(instance:GetChildren()) do
			if shouldInstanceGetMergedInParentModel(child) then
				shouldBeExpanded = true
				break
			end
		end
	end
	return shouldBeExpanded
end

local function mountDataModelCodeTreeToPath(rootInstance, rootFsPathSegments)
	local stack = { { rootInstance, rootFsPathSegments } }

	local function iterate()
		local stackValue = table.remove(stack)

		local instance = stackValue[1]
		local fsPathSegments = stackValue[2]

		for _, child in ipairs(instance:GetChildren()) do
			local segmentsForChild = shallowCopyArray(fsPathSegments)
			table.insert(segmentsForChild, child.Name)
			table.insert(stack, { child, segmentsForChild })
		end

		if isLuaSourceContainer(instance.ClassName) then
			local shouldBeInExpandedForm = #instance:GetChildren() > 0 or instance == rootInstance
			if shouldBeInExpandedForm then
				table.insert(fsPathSegments, formatScriptFile("init", instance.ClassName))
			else
				fsPathSegments[#fsPathSegments] = formatScriptFile(fsPathSegments[#fsPathSegments], instance.ClassName)
			end
			writeFile(fsPathSegments, remodel.getRawProperty(instance, "Source"))
		end
	end

	while #stack > 0 do
		iterate()
	end
end

do
	do
		local camera = DataModel:GetService("Workspace"):FindFirstChild("Camera")
		if camera then
			camera:Destroy()
		end
	end

	local newRojoProject = {
		tree = {
			["$className"] = "DataModel",
		},
	}
	for property, value in pairs(initialRojoProject) do
		if property ~= "tree" then
			newRojoProject[property] = value
		end
	end

	do
		local stack = {}
		for _, child in ipairs(DataModel:GetChildren()) do
			if WHITELISTED_SERVICES[child.ClassName] then
				table.insert(stack, child)
			end
		end

		local function iterate()
			local instance = table.remove(stack)

			if isCodeTree(instance) then
				local projectPath = getAssetParent(instance)
				table.insert(projectPath, instance.Name)
				local filePath = prependCopy(projectPath, "DataModel")
				addEntryToProjectNode(newRojoProject.tree, projectPath, joinPath(filePath))
				return
			end

			if canNodeForInstanceBeExpanded(instance) then
				local nodeParentProjectPath = getAssetParent(instance)
				local shouldBeExpanded = shouldNodeForInstanceBeExpanded(instance)

				if shouldBeExpanded then
					local folderPath = shallowCopyArray(nodeParentProjectPath)
					table.insert(folderPath, instance.Name)
					local asset_folderPath = prependCopy(folderPath, BASE_ASSETS_FOLDER)
					local modelPath = shallowCopyArray(nodeParentProjectPath)
					table.insert(modelPath, formatModelFile(instance.Name))
					local asset_modelPath = prependCopy(modelPath, BASE_ASSETS_FOLDER)

					addEntryToProjectNode(newRojoProject.tree, folderPath, joinPath(asset_modelPath))
					local indexInstance = instance:Clone()
					for _, child in ipairs(indexInstance:GetChildren()) do
						if not shouldInstanceGetMergedInParentModel(child) then
							child:Destroy()
						end
					end
					if shouldUnpackModels then
						writeModelFile(indexInstance, asset_modelPath)
					end
					nodeParentProjectPath[#nodeParentProjectPath] = indexInstance.Name

					for _, child in ipairs(instance:GetChildren()) do
						if not shouldInstanceGetMergedInParentModel(child) then
							table.insert(stack, child)
						end
					end
				else
					local shouldAddProjectEntry = false
					for _, child in ipairs(instance:GetChildren()) do
						table.insert(stack, child)
						if not isInstancePure(child) and not shouldInstanceGetMergedInParentModel(child) then
							shouldAddProjectEntry = true
						end
					end
					if shouldAddProjectEntry then
						addEntryToProjectNode(
							newRojoProject.tree,
							nodeParentProjectPath,
							joinPath(prependCopy(nodeParentProjectPath, "assets"))
						)
					end
				end
			else
				local parentFolderPath = getAssetParent(instance, false)
				local instancePath = appendCopy(parentFolderPath, instance.Name)
				local assetPath = prependCopy(parentFolderPath, BASE_ASSETS_FOLDER)
				table.insert(assetPath, formatModelFile(instance.Name))
				if shouldNodeForInstanceBeExpanded(instance.Parent) then
					addEntryToProjectNode(newRojoProject.tree, instancePath, joinPath(assetPath))
				end
				if shouldUnpackModels then
					writeModelFile(instance, assetPath)
				end
			end
		end

		while #stack > 0 do
			iterate()
		end
	end

	if shouldUnpackLua then
		local currentProjectFile = shouldOverwriteProjectFile and newRojoProject or initialRojoProject
		local stack = { { currentProjectFile.tree, {} } }

		local function iterate()
			local stackValue = table.remove(stack)

			local node = stackValue[1]
			local dataModelPath = stackValue[2]

			local nodePathProperty = node["$path"]

			if nodePathProperty then
				local dataModelInstance = findInstanceFromPath(shallowCopyArray(dataModelPath))
				if dataModelInstance and isCodeTree(dataModelInstance) then
					mountDataModelCodeTreeToPath(dataModelInstance, splitString(nodePathProperty, "/"))
				end
			end
			for key, value in pairs(node) do
				if type(value) == "table" and key ~= "$properties" then
					local newDataModelPath = shallowCopyArray(dataModelPath)
					table.insert(newDataModelPath, key)
					table.insert(stack, { value, newDataModelPath })
				end
			end
		end

		while #stack > 0 do
			iterate()
		end

		pcall(function()
			newRojoProject.tree.StarterPlayer.StarterPlayerScripts["$className"] = nil
			newRojoProject.tree.StarterPlayer.StarterCharacterScripts["$className"] = nil
		end)
	end

	if shouldOverwriteProjectFile then
		print("Writing to project file...")
		remodel.writeFile(informationFile.rojoProjectPath, json.toStringPretty(newRojoProject))
	end
end
