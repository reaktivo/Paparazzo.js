// Generated by CoffeeScript 1.6.3
(function() {
  var EventEmitter, Paparazzo, http,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  http = require('http');

  EventEmitter = require('events').EventEmitter;

  Paparazzo = (function(_super) {
    var imageExpectedLength;

    __extends(Paparazzo, _super);

    Paparazzo.image = '';

    imageExpectedLength = -1;

    function Paparazzo(options) {
      this.options = options;
      this.handleServerResponse = __bind(this.handleServerResponse, this);
      if (!this.options.host) {
        emitter.emit('error', {
          message: 'Host is not defined!'
        });
      }
      this.memory = this.options.memory || 8388608;
      delete this.options.memory;
    }

    Paparazzo.prototype.start = function() {
      var emitter, request;
      emitter = this;
      request = http.get(this.options, function(response) {
        if (response.statusCode !== 200) {
          emitter.emit('error', {
            message: 'Server did not respond with HTTP 200 (OK).'
          });
          return;
        }
        emitter.boundary = emitter.boundaryStringFromContentType(response.headers['content-type']);
        this.data = '';
        response.setEncoding('binary');
        response.on('data', emitter.handleServerResponse);
        return response.on('end', function() {
          return emitter.emit('error', {
            message: "Server closed connection!"
          });
        });
      });
      return request.on('error', function(error) {
        return emitter.emit('error', {
          message: error.message
        });
      });
    };

    /*
    #
    # Find out the boundary string that delimits images.
    # If a boundary string is not found, it fallbacks to a default boundary.
    #
    */


    Paparazzo.prototype.boundaryStringFromContentType = function(type) {
      var boundary, match;
      match = type.match(/multipart\/x-mixed-replace;\s*boundary=(.+)/);
      if ((match != null ? match.length : void 0) > 1) {
        boundary = match[1];
      }
      if (!boundary) {
        boundary = '--myboundary';
        this.emit('error', {
          message: "Couldn't find a boundary string. Falling back to --myboundary."
        });
      } else if (boundary.indexOf('--' !== 0)) {
        boundary = '--' + boundary;
      }
      return boundary;
    };

    /*
    #
    # Handles chunks of data sent by the server and restore images.
    #
    # A MJPG image boundary typically looks like this:
    # --myboundary
    # Content-Type: image/jpeg
    # Content-Length: 64199
    # \r\n
    #
    */


    Paparazzo.prototype.handleServerResponse = function(chunk) {
      var boundary_index, matches, newImageBeginning, remaining, typeMatches;
      boundary_index = chunk.indexOf(this.boundary);
      if (boundary_index !== -1) {
        this.data += chunk.substring(0, boundary_index);
        this.image = this.data;
        this.emit('update', this.image);
        this.data = '';
        remaining = chunk.substring(boundary_index);
        typeMatches = remaining.match(/Content-Type:\s+image\/jpeg\s+/);
        matches = remaining.match(/Content-Length:\s+(\d+)\s+/);
        if ((matches != null) && matches.length > 1) {
          newImageBeginning = remaining.indexOf(matches[0]) + matches[0].length;
          this.imageExpectedLength = matches[1];
          this.data += remaining.substring(newImageBeginning);
        } else if (typeMatches != null) {
          newImageBeginning = remaining.indexOf(typeMatches[0]) + typeMatches[0].length;
          this.data += remaining.substring(newImageBeginning);
        } else {
          newImageBeginning = boundary_index + this.boundary.length;
          this.emit('error', {
            message: 'Could not find beginning of next image'
          });
        }
      } else {
        this.data += chunk;
      }
      if (this.data.length >= this.memory) {
        this.data = '';
        return this.emit('error', {
          message: 'Data buffer just reached threshold, flushing memory'
        });
      }
    };

    return Paparazzo;

  })(EventEmitter);

  module.exports = Paparazzo;

}).call(this);
