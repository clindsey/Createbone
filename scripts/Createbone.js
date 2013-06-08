(function () {
  var root = this;

  var previousCreatebone = root.Createbone;

  var array = []
    , push = array.push
    , slice = array.slice
    , splice = array.splice;

  var Createbone;

  if (typeof exports !== "undefined") {
    Createbone = exports;
  } else {
    Createbone = root.Createbone = {};
  }

  Createbone.VERSION = "0.0.1";

  var _ = root._;
  if (!_ && typeof require !== "undefined") _ = require("underscore");

  Createbone.noConflict = function () {
    root.Createbone = previousCreatebone;
    return this;
  }

  var Events = Createbone.Events = {
    on: function (name, callback, context) {
      if (!eventsApi(this, "on", name, [callback, context]) || !callback) return this;
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    }

  , once: function (name, callback, context) {
      if(!eventsApi(this, "once", name, [callback, context]) || !callback) return this;
      var self = this
        , once = _.once(function () {
          self.off(name, once);
          callback.apply(this, arguments);
        });
      once._callback = callback;
      return this.on(name, once, context);
    }

  , off: function (name, callback, context) {
      var retain
        , ev
        , events
        , names
        , i
        , l
        , k;
      if (!this._events || !eventsApi(this, "off", name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }

      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i += 1) {
        name = names[i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j += 1) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) || (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) delete this._events[name];
        }
      }
      return this;
    }

  , trigger: function (name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, "trigger", name, args)) return this;
      var events = this._events[name]
        , allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    }

  , stopListening: function (obj, name, callback) {
      var listeners = this._listeners;
      if (!listeners) return this;
      var deleteListener = !name && !callback;
      if (typeof name === "object") callback = this;
      if (obj) (listeners = {})[obj._listenerId] = obj;
      for (var id in listeners) {
        listeners[id].off(name, callback, this);
        if (deleteListener) delete this._listeners[id];
      }
      return this;
    }
  }

  var eventSplitter = /\s+/;

  var eventsApi = function (obj, action, name, rest) {
    if (!name) return true;

    if (typeof name === "object") {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i += 1) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }
    return true;
  }

  var triggerEvents = function (events, args) {
    var ev
      , i = -1
      , l = events.length
      , a1 = args[0]
      , a2 = args[1]
      , a3 = args[2];

    switch (args.length) {
      case 0: while(++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while(++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while(++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while(++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while(++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
    }
  }

  var listenMethods = {listenTo: "on", listenToOnce: "once"};

  _.each(listenMethods, function (implementation, method) {
    Events[method] = function (obj, name, callback) {
      var listeners = this._listeners || (this._listeners = {})
        , id = obj._listenerId || (obj._listenerId = _.uniqueId("l"));
      listeners[id] = obj;
      if (typeof name === "object") callback = this;
      obj[implementation](name, callback, this);
      return this;
    }
  });

  Events.bind = Events.on;
  Events.unbind = Events.off;

  _.extend(Createbone, Events);

  var Model = Createbone.Model = function (attributes, options) {
    var defaults
      , attrs = attributes || {};

    options || (options = {});

    this.cid = _.uniqueId("c");
    this.attributes = {};

    _.extend(this, _.pick(options, modelOptions));

    if (options.parse) attrs = this.parse(attrs, options) || {};
    if (defaults = _.result(this, "defaults")) {
      attrs = _.defaults({}, attrs, defaults);
    }
    this.set(attrs, options);
    this.changed = {};
    this.initialize.apply(this, arguments);
  }

  var modelOptions = [ "collection" ];

  _.extend(Model.prototype, Events, {
    changed: undefined

  , validationError: undefined

  , idAttribute: "id"

  , initialize: function () {}

  , toJSON: function (options) {
      return _.clone(this.attributes);
    }

  , get: function (attr) {
      return this.attributes[attr];
    }

  , escape: function (attr) {
      return _.escape(this.get(attr));
    }

  , has: function (attr) {
      return this.get(attr) != undefined;
    }

  , set: function (key, val, options) {
      var attr
        , attrs
        , unset
        , changes
        , silent
        , changing
        , prev
        , current;

      if (key == undefined) return this;

      if (typeof key === "object") {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options || (options = {});

      if (!this._validate(attrs, options)) return false;

      unset = options.unset;
      silent = options.silent;
      changes = [];
      changing = this._changing;
      this._changing = true;

      if (!changing) {
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }
      current = this.attributes;
      prev = this._previousAttributes;

      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      for (attr in attrs) {
        val = attrs[attr];
        if (!_.isEqual(current[attr], val)) changes.push(attr);
        if (!_.isEqual(prev[attr], val)) {
          this.changed[attr] = val;
        } else {
          delete this.changed[attr];
        }
        unset ? delete current[attr] : current[attr] = val;
      }

      if (!silent) {
        if (changes.length) this._pending = true;
        for (var i = 0, l = changes.length; i < l; i += 1) {
          this.trigger("change:" + changes[i], this, current[changes[i]], options);
        }
      }

      if (changing) return this;
      if (!silent) {
        while (this._pending) {
          this._pending = false;
          this.trigger("change", this, options);
        }
      }

      this._pending = false;
      this._changing = false;
      return this;
    }

  , unset: function (attr, options) {
      return this.set(attr, undefined, _.extend({}, options, { unset: true }));
    }

  , clear: function (options) {
      var attrs = {};
      for (var key in this.attributes) attrs[key] = undefined;
      return this.set(attrs, _.extend({}, options, { unset: true }));
    }

  , hasChanged: function (attr) {
      if (attr == undefined) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    }

  , changedAttributes: function (diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val
        , changed = false
        , old = this._changing ? this._previousAttributes : this.attributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    }

  , previous: function (attr) {
      if (attr == undefined || !this._previousAttributes) return undefined;
      return this._previousAttributes[attr];
    }

  , previousAttributes: function () {
      return _.clone(this._previousAttributes);
    }

  , parse: function (resp, options) {
      return resp;
    }

  , clone: function () {
      return new this.constructor(this.attributes);
    }

  , isNew: function () {
      return this.id == undefined;
    }

  , isValid: function (options) {
      return this._validate({}, _.extend(options || {}, { validate: true }));
    }

  , _validate: function (attrs, options) {
      if (!options.validate || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validationError = this.validate(attrs, options) || undefined;
      if (!error) return true;
      this.trigger("invalid", this, error, _.extend(options || {}, { validationError: error }));
      return false;
    }
  });

  var modelMethods = [ "keys", "values", "pairs", "invert", "pick", "omit" ];

  _.each(modelMethods, function (method) {
    Model.prototype[method] = function () {
      var args = slice.call(arguments);
      args.unshift(this.attributes);
      return _[method].apply(_, args);
    }
  });

  var extend = function (protoProps, staticProps) {
    var parent = this
      , child;

    if (protoProps && _.has(protoProps, "constructor")) {
      child = protoProps.constructor;
    } else {
      child = function () { return parent.apply(this, arguments); };
    }

    _.extend(child, parent, staticProps);

    var Surrogate = function () { this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    if (protoProps) _.extend(child.prototype, protoProps);

    child.__super__ = parent.prototype;

    return child;
  }

  Model.extend = extend;

  var wrapError = function (model, options) {
    var error = options.error;
    options.error = function (resp) {
      if (error) error(model, resp, options);
      model.trigger("error", model, resp, options);
    }
  }
}).call(this);
