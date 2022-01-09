local informationFile = json.fromString(remodel.readFile("assets/RostarData.json"))
local rojoProject = json.fromString(remodel.readFile(informationFile.rojoProjectPath))
local shouldOverwriteProjectFile = informationFile.shouldOverwriteProjectFile
local shouldUnpackLua = informationFile.shouldUnpackLua
local shouldUnpackModels = informationFile.shouldUnpackModels
local modelFormat = informationFile.modelFormat
local instanceDepth = informationFile.instanceDepth
local DataModel = remodel.readPlaceFile(informationFile.placeFilePath)

local WHITELISTED_SERVICES = {
	"Workspace",
	"Lighting",
	"ReplicatedFirst",
	"ReplicatedStorage",
	"ServerScriptService",
	"ServerStorage",
	"StarterGui",
	"StarterPack",
	"StarterPlayer",
	"Teams",
	"SoundService",
	"Chat",
	"LocalizationService",
	"TestService",
}

local function isLuaSourceContainer(className)
	return className == "Script" or className == "LocalScript" or className == "ModuleScript"
end

local function getNameForScript(baseName, className)
	local suffix = (className == "Script" and ".server") or (className == "LocalScript" and ".client") or ""
	return baseName .. suffix .. ".lua"
end

local function getNameForModel(baseName)
	return baseName .. "." .. modelFormat
end

local function joinPath(...)
	return table.concat({ ... }, "/")
end

local function isSourceNode(node)
	return type(node["$path"]) == "string" and node["$path"]:find("%.rbxmx?$") == nil
end

local function findFirstScript(instance)
	return instance:FindFirstChildOfClass("Script")
		or instance:FindFirstChildOfClass("LocalScript")
		or instance:FindFirstChildOfClass("ModuleScript")
end

local function isInstanceContainerPure(instance)
	for _, descendant in ipairs(instance:GetDescendants()) do
		if not (isLuaSourceContainer(descendant.ClassName) or descendant.ClassName == "Folder") then
			return false
		end
	end
	return true
end

local function generateFilesystemScriptTree(node, mountPoint, nodePaths)
	local instanceInDataModel = DataModel
	for _, subpath in ipairs(nodePaths[node]) do
		instanceInDataModel = instanceInDataModel:FindFirstChild(subpath)
		if not instanceInDataModel then
			print(
				'Could not find the "'
					.. table.concat(nodePaths[node], ".")
					.. '" instance in the DataModel! Skipping...'
			)
			return
		end
	end
	local stack = { { mountPoint, instanceInDataModel } }
	while #stack > 0 do
		local node = stack[#stack]
		stack[#stack] = nil
		local currentPath = node[1]
		local currentInstance = node[2]

		if isLuaSourceContainer(currentInstance.ClassName) then
			if #currentInstance:GetChildren() > 0 then
				remodel.createDirAll(currentPath)
				remodel.writeFile(
					joinPath(currentPath, getNameForScript("init", currentInstance.ClassName)),
					remodel.getRawProperty(currentInstance, "Source")
				)
			else
				remodel.writeFile(
					currentPath .. getNameForScript("", currentInstance.ClassName),
					remodel.getRawProperty(currentInstance, "Source")
				)
			end
		else
			remodel.createDirAll(currentPath)
		end

		for _, child in ipairs(currentInstance:GetChildren()) do
			table.insert(stack, { currentPath .. "/" .. child.Name, child })
		end
	end
	instanceInDataModel:Destroy()
end

local function attachFullPathsToAllNodes(rootNode)
	local stack = { { rootNode, {} } }
	local allNodes = {}
	local nodePaths = {}
	while #stack > 0 do
		local stackEntry = stack[#stack]
		stack[#stack] = nil
		local node = stackEntry[1]
		local path = stackEntry[2]
		nodePaths[node] = path
		table.insert(allNodes, node)
		for key, value in pairs(node) do
			if key ~= "$properties" and type(value) == "table" and value[1] == nil then
				local newPath = {}
				for i, pathSegment in ipairs(path) do
					newPath[i] = pathSegment
				end
				table.insert(newPath, key)
				table.insert(stack, { value, newPath })
			end
		end
	end
	return rootNode, allNodes, nodePaths
end

local newProjectFile = {
	tree = {
		["$className"] = "DataModel",
	},
}
for property, value in pairs(rojoProject) do
	if property ~= "tree" then
		newProjectFile[property] = value
	end
end

local servicesToBeStored = {}
local warnAboutImpureTrees = false
for _, serviceName in ipairs(WHITELISTED_SERVICES) do
	local serviceInstance = DataModel:GetService(serviceName)
	if #serviceInstance:GetChildren() > 0 then
		local serviceNode = {
			["$path"] = joinPath("assets", getNameForModel(serviceName)),
		}
		table.insert(servicesToBeStored, serviceName)
		newProjectFile.tree[serviceName] = serviceNode
		for _, child in ipairs(serviceInstance:GetChildren()) do
			local isPure = isInstanceContainerPure(child)
			local isSourceNode = findFirstScript(child) ~= nil

			if isSourceNode then
				if isPure then
					serviceNode[child.Name] = {
						["$path"] = joinPath("DataModel", serviceName, child.Name),
					}
				else
					warnAboutImpureTrees = true
				end
			end
		end
	end
end
rojoProject = newProjectFile
local rojoTree, allNodes, nodePaths = attachFullPathsToAllNodes(rojoProject.tree)

local nodesWithScripts = {}
for _, node in ipairs(allNodes) do
	if isSourceNode(node) then
		table.insert(nodesWithScripts, node)
	end
end
if shouldUnpackLua then
	print("Unpacking scripts...")
	for _, node in ipairs(nodesWithScripts) do
		generateFilesystemScriptTree(node, node["$path"], nodePaths)
	end
end

if shouldUnpackModels then
	print("Unpacking non-script instances...")
	if instanceDepth ~= 0 then
		print("Warning: instance depth different than 0 is not implemented")
	end

	for _, serviceName in ipairs(servicesToBeStored) do
		local serviceInstance = DataModel:FindFirstChild(serviceName)
		remodel.writeModelFile(serviceInstance, joinPath("assets", getNameForModel(serviceName)))
	end
end

if shouldOverwriteProjectFile then
	if warnAboutImpureTrees then
		print(
			"Warning: non-script instances mixed with scripts have been detected - these will be merged into one file."
		)
	end
	print("Writing to project file...")
	remodel.writeFile(informationFile.rojoProjectPath, json.toStringPretty(rojoProject))
end
