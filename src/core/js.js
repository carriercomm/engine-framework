
///**
// * @param {object} obj
// * @param {string} name
// * @return {object}
// */
function _getPropertyDescriptor(obj, name) {
    if (obj) {
        var pd = Object.getOwnPropertyDescriptor(obj, name);
        return pd || _getPropertyDescriptor(Object.getPrototypeOf(obj), name);
    }
}

function _copyprop(name, source, target) {
    var pd = _getPropertyDescriptor(source, name);
    Object.defineProperty(target, name, pd);
}

/**
 * This module provides some JavaScript utilities.
 *
 * @module Fire.JS
 */
var JS = {

    /**
     * copy all properties not defined in obj from arguments[1...n]
     * @method addon
     * @param {object} obj object to extend its properties
     * @param {object} ...sourceObj source object to copy properties from
     * @return {object} the result obj
     */
    addon: function (obj) {
        'use strict';
        obj = obj || {};
        for (var i = 1, length = arguments.length; i < length; i++) {
            var source = arguments[i];
            for ( var name in source) {
                if ( !(name in obj) ) {
                    _copyprop( name, source, obj);
                }
            }
        }
        return obj;
    },

    /**
     * copy all properties from arguments[1...n] to obj
     * @method mixin
     * @param {object} obj
     * @param {object} ...sourceObj
     * @return {object} the result obj
     */
    mixin: function (obj) {
        'use strict';
        obj = obj || {};
        for (var i = 1, length = arguments.length; i < length; i++) {
            var source = arguments[i];
            if (source) {
                if (typeof source !== 'object') {
                    Fire.error('Fire.mixin called on non-object:', source);
                    continue;
                }
                for ( var name in source) {
                    _copyprop( name, source, obj);
                }
            }
        }
        return obj;
    },

    /**
     * Derive the class from the supplied base class.
     * Both classes are just native javascript constructors, not created by Fire.Class, so
     * usually you will want to inherit using {% crosslink Fire.Class Fire.Class %} instead.
     *
     * @method extend
     * @param {function} cls
     * @param {function} base - the baseclass to inherit
     * @return {function} the result class
     */
    extend: function (cls, base) {
// @ifdef DEV
        if ( !base ) {
            Fire.error('The base class to extend from must be non-nil');
            return;
        }
        if ( !cls ) {
            Fire.error('The class to extend must be non-nil');
            return;
        }
// @endif
        for (var p in base) if (base.hasOwnProperty(p)) cls[p] = base[p];
        function __() { this.constructor = cls; }
        __.prototype = base.prototype;
        cls.prototype = new __();
        return cls;
    },

    /**
     * Removes all enumerable properties from object
     * @method clear
     * @param {any} obj
     */
    clear: function (obj) {
        var keys = Object.keys(obj);
        for (var i = 0; i < keys.length; i++) {
            delete obj[keys[i]];
        }
    }
};

/**
 * Get class name of the object, if object is just a {} (and which class named 'Object'), it will return null.
 * (modified from <a href="http://stackoverflow.com/questions/1249531/how-to-get-a-javascript-objects-class">the code from this stackoverflow post</a>)
 * @method getClassName
 * @param {object|function} obj - instance or constructor
 * @return {string}
 */
JS.getClassName = function (obj) {
    if (typeof obj === 'function' && obj.prototype.__classname__) {
        return obj.prototype.__classname__;
    }
    if (obj && obj.constructor) {
        if (obj.constructor.prototype && obj.constructor.prototype.hasOwnProperty('__classname__')) {
            return obj.__classname__;
        }
        var retval;
        //  for browsers which have name property in the constructor of the object, such as chrome
        if (obj.constructor.name) {
            retval = obj.constructor.name;
        }
        if (obj.constructor.toString) {
            var arr, str = obj.constructor.toString();
            if (str.charAt(0) === '[') {
                // str is "[object objectClass]"
                arr = str.match(/\[\w+\s*(\w+)\]/);
            }
            else {
                // str is function objectClass () {} for IE Firefox
                arr = str.match(/function\s*(\w+)/);
            }
            if (arr && arr.length === 2) {
                retval = arr[1];
            }
        }
        return retval !== 'Object' ? retval : null;
    }
    return null;
};

// id 注册
(function () {
    var _idToClass = {};
    var _nameToClass = {};

    function getRegister (key, table) {
        return function (id, constructor) {
            // deregister old
            if (constructor.prototype.hasOwnProperty(key)) {
                delete table[constructor.prototype[key]];
            }
            constructor.prototype[key] = id;
            // register class
            if (id) {
                var registered = table[id];
                if (registered && registered !== constructor) {
                    var error = 'A Class already exists with the same ' + key + ' : "' + id + '".';
                    // @ifdef EDITOR
                    if (!FIRE_EDITOR) {
                        error += ' (This may be caused by error of unit test.) \
If you dont need serialization, you can set class id to "". You can also call \
Fire.JS.unregisterClass to remove the id of unused class';
                    }
                    // @endif
                    Fire.error(error);
                }
                else {
                    table[id] = constructor;
                }
                //if (id === "") {
                //    console.trace("", table === _nameToClass);
                //}
            }
        };
    }

    /**
     * Register the class by specified id, if its classname is not defined, the class name will also be set.
     * @method _setClassId
     * @param {string} classId
     * @param {function} constructor
     * @private
     */
    JS._setClassId = getRegister('__cid__', _idToClass);

    var doSetClassName = getRegister('__classname__', _nameToClass);

    /**
     * Register the class by specified name manually
     * @method setClassName
     * @param {string} className
     * @param {function} constructor
     */
    JS.setClassName = function (className, constructor) {
        doSetClassName(className, constructor);
        // auto set class id
        if (className && !constructor.prototype.hasOwnProperty('__cid__')) {
            JS._setClassId(className, constructor);
        }
    };

    /**
     * Unregister a class from fireball.
     *
     * If you dont need a class (which defined by Fire.define or Fire.setClassName) anymore,
     * You should unregister the class so that Fireball will not keep its reference anymore.
     * Please note that its still your responsibility to free other references to the class.
     *
     * @method unregisterClass
     * @param {function} ...constructor - the class you will want to unregister, any number of classes can be added
     */
    JS.unregisterClass = function (constructor) {
        'use strict';
        for (var i = 0; i < arguments.length; i++) {
            var p = arguments[i].prototype;
            var classId = p.__cid__;
            if (classId) {
                delete _idToClass[classId];
            }
            var classname = p.__classname__;
            if (classname) {
                delete _nameToClass[classname];
            }
        }
    };

    /**
     * Get the registered class by id
     * @method _getClassById
     * @param {string} classId
     * @return {function} constructor
     * @private
     */
    JS._getClassById = function (classId) {
        var cls = _idToClass[classId];
// @ifdef EDITOR
        if (!cls) {
            if (classId.length === 32) {
                // 尝试解析旧的 uuid 压缩格式
                cls = _idToClass[Editor.compressUuid(classId)];
            }
        }
// @endif
        return cls;
    };

    /**
     * Get the registered class by name
     * @method getClassByName
     * @param {string} classname
     * @return {function} constructor
     */
    JS.getClassByName = function (classname) {
        return _nameToClass[classname];
    };

    /**
     * Get class id of the object
     * @method _getClassId
     * @param {object|function} obj - instance or constructor
     * @return {string}
     * @private
     */
    JS._getClassId = function (obj) {
        if (typeof obj === 'function' && obj.prototype.__cid__) {
            return obj.prototype.__cid__;
        }
        if (obj && obj.constructor) {
            if (obj.constructor.prototype && obj.constructor.prototype.hasOwnProperty('__cid__')) {
                return obj.__cid__;
            }
        }
        return '';
    };

    // @ifdef EDITOR
    Object.defineProperty(JS, '_registeredClassIds', {
        get: function () {
            var dump = {};
            for (var id in _idToClass) {
                dump[id] = _idToClass[id];
            }
            return dump;
        },
        set: function (value) {
            JS.clear(_idToClass);
            for (var id in value) {
                _idToClass[id] = value[id];
            }
        }
    });
    Object.defineProperty(JS, '_registeredClassNames', {
        get: function () {
            var dump = {};
            for (var id in _nameToClass) {
                dump[id] = _nameToClass[id];
            }
            return dump;
        },
        set: function (value) {
            JS.clear(_nameToClass);
            for (var id in value) {
                _nameToClass[id] = value[id];
            }
        }
    });
    // @endif
})();

/**
 * Define get set accessor, just help to call Object.defineProperty(...)
 * @method getset
 * @param {any} obj
 * @param {string} prop
 * @param {function} getter
 * @param {function} setter
 * @param {boolean} [enumerable=false]
 */
JS.getset = function (obj, prop, getter, setter, enumerable) {
    Object.defineProperty(obj, prop, {
        get: getter,
        set: setter,
        enumerable: !!enumerable
    });
};

/**
 * Define get accessor, just help to call Object.defineProperty(...)
 * @method get
 * @param {any} obj
 * @param {string} prop
 * @param {function} getter
 * @param {boolean} [enumerable=false]
 */
JS.get = function (obj, prop, getter, enumerable) {
    Object.defineProperty(obj, prop, {
        get: getter,
        enumerable: !!enumerable
    });
};

/**
 * Define set accessor, just help to call Object.defineProperty(...)
 * @method set
 * @param {any} obj
 * @param {string} prop
 * @param {function} setter
 * @param {boolean} [enumerable=false]
 */
JS.set = function (obj, prop, setter, enumerable) {
    Object.defineProperty(obj, prop, {
        set: setter,
        enumerable: !!enumerable
    });
};

/**
 * Defines a polyfill field for obsoleted codes.
 * @method obsolete
 * @param {any} obj - YourObject or YourClass.prototype
 * @param {string} obsoleted - "OldParam" or "YourClass.OldParam"
 * @param {string} newName - "NewParam"
 * @param {bool} [writable=false]
 */
JS.obsolete = function (obj, obsoleted, newName, writable) {
    var oldName = obsoleted.split('.').slice(-1);
    JS.get(obj, oldName, function () {
        // @ifdef DEV
        Fire.warn('"%s" is deprecated, use "%s" instead please.', obsoleted, newName);
        // @endif
        return obj[newName];
    });
    if (writable) {
        JS.set(obj, oldName, function (value) {
            // @ifdef DEV
            Fire.warn('"%s" is deprecated, use "%s" instead please.', obsoleted, newName);
            // @endif
            obj[newName] = value;
        });
    }
};

/**
 * Defines all polyfill fields for obsoleted codes corresponding to the enumerable properties of props.
 * @method obsoletes
 * @param {any} obj - YourObject or YourClass.prototype
 * @param {any} objName - "YourObject" or "YourClass"
 * @param {object} props
 * @param {bool} [writable=false]
 */
JS.obsoletes = function (obj, objName, props, writable) {
    for (var obsoleted in props) {
        var newName = props[obsoleted];
        JS.obsolete(obj, objName + '.' + obsoleted, newName, writable);
    }
};

/**
 * @class Array
 * @static
 */
JS.Array = {
    /**
     * Removes the first occurrence of a specific object from the array.
     * @method remove
     * @param {any[]} array
     * @param {any} value
     * @return {boolean}
     */
    remove: function (array, value) {
        var index = array.indexOf(value);
        if (index !== -1) {
            array.splice(index, 1);
            return true;
        }
        else {
            return false;
        }
    },

    /**
     * Removes the array item at the specified index.
     * @method removeAt
     * @param {any[]} array
     * @param {number} index
     */
    removeAt: function (array, index) {
        array.splice(index, 1);
    },

    /**
     * Determines whether the array contains a specific value.
     * @method contains
     * @param {any[]} array
     * @param {any} value
     * @return {boolean}
     */
    contains: function (array, value) {
        return array.indexOf(value) !== -1;
    }
};

/**
 * @class String
 * @static
 */
JS.String = {
    /**
     * The startsWith() method determines whether a string begins with the characters of another string, returning true or false as appropriate.
     * @method startsWith
     * @param {string} string
     * @param {string} searchString - The characters to be searched for at the start of this string.
     * @param {string} [position=0] - Optional. The position in this string at which to begin searching for searchString; defaults to 0.
     * @return {boolean}
     */
    startsWith: String.prototype.startsWith ?
        function (string, searchString, position) {
            return string.startsWith(searchString, position);
        } :
        function (string, searchString, position) {
            position = position || 0;
            return string.lastIndexOf(searchString, position) === position;
        },

    /**
     * This method lets you determine whether or not a string ends with another string.
     * @method startsWith
     * @param {string} string
     * @param {string} searchString - The characters to be searched for at the end of this string.
     * @param {string} [position=0] - Optional. Search within this string as if this string were only this long; defaults to this string's actual length, clamped within the range established by this string's length.
     * @return {boolean}
     */
    endsWith: String.prototype.endsWith ?
        function (string, searchString, position) {
            return string.endsWith(searchString, position);
        } :
        function (string, searchString, position) {
            if (typeof position === 'undefined' || position > string.length) {
                position = string.length;
            }
            position -= searchString.length;
            var lastIndex = string.indexOf(searchString, position);
            return lastIndex !== -1 && lastIndex === position;
        }
};

/**
 * @module Fire
 */
/**
 * @property {object} JS - JS utilities accessible globally, see [JS module](./Fire.JS.html).
 */
Fire.JS = JS;

module.exports = JS;
