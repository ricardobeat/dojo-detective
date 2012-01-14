
// Run $ expresso

/**
 * Module dependencies.
 */

var app = require('../app')
  , assert = require('assert');


module.exports = {
  'GET /': function(){
    assert.response(app,
      { url: '/' },
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }},
      function(res){
        assert.includes(res.body, '<title>Start Ocean - Watching</title>');
      });
  },
  'GET /admin': function(){
    assert.response(app,
      { url: '/' },
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }},
      function(res){
        assert.includes(res.body, '<title>Start Ocean - Admin</title>');
      });
  },
  'GET /detective': function(){
    assert.response(app,
      { url: '/' },
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }},
      function(res){
        assert.includes(res.body, '<title>Start Ocean - Detective</title>');
      });
  }
};