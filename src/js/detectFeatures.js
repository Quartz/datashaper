module.exports = function () {
	var features = {};

	features.hasDeviceMotion = 'ondevicemotion' in window;
	features.isAndroid = (/android/gi).test(navigator.appVersion);
	features.isIDevice = (/iphone|ipad/gi).test(navigator.appVersion);
	features.isTouchPad = (/hp-tablet/gi).test(navigator.appVersion);
	features.isKindle = (/silk/gi).test(navigator.appVersion);
	features.hasTouchEvents = (
		features.isAndroid ||
		features.isIDevice ||
		features.isTouchPad ||
		features.isKindle
	);

	return features;
};
