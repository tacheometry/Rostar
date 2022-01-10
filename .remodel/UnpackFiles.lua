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

local function getFileNameForScript(baseName, className)
	local suffix = (className == "Script" and ".server") or (className == "LocalScript" and ".client") or ""
	return baseName .. suffix .. ".lua"
end

local function isInstancePure(instance)
	return isLuaSourceContainer(instance.ClassName)
		or instance.ClassName == "Folder"
		or instance.ClassName == "StarterPlayerScripts"
		or instance.ClassName == "StarterCharacterScripts"
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

local function cloneNoChildren(instance)
	instance = instance:Clone()
	for _, child in ipairs(instance:GetChildren()) do
		child:Destroy()
	end
	return instance
end

local function findInstanceFromPath(pathSegments)
	local currentInstance = DataModel
	while currentInstance and #pathSegments > 0 do
		local pathSegment = table.remove(pathSegments, 1)
		currentInstance = currentInstance:FindFirstChild(pathSegment)
	end
	return currentInstance
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
			local shouldBeInExpandedForm = #instance:GetChildren() > 0
			if instance == rootInstance then
				shouldBeInExpandedForm = true
			end
			if shouldBeInExpandedForm then
				table.insert(fsPathSegments, getFileNameForScript("init", instance.ClassName))
			else
				fsPathSegments[#fsPathSegments] = getFileNameForScript(
					fsPathSegments[#fsPathSegments],
					instance.ClassName
				)
			end
			writeFile(fsPathSegments, remodel.getRawProperty(instance, "Source"))
		end
	end

	while #stack > 0 do
		iterate()
	end
end

do
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
		local camera = DataModel:GetService("Workspace"):FindFirstChild("Camera")
		if camera then
			camera:Destroy()
		end
	end

	do
		local stack = DataModel:GetChildren()

		local function iterate()
			local instance = table.remove(stack)

			if isService(instance) and not WHITELISTED_SERVICES[instance.ClassName] then
				return
			end

			if isCodeTree(instance) and #instance:GetChildren() > 0 then
				local instancePath = getInstancePath(instance)
				local projectLocation = newRojoProject.tree
				local fsPath = {}
				for _, pathSegment in ipairs(instancePath) do
					if not projectLocation[pathSegment.Name] then
						projectLocation[pathSegment.Name] = {}
					end
					projectLocation = projectLocation[pathSegment.Name]
					table.insert(fsPath, pathSegment.Name)
				end
				local node = {}
				projectLocation[instance.Name] = node
				table.insert(fsPath, 1, "DataModel")
				table.insert(fsPath, instance.Name)
				node["$path"] = joinPath(fsPath)
				return
			end

			local shouldCreateFolder = isService(instance) or instance.ClassName == "Folder"
			local shouldCreateModelFile = isService(instance) or not shouldCreateFolder

			local parent = instance.Parent
			if isService(parent) and shouldUnpackModels then
				if not newRojoProject.tree[parent.Name] then
					newRojoProject.tree[parent.Name] = {}
				end
				newRojoProject.tree[parent.Name][instance.Name] = {
					["$path"] = joinPath({
						BASE_ASSETS_FOLDER,
						parent.Name,
						shouldCreateModelFile and formatModelFile(instance.Name) or instance.Name,
					}),
				}
			end

			if shouldCreateFolder and #instance:GetChildren() > 0 then
				for _, child in ipairs(instance:GetChildren()) do
					table.insert(stack, child)
				end
			end

			if shouldCreateModelFile and shouldUnpackModels then
				local fsPath = { BASE_ASSETS_FOLDER }
				for _, pathSegment in ipairs(getInstancePath(instance)) do
					table.insert(fsPath, pathSegment.Name)
				end
				table.insert(fsPath, formatModelFile(instance.Name))
				if isService(instance) then
					newRojoProject.tree[instance.Name] = {
						["$path"] = joinPath(fsPath),
					}
					instance = cloneNoChildren(instance)
				end
				writeModelFile(instance, fsPath)
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
	end

	if shouldOverwriteProjectFile then
		print("Writing to project file...")
		remodel.writeFile(informationFile.rojoProjectPath, json.toStringPretty(newRojoProject))
	end
end
