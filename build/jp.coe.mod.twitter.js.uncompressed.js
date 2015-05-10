/*
 * @require jp.coe.mod.jsOAuth-1.3.3
 */
var exports = exports || this;
function compVersions(strV1, strV2) {
	var nRes = 0, parts1 = strV1.split('.'), parts2 = strV2.split('.'), nLen = Math.max(parts1.length, parts2.length);

	for (var i = 0; i < nLen; i++) {
		var nP1 = (i < parts1.length) ? parseInt(parts1[i], 10) : 0, nP2 = (i < parts2.length) ? parseInt(parts2[i], 10) : 0;

		if (isNaN(nP1)) {
			nP1 = 0;
		}
		if (isNaN(nP2)) {
			nP2 = 0;
		}

		if (nP1 != nP2) {
			nRes = (nP1 > nP2) ? 1 : -1;
			break;
		}
	}

	return nRes;
};
exports.Twitter = (function(global) {
	var K = function() {
	}, isAndroid = Ti.Platform.osname === "android", jsOAuth = require('jp.coe.mod.jsOAuth-1.3.3');
	var PROP_ACCESSTOKEN_KEY = "twitterAccessTokenKey";
	var PROP_ACCESSTOKENSECRET_KEY = "twitterAccessTokenSecret";
	Ti.App.addEventListener('resumed', function(e) {
	    var launchOptions = (OS_IOS) ? Ti.App.getArguments() : (e && e.args),
	        host, queryString, parameters, oauth;

	    if (launchOptions && launchOptions.url) {
	        host = launchOptions.url.split('?')[0];
	        queryString = launchOptions.url.split('?')[1];

	        if (queryString) {
	            parameters = OAuth.decodeForm(queryString);
	            if (host === 'snsnet://twitter') {
	                oauth = new OAuth({
	                    consumerKey: Alloy.CFG.twitterConsumerKey,
	                    consumerSecret: Alloy.CFG.twitterConsumerSecret
	                });
	                oauth.post('https://api.twitter.com/oauth/access_token', parameters, function(e) {
	                    // access_token 取得後の処理
	                });

	            } else if (host === 'snsnet://facebook') {
	                // Facebook callback
	                var url = Alloy.Globals.RestClient.addToURL('https://graph.facebook.com/oauth/access_token', _.extend(OAuth.getParameterMap(parameters), {
	                    client_id: Alloy.CFG.facebookConsumerKey,
	                    client_secret: Alloy.CFG.facebookConsumerSecret,
	                    redirect_uri: Alloy.CFG.facebookCallbackURL
	                }));
	                Alloy.Globals.RestClient.get(url, function(e) {
	                    // access_token 取得後の処理
	                });
	            }
	        }
	    }
	});

	// For SNS Activity
	if (true) {
	    Ti.Android.currentActivity.addEventListener('app:resume', function(e) {
	        Ti.API.debug('***** app:resume:');
	        Ti.App.fireEvent('resumed', {
	            args: {
	                url: e.data
	            }
	        });
	    });
	}
	/**
	 * Twitter constructor function
	 *
	 *     var client = Twitter({
	 *       consumerKey: "INSERT YOUR KEY HERE",
	 *       consumerSecret: "INSERT YOUR SECRET HERE"
	 *     });
	 *
	 * Can be used with or without `new` keyword.
	 *
	 * @constructor
	 * @requires jsOAuth: jp.coe.mod.jsOAuth-1.3.3.js
	 * @param options {Object} Configuration object
	 * @param options.consumerKey {String} Application consumer key
	 * @param options.consumerSecret {String} Application consumer secret
	 * @param options.accessTokenKey {String} (optional) The user's access token key
	 * @param options.accessTokenSecret {String} (optional) The user's access token secret
	 * @param [options.windowTitle="Twitter Authorization"] {String} (optional) The title to display in the authentication window
	 */
	var Twitter = function(options) {
		var self;

		if (this instanceof Twitter) {
			self = this;
		} else {
			self = new K();
		}

		if (!options) {
			options = {};
		}
		self.windowTitle = options.windowTitle || "Twitter Authorization";
		self.windowClose = options.windowClose || "Close";
		self.windowBack = options.windowBack || "Back";
		self.consumerKey = options.consumerKey;
		self.consumerSecret = options.consumerSecret;
		self.authorizeUrl = "https://api.twitter.com/oauth/authorize";
		self.accessTokenKey = options.accessTokenKey;
		self.accessTokenSecret = options.accessTokenSecret;
		self.authorized = false;
		self.listeners = {};

		if (self.accessTokenKey && self.accessTokenSecret) {
			self.authorized = true;
		}

		options.requestTokenUrl = options.requestTokenUrl || "https://api.twitter.com/oauth/request_token";
		
		//起動したいURLスキーム入れる
		self.oauth_callback = options.urlScheme;
		self.oauthClient = jsOAuth.OAuth(options);

		return self;
	};

	K.prototype = Twitter.prototype;
	
	function createAuthWindow2(authorizeUrl) {
	  Ti.Platform.openURL(authorizeUrl);
	}

	function createAuthWindow() {
		var self = this, oauth = this.oauthClient, webViewWindow = Ti.UI.createWindow({
			title : this.windowTitle
		}), webView = Ti.UI.createWebView(), loadingOverlay = Ti.UI.createView({
			backgroundColor : 'black',
			opacity : 0.7,
			zIndex : 1
		}), actInd = Titanium.UI.createActivityIndicator({
			height : 50,
			width : 10,
			message : 'Loading...',
			color : 'white'
		}), closeButton = Ti.UI.createButton({
			title : this.windowClose
		}), backButton = Ti.UI.createButton({
			title : this.windowBack
		});
		var navWin = null;
		this.webView = webView;

		webViewWindow.leftNavButton = closeButton;

		actInd.show();
		loadingOverlay.add(actInd);
		webViewWindow.add(loadingOverlay);
		//TODO aとb決める
		Ti.API.debug("tiver:" + Titanium.version);
		
		if (Ti.UI.iOS != null && compVersions(Titanium.version, "3.1.3") >= 0) {
			navWin = Ti.UI.iOS.createNavigationWindow({
				modal : true,
				window : webViewWindow
			});
			navWin.open();
		} else {
			webViewWindow.open({
				modal : true
			});
		};

		webViewWindow.add(webView);

		closeButton.addEventListener('click', function(e) {
			if (navWin != null) navWin.close();
			webViewWindow.close();
			self.fireEvent('cancel', {
				success : false,
				error : "The user cancelled.",
				result : null
			});
		});

		backButton.addEventListener('click', function(e) {
			webView.goBack();
		});

		webView.addEventListener('beforeload', function(e) {
			if (!isAndroid) {
				webViewWindow.add(loadingOverlay);
			}
			actInd.show();
		});

		webView.addEventListener('load', function(event) {
			// If we're not on the Twitter authorize page
			console.log("twittermod load");
			if (event.url.indexOf(self.authorizeUrl) === -1) {
				console.log("twittermod load1");
				webViewWindow.remove(loadingOverlay);
				actInd.hide();
				// Required for Android

				// Switch out close button for back button
				if (webViewWindow.leftNavButton !== backButton) {
					webViewWindow.leftNavButton = backButton;
				}
			} else {
				console.log("twittermod load2");
				// Switch out back button for close button
				if (webViewWindow.leftNavButton !== closeButton) {
					webViewWindow.leftNavButton = closeButton;
				}

				// Grab the PIN code out of the DOM
				var pin = event.source.evalJS("document.getElementById('oauth_pin').getElementsByTagName('code')[0].innerText");
				console.log("twittermod pin:"+pin);
				if (!pin) {
					console.log("twittermod load21");
					// We're here when:
					// - "No thanks" button clicked
					// - Bad username/password

					webViewWindow.remove(loadingOverlay);
					actInd.hide();
				} else {
					console.log("twittermod load22");
					if (!isAndroid) {// on iOS we can close the modal window right away
						if (navWin != null) navWin.close();
						webViewWindow.close();
					}

					oauth.accessTokenUrl = "https://api.twitter.com/oauth/access_token?oauth_verifier=" + pin;

					oauth.fetchAccessToken(function(data) {
						console.log("twittermod load3");
						//            var returnedParams = oauth.parseTokenRequest(data.text);
						self.fireEvent('login', {
							success : true,
							error : false,
							accessTokenKey : oauth.getAccessTokenKey(),
							accessTokenSecret : oauth.getAccessTokenSecret()
						});
						self.authorized = true;
						if (isAndroid) {// we have to wait until now to close the modal window on Android: http://developer.appcelerator.com/question/91261/android-probelm-with-httpclient
							if (navWin != null) navWin.close();
							webViewWindow.close();
						}
					}, function(data) {
						console.log("twittermod load4");
						self.fireEvent('login', {
							success : false,
							error : "Failure to fetch access token, please try again.",
							result : data
						});
					});
				}
			}
		});

	}

	/*
	 * Requests the user to authorize via Twitter through a modal WebView.
	 */
	Twitter.prototype.authorize = function() {
		var self = this;

		if (this.authorized) {
			// TODO: verify access tokens are still valid?

			// We're putting this fireEvent call inside setTimeout to allow
			// a user to add an event listener below the call to authorize.
			// Not totally sure if the timeout should be greater than 1. It
			// seems to do the trick on iOS/Android.
			setTimeout(function() {
				self.fireEvent('login', {
					success : true,
					error : false,
					accessTokenKey : self.accessTokenKey,
					accessTokenSecret : self.accessTokenSecret
				});
			}, 1);
		} else {
			// createAuthWindow2(authorizeUrl);
			// createAuthWindow.call(this);

			this.oauthClient.fetchRequestToken(function(requestParams) {
				var authorizeUrl = self.authorizeUrl + requestParams;
				createAuthWindow2(authorizeUrl);
				// self.webView.url = authorizeUrl;
			}, function(data) {
				self.fireEvent('login', {
					success : false,
					error : "Failure to fetch access token, please try again.",
					result : data
				});
			});
		}
	};

	/*
	 * Make an authenticated Twitter API request.
	 *
	 * @param {String} path the Twitter API path without leading forward slash. For example: `1/statuses/home_timeline.json`
	 * @param {Object} params  the parameters to send along with the API call
	 * @param {String} [httpVerb="GET"] the HTTP verb to use
	 * @param {Function} callback
	 */
	Twitter.prototype.request = function(path, params, headers, httpVerb, callback) {
		var self = this, oauth = this.oauthClient, url;

		if (path.match(/^https?:\/\/.+/i)) {
			url = path;
		} else {
			url = 'https://api.twitter.com/' + path;
		}

		oauth.request({
			method : httpVerb,
			url : url,
			data : params,
			headers : headers,
			success : function(data) {
				callback.call(self, {
					success : true,
					error : false,
					result : data
				});
			},
			failure : function(data) {
				callback.call(self, {
					success : false,
					error : "Request failed",
					result : data
				});
			}
		});
	};

	Twitter.prototype.logout = function(callback) {
		var self = this;

		this.oauthClient.setAccessToken('', '');
		this.accessTokenKey = null;
		this.accessTokenSecret = null;
		this.authorized = false;

		

		callback();
	};
	
	Twitter.prototype.isAuthorized = function() {

		return this.authorized;
	};

	/*
	 * Add an event listener
	 */
	Twitter.prototype.addEventListener = function(eventName, callback) {
		this.listeners = this.listeners || {};
		this.listeners[eventName] = this.listeners[eventName] || [];
		this.listeners[eventName].push(callback);
	};

	/*
	 * Fire an event
	 */
	Twitter.prototype.fireEvent = function(eventName, data) {
		var eventListeners = this.listeners[eventName] || [];
		for (var i = 0; i < eventListeners.length; i++) {
			eventListeners[i].call(this, data);
		}
	};

	return Twitter;
})(this);
