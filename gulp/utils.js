function generateShellCmd (buildArg, qzdataPath, thingName) {
	var baseCmd = "./__build.sh " + qzdataPath + " " + thingName + " "; // then commit? push?

	switch (buildArg) {
		case "move":
			return baseCmd + "false false";
		case "commit":
			return baseCmd + "true false";
		case "push":
			return baseCmd + "true true";
		default:
			return 'echo ""';
	}
}

module.exports = {
	generateShellCmd: generateShellCmd
};
