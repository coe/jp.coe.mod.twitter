###
# @require jp.coe.mod.jsOAuth-1.3.3
###

exports = exports or this

compVersions = (strV1, strV2) ->
  nRes = 0
  parts1 = strV1.split('.')
  parts2 = strV2.split('.')
  nLen = Math.max(parts1.length, parts2.length)
  i = 0
  while i < nLen
    nP1 = if i < parts1.length then parseInt(parts1[i], 10) else 0
    nP2 = if i < parts2.length then parseInt(parts2[i], 10) else 0
    if isNaN(nP1)
      nP1 = 0
    if isNaN(nP2)
      nP2 = 0
    if nP1 != nP2
      nRes = if nP1 > nP2 then 1 else -1
      break
    i++
  nRes

exports.Twitter = ((global) ->

  K = ->

  isAndroid = Ti.Platform.osname == 'android'
  jsOAuth = require('jp.coe.mod.jsOAuth-1.3.3')
  PROP_ACCESSTOKEN_KEY = 'twitterAccessTokenKey'
  PROP_ACCESSTOKENSECRET_KEY = 'twitterAccessTokenSecret'

  createAuthWindow2 = (authorizeUrl) ->
    Ti.Platform.openURL authorizeUrl
    return

  createAuthWindow = ->
    self = this
    oauth = @oauthClient
    webViewWindow = Ti.UI.createWindow(title: @windowTitle)
    webView = Ti.UI.createWebView()
    loadingOverlay = Ti.UI.createView(
      backgroundColor: 'black'
      opacity: 0.7
      zIndex: 1)
    actInd = Titanium.UI.createActivityIndicator(
      height: 50
      width: 10
      message: 'Loading...'
      color: 'white')
    closeButton = Ti.UI.createButton(title: @windowClose)
    backButton = Ti.UI.createButton(title: @windowBack)
    navWin = null
    @webView = webView
    webViewWindow.leftNavButton = closeButton
    actInd.show()
    loadingOverlay.add actInd
    webViewWindow.add loadingOverlay
    #TODO aとb決める
    Ti.API.debug 'tiver:' + Titanium.version
    if Ti.UI.iOS != null and compVersions(Titanium.version, '3.1.3') >= 0
      navWin = Ti.UI.iOS.createNavigationWindow(
        modal: true
        window: webViewWindow)
      navWin.open()
    else
      webViewWindow.open modal: true
    webViewWindow.add webView
    closeButton.addEventListener 'click', (e) ->
      if navWin != null
        navWin.close()
      webViewWindow.close()
      self.fireEvent 'cancel',
        success: false
        error: 'The user cancelled.'
        result: null
      return
    backButton.addEventListener 'click', (e) ->
      webView.goBack()
      return
    webView.addEventListener 'beforeload', (e) ->
      if !isAndroid
        webViewWindow.add loadingOverlay
      actInd.show()
      return
    webView.addEventListener 'load', (event) ->
      # If we're not on the Twitter authorize page
      console.log 'twittermod load'
      if event.url.indexOf(self.authorizeUrl) == -1
        console.log 'twittermod load1'
        webViewWindow.remove loadingOverlay
        actInd.hide()
        # Required for Android
        # Switch out close button for back button
        if webViewWindow.leftNavButton != backButton
          webViewWindow.leftNavButton = backButton
      else
        console.log 'twittermod load2'
        # Switch out back button for close button
        if webViewWindow.leftNavButton != closeButton
          webViewWindow.leftNavButton = closeButton
        # Grab the PIN code out of the DOM
        pin = event.source.evalJS('document.getElementById(\'oauth_pin\').getElementsByTagName(\'code\')[0].innerText')
        console.log 'twittermod pin:' + pin
        if !pin
          console.log 'twittermod load21'
          # We're here when:
          # - "No thanks" button clicked
          # - Bad username/password
          webViewWindow.remove loadingOverlay
          actInd.hide()
        else
          console.log 'twittermod load22'
          if !isAndroid
            # on iOS we can close the modal window right away
            if navWin != null
              navWin.close()
            webViewWindow.close()
          oauth.accessTokenUrl = 'https://api.twitter.com/oauth/access_token?oauth_verifier=' + pin
          oauth.fetchAccessToken ((data) ->
            console.log 'twittermod load3'
            #            var returnedParams = oauth.parseTokenRequest(data.text);
            self.fireEvent 'login',
              success: true
              error: false
              accessTokenKey: oauth.getAccessTokenKey()
              accessTokenSecret: oauth.getAccessTokenSecret()
            self.authorized = true
            if isAndroid
              # we have to wait until now to close the modal window on Android: http://developer.appcelerator.com/question/91261/android-probelm-with-httpclient
              if navWin != null
                navWin.close()
              webViewWindow.close()
            return
          ), (data) ->
            console.log 'twittermod load4'
            self.fireEvent 'login',
              success: false
              error: 'Failure to fetch access token, please try again.'
              result: data
            return
      return
    return

  Ti.App.addEventListener 'resumed', (e) ->
    launchOptions = if !isAndroid then Ti.App.getArguments() else e and e.args
    host = undefined
    queryString = undefined
    parameters = undefined
    oauth = undefined
    if launchOptions and launchOptions.url
      host = launchOptions.url.split('?')[0]
      queryString = launchOptions.url.split('?')[1]
      if queryString
        parameters = OAuth.decodeForm(queryString)
        if host == 'snsnet://twitter'
          oauth = new OAuth(
            consumerKey: Alloy.CFG.twitterConsumerKey
            consumerSecret: Alloy.CFG.twitterConsumerSecret)
          oauth.post 'https://api.twitter.com/oauth/access_token', parameters, (e) ->
            # access_token 取得後の処理
            return
        else if host == 'snsnet://facebook'
          # Facebook callback
          url = Alloy.Globals.RestClient.addToURL('https://graph.facebook.com/oauth/access_token', _.extend(OAuth.getParameterMap(parameters),
            client_id: Alloy.CFG.facebookConsumerKey
            client_secret: Alloy.CFG.facebookConsumerSecret
            redirect_uri: Alloy.CFG.facebookCallbackURL))
          Alloy.Globals.RestClient.get url, (e) ->
            # access_token 取得後の処理
            return
    return
  # For SNS Activity
  if isAndroid
    Ti.Android.currentActivity.addEventListener 'app:resume', (e) ->
      Ti.API.debug '***** app:resume:'
      Ti.App.fireEvent 'resumed', args: url: e.data
      return
  ###*
  # Twitter constructor function
  #
  #     var client = Twitter({
  #       consumerKey: "INSERT YOUR KEY HERE",
  #       consumerSecret: "INSERT YOUR SECRET HERE"
  #     });
  #
  # Can be used with or without `new` keyword.
  #
  # @constructor
  # @requires jsOAuth: jp.coe.mod.jsOAuth-1.3.3.js
  # @param options {Object} Configuration object
  # @param options.consumerKey {String} Application consumer key
  # @param options.consumerSecret {String} Application consumer secret
  # @param options.accessTokenKey {String} (optional) The user's access token key
  # @param options.accessTokenSecret {String} (optional) The user's access token secret
  # @param [options.windowTitle="Twitter Authorization"] {String} (optional) The title to display in the authentication window
  ###

  Twitter = (options) ->
    self = undefined
    if this instanceof Twitter
      self = this
    else
      self = new K
    if !options
      options = {}
    self.windowTitle = options.windowTitle or 'Twitter Authorization'
    self.windowClose = options.windowClose or 'Close'
    self.windowBack = options.windowBack or 'Back'
    self.consumerKey = options.consumerKey
    self.consumerSecret = options.consumerSecret
    self.authorizeUrl = 'https://api.twitter.com/oauth/authorize'
    self.accessTokenKey = options.accessTokenKey
    self.accessTokenSecret = options.accessTokenSecret
    self.authorized = false
    self.listeners = {}
    if self.accessTokenKey and self.accessTokenSecret
      self.authorized = true
    options.requestTokenUrl = options.requestTokenUrl or 'https://api.twitter.com/oauth/request_token'
    #起動したいURLスキーム入れる
    console.log ' options.callbackUrl:' + options.callbackUrl
    #options.oauth_callback = options.urlScheme;
    self.oauthClient = jsOAuth.OAuth(options)
    self

  K.prototype = Twitter.prototype

  ###
  # Requests the user to authorize via Twitter through a modal WebView.
  ###

  Twitter::authorize = ->
    self = this
    if @authorized
      # TODO: verify access tokens are still valid?
      # We're putting this fireEvent call inside setTimeout to allow
      # a user to add an event listener below the call to authorize.
      # Not totally sure if the timeout should be greater than 1. It
      # seems to do the trick on iOS/Android.
      setTimeout (->
        self.fireEvent 'login',
          success: true
          error: false
          accessTokenKey: self.accessTokenKey
          accessTokenSecret: self.accessTokenSecret
        return
      ), 1
    else
      # createAuthWindow2(authorizeUrl);
      # createAuthWindow.call(this);
      @oauthClient.fetchRequestToken ((requestParams) ->
        authorizeUrl = self.authorizeUrl + requestParams
        createAuthWindow2 authorizeUrl
        # self.webView.url = authorizeUrl;
        return
      ), (data) ->
        self.fireEvent 'login',
          success: false
          error: 'Failure to fetch access token, please try again.'
          result: data
        return
    return

  ###
  # Make an authenticated Twitter API request.
  #
  # @param {String} path the Twitter API path without leading forward slash. For example: `1/statuses/home_timeline.json`
  # @param {Object} params  the parameters to send along with the API call
  # @param {String} [httpVerb="GET"] the HTTP verb to use
  # @param {Function} callback
  ###

  Twitter::request = (path, params, headers, httpVerb, callback) ->
    self = this
    oauth = @oauthClient
    url = undefined
    if path.match(/^https?:\/\/.+/i)
      url = path
    else
      url = 'https://api.twitter.com/' + path
    oauth.request
      method: httpVerb
      url: url
      data: params
      headers: headers
      success: (data) ->
        callback.call self,
          success: true
          error: false
          result: data
        return
      failure: (data) ->
        callback.call self,
          success: false
          error: 'Request failed'
          result: data
        return
    return

  Twitter::logout = (callback) ->
    self = this
    @oauthClient.setAccessToken '', ''
    @accessTokenKey = null
    @accessTokenSecret = null
    @authorized = false
    callback()
    return

  Twitter::isAuthorized = ->
    @authorized

  ###
  # Add an event listener
  ###

  Twitter::addEventListener = (eventName, callback) ->
    @listeners = @listeners or {}
    @listeners[eventName] = @listeners[eventName] or []
    @listeners[eventName].push callback
    return

  ###
  # Fire an event
  ###

  Twitter::fireEvent = (eventName, data) ->
    eventListeners = @listeners[eventName] or []
    i = 0
    while i < eventListeners.length
      eventListeners[i].call this, data
      i++
    return

  Twitter
)(this)

# ---
# generated by js2coffee 2.0.4