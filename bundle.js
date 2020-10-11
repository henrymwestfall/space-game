(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/**
 * greiner-hormann v1.4.1
 * Greiner-Hormann clipping algorithm
 *
 * @author Alexander Milevski <info@w8r.name>
 * @license MIT
 * @preserve
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.greinerHormann = {})));
}(this, (function (exports) { 'use strict';

  var Vertex = function Vertex (x, y) {
    if (arguments.length === 1) {
      // Coords
      if (Array.isArray(x)) {
        y = x[1];
        x = x[0];
      } else {
        y = x.y;
        x = x.x;
      }
    }

    /**
     * X coordinate
     * @type {Number}
     */
    this.x = x;

    /**
     * Y coordinate
     * @type {Number}
     */
    this.y = y;

    /**
     * Next node
     * @type {Vertex}
     */
    this.next = null;

    /**
     * Previous vertex
     * @type {Vertex}
     */
    this.prev = null;

    /**
     * Corresponding intersection in other polygon
     */
    this._corresponding = null;

    /**
     * Distance from previous
     */
    this._distance = 0.0;

    /**
     * Entry/exit point in another polygon
     * @type {Boolean}
     */
    this._isEntry = true;

    /**
     * Intersection vertex flag
     * @type {Boolean}
     */
    this._isIntersection = false;

    /**
     * Loop check
     * @type {Boolean}
     */
    this._visited = false;
  };


  /**
   * Creates intersection vertex
   * @param{Number} x
   * @param{Number} y
   * @param{Number} distance
   * @return {Vertex}
   */
  Vertex.createIntersection = function createIntersection (x, y, distance) {
    var vertex = new Vertex(x, y);
    vertex._distance = distance;
    vertex._isIntersection = true;
    vertex._isEntry = false;
    return vertex;
  };


  /**
   * Mark as visited
   */
  Vertex.prototype.visit = function visit () {
    this._visited = true;
    if (this._corresponding !== null && !this._corresponding._visited) {
        this._corresponding.visit();
    }
  };


  /**
   * Convenience
   * @param{Vertex}v
   * @return {Boolean}
   */
  Vertex.prototype.equals = function equals (v) {
    return this.x === v.x && this.y === v.y;
  };


  /**
   * Check if vertex is inside a polygon by odd-even rule:
   * If the number of intersections of a ray out of the point and polygon
   * segments is odd - the point is inside.
   * @param {Polygon} poly
   * @return {Boolean}
   */
  Vertex.prototype.isInside = function isInside (poly) {
    var oddNodes = false;
    var vertex = poly.first;
    var next = vertex.next;
    var x = this.x;
    var y = this.y;

    do {
      if ((vertex.y < y && next.y >= y ||
             next.y < y && vertex.y >= y) &&
          (vertex.x <= x || next.x <= x)) {
        oddNodes ^= (vertex.x + (y - vertex.y) /
              (next.y - vertex.y) * (next.x - vertex.x) < x);
      }

      vertex = vertex.next;
      next = vertex.next || poly.first;
    } while (!vertex.equals(poly.first));

    return oddNodes;
  };

  var Intersection = function Intersection(s1, s2, c1, c2) {

    /**
     * @type {Number}
     */
    this.x = 0.0;

    /**
     * @type {Number}
     */
    this.y = 0.0;

    /**
     * @type {Number}
     */
    this.toSource = 0.0;

    /**
     * @type {Number}
     */
    this.toClip = 0.0;

    var d = (c2.y - c1.y) * (s2.x - s1.x) - (c2.x - c1.x) * (s2.y - s1.y);

    if (d === 0) { return; }

    /**
     * @type {Number}
     */
    this.toSource = ((c2.x - c1.x) * (s1.y - c1.y) - (c2.y - c1.y) * (s1.x - c1.x)) / d;

    /**
     * @type {Number}
     */
    this.toClip = ((s2.x - s1.x) * (s1.y - c1.y) - (s2.y - s1.y) * (s1.x - c1.x)) / d;

    if (this.valid()) {
        this.x = s1.x + this.toSource * (s2.x - s1.x);
        this.y = s1.y + this.toSource * (s2.y - s1.y);
    }
  };


  /**
   * @return {Boolean}
   */
  Intersection.prototype.valid = function valid () {
      return (0 < this.toSource && this.toSource < 1) && (0 < this.toClip && this.toClip < 1);
  };

  var Polygon = function Polygon (p, arrayVertices) {
    var this$1 = this;


    /**
     * @type {Vertex}
     */
    this.first = null;

    /**
     * @type {Number}
     */
    this.vertices = 0;

    /**
     * @type {Vertex}
     */
    this._lastUnprocessed = null;

    /**
     * Whether to handle input and output as [x,y] or {x:x,y:y}
     * @type {Boolean}
     */
    this._arrayVertices = (typeof arrayVertices === "undefined") ?
        Array.isArray(p[0]) :
        arrayVertices;

    for (var i = 0, len = p.length; i < len; i++) {
      this$1.addVertex(new Vertex(p[i]));
    }
  };


  /**
   * Add a vertex object to the polygon
   * (vertex is added at the 'end' of the list')
   *
   * @param vertex
   */
  Polygon.prototype.addVertex = function addVertex (vertex) {
    if (this.first === null) {
      this.first    = vertex;
      this.first.next = vertex;
      this.first.prev = vertex;
    } else {
      var next = this.first;
      var prev = next.prev;

      next.prev = vertex;
      vertex.next = next;
      vertex.prev = prev;
      prev.next = vertex;
    }
    this.vertices++;
  };


  /**
   * Inserts a vertex inbetween start and end
   *
   * @param {Vertex} vertex
   * @param {Vertex} start
   * @param {Vertex} end
   */
  Polygon.prototype.insertVertex = function insertVertex (vertex, start, end) {
    var prev, curr = start;

    while (!curr.equals(end) && curr._distance < vertex._distance) {
      curr = curr.next;
    }

    vertex.next = curr;
    prev      = curr.prev;

    vertex.prev = prev;
    prev.next = vertex;
    curr.prev = vertex;

    this.vertices++;
  };

  /**
   * Get next non-intersection point
   * @param{Vertex} v
   * @return {Vertex}
   */
  Polygon.prototype.getNext = function getNext (v) {
    var c = v;
    while (c._isIntersection) { c = c.next; }
    return c;
  };


  /**
   * Unvisited intersection
   * @return {Vertex}
   */
  Polygon.prototype.getFirstIntersect = function getFirstIntersect () {
    var v = this._firstIntersect || this.first;

    do {
      if (v._isIntersection && !v._visited) { break; }

      v = v.next;
    } while (!v.equals(this.first));

    this._firstIntersect = v;
    return v;
  };


  /**
   * Does the polygon have unvisited vertices
   * @return {Boolean} [description]
   */
  Polygon.prototype.hasUnprocessed = function hasUnprocessed () {
      var this$1 = this;

    var v = this._lastUnprocessed || this.first;
    do {
      if (v._isIntersection && !v._visited) {
        this$1._lastUnprocessed = v;
        return true;
      }

      v = v.next;
    } while (!v.equals(this.first));

    this._lastUnprocessed = null;
    return false;
  };


  /**
   * The output depends on what you put in, arrays or objects
   * @return {Array.<Array<Number>|Array.<Object>}
   */
  Polygon.prototype.getPoints = function getPoints () {
    var points = [];
    var v = this.first;

    if (this._arrayVertices) {
      do {
        points.push([v.x, v.y]);
        v = v.next;
      } while (v !== this.first);
    } else {
      do {
        points.push({
          x: v.x,
          y: v.y
        });
        v = v.next;
      } while (v !== this.first);
    }

    return points;
  };

  /**
   * Clip polygon against another one.
   * Result depends on algorithm direction:
   *
   * Intersection: forwards forwards
   * Union:      backwars backwards
   * Diff:       backwards forwards
   *
   * @param {Polygon} clip
   * @param {Boolean} sourceForwards
   * @param {Boolean} clipForwards
   */
  Polygon.prototype.clip = function clip (clip$1, sourceForwards, clipForwards) {
      var this$1 = this;

    var sourceVertex = this.first;
    var clipVertex = clip$1.first;
    var sourceInClip, clipInSource;

    var isUnion      = !sourceForwards && !clipForwards;
    var isIntersection = sourceForwards && clipForwards;

    // calculate and mark intersections
    do {
      if (!sourceVertex._isIntersection) {
        do {
          if (!clipVertex._isIntersection) {
            var i = new Intersection(
              sourceVertex,
              this$1.getNext(sourceVertex.next),
              clipVertex, clip$1.getNext(clipVertex.next)
            );

            if (i.valid()) {
              var sourceIntersection = Vertex.createIntersection(i.x, i.y, i.toSource);
              var clipIntersection = Vertex.createIntersection(i.x, i.y, i.toClip);

              sourceIntersection._corresponding = clipIntersection;
              clipIntersection._corresponding = sourceIntersection;

              this$1.insertVertex(sourceIntersection, sourceVertex, this$1.getNext(sourceVertex.next));
              clip$1.insertVertex(clipIntersection, clipVertex, clip$1.getNext(clipVertex.next));
            }
          }
          clipVertex = clipVertex.next;
        } while (!clipVertex.equals(clip$1.first));
      }

      sourceVertex = sourceVertex.next;
    } while (!sourceVertex.equals(this.first));

      // phase two - identify entry/exit points
    sourceVertex = this.first;
    clipVertex = clip$1.first;

    sourceInClip = sourceVertex.isInside(clip$1);
    clipInSource = clipVertex.isInside(this);

    sourceForwards ^= sourceInClip;
    clipForwards ^= clipInSource;

    do {
      if (sourceVertex._isIntersection) {
        sourceVertex._isEntry = sourceForwards;
        sourceForwards = !sourceForwards;
      }
      sourceVertex = sourceVertex.next;
    } while (!sourceVertex.equals(this.first));

    do {
      if (clipVertex._isIntersection) {
        clipVertex._isEntry = clipForwards;
        clipForwards = !clipForwards;
      }
      clipVertex = clipVertex.next;
    } while (!clipVertex.equals(clip$1.first));

    // phase three - construct a list of clipped polygons
    var list = [];

    while (this.hasUnprocessed()) {
      var current = this$1.getFirstIntersect();
      // keep format
      var clipped = new Polygon([], this$1._arrayVertices);

      clipped.addVertex(new Vertex(current.x, current.y));
      do {
        current.visit();
        if (current._isEntry) {
          do {
            current = current.next;
            clipped.addVertex(new Vertex(current.x, current.y));
          } while (!current._isIntersection);

        } else {
          do {
            current = current.prev;
            clipped.addVertex(new Vertex(current.x, current.y));
          } while (!current._isIntersection);
        }
        current = current._corresponding;
      } while (!current._visited);

      list.push(clipped.getPoints());
    }

    if (list.length === 0) {
      if (isUnion) {
        if (sourceInClip)    { list.push(clip$1.getPoints()); }
        else if (clipInSource) { list.push(this.getPoints()); }
        else                 { list.push(this.getPoints(), clip$1.getPoints()); }
      } else if (isIntersection) { // intersection
        if (sourceInClip)    { list.push(this.getPoints()); }
        else if (clipInSource) { list.push(clip$1.getPoints()); }
      } else { // diff
        if (sourceInClip)    { list.push(clip$1.getPoints(), this.getPoints()); }
        else if (clipInSource) { list.push(this.getPoints(), clip$1.getPoints()); }
        else                 { list.push(this.getPoints()); }
      }
      if (list.length === 0) { list = null; }
    }

    return list;
  };

  /**
   * Clip driver
   * @param  {Array.<Array.<Number>>} polygonA
   * @param  {Array.<Array.<Number>>} polygonB
   * @param  {Boolean}                sourceForwards
   * @param  {Boolean}                clipForwards
   * @return {Array.<Array.<Number>>}
   */
  function boolean (polygonA, polygonB, eA, eB) {
    var source = new Polygon(polygonA);
    var clip = new Polygon(polygonB);
    return source.clip(clip, eA, eB);
  }

  /**
   * @param  {Array.<Array.<Number>|Array.<Object>} polygonA
   * @param  {Array.<Array.<Number>|Array.<Object>} polygonB
   * @return {Array.<Array.<Number>>|Array.<Array.<Object>|Null}
   */
  function union (polygonA, polygonB) {
    return boolean(polygonA, polygonB, false, false);
  }

  /**
   * @param  {Array.<Array.<Number>|Array.<Object>} polygonA
   * @param  {Array.<Array.<Number>|Array.<Object>} polygonB
   * @return {Array.<Array.<Number>>|Array.<Array.<Object>>|Null}
   */
  function intersection (polygonA, polygonB) {
    return boolean(polygonA, polygonB, true, true);
  }

  /**
   * @param  {Array.<Array.<Number>|Array.<Object>} polygonA
   * @param  {Array.<Array.<Number>|Array.<Object>} polygonB
   * @return {Array.<Array.<Number>>|Array.<Array.<Object>>|Null}
   */
  function diff (polygonA, polygonB) {
    return boolean(polygonA, polygonB, false, true);
  }

  var clip = boolean;

  exports.union = union;
  exports.intersection = intersection;
  exports.diff = diff;
  exports.clip = clip;

  Object.defineProperty(exports, '__esModule', { value: true });

})));


},{}],2:[function(require,module,exports){
exports = module.exports = Victor;

/**
 * # Victor - A JavaScript 2D vector class with methods for common vector operations
 */

/**
 * Constructor. Will also work without the `new` keyword
 *
 * ### Examples:
 *     var vec1 = new Victor(100, 50);
 *     var vec2 = Victor(42, 1337);
 *
 * @param {Number} x Value of the x axis
 * @param {Number} y Value of the y axis
 * @return {Victor}
 * @api public
 */
function Victor (x, y) {
	if (!(this instanceof Victor)) {
		return new Victor(x, y);
	}

	/**
	 * The X axis
	 *
	 * ### Examples:
	 *     var vec = new Victor.fromArray(42, 21);
	 *
	 *     vec.x;
	 *     // => 42
	 *
	 * @api public
	 */
	this.x = x || 0;

	/**
	 * The Y axis
	 *
	 * ### Examples:
	 *     var vec = new Victor.fromArray(42, 21);
	 *
	 *     vec.y;
	 *     // => 21
	 *
	 * @api public
	 */
	this.y = y || 0;
};

/**
 * # Static
 */

/**
 * Creates a new instance from an array
 *
 * ### Examples:
 *     var vec = Victor.fromArray([42, 21]);
 *
 *     vec.toString();
 *     // => x:42, y:21
 *
 * @name Victor.fromArray
 * @param {Array} array Array with the x and y values at index 0 and 1 respectively
 * @return {Victor} The new instance
 * @api public
 */
Victor.fromArray = function (arr) {
	return new Victor(arr[0] || 0, arr[1] || 0);
};

/**
 * Creates a new instance from an object
 *
 * ### Examples:
 *     var vec = Victor.fromObject({ x: 42, y: 21 });
 *
 *     vec.toString();
 *     // => x:42, y:21
 *
 * @name Victor.fromObject
 * @param {Object} obj Object with the values for x and y
 * @return {Victor} The new instance
 * @api public
 */
Victor.fromObject = function (obj) {
	return new Victor(obj.x || 0, obj.y || 0);
};

/**
 * # Manipulation
 *
 * These functions are chainable.
 */

/**
 * Adds another vector's X axis to this one
 *
 * ### Examples:
 *     var vec1 = new Victor(10, 10);
 *     var vec2 = new Victor(20, 30);
 *
 *     vec1.addX(vec2);
 *     vec1.toString();
 *     // => x:30, y:10
 *
 * @param {Victor} vector The other vector you want to add to this one
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.addX = function (vec) {
	this.x += vec.x;
	return this;
};

/**
 * Adds another vector's Y axis to this one
 *
 * ### Examples:
 *     var vec1 = new Victor(10, 10);
 *     var vec2 = new Victor(20, 30);
 *
 *     vec1.addY(vec2);
 *     vec1.toString();
 *     // => x:10, y:40
 *
 * @param {Victor} vector The other vector you want to add to this one
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.addY = function (vec) {
	this.y += vec.y;
	return this;
};

/**
 * Adds another vector to this one
 *
 * ### Examples:
 *     var vec1 = new Victor(10, 10);
 *     var vec2 = new Victor(20, 30);
 *
 *     vec1.add(vec2);
 *     vec1.toString();
 *     // => x:30, y:40
 *
 * @param {Victor} vector The other vector you want to add to this one
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.add = function (vec) {
	this.x += vec.x;
	this.y += vec.y;
	return this;
};

/**
 * Adds the given scalar to both vector axis
 *
 * ### Examples:
 *     var vec = new Victor(1, 2);
 *
 *     vec.addScalar(2);
 *     vec.toString();
 *     // => x: 3, y: 4
 *
 * @param {Number} scalar The scalar to add
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.addScalar = function (scalar) {
	this.x += scalar;
	this.y += scalar;
	return this;
};

/**
 * Adds the given scalar to the X axis
 *
 * ### Examples:
 *     var vec = new Victor(1, 2);
 *
 *     vec.addScalarX(2);
 *     vec.toString();
 *     // => x: 3, y: 2
 *
 * @param {Number} scalar The scalar to add
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.addScalarX = function (scalar) {
	this.x += scalar;
	return this;
};

/**
 * Adds the given scalar to the Y axis
 *
 * ### Examples:
 *     var vec = new Victor(1, 2);
 *
 *     vec.addScalarY(2);
 *     vec.toString();
 *     // => x: 1, y: 4
 *
 * @param {Number} scalar The scalar to add
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.addScalarY = function (scalar) {
	this.y += scalar;
	return this;
};

/**
 * Subtracts the X axis of another vector from this one
 *
 * ### Examples:
 *     var vec1 = new Victor(100, 50);
 *     var vec2 = new Victor(20, 30);
 *
 *     vec1.subtractX(vec2);
 *     vec1.toString();
 *     // => x:80, y:50
 *
 * @param {Victor} vector The other vector you want subtract from this one
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.subtractX = function (vec) {
	this.x -= vec.x;
	return this;
};

/**
 * Subtracts the Y axis of another vector from this one
 *
 * ### Examples:
 *     var vec1 = new Victor(100, 50);
 *     var vec2 = new Victor(20, 30);
 *
 *     vec1.subtractY(vec2);
 *     vec1.toString();
 *     // => x:100, y:20
 *
 * @param {Victor} vector The other vector you want subtract from this one
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.subtractY = function (vec) {
	this.y -= vec.y;
	return this;
};

/**
 * Subtracts another vector from this one
 *
 * ### Examples:
 *     var vec1 = new Victor(100, 50);
 *     var vec2 = new Victor(20, 30);
 *
 *     vec1.subtract(vec2);
 *     vec1.toString();
 *     // => x:80, y:20
 *
 * @param {Victor} vector The other vector you want subtract from this one
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.subtract = function (vec) {
	this.x -= vec.x;
	this.y -= vec.y;
	return this;
};

/**
 * Subtracts the given scalar from both axis
 *
 * ### Examples:
 *     var vec = new Victor(100, 200);
 *
 *     vec.subtractScalar(20);
 *     vec.toString();
 *     // => x: 80, y: 180
 *
 * @param {Number} scalar The scalar to subtract
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.subtractScalar = function (scalar) {
	this.x -= scalar;
	this.y -= scalar;
	return this;
};

/**
 * Subtracts the given scalar from the X axis
 *
 * ### Examples:
 *     var vec = new Victor(100, 200);
 *
 *     vec.subtractScalarX(20);
 *     vec.toString();
 *     // => x: 80, y: 200
 *
 * @param {Number} scalar The scalar to subtract
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.subtractScalarX = function (scalar) {
	this.x -= scalar;
	return this;
};

/**
 * Subtracts the given scalar from the Y axis
 *
 * ### Examples:
 *     var vec = new Victor(100, 200);
 *
 *     vec.subtractScalarY(20);
 *     vec.toString();
 *     // => x: 100, y: 180
 *
 * @param {Number} scalar The scalar to subtract
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.subtractScalarY = function (scalar) {
	this.y -= scalar;
	return this;
};

/**
 * Divides the X axis by the x component of given vector
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *     var vec2 = new Victor(2, 0);
 *
 *     vec.divideX(vec2);
 *     vec.toString();
 *     // => x:50, y:50
 *
 * @param {Victor} vector The other vector you want divide by
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.divideX = function (vector) {
	this.x /= vector.x;
	return this;
};

/**
 * Divides the Y axis by the y component of given vector
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *     var vec2 = new Victor(0, 2);
 *
 *     vec.divideY(vec2);
 *     vec.toString();
 *     // => x:100, y:25
 *
 * @param {Victor} vector The other vector you want divide by
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.divideY = function (vector) {
	this.y /= vector.y;
	return this;
};

/**
 * Divides both vector axis by a axis values of given vector
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *     var vec2 = new Victor(2, 2);
 *
 *     vec.divide(vec2);
 *     vec.toString();
 *     // => x:50, y:25
 *
 * @param {Victor} vector The vector to divide by
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.divide = function (vector) {
	this.x /= vector.x;
	this.y /= vector.y;
	return this;
};

/**
 * Divides both vector axis by the given scalar value
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *
 *     vec.divideScalar(2);
 *     vec.toString();
 *     // => x:50, y:25
 *
 * @param {Number} The scalar to divide by
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.divideScalar = function (scalar) {
	if (scalar !== 0) {
		this.x /= scalar;
		this.y /= scalar;
	} else {
		this.x = 0;
		this.y = 0;
	}

	return this;
};

/**
 * Divides the X axis by the given scalar value
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *
 *     vec.divideScalarX(2);
 *     vec.toString();
 *     // => x:50, y:50
 *
 * @param {Number} The scalar to divide by
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.divideScalarX = function (scalar) {
	if (scalar !== 0) {
		this.x /= scalar;
	} else {
		this.x = 0;
	}
	return this;
};

/**
 * Divides the Y axis by the given scalar value
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *
 *     vec.divideScalarY(2);
 *     vec.toString();
 *     // => x:100, y:25
 *
 * @param {Number} The scalar to divide by
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.divideScalarY = function (scalar) {
	if (scalar !== 0) {
		this.y /= scalar;
	} else {
		this.y = 0;
	}
	return this;
};

/**
 * Inverts the X axis
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *
 *     vec.invertX();
 *     vec.toString();
 *     // => x:-100, y:50
 *
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.invertX = function () {
	this.x *= -1;
	return this;
};

/**
 * Inverts the Y axis
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *
 *     vec.invertY();
 *     vec.toString();
 *     // => x:100, y:-50
 *
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.invertY = function () {
	this.y *= -1;
	return this;
};

/**
 * Inverts both axis
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *
 *     vec.invert();
 *     vec.toString();
 *     // => x:-100, y:-50
 *
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.invert = function () {
	this.invertX();
	this.invertY();
	return this;
};

/**
 * Multiplies the X axis by X component of given vector
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *     var vec2 = new Victor(2, 0);
 *
 *     vec.multiplyX(vec2);
 *     vec.toString();
 *     // => x:200, y:50
 *
 * @param {Victor} vector The vector to multiply the axis with
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.multiplyX = function (vector) {
	this.x *= vector.x;
	return this;
};

/**
 * Multiplies the Y axis by Y component of given vector
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *     var vec2 = new Victor(0, 2);
 *
 *     vec.multiplyX(vec2);
 *     vec.toString();
 *     // => x:100, y:100
 *
 * @param {Victor} vector The vector to multiply the axis with
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.multiplyY = function (vector) {
	this.y *= vector.y;
	return this;
};

/**
 * Multiplies both vector axis by values from a given vector
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *     var vec2 = new Victor(2, 2);
 *
 *     vec.multiply(vec2);
 *     vec.toString();
 *     // => x:200, y:100
 *
 * @param {Victor} vector The vector to multiply by
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.multiply = function (vector) {
	this.x *= vector.x;
	this.y *= vector.y;
	return this;
};

/**
 * Multiplies both vector axis by the given scalar value
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *
 *     vec.multiplyScalar(2);
 *     vec.toString();
 *     // => x:200, y:100
 *
 * @param {Number} The scalar to multiply by
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.multiplyScalar = function (scalar) {
	this.x *= scalar;
	this.y *= scalar;
	return this;
};

/**
 * Multiplies the X axis by the given scalar
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *
 *     vec.multiplyScalarX(2);
 *     vec.toString();
 *     // => x:200, y:50
 *
 * @param {Number} The scalar to multiply the axis with
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.multiplyScalarX = function (scalar) {
	this.x *= scalar;
	return this;
};

/**
 * Multiplies the Y axis by the given scalar
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *
 *     vec.multiplyScalarY(2);
 *     vec.toString();
 *     // => x:100, y:100
 *
 * @param {Number} The scalar to multiply the axis with
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.multiplyScalarY = function (scalar) {
	this.y *= scalar;
	return this;
};

/**
 * Normalize
 *
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.normalize = function () {
	var length = this.length();

	if (length === 0) {
		this.x = 1;
		this.y = 0;
	} else {
		this.divide(Victor(length, length));
	}
	return this;
};

Victor.prototype.norm = Victor.prototype.normalize;

/**
 * If the absolute vector axis is greater than `max`, multiplies the axis by `factor`
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *
 *     vec.limit(80, 0.9);
 *     vec.toString();
 *     // => x:90, y:50
 *
 * @param {Number} max The maximum value for both x and y axis
 * @param {Number} factor Factor by which the axis are to be multiplied with
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.limit = function (max, factor) {
	if (Math.abs(this.x) > max){ this.x *= factor; }
	if (Math.abs(this.y) > max){ this.y *= factor; }
	return this;
};

/**
 * Randomizes both vector axis with a value between 2 vectors
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *
 *     vec.randomize(new Victor(50, 60), new Victor(70, 80`));
 *     vec.toString();
 *     // => x:67, y:73
 *
 * @param {Victor} topLeft first vector
 * @param {Victor} bottomRight second vector
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.randomize = function (topLeft, bottomRight) {
	this.randomizeX(topLeft, bottomRight);
	this.randomizeY(topLeft, bottomRight);

	return this;
};

/**
 * Randomizes the y axis with a value between 2 vectors
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *
 *     vec.randomizeX(new Victor(50, 60), new Victor(70, 80`));
 *     vec.toString();
 *     // => x:55, y:50
 *
 * @param {Victor} topLeft first vector
 * @param {Victor} bottomRight second vector
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.randomizeX = function (topLeft, bottomRight) {
	var min = Math.min(topLeft.x, bottomRight.x);
	var max = Math.max(topLeft.x, bottomRight.x);
	this.x = random(min, max);
	return this;
};

/**
 * Randomizes the y axis with a value between 2 vectors
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *
 *     vec.randomizeY(new Victor(50, 60), new Victor(70, 80`));
 *     vec.toString();
 *     // => x:100, y:66
 *
 * @param {Victor} topLeft first vector
 * @param {Victor} bottomRight second vector
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.randomizeY = function (topLeft, bottomRight) {
	var min = Math.min(topLeft.y, bottomRight.y);
	var max = Math.max(topLeft.y, bottomRight.y);
	this.y = random(min, max);
	return this;
};

/**
 * Randomly randomizes either axis between 2 vectors
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *
 *     vec.randomizeAny(new Victor(50, 60), new Victor(70, 80));
 *     vec.toString();
 *     // => x:100, y:77
 *
 * @param {Victor} topLeft first vector
 * @param {Victor} bottomRight second vector
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.randomizeAny = function (topLeft, bottomRight) {
	if (!! Math.round(Math.random())) {
		this.randomizeX(topLeft, bottomRight);
	} else {
		this.randomizeY(topLeft, bottomRight);
	}
	return this;
};

/**
 * Rounds both axis to an integer value
 *
 * ### Examples:
 *     var vec = new Victor(100.2, 50.9);
 *
 *     vec.unfloat();
 *     vec.toString();
 *     // => x:100, y:51
 *
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.unfloat = function () {
	this.x = Math.round(this.x);
	this.y = Math.round(this.y);
	return this;
};

/**
 * Rounds both axis to a certain precision
 *
 * ### Examples:
 *     var vec = new Victor(100.2, 50.9);
 *
 *     vec.unfloat();
 *     vec.toString();
 *     // => x:100, y:51
 *
 * @param {Number} Precision (default: 8)
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.toFixed = function (precision) {
	if (typeof precision === 'undefined') { precision = 8; }
	this.x = this.x.toFixed(precision);
	this.y = this.y.toFixed(precision);
	return this;
};

/**
 * Performs a linear blend / interpolation of the X axis towards another vector
 *
 * ### Examples:
 *     var vec1 = new Victor(100, 100);
 *     var vec2 = new Victor(200, 200);
 *
 *     vec1.mixX(vec2, 0.5);
 *     vec.toString();
 *     // => x:150, y:100
 *
 * @param {Victor} vector The other vector
 * @param {Number} amount The blend amount (optional, default: 0.5)
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.mixX = function (vec, amount) {
	if (typeof amount === 'undefined') {
		amount = 0.5;
	}

	this.x = (1 - amount) * this.x + amount * vec.x;
	return this;
};

/**
 * Performs a linear blend / interpolation of the Y axis towards another vector
 *
 * ### Examples:
 *     var vec1 = new Victor(100, 100);
 *     var vec2 = new Victor(200, 200);
 *
 *     vec1.mixY(vec2, 0.5);
 *     vec.toString();
 *     // => x:100, y:150
 *
 * @param {Victor} vector The other vector
 * @param {Number} amount The blend amount (optional, default: 0.5)
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.mixY = function (vec, amount) {
	if (typeof amount === 'undefined') {
		amount = 0.5;
	}

	this.y = (1 - amount) * this.y + amount * vec.y;
	return this;
};

/**
 * Performs a linear blend / interpolation towards another vector
 *
 * ### Examples:
 *     var vec1 = new Victor(100, 100);
 *     var vec2 = new Victor(200, 200);
 *
 *     vec1.mix(vec2, 0.5);
 *     vec.toString();
 *     // => x:150, y:150
 *
 * @param {Victor} vector The other vector
 * @param {Number} amount The blend amount (optional, default: 0.5)
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.mix = function (vec, amount) {
	this.mixX(vec, amount);
	this.mixY(vec, amount);
	return this;
};

/**
 * # Products
 */

/**
 * Creates a clone of this vector
 *
 * ### Examples:
 *     var vec1 = new Victor(10, 10);
 *     var vec2 = vec1.clone();
 *
 *     vec2.toString();
 *     // => x:10, y:10
 *
 * @return {Victor} A clone of the vector
 * @api public
 */
Victor.prototype.clone = function () {
	return new Victor(this.x, this.y);
};

/**
 * Copies another vector's X component in to its own
 *
 * ### Examples:
 *     var vec1 = new Victor(10, 10);
 *     var vec2 = new Victor(20, 20);
 *     var vec2 = vec1.copyX(vec1);
 *
 *     vec2.toString();
 *     // => x:20, y:10
 *
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.copyX = function (vec) {
	this.x = vec.x;
	return this;
};

/**
 * Copies another vector's Y component in to its own
 *
 * ### Examples:
 *     var vec1 = new Victor(10, 10);
 *     var vec2 = new Victor(20, 20);
 *     var vec2 = vec1.copyY(vec1);
 *
 *     vec2.toString();
 *     // => x:10, y:20
 *
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.copyY = function (vec) {
	this.y = vec.y;
	return this;
};

/**
 * Copies another vector's X and Y components in to its own
 *
 * ### Examples:
 *     var vec1 = new Victor(10, 10);
 *     var vec2 = new Victor(20, 20);
 *     var vec2 = vec1.copy(vec1);
 *
 *     vec2.toString();
 *     // => x:20, y:20
 *
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.copy = function (vec) {
	this.copyX(vec);
	this.copyY(vec);
	return this;
};

/**
 * Sets the vector to zero (0,0)
 *
 * ### Examples:
 *     var vec1 = new Victor(10, 10);
 *		 var1.zero();
 *     vec1.toString();
 *     // => x:0, y:0
 *
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.zero = function () {
	this.x = this.y = 0;
	return this;
};

/**
 * Calculates the dot product of this vector and another
 *
 * ### Examples:
 *     var vec1 = new Victor(100, 50);
 *     var vec2 = new Victor(200, 60);
 *
 *     vec1.dot(vec2);
 *     // => 23000
 *
 * @param {Victor} vector The second vector
 * @return {Number} Dot product
 * @api public
 */
Victor.prototype.dot = function (vec2) {
	return this.x * vec2.x + this.y * vec2.y;
};

Victor.prototype.cross = function (vec2) {
	return (this.x * vec2.y ) - (this.y * vec2.x );
};

/**
 * Projects a vector onto another vector, setting itself to the result.
 *
 * ### Examples:
 *     var vec = new Victor(100, 0);
 *     var vec2 = new Victor(100, 100);
 *
 *     vec.projectOnto(vec2);
 *     vec.toString();
 *     // => x:50, y:50
 *
 * @param {Victor} vector The other vector you want to project this vector onto
 * @return {Victor} `this` for chaining capabilities
 * @api public
 */
Victor.prototype.projectOnto = function (vec2) {
    var coeff = ( (this.x * vec2.x)+(this.y * vec2.y) ) / ((vec2.x*vec2.x)+(vec2.y*vec2.y));
    this.x = coeff * vec2.x;
    this.y = coeff * vec2.y;
    return this;
};


Victor.prototype.horizontalAngle = function () {
	return Math.atan2(this.y, this.x);
};

Victor.prototype.horizontalAngleDeg = function () {
	return radian2degrees(this.horizontalAngle());
};

Victor.prototype.verticalAngle = function () {
	return Math.atan2(this.x, this.y);
};

Victor.prototype.verticalAngleDeg = function () {
	return radian2degrees(this.verticalAngle());
};

Victor.prototype.angle = Victor.prototype.horizontalAngle;
Victor.prototype.angleDeg = Victor.prototype.horizontalAngleDeg;
Victor.prototype.direction = Victor.prototype.horizontalAngle;

Victor.prototype.rotate = function (angle) {
	var nx = (this.x * Math.cos(angle)) - (this.y * Math.sin(angle));
	var ny = (this.x * Math.sin(angle)) + (this.y * Math.cos(angle));

	this.x = nx;
	this.y = ny;

	return this;
};

Victor.prototype.rotateDeg = function (angle) {
	angle = degrees2radian(angle);
	return this.rotate(angle);
};

Victor.prototype.rotateTo = function(rotation) {
	return this.rotate(rotation-this.angle());
};

Victor.prototype.rotateToDeg = function(rotation) {
	rotation = degrees2radian(rotation);
	return this.rotateTo(rotation);
};

Victor.prototype.rotateBy = function (rotation) {
	var angle = this.angle() + rotation;

	return this.rotate(angle);
};

Victor.prototype.rotateByDeg = function (rotation) {
	rotation = degrees2radian(rotation);
	return this.rotateBy(rotation);
};

/**
 * Calculates the distance of the X axis between this vector and another
 *
 * ### Examples:
 *     var vec1 = new Victor(100, 50);
 *     var vec2 = new Victor(200, 60);
 *
 *     vec1.distanceX(vec2);
 *     // => -100
 *
 * @param {Victor} vector The second vector
 * @return {Number} Distance
 * @api public
 */
Victor.prototype.distanceX = function (vec) {
	return this.x - vec.x;
};

/**
 * Same as `distanceX()` but always returns an absolute number
 *
 * ### Examples:
 *     var vec1 = new Victor(100, 50);
 *     var vec2 = new Victor(200, 60);
 *
 *     vec1.absDistanceX(vec2);
 *     // => 100
 *
 * @param {Victor} vector The second vector
 * @return {Number} Absolute distance
 * @api public
 */
Victor.prototype.absDistanceX = function (vec) {
	return Math.abs(this.distanceX(vec));
};

/**
 * Calculates the distance of the Y axis between this vector and another
 *
 * ### Examples:
 *     var vec1 = new Victor(100, 50);
 *     var vec2 = new Victor(200, 60);
 *
 *     vec1.distanceY(vec2);
 *     // => -10
 *
 * @param {Victor} vector The second vector
 * @return {Number} Distance
 * @api public
 */
Victor.prototype.distanceY = function (vec) {
	return this.y - vec.y;
};

/**
 * Same as `distanceY()` but always returns an absolute number
 *
 * ### Examples:
 *     var vec1 = new Victor(100, 50);
 *     var vec2 = new Victor(200, 60);
 *
 *     vec1.distanceY(vec2);
 *     // => 10
 *
 * @param {Victor} vector The second vector
 * @return {Number} Absolute distance
 * @api public
 */
Victor.prototype.absDistanceY = function (vec) {
	return Math.abs(this.distanceY(vec));
};

/**
 * Calculates the euclidean distance between this vector and another
 *
 * ### Examples:
 *     var vec1 = new Victor(100, 50);
 *     var vec2 = new Victor(200, 60);
 *
 *     vec1.distance(vec2);
 *     // => 100.4987562112089
 *
 * @param {Victor} vector The second vector
 * @return {Number} Distance
 * @api public
 */
Victor.prototype.distance = function (vec) {
	return Math.sqrt(this.distanceSq(vec));
};

/**
 * Calculates the squared euclidean distance between this vector and another
 *
 * ### Examples:
 *     var vec1 = new Victor(100, 50);
 *     var vec2 = new Victor(200, 60);
 *
 *     vec1.distanceSq(vec2);
 *     // => 10100
 *
 * @param {Victor} vector The second vector
 * @return {Number} Distance
 * @api public
 */
Victor.prototype.distanceSq = function (vec) {
	var dx = this.distanceX(vec),
		dy = this.distanceY(vec);

	return dx * dx + dy * dy;
};

/**
 * Calculates the length or magnitude of the vector
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *
 *     vec.length();
 *     // => 111.80339887498948
 *
 * @return {Number} Length / Magnitude
 * @api public
 */
Victor.prototype.length = function () {
	return Math.sqrt(this.lengthSq());
};

/**
 * Squared length / magnitude
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *
 *     vec.lengthSq();
 *     // => 12500
 *
 * @return {Number} Length / Magnitude
 * @api public
 */
Victor.prototype.lengthSq = function () {
	return this.x * this.x + this.y * this.y;
};

Victor.prototype.magnitude = Victor.prototype.length;

/**
 * Returns a true if vector is (0, 0)
 *
 * ### Examples:
 *     var vec = new Victor(100, 50);
 *     vec.zero();
 *
 *     // => true
 *
 * @return {Boolean}
 * @api public
 */
Victor.prototype.isZero = function() {
	return this.x === 0 && this.y === 0;
};

/**
 * Returns a true if this vector is the same as another
 *
 * ### Examples:
 *     var vec1 = new Victor(100, 50);
 *     var vec2 = new Victor(100, 50);
 *     vec1.isEqualTo(vec2);
 *
 *     // => true
 *
 * @return {Boolean}
 * @api public
 */
Victor.prototype.isEqualTo = function(vec2) {
	return this.x === vec2.x && this.y === vec2.y;
};

/**
 * # Utility Methods
 */

/**
 * Returns an string representation of the vector
 *
 * ### Examples:
 *     var vec = new Victor(10, 20);
 *
 *     vec.toString();
 *     // => x:10, y:20
 *
 * @return {String}
 * @api public
 */
Victor.prototype.toString = function () {
	return 'x:' + this.x + ', y:' + this.y;
};

/**
 * Returns an array representation of the vector
 *
 * ### Examples:
 *     var vec = new Victor(10, 20);
 *
 *     vec.toArray();
 *     // => [10, 20]
 *
 * @return {Array}
 * @api public
 */
Victor.prototype.toArray = function () {
	return [ this.x, this.y ];
};

/**
 * Returns an object representation of the vector
 *
 * ### Examples:
 *     var vec = new Victor(10, 20);
 *
 *     vec.toObject();
 *     // => { x: 10, y: 20 }
 *
 * @return {Object}
 * @api public
 */
Victor.prototype.toObject = function () {
	return { x: this.x, y: this.y };
};


var degrees = 180 / Math.PI;

function random (min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function radian2degrees (rad) {
	return rad * degrees;
}

function degrees2radian (deg) {
	return deg / degrees;
}

},{}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _body = _interopRequireDefault(require("./body.js"));

var _vector = _interopRequireDefault(require("./vector.js"));

var _projectile = _interopRequireDefault(require("./projectile.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

var Laser = _projectile["default"].Laser;
var CYAN = "#00FFFF";

var Armament = /*#__PURE__*/function (_body$CircularBody) {
  _inherits(Armament, _body$CircularBody);

  var _super = _createSuper(Armament);

  function Armament(universe, parent, bind_pos, faction) {
    var _this;

    _classCallCheck(this, Armament);

    var pos = parent.pos.clone();
    pos.add(bind_pos);
    _this = _super.call(this, universe, pos, faction, 10);
    _this.parent = parent;
    _this.bind_pos = bind_pos;
    _this.hp = 100;
    _this.rot = 0; // changed by children

    _this.rot_speed = 0;
    _this.target = null;
    return _this;
  }

  _createClass(Armament, [{
    key: "process",
    value: function process(dt, t) {
      // stay bound
      this.pos = this.parent.pos.clone().add(this.bind_pos.clone().rotate(this.parent.rot));
    }
  }, {
    key: "contains",
    value: function contains(body) {
      return body == this.parent || body == this || body in this.parent.armaments;
    }
  }]);

  return Armament;
}(_body["default"].CircularBody);

var DualLaser = /*#__PURE__*/function (_Armament) {
  _inherits(DualLaser, _Armament);

  var _super2 = _createSuper(DualLaser);

  function DualLaser(universe, parent, bind_pos, faction) {
    var _this2;

    _classCallCheck(this, DualLaser);

    _this2 = _super2.call(this, universe, parent, bind_pos, faction);
    _this2.color = "#20BB20"; // TODO: vary by faction

    _this2.rot_speed = Math.PI * 2;
    _this2.shot_delay = 0.3;
    _this2.laser_color = CYAN;
    _this2.laser_speed_boost = 500;
    _this2.barrel_length = _this2.radius * 1.5;
    _this2.last_laser_shot = 0;
    _this2.shot_delay = 0.3;
    return _this2;
  }

  _createClass(DualLaser, [{
    key: "draw",
    value: function draw(context) {
      _get(_getPrototypeOf(DualLaser.prototype), "draw", this).call(this, context); // draw gun barrels
      // TODO: draw two of them


      var v = (0, _vector["default"])(this.radius * 0.25, 0).rotate(this.rot + Math.PI);
      var p1 = this.pos.clone().add(v);
      var p2 = this.pos.clone().subtract(v);
      var end1 = p1.clone().add((0, _vector["default"])(this.barrel_length, 0).rotate(this.rot - Math.PI * 0.5));
      var end2 = p2.clone().add((0, _vector["default"])(this.barrel_length, 0).rotate(this.rot - Math.PI * 0.5));
      this.universe.draw_line(context, "#303030", p1, end1, 3);
      this.universe.draw_line(context, "#303030", p2, end2, 3);
    }
  }, {
    key: "process",
    value: function process(dt, t) {
      var _this3 = this;

      _get(_getPrototypeOf(DualLaser.prototype), "process", this).call(this, dt, t);

      var closest = null;
      var closest_distance = 10000000;
      this.universe.bodies.forEach(function (body) {
        if (closest === null) {
          closest = body;
        }

        var need_continue = false;
        if (body.type != "fighter") need_continue = true;else if (body == _this3.parent || body.faction === _this3.parent.faction || body.hp <= 0) need_continue = true;

        if (!need_continue) {
          var distance_sq = _this3.pos.distanceSq(body.pos);

          if (distance_sq < closest_distance) {
            closest_distance = distance_sq;
            closest = body;
          }
        }
      });
      this.target = closest;
      if (this.rot < 0) this.rot += 360;else if (this.rot > 360) this.rot %= 360;
      var time = this.target.pos.distance(this.pos) / (this.parent.vel.length() + 500);
      var projection = this.target.pos.clone().add(this.target.vel.scaled(time));
      var desired_angle = (0, _vector["default"])(0, 1).angle() + projection.subtract(this.pos).angle();
      var desired_rotation = desired_angle - this.rot;
      if (desired_rotation < 0) desired_rotation += 2 * Math.PI;else if (desired_rotation > 2 * Math.PI) desired_rotation -= 2 * Math.PI; // rotate as much as possible (TODO: fix this)

      var max_rotation_amount = this.rot_speed * dt;

      if (max_rotation_amount > desired_rotation) {
        this.rot += desired_rotation;
      } else {
        this.rot += max_rotation_amount;
      }

      this.fire_laser(t);
    }
  }, {
    key: "fire_laser",
    value: function fire_laser(t) {
      if (t - this.last_laser_shot > this.shot_delay) {
        this.last_laser_shot = t;
        var l = new Laser(this.universe, this, this.pos, this.laser_color, 3);
        l.vel = (0, _vector["default"])(0, this.parent.vel.length() + 500).invert().rotate(this.rot); // TODO: add spread
      }
    }
  }]);

  return DualLaser;
}(Armament);

var _default = {
  DualLaser: DualLaser
};
exports["default"] = _default;

},{"./body.js":4,"./projectile.js":7,"./vector.js":11}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _vector = _interopRequireDefault(require("./vector.js"));

var _rectangle = _interopRequireDefault(require("./rectangle.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var greiner_hormann = require('greiner-hormann');

var ORANGE = "#FFA600";

var Body = /*#__PURE__*/function () {
  function Body(universe, pos) {
    _classCallCheck(this, Body);

    this.universe = universe;
    this.universe.bodies.push(this);
    this.lifetime = 0;
    this.pos = pos;
    this.vel = (0, _vector["default"])(0, 0);
    this.rot = 0;
    this.z_index = 0;
    this.chunk = "";
    this.dec = 0;
    this.actively_moving = false;
  }

  _createClass(Body, [{
    key: "update",
    value: function update(dt, t) {
      this.chunk = this.universe.update_chunk_for(this);
      this.lifetime += dt;
      var kill = this.process(dt, t);

      if (kill) {
        this.universe.remove_body(this);
        delete this;
        return;
      }

      if (!this.actively_moving) this.vel = this.vel.mix((0, _vector["default"])(0, 0), this.dec * dt);
      this.pos.add(this.vel.scaled(dt));
    }
  }, {
    key: "process",
    value: function process(dt, t) {// Override with  unique  update methods
    }
  }]);

  return Body;
}();

var CircularBody = /*#__PURE__*/function (_Body) {
  _inherits(CircularBody, _Body);

  var _super = _createSuper(CircularBody);

  function CircularBody(universe, pos, color, radius) {
    var _this;

    _classCallCheck(this, CircularBody);

    _this = _super.call(this, universe, pos);
    _this.color = color;
    _this.radius = radius;
    return _this;
  }

  _createClass(CircularBody, [{
    key: "get_aabb_rect",
    value: function get_aabb_rect() {
      var d = this.radius / 2;
      var rect = new _rectangle["default"](0, 0, d, d);
      rect.set_center(this.pos.x, this.pos.y);
      return rect;
    }
  }, {
    key: "radius_collision",
    value: function radius_collision(point) {
      var distance = this.pos.distance(point);
      return distance <= this.approx_radius;
    }
  }, {
    key: "draw",
    value: function draw(context) {
      this.universe.draw_circle(context, this.color, this.pos, this.radius);
    }
  }]);

  return CircularBody;
}(Body);

var PolygonalBody = /*#__PURE__*/function (_Body2) {
  _inherits(PolygonalBody, _Body2);

  var _super2 = _createSuper(PolygonalBody);

  function PolygonalBody(universe, pos, points, color) {
    var _this2;

    _classCallCheck(this, PolygonalBody);

    _this2 = _super2.call(this, universe, pos);
    _this2.points = points;
    _this2.center = _this2.centroid(_this2.points);
    _this2.approx_radius = 0;

    _this2.points.forEach(function (point) {
      _this2.approx_radius = Math.max(_this2.approx_radius, _this2.center.distance(point));
    });

    _this2.color = color;
    return _this2;
  }

  _createClass(PolygonalBody, [{
    key: "centroid",
    value: function centroid(points) {
      var xsum = 0;
      var ysum = 0;
      points.forEach(function (point) {
        xsum += point.x;
        ysum += point.y;
      });
      return (0, _vector["default"])(xsum / points.size, ysum / points.size);
    }
  }, {
    key: "get_global_points",
    value: function get_global_points() {
      var _this3 = this;

      var points = [];
      this.points.forEach(function (point) {
        var rotated = point.clone().rotate(_this3.rot);
        points.push(_this3.pos.clone().subtract(rotated));
      });
      return points;
    }
  }, {
    key: "get_aabb_rect",
    value: function get_aabb_rect() {
      var xmin = Number.MAX_SAFE_INTEGER;
      var ymin = Number.MAX_SAFE_INTEGER;
      var xmax = -Number.MAX_SAFE_INTEGER;
      var ymax = -Number.MAX_SAFE_INTEGER;
      this.get_global_points().forEach(function (point) {
        xmin = Math.min(xmin, point.x);
        ymin = Math.min(ymin, point.y);
        xmax = Math.max(xmax, point.x);
        ymax = Math.max(ymax, point.y);
      });
      var w = xmax - xmin;
      var h = ymax - ymin;
      return new _rectangle["default"](xmin, ymin, w, h);
    }
  }, {
    key: "get_global_side_vectors",
    value: function get_global_side_vectors() {
      // TODO: finish
      var vectors = [];
      var last = null;

      var _iterator = _createForOfIteratorHelper(this.get_global_points()),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var p = _step.value;

          if (last == null) {
            last = p;
            continue;
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    }
  }, {
    key: "polygon_collision",
    value: function polygon_collision(points) {
      return greiner_hormann.intersection(this.get_global_points(), points);
    }
  }, {
    key: "radius_collision",
    value: function radius_collision(point) {
      var distance = this.pos.clone().subtract(this.centroid(this.points)).distance(point);
      return distance <= this.approx_radius;
    }
  }, {
    key: "apply_force_at_point",
    value: function apply_force_at_point(force, point) {
      // TODO: change rotational speed
      this.vel.add(force.scaled(1 / this.mass));
    }
  }, {
    key: "snap_to_collision",
    value: function snap_to_collision(body) {
      var num_increments = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 100;
      var my_increment_vec = this.vel.scaled(1 / num_increments).invert();
      var their_increment_vec = body.vel.scaled(1 / num_increments).invert();

      for (var i = 0; i < num_increments; ++i) {
        this.pos.add(my_increment_vec);
        body.pos.add(their_increment_vec);

        if (this.polygon_collision(body.get_global_points()) == null) {
          break;
        }
      }
    }
  }, {
    key: "process",
    value: function process(dt, t) {}
  }, {
    key: "draw",
    value: function draw(context) {
      this.universe.draw_poly(context, this.color, this.get_global_points()); //let center = this.pos.clone().subtract(this.centroid(this.points))
      //this.universe.draw_circle(context, this.color, center, this.approx_radius, 1, false)
    }
  }]);

  return PolygonalBody;
}(Body);

var Laser = /*#__PURE__*/function (_CircularBody) {
  _inherits(Laser, _CircularBody);

  var _super3 = _createSuper(Laser);

  function Laser(universe, parent, pos, color, radius) {
    var _this4;

    _classCallCheck(this, Laser);

    _this4 = _super3.call(this, universe, pos, color, radius);
    _this4.parent = parent;
    _this4.length = 15 * _this4.radius;
    _this4.exploding = false;
    _this4.exploding_start = null;
    _this4.explosion_life = 0.2;
    _this4.full_life_length = 1.5;
    _this4.first_position = null;
    return _this4;
  }

  _createClass(Laser, [{
    key: "process",
    value: function process(dt, t) {
      var _this5 = this;

      if (dt == this.lifetime) {
        this.first_position = this.pos.clone();
      }

      if (this.exploding && t - this.exploding_start > this.explosion_life) {
        return true;
      }

      if (this.lifetime > dt) {
        this.universe.get_nearby_bodies(this).forEach(function (body) {
          if (typeof body.hp !== 'undefined' && body.get_aabb_rect().collide_point(_this5.pos) && body != _this5.parent) {
            if (body.radius_collision(_this5.pos)) {
              _this5.exploding = true;
              _this5.exploding_start = t;

              _this5.vel.rotate(Math.random() * Math.PI * 0.25);

              _this5.full_life_length = _this5.lifetime + 0.5;
              body.hp -= 10;
              _this5.color = ORANGE;
              _this5.parent = body;
            }
          }
        });

        if (this.lifetime >= this.full_life_length) {
          return true;
        }
      }
    }
  }, {
    key: "draw",
    value: function draw(context) {
      if (this.exploding) {
        this.universe.draw_circle(context, this.color, this.pos, this.radius * 3);
      } else {
        this.universe.draw_circle(context, this.color, this.pos, this.radius); // draw streak

        var streak_end = this.vel.clone().norm().invert().scaled(this.length).add(this.pos);
        var lerp_amount = 0.3;

        if (this.first_position != null) {
          for (var i = 0; i < this.length; ++i) {
            var streak_to_original = this.first_position.clone().subtract(streak_end).norm();
            var pos_to_original = this.first_position.clone().subtract(this.pos).norm();

            if (streak_to_original.dot(pos_to_original) == 1 || this.lifetime > this.length / this.vel.length()) {
              this.universe.draw_circle(context, this.color, streak_end, this.radius);
            }

            streak_end.mix(this.pos, lerp_amount);
          }
        }
      }
    }
  }]);

  return Laser;
}(CircularBody);

var Fighter = /*#__PURE__*/function (_PolygonalBody) {
  _inherits(Fighter, _PolygonalBody);

  var _super4 = _createSuper(Fighter);

  function Fighter(universe, pos, equipment, faction) {
    var _this6;

    _classCallCheck(this, Fighter);

    var points = [(0, _vector["default"])(0, 15), (0, _vector["default"])(12, -15), (0, _vector["default"])(0, -10), (0, _vector["default"])(-12, -15)];
    _this6 = _super4.call(this, universe, pos, points, faction);
    _this6.faction = faction;
    _this6.equipment = equipment; // attributes to be changed when ship is equiped

    _this6.rot_speed = 0;
    _this6.fly_speed = 0;
    _this6.acceleration = 0;
    _this6.last_laser_shot = -100;
    _this6.shot_delay = 0;
    _this6.shot_spread = 0;
    _this6.laser_color = "#00FFFF";
    _this6.hp = 0;
    _this6.shields = 0;

    _this6.equip();

    return _this6;
  }

  _createClass(Fighter, [{
    key: "equip",
    value: function equip() {
      this.rot_speed = this.equipment["rot speed"];
      this.fly_speed = this.equipment["fly speed"];
      this.acceleration = this.equipment["acceleration"];
      this.dec = this.equipment["dec"];
      this.shot_delay = this.equipment["shot delay"];
      this.shot_spread = Math.round(this.equipment["shot spread"] * 0.5);
      this.laser_color = this.equipment["laser color"];
      this.hp = this.equipment["hp"];
      this.shields = this.equipment["shields"];
    }
  }, {
    key: "fire_laser",
    value: function fire_laser(t) {
      if (t - this.last_laser_shot > this.shot_delay) {
        this.last_laser_shot = t;
        var l = new Laser(this.universe, this, this.get_global_points()[0], this.laser_color, 3);
        l.vel = (0, _vector["default"])(0, this.vel.length() + 500).invert().rotate(this.rot); // TODO: add spread
      }
    }
  }, {
    key: "handle_death",
    value: function handle_death(dt, t) {
      if (this.health <= 0) {
        this.health = 0;
        this.color = ORANGE;
        return true; // is dead
      }

      return false; // is alive
    }
  }]);

  return Fighter;
}(PolygonalBody);

var PlayerFighter = /*#__PURE__*/function (_Fighter) {
  _inherits(PlayerFighter, _Fighter);

  var _super5 = _createSuper(PlayerFighter);

  function PlayerFighter(universe, controller, pos, equipment, faction) {
    var _this7;

    _classCallCheck(this, PlayerFighter);

    _this7 = _super5.call(this, universe, pos, equipment, faction);
    _this7.controller = controller;
    return _this7;
  }

  _createClass(PlayerFighter, [{
    key: "process",
    value: function process(dt, t) {
      // if dead, don't do anything else
      if (this.hp <= 0) {
        this.hp = 0;
        this.color = "#FFa500";
        this.vel.mix((0, _vector["default"])(0, 0), this.dec * dt);
        return false; // do not kill self
      } // handle turning


      if (this.controller.pressed(this.controller.left)) {
        this.rot -= this.rot_speed * dt;
      } else if (this.controller.pressed(this.controller.right)) {
        this.rot += this.rot_speed * dt;
      } // handle thrust


      if (this.controller.pressed(this.controller.up)) {
        this.vel.subtract((0, _vector["default"])(0, this.acceleration).rotate(this.rot).scaled(dt));
        this.actively_moving = true;
      } else {
        this.actively_moving = false;
      }

      if (this.vel.length() > this.fly_speed) this.vel = this.vel.clone().norm().scaled(this.fly_speed); // handle space bar press for fire

      if (this.controller.pressed(this.controller.fire)) {
        this.fire_laser(t);
      }
    }
  }]);

  return PlayerFighter;
}(Fighter);

var AIFighter = /*#__PURE__*/function (_Fighter2) {
  _inherits(AIFighter, _Fighter2);

  var _super6 = _createSuper(AIFighter);

  function AIFighter(universe, pos, equipment, faction) {
    var _this8;

    _classCallCheck(this, AIFighter);

    _this8 = _super6.call(this, universe, pos, equipment, faction);
    _this8.target = null;
    return _this8;
  }

  _createClass(AIFighter, [{
    key: "process",
    value: function process(dt, t) {
      var _this9 = this;

      if (this.hp <= 0) {
        this.hp = 0;
        this.color = "#FFa500";
        this.vel.mix((0, _vector["default"])(0, 0), this.dec * dt);
        return false; // do not kill self
      }

      var closest = null;
      var closest_distance = 10000000;
      this.universe.bodies.forEach(function (body) {
        if (closest === null) {
          closest = body;
        }

        var need_continue = false;
        if (!(body instanceof Fighter)) need_continue = true;else if (body.faction === _this9.faction || body.hp <= 0) need_continue = true;

        if (!need_continue) {
          var distance_sq = _this9.pos.distanceSq(body.pos);

          if (distance_sq < closest_distance) {
            closest_distance = distance_sq;
            closest = body;
          }
        }
      });
      this.target = closest;
      if (this.rot < 0) this.rot += 360;else if (this.rot > 360) this.rot %= 360;
      var time = this.target.pos.distance(this.pos) / (this.vel.length() + 500);
      var projection = this.target.pos.clone().add(this.target.vel.scaled(time));
      var desired_angle = (0, _vector["default"])(0, 1).angle() + projection.subtract(this.pos).angle();
      var desired_rotation = desired_angle - this.rot;
      if (desired_rotation < 0) desired_rotation += 2 * Math.PI;else if (desired_rotation > 2 * Math.PI) desired_rotation -= 2 * Math.PI; // rotate as much as possible (TODO: fix this)

      var max_rotation_amount = this.rot_speed * dt;

      if (max_rotation_amount > desired_rotation) {
        this.rot += desired_rotation;
      } else {
        this.rot += max_rotation_amount;
      }

      if (desired_rotation < 30 && this.target.hp > 0 && this.faction != this.target.faction) {
        this.fire_laser(t);
      }

      if (this.pos.distance(this.target.pos) > 50 && desired_rotation < 10) {
        this.vel.subtract((0, _vector["default"])(0, this.acceleration).rotate(this.rot).scaled(dt));
      } else {
        this.vel.mix((0, _vector["default"])(0, 0), this.dec * dt);
      }

      if (this.vel.length() > this.fly_speed) {
        this.vel.normalize().scale_ip(this.fly_speed);
      }
    }
  }]);

  return AIFighter;
}(Fighter);

var _default = {
  PolygonalBody: PolygonalBody,
  CircularBody: CircularBody
};
exports["default"] = _default;

},{"./rectangle.js":8,"./vector.js":11,"greiner-hormann":1}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Controller = /*#__PURE__*/function () {
  function Controller() {
    var _this = this;

    _classCallCheck(this, Controller);

    this.keys = {};
    this.left = "ArrowLeft";
    this.right = "ArrowRight";
    this.up = "ArrowUp";
    this.down = "ArrowDown";
    this.control_schemes = {
      "Arrows": function Arrows() {
        _this.set_arrow();
      },
      "WASD": function WASD() {
        _this.set_wasd();
      },
      "IJKL": function IJKL() {
        _this.set_ijkl();
      }
    };
    this.fire = "Space";
    document.addEventListener("keydown", function (e) {
      return _this.log_keydown(e);
    });
    document.addEventListener("keyup", function (e) {
      return _this.log_keyup(e);
    });
  }

  _createClass(Controller, [{
    key: "update",
    value: function update() {
      var e = document.getElementById("control-set");
      var set_controls = e.options[e.selectedIndex].value;
      this.set_controls(set_controls);
    }
  }, {
    key: "set_arrow",
    value: function set_arrow() {
      this.left = "ArrowLeft";
      this.right = "ArrowRight";
      this.up = "ArrowUp";
      this.down = "ArrowDown";
    }
  }, {
    key: "set_wasd",
    value: function set_wasd() {
      this.left = "KeyA";
      this.right = "KeyD";
      this.up = "KeyW";
      this.down = "KeyS";
    }
  }, {
    key: "set_ijkl",
    value: function set_ijkl() {
      this.left = "KeyJ";
      this.right = "KeyL";
      this.up = "KeyI";
      this.down = "KeyK";
    }
  }, {
    key: "get_control_setting",
    value: function get_control_setting() {
      return this.control_setting_names[this.control_setting];
    }
  }, {
    key: "set_controls",
    value: function set_controls(control_scheme_string) {
      this.control_schemes[control_scheme_string]();
    }
  }, {
    key: "log_keydown",
    value: function log_keydown(e) {
      this.keys[e.code] = true;
    }
  }, {
    key: "log_keyup",
    value: function log_keyup(e) {
      console.log(e.code);
      this.keys[e.code] = false;
    }
  }, {
    key: "pressed",
    value: function pressed(key_code) {
      if (this.keys[key_code] == undefined) {
        return false;
      } else {
        return this.keys[key_code];
      }
    }
  }]);

  return Controller;
}();

var _default = Controller;
exports["default"] = _default;

},{}],6:[function(require,module,exports){
"use strict";

var _universe = _interopRequireDefault(require("./universe.js"));

var _controller = _interopRequireDefault(require("./controller.js"));

var _ship = _interopRequireDefault(require("./ship.js"));

var _vector = _interopRequireDefault(require("./vector.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var AIFighter = _ship["default"].AIFighter;
var PlayerFighter = _ship["default"].PlayerFighter;
var Corvette = _ship["default"].Corvette;
var CYAN = "#00FFFF";
var RED = "#FF0000";
var GREEN = "#00FF00";
var BLACK = "#000000";
var WHITE = "#FFFFFF";

var Game = /*#__PURE__*/function () {
  function Game(canvas) {
    _classCallCheck(this, Game);

    this.timeOfLastFrame = null;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.t = 0;
    this.universe = new _universe["default"]();
    this.controller = new _controller["default"]();
    this.controller.set_ijkl();
    var e = {
      "rot speed": Math.PI * 2,
      "fly speed": 1000,
      "acceleration": 300,
      "dec": 1.0,
      "shot delay": 0.2,
      "hp": 100,
      "laser color": CYAN,
      "shot spread": 2,
      "shields": 0
    };
    var p = new PlayerFighter(this.universe, this.controller, (0, _vector["default"])(100, 0), e, GREEN);
    this.universe.focus = p;
    new AIFighter(this.universe, (0, _vector["default"])(-500, 500 * 5), e, RED);
    new AIFighter(this.universe, (0, _vector["default"])(-1000, 500 * 5), e, RED);
    new AIFighter(this.universe, (0, _vector["default"])(-1500, 500 * 5), e, RED);
    new AIFighter(this.universe, (0, _vector["default"])(-5000, 500 * 5), e, RED);
    new AIFighter(this.universe, (0, _vector["default"])(-10000, 500 * 5), e, RED);
    new AIFighter(this.universe, (0, _vector["default"])(-15000, 500 * 5), e, RED);
    new Corvette(this.universe, (0, _vector["default"])(100, -300), GREEN); //let c2 = new Corvette(this.universe, vec(300, -100), GREEN)
    //c2.rot = Math.PI / 3
  }

  _createClass(Game, [{
    key: "runNextFrame",
    value: function runNextFrame() {
      var _this = this;

      var dt = this.getElapsedSeconds();
      this.t += dt;
      document.getElementById("fps").innerHTML = "FPS: ".concat(Math.round(1 / dt));
      document.getElementById("health").innerHTML = "Health: ".concat(this.universe.focus.hp, "%");
      document.getElementById("speed").innerHTML = "Speed: ".concat(Math.round(this.universe.focus.vel.length()), " px/s");
      document.getElementById("pos").innerHTML = "Coordinates: ".concat([Math.round(this.universe.focus.pos.x), Math.round(this.universe.focus.pos.y)]);
      this.controller.update();
      this.universe.update(dt, this.t);
      this.universe.render(this.ctx);
      requestAnimationFrame(function () {
        return _this.runNextFrame();
      });
    }
  }, {
    key: "getElapsedSeconds",
    value: function getElapsedSeconds() {
      var now = new Date().getTime();

      if (this.timeOfLastFrame == null) {
        var elapsed = 0;
      } else {
        var elapsed = now - this.timeOfLastFrame;
      }

      this.timeOfLastFrame = now;
      return elapsed * 0.001; // convert to seconds
    }
  }]);

  return Game;
}();

var game;

window.onload = function () {
  var canvas = document.getElementById("board");
  canvas.width = 900;
  canvas.height = 600;
  window.addEventListener('keydown', function (e) {
    if (e.keyCode == 32 && e.target == document.body) {
      e.preventDefault();
    }
  });
  game = new Game(canvas);
  requestAnimationFrame(function () {
    game.runNextFrame();
  });
};

},{"./controller.js":5,"./ship.js":9,"./universe.js":10,"./vector.js":11}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _body = _interopRequireDefault(require("./body.js"));

var _vector = _interopRequireDefault(require("./vector.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

var ORANGE = "#FFA600";

var Laser = /*#__PURE__*/function (_body$CircularBody) {
  _inherits(Laser, _body$CircularBody);

  var _super = _createSuper(Laser);

  function Laser(universe, parent, pos, color, radius) {
    var _this;

    _classCallCheck(this, Laser);

    _this = _super.call(this, universe, pos, color, radius);
    _this.parent = parent;
    _this.length = 15 * _this.radius;
    _this.exploding = false;
    _this.exploding_start = null;
    _this.explosion_life = 0.2;
    _this.full_life_length = 1.5;
    _this.first_position = null;
    return _this;
  }

  _createClass(Laser, [{
    key: "process",
    value: function process(dt, t) {
      var _this2 = this;

      if (dt == this.lifetime) {
        this.first_position = this.pos.clone();
      }

      if (this.exploding && t - this.exploding_start > this.explosion_life) {
        return true;
      }

      if (this.lifetime > dt) {
        this.universe.get_nearby_bodies(this).forEach(function (body) {
          if (typeof body.hp !== 'undefined' && body.get_aabb_rect().collide_point(_this2.pos) && !_this2.parent.contains(body)) {
            if (body.radius_collision(_this2.pos)) {
              _this2.exploding = true;
              _this2.exploding_start = t;

              _this2.vel.rotate(Math.random() * Math.PI * 0.25);

              _this2.full_life_length = _this2.lifetime + 0.5;
              body.hp -= 10;
              _this2.color = ORANGE;
              _this2.parent = body;
            }
          }
        });

        if (this.lifetime >= this.full_life_length) {
          return true;
        }
      }
    }
  }, {
    key: "draw",
    value: function draw(context) {
      if (this.exploding) {
        this.universe.draw_circle(context, this.color, this.pos, this.radius * 3);
      } else {
        this.universe.draw_circle(context, this.color, this.pos, this.radius); // draw streak

        var streak_end = this.vel.clone().norm().invert().scaled(this.length).add(this.pos);
        var lerp_amount = 0.3;

        if (this.first_position != null) {
          for (var i = 0; i < this.length; ++i) {
            var streak_to_original = this.first_position.clone().subtract(streak_end).norm();
            var pos_to_original = this.first_position.clone().subtract(this.pos).norm();

            if (streak_to_original.dot(pos_to_original) == 1 || this.lifetime > this.length / this.vel.length()) {
              this.universe.draw_circle(context, this.color, streak_end, this.radius);
            }

            streak_end.mix(this.pos, lerp_amount);
          }
        }
      }
    }
  }]);

  return Laser;
}(_body["default"].CircularBody);

var _default = {
  Laser: Laser
};
exports["default"] = _default;

},{"./body.js":4,"./vector.js":11}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Rect = /*#__PURE__*/function () {
  function Rect(x, y, width, height) {
    _classCallCheck(this, Rect);

    // x and y coordinates on the canvas
    this.x = x;
    this.y = y; // width and height of the rectangle

    this.width = width;
    this.height = height;
  }

  _createClass(Rect, [{
    key: "move_to",
    value: function move_to(x, y) {
      this.x = x;
      this.y = y;
    } // methods that return positions of parts of the rectangle
    // these methods also can be used as setters

  }, {
    key: "get_centerx",
    value: function get_centerx() {
      return this.x + this.width / 2;
    }
  }, {
    key: "set_centerx",
    value: function set_centerx(value) {
      this.x = value - this.width / 2;
    }
  }, {
    key: "get_centery",
    value: function get_centery() {
      return this.y + this.height / 2;
    }
  }, {
    key: "set_centery",
    value: function set_centery(value) {
      this.y = value - this.height / 2;
    }
  }, {
    key: "get_center",
    value: function get_center() {
      var center_point = [this.centerx(), this.centery()];
      return center_point;
    }
  }, {
    key: "set_center",
    value: function set_center(x, y) {
      this.set_centerx(x);
      this.set_centery(y);
    }
  }, {
    key: "get_top",
    value: function get_top() {
      return this.y;
    }
  }, {
    key: "set_top",
    value: function set_top(value) {
      this.y = value;
    }
  }, {
    key: "get_bottom",
    value: function get_bottom() {
      var set = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      return this.y + this.height;
    }
  }, {
    key: "set_bottom",
    value: function set_bottom(value) {
      this.y = value - this.height;
    }
  }, {
    key: "get_left",
    value: function get_left() {
      return this.x;
    }
  }, {
    key: "set_left",
    value: function set_left(value) {
      this.x = value;
    }
  }, {
    key: "get_right",
    value: function get_right() {
      return this.x + this.width;
    }
  }, {
    key: "set_right",
    value: function set_right(value) {
      this.x = value - this.width;
    }
  }, {
    key: "collides_with",
    value: function collides_with(rectangle) {}
  }, {
    key: "frame",
    value: function frame(image) {
      this.width = image.width;
      this.height = image.height;
    } // collision detection

  }, {
    key: "collides_with",
    value: function collides_with(rectangle) {
      if (rectangle.get_top() <= this.get_top() && this.get_top() <= rectangle.get_bottom()) {
        if (rectangle.get_left() <= this.get_left() && this.get_left() <= rectangle.get_right()) {
          return true;
        }

        if (rectangle.get_left() <= this.get_right() && this.get_right() <= rectangle.get_right()) {
          return true;
        }
      }

      return false;
    }
  }, {
    key: "collide_point",
    value: function collide_point(point) {
      // point must have x and y attributes
      if (this.get_top() <= point.y && point.y <= this.get_bottom()) {
        if (this.get_left() <= point.x && point.x <= this.get_right()) {
          return true;
        }
      }

      return false;
    }
  }]);

  return Rect;
}();

var _default = Rect;
exports["default"] = _default;

},{}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _body = _interopRequireDefault(require("./body.js"));

var _vector = _interopRequireDefault(require("./vector.js"));

var _projectile = _interopRequireDefault(require("./projectile.js"));

var _armaments = _interopRequireDefault(require("./armaments.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

var DualLaser = _armaments["default"].DualLaser;
var Laser = _projectile["default"].Laser; // TODO: write colors module

var ORANGE = "#FFA600";

var Fighter = /*#__PURE__*/function (_body$PolygonalBody) {
  _inherits(Fighter, _body$PolygonalBody);

  var _super = _createSuper(Fighter);

  function Fighter(universe, pos, equipment, faction) {
    var _this;

    _classCallCheck(this, Fighter);

    var points = [(0, _vector["default"])(0, 15), (0, _vector["default"])(12, -15), (0, _vector["default"])(0, -10), (0, _vector["default"])(-12, -15)];
    _this = _super.call(this, universe, pos, points, faction);
    _this.faction = faction;
    _this.equipment = equipment;
    _this.type = "fighter"; // attributes to be changed when ship is equiped

    _this.rot_speed = 0;
    _this.fly_speed = 0;
    _this.acceleration = 0;
    _this.last_laser_shot = -100;
    _this.shot_delay = 0;
    _this.shot_spread = 0;
    _this.laser_color = "#00FFFF";
    _this.hp = 0;
    _this.shields = 0;

    _this.equip();

    return _this;
  }

  _createClass(Fighter, [{
    key: "equip",
    value: function equip() {
      this.rot_speed = this.equipment["rot speed"];
      this.fly_speed = this.equipment["fly speed"];
      this.acceleration = this.equipment["acceleration"];
      this.dec = this.equipment["dec"];
      this.shot_delay = this.equipment["shot delay"];
      this.shot_spread = Math.round(this.equipment["shot spread"] * 0.5);
      this.laser_color = this.equipment["laser color"];
      this.hp = this.equipment["hp"];
      this.shields = this.equipment["shields"];
    }
  }, {
    key: "fire_laser",
    value: function fire_laser(t) {
      if (t - this.last_laser_shot > this.shot_delay) {
        this.last_laser_shot = t;
        var l = new Laser(this.universe, this, this.get_global_points()[0], this.laser_color, 3);
        l.vel = (0, _vector["default"])(0, this.vel.length() + 500).invert().rotate(this.rot); // TODO: add spread
      }
    }
  }, {
    key: "handle_death",
    value: function handle_death(dt, t) {
      if (this.health <= 0) {
        this.health = 0;
        this.color = ORANGE;
        return true; // is dead
      }

      return false; // is alive
    }
  }, {
    key: "contains",
    value: function contains(body) {
      return body == this;
    }
  }]);

  return Fighter;
}(_body["default"].PolygonalBody);

var PlayerFighter = /*#__PURE__*/function (_Fighter) {
  _inherits(PlayerFighter, _Fighter);

  var _super2 = _createSuper(PlayerFighter);

  function PlayerFighter(universe, controller, pos, equipment, faction) {
    var _this2;

    _classCallCheck(this, PlayerFighter);

    _this2 = _super2.call(this, universe, pos, equipment, faction);
    _this2.controller = controller;
    return _this2;
  }

  _createClass(PlayerFighter, [{
    key: "process",
    value: function process(dt, t) {
      _get(_getPrototypeOf(PlayerFighter.prototype), "process", this).call(this, dt, t); // if dead, don't do anything else


      if (this.hp <= 0) {
        this.hp = 0;
        this.color = "#FFa500";
        this.vel.mix((0, _vector["default"])(0, 0), this.dec * dt);
        return false; // do not kill self
      } // handle turning


      if (this.controller.pressed(this.controller.left)) {
        this.rot -= this.rot_speed * dt;
      } else if (this.controller.pressed(this.controller.right)) {
        this.rot += this.rot_speed * dt;
      } // handle thrust


      if (this.controller.pressed(this.controller.up)) {
        this.vel.subtract((0, _vector["default"])(0, this.acceleration).rotate(this.rot).scaled(dt));
        this.actively_moving = true;
      } else {
        this.actively_moving = false;
      }

      if (this.vel.length() > this.fly_speed) this.vel = this.vel.clone().norm().scaled(this.fly_speed); // handle space bar press for fire

      if (this.controller.pressed(this.controller.fire)) {
        this.fire_laser(t);
      }
    }
  }]);

  return PlayerFighter;
}(Fighter);

var AIFighter = /*#__PURE__*/function (_Fighter2) {
  _inherits(AIFighter, _Fighter2);

  var _super3 = _createSuper(AIFighter);

  function AIFighter(universe, pos, equipment, faction) {
    var _this3;

    _classCallCheck(this, AIFighter);

    _this3 = _super3.call(this, universe, pos, equipment, faction);
    _this3.target = null;
    return _this3;
  }

  _createClass(AIFighter, [{
    key: "process",
    value: function process(dt, t) {
      var _this4 = this;

      _get(_getPrototypeOf(AIFighter.prototype), "process", this).call(this, dt, t);

      if (this.hp <= 0) {
        this.hp = 0;
        this.color = "#FFa500";
        this.vel.mix((0, _vector["default"])(0, 0), this.dec * dt);
        return false; // do not kill self
      }

      var closest = null;
      var closest_distance = 10000000;
      this.universe.bodies.forEach(function (body) {
        if (closest === null) {
          closest = body;
        }

        var need_continue = false;
        if (!(body instanceof Fighter)) need_continue = true;else if (body.faction === _this4.faction || body.hp <= 0) need_continue = true;

        if (!need_continue) {
          var distance_sq = _this4.pos.distanceSq(body.pos);

          if (distance_sq < closest_distance) {
            closest_distance = distance_sq;
            closest = body;
          }
        }
      });
      this.target = closest;
      if (this.rot < 0) this.rot += 360;else if (this.rot > 360) this.rot %= 360;
      var time = this.target.pos.distance(this.pos) / (this.vel.length() + 500);
      var projection = this.target.pos.clone().add(this.target.vel.scaled(time));
      var desired_angle = (0, _vector["default"])(0, 1).angle() + projection.subtract(this.pos).angle();
      var desired_rotation = desired_angle - this.rot;
      if (desired_rotation < 0) desired_rotation += 2 * Math.PI;else if (desired_rotation > 2 * Math.PI) desired_rotation -= 2 * Math.PI; // rotate as much as possible (TODO: fix this)

      var max_rotation_amount = this.rot_speed * dt;

      if (max_rotation_amount > desired_rotation) {
        this.rot += desired_rotation;
      } else {
        this.rot += max_rotation_amount;
      }

      if (desired_rotation < 30 && this.target.hp > 0 && this.faction != this.target.faction) {
        this.fire_laser(t);
      }

      if (this.pos.distance(this.target.pos) > 50 && desired_rotation < 10) {
        this.vel.subtract((0, _vector["default"])(0, this.acceleration).rotate(this.rot).scaled(dt));
      } else {
        this.vel.mix((0, _vector["default"])(0, 0), this.dec * dt);
      }

      if (this.vel.length() > this.fly_speed) {
        this.vel.normalize().scale_ip(this.fly_speed);
      }
    }
  }]);

  return AIFighter;
}(Fighter);

var CapitalShip = /*#__PURE__*/function (_body$PolygonalBody2) {
  _inherits(CapitalShip, _body$PolygonalBody2);

  var _super4 = _createSuper(CapitalShip);

  function CapitalShip(universe, pos, points, engine_bind_points, armament_template, faction) {
    var _this5;

    _classCallCheck(this, CapitalShip);

    _this5 = _super4.call(this, universe, pos, points, faction);
    _this5.faction = faction;
    _this5.engine_bind_points = engine_bind_points;
    _this5.armaments = [];

    var _iterator = _createForOfIteratorHelper(armament_template),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var armament_data = _step.value;
        var arm = new armament_data[1](_this5.universe, _assertThisInitialized(_this5), armament_data[0], _this5.faction);

        _this5.armaments.push(arm);

        console.log(typeof bind_pos === "undefined" ? "undefined" : _typeof(bind_pos));
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    return _this5;
  }

  _createClass(CapitalShip, [{
    key: "equip",
    value: function equip() {
      this.rot_speed = this.equipment["rot speed"];
      this.fly_speed = this.equipment["fly speed"];
      this.acceleration = this.equipment["acceleration"];
      this.dec = this.equipment["dec"];
      this.shot_delay = this.equipment["shot delay"];
      this.shot_spread = Math.round(this.equipment["shot spread"] * 0.5);
      this.laser_color = this.equipment["laser color"];
      this.hp = this.equipment["hp"];
      this.shields = this.equipment["shields"];
    }
  }, {
    key: "process",
    value: function process(dt, t) {
      _get(_getPrototypeOf(CapitalShip.prototype), "process", this).call(this, dt, t);

      if (this.hp <= 0) {
        this.hp = 0;
        this.color = "#FFa500";
        this.vel.mix((0, _vector["default"])(0, 0), this.dec * dt);
        return false; // do not kill self
      }
    }
  }]);

  return CapitalShip;
}(_body["default"].PolygonalBody);

var Corvette = /*#__PURE__*/function (_CapitalShip) {
  _inherits(Corvette, _CapitalShip);

  var _super5 = _createSuper(Corvette);

  function Corvette(universe, pos, faction) {
    _classCallCheck(this, Corvette);

    var points = [(0, _vector["default"])(0, -75), (0, _vector["default"])(-15, -45), (0, _vector["default"])(-15, 45), (0, _vector["default"])(15, 45), (0, _vector["default"])(15, -45)];
    var engine_points = [(0, _vector["default"])(60, -15), (0, _vector["default"])(60, 15)];
    var armaments = [[(0, _vector["default"])(-15, 0), DualLaser.prototype.constructor], [(0, _vector["default"])(15, 0), DualLaser.prototype.constructor], [(0, _vector["default"])(-15, 30), DualLaser.prototype.constructor], [(0, _vector["default"])(15, 30), DualLaser.prototype.constructor], [(0, _vector["default"])(-15, -30), DualLaser.prototype.constructor], [(0, _vector["default"])(15, -30), DualLaser.prototype.constructor]];
    return _super5.call(this, universe, pos, points, engine_points, armaments, faction);
  }

  return Corvette;
}(CapitalShip);

var _default = {
  PlayerFighter: PlayerFighter,
  AIFighter: AIFighter,
  Corvette: Corvette
};
exports["default"] = _default;

},{"./armaments.js":3,"./body.js":4,"./projectile.js":7,"./vector.js":11}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _vector = _interopRequireDefault(require("./vector.js"));

var _body = _interopRequireDefault(require("./body.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Universe = /*#__PURE__*/function () {
  function Universe() {
    _classCallCheck(this, Universe);

    this.bodies = [];
    this.particles = [];
    this.zoom = 1;
    this.zoom_speed = 0.5;
    this.camera = (0, _vector["default"])(0, 0);
    this.focus = null;
    this.chunks = {};
    this.chunk_size = 500;
    this.background = [];

    for (var i = 0; i < 2500; ++i) {
      var pos = (0, _vector["default"])(Math.round(Math.random() * 40000 - 20000), Math.round(Math.random() * 40000 - 20000));
      this.background.push([pos, Math.random() * 0.5]);
    }
  }

  _createClass(Universe, [{
    key: "remove_body",
    value: function remove_body(body) {
      var index = this.bodies.indexOf(body);

      if (index > -1) {
        this.bodies.splice(index, 1);
      }
    }
  }, {
    key: "zero_adjusted",
    value: function zero_adjusted(pos) {
      var zero_adjusted = pos.clone();

      if (pos.x == 0) {
        zero_adjusted.x = 1;
      }

      if (pos.y == 0) {
        zero_adjusted.y = 1;
      }

      return zero_adjusted;
    }
  }, {
    key: "chunk_key",
    value: function chunk_key(pos) {
      var zero_adjusted = this.zero_adjusted(pos);
      return "".concat(Math.floor(zero_adjusted.x / this.chunk_size), ";").concat(Math.floor(zero_adjusted.y / this.chunk_size));
    }
  }, {
    key: "adjacent_chunk_keys",
    value: function adjacent_chunk_keys(pos) {
      var reach = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
      var zero_adjusted = this.zero_adjusted(pos);
      var main_chunk_pos = (0, _vector["default"])(Math.floor(zero_adjusted.x / this.chunk_size), Math.floor(zero_adjusted.y / this.chunk_size));
      var keys = [];

      for (var dx = -reach; dx < reach; ++dx) {
        for (var dy = -reach; dy < reach; ++dy) {
          var chunk_pos = (0, _vector["default"])(main_chunk_pos.x + dx, main_chunk_pos.y + dy);
          keys.push("".concat(chunk_pos.x, ";").concat(chunk_pos.y));
        }
      }

      return keys;
    }
  }, {
    key: "update_chunk_for",
    value: function update_chunk_for(e) {
      var key = this.chunk_key(e.pos);

      if (key === e.chunk) {
        return e.chunk;
      } else if (key in this.chunks && e.chunk in this.chunks) {
        this.chunks[key].push(e);
        var index = this.chunks[e.chunk].indexOf(e);
        this.chunks[e.chunk].splice(index, 1);
      } else if (key in this.chunks) {
        this.chunks[key].push(e);
      } else {
        this.chunks[key] = [e];
      }

      return key;
    }
  }, {
    key: "get_nearby_bodies",
    value: function get_nearby_bodies(e) {
      var _this = this;

      var reach = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
      var keys = this.adjacent_chunk_keys(e.pos, reach);
      var bodies = [];
      keys.forEach(function (key) {
        if (key in _this.chunks) {
          _this.chunks[key].forEach(function (body) {
            bodies.push(body);
          });
        }
      });
      return bodies;
    }
  }, {
    key: "update",
    value: function update(dt, t) {
      if (self.focus != null) {
        this.camera = this.focus.pos.clone().subtract((0, _vector["default"])(450, 300).scaled(1 / this.zoom));

        if (this.focus.vel.length() > 900) {
          this.zoom = (0, _vector["default"])(this.zoom, 0).mix((0, _vector["default"])(0.3, 0), this.zoom_speed * dt).x;
        } else if (this.focus.vel.length() > 200) {
          this.zoom = (0, _vector["default"])(this.zoom, 0).mix((0, _vector["default"])(0.5, 0), this.zoom_speed * dt).x;
        } else {
          this.zoom = (0, _vector["default"])(this.zoom, 0).mix((0, _vector["default"])(1, 0), this.zoom_speed * dt).x;
        }
      } // update children


      this.bodies.forEach(function (b) {
        b.update(dt, t);
      });
    }
  }, {
    key: "render",
    value: function render(context) {
      var _this2 = this;

      context.fillStyle = "#000000";
      context.fillRect(0, 0, 900, 600);
      this.background.forEach(function (pos) {
        var rp = _this2.get_render_point(pos[0], pos[1]);

        if (rp.x < 1000 && rp.x > -100 && rp.y < 700 && rp.y > -100) {
          _this2.draw_circle(context, "#FFFFFF", pos[0], 2, pos[1]);
        }
      });
      this.bodies.forEach(function (b) {
        b.draw(context);
      });
    }
  }, {
    key: "draw_poly",
    value: function draw_poly(context, color, global_points) {
      var _this3 = this;

      var parralax = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 1;
      context.fillStyle = color;
      var s = this.get_render_point(global_points[0]);
      context.beginPath();
      context.moveTo(s.x, s.y);
      global_points.forEach(function (p) {
        var rp = _this3.get_render_point(p);

        context.lineTo(rp.x, rp.y);
      });
      context.fill();
    }
  }, {
    key: "draw_circle",
    value: function draw_circle(context, color, global_center, radius) {
      var parallax = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 1;
      var fill = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : true;
      var render_center = this.get_render_point(global_center, parallax);
      context.fillStyle = color;
      context.strokeStyle = color;
      context.beginPath();
      context.arc(render_center.x, render_center.y, Math.max(radius * this.zoom, 1), 0, 2 * Math.PI);
      if (fill) context.fill();else context.stroke();
    }
  }, {
    key: "draw_line",
    value: function draw_line(context, color, start, end, width) {
      var parallax = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 1;
      context.strokeStyle = color;
      context.lineWidth = width;
      context.beginPath();
      var start_render = this.get_render_point(start, parallax);
      var end_render = this.get_render_point(end, parallax);
      context.moveTo(start_render.x, start_render.y);
      context.lineTo(end_render.x, end_render.y);
      context.stroke();
    }
  }, {
    key: "get_render_point",
    value: function get_render_point(point) {
      var parallax = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
      return point.clone().subtract(this.camera).scaled(this.zoom * parallax);
    }
  }]);

  return Universe;
}();

var _default = Universe;
exports["default"] = _default;

},{"./body.js":4,"./vector.js":11}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var Vector = require('victor');

Vector.prototype.scale_ip = function (amount) {
  this.x *= amount;
  this.y *= amount;
};

Vector.prototype.scaled = function (amount) {
  return new Vector(this.x * amount, this.y * amount);
};

Vector.prototype.angle_to = function (other) {
  return this.angle - other.angle;
};

function vec(x, y) {
  return new Vector(x, y);
}

var _default = vec;
exports["default"] = _default;

},{"victor":2}]},{},[6]);
