/* jshint node: true */
'use strict';

var debug = require('cog/logger')('rtc-signaller-processor');
var jsonparse = require('cog/jsonparse');

/**
  ## signaller process handling

  When a signaller's underling messenger emits a `data` event this is
  delegated to a simple message parser, which applies the following simple
  logic:

  - Is the message a `/to` message. If so, see if the message is for this
    signaller (checking the target id - 2nd arg).  If so pass the
    remainder of the message onto the standard processing chain.  If not,
    discard the message.

  - Is the message a command message (prefixed with a forward slash). If so,
    look for an appropriate message handler and pass the message payload on
    to it.

  - Finally, does the message match any patterns that we are listening for?
    If so, then pass the entire message contents onto the registered handler.
**/
module.exports = function(signaller) {
  var id = signaller.id;
  var handlers = require('./handlers')(signaller);

  function sendEvent(parts, data) {
    // initialise the event name
    var evtName = parts[0].slice(1);

    // convert any valid json objects to json
    var args = parts.slice(1).map(function(part) {
      if (part.charAt(0) === '{' || part.charAt(0) === '[') {
        try {
          part = JSON.parse(part);
        }
        catch (e) {
        }
      }

      return part;
    }).concat(data);

    signaller.emit.apply(signaller, [evtName].concat(args));
  }

  return function(originalData) {
    var data = originalData;
    var isMatch = true;
    var parts;
    var handler;

    debug('signaller ' + signaller.id + ' received data: ' + originalData);

    // process /to messages
    if (data.slice(0, 3) === '/to') {
      isMatch = data.slice(4, id.length + 4) === id;
      if (isMatch) {
        data = data.slice(5 + id.length);
      }
    }

    // if this is not a match, then bail
    if (! isMatch) {
      return;
    }

    // chop the data into parts
    parts = data.split('|').map(jsonparse);

    // if we have a specific handler for the action, then invoke
    if (parts[0].charAt(0) === '/') {
      // look for a handler for the message type
      handler = handlers[parts[0].slice(1)];

      if (typeof handler == 'function') {
        handler(parts.slice(1), parts[0].slice(1));
      }
      else {
        sendEvent(parts, originalData);
      }
    }

    // process matchers
    signaller.matchers = signaller.matchers.filter(function(rule) {
      var exec = data.slice(0, rule.prefix.length) === rule.prefix;

      if (exec && typeof rule.handler == 'function') {
        rule.handler(data);
      }

      // only keep if not executed
      return !exec;
    });
  };
};