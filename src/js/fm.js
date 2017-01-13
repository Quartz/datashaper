var PARENT_DOMAIN = "qz.com";
var $interactive = $("#interactive-content");
var FM = null;

/**
 * Setup Frame Messenger and connect to parent.
 */
function setupFrameMessenger() {
	// Production: use frame messenging (will error if no parent frame)
	if (ENV == 'prod') {
		FM = frameMessager({
			allowFullWindow : false,
			parentDomain : PARENT_DOMAIN
		});

		FM.onMessage("app:activePost", resize);

		$("body").css("overflow", "hidden");
	// Test environment: no frame messenging
	} else {
		$("body").css("border", "#ff8080");
	}
}

/**
 * Compute the height of the interactive.
 */
function documentHeight () {
	var body = document.body;
	var html = document.documentElement;
	var height =	Math.max( body.scrollHeight, body.offsetHeight,
						 html.clientHeight, html.scrollHeight, html.offsetHeight );

	return height;
}

/**
 * Update parent height.
 */
function updateHeight (height) {
	if (!FM) {
		return;
	}

	height = height || documentHeight();

	FM.triggerMessage("QZParent", "child:updateHeight", {
		height : height
	});

	return;
}

/**
 * Update parent hash.
 * If FM is not present, update local hash
 */
function updateParentHash (hash) {
	if (!FM) {
		window.location.hash = hash;
	} else {
		FM.triggerMessage("QZParent", "child:updateHash", {
			hash : hash
		});
	}
	return;
}

/**
 * Get properties of the parent window
 * @returns {object} (see below)
 * data.windowProps = {
 *   uri: {
 *     hash: window.location.hash,
 *     href: window.location.href,
 *     origin: window.location.origin,
 *     pathname: window.location.pathname
 *   },
 *   pageOffset: {
 *     x: window.pageXOffset,
 *     y: window.pageYOffset
 *   },
 *   clientDimensions: {
 *     height: clientHeight,
 *     width: clientWidth
 *   }
 * }
 */
function getParentWindowProps () {
	if (!FM) {
		return;
	}

	FM.triggerMessage("QZParent", "child:getWindowProps");

	return;
}

/**
 * Get the parent's hash
 * @returns {object} data.hash = hash
 */
function getParentHash() {
	if (!FM) {
		return;
	} else {
		FM.triggerMessage("QZParent", "child:readHash");
	}
}


/**
 * Set up a callback that will handle incoming window properties
 * @param {callback} callback - Function that handles object of window properties
 */
function onReadWindowProps(callback) {
	if (!FM) {
		callback();
	} else {
		FM.onMessage("parent:readWindowProps", callback);
	}
}

/**
 * Set up a callback that will handle incoming parent hash
 * @param {callback} callback - Function that handles incoming hash
 */
function onReadParentHash(callback) {
	if (!FM) {
		callback();
	} else {
		FM.onMessage("parent:readHash", callback);
	}
}

/**
 * Resize the parent to match the new child height.
 */
function resize () {
	var height = $interactive.outerHeight(true);

	updateHeight(height);
}

/**
 * Scroll the parent window to a given location.
 *
 * Call like this:
 * fm.scrollToPosition($("#scrollToThisDiv").offset().top,500)
 *
 * Where 500 is the duration of the scroll animation
 */
function scrollToPosition (position,duration) {
	if (!FM) {
		$("html,body").animate({
			scrollTop: position
		}, duration);
	} else {
		FM.triggerMessage("QZParent", "child:scrollToPosition", {
			position : position,
			duration : 500
		});
	}
}

/**
 * Has iframe become visible in window AKA
 * Has user scrolled into iframe?
 * Call like this:
 *
 * fm.isVisible(function(d){
 *   if(d.data.visible == true) {
 *     // iframe is in view
 *   }
 * });
 */
function isVisible(callback) {
	if (!FM) {
		callback();
	} else {
		FM.onMessage("itemWell:scroll", callback);
	}
}

setupFrameMessenger();

module.exports = {
	resize: resize,
	scrollToPosition: scrollToPosition,
	getParentHash: getParentHash,
	getParentWindowProps: getParentWindowProps,
	onReadParentHash: onReadParentHash,
	onReadWindowProps: onReadWindowProps,
	updateParentHash: updateParentHash,
  isVisible: isVisible
};
