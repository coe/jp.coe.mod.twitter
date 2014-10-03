
var twitter = require('twitter').Twitter({
      consumerKey:config.twitter.consumerKey,
      consumerSecret:config.twitter.consumerSecret,
      accessTokenKey: Ti.App.Properties.getString('twitterAccessTokenKey', ''),
      accessTokenSecret: Ti.App.Properties.getString('twitterAccessTokenSecret', '')
    });