args = arguments[0] || {}
twitter = require('jp.coe.mod.twitter').Twitter
      consumerKey:"",
      consumerSecret:"",
      accessTokenKey: Ti.App.Properties.getString('twitterAccessTokenKey', ''),
      accessTokenSecret: Ti.App.Properties.getString('twitterAccessTokenSecret', '')
twitter.addEventListener "login",(e)->
	alert "login" 
	
login = ->
	twitter.authorize()

logout = ->
	twitter.logout ->
		alert "logout"

request = ->
	twitter.request()

fireEvent = ->


isAuthorized = ->
	twitter.isAuthorized()