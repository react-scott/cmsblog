var thinkjs = require('thinkjs');
var path = require('path');
var lodash = require("lodash");
var rootPath = path.dirname(__dirname);

var instance = new thinkjs({
  APP_PATH: rootPath + path.sep + 'app',
  RUNTIME_PATH:rootPath + path.sep +'runtime',
  ROOT_PATH: rootPath,
  RESOURCE_PATH: __dirname,
  CMSWING_VERSION:'1.0.0',
  _:lodash,
  env: 'production'
});

instance.run(true);