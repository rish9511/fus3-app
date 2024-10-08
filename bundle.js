(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
/**
 * @fileoverview gRPC-Web generated client stub for fuse
 * @enhanceable
 * @public
 */

// Code generated by protoc-gen-grpc-web. DO NOT EDIT.
// versions:
// 	protoc-gen-grpc-web v1.5.0
// 	protoc              v5.27.3
// source: fuseservice.proto


/* eslint-disable */
// @ts-nocheck



const grpc = {};
grpc.web = require('grpc-web');

const proto = {};
proto.fuse = require('./fuseservice_pb.js');

/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?grpc.web.ClientOptions} options
 * @constructor
 * @struct
 * @final
 */
proto.fuse.FuseClient =
    function(hostname, credentials, options) {
  if (!options) options = {};
  options.format = 'text';

  /**
   * @private @const {!grpc.web.GrpcWebClientBase} The client
   */
  this.client_ = new grpc.web.GrpcWebClientBase(options);

  /**
   * @private @const {string} The hostname
   */
  this.hostname_ = hostname.replace(/\/+$/, '');

};


/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?grpc.web.ClientOptions} options
 * @constructor
 * @struct
 * @final
 */
proto.fuse.FusePromiseClient =
    function(hostname, credentials, options) {
  if (!options) options = {};
  options.format = 'text';

  /**
   * @private @const {!grpc.web.GrpcWebClientBase} The client
   */
  this.client_ = new grpc.web.GrpcWebClientBase(options);

  /**
   * @private @const {string} The hostname
   */
  this.hostname_ = hostname.replace(/\/+$/, '');

};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.fuse.EmptyMessage,
 *   !proto.fuse.Buckets>}
 */
const methodDescriptor_Fuse_ListBuckets = new grpc.web.MethodDescriptor(
  '/fuse.Fuse/ListBuckets',
  grpc.web.MethodType.UNARY,
  proto.fuse.EmptyMessage,
  proto.fuse.Buckets,
  /**
   * @param {!proto.fuse.EmptyMessage} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.fuse.Buckets.deserializeBinary
);


/**
 * @param {!proto.fuse.EmptyMessage} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.fuse.Buckets)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.fuse.Buckets>|undefined}
 *     The XHR Node Readable Stream
 */
proto.fuse.FuseClient.prototype.listBuckets =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/fuse.Fuse/ListBuckets',
      request,
      metadata || {},
      methodDescriptor_Fuse_ListBuckets,
      callback);
};


/**
 * @param {!proto.fuse.EmptyMessage} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.fuse.Buckets>}
 *     Promise that resolves to the response
 */
proto.fuse.FusePromiseClient.prototype.listBuckets =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/fuse.Fuse/ListBuckets',
      request,
      metadata || {},
      methodDescriptor_Fuse_ListBuckets);
};


module.exports = proto.fuse;


},{"./fuseservice_pb.js":5,"grpc-web":8}],5:[function(require,module,exports){
// source: fuseservice.proto
/**
 * @fileoverview
 * @enhanceable
 * @suppress {missingRequire} reports error on implicit type usages.
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!
/* eslint-disable */
// @ts-nocheck

var jspb = require('google-protobuf');
var goog = jspb;
var global =
    (typeof globalThis !== 'undefined' && globalThis) ||
    (typeof window !== 'undefined' && window) ||
    (typeof global !== 'undefined' && global) ||
    (typeof self !== 'undefined' && self) ||
    (function () { return this; }).call(null) ||
    Function('return this')();

goog.exportSymbol('proto.fuse.Bucket', null, global);
goog.exportSymbol('proto.fuse.Buckets', null, global);
goog.exportSymbol('proto.fuse.EmptyMessage', null, global);
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.fuse.EmptyMessage = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.fuse.EmptyMessage, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.fuse.EmptyMessage.displayName = 'proto.fuse.EmptyMessage';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.fuse.Bucket = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.fuse.Bucket, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.fuse.Bucket.displayName = 'proto.fuse.Bucket';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.fuse.Buckets = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.fuse.Buckets.repeatedFields_, null);
};
goog.inherits(proto.fuse.Buckets, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.fuse.Buckets.displayName = 'proto.fuse.Buckets';
}



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.fuse.EmptyMessage.prototype.toObject = function(opt_includeInstance) {
  return proto.fuse.EmptyMessage.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.fuse.EmptyMessage} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.fuse.EmptyMessage.toObject = function(includeInstance, msg) {
  var f, obj = {

  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.fuse.EmptyMessage}
 */
proto.fuse.EmptyMessage.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.fuse.EmptyMessage;
  return proto.fuse.EmptyMessage.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.fuse.EmptyMessage} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.fuse.EmptyMessage}
 */
proto.fuse.EmptyMessage.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.fuse.EmptyMessage.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.fuse.EmptyMessage.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.fuse.EmptyMessage} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.fuse.EmptyMessage.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
};





if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.fuse.Bucket.prototype.toObject = function(opt_includeInstance) {
  return proto.fuse.Bucket.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.fuse.Bucket} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.fuse.Bucket.toObject = function(includeInstance, msg) {
  var f, obj = {
    name: jspb.Message.getFieldWithDefault(msg, 1, ""),
    path: jspb.Message.getFieldWithDefault(msg, 2, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.fuse.Bucket}
 */
proto.fuse.Bucket.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.fuse.Bucket;
  return proto.fuse.Bucket.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.fuse.Bucket} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.fuse.Bucket}
 */
proto.fuse.Bucket.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setPath(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.fuse.Bucket.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.fuse.Bucket.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.fuse.Bucket} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.fuse.Bucket.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getPath();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
};


/**
 * optional string name = 1;
 * @return {string}
 */
proto.fuse.Bucket.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.fuse.Bucket} returns this
 */
proto.fuse.Bucket.prototype.setName = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string path = 2;
 * @return {string}
 */
proto.fuse.Bucket.prototype.getPath = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * @param {string} value
 * @return {!proto.fuse.Bucket} returns this
 */
proto.fuse.Bucket.prototype.setPath = function(value) {
  return jspb.Message.setProto3StringField(this, 2, value);
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.fuse.Buckets.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.fuse.Buckets.prototype.toObject = function(opt_includeInstance) {
  return proto.fuse.Buckets.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.fuse.Buckets} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.fuse.Buckets.toObject = function(includeInstance, msg) {
  var f, obj = {
    allbucketsList: jspb.Message.toObjectList(msg.getAllbucketsList(),
    proto.fuse.Bucket.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.fuse.Buckets}
 */
proto.fuse.Buckets.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.fuse.Buckets;
  return proto.fuse.Buckets.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.fuse.Buckets} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.fuse.Buckets}
 */
proto.fuse.Buckets.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.fuse.Bucket;
      reader.readMessage(value,proto.fuse.Bucket.deserializeBinaryFromReader);
      msg.addAllbuckets(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.fuse.Buckets.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.fuse.Buckets.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.fuse.Buckets} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.fuse.Buckets.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getAllbucketsList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.fuse.Bucket.serializeBinaryToWriter
    );
  }
};


/**
 * repeated Bucket allBuckets = 1;
 * @return {!Array<!proto.fuse.Bucket>}
 */
proto.fuse.Buckets.prototype.getAllbucketsList = function() {
  return /** @type{!Array<!proto.fuse.Bucket>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.fuse.Bucket, 1));
};


/**
 * @param {!Array<!proto.fuse.Bucket>} value
 * @return {!proto.fuse.Buckets} returns this
*/
proto.fuse.Buckets.prototype.setAllbucketsList = function(value) {
  return jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.fuse.Bucket=} opt_value
 * @param {number=} opt_index
 * @return {!proto.fuse.Bucket}
 */
proto.fuse.Buckets.prototype.addAllbuckets = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.fuse.Bucket, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.fuse.Buckets} returns this
 */
proto.fuse.Buckets.prototype.clearAllbucketsList = function() {
  return this.setAllbucketsList([]);
};


goog.object.extend(exports, proto.fuse);

},{"google-protobuf":7}],6:[function(require,module,exports){
"use strict";

var _leaflet = _interopRequireDefault(require("leaflet"));
require("l.movemarker");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// import "leaflet"
// const { app, BrowserWindow } = require('electron')

// const createWindow = () => {
//   const win = new BrowserWindow({
//     width: 800,
//     height: 600
//   })

//   win.loadFile('index.html')
// }
// app.whenReady().then(() => {

//   createWindow()
// })

// import "./node_modules/l.movemarker"

console.log("running main.js file");
const map = _leaflet.default.map('map').setView([51.505, -0.09], 15);
const tiles = _leaflet.default.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
map.on('click', function (e) {
  console.log(e.latlng.lat, e.latlng.lng);
});
var aws_bucket_icon = _leaflet.default.icon({
  iconUrl: 'aws-s3.svg',
  // shadowUrl: 'leaf-shadow.png',
  iconSize: [38, 95],
  // size of the icon
  shadowSize: [50, 64],
  // size of the shadow
  iconAnchor: [22, 94],
  // point of the icon which will correspond to marker's location
  shadowAnchor: [4, 62],
  // the same for the shadow
  popupAnchor: [-3, -76] // point from which the popup should open relative to the iconAnchor
});
var aws_bucket_icon_2 = _leaflet.default.icon({
  iconUrl: 'aws-s3.svg',
  // shadowUrl: 'leaf-shadow.png',
  iconSize: [38, 95],
  // size of the icon
  shadowSize: [50, 64],
  // size of the shadow
  iconAnchor: [22, 94],
  // point of the icon which will correspond to marker's location
  shadowAnchor: [4, 62],
  // the same for the shadow
  popupAnchor: [-3, -76] // point from which the popup should open relative to the iconAnchor
});
_leaflet.default.marker([51.5, -0.09], {
  icon: aws_bucket_icon
}).addTo(map);
_leaflet.default.marker([51.50008749807709, -0.1257419586181641], {
  icon: aws_bucket_icon_2
}).addTo(map);
var polylineOptions = {
  animate: true,
  duration: 5000
};
var markerOptions = {
  animate: true,
  duration: 5000
};
const instance = _leaflet.default.moveMarker([[51.5, -0.09], [51.50008749807709, -0.1257419586181641]], polylineOptions, markerOptions).addTo(map);
console.log(instance.getMarker());
const {
  EmptyMessage
} = require('./fuse_service/fuseservice_pb.js');
const {
  FuseClient
} = require('./fuse_service/fuseservice_grpc_web_pb.js');
var client = new FuseClient('http://localhost:8080');
var emptyMessage = new EmptyMessage();
client.listBuckets(emptyMessage, {}, (err, response) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Response:', response);
  }
});

// instance.addMoreLine([-8.822512, 115.186803], {
//   duration: 5000, // in milliseconds (optional)
//   speed: 25, // in km/h (optional)
//   rotateAngle: 141, // (required if rotateMarker enable)
//   animatePolyline: true, // (required)
// })

},{"./fuse_service/fuseservice_grpc_web_pb.js":4,"./fuse_service/fuseservice_pb.js":5,"l.movemarker":9,"leaflet":10}],7:[function(require,module,exports){
(function (global,Buffer){(function (){
"use strict";

var $jscomp = $jscomp || {};
$jscomp.scope = {};
$jscomp.findInternal = function (a, b, c) {
  a instanceof String && (a = String(a));
  for (var d = a.length, e = 0; e < d; e++) {
    var f = a[e];
    if (b.call(c, f, e, a)) return {
      i: e,
      v: f
    };
  }
  return {
    i: -1,
    v: void 0
  };
};
$jscomp.ASSUME_ES5 = !1;
$jscomp.ASSUME_NO_NATIVE_MAP = !1;
$jscomp.ASSUME_NO_NATIVE_SET = !1;
$jscomp.SIMPLE_FROUND_POLYFILL = !1;
$jscomp.defineProperty = $jscomp.ASSUME_ES5 || "function" == typeof Object.defineProperties ? Object.defineProperty : function (a, b, c) {
  a != Array.prototype && a != Object.prototype && (a[b] = c.value);
};
$jscomp.getGlobal = function (a) {
  return "undefined" != typeof window && window === a ? a : "undefined" != typeof global && null != global ? global : a;
};
$jscomp.global = $jscomp.getGlobal(void 0);
$jscomp.polyfill = function (a, b, c, d) {
  if (b) {
    c = $jscomp.global;
    a = a.split(".");
    for (d = 0; d < a.length - 1; d++) {
      var e = a[d];
      e in c || (c[e] = {});
      c = c[e];
    }
    a = a[a.length - 1];
    d = c[a];
    b = b(d);
    b != d && null != b && $jscomp.defineProperty(c, a, {
      configurable: !0,
      writable: !0,
      value: b
    });
  }
};
$jscomp.polyfill("Array.prototype.findIndex", function (a) {
  return a ? a : function (a, c) {
    return $jscomp.findInternal(this, a, c).i;
  };
}, "es6", "es3");
$jscomp.checkStringArgs = function (a, b, c) {
  if (null == a) throw new TypeError("The 'this' value for String.prototype." + c + " must not be null or undefined");
  if (b instanceof RegExp) throw new TypeError("First argument to String.prototype." + c + " must not be a regular expression");
  return a + "";
};
$jscomp.polyfill("String.prototype.endsWith", function (a) {
  return a ? a : function (a, c) {
    var b = $jscomp.checkStringArgs(this, a, "endsWith");
    a += "";
    void 0 === c && (c = b.length);
    c = Math.max(0, Math.min(c | 0, b.length));
    for (var e = a.length; 0 < e && 0 < c;) if (b[--c] != a[--e]) return !1;
    return 0 >= e;
  };
}, "es6", "es3");
$jscomp.polyfill("Array.prototype.find", function (a) {
  return a ? a : function (a, c) {
    return $jscomp.findInternal(this, a, c).v;
  };
}, "es6", "es3");
$jscomp.polyfill("String.prototype.startsWith", function (a) {
  return a ? a : function (a, c) {
    var b = $jscomp.checkStringArgs(this, a, "startsWith");
    a += "";
    var e = b.length,
      f = a.length;
    c = Math.max(0, Math.min(c | 0, b.length));
    for (var g = 0; g < f && c < e;) if (b[c++] != a[g++]) return !1;
    return g >= f;
  };
}, "es6", "es3");
$jscomp.polyfill("String.prototype.repeat", function (a) {
  return a ? a : function (a) {
    var b = $jscomp.checkStringArgs(this, null, "repeat");
    if (0 > a || 1342177279 < a) throw new RangeError("Invalid count value");
    a |= 0;
    for (var d = ""; a;) if (a & 1 && (d += b), a >>>= 1) b += b;
    return d;
  };
}, "es6", "es3");
var COMPILED = !0,
  goog = goog || {};
goog.global = void 0 || self;
goog.isDef = function (a) {
  return void 0 !== a;
};
goog.isString = function (a) {
  return "string" == typeof a;
};
goog.isBoolean = function (a) {
  return "boolean" == typeof a;
};
goog.isNumber = function (a) {
  return "number" == typeof a;
};
goog.exportPath_ = function (a, b, c) {
  a = a.split(".");
  c = c || goog.global;
  a[0] in c || "undefined" == typeof c.execScript || c.execScript("var " + a[0]);
  for (var d; a.length && (d = a.shift());) !a.length && goog.isDef(b) ? c[d] = b : c = c[d] && c[d] !== Object.prototype[d] ? c[d] : c[d] = {};
};
goog.define = function (a, b) {
  if (!COMPILED) {
    var c = goog.global.CLOSURE_UNCOMPILED_DEFINES,
      d = goog.global.CLOSURE_DEFINES;
    c && void 0 === c.nodeType && Object.prototype.hasOwnProperty.call(c, a) ? b = c[a] : d && void 0 === d.nodeType && Object.prototype.hasOwnProperty.call(d, a) && (b = d[a]);
  }
  return b;
};
goog.FEATURESET_YEAR = 2012;
goog.DEBUG = !0;
goog.LOCALE = "en";
goog.TRUSTED_SITE = !0;
goog.STRICT_MODE_COMPATIBLE = !1;
goog.DISALLOW_TEST_ONLY_CODE = COMPILED && !goog.DEBUG;
goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING = !1;
goog.provide = function (a) {
  if (goog.isInModuleLoader_()) throw Error("goog.provide cannot be used within a module.");
  if (!COMPILED && goog.isProvided_(a)) throw Error('Namespace "' + a + '" already declared.');
  goog.constructNamespace_(a);
};
goog.constructNamespace_ = function (a, b) {
  if (!COMPILED) {
    delete goog.implicitNamespaces_[a];
    for (var c = a; (c = c.substring(0, c.lastIndexOf("."))) && !goog.getObjectByName(c);) goog.implicitNamespaces_[c] = !0;
  }
  goog.exportPath_(a, b);
};
goog.getScriptNonce = function (a) {
  if (a && a != goog.global) return goog.getScriptNonce_(a.document);
  null === goog.cspNonce_ && (goog.cspNonce_ = goog.getScriptNonce_(goog.global.document));
  return goog.cspNonce_;
};
goog.NONCE_PATTERN_ = /^[\w+/_-]+[=]{0,2}$/;
goog.cspNonce_ = null;
goog.getScriptNonce_ = function (a) {
  return (a = a.querySelector && a.querySelector("script[nonce]")) && (a = a.nonce || a.getAttribute("nonce")) && goog.NONCE_PATTERN_.test(a) ? a : "";
};
goog.VALID_MODULE_RE_ = /^[a-zA-Z_$][a-zA-Z0-9._$]*$/;
goog.module = function (a) {
  if (!goog.isString(a) || !a || -1 == a.search(goog.VALID_MODULE_RE_)) throw Error("Invalid module identifier");
  if (!goog.isInGoogModuleLoader_()) throw Error("Module " + a + " has been loaded incorrectly. Note, modules cannot be loaded as normal scripts. They require some kind of pre-processing step. You're likely trying to load a module via a script tag or as a part of a concatenated bundle without rewriting the module. For more info see: https://github.com/google/closure-library/wiki/goog.module:-an-ES6-module-like-alternative-to-goog.provide.");
  if (goog.moduleLoaderState_.moduleName) throw Error("goog.module may only be called once per module.");
  goog.moduleLoaderState_.moduleName = a;
  if (!COMPILED) {
    if (goog.isProvided_(a)) throw Error('Namespace "' + a + '" already declared.');
    delete goog.implicitNamespaces_[a];
  }
};
goog.module.get = function (a) {
  return goog.module.getInternal_(a);
};
goog.module.getInternal_ = function (a) {
  if (!COMPILED) {
    if (a in goog.loadedModules_) return goog.loadedModules_[a].exports;
    if (!goog.implicitNamespaces_[a]) return a = goog.getObjectByName(a), null != a ? a : null;
  }
  return null;
};
goog.ModuleType = {
  ES6: "es6",
  GOOG: "goog"
};
goog.moduleLoaderState_ = null;
goog.isInModuleLoader_ = function () {
  return goog.isInGoogModuleLoader_() || goog.isInEs6ModuleLoader_();
};
goog.isInGoogModuleLoader_ = function () {
  return !!goog.moduleLoaderState_ && goog.moduleLoaderState_.type == goog.ModuleType.GOOG;
};
goog.isInEs6ModuleLoader_ = function () {
  if (goog.moduleLoaderState_ && goog.moduleLoaderState_.type == goog.ModuleType.ES6) return !0;
  var a = goog.global.$jscomp;
  return a ? "function" != typeof a.getCurrentModulePath ? !1 : !!a.getCurrentModulePath() : !1;
};
goog.module.declareLegacyNamespace = function () {
  if (!COMPILED && !goog.isInGoogModuleLoader_()) throw Error("goog.module.declareLegacyNamespace must be called from within a goog.module");
  if (!COMPILED && !goog.moduleLoaderState_.moduleName) throw Error("goog.module must be called prior to goog.module.declareLegacyNamespace.");
  goog.moduleLoaderState_.declareLegacyNamespace = !0;
};
goog.declareModuleId = function (a) {
  if (!COMPILED) {
    if (!goog.isInEs6ModuleLoader_()) throw Error("goog.declareModuleId may only be called from within an ES6 module");
    if (goog.moduleLoaderState_ && goog.moduleLoaderState_.moduleName) throw Error("goog.declareModuleId may only be called once per module.");
    if (a in goog.loadedModules_) throw Error('Module with namespace "' + a + '" already exists.');
  }
  if (goog.moduleLoaderState_) goog.moduleLoaderState_.moduleName = a;else {
    var b = goog.global.$jscomp;
    if (!b || "function" != typeof b.getCurrentModulePath) throw Error('Module with namespace "' + a + '" has been loaded incorrectly.');
    b = b.require(b.getCurrentModulePath());
    goog.loadedModules_[a] = {
      exports: b,
      type: goog.ModuleType.ES6,
      moduleId: a
    };
  }
};
goog.setTestOnly = function (a) {
  if (goog.DISALLOW_TEST_ONLY_CODE) throw a = a || "", Error("Importing test-only code into non-debug environment" + (a ? ": " + a : "."));
};
goog.forwardDeclare = function (a) {};
COMPILED || (goog.isProvided_ = function (a) {
  return a in goog.loadedModules_ || !goog.implicitNamespaces_[a] && goog.isDefAndNotNull(goog.getObjectByName(a));
}, goog.implicitNamespaces_ = {
  "goog.module": !0
});
goog.getObjectByName = function (a, b) {
  a = a.split(".");
  b = b || goog.global;
  for (var c = 0; c < a.length; c++) if (b = b[a[c]], !goog.isDefAndNotNull(b)) return null;
  return b;
};
goog.globalize = function (a, b) {
  b = b || goog.global;
  for (var c in a) b[c] = a[c];
};
goog.addDependency = function (a, b, c, d) {
  !COMPILED && goog.DEPENDENCIES_ENABLED && goog.debugLoader_.addDependency(a, b, c, d);
};
goog.ENABLE_DEBUG_LOADER = !0;
goog.logToConsole_ = function (a) {
  goog.global.console && goog.global.console.error(a);
};
goog.require = function (a) {
  if (!COMPILED) {
    goog.ENABLE_DEBUG_LOADER && goog.debugLoader_.requested(a);
    if (goog.isProvided_(a)) {
      if (goog.isInModuleLoader_()) return goog.module.getInternal_(a);
    } else if (goog.ENABLE_DEBUG_LOADER) {
      var b = goog.moduleLoaderState_;
      goog.moduleLoaderState_ = null;
      try {
        goog.debugLoader_.load_(a);
      } finally {
        goog.moduleLoaderState_ = b;
      }
    }
    return null;
  }
};
goog.requireType = function (a) {
  return {};
};
goog.basePath = "";
goog.nullFunction = function () {};
goog.abstractMethod = function () {
  throw Error("unimplemented abstract method");
};
goog.addSingletonGetter = function (a) {
  a.instance_ = void 0;
  a.getInstance = function () {
    if (a.instance_) return a.instance_;
    goog.DEBUG && (goog.instantiatedSingletons_[goog.instantiatedSingletons_.length] = a);
    return a.instance_ = new a();
  };
};
goog.instantiatedSingletons_ = [];
goog.LOAD_MODULE_USING_EVAL = !0;
goog.SEAL_MODULE_EXPORTS = goog.DEBUG;
goog.loadedModules_ = {};
goog.DEPENDENCIES_ENABLED = !COMPILED && goog.ENABLE_DEBUG_LOADER;
goog.TRANSPILE = "detect";
goog.ASSUME_ES_MODULES_TRANSPILED = !1;
goog.TRANSPILE_TO_LANGUAGE = "";
goog.TRANSPILER = "transpile.js";
goog.hasBadLetScoping = null;
goog.useSafari10Workaround = function () {
  if (null == goog.hasBadLetScoping) {
    try {
      var a = !eval('"use strict";let x = 1; function f() { return typeof x; };f() == "number";');
    } catch (b) {
      a = !1;
    }
    goog.hasBadLetScoping = a;
  }
  return goog.hasBadLetScoping;
};
goog.workaroundSafari10EvalBug = function (a) {
  return "(function(){" + a + "\n;})();\n";
};
goog.loadModule = function (a) {
  var b = goog.moduleLoaderState_;
  try {
    goog.moduleLoaderState_ = {
      moduleName: "",
      declareLegacyNamespace: !1,
      type: goog.ModuleType.GOOG
    };
    if (goog.isFunction(a)) var c = a.call(void 0, {});else if (goog.isString(a)) goog.useSafari10Workaround() && (a = goog.workaroundSafari10EvalBug(a)), c = goog.loadModuleFromSource_.call(void 0, a);else throw Error("Invalid module definition");
    var d = goog.moduleLoaderState_.moduleName;
    if (goog.isString(d) && d) goog.moduleLoaderState_.declareLegacyNamespace ? goog.constructNamespace_(d, c) : goog.SEAL_MODULE_EXPORTS && Object.seal && "object" == typeof c && null != c && Object.seal(c), goog.loadedModules_[d] = {
      exports: c,
      type: goog.ModuleType.GOOG,
      moduleId: goog.moduleLoaderState_.moduleName
    };else throw Error('Invalid module name "' + d + '"');
  } finally {
    goog.moduleLoaderState_ = b;
  }
};
goog.loadModuleFromSource_ = function (a) {
  eval(a);
  return {};
};
goog.normalizePath_ = function (a) {
  a = a.split("/");
  for (var b = 0; b < a.length;) "." == a[b] ? a.splice(b, 1) : b && ".." == a[b] && a[b - 1] && ".." != a[b - 1] ? a.splice(--b, 2) : b++;
  return a.join("/");
};
goog.loadFileSync_ = function (a) {
  if (goog.global.CLOSURE_LOAD_FILE_SYNC) return goog.global.CLOSURE_LOAD_FILE_SYNC(a);
  try {
    var b = new goog.global.XMLHttpRequest();
    b.open("get", a, !1);
    b.send();
    return 0 == b.status || 200 == b.status ? b.responseText : null;
  } catch (c) {
    return null;
  }
};
goog.transpile_ = function (a, b, c) {
  var d = goog.global.$jscomp;
  d || (goog.global.$jscomp = d = {});
  var e = d.transpile;
  if (!e) {
    var f = goog.basePath + goog.TRANSPILER,
      g = goog.loadFileSync_(f);
    if (g) {
      (function () {
        (0, eval)(g + "\n//# sourceURL=" + f);
      }).call(goog.global);
      if (goog.global.$gwtExport && goog.global.$gwtExport.$jscomp && !goog.global.$gwtExport.$jscomp.transpile) throw Error('The transpiler did not properly export the "transpile" method. $gwtExport: ' + JSON.stringify(goog.global.$gwtExport));
      goog.global.$jscomp.transpile = goog.global.$gwtExport.$jscomp.transpile;
      d = goog.global.$jscomp;
      e = d.transpile;
    }
  }
  e || (e = d.transpile = function (a, b) {
    goog.logToConsole_(b + " requires transpilation but no transpiler was found.");
    return a;
  });
  return e(a, b, c);
};
goog.typeOf = function (a) {
  var b = typeof a;
  if ("object" == b) {
    if (a) {
      if (a instanceof Array) return "array";
      if (a instanceof Object) return b;
      var c = Object.prototype.toString.call(a);
      if ("[object Window]" == c) return "object";
      if ("[object Array]" == c || "number" == typeof a.length && "undefined" != typeof a.splice && "undefined" != typeof a.propertyIsEnumerable && !a.propertyIsEnumerable("splice")) return "array";
      if ("[object Function]" == c || "undefined" != typeof a.call && "undefined" != typeof a.propertyIsEnumerable && !a.propertyIsEnumerable("call")) return "function";
    } else return "null";
  } else if ("function" == b && "undefined" == typeof a.call) return "object";
  return b;
};
goog.isNull = function (a) {
  return null === a;
};
goog.isDefAndNotNull = function (a) {
  return null != a;
};
goog.isArray = function (a) {
  return "array" == goog.typeOf(a);
};
goog.isArrayLike = function (a) {
  var b = goog.typeOf(a);
  return "array" == b || "object" == b && "number" == typeof a.length;
};
goog.isDateLike = function (a) {
  return goog.isObject(a) && "function" == typeof a.getFullYear;
};
goog.isFunction = function (a) {
  return "function" == goog.typeOf(a);
};
goog.isObject = function (a) {
  var b = typeof a;
  return "object" == b && null != a || "function" == b;
};
goog.getUid = function (a) {
  return a[goog.UID_PROPERTY_] || (a[goog.UID_PROPERTY_] = ++goog.uidCounter_);
};
goog.hasUid = function (a) {
  return !!a[goog.UID_PROPERTY_];
};
goog.removeUid = function (a) {
  null !== a && "removeAttribute" in a && a.removeAttribute(goog.UID_PROPERTY_);
  try {
    delete a[goog.UID_PROPERTY_];
  } catch (b) {}
};
goog.UID_PROPERTY_ = "closure_uid_" + (1E9 * Math.random() >>> 0);
goog.uidCounter_ = 0;
goog.getHashCode = goog.getUid;
goog.removeHashCode = goog.removeUid;
goog.cloneObject = function (a) {
  var b = goog.typeOf(a);
  if ("object" == b || "array" == b) {
    if ("function" === typeof a.clone) return a.clone();
    b = "array" == b ? [] : {};
    for (var c in a) b[c] = goog.cloneObject(a[c]);
    return b;
  }
  return a;
};
goog.bindNative_ = function (a, b, c) {
  return a.call.apply(a.bind, arguments);
};
goog.bindJs_ = function (a, b, c) {
  if (!a) throw Error();
  if (2 < arguments.length) {
    var d = Array.prototype.slice.call(arguments, 2);
    return function () {
      var c = Array.prototype.slice.call(arguments);
      Array.prototype.unshift.apply(c, d);
      return a.apply(b, c);
    };
  }
  return function () {
    return a.apply(b, arguments);
  };
};
goog.bind = function (a, b, c) {
  Function.prototype.bind && -1 != Function.prototype.bind.toString().indexOf("native code") ? goog.bind = goog.bindNative_ : goog.bind = goog.bindJs_;
  return goog.bind.apply(null, arguments);
};
goog.partial = function (a, b) {
  var c = Array.prototype.slice.call(arguments, 1);
  return function () {
    var b = c.slice();
    b.push.apply(b, arguments);
    return a.apply(this, b);
  };
};
goog.mixin = function (a, b) {
  for (var c in b) a[c] = b[c];
};
goog.now = goog.TRUSTED_SITE && Date.now || function () {
  return +new Date();
};
goog.globalEval = function (a) {
  if (goog.global.execScript) goog.global.execScript(a, "JavaScript");else if (goog.global.eval) {
    if (null == goog.evalWorksForGlobals_) {
      try {
        goog.global.eval("var _evalTest_ = 1;");
      } catch (d) {}
      if ("undefined" != typeof goog.global._evalTest_) {
        try {
          delete goog.global._evalTest_;
        } catch (d) {}
        goog.evalWorksForGlobals_ = !0;
      } else goog.evalWorksForGlobals_ = !1;
    }
    if (goog.evalWorksForGlobals_) goog.global.eval(a);else {
      var b = goog.global.document,
        c = b.createElement("SCRIPT");
      c.type = "text/javascript";
      c.defer = !1;
      c.appendChild(b.createTextNode(a));
      b.head.appendChild(c);
      b.head.removeChild(c);
    }
  } else throw Error("goog.globalEval not available");
};
goog.evalWorksForGlobals_ = null;
goog.getCssName = function (a, b) {
  if ("." == String(a).charAt(0)) throw Error('className passed in goog.getCssName must not start with ".". You passed: ' + a);
  var c = function (a) {
      return goog.cssNameMapping_[a] || a;
    },
    d = function (a) {
      a = a.split("-");
      for (var b = [], d = 0; d < a.length; d++) b.push(c(a[d]));
      return b.join("-");
    };
  d = goog.cssNameMapping_ ? "BY_WHOLE" == goog.cssNameMappingStyle_ ? c : d : function (a) {
    return a;
  };
  a = b ? a + "-" + d(b) : d(a);
  return goog.global.CLOSURE_CSS_NAME_MAP_FN ? goog.global.CLOSURE_CSS_NAME_MAP_FN(a) : a;
};
goog.setCssNameMapping = function (a, b) {
  goog.cssNameMapping_ = a;
  goog.cssNameMappingStyle_ = b;
};
!COMPILED && goog.global.CLOSURE_CSS_NAME_MAPPING && (goog.cssNameMapping_ = goog.global.CLOSURE_CSS_NAME_MAPPING);
goog.getMsg = function (a, b, c) {
  c && c.html && (a = a.replace(/</g, "&lt;"));
  b && (a = a.replace(/\{\$([^}]+)}/g, function (a, c) {
    return null != b && c in b ? b[c] : a;
  }));
  return a;
};
goog.getMsgWithFallback = function (a, b) {
  return a;
};
goog.exportSymbol = function (a, b, c) {
  goog.exportPath_(a, b, c);
};
goog.exportProperty = function (a, b, c) {
  a[b] = c;
};
goog.inherits = function (a, b) {
  function c() {}
  c.prototype = b.prototype;
  a.superClass_ = b.prototype;
  a.prototype = new c();
  a.prototype.constructor = a;
  a.base = function (a, c, f) {
    for (var d = Array(arguments.length - 2), e = 2; e < arguments.length; e++) d[e - 2] = arguments[e];
    return b.prototype[c].apply(a, d);
  };
};
goog.base = function (a, b, c) {
  var d = arguments.callee.caller;
  if (goog.STRICT_MODE_COMPATIBLE || goog.DEBUG && !d) throw Error("arguments.caller not defined.  goog.base() cannot be used with strict mode code. See http://www.ecma-international.org/ecma-262/5.1/#sec-C");
  if ("undefined" !== typeof d.superClass_) {
    for (var e = Array(arguments.length - 1), f = 1; f < arguments.length; f++) e[f - 1] = arguments[f];
    return d.superClass_.constructor.apply(a, e);
  }
  if ("string" != typeof b && "symbol" != typeof b) throw Error("method names provided to goog.base must be a string or a symbol");
  e = Array(arguments.length - 2);
  for (f = 2; f < arguments.length; f++) e[f - 2] = arguments[f];
  f = !1;
  for (var g = a.constructor.prototype; g; g = Object.getPrototypeOf(g)) if (g[b] === d) f = !0;else if (f) return g[b].apply(a, e);
  if (a[b] === d) return a.constructor.prototype[b].apply(a, e);
  throw Error("goog.base called from a method of one name to a method of a different name");
};
goog.scope = function (a) {
  if (goog.isInModuleLoader_()) throw Error("goog.scope is not supported within a module.");
  a.call(goog.global);
};
COMPILED || (goog.global.COMPILED = COMPILED);
goog.defineClass = function (a, b) {
  var c = b.constructor,
    d = b.statics;
  c && c != Object.prototype.constructor || (c = function () {
    throw Error("cannot instantiate an interface (no constructor defined).");
  });
  c = goog.defineClass.createSealingConstructor_(c, a);
  a && goog.inherits(c, a);
  delete b.constructor;
  delete b.statics;
  goog.defineClass.applyProperties_(c.prototype, b);
  null != d && (d instanceof Function ? d(c) : goog.defineClass.applyProperties_(c, d));
  return c;
};
goog.defineClass.SEAL_CLASS_INSTANCES = goog.DEBUG;
goog.defineClass.createSealingConstructor_ = function (a, b) {
  if (!goog.defineClass.SEAL_CLASS_INSTANCES) return a;
  var c = !goog.defineClass.isUnsealable_(b),
    d = function () {
      var b = a.apply(this, arguments) || this;
      b[goog.UID_PROPERTY_] = b[goog.UID_PROPERTY_];
      this.constructor === d && c && Object.seal instanceof Function && Object.seal(b);
      return b;
    };
  return d;
};
goog.defineClass.isUnsealable_ = function (a) {
  return a && a.prototype && a.prototype[goog.UNSEALABLE_CONSTRUCTOR_PROPERTY_];
};
goog.defineClass.OBJECT_PROTOTYPE_FIELDS_ = "constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
goog.defineClass.applyProperties_ = function (a, b) {
  for (var c in b) Object.prototype.hasOwnProperty.call(b, c) && (a[c] = b[c]);
  for (var d = 0; d < goog.defineClass.OBJECT_PROTOTYPE_FIELDS_.length; d++) c = goog.defineClass.OBJECT_PROTOTYPE_FIELDS_[d], Object.prototype.hasOwnProperty.call(b, c) && (a[c] = b[c]);
};
goog.tagUnsealableClass = function (a) {
  !COMPILED && goog.defineClass.SEAL_CLASS_INSTANCES && (a.prototype[goog.UNSEALABLE_CONSTRUCTOR_PROPERTY_] = !0);
};
goog.UNSEALABLE_CONSTRUCTOR_PROPERTY_ = "goog_defineClass_legacy_unsealable";
!COMPILED && goog.DEPENDENCIES_ENABLED && (goog.inHtmlDocument_ = function () {
  var a = goog.global.document;
  return null != a && "write" in a;
}, goog.isDocumentLoading_ = function () {
  var a = goog.global.document;
  return a.attachEvent ? "complete" != a.readyState : "loading" == a.readyState;
}, goog.findBasePath_ = function () {
  if (goog.isDef(goog.global.CLOSURE_BASE_PATH) && goog.isString(goog.global.CLOSURE_BASE_PATH)) goog.basePath = goog.global.CLOSURE_BASE_PATH;else if (goog.inHtmlDocument_()) {
    var a = goog.global.document,
      b = a.currentScript;
    a = b ? [b] : a.getElementsByTagName("SCRIPT");
    for (b = a.length - 1; 0 <= b; --b) {
      var c = a[b].src,
        d = c.lastIndexOf("?");
      d = -1 == d ? c.length : d;
      if ("base.js" == c.substr(d - 7, 7)) {
        goog.basePath = c.substr(0, d - 7);
        break;
      }
    }
  }
}, goog.findBasePath_(), goog.Transpiler = function () {
  this.requiresTranspilation_ = null;
  this.transpilationTarget_ = goog.TRANSPILE_TO_LANGUAGE;
}, goog.Transpiler.prototype.createRequiresTranspilation_ = function () {
  function a(a, b) {
    e ? d[a] = !0 : b() ? (c = a, d[a] = !1) : e = d[a] = !0;
  }
  function b(a) {
    try {
      return !!eval(a);
    } catch (h) {
      return !1;
    }
  }
  var c = "es3",
    d = {
      es3: !1
    },
    e = !1,
    f = goog.global.navigator && goog.global.navigator.userAgent ? goog.global.navigator.userAgent : "";
  a("es5", function () {
    return b("[1,].length==1");
  });
  a("es6", function () {
    return f.match(/Edge\/(\d+)(\.\d)*/i) ? !1 : b('(()=>{"use strict";class X{constructor(){if(new.target!=String)throw 1;this.x=42}}let q=Reflect.construct(X,[],String);if(q.x!=42||!(q instanceof String))throw 1;for(const a of[2,3]){if(a==2)continue;function f(z={a}){let a=0;return z.a}{function f(){return 0;}}return f()==3}})()');
  });
  a("es7", function () {
    return b("2 ** 2 == 4");
  });
  a("es8", function () {
    return b("async () => 1, true");
  });
  a("es9", function () {
    return b("({...rest} = {}), true");
  });
  a("es_next", function () {
    return !1;
  });
  return {
    target: c,
    map: d
  };
}, goog.Transpiler.prototype.needsTranspile = function (a, b) {
  if ("always" == goog.TRANSPILE) return !0;
  if ("never" == goog.TRANSPILE) return !1;
  if (!this.requiresTranspilation_) {
    var c = this.createRequiresTranspilation_();
    this.requiresTranspilation_ = c.map;
    this.transpilationTarget_ = this.transpilationTarget_ || c.target;
  }
  if (a in this.requiresTranspilation_) return this.requiresTranspilation_[a] ? !0 : !goog.inHtmlDocument_() || "es6" != b || "noModule" in goog.global.document.createElement("script") ? !1 : !0;
  throw Error("Unknown language mode: " + a);
}, goog.Transpiler.prototype.transpile = function (a, b) {
  return goog.transpile_(a, b, this.transpilationTarget_);
}, goog.transpiler_ = new goog.Transpiler(), goog.protectScriptTag_ = function (a) {
  return a.replace(/<\/(SCRIPT)/ig, "\\x3c/$1");
}, goog.DebugLoader_ = function () {
  this.dependencies_ = {};
  this.idToPath_ = {};
  this.written_ = {};
  this.loadingDeps_ = [];
  this.depsToLoad_ = [];
  this.paused_ = !1;
  this.factory_ = new goog.DependencyFactory(goog.transpiler_);
  this.deferredCallbacks_ = {};
  this.deferredQueue_ = [];
}, goog.DebugLoader_.prototype.bootstrap = function (a, b) {
  function c() {
    d && (goog.global.setTimeout(d, 0), d = null);
  }
  var d = b;
  if (a.length) {
    b = [];
    for (var e = 0; e < a.length; e++) {
      var f = this.getPathFromDeps_(a[e]);
      if (!f) throw Error("Unregonized namespace: " + a[e]);
      b.push(this.dependencies_[f]);
    }
    f = goog.require;
    var g = 0;
    for (e = 0; e < a.length; e++) f(a[e]), b[e].onLoad(function () {
      ++g == a.length && c();
    });
  } else c();
}, goog.DebugLoader_.prototype.loadClosureDeps = function () {
  this.depsToLoad_.push(this.factory_.createDependency(goog.normalizePath_(goog.basePath + "deps.js"), "deps.js", [], [], {}, !1));
  this.loadDeps_();
}, goog.DebugLoader_.prototype.requested = function (a, b) {
  (a = this.getPathFromDeps_(a)) && (b || this.areDepsLoaded_(this.dependencies_[a].requires)) && (b = this.deferredCallbacks_[a]) && (delete this.deferredCallbacks_[a], b());
}, goog.DebugLoader_.prototype.setDependencyFactory = function (a) {
  this.factory_ = a;
}, goog.DebugLoader_.prototype.load_ = function (a) {
  if (this.getPathFromDeps_(a)) {
    var b = this,
      c = [],
      d = function (a) {
        var e = b.getPathFromDeps_(a);
        if (!e) throw Error("Bad dependency path or symbol: " + a);
        if (!b.written_[e]) {
          b.written_[e] = !0;
          a = b.dependencies_[e];
          for (e = 0; e < a.requires.length; e++) goog.isProvided_(a.requires[e]) || d(a.requires[e]);
          c.push(a);
        }
      };
    d(a);
    a = !!this.depsToLoad_.length;
    this.depsToLoad_ = this.depsToLoad_.concat(c);
    this.paused_ || a || this.loadDeps_();
  } else throw a = "goog.require could not find: " + a, goog.logToConsole_(a), Error(a);
}, goog.DebugLoader_.prototype.loadDeps_ = function () {
  for (var a = this, b = this.paused_; this.depsToLoad_.length && !b;) (function () {
    var c = !1,
      d = a.depsToLoad_.shift(),
      e = !1;
    a.loading_(d);
    var f = {
      pause: function () {
        if (c) throw Error("Cannot call pause after the call to load.");
        b = !0;
      },
      resume: function () {
        c ? a.resume_() : b = !1;
      },
      loaded: function () {
        if (e) throw Error("Double call to loaded.");
        e = !0;
        a.loaded_(d);
      },
      pending: function () {
        for (var b = [], c = 0; c < a.loadingDeps_.length; c++) b.push(a.loadingDeps_[c]);
        return b;
      },
      setModuleState: function (a) {
        goog.moduleLoaderState_ = {
          type: a,
          moduleName: "",
          declareLegacyNamespace: !1
        };
      },
      registerEs6ModuleExports: function (a, b, c) {
        c && (goog.loadedModules_[c] = {
          exports: b,
          type: goog.ModuleType.ES6,
          moduleId: c || ""
        });
      },
      registerGoogModuleExports: function (a, b) {
        goog.loadedModules_[a] = {
          exports: b,
          type: goog.ModuleType.GOOG,
          moduleId: a
        };
      },
      clearModuleState: function () {
        goog.moduleLoaderState_ = null;
      },
      defer: function (b) {
        if (c) throw Error("Cannot register with defer after the call to load.");
        a.defer_(d, b);
      },
      areDepsLoaded: function () {
        return a.areDepsLoaded_(d.requires);
      }
    };
    try {
      d.load(f);
    } finally {
      c = !0;
    }
  })();
  b && this.pause_();
}, goog.DebugLoader_.prototype.pause_ = function () {
  this.paused_ = !0;
}, goog.DebugLoader_.prototype.resume_ = function () {
  this.paused_ && (this.paused_ = !1, this.loadDeps_());
}, goog.DebugLoader_.prototype.loading_ = function (a) {
  this.loadingDeps_.push(a);
}, goog.DebugLoader_.prototype.loaded_ = function (a) {
  for (var b = 0; b < this.loadingDeps_.length; b++) if (this.loadingDeps_[b] == a) {
    this.loadingDeps_.splice(b, 1);
    break;
  }
  for (b = 0; b < this.deferredQueue_.length; b++) if (this.deferredQueue_[b] == a.path) {
    this.deferredQueue_.splice(b, 1);
    break;
  }
  if (this.loadingDeps_.length == this.deferredQueue_.length && !this.depsToLoad_.length) for (; this.deferredQueue_.length;) this.requested(this.deferredQueue_.shift(), !0);
  a.loaded();
}, goog.DebugLoader_.prototype.areDepsLoaded_ = function (a) {
  for (var b = 0; b < a.length; b++) {
    var c = this.getPathFromDeps_(a[b]);
    if (!c || !(c in this.deferredCallbacks_ || goog.isProvided_(a[b]))) return !1;
  }
  return !0;
}, goog.DebugLoader_.prototype.getPathFromDeps_ = function (a) {
  return a in this.idToPath_ ? this.idToPath_[a] : a in this.dependencies_ ? a : null;
}, goog.DebugLoader_.prototype.defer_ = function (a, b) {
  this.deferredCallbacks_[a.path] = b;
  this.deferredQueue_.push(a.path);
}, goog.LoadController = function () {}, goog.LoadController.prototype.pause = function () {}, goog.LoadController.prototype.resume = function () {}, goog.LoadController.prototype.loaded = function () {}, goog.LoadController.prototype.pending = function () {}, goog.LoadController.prototype.registerEs6ModuleExports = function (a, b, c) {}, goog.LoadController.prototype.setModuleState = function (a) {}, goog.LoadController.prototype.clearModuleState = function () {}, goog.LoadController.prototype.defer = function (a) {}, goog.LoadController.prototype.areDepsLoaded = function () {}, goog.Dependency = function (a, b, c, d, e) {
  this.path = a;
  this.relativePath = b;
  this.provides = c;
  this.requires = d;
  this.loadFlags = e;
  this.loaded_ = !1;
  this.loadCallbacks_ = [];
}, goog.Dependency.prototype.getPathName = function () {
  var a = this.path,
    b = a.indexOf("://");
  0 <= b && (a = a.substring(b + 3), b = a.indexOf("/"), 0 <= b && (a = a.substring(b + 1)));
  return a;
}, goog.Dependency.prototype.onLoad = function (a) {
  this.loaded_ ? a() : this.loadCallbacks_.push(a);
}, goog.Dependency.prototype.loaded = function () {
  this.loaded_ = !0;
  var a = this.loadCallbacks_;
  this.loadCallbacks_ = [];
  for (var b = 0; b < a.length; b++) a[b]();
}, goog.Dependency.defer_ = !1, goog.Dependency.callbackMap_ = {}, goog.Dependency.registerCallback_ = function (a) {
  var b = Math.random().toString(32);
  goog.Dependency.callbackMap_[b] = a;
  return b;
}, goog.Dependency.unregisterCallback_ = function (a) {
  delete goog.Dependency.callbackMap_[a];
}, goog.Dependency.callback_ = function (a, b) {
  if (a in goog.Dependency.callbackMap_) {
    for (var c = goog.Dependency.callbackMap_[a], d = [], e = 1; e < arguments.length; e++) d.push(arguments[e]);
    c.apply(void 0, d);
  } else throw Error("Callback key " + a + " does not exist (was base.js loaded more than once?).");
}, goog.Dependency.prototype.load = function (a) {
  if (goog.global.CLOSURE_IMPORT_SCRIPT) goog.global.CLOSURE_IMPORT_SCRIPT(this.path) ? a.loaded() : a.pause();else if (goog.inHtmlDocument_()) {
    var b = goog.global.document;
    if ("complete" == b.readyState && !goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING) {
      if (/\bdeps.js$/.test(this.path)) {
        a.loaded();
        return;
      }
      throw Error('Cannot write "' + this.path + '" after document load');
    }
    if (!goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING && goog.isDocumentLoading_()) {
      var c = goog.Dependency.registerCallback_(function (b) {
          goog.DebugLoader_.IS_OLD_IE_ && "complete" != b.readyState || (goog.Dependency.unregisterCallback_(c), a.loaded());
        }),
        d = !goog.DebugLoader_.IS_OLD_IE_ && goog.getScriptNonce() ? ' nonce="' + goog.getScriptNonce() + '"' : "";
      d = '<script src="' + this.path + '" ' + (goog.DebugLoader_.IS_OLD_IE_ ? "onreadystatechange" : "onload") + "=\"goog.Dependency.callback_('" + c + '\', this)" type="text/javascript" ' + (goog.Dependency.defer_ ? "defer" : "") + d + ">\x3c/script>";
      b.write(goog.TRUSTED_TYPES_POLICY_ ? goog.TRUSTED_TYPES_POLICY_.createHTML(d) : d);
    } else {
      var e = b.createElement("script");
      e.defer = goog.Dependency.defer_;
      e.async = !1;
      e.type = "text/javascript";
      (d = goog.getScriptNonce()) && e.setAttribute("nonce", d);
      goog.DebugLoader_.IS_OLD_IE_ ? (a.pause(), e.onreadystatechange = function () {
        if ("loaded" == e.readyState || "complete" == e.readyState) a.loaded(), a.resume();
      }) : e.onload = function () {
        e.onload = null;
        a.loaded();
      };
      e.src = goog.TRUSTED_TYPES_POLICY_ ? goog.TRUSTED_TYPES_POLICY_.createScriptURL(this.path) : this.path;
      b.head.appendChild(e);
    }
  } else goog.logToConsole_("Cannot use default debug loader outside of HTML documents."), "deps.js" == this.relativePath ? (goog.logToConsole_("Consider setting CLOSURE_IMPORT_SCRIPT before loading base.js, or setting CLOSURE_NO_DEPS to true."), a.loaded()) : a.pause();
}, goog.Es6ModuleDependency = function (a, b, c, d, e) {
  goog.Dependency.call(this, a, b, c, d, e);
}, goog.inherits(goog.Es6ModuleDependency, goog.Dependency), goog.Es6ModuleDependency.prototype.load = function (a) {
  function b(a, b) {
    a = b ? '<script type="module" crossorigin>' + b + "\x3c/script>" : '<script type="module" crossorigin src="' + a + '">\x3c/script>';
    d.write(goog.TRUSTED_TYPES_POLICY_ ? goog.TRUSTED_TYPES_POLICY_.createHTML(a) : a);
  }
  function c(a, b) {
    var c = d.createElement("script");
    c.defer = !0;
    c.async = !1;
    c.type = "module";
    c.setAttribute("crossorigin", !0);
    var e = goog.getScriptNonce();
    e && c.setAttribute("nonce", e);
    b ? c.textContent = goog.TRUSTED_TYPES_POLICY_ ? goog.TRUSTED_TYPES_POLICY_.createScript(b) : b : c.src = goog.TRUSTED_TYPES_POLICY_ ? goog.TRUSTED_TYPES_POLICY_.createScriptURL(a) : a;
    d.head.appendChild(c);
  }
  if (goog.global.CLOSURE_IMPORT_SCRIPT) goog.global.CLOSURE_IMPORT_SCRIPT(this.path) ? a.loaded() : a.pause();else if (goog.inHtmlDocument_()) {
    var d = goog.global.document,
      e = this;
    if (goog.isDocumentLoading_()) {
      var f = b;
      goog.Dependency.defer_ = !0;
    } else f = c;
    var g = goog.Dependency.registerCallback_(function () {
      goog.Dependency.unregisterCallback_(g);
      a.setModuleState(goog.ModuleType.ES6);
    });
    f(void 0, 'goog.Dependency.callback_("' + g + '")');
    f(this.path, void 0);
    var h = goog.Dependency.registerCallback_(function (b) {
      goog.Dependency.unregisterCallback_(h);
      a.registerEs6ModuleExports(e.path, b, goog.moduleLoaderState_.moduleName);
    });
    f(void 0, 'import * as m from "' + this.path + '"; goog.Dependency.callback_("' + h + '", m)');
    var k = goog.Dependency.registerCallback_(function () {
      goog.Dependency.unregisterCallback_(k);
      a.clearModuleState();
      a.loaded();
    });
    f(void 0, 'goog.Dependency.callback_("' + k + '")');
  } else goog.logToConsole_("Cannot use default debug loader outside of HTML documents."), a.pause();
}, goog.TransformedDependency = function (a, b, c, d, e) {
  goog.Dependency.call(this, a, b, c, d, e);
  this.contents_ = null;
  this.lazyFetch_ = !goog.inHtmlDocument_() || !("noModule" in goog.global.document.createElement("script"));
}, goog.inherits(goog.TransformedDependency, goog.Dependency), goog.TransformedDependency.prototype.load = function (a) {
  function b() {
    e.contents_ = goog.loadFileSync_(e.path);
    e.contents_ && (e.contents_ = e.transform(e.contents_), e.contents_ && (e.contents_ += "\n//# sourceURL=" + e.path));
  }
  function c() {
    e.lazyFetch_ && b();
    if (e.contents_) {
      f && a.setModuleState(goog.ModuleType.ES6);
      try {
        var c = e.contents_;
        e.contents_ = null;
        goog.globalEval(c);
        if (f) var d = goog.moduleLoaderState_.moduleName;
      } finally {
        f && a.clearModuleState();
      }
      f && goog.global.$jscomp.require.ensure([e.getPathName()], function () {
        a.registerEs6ModuleExports(e.path, goog.global.$jscomp.require(e.getPathName()), d);
      });
      a.loaded();
    }
  }
  function d() {
    var a = goog.global.document,
      b = goog.Dependency.registerCallback_(function () {
        goog.Dependency.unregisterCallback_(b);
        c();
      }),
      d = '<script type="text/javascript">' + goog.protectScriptTag_('goog.Dependency.callback_("' + b + '");') + "\x3c/script>";
    a.write(goog.TRUSTED_TYPES_POLICY_ ? goog.TRUSTED_TYPES_POLICY_.createHTML(d) : d);
  }
  var e = this;
  if (goog.global.CLOSURE_IMPORT_SCRIPT) b(), this.contents_ && goog.global.CLOSURE_IMPORT_SCRIPT("", this.contents_) ? (this.contents_ = null, a.loaded()) : a.pause();else {
    var f = this.loadFlags.module == goog.ModuleType.ES6;
    this.lazyFetch_ || b();
    var g = 1 < a.pending().length,
      h = g && goog.DebugLoader_.IS_OLD_IE_;
    g = goog.Dependency.defer_ && (g || goog.isDocumentLoading_());
    if (h || g) a.defer(function () {
      c();
    });else {
      var k = goog.global.document;
      h = goog.inHtmlDocument_() && "ActiveXObject" in goog.global;
      if (f && goog.inHtmlDocument_() && goog.isDocumentLoading_() && !h) {
        goog.Dependency.defer_ = !0;
        a.pause();
        var l = k.onreadystatechange;
        k.onreadystatechange = function () {
          "interactive" == k.readyState && (k.onreadystatechange = l, c(), a.resume());
          goog.isFunction(l) && l.apply(void 0, arguments);
        };
      } else !goog.DebugLoader_.IS_OLD_IE_ && goog.inHtmlDocument_() && goog.isDocumentLoading_() ? d() : c();
    }
  }
}, goog.TransformedDependency.prototype.transform = function (a) {}, goog.TranspiledDependency = function (a, b, c, d, e, f) {
  goog.TransformedDependency.call(this, a, b, c, d, e);
  this.transpiler = f;
}, goog.inherits(goog.TranspiledDependency, goog.TransformedDependency), goog.TranspiledDependency.prototype.transform = function (a) {
  return this.transpiler.transpile(a, this.getPathName());
}, goog.PreTranspiledEs6ModuleDependency = function (a, b, c, d, e) {
  goog.TransformedDependency.call(this, a, b, c, d, e);
}, goog.inherits(goog.PreTranspiledEs6ModuleDependency, goog.TransformedDependency), goog.PreTranspiledEs6ModuleDependency.prototype.transform = function (a) {
  return a;
}, goog.GoogModuleDependency = function (a, b, c, d, e, f, g) {
  goog.TransformedDependency.call(this, a, b, c, d, e);
  this.needsTranspile_ = f;
  this.transpiler_ = g;
}, goog.inherits(goog.GoogModuleDependency, goog.TransformedDependency), goog.GoogModuleDependency.prototype.transform = function (a) {
  this.needsTranspile_ && (a = this.transpiler_.transpile(a, this.getPathName()));
  return goog.LOAD_MODULE_USING_EVAL && goog.isDef(goog.global.JSON) ? "goog.loadModule(" + goog.global.JSON.stringify(a + "\n//# sourceURL=" + this.path + "\n") + ");" : 'goog.loadModule(function(exports) {"use strict";' + a + "\n;return exports});\n//# sourceURL=" + this.path + "\n";
}, goog.DebugLoader_.IS_OLD_IE_ = !(goog.global.atob || !goog.global.document || !goog.global.document.all), goog.DebugLoader_.prototype.addDependency = function (a, b, c, d) {
  b = b || [];
  a = a.replace(/\\/g, "/");
  var e = goog.normalizePath_(goog.basePath + a);
  d && "boolean" !== typeof d || (d = d ? {
    module: goog.ModuleType.GOOG
  } : {});
  c = this.factory_.createDependency(e, a, b, c, d, goog.transpiler_.needsTranspile(d.lang || "es3", d.module));
  this.dependencies_[e] = c;
  for (c = 0; c < b.length; c++) this.idToPath_[b[c]] = e;
  this.idToPath_[a] = e;
}, goog.DependencyFactory = function (a) {
  this.transpiler = a;
}, goog.DependencyFactory.prototype.createDependency = function (a, b, c, d, e, f) {
  return e.module == goog.ModuleType.GOOG ? new goog.GoogModuleDependency(a, b, c, d, e, f, this.transpiler) : f ? new goog.TranspiledDependency(a, b, c, d, e, this.transpiler) : e.module == goog.ModuleType.ES6 ? "never" == goog.TRANSPILE && goog.ASSUME_ES_MODULES_TRANSPILED ? new goog.PreTranspiledEs6ModuleDependency(a, b, c, d, e) : new goog.Es6ModuleDependency(a, b, c, d, e) : new goog.Dependency(a, b, c, d, e);
}, goog.debugLoader_ = new goog.DebugLoader_(), goog.loadClosureDeps = function () {
  goog.debugLoader_.loadClosureDeps();
}, goog.setDependencyFactory = function (a) {
  goog.debugLoader_.setDependencyFactory(a);
}, goog.global.CLOSURE_NO_DEPS || goog.debugLoader_.loadClosureDeps(), goog.bootstrap = function (a, b) {
  goog.debugLoader_.bootstrap(a, b);
});
goog.TRUSTED_TYPES_POLICY_NAME = "";
goog.identity_ = function (a) {
  return a;
};
goog.createTrustedTypesPolicy = function (a) {
  var b = null;
  if ("undefined" === typeof TrustedTypes || !TrustedTypes.createPolicy) return b;
  try {
    b = TrustedTypes.createPolicy(a, {
      createHTML: goog.identity_,
      createScript: goog.identity_,
      createScriptURL: goog.identity_,
      createURL: goog.identity_
    });
  } catch (c) {
    goog.logToConsole_(c.message);
  }
  return b;
};
goog.TRUSTED_TYPES_POLICY_ = goog.TRUSTED_TYPES_POLICY_NAME ? goog.createTrustedTypesPolicy(goog.TRUSTED_TYPES_POLICY_NAME + "#base") : null;
var jspb = {
  BinaryConstants: {},
  ConstBinaryMessage: function () {},
  BinaryMessage: function () {}
};
jspb.BinaryConstants.FieldType = {
  INVALID: -1,
  DOUBLE: 1,
  FLOAT: 2,
  INT64: 3,
  UINT64: 4,
  INT32: 5,
  FIXED64: 6,
  FIXED32: 7,
  BOOL: 8,
  STRING: 9,
  GROUP: 10,
  MESSAGE: 11,
  BYTES: 12,
  UINT32: 13,
  ENUM: 14,
  SFIXED32: 15,
  SFIXED64: 16,
  SINT32: 17,
  SINT64: 18,
  FHASH64: 30,
  VHASH64: 31
};
jspb.BinaryConstants.WireType = {
  INVALID: -1,
  VARINT: 0,
  FIXED64: 1,
  DELIMITED: 2,
  START_GROUP: 3,
  END_GROUP: 4,
  FIXED32: 5
};
jspb.BinaryConstants.FieldTypeToWireType = function (a) {
  var b = jspb.BinaryConstants.FieldType,
    c = jspb.BinaryConstants.WireType;
  switch (a) {
    case b.INT32:
    case b.INT64:
    case b.UINT32:
    case b.UINT64:
    case b.SINT32:
    case b.SINT64:
    case b.BOOL:
    case b.ENUM:
    case b.VHASH64:
      return c.VARINT;
    case b.DOUBLE:
    case b.FIXED64:
    case b.SFIXED64:
    case b.FHASH64:
      return c.FIXED64;
    case b.STRING:
    case b.MESSAGE:
    case b.BYTES:
      return c.DELIMITED;
    case b.FLOAT:
    case b.FIXED32:
    case b.SFIXED32:
      return c.FIXED32;
    default:
      return c.INVALID;
  }
};
jspb.BinaryConstants.INVALID_FIELD_NUMBER = -1;
jspb.BinaryConstants.FLOAT32_EPS = 1.401298464324817E-45;
jspb.BinaryConstants.FLOAT32_MIN = 1.1754943508222875E-38;
jspb.BinaryConstants.FLOAT32_MAX = 3.4028234663852886E38;
jspb.BinaryConstants.FLOAT64_EPS = 4.9E-324;
jspb.BinaryConstants.FLOAT64_MIN = 2.2250738585072014E-308;
jspb.BinaryConstants.FLOAT64_MAX = 1.7976931348623157E308;
jspb.BinaryConstants.TWO_TO_20 = 1048576;
jspb.BinaryConstants.TWO_TO_23 = 8388608;
jspb.BinaryConstants.TWO_TO_31 = 2147483648;
jspb.BinaryConstants.TWO_TO_32 = 4294967296;
jspb.BinaryConstants.TWO_TO_52 = 4503599627370496;
jspb.BinaryConstants.TWO_TO_63 = 0x7fffffffffffffff;
jspb.BinaryConstants.TWO_TO_64 = 1.8446744073709552E19;
jspb.BinaryConstants.ZERO_HASH = "\x00\x00\x00\x00\x00\x00\x00\x00";
goog.dom = {};
goog.dom.NodeType = {
  ELEMENT: 1,
  ATTRIBUTE: 2,
  TEXT: 3,
  CDATA_SECTION: 4,
  ENTITY_REFERENCE: 5,
  ENTITY: 6,
  PROCESSING_INSTRUCTION: 7,
  COMMENT: 8,
  DOCUMENT: 9,
  DOCUMENT_TYPE: 10,
  DOCUMENT_FRAGMENT: 11,
  NOTATION: 12
};
goog.debug = {};
goog.debug.Error = function (a) {
  if (Error.captureStackTrace) Error.captureStackTrace(this, goog.debug.Error);else {
    var b = Error().stack;
    b && (this.stack = b);
  }
  a && (this.message = String(a));
  this.reportErrorToServer = !0;
};
goog.inherits(goog.debug.Error, Error);
goog.debug.Error.prototype.name = "CustomError";
goog.asserts = {};
goog.asserts.ENABLE_ASSERTS = goog.DEBUG;
goog.asserts.AssertionError = function (a, b) {
  goog.debug.Error.call(this, goog.asserts.subs_(a, b));
  this.messagePattern = a;
};
goog.inherits(goog.asserts.AssertionError, goog.debug.Error);
goog.asserts.AssertionError.prototype.name = "AssertionError";
goog.asserts.DEFAULT_ERROR_HANDLER = function (a) {
  throw a;
};
goog.asserts.errorHandler_ = goog.asserts.DEFAULT_ERROR_HANDLER;
goog.asserts.subs_ = function (a, b) {
  a = a.split("%s");
  for (var c = "", d = a.length - 1, e = 0; e < d; e++) c += a[e] + (e < b.length ? b[e] : "%s");
  return c + a[d];
};
goog.asserts.doAssertFailure_ = function (a, b, c, d) {
  var e = "Assertion failed";
  if (c) {
    e += ": " + c;
    var f = d;
  } else a && (e += ": " + a, f = b);
  a = new goog.asserts.AssertionError("" + e, f || []);
  goog.asserts.errorHandler_(a);
};
goog.asserts.setErrorHandler = function (a) {
  goog.asserts.ENABLE_ASSERTS && (goog.asserts.errorHandler_ = a);
};
goog.asserts.assert = function (a, b, c) {
  goog.asserts.ENABLE_ASSERTS && !a && goog.asserts.doAssertFailure_("", null, b, Array.prototype.slice.call(arguments, 2));
  return a;
};
goog.asserts.assertExists = function (a, b, c) {
  goog.asserts.ENABLE_ASSERTS && null == a && goog.asserts.doAssertFailure_("Expected to exist: %s.", [a], b, Array.prototype.slice.call(arguments, 2));
  return a;
};
goog.asserts.fail = function (a, b) {
  goog.asserts.ENABLE_ASSERTS && goog.asserts.errorHandler_(new goog.asserts.AssertionError("Failure" + (a ? ": " + a : ""), Array.prototype.slice.call(arguments, 1)));
};
goog.asserts.assertNumber = function (a, b, c) {
  goog.asserts.ENABLE_ASSERTS && !goog.isNumber(a) && goog.asserts.doAssertFailure_("Expected number but got %s: %s.", [goog.typeOf(a), a], b, Array.prototype.slice.call(arguments, 2));
  return a;
};
goog.asserts.assertString = function (a, b, c) {
  goog.asserts.ENABLE_ASSERTS && !goog.isString(a) && goog.asserts.doAssertFailure_("Expected string but got %s: %s.", [goog.typeOf(a), a], b, Array.prototype.slice.call(arguments, 2));
  return a;
};
goog.asserts.assertFunction = function (a, b, c) {
  goog.asserts.ENABLE_ASSERTS && !goog.isFunction(a) && goog.asserts.doAssertFailure_("Expected function but got %s: %s.", [goog.typeOf(a), a], b, Array.prototype.slice.call(arguments, 2));
  return a;
};
goog.asserts.assertObject = function (a, b, c) {
  goog.asserts.ENABLE_ASSERTS && !goog.isObject(a) && goog.asserts.doAssertFailure_("Expected object but got %s: %s.", [goog.typeOf(a), a], b, Array.prototype.slice.call(arguments, 2));
  return a;
};
goog.asserts.assertArray = function (a, b, c) {
  goog.asserts.ENABLE_ASSERTS && !goog.isArray(a) && goog.asserts.doAssertFailure_("Expected array but got %s: %s.", [goog.typeOf(a), a], b, Array.prototype.slice.call(arguments, 2));
  return a;
};
goog.asserts.assertBoolean = function (a, b, c) {
  goog.asserts.ENABLE_ASSERTS && !goog.isBoolean(a) && goog.asserts.doAssertFailure_("Expected boolean but got %s: %s.", [goog.typeOf(a), a], b, Array.prototype.slice.call(arguments, 2));
  return a;
};
goog.asserts.assertElement = function (a, b, c) {
  !goog.asserts.ENABLE_ASSERTS || goog.isObject(a) && a.nodeType == goog.dom.NodeType.ELEMENT || goog.asserts.doAssertFailure_("Expected Element but got %s: %s.", [goog.typeOf(a), a], b, Array.prototype.slice.call(arguments, 2));
  return a;
};
goog.asserts.assertInstanceof = function (a, b, c, d) {
  !goog.asserts.ENABLE_ASSERTS || a instanceof b || goog.asserts.doAssertFailure_("Expected instanceof %s but got %s.", [goog.asserts.getType_(b), goog.asserts.getType_(a)], c, Array.prototype.slice.call(arguments, 3));
  return a;
};
goog.asserts.assertFinite = function (a, b, c) {
  !goog.asserts.ENABLE_ASSERTS || "number" == typeof a && isFinite(a) || goog.asserts.doAssertFailure_("Expected %s to be a finite number but it is not.", [a], b, Array.prototype.slice.call(arguments, 2));
  return a;
};
goog.asserts.assertObjectPrototypeIsIntact = function () {
  for (var a in Object.prototype) goog.asserts.fail(a + " should not be enumerable in Object.prototype.");
};
goog.asserts.getType_ = function (a) {
  return a instanceof Function ? a.displayName || a.name || "unknown type name" : a instanceof Object ? a.constructor.displayName || a.constructor.name || Object.prototype.toString.call(a) : null === a ? "null" : typeof a;
};
goog.array = {};
goog.NATIVE_ARRAY_PROTOTYPES = goog.TRUSTED_SITE;
goog.array.ASSUME_NATIVE_FUNCTIONS = 2012 < goog.FEATURESET_YEAR;
goog.array.peek = function (a) {
  return a[a.length - 1];
};
goog.array.last = goog.array.peek;
goog.array.indexOf = goog.NATIVE_ARRAY_PROTOTYPES && (goog.array.ASSUME_NATIVE_FUNCTIONS || Array.prototype.indexOf) ? function (a, b, c) {
  goog.asserts.assert(null != a.length);
  return Array.prototype.indexOf.call(a, b, c);
} : function (a, b, c) {
  c = null == c ? 0 : 0 > c ? Math.max(0, a.length + c) : c;
  if (goog.isString(a)) return goog.isString(b) && 1 == b.length ? a.indexOf(b, c) : -1;
  for (; c < a.length; c++) if (c in a && a[c] === b) return c;
  return -1;
};
goog.array.lastIndexOf = goog.NATIVE_ARRAY_PROTOTYPES && (goog.array.ASSUME_NATIVE_FUNCTIONS || Array.prototype.lastIndexOf) ? function (a, b, c) {
  goog.asserts.assert(null != a.length);
  return Array.prototype.lastIndexOf.call(a, b, null == c ? a.length - 1 : c);
} : function (a, b, c) {
  c = null == c ? a.length - 1 : c;
  0 > c && (c = Math.max(0, a.length + c));
  if (goog.isString(a)) return goog.isString(b) && 1 == b.length ? a.lastIndexOf(b, c) : -1;
  for (; 0 <= c; c--) if (c in a && a[c] === b) return c;
  return -1;
};
goog.array.forEach = goog.NATIVE_ARRAY_PROTOTYPES && (goog.array.ASSUME_NATIVE_FUNCTIONS || Array.prototype.forEach) ? function (a, b, c) {
  goog.asserts.assert(null != a.length);
  Array.prototype.forEach.call(a, b, c);
} : function (a, b, c) {
  for (var d = a.length, e = goog.isString(a) ? a.split("") : a, f = 0; f < d; f++) f in e && b.call(c, e[f], f, a);
};
goog.array.forEachRight = function (a, b, c) {
  var d = a.length,
    e = goog.isString(a) ? a.split("") : a;
  for (--d; 0 <= d; --d) d in e && b.call(c, e[d], d, a);
};
goog.array.filter = goog.NATIVE_ARRAY_PROTOTYPES && (goog.array.ASSUME_NATIVE_FUNCTIONS || Array.prototype.filter) ? function (a, b, c) {
  goog.asserts.assert(null != a.length);
  return Array.prototype.filter.call(a, b, c);
} : function (a, b, c) {
  for (var d = a.length, e = [], f = 0, g = goog.isString(a) ? a.split("") : a, h = 0; h < d; h++) if (h in g) {
    var k = g[h];
    b.call(c, k, h, a) && (e[f++] = k);
  }
  return e;
};
goog.array.map = goog.NATIVE_ARRAY_PROTOTYPES && (goog.array.ASSUME_NATIVE_FUNCTIONS || Array.prototype.map) ? function (a, b, c) {
  goog.asserts.assert(null != a.length);
  return Array.prototype.map.call(a, b, c);
} : function (a, b, c) {
  for (var d = a.length, e = Array(d), f = goog.isString(a) ? a.split("") : a, g = 0; g < d; g++) g in f && (e[g] = b.call(c, f[g], g, a));
  return e;
};
goog.array.reduce = goog.NATIVE_ARRAY_PROTOTYPES && (goog.array.ASSUME_NATIVE_FUNCTIONS || Array.prototype.reduce) ? function (a, b, c, d) {
  goog.asserts.assert(null != a.length);
  d && (b = goog.bind(b, d));
  return Array.prototype.reduce.call(a, b, c);
} : function (a, b, c, d) {
  var e = c;
  goog.array.forEach(a, function (c, g) {
    e = b.call(d, e, c, g, a);
  });
  return e;
};
goog.array.reduceRight = goog.NATIVE_ARRAY_PROTOTYPES && (goog.array.ASSUME_NATIVE_FUNCTIONS || Array.prototype.reduceRight) ? function (a, b, c, d) {
  goog.asserts.assert(null != a.length);
  goog.asserts.assert(null != b);
  d && (b = goog.bind(b, d));
  return Array.prototype.reduceRight.call(a, b, c);
} : function (a, b, c, d) {
  var e = c;
  goog.array.forEachRight(a, function (c, g) {
    e = b.call(d, e, c, g, a);
  });
  return e;
};
goog.array.some = goog.NATIVE_ARRAY_PROTOTYPES && (goog.array.ASSUME_NATIVE_FUNCTIONS || Array.prototype.some) ? function (a, b, c) {
  goog.asserts.assert(null != a.length);
  return Array.prototype.some.call(a, b, c);
} : function (a, b, c) {
  for (var d = a.length, e = goog.isString(a) ? a.split("") : a, f = 0; f < d; f++) if (f in e && b.call(c, e[f], f, a)) return !0;
  return !1;
};
goog.array.every = goog.NATIVE_ARRAY_PROTOTYPES && (goog.array.ASSUME_NATIVE_FUNCTIONS || Array.prototype.every) ? function (a, b, c) {
  goog.asserts.assert(null != a.length);
  return Array.prototype.every.call(a, b, c);
} : function (a, b, c) {
  for (var d = a.length, e = goog.isString(a) ? a.split("") : a, f = 0; f < d; f++) if (f in e && !b.call(c, e[f], f, a)) return !1;
  return !0;
};
goog.array.count = function (a, b, c) {
  var d = 0;
  goog.array.forEach(a, function (a, f, g) {
    b.call(c, a, f, g) && ++d;
  }, c);
  return d;
};
goog.array.find = function (a, b, c) {
  b = goog.array.findIndex(a, b, c);
  return 0 > b ? null : goog.isString(a) ? a.charAt(b) : a[b];
};
goog.array.findIndex = function (a, b, c) {
  for (var d = a.length, e = goog.isString(a) ? a.split("") : a, f = 0; f < d; f++) if (f in e && b.call(c, e[f], f, a)) return f;
  return -1;
};
goog.array.findRight = function (a, b, c) {
  b = goog.array.findIndexRight(a, b, c);
  return 0 > b ? null : goog.isString(a) ? a.charAt(b) : a[b];
};
goog.array.findIndexRight = function (a, b, c) {
  var d = a.length,
    e = goog.isString(a) ? a.split("") : a;
  for (--d; 0 <= d; d--) if (d in e && b.call(c, e[d], d, a)) return d;
  return -1;
};
goog.array.contains = function (a, b) {
  return 0 <= goog.array.indexOf(a, b);
};
goog.array.isEmpty = function (a) {
  return 0 == a.length;
};
goog.array.clear = function (a) {
  if (!goog.isArray(a)) for (var b = a.length - 1; 0 <= b; b--) delete a[b];
  a.length = 0;
};
goog.array.insert = function (a, b) {
  goog.array.contains(a, b) || a.push(b);
};
goog.array.insertAt = function (a, b, c) {
  goog.array.splice(a, c, 0, b);
};
goog.array.insertArrayAt = function (a, b, c) {
  goog.partial(goog.array.splice, a, c, 0).apply(null, b);
};
goog.array.insertBefore = function (a, b, c) {
  var d;
  2 == arguments.length || 0 > (d = goog.array.indexOf(a, c)) ? a.push(b) : goog.array.insertAt(a, b, d);
};
goog.array.remove = function (a, b) {
  b = goog.array.indexOf(a, b);
  var c;
  (c = 0 <= b) && goog.array.removeAt(a, b);
  return c;
};
goog.array.removeLast = function (a, b) {
  b = goog.array.lastIndexOf(a, b);
  return 0 <= b ? (goog.array.removeAt(a, b), !0) : !1;
};
goog.array.removeAt = function (a, b) {
  goog.asserts.assert(null != a.length);
  return 1 == Array.prototype.splice.call(a, b, 1).length;
};
goog.array.removeIf = function (a, b, c) {
  b = goog.array.findIndex(a, b, c);
  return 0 <= b ? (goog.array.removeAt(a, b), !0) : !1;
};
goog.array.removeAllIf = function (a, b, c) {
  var d = 0;
  goog.array.forEachRight(a, function (e, f) {
    b.call(c, e, f, a) && goog.array.removeAt(a, f) && d++;
  });
  return d;
};
goog.array.concat = function (a) {
  return Array.prototype.concat.apply([], arguments);
};
goog.array.join = function (a) {
  return Array.prototype.concat.apply([], arguments);
};
goog.array.toArray = function (a) {
  var b = a.length;
  if (0 < b) {
    for (var c = Array(b), d = 0; d < b; d++) c[d] = a[d];
    return c;
  }
  return [];
};
goog.array.clone = goog.array.toArray;
goog.array.extend = function (a, b) {
  for (var c = 1; c < arguments.length; c++) {
    var d = arguments[c];
    if (goog.isArrayLike(d)) {
      var e = a.length || 0,
        f = d.length || 0;
      a.length = e + f;
      for (var g = 0; g < f; g++) a[e + g] = d[g];
    } else a.push(d);
  }
};
goog.array.splice = function (a, b, c, d) {
  goog.asserts.assert(null != a.length);
  return Array.prototype.splice.apply(a, goog.array.slice(arguments, 1));
};
goog.array.slice = function (a, b, c) {
  goog.asserts.assert(null != a.length);
  return 2 >= arguments.length ? Array.prototype.slice.call(a, b) : Array.prototype.slice.call(a, b, c);
};
goog.array.removeDuplicates = function (a, b, c) {
  b = b || a;
  var d = function (a) {
    return goog.isObject(a) ? "o" + goog.getUid(a) : (typeof a).charAt(0) + a;
  };
  c = c || d;
  d = {};
  for (var e = 0, f = 0; f < a.length;) {
    var g = a[f++],
      h = c(g);
    Object.prototype.hasOwnProperty.call(d, h) || (d[h] = !0, b[e++] = g);
  }
  b.length = e;
};
goog.array.binarySearch = function (a, b, c) {
  return goog.array.binarySearch_(a, c || goog.array.defaultCompare, !1, b);
};
goog.array.binarySelect = function (a, b, c) {
  return goog.array.binarySearch_(a, b, !0, void 0, c);
};
goog.array.binarySearch_ = function (a, b, c, d, e) {
  for (var f = 0, g = a.length, h; f < g;) {
    var k = f + g >> 1;
    var l = c ? b.call(e, a[k], k, a) : b(d, a[k]);
    0 < l ? f = k + 1 : (g = k, h = !l);
  }
  return h ? f : ~f;
};
goog.array.sort = function (a, b) {
  a.sort(b || goog.array.defaultCompare);
};
goog.array.stableSort = function (a, b) {
  for (var c = Array(a.length), d = 0; d < a.length; d++) c[d] = {
    index: d,
    value: a[d]
  };
  var e = b || goog.array.defaultCompare;
  goog.array.sort(c, function (a, b) {
    return e(a.value, b.value) || a.index - b.index;
  });
  for (d = 0; d < a.length; d++) a[d] = c[d].value;
};
goog.array.sortByKey = function (a, b, c) {
  var d = c || goog.array.defaultCompare;
  goog.array.sort(a, function (a, c) {
    return d(b(a), b(c));
  });
};
goog.array.sortObjectsByKey = function (a, b, c) {
  goog.array.sortByKey(a, function (a) {
    return a[b];
  }, c);
};
goog.array.isSorted = function (a, b, c) {
  b = b || goog.array.defaultCompare;
  for (var d = 1; d < a.length; d++) {
    var e = b(a[d - 1], a[d]);
    if (0 < e || 0 == e && c) return !1;
  }
  return !0;
};
goog.array.equals = function (a, b, c) {
  if (!goog.isArrayLike(a) || !goog.isArrayLike(b) || a.length != b.length) return !1;
  var d = a.length;
  c = c || goog.array.defaultCompareEquality;
  for (var e = 0; e < d; e++) if (!c(a[e], b[e])) return !1;
  return !0;
};
goog.array.compare3 = function (a, b, c) {
  c = c || goog.array.defaultCompare;
  for (var d = Math.min(a.length, b.length), e = 0; e < d; e++) {
    var f = c(a[e], b[e]);
    if (0 != f) return f;
  }
  return goog.array.defaultCompare(a.length, b.length);
};
goog.array.defaultCompare = function (a, b) {
  return a > b ? 1 : a < b ? -1 : 0;
};
goog.array.inverseDefaultCompare = function (a, b) {
  return -goog.array.defaultCompare(a, b);
};
goog.array.defaultCompareEquality = function (a, b) {
  return a === b;
};
goog.array.binaryInsert = function (a, b, c) {
  c = goog.array.binarySearch(a, b, c);
  return 0 > c ? (goog.array.insertAt(a, b, -(c + 1)), !0) : !1;
};
goog.array.binaryRemove = function (a, b, c) {
  b = goog.array.binarySearch(a, b, c);
  return 0 <= b ? goog.array.removeAt(a, b) : !1;
};
goog.array.bucket = function (a, b, c) {
  for (var d = {}, e = 0; e < a.length; e++) {
    var f = a[e],
      g = b.call(c, f, e, a);
    goog.isDef(g) && (d[g] || (d[g] = [])).push(f);
  }
  return d;
};
goog.array.toObject = function (a, b, c) {
  var d = {};
  goog.array.forEach(a, function (e, f) {
    d[b.call(c, e, f, a)] = e;
  });
  return d;
};
goog.array.range = function (a, b, c) {
  var d = [],
    e = 0,
    f = a;
  c = c || 1;
  void 0 !== b && (e = a, f = b);
  if (0 > c * (f - e)) return [];
  if (0 < c) for (a = e; a < f; a += c) d.push(a);else for (a = e; a > f; a += c) d.push(a);
  return d;
};
goog.array.repeat = function (a, b) {
  for (var c = [], d = 0; d < b; d++) c[d] = a;
  return c;
};
goog.array.flatten = function (a) {
  for (var b = [], c = 0; c < arguments.length; c++) {
    var d = arguments[c];
    if (goog.isArray(d)) for (var e = 0; e < d.length; e += 8192) {
      var f = goog.array.slice(d, e, e + 8192);
      f = goog.array.flatten.apply(null, f);
      for (var g = 0; g < f.length; g++) b.push(f[g]);
    } else b.push(d);
  }
  return b;
};
goog.array.rotate = function (a, b) {
  goog.asserts.assert(null != a.length);
  a.length && (b %= a.length, 0 < b ? Array.prototype.unshift.apply(a, a.splice(-b, b)) : 0 > b && Array.prototype.push.apply(a, a.splice(0, -b)));
  return a;
};
goog.array.moveItem = function (a, b, c) {
  goog.asserts.assert(0 <= b && b < a.length);
  goog.asserts.assert(0 <= c && c < a.length);
  b = Array.prototype.splice.call(a, b, 1);
  Array.prototype.splice.call(a, c, 0, b[0]);
};
goog.array.zip = function (a) {
  if (!arguments.length) return [];
  for (var b = [], c = arguments[0].length, d = 1; d < arguments.length; d++) arguments[d].length < c && (c = arguments[d].length);
  for (d = 0; d < c; d++) {
    for (var e = [], f = 0; f < arguments.length; f++) e.push(arguments[f][d]);
    b.push(e);
  }
  return b;
};
goog.array.shuffle = function (a, b) {
  b = b || Math.random;
  for (var c = a.length - 1; 0 < c; c--) {
    var d = Math.floor(b() * (c + 1)),
      e = a[c];
    a[c] = a[d];
    a[d] = e;
  }
};
goog.array.copyByIndex = function (a, b) {
  var c = [];
  goog.array.forEach(b, function (b) {
    c.push(a[b]);
  });
  return c;
};
goog.array.concatMap = function (a, b, c) {
  return goog.array.concat.apply([], goog.array.map(a, b, c));
};
goog.crypt = {};
goog.crypt.stringToByteArray = function (a) {
  for (var b = [], c = 0, d = 0; d < a.length; d++) {
    var e = a.charCodeAt(d);
    255 < e && (b[c++] = e & 255, e >>= 8);
    b[c++] = e;
  }
  return b;
};
goog.crypt.byteArrayToString = function (a) {
  if (8192 >= a.length) return String.fromCharCode.apply(null, a);
  for (var b = "", c = 0; c < a.length; c += 8192) {
    var d = goog.array.slice(a, c, c + 8192);
    b += String.fromCharCode.apply(null, d);
  }
  return b;
};
goog.crypt.byteArrayToHex = function (a, b) {
  return goog.array.map(a, function (a) {
    a = a.toString(16);
    return 1 < a.length ? a : "0" + a;
  }).join(b || "");
};
goog.crypt.hexToByteArray = function (a) {
  goog.asserts.assert(0 == a.length % 2, "Key string length must be multiple of 2");
  for (var b = [], c = 0; c < a.length; c += 2) b.push(parseInt(a.substring(c, c + 2), 16));
  return b;
};
goog.crypt.stringToUtf8ByteArray = function (a) {
  for (var b = [], c = 0, d = 0; d < a.length; d++) {
    var e = a.charCodeAt(d);
    128 > e ? b[c++] = e : (2048 > e ? b[c++] = e >> 6 | 192 : (55296 == (e & 64512) && d + 1 < a.length && 56320 == (a.charCodeAt(d + 1) & 64512) ? (e = 65536 + ((e & 1023) << 10) + (a.charCodeAt(++d) & 1023), b[c++] = e >> 18 | 240, b[c++] = e >> 12 & 63 | 128) : b[c++] = e >> 12 | 224, b[c++] = e >> 6 & 63 | 128), b[c++] = e & 63 | 128);
  }
  return b;
};
goog.crypt.utf8ByteArrayToString = function (a) {
  for (var b = [], c = 0, d = 0; c < a.length;) {
    var e = a[c++];
    if (128 > e) b[d++] = String.fromCharCode(e);else if (191 < e && 224 > e) {
      var f = a[c++];
      b[d++] = String.fromCharCode((e & 31) << 6 | f & 63);
    } else if (239 < e && 365 > e) {
      f = a[c++];
      var g = a[c++],
        h = a[c++];
      e = ((e & 7) << 18 | (f & 63) << 12 | (g & 63) << 6 | h & 63) - 65536;
      b[d++] = String.fromCharCode(55296 + (e >> 10));
      b[d++] = String.fromCharCode(56320 + (e & 1023));
    } else f = a[c++], g = a[c++], b[d++] = String.fromCharCode((e & 15) << 12 | (f & 63) << 6 | g & 63);
  }
  return b.join("");
};
goog.crypt.xorByteArray = function (a, b) {
  goog.asserts.assert(a.length == b.length, "XOR array lengths must match");
  for (var c = [], d = 0; d < a.length; d++) c.push(a[d] ^ b[d]);
  return c;
};
goog.string = {};
goog.string.internal = {};
goog.string.internal.startsWith = function (a, b) {
  return 0 == a.lastIndexOf(b, 0);
};
goog.string.internal.endsWith = function (a, b) {
  var c = a.length - b.length;
  return 0 <= c && a.indexOf(b, c) == c;
};
goog.string.internal.caseInsensitiveStartsWith = function (a, b) {
  return 0 == goog.string.internal.caseInsensitiveCompare(b, a.substr(0, b.length));
};
goog.string.internal.caseInsensitiveEndsWith = function (a, b) {
  return 0 == goog.string.internal.caseInsensitiveCompare(b, a.substr(a.length - b.length, b.length));
};
goog.string.internal.caseInsensitiveEquals = function (a, b) {
  return a.toLowerCase() == b.toLowerCase();
};
goog.string.internal.isEmptyOrWhitespace = function (a) {
  return /^[\s\xa0]*$/.test(a);
};
goog.string.internal.trim = goog.TRUSTED_SITE && String.prototype.trim ? function (a) {
  return a.trim();
} : function (a) {
  return /^[\s\xa0]*([\s\S]*?)[\s\xa0]*$/.exec(a)[1];
};
goog.string.internal.caseInsensitiveCompare = function (a, b) {
  a = String(a).toLowerCase();
  b = String(b).toLowerCase();
  return a < b ? -1 : a == b ? 0 : 1;
};
goog.string.internal.newLineToBr = function (a, b) {
  return a.replace(/(\r\n|\r|\n)/g, b ? "<br />" : "<br>");
};
goog.string.internal.htmlEscape = function (a, b) {
  if (b) a = a.replace(goog.string.internal.AMP_RE_, "&amp;").replace(goog.string.internal.LT_RE_, "&lt;").replace(goog.string.internal.GT_RE_, "&gt;").replace(goog.string.internal.QUOT_RE_, "&quot;").replace(goog.string.internal.SINGLE_QUOTE_RE_, "&#39;").replace(goog.string.internal.NULL_RE_, "&#0;");else {
    if (!goog.string.internal.ALL_RE_.test(a)) return a;
    -1 != a.indexOf("&") && (a = a.replace(goog.string.internal.AMP_RE_, "&amp;"));
    -1 != a.indexOf("<") && (a = a.replace(goog.string.internal.LT_RE_, "&lt;"));
    -1 != a.indexOf(">") && (a = a.replace(goog.string.internal.GT_RE_, "&gt;"));
    -1 != a.indexOf('"') && (a = a.replace(goog.string.internal.QUOT_RE_, "&quot;"));
    -1 != a.indexOf("'") && (a = a.replace(goog.string.internal.SINGLE_QUOTE_RE_, "&#39;"));
    -1 != a.indexOf("\x00") && (a = a.replace(goog.string.internal.NULL_RE_, "&#0;"));
  }
  return a;
};
goog.string.internal.AMP_RE_ = /&/g;
goog.string.internal.LT_RE_ = /</g;
goog.string.internal.GT_RE_ = />/g;
goog.string.internal.QUOT_RE_ = /"/g;
goog.string.internal.SINGLE_QUOTE_RE_ = /'/g;
goog.string.internal.NULL_RE_ = /\x00/g;
goog.string.internal.ALL_RE_ = /[\x00&<>"']/;
goog.string.internal.whitespaceEscape = function (a, b) {
  return goog.string.internal.newLineToBr(a.replace(/  /g, " &#160;"), b);
};
goog.string.internal.contains = function (a, b) {
  return -1 != a.indexOf(b);
};
goog.string.internal.caseInsensitiveContains = function (a, b) {
  return goog.string.internal.contains(a.toLowerCase(), b.toLowerCase());
};
goog.string.internal.compareVersions = function (a, b) {
  var c = 0;
  a = goog.string.internal.trim(String(a)).split(".");
  b = goog.string.internal.trim(String(b)).split(".");
  for (var d = Math.max(a.length, b.length), e = 0; 0 == c && e < d; e++) {
    var f = a[e] || "",
      g = b[e] || "";
    do {
      f = /(\d*)(\D*)(.*)/.exec(f) || ["", "", "", ""];
      g = /(\d*)(\D*)(.*)/.exec(g) || ["", "", "", ""];
      if (0 == f[0].length && 0 == g[0].length) break;
      c = 0 == f[1].length ? 0 : parseInt(f[1], 10);
      var h = 0 == g[1].length ? 0 : parseInt(g[1], 10);
      c = goog.string.internal.compareElements_(c, h) || goog.string.internal.compareElements_(0 == f[2].length, 0 == g[2].length) || goog.string.internal.compareElements_(f[2], g[2]);
      f = f[3];
      g = g[3];
    } while (0 == c);
  }
  return c;
};
goog.string.internal.compareElements_ = function (a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
};
goog.string.TypedString = function () {};
goog.string.Const = function (a, b) {
  this.stringConstValueWithSecurityContract__googStringSecurityPrivate_ = a === goog.string.Const.GOOG_STRING_CONSTRUCTOR_TOKEN_PRIVATE_ && b || "";
  this.STRING_CONST_TYPE_MARKER__GOOG_STRING_SECURITY_PRIVATE_ = goog.string.Const.TYPE_MARKER_;
};
goog.string.Const.prototype.implementsGoogStringTypedString = !0;
goog.string.Const.prototype.getTypedStringValue = function () {
  return this.stringConstValueWithSecurityContract__googStringSecurityPrivate_;
};
goog.string.Const.prototype.toString = function () {
  return "Const{" + this.stringConstValueWithSecurityContract__googStringSecurityPrivate_ + "}";
};
goog.string.Const.unwrap = function (a) {
  if (a instanceof goog.string.Const && a.constructor === goog.string.Const && a.STRING_CONST_TYPE_MARKER__GOOG_STRING_SECURITY_PRIVATE_ === goog.string.Const.TYPE_MARKER_) return a.stringConstValueWithSecurityContract__googStringSecurityPrivate_;
  goog.asserts.fail("expected object of type Const, got '" + a + "'");
  return "type_error:Const";
};
goog.string.Const.from = function (a) {
  return new goog.string.Const(goog.string.Const.GOOG_STRING_CONSTRUCTOR_TOKEN_PRIVATE_, a);
};
goog.string.Const.TYPE_MARKER_ = {};
goog.string.Const.GOOG_STRING_CONSTRUCTOR_TOKEN_PRIVATE_ = {};
goog.string.Const.EMPTY = goog.string.Const.from("");
goog.fs = {};
goog.fs.url = {};
goog.fs.url.createObjectUrl = function (a) {
  return goog.fs.url.getUrlObject_().createObjectURL(a);
};
goog.fs.url.revokeObjectUrl = function (a) {
  goog.fs.url.getUrlObject_().revokeObjectURL(a);
};
goog.fs.url.getUrlObject_ = function () {
  var a = goog.fs.url.findUrlObject_();
  if (null != a) return a;
  throw Error("This browser doesn't seem to support blob URLs");
};
goog.fs.url.findUrlObject_ = function () {
  return goog.isDef(goog.global.URL) && goog.isDef(goog.global.URL.createObjectURL) ? goog.global.URL : goog.isDef(goog.global.webkitURL) && goog.isDef(goog.global.webkitURL.createObjectURL) ? goog.global.webkitURL : goog.isDef(goog.global.createObjectURL) ? goog.global : null;
};
goog.fs.url.browserSupportsObjectUrls = function () {
  return null != goog.fs.url.findUrlObject_();
};
goog.html = {};
goog.html.trustedtypes = {};
goog.html.trustedtypes.PRIVATE_DO_NOT_ACCESS_OR_ELSE_POLICY = goog.TRUSTED_TYPES_POLICY_NAME ? goog.createTrustedTypesPolicy(goog.TRUSTED_TYPES_POLICY_NAME + "#html") : null;
goog.i18n = {};
goog.i18n.bidi = {};
goog.i18n.bidi.FORCE_RTL = !1;
goog.i18n.bidi.IS_RTL = goog.i18n.bidi.FORCE_RTL || ("ar" == goog.LOCALE.substring(0, 2).toLowerCase() || "fa" == goog.LOCALE.substring(0, 2).toLowerCase() || "he" == goog.LOCALE.substring(0, 2).toLowerCase() || "iw" == goog.LOCALE.substring(0, 2).toLowerCase() || "ps" == goog.LOCALE.substring(0, 2).toLowerCase() || "sd" == goog.LOCALE.substring(0, 2).toLowerCase() || "ug" == goog.LOCALE.substring(0, 2).toLowerCase() || "ur" == goog.LOCALE.substring(0, 2).toLowerCase() || "yi" == goog.LOCALE.substring(0, 2).toLowerCase()) && (2 == goog.LOCALE.length || "-" == goog.LOCALE.substring(2, 3) || "_" == goog.LOCALE.substring(2, 3)) || 3 <= goog.LOCALE.length && "ckb" == goog.LOCALE.substring(0, 3).toLowerCase() && (3 == goog.LOCALE.length || "-" == goog.LOCALE.substring(3, 4) || "_" == goog.LOCALE.substring(3, 4)) || 7 <= goog.LOCALE.length && ("-" == goog.LOCALE.substring(2, 3) || "_" == goog.LOCALE.substring(2, 3)) && ("adlm" == goog.LOCALE.substring(3, 7).toLowerCase() || "arab" == goog.LOCALE.substring(3, 7).toLowerCase() || "hebr" == goog.LOCALE.substring(3, 7).toLowerCase() || "nkoo" == goog.LOCALE.substring(3, 7).toLowerCase() || "rohg" == goog.LOCALE.substring(3, 7).toLowerCase() || "thaa" == goog.LOCALE.substring(3, 7).toLowerCase()) || 8 <= goog.LOCALE.length && ("-" == goog.LOCALE.substring(3, 4) || "_" == goog.LOCALE.substring(3, 4)) && ("adlm" == goog.LOCALE.substring(4, 8).toLowerCase() || "arab" == goog.LOCALE.substring(4, 8).toLowerCase() || "hebr" == goog.LOCALE.substring(4, 8).toLowerCase() || "nkoo" == goog.LOCALE.substring(4, 8).toLowerCase() || "rohg" == goog.LOCALE.substring(4, 8).toLowerCase() || "thaa" == goog.LOCALE.substring(4, 8).toLowerCase());
goog.i18n.bidi.Format = {
  LRE: "\u202a",
  RLE: "\u202b",
  PDF: "\u202c",
  LRM: "\u200e",
  RLM: "\u200f"
};
goog.i18n.bidi.Dir = {
  LTR: 1,
  RTL: -1,
  NEUTRAL: 0
};
goog.i18n.bidi.RIGHT = "right";
goog.i18n.bidi.LEFT = "left";
goog.i18n.bidi.I18N_RIGHT = goog.i18n.bidi.IS_RTL ? goog.i18n.bidi.LEFT : goog.i18n.bidi.RIGHT;
goog.i18n.bidi.I18N_LEFT = goog.i18n.bidi.IS_RTL ? goog.i18n.bidi.RIGHT : goog.i18n.bidi.LEFT;
goog.i18n.bidi.toDir = function (a, b) {
  return "number" == typeof a ? 0 < a ? goog.i18n.bidi.Dir.LTR : 0 > a ? goog.i18n.bidi.Dir.RTL : b ? null : goog.i18n.bidi.Dir.NEUTRAL : null == a ? null : a ? goog.i18n.bidi.Dir.RTL : goog.i18n.bidi.Dir.LTR;
};
goog.i18n.bidi.ltrChars_ = "A-Za-z\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u02b8\u0300-\u0590\u0900-\u1fff\u200e\u2c00-\ud801\ud804-\ud839\ud83c-\udbff\uf900-\ufb1c\ufe00-\ufe6f\ufefd-\uffff";
goog.i18n.bidi.rtlChars_ = "\u0591-\u06ef\u06fa-\u08ff\u200f\ud802-\ud803\ud83a-\ud83b\ufb1d-\ufdff\ufe70-\ufefc";
goog.i18n.bidi.htmlSkipReg_ = /<[^>]*>|&[^;]+;/g;
goog.i18n.bidi.stripHtmlIfNeeded_ = function (a, b) {
  return b ? a.replace(goog.i18n.bidi.htmlSkipReg_, "") : a;
};
goog.i18n.bidi.rtlCharReg_ = new RegExp("[" + goog.i18n.bidi.rtlChars_ + "]");
goog.i18n.bidi.ltrCharReg_ = new RegExp("[" + goog.i18n.bidi.ltrChars_ + "]");
goog.i18n.bidi.hasAnyRtl = function (a, b) {
  return goog.i18n.bidi.rtlCharReg_.test(goog.i18n.bidi.stripHtmlIfNeeded_(a, b));
};
goog.i18n.bidi.hasRtlChar = goog.i18n.bidi.hasAnyRtl;
goog.i18n.bidi.hasAnyLtr = function (a, b) {
  return goog.i18n.bidi.ltrCharReg_.test(goog.i18n.bidi.stripHtmlIfNeeded_(a, b));
};
goog.i18n.bidi.ltrRe_ = new RegExp("^[" + goog.i18n.bidi.ltrChars_ + "]");
goog.i18n.bidi.rtlRe_ = new RegExp("^[" + goog.i18n.bidi.rtlChars_ + "]");
goog.i18n.bidi.isRtlChar = function (a) {
  return goog.i18n.bidi.rtlRe_.test(a);
};
goog.i18n.bidi.isLtrChar = function (a) {
  return goog.i18n.bidi.ltrRe_.test(a);
};
goog.i18n.bidi.isNeutralChar = function (a) {
  return !goog.i18n.bidi.isLtrChar(a) && !goog.i18n.bidi.isRtlChar(a);
};
goog.i18n.bidi.ltrDirCheckRe_ = new RegExp("^[^" + goog.i18n.bidi.rtlChars_ + "]*[" + goog.i18n.bidi.ltrChars_ + "]");
goog.i18n.bidi.rtlDirCheckRe_ = new RegExp("^[^" + goog.i18n.bidi.ltrChars_ + "]*[" + goog.i18n.bidi.rtlChars_ + "]");
goog.i18n.bidi.startsWithRtl = function (a, b) {
  return goog.i18n.bidi.rtlDirCheckRe_.test(goog.i18n.bidi.stripHtmlIfNeeded_(a, b));
};
goog.i18n.bidi.isRtlText = goog.i18n.bidi.startsWithRtl;
goog.i18n.bidi.startsWithLtr = function (a, b) {
  return goog.i18n.bidi.ltrDirCheckRe_.test(goog.i18n.bidi.stripHtmlIfNeeded_(a, b));
};
goog.i18n.bidi.isLtrText = goog.i18n.bidi.startsWithLtr;
goog.i18n.bidi.isRequiredLtrRe_ = /^http:\/\/.*/;
goog.i18n.bidi.isNeutralText = function (a, b) {
  a = goog.i18n.bidi.stripHtmlIfNeeded_(a, b);
  return goog.i18n.bidi.isRequiredLtrRe_.test(a) || !goog.i18n.bidi.hasAnyLtr(a) && !goog.i18n.bidi.hasAnyRtl(a);
};
goog.i18n.bidi.ltrExitDirCheckRe_ = new RegExp("[" + goog.i18n.bidi.ltrChars_ + "][^" + goog.i18n.bidi.rtlChars_ + "]*$");
goog.i18n.bidi.rtlExitDirCheckRe_ = new RegExp("[" + goog.i18n.bidi.rtlChars_ + "][^" + goog.i18n.bidi.ltrChars_ + "]*$");
goog.i18n.bidi.endsWithLtr = function (a, b) {
  return goog.i18n.bidi.ltrExitDirCheckRe_.test(goog.i18n.bidi.stripHtmlIfNeeded_(a, b));
};
goog.i18n.bidi.isLtrExitText = goog.i18n.bidi.endsWithLtr;
goog.i18n.bidi.endsWithRtl = function (a, b) {
  return goog.i18n.bidi.rtlExitDirCheckRe_.test(goog.i18n.bidi.stripHtmlIfNeeded_(a, b));
};
goog.i18n.bidi.isRtlExitText = goog.i18n.bidi.endsWithRtl;
goog.i18n.bidi.rtlLocalesRe_ = /^(ar|ckb|dv|he|iw|fa|nqo|ps|sd|ug|ur|yi|.*[-_](Adlm|Arab|Hebr|Nkoo|Rohg|Thaa))(?!.*[-_](Latn|Cyrl)($|-|_))($|-|_)/i;
goog.i18n.bidi.isRtlLanguage = function (a) {
  return goog.i18n.bidi.rtlLocalesRe_.test(a);
};
goog.i18n.bidi.bracketGuardTextRe_ = /(\(.*?\)+)|(\[.*?\]+)|(\{.*?\}+)|(<.*?>+)/g;
goog.i18n.bidi.guardBracketInText = function (a, b) {
  b = (void 0 === b ? goog.i18n.bidi.hasAnyRtl(a) : b) ? goog.i18n.bidi.Format.RLM : goog.i18n.bidi.Format.LRM;
  return a.replace(goog.i18n.bidi.bracketGuardTextRe_, b + "$&" + b);
};
goog.i18n.bidi.enforceRtlInHtml = function (a) {
  return "<" == a.charAt(0) ? a.replace(/<\w+/, "$& dir=rtl") : "\n<span dir=rtl>" + a + "</span>";
};
goog.i18n.bidi.enforceRtlInText = function (a) {
  return goog.i18n.bidi.Format.RLE + a + goog.i18n.bidi.Format.PDF;
};
goog.i18n.bidi.enforceLtrInHtml = function (a) {
  return "<" == a.charAt(0) ? a.replace(/<\w+/, "$& dir=ltr") : "\n<span dir=ltr>" + a + "</span>";
};
goog.i18n.bidi.enforceLtrInText = function (a) {
  return goog.i18n.bidi.Format.LRE + a + goog.i18n.bidi.Format.PDF;
};
goog.i18n.bidi.dimensionsRe_ = /:\s*([.\d][.\w]*)\s+([.\d][.\w]*)\s+([.\d][.\w]*)\s+([.\d][.\w]*)/g;
goog.i18n.bidi.leftRe_ = /left/gi;
goog.i18n.bidi.rightRe_ = /right/gi;
goog.i18n.bidi.tempRe_ = /%%%%/g;
goog.i18n.bidi.mirrorCSS = function (a) {
  return a.replace(goog.i18n.bidi.dimensionsRe_, ":$1 $4 $3 $2").replace(goog.i18n.bidi.leftRe_, "%%%%").replace(goog.i18n.bidi.rightRe_, goog.i18n.bidi.LEFT).replace(goog.i18n.bidi.tempRe_, goog.i18n.bidi.RIGHT);
};
goog.i18n.bidi.doubleQuoteSubstituteRe_ = /([\u0591-\u05f2])"/g;
goog.i18n.bidi.singleQuoteSubstituteRe_ = /([\u0591-\u05f2])'/g;
goog.i18n.bidi.normalizeHebrewQuote = function (a) {
  return a.replace(goog.i18n.bidi.doubleQuoteSubstituteRe_, "$1\u05f4").replace(goog.i18n.bidi.singleQuoteSubstituteRe_, "$1\u05f3");
};
goog.i18n.bidi.wordSeparatorRe_ = /\s+/;
goog.i18n.bidi.hasNumeralsRe_ = /[\d\u06f0-\u06f9]/;
goog.i18n.bidi.rtlDetectionThreshold_ = .4;
goog.i18n.bidi.estimateDirection = function (a, b) {
  var c = 0,
    d = 0,
    e = !1;
  a = goog.i18n.bidi.stripHtmlIfNeeded_(a, b).split(goog.i18n.bidi.wordSeparatorRe_);
  for (b = 0; b < a.length; b++) {
    var f = a[b];
    goog.i18n.bidi.startsWithRtl(f) ? (c++, d++) : goog.i18n.bidi.isRequiredLtrRe_.test(f) ? e = !0 : goog.i18n.bidi.hasAnyLtr(f) ? d++ : goog.i18n.bidi.hasNumeralsRe_.test(f) && (e = !0);
  }
  return 0 == d ? e ? goog.i18n.bidi.Dir.LTR : goog.i18n.bidi.Dir.NEUTRAL : c / d > goog.i18n.bidi.rtlDetectionThreshold_ ? goog.i18n.bidi.Dir.RTL : goog.i18n.bidi.Dir.LTR;
};
goog.i18n.bidi.detectRtlDirectionality = function (a, b) {
  return goog.i18n.bidi.estimateDirection(a, b) == goog.i18n.bidi.Dir.RTL;
};
goog.i18n.bidi.setElementDirAndAlign = function (a, b) {
  a && (b = goog.i18n.bidi.toDir(b)) && (a.style.textAlign = b == goog.i18n.bidi.Dir.RTL ? goog.i18n.bidi.RIGHT : goog.i18n.bidi.LEFT, a.dir = b == goog.i18n.bidi.Dir.RTL ? "rtl" : "ltr");
};
goog.i18n.bidi.setElementDirByTextDirectionality = function (a, b) {
  switch (goog.i18n.bidi.estimateDirection(b)) {
    case goog.i18n.bidi.Dir.LTR:
      a.dir = "ltr";
      break;
    case goog.i18n.bidi.Dir.RTL:
      a.dir = "rtl";
      break;
    default:
      a.removeAttribute("dir");
  }
};
goog.i18n.bidi.DirectionalString = function () {};
goog.html.TrustedResourceUrl = function () {
  this.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue_ = "";
  this.trustedURL_ = null;
  this.TRUSTED_RESOURCE_URL_TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_ = goog.html.TrustedResourceUrl.TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_;
};
goog.html.TrustedResourceUrl.prototype.implementsGoogStringTypedString = !0;
goog.html.TrustedResourceUrl.prototype.getTypedStringValue = function () {
  return this.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue_.toString();
};
goog.html.TrustedResourceUrl.prototype.implementsGoogI18nBidiDirectionalString = !0;
goog.html.TrustedResourceUrl.prototype.getDirection = function () {
  return goog.i18n.bidi.Dir.LTR;
};
goog.html.TrustedResourceUrl.prototype.cloneWithParams = function (a, b) {
  var c = goog.html.TrustedResourceUrl.unwrap(this);
  c = goog.html.TrustedResourceUrl.URL_PARAM_PARSER_.exec(c);
  var d = c[3] || "";
  return goog.html.TrustedResourceUrl.createTrustedResourceUrlSecurityPrivateDoNotAccessOrElse(c[1] + goog.html.TrustedResourceUrl.stringifyParams_("?", c[2] || "", a) + goog.html.TrustedResourceUrl.stringifyParams_("#", d, b));
};
goog.DEBUG && (goog.html.TrustedResourceUrl.prototype.toString = function () {
  return "TrustedResourceUrl{" + this.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue_ + "}";
});
goog.html.TrustedResourceUrl.unwrap = function (a) {
  return goog.html.TrustedResourceUrl.unwrapTrustedScriptURL(a).toString();
};
goog.html.TrustedResourceUrl.unwrapTrustedScriptURL = function (a) {
  if (a instanceof goog.html.TrustedResourceUrl && a.constructor === goog.html.TrustedResourceUrl && a.TRUSTED_RESOURCE_URL_TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_ === goog.html.TrustedResourceUrl.TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_) return a.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue_;
  goog.asserts.fail("expected object of type TrustedResourceUrl, got '" + a + "' of type " + goog.typeOf(a));
  return "type_error:TrustedResourceUrl";
};
goog.html.TrustedResourceUrl.unwrapTrustedURL = function (a) {
  return a.trustedURL_ ? a.trustedURL_ : goog.html.TrustedResourceUrl.unwrap(a);
};
goog.html.TrustedResourceUrl.format = function (a, b) {
  var c = goog.string.Const.unwrap(a);
  if (!goog.html.TrustedResourceUrl.BASE_URL_.test(c)) throw Error("Invalid TrustedResourceUrl format: " + c);
  a = c.replace(goog.html.TrustedResourceUrl.FORMAT_MARKER_, function (a, e) {
    if (!Object.prototype.hasOwnProperty.call(b, e)) throw Error('Found marker, "' + e + '", in format string, "' + c + '", but no valid label mapping found in args: ' + JSON.stringify(b));
    a = b[e];
    return a instanceof goog.string.Const ? goog.string.Const.unwrap(a) : encodeURIComponent(String(a));
  });
  return goog.html.TrustedResourceUrl.createTrustedResourceUrlSecurityPrivateDoNotAccessOrElse(a);
};
goog.html.TrustedResourceUrl.FORMAT_MARKER_ = /%{(\w+)}/g;
goog.html.TrustedResourceUrl.BASE_URL_ = /^((https:)?\/\/[0-9a-z.:[\]-]+\/|\/[^/\\]|[^:/\\%]+\/|[^:/\\%]*[?#]|about:blank#)/i;
goog.html.TrustedResourceUrl.URL_PARAM_PARSER_ = /^([^?#]*)(\?[^#]*)?(#[\s\S]*)?/;
goog.html.TrustedResourceUrl.formatWithParams = function (a, b, c, d) {
  return goog.html.TrustedResourceUrl.format(a, b).cloneWithParams(c, d);
};
goog.html.TrustedResourceUrl.fromConstant = function (a) {
  return goog.html.TrustedResourceUrl.createTrustedResourceUrlSecurityPrivateDoNotAccessOrElse(goog.string.Const.unwrap(a));
};
goog.html.TrustedResourceUrl.fromConstants = function (a) {
  for (var b = "", c = 0; c < a.length; c++) b += goog.string.Const.unwrap(a[c]);
  return goog.html.TrustedResourceUrl.createTrustedResourceUrlSecurityPrivateDoNotAccessOrElse(b);
};
goog.html.TrustedResourceUrl.TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_ = {};
goog.html.TrustedResourceUrl.createTrustedResourceUrlSecurityPrivateDoNotAccessOrElse = function (a) {
  var b = new goog.html.TrustedResourceUrl();
  b.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue_ = goog.html.trustedtypes.PRIVATE_DO_NOT_ACCESS_OR_ELSE_POLICY ? goog.html.trustedtypes.PRIVATE_DO_NOT_ACCESS_OR_ELSE_POLICY.createScriptURL(a) : a;
  goog.html.trustedtypes.PRIVATE_DO_NOT_ACCESS_OR_ELSE_POLICY && (b.trustedURL_ = goog.html.trustedtypes.PRIVATE_DO_NOT_ACCESS_OR_ELSE_POLICY.createURL(a));
  return b;
};
goog.html.TrustedResourceUrl.stringifyParams_ = function (a, b, c) {
  if (null == c) return b;
  if (goog.isString(c)) return c ? a + encodeURIComponent(c) : "";
  for (var d in c) {
    var e = c[d];
    e = goog.isArray(e) ? e : [e];
    for (var f = 0; f < e.length; f++) {
      var g = e[f];
      null != g && (b || (b = a), b += (b.length > a.length ? "&" : "") + encodeURIComponent(d) + "=" + encodeURIComponent(String(g)));
    }
  }
  return b;
};
goog.html.SafeUrl = function () {
  this.privateDoNotAccessOrElseSafeUrlWrappedValue_ = "";
  this.SAFE_URL_TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_ = goog.html.SafeUrl.TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_;
};
goog.html.SafeUrl.INNOCUOUS_STRING = "about:invalid#zClosurez";
goog.html.SafeUrl.prototype.implementsGoogStringTypedString = !0;
goog.html.SafeUrl.prototype.getTypedStringValue = function () {
  return this.privateDoNotAccessOrElseSafeUrlWrappedValue_.toString();
};
goog.html.SafeUrl.prototype.implementsGoogI18nBidiDirectionalString = !0;
goog.html.SafeUrl.prototype.getDirection = function () {
  return goog.i18n.bidi.Dir.LTR;
};
goog.DEBUG && (goog.html.SafeUrl.prototype.toString = function () {
  return "SafeUrl{" + this.privateDoNotAccessOrElseSafeUrlWrappedValue_ + "}";
});
goog.html.SafeUrl.unwrap = function (a) {
  return goog.html.SafeUrl.unwrapTrustedURL(a).toString();
};
goog.html.SafeUrl.unwrapTrustedURL = function (a) {
  if (a instanceof goog.html.SafeUrl && a.constructor === goog.html.SafeUrl && a.SAFE_URL_TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_ === goog.html.SafeUrl.TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_) return a.privateDoNotAccessOrElseSafeUrlWrappedValue_;
  goog.asserts.fail("expected object of type SafeUrl, got '" + a + "' of type " + goog.typeOf(a));
  return "type_error:SafeUrl";
};
goog.html.SafeUrl.fromConstant = function (a) {
  return goog.html.SafeUrl.createSafeUrlSecurityPrivateDoNotAccessOrElse(goog.string.Const.unwrap(a));
};
goog.html.SAFE_MIME_TYPE_PATTERN_ = /^(?:audio\/(?:3gpp2|3gpp|aac|L16|midi|mp3|mp4|mpeg|oga|ogg|opus|x-m4a|x-wav|wav|webm)|image\/(?:bmp|gif|jpeg|jpg|png|tiff|webp|x-icon)|text\/csv|video\/(?:mpeg|mp4|ogg|webm|quicktime))(?:;\w+=(?:\w+|"[\w;=]+"))*$/i;
goog.html.SafeUrl.isSafeMimeType = function (a) {
  return goog.html.SAFE_MIME_TYPE_PATTERN_.test(a);
};
goog.html.SafeUrl.fromBlob = function (a) {
  a = goog.html.SAFE_MIME_TYPE_PATTERN_.test(a.type) ? goog.fs.url.createObjectUrl(a) : goog.html.SafeUrl.INNOCUOUS_STRING;
  return goog.html.SafeUrl.createSafeUrlSecurityPrivateDoNotAccessOrElse(a);
};
goog.html.DATA_URL_PATTERN_ = /^data:([^,]*);base64,[a-z0-9+\/]+=*$/i;
goog.html.SafeUrl.fromDataUrl = function (a) {
  a = a.replace(/(%0A|%0D)/g, "");
  var b = a.match(goog.html.DATA_URL_PATTERN_);
  b = b && goog.html.SAFE_MIME_TYPE_PATTERN_.test(b[1]);
  return goog.html.SafeUrl.createSafeUrlSecurityPrivateDoNotAccessOrElse(b ? a : goog.html.SafeUrl.INNOCUOUS_STRING);
};
goog.html.SafeUrl.fromTelUrl = function (a) {
  goog.string.internal.caseInsensitiveStartsWith(a, "tel:") || (a = goog.html.SafeUrl.INNOCUOUS_STRING);
  return goog.html.SafeUrl.createSafeUrlSecurityPrivateDoNotAccessOrElse(a);
};
goog.html.SIP_URL_PATTERN_ = /^sip[s]?:[+a-z0-9_.!$%&'*\/=^`{|}~-]+@([a-z0-9-]+\.)+[a-z0-9]{2,63}$/i;
goog.html.SafeUrl.fromSipUrl = function (a) {
  goog.html.SIP_URL_PATTERN_.test(decodeURIComponent(a)) || (a = goog.html.SafeUrl.INNOCUOUS_STRING);
  return goog.html.SafeUrl.createSafeUrlSecurityPrivateDoNotAccessOrElse(a);
};
goog.html.SafeUrl.fromFacebookMessengerUrl = function (a) {
  goog.string.internal.caseInsensitiveStartsWith(a, "fb-messenger://share") || (a = goog.html.SafeUrl.INNOCUOUS_STRING);
  return goog.html.SafeUrl.createSafeUrlSecurityPrivateDoNotAccessOrElse(a);
};
goog.html.SafeUrl.fromWhatsAppUrl = function (a) {
  goog.string.internal.caseInsensitiveStartsWith(a, "whatsapp://send") || (a = goog.html.SafeUrl.INNOCUOUS_STRING);
  return goog.html.SafeUrl.createSafeUrlSecurityPrivateDoNotAccessOrElse(a);
};
goog.html.SafeUrl.fromSmsUrl = function (a) {
  goog.string.internal.caseInsensitiveStartsWith(a, "sms:") && goog.html.SafeUrl.isSmsUrlBodyValid_(a) || (a = goog.html.SafeUrl.INNOCUOUS_STRING);
  return goog.html.SafeUrl.createSafeUrlSecurityPrivateDoNotAccessOrElse(a);
};
goog.html.SafeUrl.isSmsUrlBodyValid_ = function (a) {
  var b = a.indexOf("#");
  0 < b && (a = a.substring(0, b));
  b = a.match(/[?&]body=/gi);
  if (!b) return !0;
  if (1 < b.length) return !1;
  a = a.match(/[?&]body=([^&]*)/)[1];
  if (!a) return !0;
  try {
    decodeURIComponent(a);
  } catch (c) {
    return !1;
  }
  return /^(?:[a-z0-9\-_.~]|%[0-9a-f]{2})+$/i.test(a);
};
goog.html.SafeUrl.fromSshUrl = function (a) {
  goog.string.internal.caseInsensitiveStartsWith(a, "ssh://") || (a = goog.html.SafeUrl.INNOCUOUS_STRING);
  return goog.html.SafeUrl.createSafeUrlSecurityPrivateDoNotAccessOrElse(a);
};
goog.html.SafeUrl.sanitizeChromeExtensionUrl = function (a, b) {
  return goog.html.SafeUrl.sanitizeExtensionUrl_(/^chrome-extension:\/\/([^\/]+)\//, a, b);
};
goog.html.SafeUrl.sanitizeFirefoxExtensionUrl = function (a, b) {
  return goog.html.SafeUrl.sanitizeExtensionUrl_(/^moz-extension:\/\/([^\/]+)\//, a, b);
};
goog.html.SafeUrl.sanitizeEdgeExtensionUrl = function (a, b) {
  return goog.html.SafeUrl.sanitizeExtensionUrl_(/^ms-browser-extension:\/\/([^\/]+)\//, a, b);
};
goog.html.SafeUrl.sanitizeExtensionUrl_ = function (a, b, c) {
  (a = a.exec(b)) ? (a = a[1], -1 == (c instanceof goog.string.Const ? [goog.string.Const.unwrap(c)] : c.map(function (a) {
    return goog.string.Const.unwrap(a);
  })).indexOf(a) && (b = goog.html.SafeUrl.INNOCUOUS_STRING)) : b = goog.html.SafeUrl.INNOCUOUS_STRING;
  return goog.html.SafeUrl.createSafeUrlSecurityPrivateDoNotAccessOrElse(b);
};
goog.html.SafeUrl.fromTrustedResourceUrl = function (a) {
  return goog.html.SafeUrl.createSafeUrlSecurityPrivateDoNotAccessOrElse(goog.html.TrustedResourceUrl.unwrap(a));
};
goog.html.SAFE_URL_PATTERN_ = /^(?:(?:https?|mailto|ftp):|[^:/?#]*(?:[/?#]|$))/i;
goog.html.SafeUrl.SAFE_URL_PATTERN = goog.html.SAFE_URL_PATTERN_;
goog.html.SafeUrl.sanitize = function (a) {
  if (a instanceof goog.html.SafeUrl) return a;
  a = "object" == typeof a && a.implementsGoogStringTypedString ? a.getTypedStringValue() : String(a);
  goog.html.SAFE_URL_PATTERN_.test(a) || (a = goog.html.SafeUrl.INNOCUOUS_STRING);
  return goog.html.SafeUrl.createSafeUrlSecurityPrivateDoNotAccessOrElse(a);
};
goog.html.SafeUrl.sanitizeAssertUnchanged = function (a, b) {
  if (a instanceof goog.html.SafeUrl) return a;
  a = "object" == typeof a && a.implementsGoogStringTypedString ? a.getTypedStringValue() : String(a);
  if (b && /^data:/i.test(a) && (b = goog.html.SafeUrl.fromDataUrl(a), b.getTypedStringValue() == a)) return b;
  goog.asserts.assert(goog.html.SAFE_URL_PATTERN_.test(a), "%s does not match the safe URL pattern", a) || (a = goog.html.SafeUrl.INNOCUOUS_STRING);
  return goog.html.SafeUrl.createSafeUrlSecurityPrivateDoNotAccessOrElse(a);
};
goog.html.SafeUrl.TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_ = {};
goog.html.SafeUrl.createSafeUrlSecurityPrivateDoNotAccessOrElse = function (a) {
  var b = new goog.html.SafeUrl();
  b.privateDoNotAccessOrElseSafeUrlWrappedValue_ = goog.html.trustedtypes.PRIVATE_DO_NOT_ACCESS_OR_ELSE_POLICY ? goog.html.trustedtypes.PRIVATE_DO_NOT_ACCESS_OR_ELSE_POLICY.createURL(a) : a;
  return b;
};
goog.html.SafeUrl.ABOUT_BLANK = goog.html.SafeUrl.createSafeUrlSecurityPrivateDoNotAccessOrElse("about:blank");
goog.html.SafeStyle = function () {
  this.privateDoNotAccessOrElseSafeStyleWrappedValue_ = "";
  this.SAFE_STYLE_TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_ = goog.html.SafeStyle.TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_;
};
goog.html.SafeStyle.prototype.implementsGoogStringTypedString = !0;
goog.html.SafeStyle.TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_ = {};
goog.html.SafeStyle.fromConstant = function (a) {
  a = goog.string.Const.unwrap(a);
  if (0 === a.length) return goog.html.SafeStyle.EMPTY;
  goog.asserts.assert(goog.string.internal.endsWith(a, ";"), "Last character of style string is not ';': " + a);
  goog.asserts.assert(goog.string.internal.contains(a, ":"), "Style string must contain at least one ':', to specify a \"name: value\" pair: " + a);
  return goog.html.SafeStyle.createSafeStyleSecurityPrivateDoNotAccessOrElse(a);
};
goog.html.SafeStyle.prototype.getTypedStringValue = function () {
  return this.privateDoNotAccessOrElseSafeStyleWrappedValue_;
};
goog.DEBUG && (goog.html.SafeStyle.prototype.toString = function () {
  return "SafeStyle{" + this.privateDoNotAccessOrElseSafeStyleWrappedValue_ + "}";
});
goog.html.SafeStyle.unwrap = function (a) {
  if (a instanceof goog.html.SafeStyle && a.constructor === goog.html.SafeStyle && a.SAFE_STYLE_TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_ === goog.html.SafeStyle.TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_) return a.privateDoNotAccessOrElseSafeStyleWrappedValue_;
  goog.asserts.fail("expected object of type SafeStyle, got '" + a + "' of type " + goog.typeOf(a));
  return "type_error:SafeStyle";
};
goog.html.SafeStyle.createSafeStyleSecurityPrivateDoNotAccessOrElse = function (a) {
  return new goog.html.SafeStyle().initSecurityPrivateDoNotAccessOrElse_(a);
};
goog.html.SafeStyle.prototype.initSecurityPrivateDoNotAccessOrElse_ = function (a) {
  this.privateDoNotAccessOrElseSafeStyleWrappedValue_ = a;
  return this;
};
goog.html.SafeStyle.EMPTY = goog.html.SafeStyle.createSafeStyleSecurityPrivateDoNotAccessOrElse("");
goog.html.SafeStyle.INNOCUOUS_STRING = "zClosurez";
goog.html.SafeStyle.create = function (a) {
  var b = "",
    c;
  for (c in a) {
    if (!/^[-_a-zA-Z0-9]+$/.test(c)) throw Error("Name allows only [-_a-zA-Z0-9], got: " + c);
    var d = a[c];
    null != d && (d = goog.isArray(d) ? goog.array.map(d, goog.html.SafeStyle.sanitizePropertyValue_).join(" ") : goog.html.SafeStyle.sanitizePropertyValue_(d), b += c + ":" + d + ";");
  }
  return b ? goog.html.SafeStyle.createSafeStyleSecurityPrivateDoNotAccessOrElse(b) : goog.html.SafeStyle.EMPTY;
};
goog.html.SafeStyle.sanitizePropertyValue_ = function (a) {
  if (a instanceof goog.html.SafeUrl) return 'url("' + goog.html.SafeUrl.unwrap(a).replace(/</g, "%3c").replace(/[\\"]/g, "\\$&") + '")';
  a = a instanceof goog.string.Const ? goog.string.Const.unwrap(a) : goog.html.SafeStyle.sanitizePropertyValueString_(String(a));
  if (/[{;}]/.test(a)) throw new goog.asserts.AssertionError("Value does not allow [{;}], got: %s.", [a]);
  return a;
};
goog.html.SafeStyle.sanitizePropertyValueString_ = function (a) {
  var b = a.replace(goog.html.SafeStyle.FUNCTIONS_RE_, "$1").replace(goog.html.SafeStyle.FUNCTIONS_RE_, "$1").replace(goog.html.SafeStyle.URL_RE_, "url");
  if (goog.html.SafeStyle.VALUE_RE_.test(b)) {
    if (goog.html.SafeStyle.COMMENT_RE_.test(a)) return goog.asserts.fail("String value disallows comments, got: " + a), goog.html.SafeStyle.INNOCUOUS_STRING;
    if (!goog.html.SafeStyle.hasBalancedQuotes_(a)) return goog.asserts.fail("String value requires balanced quotes, got: " + a), goog.html.SafeStyle.INNOCUOUS_STRING;
    if (!goog.html.SafeStyle.hasBalancedSquareBrackets_(a)) return goog.asserts.fail("String value requires balanced square brackets and one identifier per pair of brackets, got: " + a), goog.html.SafeStyle.INNOCUOUS_STRING;
  } else return goog.asserts.fail("String value allows only " + goog.html.SafeStyle.VALUE_ALLOWED_CHARS_ + " and simple functions, got: " + a), goog.html.SafeStyle.INNOCUOUS_STRING;
  return goog.html.SafeStyle.sanitizeUrl_(a);
};
goog.html.SafeStyle.hasBalancedQuotes_ = function (a) {
  for (var b = !0, c = !0, d = 0; d < a.length; d++) {
    var e = a.charAt(d);
    "'" == e && c ? b = !b : '"' == e && b && (c = !c);
  }
  return b && c;
};
goog.html.SafeStyle.hasBalancedSquareBrackets_ = function (a) {
  for (var b = !0, c = /^[-_a-zA-Z0-9]$/, d = 0; d < a.length; d++) {
    var e = a.charAt(d);
    if ("]" == e) {
      if (b) return !1;
      b = !0;
    } else if ("[" == e) {
      if (!b) return !1;
      b = !1;
    } else if (!b && !c.test(e)) return !1;
  }
  return b;
};
goog.html.SafeStyle.VALUE_ALLOWED_CHARS_ = "[-,.\"'%_!# a-zA-Z0-9\\[\\]]";
goog.html.SafeStyle.VALUE_RE_ = new RegExp("^" + goog.html.SafeStyle.VALUE_ALLOWED_CHARS_ + "+$");
goog.html.SafeStyle.URL_RE_ = /\b(url\([ \t\n]*)('[ -&(-\[\]-~]*'|"[ !#-\[\]-~]*"|[!#-&*-\[\]-~]*)([ \t\n]*\))/g;
goog.html.SafeStyle.FUNCTIONS_RE_ = /\b(hsl|hsla|rgb|rgba|matrix|calc|minmax|fit-content|repeat|(rotate|scale|translate)(X|Y|Z|3d)?)\([-+*/0-9a-z.%\[\], ]+\)/g;
goog.html.SafeStyle.COMMENT_RE_ = /\/\*/;
goog.html.SafeStyle.sanitizeUrl_ = function (a) {
  return a.replace(goog.html.SafeStyle.URL_RE_, function (a, c, d, e) {
    var b = "";
    d = d.replace(/^(['"])(.*)\1$/, function (a, c, d) {
      b = c;
      return d;
    });
    a = goog.html.SafeUrl.sanitize(d).getTypedStringValue();
    return c + b + a + b + e;
  });
};
goog.html.SafeStyle.concat = function (a) {
  var b = "",
    c = function (a) {
      goog.isArray(a) ? goog.array.forEach(a, c) : b += goog.html.SafeStyle.unwrap(a);
    };
  goog.array.forEach(arguments, c);
  return b ? goog.html.SafeStyle.createSafeStyleSecurityPrivateDoNotAccessOrElse(b) : goog.html.SafeStyle.EMPTY;
};
goog.html.SafeScript = function () {
  this.privateDoNotAccessOrElseSafeScriptWrappedValue_ = "";
  this.SAFE_SCRIPT_TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_ = goog.html.SafeScript.TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_;
};
goog.html.SafeScript.prototype.implementsGoogStringTypedString = !0;
goog.html.SafeScript.TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_ = {};
goog.html.SafeScript.fromConstant = function (a) {
  a = goog.string.Const.unwrap(a);
  return 0 === a.length ? goog.html.SafeScript.EMPTY : goog.html.SafeScript.createSafeScriptSecurityPrivateDoNotAccessOrElse(a);
};
goog.html.SafeScript.fromConstantAndArgs = function (a, b) {
  for (var c = [], d = 1; d < arguments.length; d++) c.push(goog.html.SafeScript.stringify_(arguments[d]));
  return goog.html.SafeScript.createSafeScriptSecurityPrivateDoNotAccessOrElse("(" + goog.string.Const.unwrap(a) + ")(" + c.join(", ") + ");");
};
goog.html.SafeScript.fromJson = function (a) {
  return goog.html.SafeScript.createSafeScriptSecurityPrivateDoNotAccessOrElse(goog.html.SafeScript.stringify_(a));
};
goog.html.SafeScript.prototype.getTypedStringValue = function () {
  return this.privateDoNotAccessOrElseSafeScriptWrappedValue_.toString();
};
goog.DEBUG && (goog.html.SafeScript.prototype.toString = function () {
  return "SafeScript{" + this.privateDoNotAccessOrElseSafeScriptWrappedValue_ + "}";
});
goog.html.SafeScript.unwrap = function (a) {
  return goog.html.SafeScript.unwrapTrustedScript(a).toString();
};
goog.html.SafeScript.unwrapTrustedScript = function (a) {
  if (a instanceof goog.html.SafeScript && a.constructor === goog.html.SafeScript && a.SAFE_SCRIPT_TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_ === goog.html.SafeScript.TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_) return a.privateDoNotAccessOrElseSafeScriptWrappedValue_;
  goog.asserts.fail("expected object of type SafeScript, got '" + a + "' of type " + goog.typeOf(a));
  return "type_error:SafeScript";
};
goog.html.SafeScript.stringify_ = function (a) {
  return JSON.stringify(a).replace(/</g, "\\x3c");
};
goog.html.SafeScript.createSafeScriptSecurityPrivateDoNotAccessOrElse = function (a) {
  return new goog.html.SafeScript().initSecurityPrivateDoNotAccessOrElse_(a);
};
goog.html.SafeScript.prototype.initSecurityPrivateDoNotAccessOrElse_ = function (a) {
  this.privateDoNotAccessOrElseSafeScriptWrappedValue_ = goog.html.trustedtypes.PRIVATE_DO_NOT_ACCESS_OR_ELSE_POLICY ? goog.html.trustedtypes.PRIVATE_DO_NOT_ACCESS_OR_ELSE_POLICY.createScript(a) : a;
  return this;
};
goog.html.SafeScript.EMPTY = goog.html.SafeScript.createSafeScriptSecurityPrivateDoNotAccessOrElse("");
goog.object = {};
goog.object.is = function (a, b) {
  return a === b ? 0 !== a || 1 / a === 1 / b : a !== a && b !== b;
};
goog.object.forEach = function (a, b, c) {
  for (var d in a) b.call(c, a[d], d, a);
};
goog.object.filter = function (a, b, c) {
  var d = {},
    e;
  for (e in a) b.call(c, a[e], e, a) && (d[e] = a[e]);
  return d;
};
goog.object.map = function (a, b, c) {
  var d = {},
    e;
  for (e in a) d[e] = b.call(c, a[e], e, a);
  return d;
};
goog.object.some = function (a, b, c) {
  for (var d in a) if (b.call(c, a[d], d, a)) return !0;
  return !1;
};
goog.object.every = function (a, b, c) {
  for (var d in a) if (!b.call(c, a[d], d, a)) return !1;
  return !0;
};
goog.object.getCount = function (a) {
  var b = 0,
    c;
  for (c in a) b++;
  return b;
};
goog.object.getAnyKey = function (a) {
  for (var b in a) return b;
};
goog.object.getAnyValue = function (a) {
  for (var b in a) return a[b];
};
goog.object.contains = function (a, b) {
  return goog.object.containsValue(a, b);
};
goog.object.getValues = function (a) {
  var b = [],
    c = 0,
    d;
  for (d in a) b[c++] = a[d];
  return b;
};
goog.object.getKeys = function (a) {
  var b = [],
    c = 0,
    d;
  for (d in a) b[c++] = d;
  return b;
};
goog.object.getValueByKeys = function (a, b) {
  var c = goog.isArrayLike(b),
    d = c ? b : arguments;
  for (c = c ? 0 : 1; c < d.length; c++) {
    if (null == a) return;
    a = a[d[c]];
  }
  return a;
};
goog.object.containsKey = function (a, b) {
  return null !== a && b in a;
};
goog.object.containsValue = function (a, b) {
  for (var c in a) if (a[c] == b) return !0;
  return !1;
};
goog.object.findKey = function (a, b, c) {
  for (var d in a) if (b.call(c, a[d], d, a)) return d;
};
goog.object.findValue = function (a, b, c) {
  return (b = goog.object.findKey(a, b, c)) && a[b];
};
goog.object.isEmpty = function (a) {
  for (var b in a) return !1;
  return !0;
};
goog.object.clear = function (a) {
  for (var b in a) delete a[b];
};
goog.object.remove = function (a, b) {
  var c;
  (c = b in a) && delete a[b];
  return c;
};
goog.object.add = function (a, b, c) {
  if (null !== a && b in a) throw Error('The object already contains the key "' + b + '"');
  goog.object.set(a, b, c);
};
goog.object.get = function (a, b, c) {
  return null !== a && b in a ? a[b] : c;
};
goog.object.set = function (a, b, c) {
  a[b] = c;
};
goog.object.setIfUndefined = function (a, b, c) {
  return b in a ? a[b] : a[b] = c;
};
goog.object.setWithReturnValueIfNotSet = function (a, b, c) {
  if (b in a) return a[b];
  c = c();
  return a[b] = c;
};
goog.object.equals = function (a, b) {
  for (var c in a) if (!(c in b) || a[c] !== b[c]) return !1;
  for (var d in b) if (!(d in a)) return !1;
  return !0;
};
goog.object.clone = function (a) {
  var b = {},
    c;
  for (c in a) b[c] = a[c];
  return b;
};
goog.object.unsafeClone = function (a) {
  var b = goog.typeOf(a);
  if ("object" == b || "array" == b) {
    if (goog.isFunction(a.clone)) return a.clone();
    b = "array" == b ? [] : {};
    for (var c in a) b[c] = goog.object.unsafeClone(a[c]);
    return b;
  }
  return a;
};
goog.object.transpose = function (a) {
  var b = {},
    c;
  for (c in a) b[a[c]] = c;
  return b;
};
goog.object.PROTOTYPE_FIELDS_ = "constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
goog.object.extend = function (a, b) {
  for (var c, d, e = 1; e < arguments.length; e++) {
    d = arguments[e];
    for (c in d) a[c] = d[c];
    for (var f = 0; f < goog.object.PROTOTYPE_FIELDS_.length; f++) c = goog.object.PROTOTYPE_FIELDS_[f], Object.prototype.hasOwnProperty.call(d, c) && (a[c] = d[c]);
  }
};
goog.object.create = function (a) {
  var b = arguments.length;
  if (1 == b && goog.isArray(arguments[0])) return goog.object.create.apply(null, arguments[0]);
  if (b % 2) throw Error("Uneven number of arguments");
  for (var c = {}, d = 0; d < b; d += 2) c[arguments[d]] = arguments[d + 1];
  return c;
};
goog.object.createSet = function (a) {
  var b = arguments.length;
  if (1 == b && goog.isArray(arguments[0])) return goog.object.createSet.apply(null, arguments[0]);
  for (var c = {}, d = 0; d < b; d++) c[arguments[d]] = !0;
  return c;
};
goog.object.createImmutableView = function (a) {
  var b = a;
  Object.isFrozen && !Object.isFrozen(a) && (b = Object.create(a), Object.freeze(b));
  return b;
};
goog.object.isImmutableView = function (a) {
  return !!Object.isFrozen && Object.isFrozen(a);
};
goog.object.getAllPropertyNames = function (a, b, c) {
  if (!a) return [];
  if (!Object.getOwnPropertyNames || !Object.getPrototypeOf) return goog.object.getKeys(a);
  for (var d = {}; a && (a !== Object.prototype || b) && (a !== Function.prototype || c);) {
    for (var e = Object.getOwnPropertyNames(a), f = 0; f < e.length; f++) d[e[f]] = !0;
    a = Object.getPrototypeOf(a);
  }
  return goog.object.getKeys(d);
};
goog.object.getSuperClass = function (a) {
  return (a = Object.getPrototypeOf(a.prototype)) && a.constructor;
};
goog.html.SafeStyleSheet = function () {
  this.privateDoNotAccessOrElseSafeStyleSheetWrappedValue_ = "";
  this.SAFE_STYLE_SHEET_TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_ = goog.html.SafeStyleSheet.TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_;
};
goog.html.SafeStyleSheet.prototype.implementsGoogStringTypedString = !0;
goog.html.SafeStyleSheet.TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_ = {};
goog.html.SafeStyleSheet.createRule = function (a, b) {
  if (goog.string.internal.contains(a, "<")) throw Error("Selector does not allow '<', got: " + a);
  var c = a.replace(/('|")((?!\1)[^\r\n\f\\]|\\[\s\S])*\1/g, "");
  if (!/^[-_a-zA-Z0-9#.:* ,>+~[\]()=^$|]+$/.test(c)) throw Error("Selector allows only [-_a-zA-Z0-9#.:* ,>+~[\\]()=^$|] and strings, got: " + a);
  if (!goog.html.SafeStyleSheet.hasBalancedBrackets_(c)) throw Error("() and [] in selector must be balanced, got: " + a);
  b instanceof goog.html.SafeStyle || (b = goog.html.SafeStyle.create(b));
  a = a + "{" + goog.html.SafeStyle.unwrap(b).replace(/</g, "\\3C ") + "}";
  return goog.html.SafeStyleSheet.createSafeStyleSheetSecurityPrivateDoNotAccessOrElse(a);
};
goog.html.SafeStyleSheet.hasBalancedBrackets_ = function (a) {
  for (var b = {
      "(": ")",
      "[": "]"
    }, c = [], d = 0; d < a.length; d++) {
    var e = a[d];
    if (b[e]) c.push(b[e]);else if (goog.object.contains(b, e) && c.pop() != e) return !1;
  }
  return 0 == c.length;
};
goog.html.SafeStyleSheet.concat = function (a) {
  var b = "",
    c = function (a) {
      goog.isArray(a) ? goog.array.forEach(a, c) : b += goog.html.SafeStyleSheet.unwrap(a);
    };
  goog.array.forEach(arguments, c);
  return goog.html.SafeStyleSheet.createSafeStyleSheetSecurityPrivateDoNotAccessOrElse(b);
};
goog.html.SafeStyleSheet.fromConstant = function (a) {
  a = goog.string.Const.unwrap(a);
  if (0 === a.length) return goog.html.SafeStyleSheet.EMPTY;
  goog.asserts.assert(!goog.string.internal.contains(a, "<"), "Forbidden '<' character in style sheet string: " + a);
  return goog.html.SafeStyleSheet.createSafeStyleSheetSecurityPrivateDoNotAccessOrElse(a);
};
goog.html.SafeStyleSheet.prototype.getTypedStringValue = function () {
  return this.privateDoNotAccessOrElseSafeStyleSheetWrappedValue_;
};
goog.DEBUG && (goog.html.SafeStyleSheet.prototype.toString = function () {
  return "SafeStyleSheet{" + this.privateDoNotAccessOrElseSafeStyleSheetWrappedValue_ + "}";
});
goog.html.SafeStyleSheet.unwrap = function (a) {
  if (a instanceof goog.html.SafeStyleSheet && a.constructor === goog.html.SafeStyleSheet && a.SAFE_STYLE_SHEET_TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_ === goog.html.SafeStyleSheet.TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_) return a.privateDoNotAccessOrElseSafeStyleSheetWrappedValue_;
  goog.asserts.fail("expected object of type SafeStyleSheet, got '" + a + "' of type " + goog.typeOf(a));
  return "type_error:SafeStyleSheet";
};
goog.html.SafeStyleSheet.createSafeStyleSheetSecurityPrivateDoNotAccessOrElse = function (a) {
  return new goog.html.SafeStyleSheet().initSecurityPrivateDoNotAccessOrElse_(a);
};
goog.html.SafeStyleSheet.prototype.initSecurityPrivateDoNotAccessOrElse_ = function (a) {
  this.privateDoNotAccessOrElseSafeStyleSheetWrappedValue_ = a;
  return this;
};
goog.html.SafeStyleSheet.EMPTY = goog.html.SafeStyleSheet.createSafeStyleSheetSecurityPrivateDoNotAccessOrElse("");
goog.dom.tags = {};
goog.dom.tags.VOID_TAGS_ = {
  area: !0,
  base: !0,
  br: !0,
  col: !0,
  command: !0,
  embed: !0,
  hr: !0,
  img: !0,
  input: !0,
  keygen: !0,
  link: !0,
  meta: !0,
  param: !0,
  source: !0,
  track: !0,
  wbr: !0
};
goog.dom.tags.isVoidTag = function (a) {
  return !0 === goog.dom.tags.VOID_TAGS_[a];
};
goog.dom.HtmlElement = function () {};
goog.dom.TagName = function (a) {
  this.tagName_ = a;
};
goog.dom.TagName.prototype.toString = function () {
  return this.tagName_;
};
goog.dom.TagName.A = new goog.dom.TagName("A");
goog.dom.TagName.ABBR = new goog.dom.TagName("ABBR");
goog.dom.TagName.ACRONYM = new goog.dom.TagName("ACRONYM");
goog.dom.TagName.ADDRESS = new goog.dom.TagName("ADDRESS");
goog.dom.TagName.APPLET = new goog.dom.TagName("APPLET");
goog.dom.TagName.AREA = new goog.dom.TagName("AREA");
goog.dom.TagName.ARTICLE = new goog.dom.TagName("ARTICLE");
goog.dom.TagName.ASIDE = new goog.dom.TagName("ASIDE");
goog.dom.TagName.AUDIO = new goog.dom.TagName("AUDIO");
goog.dom.TagName.B = new goog.dom.TagName("B");
goog.dom.TagName.BASE = new goog.dom.TagName("BASE");
goog.dom.TagName.BASEFONT = new goog.dom.TagName("BASEFONT");
goog.dom.TagName.BDI = new goog.dom.TagName("BDI");
goog.dom.TagName.BDO = new goog.dom.TagName("BDO");
goog.dom.TagName.BIG = new goog.dom.TagName("BIG");
goog.dom.TagName.BLOCKQUOTE = new goog.dom.TagName("BLOCKQUOTE");
goog.dom.TagName.BODY = new goog.dom.TagName("BODY");
goog.dom.TagName.BR = new goog.dom.TagName("BR");
goog.dom.TagName.BUTTON = new goog.dom.TagName("BUTTON");
goog.dom.TagName.CANVAS = new goog.dom.TagName("CANVAS");
goog.dom.TagName.CAPTION = new goog.dom.TagName("CAPTION");
goog.dom.TagName.CENTER = new goog.dom.TagName("CENTER");
goog.dom.TagName.CITE = new goog.dom.TagName("CITE");
goog.dom.TagName.CODE = new goog.dom.TagName("CODE");
goog.dom.TagName.COL = new goog.dom.TagName("COL");
goog.dom.TagName.COLGROUP = new goog.dom.TagName("COLGROUP");
goog.dom.TagName.COMMAND = new goog.dom.TagName("COMMAND");
goog.dom.TagName.DATA = new goog.dom.TagName("DATA");
goog.dom.TagName.DATALIST = new goog.dom.TagName("DATALIST");
goog.dom.TagName.DD = new goog.dom.TagName("DD");
goog.dom.TagName.DEL = new goog.dom.TagName("DEL");
goog.dom.TagName.DETAILS = new goog.dom.TagName("DETAILS");
goog.dom.TagName.DFN = new goog.dom.TagName("DFN");
goog.dom.TagName.DIALOG = new goog.dom.TagName("DIALOG");
goog.dom.TagName.DIR = new goog.dom.TagName("DIR");
goog.dom.TagName.DIV = new goog.dom.TagName("DIV");
goog.dom.TagName.DL = new goog.dom.TagName("DL");
goog.dom.TagName.DT = new goog.dom.TagName("DT");
goog.dom.TagName.EM = new goog.dom.TagName("EM");
goog.dom.TagName.EMBED = new goog.dom.TagName("EMBED");
goog.dom.TagName.FIELDSET = new goog.dom.TagName("FIELDSET");
goog.dom.TagName.FIGCAPTION = new goog.dom.TagName("FIGCAPTION");
goog.dom.TagName.FIGURE = new goog.dom.TagName("FIGURE");
goog.dom.TagName.FONT = new goog.dom.TagName("FONT");
goog.dom.TagName.FOOTER = new goog.dom.TagName("FOOTER");
goog.dom.TagName.FORM = new goog.dom.TagName("FORM");
goog.dom.TagName.FRAME = new goog.dom.TagName("FRAME");
goog.dom.TagName.FRAMESET = new goog.dom.TagName("FRAMESET");
goog.dom.TagName.H1 = new goog.dom.TagName("H1");
goog.dom.TagName.H2 = new goog.dom.TagName("H2");
goog.dom.TagName.H3 = new goog.dom.TagName("H3");
goog.dom.TagName.H4 = new goog.dom.TagName("H4");
goog.dom.TagName.H5 = new goog.dom.TagName("H5");
goog.dom.TagName.H6 = new goog.dom.TagName("H6");
goog.dom.TagName.HEAD = new goog.dom.TagName("HEAD");
goog.dom.TagName.HEADER = new goog.dom.TagName("HEADER");
goog.dom.TagName.HGROUP = new goog.dom.TagName("HGROUP");
goog.dom.TagName.HR = new goog.dom.TagName("HR");
goog.dom.TagName.HTML = new goog.dom.TagName("HTML");
goog.dom.TagName.I = new goog.dom.TagName("I");
goog.dom.TagName.IFRAME = new goog.dom.TagName("IFRAME");
goog.dom.TagName.IMG = new goog.dom.TagName("IMG");
goog.dom.TagName.INPUT = new goog.dom.TagName("INPUT");
goog.dom.TagName.INS = new goog.dom.TagName("INS");
goog.dom.TagName.ISINDEX = new goog.dom.TagName("ISINDEX");
goog.dom.TagName.KBD = new goog.dom.TagName("KBD");
goog.dom.TagName.KEYGEN = new goog.dom.TagName("KEYGEN");
goog.dom.TagName.LABEL = new goog.dom.TagName("LABEL");
goog.dom.TagName.LEGEND = new goog.dom.TagName("LEGEND");
goog.dom.TagName.LI = new goog.dom.TagName("LI");
goog.dom.TagName.LINK = new goog.dom.TagName("LINK");
goog.dom.TagName.MAIN = new goog.dom.TagName("MAIN");
goog.dom.TagName.MAP = new goog.dom.TagName("MAP");
goog.dom.TagName.MARK = new goog.dom.TagName("MARK");
goog.dom.TagName.MATH = new goog.dom.TagName("MATH");
goog.dom.TagName.MENU = new goog.dom.TagName("MENU");
goog.dom.TagName.MENUITEM = new goog.dom.TagName("MENUITEM");
goog.dom.TagName.META = new goog.dom.TagName("META");
goog.dom.TagName.METER = new goog.dom.TagName("METER");
goog.dom.TagName.NAV = new goog.dom.TagName("NAV");
goog.dom.TagName.NOFRAMES = new goog.dom.TagName("NOFRAMES");
goog.dom.TagName.NOSCRIPT = new goog.dom.TagName("NOSCRIPT");
goog.dom.TagName.OBJECT = new goog.dom.TagName("OBJECT");
goog.dom.TagName.OL = new goog.dom.TagName("OL");
goog.dom.TagName.OPTGROUP = new goog.dom.TagName("OPTGROUP");
goog.dom.TagName.OPTION = new goog.dom.TagName("OPTION");
goog.dom.TagName.OUTPUT = new goog.dom.TagName("OUTPUT");
goog.dom.TagName.P = new goog.dom.TagName("P");
goog.dom.TagName.PARAM = new goog.dom.TagName("PARAM");
goog.dom.TagName.PICTURE = new goog.dom.TagName("PICTURE");
goog.dom.TagName.PRE = new goog.dom.TagName("PRE");
goog.dom.TagName.PROGRESS = new goog.dom.TagName("PROGRESS");
goog.dom.TagName.Q = new goog.dom.TagName("Q");
goog.dom.TagName.RP = new goog.dom.TagName("RP");
goog.dom.TagName.RT = new goog.dom.TagName("RT");
goog.dom.TagName.RTC = new goog.dom.TagName("RTC");
goog.dom.TagName.RUBY = new goog.dom.TagName("RUBY");
goog.dom.TagName.S = new goog.dom.TagName("S");
goog.dom.TagName.SAMP = new goog.dom.TagName("SAMP");
goog.dom.TagName.SCRIPT = new goog.dom.TagName("SCRIPT");
goog.dom.TagName.SECTION = new goog.dom.TagName("SECTION");
goog.dom.TagName.SELECT = new goog.dom.TagName("SELECT");
goog.dom.TagName.SMALL = new goog.dom.TagName("SMALL");
goog.dom.TagName.SOURCE = new goog.dom.TagName("SOURCE");
goog.dom.TagName.SPAN = new goog.dom.TagName("SPAN");
goog.dom.TagName.STRIKE = new goog.dom.TagName("STRIKE");
goog.dom.TagName.STRONG = new goog.dom.TagName("STRONG");
goog.dom.TagName.STYLE = new goog.dom.TagName("STYLE");
goog.dom.TagName.SUB = new goog.dom.TagName("SUB");
goog.dom.TagName.SUMMARY = new goog.dom.TagName("SUMMARY");
goog.dom.TagName.SUP = new goog.dom.TagName("SUP");
goog.dom.TagName.SVG = new goog.dom.TagName("SVG");
goog.dom.TagName.TABLE = new goog.dom.TagName("TABLE");
goog.dom.TagName.TBODY = new goog.dom.TagName("TBODY");
goog.dom.TagName.TD = new goog.dom.TagName("TD");
goog.dom.TagName.TEMPLATE = new goog.dom.TagName("TEMPLATE");
goog.dom.TagName.TEXTAREA = new goog.dom.TagName("TEXTAREA");
goog.dom.TagName.TFOOT = new goog.dom.TagName("TFOOT");
goog.dom.TagName.TH = new goog.dom.TagName("TH");
goog.dom.TagName.THEAD = new goog.dom.TagName("THEAD");
goog.dom.TagName.TIME = new goog.dom.TagName("TIME");
goog.dom.TagName.TITLE = new goog.dom.TagName("TITLE");
goog.dom.TagName.TR = new goog.dom.TagName("TR");
goog.dom.TagName.TRACK = new goog.dom.TagName("TRACK");
goog.dom.TagName.TT = new goog.dom.TagName("TT");
goog.dom.TagName.U = new goog.dom.TagName("U");
goog.dom.TagName.UL = new goog.dom.TagName("UL");
goog.dom.TagName.VAR = new goog.dom.TagName("VAR");
goog.dom.TagName.VIDEO = new goog.dom.TagName("VIDEO");
goog.dom.TagName.WBR = new goog.dom.TagName("WBR");
goog.labs = {};
goog.labs.userAgent = {};
goog.labs.userAgent.util = {};
goog.labs.userAgent.util.getNativeUserAgentString_ = function () {
  var a = goog.labs.userAgent.util.getNavigator_();
  return a && (a = a.userAgent) ? a : "";
};
goog.labs.userAgent.util.getNavigator_ = function () {
  return goog.global.navigator;
};
goog.labs.userAgent.util.userAgent_ = goog.labs.userAgent.util.getNativeUserAgentString_();
goog.labs.userAgent.util.setUserAgent = function (a) {
  goog.labs.userAgent.util.userAgent_ = a || goog.labs.userAgent.util.getNativeUserAgentString_();
};
goog.labs.userAgent.util.getUserAgent = function () {
  return goog.labs.userAgent.util.userAgent_;
};
goog.labs.userAgent.util.matchUserAgent = function (a) {
  var b = goog.labs.userAgent.util.getUserAgent();
  return goog.string.internal.contains(b, a);
};
goog.labs.userAgent.util.matchUserAgentIgnoreCase = function (a) {
  var b = goog.labs.userAgent.util.getUserAgent();
  return goog.string.internal.caseInsensitiveContains(b, a);
};
goog.labs.userAgent.util.extractVersionTuples = function (a) {
  for (var b = /(\w[\w ]+)\/([^\s]+)\s*(?:\((.*?)\))?/g, c = [], d; d = b.exec(a);) c.push([d[1], d[2], d[3] || void 0]);
  return c;
};
goog.labs.userAgent.browser = {};
goog.labs.userAgent.browser.matchOpera_ = function () {
  return goog.labs.userAgent.util.matchUserAgent("Opera");
};
goog.labs.userAgent.browser.matchIE_ = function () {
  return goog.labs.userAgent.util.matchUserAgent("Trident") || goog.labs.userAgent.util.matchUserAgent("MSIE");
};
goog.labs.userAgent.browser.matchEdgeHtml_ = function () {
  return goog.labs.userAgent.util.matchUserAgent("Edge");
};
goog.labs.userAgent.browser.matchEdgeChromium_ = function () {
  return goog.labs.userAgent.util.matchUserAgent("Edg/");
};
goog.labs.userAgent.browser.matchOperaChromium_ = function () {
  return goog.labs.userAgent.util.matchUserAgent("OPR");
};
goog.labs.userAgent.browser.matchFirefox_ = function () {
  return goog.labs.userAgent.util.matchUserAgent("Firefox") || goog.labs.userAgent.util.matchUserAgent("FxiOS");
};
goog.labs.userAgent.browser.matchSafari_ = function () {
  return goog.labs.userAgent.util.matchUserAgent("Safari") && !(goog.labs.userAgent.browser.matchChrome_() || goog.labs.userAgent.browser.matchCoast_() || goog.labs.userAgent.browser.matchOpera_() || goog.labs.userAgent.browser.matchEdgeHtml_() || goog.labs.userAgent.browser.matchEdgeChromium_() || goog.labs.userAgent.browser.matchOperaChromium_() || goog.labs.userAgent.browser.matchFirefox_() || goog.labs.userAgent.browser.isSilk() || goog.labs.userAgent.util.matchUserAgent("Android"));
};
goog.labs.userAgent.browser.matchCoast_ = function () {
  return goog.labs.userAgent.util.matchUserAgent("Coast");
};
goog.labs.userAgent.browser.matchIosWebview_ = function () {
  return (goog.labs.userAgent.util.matchUserAgent("iPad") || goog.labs.userAgent.util.matchUserAgent("iPhone")) && !goog.labs.userAgent.browser.matchSafari_() && !goog.labs.userAgent.browser.matchChrome_() && !goog.labs.userAgent.browser.matchCoast_() && !goog.labs.userAgent.browser.matchFirefox_() && goog.labs.userAgent.util.matchUserAgent("AppleWebKit");
};
goog.labs.userAgent.browser.matchChrome_ = function () {
  return (goog.labs.userAgent.util.matchUserAgent("Chrome") || goog.labs.userAgent.util.matchUserAgent("CriOS")) && !goog.labs.userAgent.browser.matchEdgeHtml_();
};
goog.labs.userAgent.browser.matchAndroidBrowser_ = function () {
  return goog.labs.userAgent.util.matchUserAgent("Android") && !(goog.labs.userAgent.browser.isChrome() || goog.labs.userAgent.browser.isFirefox() || goog.labs.userAgent.browser.isOpera() || goog.labs.userAgent.browser.isSilk());
};
goog.labs.userAgent.browser.isOpera = goog.labs.userAgent.browser.matchOpera_;
goog.labs.userAgent.browser.isIE = goog.labs.userAgent.browser.matchIE_;
goog.labs.userAgent.browser.isEdge = goog.labs.userAgent.browser.matchEdgeHtml_;
goog.labs.userAgent.browser.isEdgeChromium = goog.labs.userAgent.browser.matchEdgeChromium_;
goog.labs.userAgent.browser.isOperaChromium = goog.labs.userAgent.browser.matchOperaChromium_;
goog.labs.userAgent.browser.isFirefox = goog.labs.userAgent.browser.matchFirefox_;
goog.labs.userAgent.browser.isSafari = goog.labs.userAgent.browser.matchSafari_;
goog.labs.userAgent.browser.isCoast = goog.labs.userAgent.browser.matchCoast_;
goog.labs.userAgent.browser.isIosWebview = goog.labs.userAgent.browser.matchIosWebview_;
goog.labs.userAgent.browser.isChrome = goog.labs.userAgent.browser.matchChrome_;
goog.labs.userAgent.browser.isAndroidBrowser = goog.labs.userAgent.browser.matchAndroidBrowser_;
goog.labs.userAgent.browser.isSilk = function () {
  return goog.labs.userAgent.util.matchUserAgent("Silk");
};
goog.labs.userAgent.browser.getVersion = function () {
  function a(a) {
    a = goog.array.find(a, d);
    return c[a] || "";
  }
  var b = goog.labs.userAgent.util.getUserAgent();
  if (goog.labs.userAgent.browser.isIE()) return goog.labs.userAgent.browser.getIEVersion_(b);
  b = goog.labs.userAgent.util.extractVersionTuples(b);
  var c = {};
  goog.array.forEach(b, function (a) {
    c[a[0]] = a[1];
  });
  var d = goog.partial(goog.object.containsKey, c);
  return goog.labs.userAgent.browser.isOpera() ? a(["Version", "Opera"]) : goog.labs.userAgent.browser.isEdge() ? a(["Edge"]) : goog.labs.userAgent.browser.isEdgeChromium() ? a(["Edg"]) : goog.labs.userAgent.browser.isChrome() ? a(["Chrome", "CriOS"]) : (b = b[2]) && b[1] || "";
};
goog.labs.userAgent.browser.isVersionOrHigher = function (a) {
  return 0 <= goog.string.internal.compareVersions(goog.labs.userAgent.browser.getVersion(), a);
};
goog.labs.userAgent.browser.getIEVersion_ = function (a) {
  var b = /rv: *([\d\.]*)/.exec(a);
  if (b && b[1]) return b[1];
  b = "";
  var c = /MSIE +([\d\.]+)/.exec(a);
  if (c && c[1]) if (a = /Trident\/(\d.\d)/.exec(a), "7.0" == c[1]) {
    if (a && a[1]) switch (a[1]) {
      case "4.0":
        b = "8.0";
        break;
      case "5.0":
        b = "9.0";
        break;
      case "6.0":
        b = "10.0";
        break;
      case "7.0":
        b = "11.0";
    } else b = "7.0";
  } else b = c[1];
  return b;
};
goog.html.SafeHtml = function () {
  this.privateDoNotAccessOrElseSafeHtmlWrappedValue_ = "";
  this.SAFE_HTML_TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_ = goog.html.SafeHtml.TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_;
  this.dir_ = null;
};
goog.html.SafeHtml.prototype.implementsGoogI18nBidiDirectionalString = !0;
goog.html.SafeHtml.prototype.getDirection = function () {
  return this.dir_;
};
goog.html.SafeHtml.prototype.implementsGoogStringTypedString = !0;
goog.html.SafeHtml.prototype.getTypedStringValue = function () {
  return this.privateDoNotAccessOrElseSafeHtmlWrappedValue_.toString();
};
goog.DEBUG && (goog.html.SafeHtml.prototype.toString = function () {
  return "SafeHtml{" + this.privateDoNotAccessOrElseSafeHtmlWrappedValue_ + "}";
});
goog.html.SafeHtml.unwrap = function (a) {
  return goog.html.SafeHtml.unwrapTrustedHTML(a).toString();
};
goog.html.SafeHtml.unwrapTrustedHTML = function (a) {
  if (a instanceof goog.html.SafeHtml && a.constructor === goog.html.SafeHtml && a.SAFE_HTML_TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_ === goog.html.SafeHtml.TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_) return a.privateDoNotAccessOrElseSafeHtmlWrappedValue_;
  goog.asserts.fail("expected object of type SafeHtml, got '" + a + "' of type " + goog.typeOf(a));
  return "type_error:SafeHtml";
};
goog.html.SafeHtml.htmlEscape = function (a) {
  if (a instanceof goog.html.SafeHtml) return a;
  var b = "object" == typeof a,
    c = null;
  b && a.implementsGoogI18nBidiDirectionalString && (c = a.getDirection());
  a = b && a.implementsGoogStringTypedString ? a.getTypedStringValue() : String(a);
  return goog.html.SafeHtml.createSafeHtmlSecurityPrivateDoNotAccessOrElse(goog.string.internal.htmlEscape(a), c);
};
goog.html.SafeHtml.htmlEscapePreservingNewlines = function (a) {
  if (a instanceof goog.html.SafeHtml) return a;
  a = goog.html.SafeHtml.htmlEscape(a);
  return goog.html.SafeHtml.createSafeHtmlSecurityPrivateDoNotAccessOrElse(goog.string.internal.newLineToBr(goog.html.SafeHtml.unwrap(a)), a.getDirection());
};
goog.html.SafeHtml.htmlEscapePreservingNewlinesAndSpaces = function (a) {
  if (a instanceof goog.html.SafeHtml) return a;
  a = goog.html.SafeHtml.htmlEscape(a);
  return goog.html.SafeHtml.createSafeHtmlSecurityPrivateDoNotAccessOrElse(goog.string.internal.whitespaceEscape(goog.html.SafeHtml.unwrap(a)), a.getDirection());
};
goog.html.SafeHtml.from = goog.html.SafeHtml.htmlEscape;
goog.html.SafeHtml.VALID_NAMES_IN_TAG_ = /^[a-zA-Z0-9-]+$/;
goog.html.SafeHtml.URL_ATTRIBUTES_ = {
  action: !0,
  cite: !0,
  data: !0,
  formaction: !0,
  href: !0,
  manifest: !0,
  poster: !0,
  src: !0
};
goog.html.SafeHtml.NOT_ALLOWED_TAG_NAMES_ = {
  APPLET: !0,
  BASE: !0,
  EMBED: !0,
  IFRAME: !0,
  LINK: !0,
  MATH: !0,
  META: !0,
  OBJECT: !0,
  SCRIPT: !0,
  STYLE: !0,
  SVG: !0,
  TEMPLATE: !0
};
goog.html.SafeHtml.create = function (a, b, c) {
  goog.html.SafeHtml.verifyTagName(String(a));
  return goog.html.SafeHtml.createSafeHtmlTagSecurityPrivateDoNotAccessOrElse(String(a), b, c);
};
goog.html.SafeHtml.verifyTagName = function (a) {
  if (!goog.html.SafeHtml.VALID_NAMES_IN_TAG_.test(a)) throw Error("Invalid tag name <" + a + ">.");
  if (a.toUpperCase() in goog.html.SafeHtml.NOT_ALLOWED_TAG_NAMES_) throw Error("Tag name <" + a + "> is not allowed for SafeHtml.");
};
goog.html.SafeHtml.createIframe = function (a, b, c, d) {
  a && goog.html.TrustedResourceUrl.unwrap(a);
  var e = {};
  e.src = a || null;
  e.srcdoc = b && goog.html.SafeHtml.unwrap(b);
  a = goog.html.SafeHtml.combineAttributes(e, {
    sandbox: ""
  }, c);
  return goog.html.SafeHtml.createSafeHtmlTagSecurityPrivateDoNotAccessOrElse("iframe", a, d);
};
goog.html.SafeHtml.createSandboxIframe = function (a, b, c, d) {
  if (!goog.html.SafeHtml.canUseSandboxIframe()) throw Error("The browser does not support sandboxed iframes.");
  var e = {};
  e.src = a ? goog.html.SafeUrl.unwrap(goog.html.SafeUrl.sanitize(a)) : null;
  e.srcdoc = b || null;
  e.sandbox = "";
  a = goog.html.SafeHtml.combineAttributes(e, {}, c);
  return goog.html.SafeHtml.createSafeHtmlTagSecurityPrivateDoNotAccessOrElse("iframe", a, d);
};
goog.html.SafeHtml.canUseSandboxIframe = function () {
  return goog.global.HTMLIFrameElement && "sandbox" in goog.global.HTMLIFrameElement.prototype;
};
goog.html.SafeHtml.createScriptSrc = function (a, b) {
  goog.html.TrustedResourceUrl.unwrap(a);
  a = goog.html.SafeHtml.combineAttributes({
    src: a
  }, {}, b);
  return goog.html.SafeHtml.createSafeHtmlTagSecurityPrivateDoNotAccessOrElse("script", a);
};
goog.html.SafeHtml.createScript = function (a, b) {
  for (var c in b) {
    var d = c.toLowerCase();
    if ("language" == d || "src" == d || "text" == d || "type" == d) throw Error('Cannot set "' + d + '" attribute');
  }
  c = "";
  a = goog.array.concat(a);
  for (d = 0; d < a.length; d++) c += goog.html.SafeScript.unwrap(a[d]);
  a = goog.html.SafeHtml.createSafeHtmlSecurityPrivateDoNotAccessOrElse(c, goog.i18n.bidi.Dir.NEUTRAL);
  return goog.html.SafeHtml.createSafeHtmlTagSecurityPrivateDoNotAccessOrElse("script", b, a);
};
goog.html.SafeHtml.createStyle = function (a, b) {
  b = goog.html.SafeHtml.combineAttributes({
    type: "text/css"
  }, {}, b);
  var c = "";
  a = goog.array.concat(a);
  for (var d = 0; d < a.length; d++) c += goog.html.SafeStyleSheet.unwrap(a[d]);
  a = goog.html.SafeHtml.createSafeHtmlSecurityPrivateDoNotAccessOrElse(c, goog.i18n.bidi.Dir.NEUTRAL);
  return goog.html.SafeHtml.createSafeHtmlTagSecurityPrivateDoNotAccessOrElse("style", b, a);
};
goog.html.SafeHtml.createMetaRefresh = function (a, b) {
  a = goog.html.SafeUrl.unwrap(goog.html.SafeUrl.sanitize(a));
  (goog.labs.userAgent.browser.isIE() || goog.labs.userAgent.browser.isEdge()) && goog.string.internal.contains(a, ";") && (a = "'" + a.replace(/'/g, "%27") + "'");
  return goog.html.SafeHtml.createSafeHtmlTagSecurityPrivateDoNotAccessOrElse("meta", {
    "http-equiv": "refresh",
    content: (b || 0) + "; url=" + a
  });
};
goog.html.SafeHtml.getAttrNameAndValue_ = function (a, b, c) {
  if (c instanceof goog.string.Const) c = goog.string.Const.unwrap(c);else if ("style" == b.toLowerCase()) c = goog.html.SafeHtml.getStyleValue_(c);else {
    if (/^on/i.test(b)) throw Error('Attribute "' + b + '" requires goog.string.Const value, "' + c + '" given.');
    if (b.toLowerCase() in goog.html.SafeHtml.URL_ATTRIBUTES_) if (c instanceof goog.html.TrustedResourceUrl) c = goog.html.TrustedResourceUrl.unwrap(c);else if (c instanceof goog.html.SafeUrl) c = goog.html.SafeUrl.unwrap(c);else if (goog.isString(c)) c = goog.html.SafeUrl.sanitize(c).getTypedStringValue();else throw Error('Attribute "' + b + '" on tag "' + a + '" requires goog.html.SafeUrl, goog.string.Const, or string, value "' + c + '" given.');
  }
  c.implementsGoogStringTypedString && (c = c.getTypedStringValue());
  goog.asserts.assert(goog.isString(c) || goog.isNumber(c), "String or number value expected, got " + typeof c + " with value: " + c);
  return b + '="' + goog.string.internal.htmlEscape(String(c)) + '"';
};
goog.html.SafeHtml.getStyleValue_ = function (a) {
  if (!goog.isObject(a)) throw Error('The "style" attribute requires goog.html.SafeStyle or map of style properties, ' + typeof a + " given: " + a);
  a instanceof goog.html.SafeStyle || (a = goog.html.SafeStyle.create(a));
  return goog.html.SafeStyle.unwrap(a);
};
goog.html.SafeHtml.createWithDir = function (a, b, c, d) {
  b = goog.html.SafeHtml.create(b, c, d);
  b.dir_ = a;
  return b;
};
goog.html.SafeHtml.join = function (a, b) {
  a = goog.html.SafeHtml.htmlEscape(a);
  var c = a.getDirection(),
    d = [],
    e = function (a) {
      goog.isArray(a) ? goog.array.forEach(a, e) : (a = goog.html.SafeHtml.htmlEscape(a), d.push(goog.html.SafeHtml.unwrap(a)), a = a.getDirection(), c == goog.i18n.bidi.Dir.NEUTRAL ? c = a : a != goog.i18n.bidi.Dir.NEUTRAL && c != a && (c = null));
    };
  goog.array.forEach(b, e);
  return goog.html.SafeHtml.createSafeHtmlSecurityPrivateDoNotAccessOrElse(d.join(goog.html.SafeHtml.unwrap(a)), c);
};
goog.html.SafeHtml.concat = function (a) {
  return goog.html.SafeHtml.join(goog.html.SafeHtml.EMPTY, Array.prototype.slice.call(arguments));
};
goog.html.SafeHtml.concatWithDir = function (a, b) {
  var c = goog.html.SafeHtml.concat(goog.array.slice(arguments, 1));
  c.dir_ = a;
  return c;
};
goog.html.SafeHtml.TYPE_MARKER_GOOG_HTML_SECURITY_PRIVATE_ = {};
goog.html.SafeHtml.createSafeHtmlSecurityPrivateDoNotAccessOrElse = function (a, b) {
  return new goog.html.SafeHtml().initSecurityPrivateDoNotAccessOrElse_(a, b);
};
goog.html.SafeHtml.prototype.initSecurityPrivateDoNotAccessOrElse_ = function (a, b) {
  this.privateDoNotAccessOrElseSafeHtmlWrappedValue_ = goog.html.trustedtypes.PRIVATE_DO_NOT_ACCESS_OR_ELSE_POLICY ? goog.html.trustedtypes.PRIVATE_DO_NOT_ACCESS_OR_ELSE_POLICY.createHTML(a) : a;
  this.dir_ = b;
  return this;
};
goog.html.SafeHtml.createSafeHtmlTagSecurityPrivateDoNotAccessOrElse = function (a, b, c) {
  var d = null;
  var e = "<" + a + goog.html.SafeHtml.stringifyAttributes(a, b);
  goog.isDefAndNotNull(c) ? goog.isArray(c) || (c = [c]) : c = [];
  goog.dom.tags.isVoidTag(a.toLowerCase()) ? (goog.asserts.assert(!c.length, "Void tag <" + a + "> does not allow content."), e += ">") : (d = goog.html.SafeHtml.concat(c), e += ">" + goog.html.SafeHtml.unwrap(d) + "</" + a + ">", d = d.getDirection());
  (a = b && b.dir) && (d = /^(ltr|rtl|auto)$/i.test(a) ? goog.i18n.bidi.Dir.NEUTRAL : null);
  return goog.html.SafeHtml.createSafeHtmlSecurityPrivateDoNotAccessOrElse(e, d);
};
goog.html.SafeHtml.stringifyAttributes = function (a, b) {
  var c = "";
  if (b) for (var d in b) {
    if (!goog.html.SafeHtml.VALID_NAMES_IN_TAG_.test(d)) throw Error('Invalid attribute name "' + d + '".');
    var e = b[d];
    goog.isDefAndNotNull(e) && (c += " " + goog.html.SafeHtml.getAttrNameAndValue_(a, d, e));
  }
  return c;
};
goog.html.SafeHtml.combineAttributes = function (a, b, c) {
  var d = {},
    e;
  for (e in a) goog.asserts.assert(e.toLowerCase() == e, "Must be lower case"), d[e] = a[e];
  for (e in b) goog.asserts.assert(e.toLowerCase() == e, "Must be lower case"), d[e] = b[e];
  for (e in c) {
    var f = e.toLowerCase();
    if (f in a) throw Error('Cannot override "' + f + '" attribute, got "' + e + '" with value "' + c[e] + '"');
    f in b && delete d[f];
    d[e] = c[e];
  }
  return d;
};
goog.html.SafeHtml.DOCTYPE_HTML = goog.html.SafeHtml.createSafeHtmlSecurityPrivateDoNotAccessOrElse("<!DOCTYPE html>", goog.i18n.bidi.Dir.NEUTRAL);
goog.html.SafeHtml.EMPTY = goog.html.SafeHtml.createSafeHtmlSecurityPrivateDoNotAccessOrElse("", goog.i18n.bidi.Dir.NEUTRAL);
goog.html.SafeHtml.BR = goog.html.SafeHtml.createSafeHtmlSecurityPrivateDoNotAccessOrElse("<br>", goog.i18n.bidi.Dir.NEUTRAL);
goog.html.uncheckedconversions = {};
goog.html.uncheckedconversions.safeHtmlFromStringKnownToSatisfyTypeContract = function (a, b, c) {
  goog.asserts.assertString(goog.string.Const.unwrap(a), "must provide justification");
  goog.asserts.assert(!goog.string.internal.isEmptyOrWhitespace(goog.string.Const.unwrap(a)), "must provide non-empty justification");
  return goog.html.SafeHtml.createSafeHtmlSecurityPrivateDoNotAccessOrElse(b, c || null);
};
goog.html.uncheckedconversions.safeScriptFromStringKnownToSatisfyTypeContract = function (a, b) {
  goog.asserts.assertString(goog.string.Const.unwrap(a), "must provide justification");
  goog.asserts.assert(!goog.string.internal.isEmptyOrWhitespace(goog.string.Const.unwrap(a)), "must provide non-empty justification");
  return goog.html.SafeScript.createSafeScriptSecurityPrivateDoNotAccessOrElse(b);
};
goog.html.uncheckedconversions.safeStyleFromStringKnownToSatisfyTypeContract = function (a, b) {
  goog.asserts.assertString(goog.string.Const.unwrap(a), "must provide justification");
  goog.asserts.assert(!goog.string.internal.isEmptyOrWhitespace(goog.string.Const.unwrap(a)), "must provide non-empty justification");
  return goog.html.SafeStyle.createSafeStyleSecurityPrivateDoNotAccessOrElse(b);
};
goog.html.uncheckedconversions.safeStyleSheetFromStringKnownToSatisfyTypeContract = function (a, b) {
  goog.asserts.assertString(goog.string.Const.unwrap(a), "must provide justification");
  goog.asserts.assert(!goog.string.internal.isEmptyOrWhitespace(goog.string.Const.unwrap(a)), "must provide non-empty justification");
  return goog.html.SafeStyleSheet.createSafeStyleSheetSecurityPrivateDoNotAccessOrElse(b);
};
goog.html.uncheckedconversions.safeUrlFromStringKnownToSatisfyTypeContract = function (a, b) {
  goog.asserts.assertString(goog.string.Const.unwrap(a), "must provide justification");
  goog.asserts.assert(!goog.string.internal.isEmptyOrWhitespace(goog.string.Const.unwrap(a)), "must provide non-empty justification");
  return goog.html.SafeUrl.createSafeUrlSecurityPrivateDoNotAccessOrElse(b);
};
goog.html.uncheckedconversions.trustedResourceUrlFromStringKnownToSatisfyTypeContract = function (a, b) {
  goog.asserts.assertString(goog.string.Const.unwrap(a), "must provide justification");
  goog.asserts.assert(!goog.string.internal.isEmptyOrWhitespace(goog.string.Const.unwrap(a)), "must provide non-empty justification");
  return goog.html.TrustedResourceUrl.createTrustedResourceUrlSecurityPrivateDoNotAccessOrElse(b);
};
goog.dom.asserts = {};
goog.dom.asserts.assertIsLocation = function (a) {
  if (goog.asserts.ENABLE_ASSERTS) {
    var b = goog.dom.asserts.getWindow_(a);
    b && (!a || !(a instanceof b.Location) && a instanceof b.Element) && goog.asserts.fail("Argument is not a Location (or a non-Element mock); got: %s", goog.dom.asserts.debugStringForType_(a));
  }
  return a;
};
goog.dom.asserts.assertIsElementType_ = function (a, b) {
  if (goog.asserts.ENABLE_ASSERTS) {
    var c = goog.dom.asserts.getWindow_(a);
    c && "undefined" != typeof c[b] && (a && (a instanceof c[b] || !(a instanceof c.Location || a instanceof c.Element)) || goog.asserts.fail("Argument is not a %s (or a non-Element, non-Location mock); got: %s", b, goog.dom.asserts.debugStringForType_(a)));
  }
  return a;
};
goog.dom.asserts.assertIsHTMLAnchorElement = function (a) {
  return goog.dom.asserts.assertIsElementType_(a, "HTMLAnchorElement");
};
goog.dom.asserts.assertIsHTMLButtonElement = function (a) {
  return goog.dom.asserts.assertIsElementType_(a, "HTMLButtonElement");
};
goog.dom.asserts.assertIsHTMLLinkElement = function (a) {
  return goog.dom.asserts.assertIsElementType_(a, "HTMLLinkElement");
};
goog.dom.asserts.assertIsHTMLImageElement = function (a) {
  return goog.dom.asserts.assertIsElementType_(a, "HTMLImageElement");
};
goog.dom.asserts.assertIsHTMLAudioElement = function (a) {
  return goog.dom.asserts.assertIsElementType_(a, "HTMLAudioElement");
};
goog.dom.asserts.assertIsHTMLVideoElement = function (a) {
  return goog.dom.asserts.assertIsElementType_(a, "HTMLVideoElement");
};
goog.dom.asserts.assertIsHTMLInputElement = function (a) {
  return goog.dom.asserts.assertIsElementType_(a, "HTMLInputElement");
};
goog.dom.asserts.assertIsHTMLTextAreaElement = function (a) {
  return goog.dom.asserts.assertIsElementType_(a, "HTMLTextAreaElement");
};
goog.dom.asserts.assertIsHTMLCanvasElement = function (a) {
  return goog.dom.asserts.assertIsElementType_(a, "HTMLCanvasElement");
};
goog.dom.asserts.assertIsHTMLEmbedElement = function (a) {
  return goog.dom.asserts.assertIsElementType_(a, "HTMLEmbedElement");
};
goog.dom.asserts.assertIsHTMLFormElement = function (a) {
  return goog.dom.asserts.assertIsElementType_(a, "HTMLFormElement");
};
goog.dom.asserts.assertIsHTMLFrameElement = function (a) {
  return goog.dom.asserts.assertIsElementType_(a, "HTMLFrameElement");
};
goog.dom.asserts.assertIsHTMLIFrameElement = function (a) {
  return goog.dom.asserts.assertIsElementType_(a, "HTMLIFrameElement");
};
goog.dom.asserts.assertIsHTMLObjectElement = function (a) {
  return goog.dom.asserts.assertIsElementType_(a, "HTMLObjectElement");
};
goog.dom.asserts.assertIsHTMLScriptElement = function (a) {
  return goog.dom.asserts.assertIsElementType_(a, "HTMLScriptElement");
};
goog.dom.asserts.debugStringForType_ = function (a) {
  if (goog.isObject(a)) try {
    return a.constructor.displayName || a.constructor.name || Object.prototype.toString.call(a);
  } catch (b) {
    return "<object could not be stringified>";
  } else return void 0 === a ? "undefined" : null === a ? "null" : typeof a;
};
goog.dom.asserts.getWindow_ = function (a) {
  try {
    var b = a && a.ownerDocument,
      c = b && (b.defaultView || b.parentWindow);
    c = c || goog.global;
    if (c.Element && c.Location) return c;
  } catch (d) {}
  return null;
};
goog.functions = {};
goog.functions.constant = function (a) {
  return function () {
    return a;
  };
};
goog.functions.FALSE = function () {
  return !1;
};
goog.functions.TRUE = function () {
  return !0;
};
goog.functions.NULL = function () {
  return null;
};
goog.functions.identity = function (a, b) {
  return a;
};
goog.functions.error = function (a) {
  return function () {
    throw Error(a);
  };
};
goog.functions.fail = function (a) {
  return function () {
    throw a;
  };
};
goog.functions.lock = function (a, b) {
  b = b || 0;
  return function () {
    return a.apply(this, Array.prototype.slice.call(arguments, 0, b));
  };
};
goog.functions.nth = function (a) {
  return function () {
    return arguments[a];
  };
};
goog.functions.partialRight = function (a, b) {
  var c = Array.prototype.slice.call(arguments, 1);
  return function () {
    var b = Array.prototype.slice.call(arguments);
    b.push.apply(b, c);
    return a.apply(this, b);
  };
};
goog.functions.withReturnValue = function (a, b) {
  return goog.functions.sequence(a, goog.functions.constant(b));
};
goog.functions.equalTo = function (a, b) {
  return function (c) {
    return b ? a == c : a === c;
  };
};
goog.functions.compose = function (a, b) {
  var c = arguments,
    d = c.length;
  return function () {
    var a;
    d && (a = c[d - 1].apply(this, arguments));
    for (var b = d - 2; 0 <= b; b--) a = c[b].call(this, a);
    return a;
  };
};
goog.functions.sequence = function (a) {
  var b = arguments,
    c = b.length;
  return function () {
    for (var a, e = 0; e < c; e++) a = b[e].apply(this, arguments);
    return a;
  };
};
goog.functions.and = function (a) {
  var b = arguments,
    c = b.length;
  return function () {
    for (var a = 0; a < c; a++) if (!b[a].apply(this, arguments)) return !1;
    return !0;
  };
};
goog.functions.or = function (a) {
  var b = arguments,
    c = b.length;
  return function () {
    for (var a = 0; a < c; a++) if (b[a].apply(this, arguments)) return !0;
    return !1;
  };
};
goog.functions.not = function (a) {
  return function () {
    return !a.apply(this, arguments);
  };
};
goog.functions.create = function (a, b) {
  var c = function () {};
  c.prototype = a.prototype;
  c = new c();
  a.apply(c, Array.prototype.slice.call(arguments, 1));
  return c;
};
goog.functions.CACHE_RETURN_VALUE = !0;
goog.functions.cacheReturnValue = function (a) {
  var b = !1,
    c;
  return function () {
    if (!goog.functions.CACHE_RETURN_VALUE) return a();
    b || (c = a(), b = !0);
    return c;
  };
};
goog.functions.once = function (a) {
  var b = a;
  return function () {
    if (b) {
      var a = b;
      b = null;
      a();
    }
  };
};
goog.functions.debounce = function (a, b, c) {
  var d = 0;
  return function (e) {
    goog.global.clearTimeout(d);
    var f = arguments;
    d = goog.global.setTimeout(function () {
      a.apply(c, f);
    }, b);
  };
};
goog.functions.throttle = function (a, b, c) {
  var d = 0,
    e = !1,
    f = [],
    g = function () {
      d = 0;
      e && (e = !1, h());
    },
    h = function () {
      d = goog.global.setTimeout(g, b);
      a.apply(c, f);
    };
  return function (a) {
    f = arguments;
    d ? e = !0 : h();
  };
};
goog.functions.rateLimit = function (a, b, c) {
  var d = 0,
    e = function () {
      d = 0;
    };
  return function (f) {
    d || (d = goog.global.setTimeout(e, b), a.apply(c, arguments));
  };
};
goog.dom.safe = {};
goog.dom.safe.InsertAdjacentHtmlPosition = {
  AFTERBEGIN: "afterbegin",
  AFTEREND: "afterend",
  BEFOREBEGIN: "beforebegin",
  BEFOREEND: "beforeend"
};
goog.dom.safe.insertAdjacentHtml = function (a, b, c) {
  a.insertAdjacentHTML(b, goog.html.SafeHtml.unwrapTrustedHTML(c));
};
goog.dom.safe.SET_INNER_HTML_DISALLOWED_TAGS_ = {
  MATH: !0,
  SCRIPT: !0,
  STYLE: !0,
  SVG: !0,
  TEMPLATE: !0
};
goog.dom.safe.isInnerHtmlCleanupRecursive_ = goog.functions.cacheReturnValue(function () {
  if (goog.DEBUG && "undefined" === typeof document) return !1;
  var a = document.createElement("div"),
    b = document.createElement("div");
  b.appendChild(document.createElement("div"));
  a.appendChild(b);
  if (goog.DEBUG && !a.firstChild) return !1;
  b = a.firstChild.firstChild;
  a.innerHTML = goog.html.SafeHtml.unwrapTrustedHTML(goog.html.SafeHtml.EMPTY);
  return !b.parentElement;
});
goog.dom.safe.unsafeSetInnerHtmlDoNotUseOrElse = function (a, b) {
  if (goog.dom.safe.isInnerHtmlCleanupRecursive_()) for (; a.lastChild;) a.removeChild(a.lastChild);
  a.innerHTML = goog.html.SafeHtml.unwrapTrustedHTML(b);
};
goog.dom.safe.setInnerHtml = function (a, b) {
  if (goog.asserts.ENABLE_ASSERTS) {
    var c = a.tagName.toUpperCase();
    if (goog.dom.safe.SET_INNER_HTML_DISALLOWED_TAGS_[c]) throw Error("goog.dom.safe.setInnerHtml cannot be used to set content of " + a.tagName + ".");
  }
  goog.dom.safe.unsafeSetInnerHtmlDoNotUseOrElse(a, b);
};
goog.dom.safe.setOuterHtml = function (a, b) {
  a.outerHTML = goog.html.SafeHtml.unwrapTrustedHTML(b);
};
goog.dom.safe.setFormElementAction = function (a, b) {
  b = b instanceof goog.html.SafeUrl ? b : goog.html.SafeUrl.sanitizeAssertUnchanged(b);
  goog.dom.asserts.assertIsHTMLFormElement(a).action = goog.html.SafeUrl.unwrapTrustedURL(b);
};
goog.dom.safe.setButtonFormAction = function (a, b) {
  b = b instanceof goog.html.SafeUrl ? b : goog.html.SafeUrl.sanitizeAssertUnchanged(b);
  goog.dom.asserts.assertIsHTMLButtonElement(a).formAction = goog.html.SafeUrl.unwrapTrustedURL(b);
};
goog.dom.safe.setInputFormAction = function (a, b) {
  b = b instanceof goog.html.SafeUrl ? b : goog.html.SafeUrl.sanitizeAssertUnchanged(b);
  goog.dom.asserts.assertIsHTMLInputElement(a).formAction = goog.html.SafeUrl.unwrapTrustedURL(b);
};
goog.dom.safe.setStyle = function (a, b) {
  a.style.cssText = goog.html.SafeStyle.unwrap(b);
};
goog.dom.safe.documentWrite = function (a, b) {
  a.write(goog.html.SafeHtml.unwrapTrustedHTML(b));
};
goog.dom.safe.setAnchorHref = function (a, b) {
  goog.dom.asserts.assertIsHTMLAnchorElement(a);
  b = b instanceof goog.html.SafeUrl ? b : goog.html.SafeUrl.sanitizeAssertUnchanged(b);
  a.href = goog.html.SafeUrl.unwrapTrustedURL(b);
};
goog.dom.safe.setImageSrc = function (a, b) {
  goog.dom.asserts.assertIsHTMLImageElement(a);
  if (!(b instanceof goog.html.SafeUrl)) {
    var c = /^data:image\//i.test(b);
    b = goog.html.SafeUrl.sanitizeAssertUnchanged(b, c);
  }
  a.src = goog.html.SafeUrl.unwrapTrustedURL(b);
};
goog.dom.safe.setAudioSrc = function (a, b) {
  goog.dom.asserts.assertIsHTMLAudioElement(a);
  if (!(b instanceof goog.html.SafeUrl)) {
    var c = /^data:audio\//i.test(b);
    b = goog.html.SafeUrl.sanitizeAssertUnchanged(b, c);
  }
  a.src = goog.html.SafeUrl.unwrapTrustedURL(b);
};
goog.dom.safe.setVideoSrc = function (a, b) {
  goog.dom.asserts.assertIsHTMLVideoElement(a);
  if (!(b instanceof goog.html.SafeUrl)) {
    var c = /^data:video\//i.test(b);
    b = goog.html.SafeUrl.sanitizeAssertUnchanged(b, c);
  }
  a.src = goog.html.SafeUrl.unwrapTrustedURL(b);
};
goog.dom.safe.setEmbedSrc = function (a, b) {
  goog.dom.asserts.assertIsHTMLEmbedElement(a);
  a.src = goog.html.TrustedResourceUrl.unwrapTrustedScriptURL(b);
};
goog.dom.safe.setFrameSrc = function (a, b) {
  goog.dom.asserts.assertIsHTMLFrameElement(a);
  a.src = goog.html.TrustedResourceUrl.unwrapTrustedURL(b);
};
goog.dom.safe.setIframeSrc = function (a, b) {
  goog.dom.asserts.assertIsHTMLIFrameElement(a);
  a.src = goog.html.TrustedResourceUrl.unwrapTrustedURL(b);
};
goog.dom.safe.setIframeSrcdoc = function (a, b) {
  goog.dom.asserts.assertIsHTMLIFrameElement(a);
  a.srcdoc = goog.html.SafeHtml.unwrapTrustedHTML(b);
};
goog.dom.safe.setLinkHrefAndRel = function (a, b, c) {
  goog.dom.asserts.assertIsHTMLLinkElement(a);
  a.rel = c;
  goog.string.internal.caseInsensitiveContains(c, "stylesheet") ? (goog.asserts.assert(b instanceof goog.html.TrustedResourceUrl, 'URL must be TrustedResourceUrl because "rel" contains "stylesheet"'), a.href = goog.html.TrustedResourceUrl.unwrapTrustedURL(b)) : a.href = b instanceof goog.html.TrustedResourceUrl ? goog.html.TrustedResourceUrl.unwrapTrustedURL(b) : b instanceof goog.html.SafeUrl ? goog.html.SafeUrl.unwrapTrustedURL(b) : goog.html.SafeUrl.unwrapTrustedURL(goog.html.SafeUrl.sanitizeAssertUnchanged(b));
};
goog.dom.safe.setObjectData = function (a, b) {
  goog.dom.asserts.assertIsHTMLObjectElement(a);
  a.data = goog.html.TrustedResourceUrl.unwrapTrustedScriptURL(b);
};
goog.dom.safe.setScriptSrc = function (a, b) {
  goog.dom.asserts.assertIsHTMLScriptElement(a);
  a.src = goog.html.TrustedResourceUrl.unwrapTrustedScriptURL(b);
  (b = goog.getScriptNonce()) && a.setAttribute("nonce", b);
};
goog.dom.safe.setScriptContent = function (a, b) {
  goog.dom.asserts.assertIsHTMLScriptElement(a);
  a.text = goog.html.SafeScript.unwrapTrustedScript(b);
  (b = goog.getScriptNonce()) && a.setAttribute("nonce", b);
};
goog.dom.safe.setLocationHref = function (a, b) {
  goog.dom.asserts.assertIsLocation(a);
  b = b instanceof goog.html.SafeUrl ? b : goog.html.SafeUrl.sanitizeAssertUnchanged(b);
  a.href = goog.html.SafeUrl.unwrapTrustedURL(b);
};
goog.dom.safe.assignLocation = function (a, b) {
  goog.dom.asserts.assertIsLocation(a);
  b = b instanceof goog.html.SafeUrl ? b : goog.html.SafeUrl.sanitizeAssertUnchanged(b);
  a.assign(goog.html.SafeUrl.unwrapTrustedURL(b));
};
goog.dom.safe.replaceLocation = function (a, b) {
  goog.dom.asserts.assertIsLocation(a);
  b = b instanceof goog.html.SafeUrl ? b : goog.html.SafeUrl.sanitizeAssertUnchanged(b);
  a.replace(goog.html.SafeUrl.unwrapTrustedURL(b));
};
goog.dom.safe.openInWindow = function (a, b, c, d, e) {
  a = a instanceof goog.html.SafeUrl ? a : goog.html.SafeUrl.sanitizeAssertUnchanged(a);
  return (b || goog.global).open(goog.html.SafeUrl.unwrapTrustedURL(a), c ? goog.string.Const.unwrap(c) : "", d, e);
};
goog.dom.safe.parseFromStringHtml = function (a, b) {
  return goog.dom.safe.parseFromString(a, b, "text/html");
};
goog.dom.safe.parseFromString = function (a, b, c) {
  return a.parseFromString(goog.html.SafeHtml.unwrapTrustedHTML(b), c);
};
goog.dom.safe.createImageFromBlob = function (a) {
  if (!/^image\/.*/g.test(a.type)) throw Error("goog.dom.safe.createImageFromBlob only accepts MIME type image/.*.");
  var b = goog.global.URL.createObjectURL(a);
  a = new goog.global.Image();
  a.onload = function () {
    goog.global.URL.revokeObjectURL(b);
  };
  goog.dom.safe.setImageSrc(a, goog.html.uncheckedconversions.safeUrlFromStringKnownToSatisfyTypeContract(goog.string.Const.from("Image blob URL."), b));
  return a;
};
goog.string.DETECT_DOUBLE_ESCAPING = !1;
goog.string.FORCE_NON_DOM_HTML_UNESCAPING = !1;
goog.string.Unicode = {
  NBSP: "\u00a0"
};
goog.string.startsWith = goog.string.internal.startsWith;
goog.string.endsWith = goog.string.internal.endsWith;
goog.string.caseInsensitiveStartsWith = goog.string.internal.caseInsensitiveStartsWith;
goog.string.caseInsensitiveEndsWith = goog.string.internal.caseInsensitiveEndsWith;
goog.string.caseInsensitiveEquals = goog.string.internal.caseInsensitiveEquals;
goog.string.subs = function (a, b) {
  for (var c = a.split("%s"), d = "", e = Array.prototype.slice.call(arguments, 1); e.length && 1 < c.length;) d += c.shift() + e.shift();
  return d + c.join("%s");
};
goog.string.collapseWhitespace = function (a) {
  return a.replace(/[\s\xa0]+/g, " ").replace(/^\s+|\s+$/g, "");
};
goog.string.isEmptyOrWhitespace = goog.string.internal.isEmptyOrWhitespace;
goog.string.isEmptyString = function (a) {
  return 0 == a.length;
};
goog.string.isEmpty = goog.string.isEmptyOrWhitespace;
goog.string.isEmptyOrWhitespaceSafe = function (a) {
  return goog.string.isEmptyOrWhitespace(goog.string.makeSafe(a));
};
goog.string.isEmptySafe = goog.string.isEmptyOrWhitespaceSafe;
goog.string.isBreakingWhitespace = function (a) {
  return !/[^\t\n\r ]/.test(a);
};
goog.string.isAlpha = function (a) {
  return !/[^a-zA-Z]/.test(a);
};
goog.string.isNumeric = function (a) {
  return !/[^0-9]/.test(a);
};
goog.string.isAlphaNumeric = function (a) {
  return !/[^a-zA-Z0-9]/.test(a);
};
goog.string.isSpace = function (a) {
  return " " == a;
};
goog.string.isUnicodeChar = function (a) {
  return 1 == a.length && " " <= a && "~" >= a || "\u0080" <= a && "\ufffd" >= a;
};
goog.string.stripNewlines = function (a) {
  return a.replace(/(\r\n|\r|\n)+/g, " ");
};
goog.string.canonicalizeNewlines = function (a) {
  return a.replace(/(\r\n|\r|\n)/g, "\n");
};
goog.string.normalizeWhitespace = function (a) {
  return a.replace(/\xa0|\s/g, " ");
};
goog.string.normalizeSpaces = function (a) {
  return a.replace(/\xa0|[ \t]+/g, " ");
};
goog.string.collapseBreakingSpaces = function (a) {
  return a.replace(/[\t\r\n ]+/g, " ").replace(/^[\t\r\n ]+|[\t\r\n ]+$/g, "");
};
goog.string.trim = goog.string.internal.trim;
goog.string.trimLeft = function (a) {
  return a.replace(/^[\s\xa0]+/, "");
};
goog.string.trimRight = function (a) {
  return a.replace(/[\s\xa0]+$/, "");
};
goog.string.caseInsensitiveCompare = goog.string.internal.caseInsensitiveCompare;
goog.string.numberAwareCompare_ = function (a, b, c) {
  if (a == b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  for (var d = a.toLowerCase().match(c), e = b.toLowerCase().match(c), f = Math.min(d.length, e.length), g = 0; g < f; g++) {
    c = d[g];
    var h = e[g];
    if (c != h) return a = parseInt(c, 10), !isNaN(a) && (b = parseInt(h, 10), !isNaN(b) && a - b) ? a - b : c < h ? -1 : 1;
  }
  return d.length != e.length ? d.length - e.length : a < b ? -1 : 1;
};
goog.string.intAwareCompare = function (a, b) {
  return goog.string.numberAwareCompare_(a, b, /\d+|\D+/g);
};
goog.string.floatAwareCompare = function (a, b) {
  return goog.string.numberAwareCompare_(a, b, /\d+|\.\d+|\D+/g);
};
goog.string.numerateCompare = goog.string.floatAwareCompare;
goog.string.urlEncode = function (a) {
  return encodeURIComponent(String(a));
};
goog.string.urlDecode = function (a) {
  return decodeURIComponent(a.replace(/\+/g, " "));
};
goog.string.newLineToBr = goog.string.internal.newLineToBr;
goog.string.htmlEscape = function (a, b) {
  a = goog.string.internal.htmlEscape(a, b);
  goog.string.DETECT_DOUBLE_ESCAPING && (a = a.replace(goog.string.E_RE_, "&#101;"));
  return a;
};
goog.string.E_RE_ = /e/g;
goog.string.unescapeEntities = function (a) {
  return goog.string.contains(a, "&") ? !goog.string.FORCE_NON_DOM_HTML_UNESCAPING && "document" in goog.global ? goog.string.unescapeEntitiesUsingDom_(a) : goog.string.unescapePureXmlEntities_(a) : a;
};
goog.string.unescapeEntitiesWithDocument = function (a, b) {
  return goog.string.contains(a, "&") ? goog.string.unescapeEntitiesUsingDom_(a, b) : a;
};
goog.string.unescapeEntitiesUsingDom_ = function (a, b) {
  var c = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"'
  };
  var d = b ? b.createElement("div") : goog.global.document.createElement("div");
  return a.replace(goog.string.HTML_ENTITY_PATTERN_, function (a, b) {
    var e = c[a];
    if (e) return e;
    "#" == b.charAt(0) && (b = Number("0" + b.substr(1)), isNaN(b) || (e = String.fromCharCode(b)));
    e || (goog.dom.safe.setInnerHtml(d, goog.html.uncheckedconversions.safeHtmlFromStringKnownToSatisfyTypeContract(goog.string.Const.from("Single HTML entity."), a + " ")), e = d.firstChild.nodeValue.slice(0, -1));
    return c[a] = e;
  });
};
goog.string.unescapePureXmlEntities_ = function (a) {
  return a.replace(/&([^;]+);/g, function (a, c) {
    switch (c) {
      case "amp":
        return "&";
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "quot":
        return '"';
      default:
        return "#" != c.charAt(0) || (c = Number("0" + c.substr(1)), isNaN(c)) ? a : String.fromCharCode(c);
    }
  });
};
goog.string.HTML_ENTITY_PATTERN_ = /&([^;\s<&]+);?/g;
goog.string.whitespaceEscape = function (a, b) {
  return goog.string.newLineToBr(a.replace(/  /g, " &#160;"), b);
};
goog.string.preserveSpaces = function (a) {
  return a.replace(/(^|[\n ]) /g, "$1" + goog.string.Unicode.NBSP);
};
goog.string.stripQuotes = function (a, b) {
  for (var c = b.length, d = 0; d < c; d++) {
    var e = 1 == c ? b : b.charAt(d);
    if (a.charAt(0) == e && a.charAt(a.length - 1) == e) return a.substring(1, a.length - 1);
  }
  return a;
};
goog.string.truncate = function (a, b, c) {
  c && (a = goog.string.unescapeEntities(a));
  a.length > b && (a = a.substring(0, b - 3) + "...");
  c && (a = goog.string.htmlEscape(a));
  return a;
};
goog.string.truncateMiddle = function (a, b, c, d) {
  c && (a = goog.string.unescapeEntities(a));
  if (d && a.length > b) {
    d > b && (d = b);
    var e = a.length - d;
    a = a.substring(0, b - d) + "..." + a.substring(e);
  } else a.length > b && (d = Math.floor(b / 2), e = a.length - d, a = a.substring(0, d + b % 2) + "..." + a.substring(e));
  c && (a = goog.string.htmlEscape(a));
  return a;
};
goog.string.specialEscapeChars_ = {
  "\x00": "\\0",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "\t": "\\t",
  "\x0B": "\\x0B",
  '"': '\\"',
  "\\": "\\\\",
  "<": "\\u003C"
};
goog.string.jsEscapeCache_ = {
  "'": "\\'"
};
goog.string.quote = function (a) {
  a = String(a);
  for (var b = ['"'], c = 0; c < a.length; c++) {
    var d = a.charAt(c),
      e = d.charCodeAt(0);
    b[c + 1] = goog.string.specialEscapeChars_[d] || (31 < e && 127 > e ? d : goog.string.escapeChar(d));
  }
  b.push('"');
  return b.join("");
};
goog.string.escapeString = function (a) {
  for (var b = [], c = 0; c < a.length; c++) b[c] = goog.string.escapeChar(a.charAt(c));
  return b.join("");
};
goog.string.escapeChar = function (a) {
  if (a in goog.string.jsEscapeCache_) return goog.string.jsEscapeCache_[a];
  if (a in goog.string.specialEscapeChars_) return goog.string.jsEscapeCache_[a] = goog.string.specialEscapeChars_[a];
  var b = a.charCodeAt(0);
  if (31 < b && 127 > b) var c = a;else {
    if (256 > b) {
      if (c = "\\x", 16 > b || 256 < b) c += "0";
    } else c = "\\u", 4096 > b && (c += "0");
    c += b.toString(16).toUpperCase();
  }
  return goog.string.jsEscapeCache_[a] = c;
};
goog.string.contains = goog.string.internal.contains;
goog.string.caseInsensitiveContains = goog.string.internal.caseInsensitiveContains;
goog.string.countOf = function (a, b) {
  return a && b ? a.split(b).length - 1 : 0;
};
goog.string.removeAt = function (a, b, c) {
  var d = a;
  0 <= b && b < a.length && 0 < c && (d = a.substr(0, b) + a.substr(b + c, a.length - b - c));
  return d;
};
goog.string.remove = function (a, b) {
  return a.replace(b, "");
};
goog.string.removeAll = function (a, b) {
  b = new RegExp(goog.string.regExpEscape(b), "g");
  return a.replace(b, "");
};
goog.string.replaceAll = function (a, b, c) {
  b = new RegExp(goog.string.regExpEscape(b), "g");
  return a.replace(b, c.replace(/\$/g, "$$$$"));
};
goog.string.regExpEscape = function (a) {
  return String(a).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, "\\$1").replace(/\x08/g, "\\x08");
};
goog.string.repeat = String.prototype.repeat ? function (a, b) {
  return a.repeat(b);
} : function (a, b) {
  return Array(b + 1).join(a);
};
goog.string.padNumber = function (a, b, c) {
  a = goog.isDef(c) ? a.toFixed(c) : String(a);
  c = a.indexOf(".");
  -1 == c && (c = a.length);
  return goog.string.repeat("0", Math.max(0, b - c)) + a;
};
goog.string.makeSafe = function (a) {
  return null == a ? "" : String(a);
};
goog.string.buildString = function (a) {
  return Array.prototype.join.call(arguments, "");
};
goog.string.getRandomString = function () {
  return Math.floor(2147483648 * Math.random()).toString(36) + Math.abs(Math.floor(2147483648 * Math.random()) ^ goog.now()).toString(36);
};
goog.string.compareVersions = goog.string.internal.compareVersions;
goog.string.hashCode = function (a) {
  for (var b = 0, c = 0; c < a.length; ++c) b = 31 * b + a.charCodeAt(c) >>> 0;
  return b;
};
goog.string.uniqueStringCounter_ = 2147483648 * Math.random() | 0;
goog.string.createUniqueString = function () {
  return "goog_" + goog.string.uniqueStringCounter_++;
};
goog.string.toNumber = function (a) {
  var b = Number(a);
  return 0 == b && goog.string.isEmptyOrWhitespace(a) ? NaN : b;
};
goog.string.isLowerCamelCase = function (a) {
  return /^[a-z]+([A-Z][a-z]*)*$/.test(a);
};
goog.string.isUpperCamelCase = function (a) {
  return /^([A-Z][a-z]*)+$/.test(a);
};
goog.string.toCamelCase = function (a) {
  return String(a).replace(/\-([a-z])/g, function (a, c) {
    return c.toUpperCase();
  });
};
goog.string.toSelectorCase = function (a) {
  return String(a).replace(/([A-Z])/g, "-$1").toLowerCase();
};
goog.string.toTitleCase = function (a, b) {
  b = goog.isString(b) ? goog.string.regExpEscape(b) : "\\s";
  return a.replace(new RegExp("(^" + (b ? "|[" + b + "]+" : "") + ")([a-z])", "g"), function (a, b, e) {
    return b + e.toUpperCase();
  });
};
goog.string.capitalize = function (a) {
  return String(a.charAt(0)).toUpperCase() + String(a.substr(1)).toLowerCase();
};
goog.string.parseInt = function (a) {
  isFinite(a) && (a = String(a));
  return goog.isString(a) ? /^\s*-?0x/i.test(a) ? parseInt(a, 16) : parseInt(a, 10) : NaN;
};
goog.string.splitLimit = function (a, b, c) {
  a = a.split(b);
  for (var d = []; 0 < c && a.length;) d.push(a.shift()), c--;
  a.length && d.push(a.join(b));
  return d;
};
goog.string.lastComponent = function (a, b) {
  if (b) "string" == typeof b && (b = [b]);else return a;
  for (var c = -1, d = 0; d < b.length; d++) if ("" != b[d]) {
    var e = a.lastIndexOf(b[d]);
    e > c && (c = e);
  }
  return -1 == c ? a : a.slice(c + 1);
};
goog.string.editDistance = function (a, b) {
  var c = [],
    d = [];
  if (a == b) return 0;
  if (!a.length || !b.length) return Math.max(a.length, b.length);
  for (var e = 0; e < b.length + 1; e++) c[e] = e;
  for (e = 0; e < a.length; e++) {
    d[0] = e + 1;
    for (var f = 0; f < b.length; f++) d[f + 1] = Math.min(d[f] + 1, c[f + 1] + 1, c[f] + Number(a[e] != b[f]));
    for (f = 0; f < c.length; f++) c[f] = d[f];
  }
  return d[b.length];
};
goog.labs.userAgent.platform = {};
goog.labs.userAgent.platform.isAndroid = function () {
  return goog.labs.userAgent.util.matchUserAgent("Android");
};
goog.labs.userAgent.platform.isIpod = function () {
  return goog.labs.userAgent.util.matchUserAgent("iPod");
};
goog.labs.userAgent.platform.isIphone = function () {
  return goog.labs.userAgent.util.matchUserAgent("iPhone") && !goog.labs.userAgent.util.matchUserAgent("iPod") && !goog.labs.userAgent.util.matchUserAgent("iPad");
};
goog.labs.userAgent.platform.isIpad = function () {
  return goog.labs.userAgent.util.matchUserAgent("iPad");
};
goog.labs.userAgent.platform.isIos = function () {
  return goog.labs.userAgent.platform.isIphone() || goog.labs.userAgent.platform.isIpad() || goog.labs.userAgent.platform.isIpod();
};
goog.labs.userAgent.platform.isMacintosh = function () {
  return goog.labs.userAgent.util.matchUserAgent("Macintosh");
};
goog.labs.userAgent.platform.isLinux = function () {
  return goog.labs.userAgent.util.matchUserAgent("Linux");
};
goog.labs.userAgent.platform.isWindows = function () {
  return goog.labs.userAgent.util.matchUserAgent("Windows");
};
goog.labs.userAgent.platform.isChromeOS = function () {
  return goog.labs.userAgent.util.matchUserAgent("CrOS");
};
goog.labs.userAgent.platform.isChromecast = function () {
  return goog.labs.userAgent.util.matchUserAgent("CrKey");
};
goog.labs.userAgent.platform.isKaiOS = function () {
  return goog.labs.userAgent.util.matchUserAgentIgnoreCase("KaiOS");
};
goog.labs.userAgent.platform.isGo2Phone = function () {
  return goog.labs.userAgent.util.matchUserAgentIgnoreCase("GAFP");
};
goog.labs.userAgent.platform.getVersion = function () {
  var a = goog.labs.userAgent.util.getUserAgent(),
    b = "";
  goog.labs.userAgent.platform.isWindows() ? (b = /Windows (?:NT|Phone) ([0-9.]+)/, b = (a = b.exec(a)) ? a[1] : "0.0") : goog.labs.userAgent.platform.isIos() ? (b = /(?:iPhone|iPod|iPad|CPU)\s+OS\s+(\S+)/, b = (a = b.exec(a)) && a[1].replace(/_/g, ".")) : goog.labs.userAgent.platform.isMacintosh() ? (b = /Mac OS X ([0-9_.]+)/, b = (a = b.exec(a)) ? a[1].replace(/_/g, ".") : "10") : goog.labs.userAgent.platform.isKaiOS() ? (b = /(?:KaiOS)\/(\S+)/i, b = (a = b.exec(a)) && a[1]) : goog.labs.userAgent.platform.isAndroid() ? (b = /Android\s+([^\);]+)(\)|;)/, b = (a = b.exec(a)) && a[1]) : goog.labs.userAgent.platform.isChromeOS() && (b = /(?:CrOS\s+(?:i686|x86_64)\s+([0-9.]+))/, b = (a = b.exec(a)) && a[1]);
  return b || "";
};
goog.labs.userAgent.platform.isVersionOrHigher = function (a) {
  return 0 <= goog.string.compareVersions(goog.labs.userAgent.platform.getVersion(), a);
};
goog.reflect = {};
goog.reflect.object = function (a, b) {
  return b;
};
goog.reflect.objectProperty = function (a, b) {
  return a;
};
goog.reflect.sinkValue = function (a) {
  goog.reflect.sinkValue[" "](a);
  return a;
};
goog.reflect.sinkValue[" "] = goog.nullFunction;
goog.reflect.canAccessProperty = function (a, b) {
  try {
    return goog.reflect.sinkValue(a[b]), !0;
  } catch (c) {}
  return !1;
};
goog.reflect.cache = function (a, b, c, d) {
  d = d ? d(b) : b;
  return Object.prototype.hasOwnProperty.call(a, d) ? a[d] : a[d] = c(b);
};
goog.labs.userAgent.engine = {};
goog.labs.userAgent.engine.isPresto = function () {
  return goog.labs.userAgent.util.matchUserAgent("Presto");
};
goog.labs.userAgent.engine.isTrident = function () {
  return goog.labs.userAgent.util.matchUserAgent("Trident") || goog.labs.userAgent.util.matchUserAgent("MSIE");
};
goog.labs.userAgent.engine.isEdge = function () {
  return goog.labs.userAgent.util.matchUserAgent("Edge");
};
goog.labs.userAgent.engine.isWebKit = function () {
  return goog.labs.userAgent.util.matchUserAgentIgnoreCase("WebKit") && !goog.labs.userAgent.engine.isEdge();
};
goog.labs.userAgent.engine.isGecko = function () {
  return goog.labs.userAgent.util.matchUserAgent("Gecko") && !goog.labs.userAgent.engine.isWebKit() && !goog.labs.userAgent.engine.isTrident() && !goog.labs.userAgent.engine.isEdge();
};
goog.labs.userAgent.engine.getVersion = function () {
  var a = goog.labs.userAgent.util.getUserAgent();
  if (a) {
    a = goog.labs.userAgent.util.extractVersionTuples(a);
    var b = goog.labs.userAgent.engine.getEngineTuple_(a);
    if (b) return "Gecko" == b[0] ? goog.labs.userAgent.engine.getVersionForKey_(a, "Firefox") : b[1];
    a = a[0];
    var c;
    if (a && (c = a[2]) && (c = /Trident\/([^\s;]+)/.exec(c))) return c[1];
  }
  return "";
};
goog.labs.userAgent.engine.getEngineTuple_ = function (a) {
  if (!goog.labs.userAgent.engine.isEdge()) return a[1];
  for (var b = 0; b < a.length; b++) {
    var c = a[b];
    if ("Edge" == c[0]) return c;
  }
};
goog.labs.userAgent.engine.isVersionOrHigher = function (a) {
  return 0 <= goog.string.compareVersions(goog.labs.userAgent.engine.getVersion(), a);
};
goog.labs.userAgent.engine.getVersionForKey_ = function (a, b) {
  return (a = goog.array.find(a, function (a) {
    return b == a[0];
  })) && a[1] || "";
};
goog.userAgent = {};
goog.userAgent.ASSUME_IE = !1;
goog.userAgent.ASSUME_EDGE = !1;
goog.userAgent.ASSUME_GECKO = !1;
goog.userAgent.ASSUME_WEBKIT = !1;
goog.userAgent.ASSUME_MOBILE_WEBKIT = !1;
goog.userAgent.ASSUME_OPERA = !1;
goog.userAgent.ASSUME_ANY_VERSION = !1;
goog.userAgent.BROWSER_KNOWN_ = goog.userAgent.ASSUME_IE || goog.userAgent.ASSUME_EDGE || goog.userAgent.ASSUME_GECKO || goog.userAgent.ASSUME_MOBILE_WEBKIT || goog.userAgent.ASSUME_WEBKIT || goog.userAgent.ASSUME_OPERA;
goog.userAgent.getUserAgentString = function () {
  return goog.labs.userAgent.util.getUserAgent();
};
goog.userAgent.getNavigatorTyped = function () {
  return goog.global.navigator || null;
};
goog.userAgent.getNavigator = function () {
  return goog.userAgent.getNavigatorTyped();
};
goog.userAgent.OPERA = goog.userAgent.BROWSER_KNOWN_ ? goog.userAgent.ASSUME_OPERA : goog.labs.userAgent.browser.isOpera();
goog.userAgent.IE = goog.userAgent.BROWSER_KNOWN_ ? goog.userAgent.ASSUME_IE : goog.labs.userAgent.browser.isIE();
goog.userAgent.EDGE = goog.userAgent.BROWSER_KNOWN_ ? goog.userAgent.ASSUME_EDGE : goog.labs.userAgent.engine.isEdge();
goog.userAgent.EDGE_OR_IE = goog.userAgent.EDGE || goog.userAgent.IE;
goog.userAgent.GECKO = goog.userAgent.BROWSER_KNOWN_ ? goog.userAgent.ASSUME_GECKO : goog.labs.userAgent.engine.isGecko();
goog.userAgent.WEBKIT = goog.userAgent.BROWSER_KNOWN_ ? goog.userAgent.ASSUME_WEBKIT || goog.userAgent.ASSUME_MOBILE_WEBKIT : goog.labs.userAgent.engine.isWebKit();
goog.userAgent.isMobile_ = function () {
  return goog.userAgent.WEBKIT && goog.labs.userAgent.util.matchUserAgent("Mobile");
};
goog.userAgent.MOBILE = goog.userAgent.ASSUME_MOBILE_WEBKIT || goog.userAgent.isMobile_();
goog.userAgent.SAFARI = goog.userAgent.WEBKIT;
goog.userAgent.determinePlatform_ = function () {
  var a = goog.userAgent.getNavigatorTyped();
  return a && a.platform || "";
};
goog.userAgent.PLATFORM = goog.userAgent.determinePlatform_();
goog.userAgent.ASSUME_MAC = !1;
goog.userAgent.ASSUME_WINDOWS = !1;
goog.userAgent.ASSUME_LINUX = !1;
goog.userAgent.ASSUME_X11 = !1;
goog.userAgent.ASSUME_ANDROID = !1;
goog.userAgent.ASSUME_IPHONE = !1;
goog.userAgent.ASSUME_IPAD = !1;
goog.userAgent.ASSUME_IPOD = !1;
goog.userAgent.ASSUME_KAIOS = !1;
goog.userAgent.ASSUME_GO2PHONE = !1;
goog.userAgent.PLATFORM_KNOWN_ = goog.userAgent.ASSUME_MAC || goog.userAgent.ASSUME_WINDOWS || goog.userAgent.ASSUME_LINUX || goog.userAgent.ASSUME_X11 || goog.userAgent.ASSUME_ANDROID || goog.userAgent.ASSUME_IPHONE || goog.userAgent.ASSUME_IPAD || goog.userAgent.ASSUME_IPOD;
goog.userAgent.MAC = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_MAC : goog.labs.userAgent.platform.isMacintosh();
goog.userAgent.WINDOWS = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_WINDOWS : goog.labs.userAgent.platform.isWindows();
goog.userAgent.isLegacyLinux_ = function () {
  return goog.labs.userAgent.platform.isLinux() || goog.labs.userAgent.platform.isChromeOS();
};
goog.userAgent.LINUX = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_LINUX : goog.userAgent.isLegacyLinux_();
goog.userAgent.isX11_ = function () {
  var a = goog.userAgent.getNavigatorTyped();
  return !!a && goog.string.contains(a.appVersion || "", "X11");
};
goog.userAgent.X11 = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_X11 : goog.userAgent.isX11_();
goog.userAgent.ANDROID = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_ANDROID : goog.labs.userAgent.platform.isAndroid();
goog.userAgent.IPHONE = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_IPHONE : goog.labs.userAgent.platform.isIphone();
goog.userAgent.IPAD = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_IPAD : goog.labs.userAgent.platform.isIpad();
goog.userAgent.IPOD = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_IPOD : goog.labs.userAgent.platform.isIpod();
goog.userAgent.IOS = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_IPHONE || goog.userAgent.ASSUME_IPAD || goog.userAgent.ASSUME_IPOD : goog.labs.userAgent.platform.isIos();
goog.userAgent.KAIOS = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_KAIOS : goog.labs.userAgent.platform.isKaiOS();
goog.userAgent.GO2PHONE = goog.userAgent.PLATFORM_KNOWN_ ? goog.userAgent.ASSUME_GO2PHONE : goog.labs.userAgent.platform.isGo2Phone();
goog.userAgent.determineVersion_ = function () {
  var a = "",
    b = goog.userAgent.getVersionRegexResult_();
  b && (a = b ? b[1] : "");
  return goog.userAgent.IE && (b = goog.userAgent.getDocumentMode_(), null != b && b > parseFloat(a)) ? String(b) : a;
};
goog.userAgent.getVersionRegexResult_ = function () {
  var a = goog.userAgent.getUserAgentString();
  if (goog.userAgent.GECKO) return /rv:([^\);]+)(\)|;)/.exec(a);
  if (goog.userAgent.EDGE) return /Edge\/([\d\.]+)/.exec(a);
  if (goog.userAgent.IE) return /\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(a);
  if (goog.userAgent.WEBKIT) return /WebKit\/(\S+)/.exec(a);
  if (goog.userAgent.OPERA) return /(?:Version)[ \/]?(\S+)/.exec(a);
};
goog.userAgent.getDocumentMode_ = function () {
  var a = goog.global.document;
  return a ? a.documentMode : void 0;
};
goog.userAgent.VERSION = goog.userAgent.determineVersion_();
goog.userAgent.compare = function (a, b) {
  return goog.string.compareVersions(a, b);
};
goog.userAgent.isVersionOrHigherCache_ = {};
goog.userAgent.isVersionOrHigher = function (a) {
  return goog.userAgent.ASSUME_ANY_VERSION || goog.reflect.cache(goog.userAgent.isVersionOrHigherCache_, a, function () {
    return 0 <= goog.string.compareVersions(goog.userAgent.VERSION, a);
  });
};
goog.userAgent.isVersion = goog.userAgent.isVersionOrHigher;
goog.userAgent.isDocumentModeOrHigher = function (a) {
  return Number(goog.userAgent.DOCUMENT_MODE) >= a;
};
goog.userAgent.isDocumentMode = goog.userAgent.isDocumentModeOrHigher;
goog.userAgent.DOCUMENT_MODE = function () {
  if (goog.global.document && goog.userAgent.IE) return goog.userAgent.getDocumentMode_();
}();
goog.userAgent.product = {};
goog.userAgent.product.ASSUME_FIREFOX = !1;
goog.userAgent.product.ASSUME_IPHONE = !1;
goog.userAgent.product.ASSUME_IPAD = !1;
goog.userAgent.product.ASSUME_ANDROID = !1;
goog.userAgent.product.ASSUME_CHROME = !1;
goog.userAgent.product.ASSUME_SAFARI = !1;
goog.userAgent.product.PRODUCT_KNOWN_ = goog.userAgent.ASSUME_IE || goog.userAgent.ASSUME_EDGE || goog.userAgent.ASSUME_OPERA || goog.userAgent.product.ASSUME_FIREFOX || goog.userAgent.product.ASSUME_IPHONE || goog.userAgent.product.ASSUME_IPAD || goog.userAgent.product.ASSUME_ANDROID || goog.userAgent.product.ASSUME_CHROME || goog.userAgent.product.ASSUME_SAFARI;
goog.userAgent.product.OPERA = goog.userAgent.OPERA;
goog.userAgent.product.IE = goog.userAgent.IE;
goog.userAgent.product.EDGE = goog.userAgent.EDGE;
goog.userAgent.product.FIREFOX = goog.userAgent.product.PRODUCT_KNOWN_ ? goog.userAgent.product.ASSUME_FIREFOX : goog.labs.userAgent.browser.isFirefox();
goog.userAgent.product.isIphoneOrIpod_ = function () {
  return goog.labs.userAgent.platform.isIphone() || goog.labs.userAgent.platform.isIpod();
};
goog.userAgent.product.IPHONE = goog.userAgent.product.PRODUCT_KNOWN_ ? goog.userAgent.product.ASSUME_IPHONE : goog.userAgent.product.isIphoneOrIpod_();
goog.userAgent.product.IPAD = goog.userAgent.product.PRODUCT_KNOWN_ ? goog.userAgent.product.ASSUME_IPAD : goog.labs.userAgent.platform.isIpad();
goog.userAgent.product.ANDROID = goog.userAgent.product.PRODUCT_KNOWN_ ? goog.userAgent.product.ASSUME_ANDROID : goog.labs.userAgent.browser.isAndroidBrowser();
goog.userAgent.product.CHROME = goog.userAgent.product.PRODUCT_KNOWN_ ? goog.userAgent.product.ASSUME_CHROME : goog.labs.userAgent.browser.isChrome();
goog.userAgent.product.isSafariDesktop_ = function () {
  return goog.labs.userAgent.browser.isSafari() && !goog.labs.userAgent.platform.isIos();
};
goog.userAgent.product.SAFARI = goog.userAgent.product.PRODUCT_KNOWN_ ? goog.userAgent.product.ASSUME_SAFARI : goog.userAgent.product.isSafariDesktop_();
goog.crypt.base64 = {};
goog.crypt.base64.DEFAULT_ALPHABET_COMMON_ = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
goog.crypt.base64.ENCODED_VALS = goog.crypt.base64.DEFAULT_ALPHABET_COMMON_ + "+/=";
goog.crypt.base64.ENCODED_VALS_WEBSAFE = goog.crypt.base64.DEFAULT_ALPHABET_COMMON_ + "-_.";
goog.crypt.base64.Alphabet = {
  DEFAULT: 0,
  NO_PADDING: 1,
  WEBSAFE: 2,
  WEBSAFE_DOT_PADDING: 3,
  WEBSAFE_NO_PADDING: 4
};
goog.crypt.base64.paddingChars_ = "=.";
goog.crypt.base64.isPadding_ = function (a) {
  return goog.string.contains(goog.crypt.base64.paddingChars_, a);
};
goog.crypt.base64.byteToCharMaps_ = {};
goog.crypt.base64.charToByteMap_ = null;
goog.crypt.base64.ASSUME_NATIVE_SUPPORT_ = goog.userAgent.GECKO || goog.userAgent.WEBKIT && !goog.userAgent.product.SAFARI || goog.userAgent.OPERA;
goog.crypt.base64.HAS_NATIVE_ENCODE_ = goog.crypt.base64.ASSUME_NATIVE_SUPPORT_ || "function" == typeof goog.global.btoa;
goog.crypt.base64.HAS_NATIVE_DECODE_ = goog.crypt.base64.ASSUME_NATIVE_SUPPORT_ || !goog.userAgent.product.SAFARI && !goog.userAgent.IE && "function" == typeof goog.global.atob;
goog.crypt.base64.encodeByteArray = function (a, b) {
  goog.asserts.assert(goog.isArrayLike(a), "encodeByteArray takes an array as a parameter");
  void 0 === b && (b = goog.crypt.base64.Alphabet.DEFAULT);
  goog.crypt.base64.init_();
  b = goog.crypt.base64.byteToCharMaps_[b];
  for (var c = [], d = 0; d < a.length; d += 3) {
    var e = a[d],
      f = d + 1 < a.length,
      g = f ? a[d + 1] : 0,
      h = d + 2 < a.length,
      k = h ? a[d + 2] : 0,
      l = e >> 2;
    e = (e & 3) << 4 | g >> 4;
    g = (g & 15) << 2 | k >> 6;
    k &= 63;
    h || (k = 64, f || (g = 64));
    c.push(b[l], b[e], b[g] || "", b[k] || "");
  }
  return c.join("");
};
goog.crypt.base64.encodeString = function (a, b) {
  return goog.crypt.base64.HAS_NATIVE_ENCODE_ && !b ? goog.global.btoa(a) : goog.crypt.base64.encodeByteArray(goog.crypt.stringToByteArray(a), b);
};
goog.crypt.base64.decodeString = function (a, b) {
  if (goog.crypt.base64.HAS_NATIVE_DECODE_ && !b) return goog.global.atob(a);
  var c = "";
  goog.crypt.base64.decodeStringInternal_(a, function (a) {
    c += String.fromCharCode(a);
  });
  return c;
};
goog.crypt.base64.decodeStringToByteArray = function (a, b) {
  var c = [];
  goog.crypt.base64.decodeStringInternal_(a, function (a) {
    c.push(a);
  });
  return c;
};
goog.crypt.base64.decodeStringToUint8Array = function (a) {
  goog.asserts.assert(!goog.userAgent.IE || goog.userAgent.isVersionOrHigher("10"), "Browser does not support typed arrays");
  var b = a.length,
    c = 3 * b / 4;
  c % 3 ? c = Math.floor(c) : goog.crypt.base64.isPadding_(a[b - 1]) && (c = goog.crypt.base64.isPadding_(a[b - 2]) ? c - 2 : c - 1);
  var d = new Uint8Array(c),
    e = 0;
  goog.crypt.base64.decodeStringInternal_(a, function (a) {
    d[e++] = a;
  });
  return d.subarray(0, e);
};
goog.crypt.base64.decodeStringInternal_ = function (a, b) {
  function c(b) {
    for (; d < a.length;) {
      var c = a.charAt(d++),
        e = goog.crypt.base64.charToByteMap_[c];
      if (null != e) return e;
      if (!goog.string.isEmptyOrWhitespace(c)) throw Error("Unknown base64 encoding at char: " + c);
    }
    return b;
  }
  goog.crypt.base64.init_();
  for (var d = 0;;) {
    var e = c(-1),
      f = c(0),
      g = c(64),
      h = c(64);
    if (64 === h && -1 === e) break;
    b(e << 2 | f >> 4);
    64 != g && (b(f << 4 & 240 | g >> 2), 64 != h && b(g << 6 & 192 | h));
  }
};
goog.crypt.base64.init_ = function () {
  if (!goog.crypt.base64.charToByteMap_) {
    goog.crypt.base64.charToByteMap_ = {};
    for (var a = goog.crypt.base64.DEFAULT_ALPHABET_COMMON_.split(""), b = ["+/=", "+/", "-_=", "-_.", "-_"], c = 0; 5 > c; c++) {
      var d = a.concat(b[c].split(""));
      goog.crypt.base64.byteToCharMaps_[c] = d;
      for (var e = 0; e < d.length; e++) {
        var f = d[e],
          g = goog.crypt.base64.charToByteMap_[f];
        void 0 === g ? goog.crypt.base64.charToByteMap_[f] = e : goog.asserts.assert(g === e);
      }
    }
  }
};
jspb.utils = {};
jspb.utils.split64Low = 0;
jspb.utils.split64High = 0;
jspb.utils.splitUint64 = function (a) {
  var b = a >>> 0;
  a = Math.floor((a - b) / jspb.BinaryConstants.TWO_TO_32) >>> 0;
  jspb.utils.split64Low = b;
  jspb.utils.split64High = a;
};
jspb.utils.splitInt64 = function (a) {
  var b = 0 > a;
  a = Math.abs(a);
  var c = a >>> 0;
  a = Math.floor((a - c) / jspb.BinaryConstants.TWO_TO_32);
  a >>>= 0;
  b && (a = ~a >>> 0, c = (~c >>> 0) + 1, 4294967295 < c && (c = 0, a++, 4294967295 < a && (a = 0)));
  jspb.utils.split64Low = c;
  jspb.utils.split64High = a;
};
jspb.utils.splitZigzag64 = function (a) {
  var b = 0 > a;
  a = 2 * Math.abs(a);
  jspb.utils.splitUint64(a);
  a = jspb.utils.split64Low;
  var c = jspb.utils.split64High;
  b && (0 == a ? 0 == c ? c = a = 4294967295 : (c--, a = 4294967295) : a--);
  jspb.utils.split64Low = a;
  jspb.utils.split64High = c;
};
jspb.utils.splitFloat32 = function (a) {
  var b = 0 > a ? 1 : 0;
  a = b ? -a : a;
  if (0 === a) 0 < 1 / a ? (jspb.utils.split64High = 0, jspb.utils.split64Low = 0) : (jspb.utils.split64High = 0, jspb.utils.split64Low = 2147483648);else if (isNaN(a)) jspb.utils.split64High = 0, jspb.utils.split64Low = 2147483647;else if (a > jspb.BinaryConstants.FLOAT32_MAX) jspb.utils.split64High = 0, jspb.utils.split64Low = (b << 31 | 2139095040) >>> 0;else if (a < jspb.BinaryConstants.FLOAT32_MIN) a = Math.round(a / Math.pow(2, -149)), jspb.utils.split64High = 0, jspb.utils.split64Low = (b << 31 | a) >>> 0;else {
    var c = Math.floor(Math.log(a) / Math.LN2);
    a *= Math.pow(2, -c);
    a = Math.round(a * jspb.BinaryConstants.TWO_TO_23) & 8388607;
    jspb.utils.split64High = 0;
    jspb.utils.split64Low = (b << 31 | c + 127 << 23 | a) >>> 0;
  }
};
jspb.utils.splitFloat64 = function (a) {
  var b = 0 > a ? 1 : 0;
  a = b ? -a : a;
  if (0 === a) jspb.utils.split64High = 0 < 1 / a ? 0 : 2147483648, jspb.utils.split64Low = 0;else if (isNaN(a)) jspb.utils.split64High = 2147483647, jspb.utils.split64Low = 4294967295;else if (a > jspb.BinaryConstants.FLOAT64_MAX) jspb.utils.split64High = (b << 31 | 2146435072) >>> 0, jspb.utils.split64Low = 0;else if (a < jspb.BinaryConstants.FLOAT64_MIN) {
    var c = a / Math.pow(2, -1074);
    a = c / jspb.BinaryConstants.TWO_TO_32;
    jspb.utils.split64High = (b << 31 | a) >>> 0;
    jspb.utils.split64Low = c >>> 0;
  } else {
    c = a;
    var d = 0;
    if (2 <= c) for (; 2 <= c && 1023 > d;) d++, c /= 2;else for (; 1 > c && -1022 < d;) c *= 2, d--;
    c = a * Math.pow(2, -d);
    a = c * jspb.BinaryConstants.TWO_TO_20 & 1048575;
    c = c * jspb.BinaryConstants.TWO_TO_52 >>> 0;
    jspb.utils.split64High = (b << 31 | d + 1023 << 20 | a) >>> 0;
    jspb.utils.split64Low = c;
  }
};
jspb.utils.splitHash64 = function (a) {
  var b = a.charCodeAt(0),
    c = a.charCodeAt(1),
    d = a.charCodeAt(2),
    e = a.charCodeAt(3),
    f = a.charCodeAt(4),
    g = a.charCodeAt(5),
    h = a.charCodeAt(6);
  a = a.charCodeAt(7);
  jspb.utils.split64Low = b + (c << 8) + (d << 16) + (e << 24) >>> 0;
  jspb.utils.split64High = f + (g << 8) + (h << 16) + (a << 24) >>> 0;
};
jspb.utils.joinUint64 = function (a, b) {
  return b * jspb.BinaryConstants.TWO_TO_32 + (a >>> 0);
};
jspb.utils.joinInt64 = function (a, b) {
  var c = b & 2147483648;
  c && (a = ~a + 1 >>> 0, b = ~b >>> 0, 0 == a && (b = b + 1 >>> 0));
  a = jspb.utils.joinUint64(a, b);
  return c ? -a : a;
};
jspb.utils.toZigzag64 = function (a, b, c) {
  var d = b >> 31;
  return c(a << 1 ^ d, (b << 1 | a >>> 31) ^ d);
};
jspb.utils.joinZigzag64 = function (a, b) {
  return jspb.utils.fromZigzag64(a, b, jspb.utils.joinInt64);
};
jspb.utils.fromZigzag64 = function (a, b, c) {
  var d = -(a & 1);
  return c((a >>> 1 | b << 31) ^ d, b >>> 1 ^ d);
};
jspb.utils.joinFloat32 = function (a, b) {
  b = 2 * (a >> 31) + 1;
  var c = a >>> 23 & 255;
  a &= 8388607;
  return 255 == c ? a ? NaN : Infinity * b : 0 == c ? b * Math.pow(2, -149) * a : b * Math.pow(2, c - 150) * (a + Math.pow(2, 23));
};
jspb.utils.joinFloat64 = function (a, b) {
  var c = 2 * (b >> 31) + 1,
    d = b >>> 20 & 2047;
  a = jspb.BinaryConstants.TWO_TO_32 * (b & 1048575) + a;
  return 2047 == d ? a ? NaN : Infinity * c : 0 == d ? c * Math.pow(2, -1074) * a : c * Math.pow(2, d - 1075) * (a + jspb.BinaryConstants.TWO_TO_52);
};
jspb.utils.joinHash64 = function (a, b) {
  return String.fromCharCode(a >>> 0 & 255, a >>> 8 & 255, a >>> 16 & 255, a >>> 24 & 255, b >>> 0 & 255, b >>> 8 & 255, b >>> 16 & 255, b >>> 24 & 255);
};
jspb.utils.DIGITS = "0123456789abcdef".split("");
jspb.utils.ZERO_CHAR_CODE_ = 48;
jspb.utils.A_CHAR_CODE_ = 97;
jspb.utils.joinUnsignedDecimalString = function (a, b) {
  function c(a, b) {
    a = a ? String(a) : "";
    return b ? "0000000".slice(a.length) + a : a;
  }
  if (2097151 >= b) return "" + jspb.utils.joinUint64(a, b);
  var d = (a >>> 24 | b << 8) >>> 0 & 16777215;
  b = b >> 16 & 65535;
  a = (a & 16777215) + 6777216 * d + 6710656 * b;
  d += 8147497 * b;
  b *= 2;
  1E7 <= a && (d += Math.floor(a / 1E7), a %= 1E7);
  1E7 <= d && (b += Math.floor(d / 1E7), d %= 1E7);
  return c(b, 0) + c(d, b) + c(a, 1);
};
jspb.utils.joinSignedDecimalString = function (a, b) {
  var c = b & 2147483648;
  c && (a = ~a + 1 >>> 0, b = ~b + (0 == a ? 1 : 0) >>> 0);
  a = jspb.utils.joinUnsignedDecimalString(a, b);
  return c ? "-" + a : a;
};
jspb.utils.hash64ToDecimalString = function (a, b) {
  jspb.utils.splitHash64(a);
  a = jspb.utils.split64Low;
  var c = jspb.utils.split64High;
  return b ? jspb.utils.joinSignedDecimalString(a, c) : jspb.utils.joinUnsignedDecimalString(a, c);
};
jspb.utils.hash64ArrayToDecimalStrings = function (a, b) {
  for (var c = Array(a.length), d = 0; d < a.length; d++) c[d] = jspb.utils.hash64ToDecimalString(a[d], b);
  return c;
};
jspb.utils.decimalStringToHash64 = function (a) {
  function b(a, b) {
    for (var c = 0; 8 > c && (1 !== a || 0 < b); c++) b = a * e[c] + b, e[c] = b & 255, b >>>= 8;
  }
  function c() {
    for (var a = 0; 8 > a; a++) e[a] = ~e[a] & 255;
  }
  goog.asserts.assert(0 < a.length);
  var d = !1;
  "-" === a[0] && (d = !0, a = a.slice(1));
  for (var e = [0, 0, 0, 0, 0, 0, 0, 0], f = 0; f < a.length; f++) b(10, a.charCodeAt(f) - jspb.utils.ZERO_CHAR_CODE_);
  d && (c(), b(1, 1));
  return goog.crypt.byteArrayToString(e);
};
jspb.utils.splitDecimalString = function (a) {
  jspb.utils.splitHash64(jspb.utils.decimalStringToHash64(a));
};
jspb.utils.toHexDigit_ = function (a) {
  return String.fromCharCode(10 > a ? jspb.utils.ZERO_CHAR_CODE_ + a : jspb.utils.A_CHAR_CODE_ - 10 + a);
};
jspb.utils.fromHexCharCode_ = function (a) {
  return a >= jspb.utils.A_CHAR_CODE_ ? a - jspb.utils.A_CHAR_CODE_ + 10 : a - jspb.utils.ZERO_CHAR_CODE_;
};
jspb.utils.hash64ToHexString = function (a) {
  var b = Array(18);
  b[0] = "0";
  b[1] = "x";
  for (var c = 0; 8 > c; c++) {
    var d = a.charCodeAt(7 - c);
    b[2 * c + 2] = jspb.utils.toHexDigit_(d >> 4);
    b[2 * c + 3] = jspb.utils.toHexDigit_(d & 15);
  }
  return b.join("");
};
jspb.utils.hexStringToHash64 = function (a) {
  a = a.toLowerCase();
  goog.asserts.assert(18 == a.length);
  goog.asserts.assert("0" == a[0]);
  goog.asserts.assert("x" == a[1]);
  for (var b = "", c = 0; 8 > c; c++) {
    var d = jspb.utils.fromHexCharCode_(a.charCodeAt(2 * c + 2)),
      e = jspb.utils.fromHexCharCode_(a.charCodeAt(2 * c + 3));
    b = String.fromCharCode(16 * d + e) + b;
  }
  return b;
};
jspb.utils.hash64ToNumber = function (a, b) {
  jspb.utils.splitHash64(a);
  a = jspb.utils.split64Low;
  var c = jspb.utils.split64High;
  return b ? jspb.utils.joinInt64(a, c) : jspb.utils.joinUint64(a, c);
};
jspb.utils.numberToHash64 = function (a) {
  jspb.utils.splitInt64(a);
  return jspb.utils.joinHash64(jspb.utils.split64Low, jspb.utils.split64High);
};
jspb.utils.countVarints = function (a, b, c) {
  for (var d = 0, e = b; e < c; e++) d += a[e] >> 7;
  return c - b - d;
};
jspb.utils.countVarintFields = function (a, b, c, d) {
  var e = 0;
  d = 8 * d + jspb.BinaryConstants.WireType.VARINT;
  if (128 > d) for (; b < c && a[b++] == d;) for (e++;;) {
    var f = a[b++];
    if (0 == (f & 128)) break;
  } else for (; b < c;) {
    for (f = d; 128 < f;) {
      if (a[b] != (f & 127 | 128)) return e;
      b++;
      f >>= 7;
    }
    if (a[b++] != f) break;
    for (e++; f = a[b++], 0 != (f & 128););
  }
  return e;
};
jspb.utils.countFixedFields_ = function (a, b, c, d, e) {
  var f = 0;
  if (128 > d) for (; b < c && a[b++] == d;) f++, b += e;else for (; b < c;) {
    for (var g = d; 128 < g;) {
      if (a[b++] != (g & 127 | 128)) return f;
      g >>= 7;
    }
    if (a[b++] != g) break;
    f++;
    b += e;
  }
  return f;
};
jspb.utils.countFixed32Fields = function (a, b, c, d) {
  return jspb.utils.countFixedFields_(a, b, c, 8 * d + jspb.BinaryConstants.WireType.FIXED32, 4);
};
jspb.utils.countFixed64Fields = function (a, b, c, d) {
  return jspb.utils.countFixedFields_(a, b, c, 8 * d + jspb.BinaryConstants.WireType.FIXED64, 8);
};
jspb.utils.countDelimitedFields = function (a, b, c, d) {
  var e = 0;
  for (d = 8 * d + jspb.BinaryConstants.WireType.DELIMITED; b < c;) {
    for (var f = d; 128 < f;) {
      if (a[b++] != (f & 127 | 128)) return e;
      f >>= 7;
    }
    if (a[b++] != f) break;
    e++;
    for (var g = 0, h = 1; f = a[b++], g += (f & 127) * h, h *= 128, 0 != (f & 128););
    b += g;
  }
  return e;
};
jspb.utils.debugBytesToTextFormat = function (a) {
  var b = '"';
  if (a) {
    a = jspb.utils.byteSourceToUint8Array(a);
    for (var c = 0; c < a.length; c++) b += "\\x", 16 > a[c] && (b += "0"), b += a[c].toString(16);
  }
  return b + '"';
};
jspb.utils.debugScalarToTextFormat = function (a) {
  return "string" === typeof a ? goog.string.quote(a) : a.toString();
};
jspb.utils.stringToByteArray = function (a) {
  for (var b = new Uint8Array(a.length), c = 0; c < a.length; c++) {
    var d = a.charCodeAt(c);
    if (255 < d) throw Error("Conversion error: string contains codepoint outside of byte range");
    b[c] = d;
  }
  return b;
};
jspb.utils.byteSourceToUint8Array = function (a) {
  if (a.constructor === Uint8Array) return a;
  if (a.constructor === ArrayBuffer || "undefined" != typeof Buffer && a.constructor === Buffer || a.constructor === Array) return new Uint8Array(a);
  if (a.constructor === String) return goog.crypt.base64.decodeStringToUint8Array(a);
  goog.asserts.fail("Type not convertible to Uint8Array.");
  return new Uint8Array(0);
};
jspb.BinaryDecoder = function (a, b, c) {
  this.bytes_ = null;
  this.cursor_ = this.end_ = this.start_ = 0;
  this.error_ = !1;
  a && this.setBlock(a, b, c);
};
jspb.BinaryDecoder.instanceCache_ = [];
jspb.BinaryDecoder.alloc = function (a, b, c) {
  if (jspb.BinaryDecoder.instanceCache_.length) {
    var d = jspb.BinaryDecoder.instanceCache_.pop();
    a && d.setBlock(a, b, c);
    return d;
  }
  return new jspb.BinaryDecoder(a, b, c);
};
jspb.BinaryDecoder.prototype.free = function () {
  this.clear();
  100 > jspb.BinaryDecoder.instanceCache_.length && jspb.BinaryDecoder.instanceCache_.push(this);
};
jspb.BinaryDecoder.prototype.clone = function () {
  return jspb.BinaryDecoder.alloc(this.bytes_, this.start_, this.end_ - this.start_);
};
jspb.BinaryDecoder.prototype.clear = function () {
  this.bytes_ = null;
  this.cursor_ = this.end_ = this.start_ = 0;
  this.error_ = !1;
};
jspb.BinaryDecoder.prototype.getBuffer = function () {
  return this.bytes_;
};
jspb.BinaryDecoder.prototype.setBlock = function (a, b, c) {
  this.bytes_ = jspb.utils.byteSourceToUint8Array(a);
  this.start_ = void 0 !== b ? b : 0;
  this.end_ = void 0 !== c ? this.start_ + c : this.bytes_.length;
  this.cursor_ = this.start_;
};
jspb.BinaryDecoder.prototype.getEnd = function () {
  return this.end_;
};
jspb.BinaryDecoder.prototype.setEnd = function (a) {
  this.end_ = a;
};
jspb.BinaryDecoder.prototype.reset = function () {
  this.cursor_ = this.start_;
};
jspb.BinaryDecoder.prototype.getCursor = function () {
  return this.cursor_;
};
jspb.BinaryDecoder.prototype.setCursor = function (a) {
  this.cursor_ = a;
};
jspb.BinaryDecoder.prototype.advance = function (a) {
  this.cursor_ += a;
  goog.asserts.assert(this.cursor_ <= this.end_);
};
jspb.BinaryDecoder.prototype.atEnd = function () {
  return this.cursor_ == this.end_;
};
jspb.BinaryDecoder.prototype.pastEnd = function () {
  return this.cursor_ > this.end_;
};
jspb.BinaryDecoder.prototype.getError = function () {
  return this.error_ || 0 > this.cursor_ || this.cursor_ > this.end_;
};
jspb.BinaryDecoder.prototype.readSplitVarint64 = function (a) {
  for (var b = 128, c = 0, d = 0, e = 0; 4 > e && 128 <= b; e++) b = this.bytes_[this.cursor_++], c |= (b & 127) << 7 * e;
  128 <= b && (b = this.bytes_[this.cursor_++], c |= (b & 127) << 28, d |= (b & 127) >> 4);
  if (128 <= b) for (e = 0; 5 > e && 128 <= b; e++) b = this.bytes_[this.cursor_++], d |= (b & 127) << 7 * e + 3;
  if (128 > b) return a(c >>> 0, d >>> 0);
  goog.asserts.fail("Failed to read varint, encoding is invalid.");
  this.error_ = !0;
};
jspb.BinaryDecoder.prototype.readSplitZigzagVarint64 = function (a) {
  return this.readSplitVarint64(function (b, c) {
    return jspb.utils.fromZigzag64(b, c, a);
  });
};
jspb.BinaryDecoder.prototype.readSplitFixed64 = function (a) {
  var b = this.bytes_,
    c = this.cursor_;
  this.cursor_ += 8;
  for (var d = 0, e = 0, f = c + 7; f >= c; f--) d = d << 8 | b[f], e = e << 8 | b[f + 4];
  return a(d, e);
};
jspb.BinaryDecoder.prototype.skipVarint = function () {
  for (; this.bytes_[this.cursor_] & 128;) this.cursor_++;
  this.cursor_++;
};
jspb.BinaryDecoder.prototype.unskipVarint = function (a) {
  for (; 128 < a;) this.cursor_--, a >>>= 7;
  this.cursor_--;
};
jspb.BinaryDecoder.prototype.readUnsignedVarint32 = function () {
  var a = this.bytes_;
  var b = a[this.cursor_ + 0];
  var c = b & 127;
  if (128 > b) return this.cursor_ += 1, goog.asserts.assert(this.cursor_ <= this.end_), c;
  b = a[this.cursor_ + 1];
  c |= (b & 127) << 7;
  if (128 > b) return this.cursor_ += 2, goog.asserts.assert(this.cursor_ <= this.end_), c;
  b = a[this.cursor_ + 2];
  c |= (b & 127) << 14;
  if (128 > b) return this.cursor_ += 3, goog.asserts.assert(this.cursor_ <= this.end_), c;
  b = a[this.cursor_ + 3];
  c |= (b & 127) << 21;
  if (128 > b) return this.cursor_ += 4, goog.asserts.assert(this.cursor_ <= this.end_), c;
  b = a[this.cursor_ + 4];
  c |= (b & 15) << 28;
  if (128 > b) return this.cursor_ += 5, goog.asserts.assert(this.cursor_ <= this.end_), c >>> 0;
  this.cursor_ += 5;
  128 <= a[this.cursor_++] && 128 <= a[this.cursor_++] && 128 <= a[this.cursor_++] && 128 <= a[this.cursor_++] && 128 <= a[this.cursor_++] && goog.asserts.assert(!1);
  goog.asserts.assert(this.cursor_ <= this.end_);
  return c;
};
jspb.BinaryDecoder.prototype.readSignedVarint32 = jspb.BinaryDecoder.prototype.readUnsignedVarint32;
jspb.BinaryDecoder.prototype.readUnsignedVarint32String = function () {
  return this.readUnsignedVarint32().toString();
};
jspb.BinaryDecoder.prototype.readSignedVarint32String = function () {
  return this.readSignedVarint32().toString();
};
jspb.BinaryDecoder.prototype.readZigzagVarint32 = function () {
  var a = this.readUnsignedVarint32();
  return a >>> 1 ^ -(a & 1);
};
jspb.BinaryDecoder.prototype.readUnsignedVarint64 = function () {
  return this.readSplitVarint64(jspb.utils.joinUint64);
};
jspb.BinaryDecoder.prototype.readUnsignedVarint64String = function () {
  return this.readSplitVarint64(jspb.utils.joinUnsignedDecimalString);
};
jspb.BinaryDecoder.prototype.readSignedVarint64 = function () {
  return this.readSplitVarint64(jspb.utils.joinInt64);
};
jspb.BinaryDecoder.prototype.readSignedVarint64String = function () {
  return this.readSplitVarint64(jspb.utils.joinSignedDecimalString);
};
jspb.BinaryDecoder.prototype.readZigzagVarint64 = function () {
  return this.readSplitVarint64(jspb.utils.joinZigzag64);
};
jspb.BinaryDecoder.prototype.readZigzagVarintHash64 = function () {
  return this.readSplitZigzagVarint64(jspb.utils.joinHash64);
};
jspb.BinaryDecoder.prototype.readZigzagVarint64String = function () {
  return this.readSplitZigzagVarint64(jspb.utils.joinSignedDecimalString);
};
jspb.BinaryDecoder.prototype.readUint8 = function () {
  var a = this.bytes_[this.cursor_ + 0];
  this.cursor_ += 1;
  goog.asserts.assert(this.cursor_ <= this.end_);
  return a;
};
jspb.BinaryDecoder.prototype.readUint16 = function () {
  var a = this.bytes_[this.cursor_ + 0],
    b = this.bytes_[this.cursor_ + 1];
  this.cursor_ += 2;
  goog.asserts.assert(this.cursor_ <= this.end_);
  return a << 0 | b << 8;
};
jspb.BinaryDecoder.prototype.readUint32 = function () {
  var a = this.bytes_[this.cursor_ + 0],
    b = this.bytes_[this.cursor_ + 1],
    c = this.bytes_[this.cursor_ + 2],
    d = this.bytes_[this.cursor_ + 3];
  this.cursor_ += 4;
  goog.asserts.assert(this.cursor_ <= this.end_);
  return (a << 0 | b << 8 | c << 16 | d << 24) >>> 0;
};
jspb.BinaryDecoder.prototype.readUint64 = function () {
  var a = this.readUint32(),
    b = this.readUint32();
  return jspb.utils.joinUint64(a, b);
};
jspb.BinaryDecoder.prototype.readUint64String = function () {
  var a = this.readUint32(),
    b = this.readUint32();
  return jspb.utils.joinUnsignedDecimalString(a, b);
};
jspb.BinaryDecoder.prototype.readInt8 = function () {
  var a = this.bytes_[this.cursor_ + 0];
  this.cursor_ += 1;
  goog.asserts.assert(this.cursor_ <= this.end_);
  return a << 24 >> 24;
};
jspb.BinaryDecoder.prototype.readInt16 = function () {
  var a = this.bytes_[this.cursor_ + 0],
    b = this.bytes_[this.cursor_ + 1];
  this.cursor_ += 2;
  goog.asserts.assert(this.cursor_ <= this.end_);
  return (a << 0 | b << 8) << 16 >> 16;
};
jspb.BinaryDecoder.prototype.readInt32 = function () {
  var a = this.bytes_[this.cursor_ + 0],
    b = this.bytes_[this.cursor_ + 1],
    c = this.bytes_[this.cursor_ + 2],
    d = this.bytes_[this.cursor_ + 3];
  this.cursor_ += 4;
  goog.asserts.assert(this.cursor_ <= this.end_);
  return a << 0 | b << 8 | c << 16 | d << 24;
};
jspb.BinaryDecoder.prototype.readInt64 = function () {
  var a = this.readUint32(),
    b = this.readUint32();
  return jspb.utils.joinInt64(a, b);
};
jspb.BinaryDecoder.prototype.readInt64String = function () {
  var a = this.readUint32(),
    b = this.readUint32();
  return jspb.utils.joinSignedDecimalString(a, b);
};
jspb.BinaryDecoder.prototype.readFloat = function () {
  var a = this.readUint32();
  return jspb.utils.joinFloat32(a, 0);
};
jspb.BinaryDecoder.prototype.readDouble = function () {
  var a = this.readUint32(),
    b = this.readUint32();
  return jspb.utils.joinFloat64(a, b);
};
jspb.BinaryDecoder.prototype.readBool = function () {
  return !!this.bytes_[this.cursor_++];
};
jspb.BinaryDecoder.prototype.readEnum = function () {
  return this.readSignedVarint32();
};
jspb.BinaryDecoder.prototype.readString = function (a) {
  var b = this.bytes_,
    c = this.cursor_;
  a = c + a;
  for (var d = [], e = ""; c < a;) {
    var f = b[c++];
    if (128 > f) d.push(f);else if (192 > f) continue;else if (224 > f) {
      var g = b[c++];
      d.push((f & 31) << 6 | g & 63);
    } else if (240 > f) {
      g = b[c++];
      var h = b[c++];
      d.push((f & 15) << 12 | (g & 63) << 6 | h & 63);
    } else if (248 > f) {
      g = b[c++];
      h = b[c++];
      var k = b[c++];
      f = (f & 7) << 18 | (g & 63) << 12 | (h & 63) << 6 | k & 63;
      f -= 65536;
      d.push((f >> 10 & 1023) + 55296, (f & 1023) + 56320);
    }
    8192 <= d.length && (e += String.fromCharCode.apply(null, d), d.length = 0);
  }
  e += goog.crypt.byteArrayToString(d);
  this.cursor_ = c;
  return e;
};
jspb.BinaryDecoder.prototype.readStringWithLength = function () {
  var a = this.readUnsignedVarint32();
  return this.readString(a);
};
jspb.BinaryDecoder.prototype.readBytes = function (a) {
  if (0 > a || this.cursor_ + a > this.bytes_.length) return this.error_ = !0, goog.asserts.fail("Invalid byte length!"), new Uint8Array(0);
  var b = this.bytes_.subarray(this.cursor_, this.cursor_ + a);
  this.cursor_ += a;
  goog.asserts.assert(this.cursor_ <= this.end_);
  return b;
};
jspb.BinaryDecoder.prototype.readVarintHash64 = function () {
  return this.readSplitVarint64(jspb.utils.joinHash64);
};
jspb.BinaryDecoder.prototype.readFixedHash64 = function () {
  var a = this.bytes_,
    b = this.cursor_,
    c = a[b + 0],
    d = a[b + 1],
    e = a[b + 2],
    f = a[b + 3],
    g = a[b + 4],
    h = a[b + 5],
    k = a[b + 6];
  a = a[b + 7];
  this.cursor_ += 8;
  return String.fromCharCode(c, d, e, f, g, h, k, a);
};
jspb.BinaryReader = function (a, b, c) {
  this.decoder_ = jspb.BinaryDecoder.alloc(a, b, c);
  this.fieldCursor_ = this.decoder_.getCursor();
  this.nextField_ = jspb.BinaryConstants.INVALID_FIELD_NUMBER;
  this.nextWireType_ = jspb.BinaryConstants.WireType.INVALID;
  this.error_ = !1;
  this.readCallbacks_ = null;
};
jspb.BinaryReader.instanceCache_ = [];
jspb.BinaryReader.alloc = function (a, b, c) {
  if (jspb.BinaryReader.instanceCache_.length) {
    var d = jspb.BinaryReader.instanceCache_.pop();
    a && d.decoder_.setBlock(a, b, c);
    return d;
  }
  return new jspb.BinaryReader(a, b, c);
};
jspb.BinaryReader.prototype.alloc = jspb.BinaryReader.alloc;
jspb.BinaryReader.prototype.free = function () {
  this.decoder_.clear();
  this.nextField_ = jspb.BinaryConstants.INVALID_FIELD_NUMBER;
  this.nextWireType_ = jspb.BinaryConstants.WireType.INVALID;
  this.error_ = !1;
  this.readCallbacks_ = null;
  100 > jspb.BinaryReader.instanceCache_.length && jspb.BinaryReader.instanceCache_.push(this);
};
jspb.BinaryReader.prototype.getFieldCursor = function () {
  return this.fieldCursor_;
};
jspb.BinaryReader.prototype.getCursor = function () {
  return this.decoder_.getCursor();
};
jspb.BinaryReader.prototype.getBuffer = function () {
  return this.decoder_.getBuffer();
};
jspb.BinaryReader.prototype.getFieldNumber = function () {
  return this.nextField_;
};
jspb.BinaryReader.prototype.getWireType = function () {
  return this.nextWireType_;
};
jspb.BinaryReader.prototype.isDelimited = function () {
  return this.nextWireType_ == jspb.BinaryConstants.WireType.DELIMITED;
};
jspb.BinaryReader.prototype.isEndGroup = function () {
  return this.nextWireType_ == jspb.BinaryConstants.WireType.END_GROUP;
};
jspb.BinaryReader.prototype.getError = function () {
  return this.error_ || this.decoder_.getError();
};
jspb.BinaryReader.prototype.setBlock = function (a, b, c) {
  this.decoder_.setBlock(a, b, c);
  this.nextField_ = jspb.BinaryConstants.INVALID_FIELD_NUMBER;
  this.nextWireType_ = jspb.BinaryConstants.WireType.INVALID;
};
jspb.BinaryReader.prototype.reset = function () {
  this.decoder_.reset();
  this.nextField_ = jspb.BinaryConstants.INVALID_FIELD_NUMBER;
  this.nextWireType_ = jspb.BinaryConstants.WireType.INVALID;
};
jspb.BinaryReader.prototype.advance = function (a) {
  this.decoder_.advance(a);
};
jspb.BinaryReader.prototype.nextField = function () {
  if (this.decoder_.atEnd()) return !1;
  if (this.getError()) return goog.asserts.fail("Decoder hit an error"), !1;
  this.fieldCursor_ = this.decoder_.getCursor();
  var a = this.decoder_.readUnsignedVarint32(),
    b = a >>> 3;
  a &= 7;
  if (a != jspb.BinaryConstants.WireType.VARINT && a != jspb.BinaryConstants.WireType.FIXED32 && a != jspb.BinaryConstants.WireType.FIXED64 && a != jspb.BinaryConstants.WireType.DELIMITED && a != jspb.BinaryConstants.WireType.START_GROUP && a != jspb.BinaryConstants.WireType.END_GROUP) return goog.asserts.fail("Invalid wire type: %s (at position %s)", a, this.fieldCursor_), this.error_ = !0, !1;
  this.nextField_ = b;
  this.nextWireType_ = a;
  return !0;
};
jspb.BinaryReader.prototype.unskipHeader = function () {
  this.decoder_.unskipVarint(this.nextField_ << 3 | this.nextWireType_);
};
jspb.BinaryReader.prototype.skipMatchingFields = function () {
  var a = this.nextField_;
  for (this.unskipHeader(); this.nextField() && this.getFieldNumber() == a;) this.skipField();
  this.decoder_.atEnd() || this.unskipHeader();
};
jspb.BinaryReader.prototype.skipVarintField = function () {
  this.nextWireType_ != jspb.BinaryConstants.WireType.VARINT ? (goog.asserts.fail("Invalid wire type for skipVarintField"), this.skipField()) : this.decoder_.skipVarint();
};
jspb.BinaryReader.prototype.skipDelimitedField = function () {
  if (this.nextWireType_ != jspb.BinaryConstants.WireType.DELIMITED) goog.asserts.fail("Invalid wire type for skipDelimitedField"), this.skipField();else {
    var a = this.decoder_.readUnsignedVarint32();
    this.decoder_.advance(a);
  }
};
jspb.BinaryReader.prototype.skipFixed32Field = function () {
  this.nextWireType_ != jspb.BinaryConstants.WireType.FIXED32 ? (goog.asserts.fail("Invalid wire type for skipFixed32Field"), this.skipField()) : this.decoder_.advance(4);
};
jspb.BinaryReader.prototype.skipFixed64Field = function () {
  this.nextWireType_ != jspb.BinaryConstants.WireType.FIXED64 ? (goog.asserts.fail("Invalid wire type for skipFixed64Field"), this.skipField()) : this.decoder_.advance(8);
};
jspb.BinaryReader.prototype.skipGroup = function () {
  var a = this.nextField_;
  do {
    if (!this.nextField()) {
      goog.asserts.fail("Unmatched start-group tag: stream EOF");
      this.error_ = !0;
      break;
    }
    if (this.nextWireType_ == jspb.BinaryConstants.WireType.END_GROUP) {
      this.nextField_ != a && (goog.asserts.fail("Unmatched end-group tag"), this.error_ = !0);
      break;
    }
    this.skipField();
  } while (1);
};
jspb.BinaryReader.prototype.skipField = function () {
  switch (this.nextWireType_) {
    case jspb.BinaryConstants.WireType.VARINT:
      this.skipVarintField();
      break;
    case jspb.BinaryConstants.WireType.FIXED64:
      this.skipFixed64Field();
      break;
    case jspb.BinaryConstants.WireType.DELIMITED:
      this.skipDelimitedField();
      break;
    case jspb.BinaryConstants.WireType.FIXED32:
      this.skipFixed32Field();
      break;
    case jspb.BinaryConstants.WireType.START_GROUP:
      this.skipGroup();
      break;
    default:
      goog.asserts.fail("Invalid wire encoding for field.");
  }
};
jspb.BinaryReader.prototype.registerReadCallback = function (a, b) {
  null === this.readCallbacks_ && (this.readCallbacks_ = {});
  goog.asserts.assert(!this.readCallbacks_[a]);
  this.readCallbacks_[a] = b;
};
jspb.BinaryReader.prototype.runReadCallback = function (a) {
  goog.asserts.assert(null !== this.readCallbacks_);
  a = this.readCallbacks_[a];
  goog.asserts.assert(a);
  return a(this);
};
jspb.BinaryReader.prototype.readAny = function (a) {
  this.nextWireType_ = jspb.BinaryConstants.FieldTypeToWireType(a);
  var b = jspb.BinaryConstants.FieldType;
  switch (a) {
    case b.DOUBLE:
      return this.readDouble();
    case b.FLOAT:
      return this.readFloat();
    case b.INT64:
      return this.readInt64();
    case b.UINT64:
      return this.readUint64();
    case b.INT32:
      return this.readInt32();
    case b.FIXED64:
      return this.readFixed64();
    case b.FIXED32:
      return this.readFixed32();
    case b.BOOL:
      return this.readBool();
    case b.STRING:
      return this.readString();
    case b.GROUP:
      goog.asserts.fail("Group field type not supported in readAny()");
    case b.MESSAGE:
      goog.asserts.fail("Message field type not supported in readAny()");
    case b.BYTES:
      return this.readBytes();
    case b.UINT32:
      return this.readUint32();
    case b.ENUM:
      return this.readEnum();
    case b.SFIXED32:
      return this.readSfixed32();
    case b.SFIXED64:
      return this.readSfixed64();
    case b.SINT32:
      return this.readSint32();
    case b.SINT64:
      return this.readSint64();
    case b.FHASH64:
      return this.readFixedHash64();
    case b.VHASH64:
      return this.readVarintHash64();
    default:
      goog.asserts.fail("Invalid field type in readAny()");
  }
  return 0;
};
jspb.BinaryReader.prototype.readMessage = function (a, b) {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.DELIMITED);
  var c = this.decoder_.getEnd(),
    d = this.decoder_.readUnsignedVarint32();
  d = this.decoder_.getCursor() + d;
  this.decoder_.setEnd(d);
  b(a, this);
  this.decoder_.setCursor(d);
  this.decoder_.setEnd(c);
};
jspb.BinaryReader.prototype.readGroup = function (a, b, c) {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.START_GROUP);
  goog.asserts.assert(this.nextField_ == a);
  c(b, this);
  this.error_ || this.nextWireType_ == jspb.BinaryConstants.WireType.END_GROUP || (goog.asserts.fail("Group submessage did not end with an END_GROUP tag"), this.error_ = !0);
};
jspb.BinaryReader.prototype.getFieldDecoder = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.DELIMITED);
  var a = this.decoder_.readUnsignedVarint32(),
    b = this.decoder_.getCursor(),
    c = b + a;
  a = jspb.BinaryDecoder.alloc(this.decoder_.getBuffer(), b, a);
  this.decoder_.setCursor(c);
  return a;
};
jspb.BinaryReader.prototype.readInt32 = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.VARINT);
  return this.decoder_.readSignedVarint32();
};
jspb.BinaryReader.prototype.readInt32String = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.VARINT);
  return this.decoder_.readSignedVarint32String();
};
jspb.BinaryReader.prototype.readInt64 = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.VARINT);
  return this.decoder_.readSignedVarint64();
};
jspb.BinaryReader.prototype.readInt64String = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.VARINT);
  return this.decoder_.readSignedVarint64String();
};
jspb.BinaryReader.prototype.readUint32 = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.VARINT);
  return this.decoder_.readUnsignedVarint32();
};
jspb.BinaryReader.prototype.readUint32String = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.VARINT);
  return this.decoder_.readUnsignedVarint32String();
};
jspb.BinaryReader.prototype.readUint64 = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.VARINT);
  return this.decoder_.readUnsignedVarint64();
};
jspb.BinaryReader.prototype.readUint64String = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.VARINT);
  return this.decoder_.readUnsignedVarint64String();
};
jspb.BinaryReader.prototype.readSint32 = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.VARINT);
  return this.decoder_.readZigzagVarint32();
};
jspb.BinaryReader.prototype.readSint64 = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.VARINT);
  return this.decoder_.readZigzagVarint64();
};
jspb.BinaryReader.prototype.readSint64String = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.VARINT);
  return this.decoder_.readZigzagVarint64String();
};
jspb.BinaryReader.prototype.readFixed32 = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.FIXED32);
  return this.decoder_.readUint32();
};
jspb.BinaryReader.prototype.readFixed64 = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.FIXED64);
  return this.decoder_.readUint64();
};
jspb.BinaryReader.prototype.readFixed64String = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.FIXED64);
  return this.decoder_.readUint64String();
};
jspb.BinaryReader.prototype.readSfixed32 = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.FIXED32);
  return this.decoder_.readInt32();
};
jspb.BinaryReader.prototype.readSfixed32String = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.FIXED32);
  return this.decoder_.readInt32().toString();
};
jspb.BinaryReader.prototype.readSfixed64 = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.FIXED64);
  return this.decoder_.readInt64();
};
jspb.BinaryReader.prototype.readSfixed64String = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.FIXED64);
  return this.decoder_.readInt64String();
};
jspb.BinaryReader.prototype.readFloat = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.FIXED32);
  return this.decoder_.readFloat();
};
jspb.BinaryReader.prototype.readDouble = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.FIXED64);
  return this.decoder_.readDouble();
};
jspb.BinaryReader.prototype.readBool = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.VARINT);
  return !!this.decoder_.readUnsignedVarint32();
};
jspb.BinaryReader.prototype.readEnum = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.VARINT);
  return this.decoder_.readSignedVarint64();
};
jspb.BinaryReader.prototype.readString = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.DELIMITED);
  var a = this.decoder_.readUnsignedVarint32();
  return this.decoder_.readString(a);
};
jspb.BinaryReader.prototype.readBytes = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.DELIMITED);
  var a = this.decoder_.readUnsignedVarint32();
  return this.decoder_.readBytes(a);
};
jspb.BinaryReader.prototype.readVarintHash64 = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.VARINT);
  return this.decoder_.readVarintHash64();
};
jspb.BinaryReader.prototype.readSintHash64 = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.VARINT);
  return this.decoder_.readZigzagVarintHash64();
};
jspb.BinaryReader.prototype.readSplitVarint64 = function (a) {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.VARINT);
  return this.decoder_.readSplitVarint64(a);
};
jspb.BinaryReader.prototype.readSplitZigzagVarint64 = function (a) {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.VARINT);
  return this.decoder_.readSplitVarint64(function (b, c) {
    return jspb.utils.fromZigzag64(b, c, a);
  });
};
jspb.BinaryReader.prototype.readFixedHash64 = function () {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.FIXED64);
  return this.decoder_.readFixedHash64();
};
jspb.BinaryReader.prototype.readSplitFixed64 = function (a) {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.FIXED64);
  return this.decoder_.readSplitFixed64(a);
};
jspb.BinaryReader.prototype.readPackedField_ = function (a) {
  goog.asserts.assert(this.nextWireType_ == jspb.BinaryConstants.WireType.DELIMITED);
  var b = this.decoder_.readUnsignedVarint32();
  b = this.decoder_.getCursor() + b;
  for (var c = []; this.decoder_.getCursor() < b;) c.push(a.call(this.decoder_));
  return c;
};
jspb.BinaryReader.prototype.readPackedInt32 = function () {
  return this.readPackedField_(this.decoder_.readSignedVarint32);
};
jspb.BinaryReader.prototype.readPackedInt32String = function () {
  return this.readPackedField_(this.decoder_.readSignedVarint32String);
};
jspb.BinaryReader.prototype.readPackedInt64 = function () {
  return this.readPackedField_(this.decoder_.readSignedVarint64);
};
jspb.BinaryReader.prototype.readPackedInt64String = function () {
  return this.readPackedField_(this.decoder_.readSignedVarint64String);
};
jspb.BinaryReader.prototype.readPackedUint32 = function () {
  return this.readPackedField_(this.decoder_.readUnsignedVarint32);
};
jspb.BinaryReader.prototype.readPackedUint32String = function () {
  return this.readPackedField_(this.decoder_.readUnsignedVarint32String);
};
jspb.BinaryReader.prototype.readPackedUint64 = function () {
  return this.readPackedField_(this.decoder_.readUnsignedVarint64);
};
jspb.BinaryReader.prototype.readPackedUint64String = function () {
  return this.readPackedField_(this.decoder_.readUnsignedVarint64String);
};
jspb.BinaryReader.prototype.readPackedSint32 = function () {
  return this.readPackedField_(this.decoder_.readZigzagVarint32);
};
jspb.BinaryReader.prototype.readPackedSint64 = function () {
  return this.readPackedField_(this.decoder_.readZigzagVarint64);
};
jspb.BinaryReader.prototype.readPackedSint64String = function () {
  return this.readPackedField_(this.decoder_.readZigzagVarint64String);
};
jspb.BinaryReader.prototype.readPackedFixed32 = function () {
  return this.readPackedField_(this.decoder_.readUint32);
};
jspb.BinaryReader.prototype.readPackedFixed64 = function () {
  return this.readPackedField_(this.decoder_.readUint64);
};
jspb.BinaryReader.prototype.readPackedFixed64String = function () {
  return this.readPackedField_(this.decoder_.readUint64String);
};
jspb.BinaryReader.prototype.readPackedSfixed32 = function () {
  return this.readPackedField_(this.decoder_.readInt32);
};
jspb.BinaryReader.prototype.readPackedSfixed64 = function () {
  return this.readPackedField_(this.decoder_.readInt64);
};
jspb.BinaryReader.prototype.readPackedSfixed64String = function () {
  return this.readPackedField_(this.decoder_.readInt64String);
};
jspb.BinaryReader.prototype.readPackedFloat = function () {
  return this.readPackedField_(this.decoder_.readFloat);
};
jspb.BinaryReader.prototype.readPackedDouble = function () {
  return this.readPackedField_(this.decoder_.readDouble);
};
jspb.BinaryReader.prototype.readPackedBool = function () {
  return this.readPackedField_(this.decoder_.readBool);
};
jspb.BinaryReader.prototype.readPackedEnum = function () {
  return this.readPackedField_(this.decoder_.readEnum);
};
jspb.BinaryReader.prototype.readPackedVarintHash64 = function () {
  return this.readPackedField_(this.decoder_.readVarintHash64);
};
jspb.BinaryReader.prototype.readPackedFixedHash64 = function () {
  return this.readPackedField_(this.decoder_.readFixedHash64);
};
jspb.Map = function (a, b) {
  this.arr_ = a;
  this.valueCtor_ = b;
  this.map_ = {};
  this.arrClean = !0;
  0 < this.arr_.length && this.loadFromArray_();
};
jspb.Map.prototype.loadFromArray_ = function () {
  for (var a = 0; a < this.arr_.length; a++) {
    var b = this.arr_[a],
      c = b[0];
    this.map_[c.toString()] = new jspb.Map.Entry_(c, b[1]);
  }
  this.arrClean = !0;
};
jspb.Map.prototype.toArray = function () {
  if (this.arrClean) {
    if (this.valueCtor_) {
      var a = this.map_,
        b;
      for (b in a) if (Object.prototype.hasOwnProperty.call(a, b)) {
        var c = a[b].valueWrapper;
        c && c.toArray();
      }
    }
  } else {
    this.arr_.length = 0;
    a = this.stringKeys_();
    a.sort();
    for (b = 0; b < a.length; b++) {
      var d = this.map_[a[b]];
      (c = d.valueWrapper) && c.toArray();
      this.arr_.push([d.key, d.value]);
    }
    this.arrClean = !0;
  }
  return this.arr_;
};
jspb.Map.prototype.toObject = function (a, b) {
  for (var c = this.toArray(), d = [], e = 0; e < c.length; e++) {
    var f = this.map_[c[e][0].toString()];
    this.wrapEntry_(f);
    var g = f.valueWrapper;
    g ? (goog.asserts.assert(b), d.push([f.key, b(a, g)])) : d.push([f.key, f.value]);
  }
  return d;
};
jspb.Map.fromObject = function (a, b, c) {
  b = new jspb.Map([], b);
  for (var d = 0; d < a.length; d++) {
    var e = a[d][0],
      f = c(a[d][1]);
    b.set(e, f);
  }
  return b;
};
jspb.Map.ArrayIteratorIterable_ = function (a) {
  this.idx_ = 0;
  this.arr_ = a;
};
jspb.Map.ArrayIteratorIterable_.prototype.next = function () {
  return this.idx_ < this.arr_.length ? {
    done: !1,
    value: this.arr_[this.idx_++]
  } : {
    done: !0,
    value: void 0
  };
};
"undefined" != typeof Symbol && (jspb.Map.ArrayIteratorIterable_.prototype[Symbol.iterator] = function () {
  return this;
});
jspb.Map.prototype.getLength = function () {
  return this.stringKeys_().length;
};
jspb.Map.prototype.clear = function () {
  this.map_ = {};
  this.arrClean = !1;
};
jspb.Map.prototype.del = function (a) {
  a = a.toString();
  var b = this.map_.hasOwnProperty(a);
  delete this.map_[a];
  this.arrClean = !1;
  return b;
};
jspb.Map.prototype.getEntryList = function () {
  var a = [],
    b = this.stringKeys_();
  b.sort();
  for (var c = 0; c < b.length; c++) {
    var d = this.map_[b[c]];
    a.push([d.key, d.value]);
  }
  return a;
};
jspb.Map.prototype.entries = function () {
  var a = [],
    b = this.stringKeys_();
  b.sort();
  for (var c = 0; c < b.length; c++) {
    var d = this.map_[b[c]];
    a.push([d.key, this.wrapEntry_(d)]);
  }
  return new jspb.Map.ArrayIteratorIterable_(a);
};
jspb.Map.prototype.keys = function () {
  var a = [],
    b = this.stringKeys_();
  b.sort();
  for (var c = 0; c < b.length; c++) a.push(this.map_[b[c]].key);
  return new jspb.Map.ArrayIteratorIterable_(a);
};
jspb.Map.prototype.values = function () {
  var a = [],
    b = this.stringKeys_();
  b.sort();
  for (var c = 0; c < b.length; c++) a.push(this.wrapEntry_(this.map_[b[c]]));
  return new jspb.Map.ArrayIteratorIterable_(a);
};
jspb.Map.prototype.forEach = function (a, b) {
  var c = this.stringKeys_();
  c.sort();
  for (var d = 0; d < c.length; d++) {
    var e = this.map_[c[d]];
    a.call(b, this.wrapEntry_(e), e.key, this);
  }
};
jspb.Map.prototype.set = function (a, b) {
  var c = new jspb.Map.Entry_(a);
  this.valueCtor_ ? (c.valueWrapper = b, c.value = b.toArray()) : c.value = b;
  this.map_[a.toString()] = c;
  this.arrClean = !1;
  return this;
};
jspb.Map.prototype.wrapEntry_ = function (a) {
  return this.valueCtor_ ? (a.valueWrapper || (a.valueWrapper = new this.valueCtor_(a.value)), a.valueWrapper) : a.value;
};
jspb.Map.prototype.get = function (a) {
  if (a = this.map_[a.toString()]) return this.wrapEntry_(a);
};
jspb.Map.prototype.has = function (a) {
  return a.toString() in this.map_;
};
jspb.Map.prototype.serializeBinary = function (a, b, c, d, e) {
  var f = this.stringKeys_();
  f.sort();
  for (var g = 0; g < f.length; g++) {
    var h = this.map_[f[g]];
    b.beginSubMessage(a);
    c.call(b, 1, h.key);
    this.valueCtor_ ? d.call(b, 2, this.wrapEntry_(h), e) : d.call(b, 2, h.value);
    b.endSubMessage();
  }
};
jspb.Map.deserializeBinary = function (a, b, c, d, e, f, g) {
  for (; b.nextField() && !b.isEndGroup();) {
    var h = b.getFieldNumber();
    1 == h ? f = c.call(b) : 2 == h && (a.valueCtor_ ? (goog.asserts.assert(e), g || (g = new a.valueCtor_()), d.call(b, g, e)) : g = d.call(b));
  }
  goog.asserts.assert(void 0 != f);
  goog.asserts.assert(void 0 != g);
  a.set(f, g);
};
jspb.Map.prototype.stringKeys_ = function () {
  var a = this.map_,
    b = [],
    c;
  for (c in a) Object.prototype.hasOwnProperty.call(a, c) && b.push(c);
  return b;
};
jspb.Map.Entry_ = function (a, b) {
  this.key = a;
  this.value = b;
  this.valueWrapper = void 0;
};
jspb.ExtensionFieldInfo = function (a, b, c, d, e) {
  this.fieldIndex = a;
  this.fieldName = b;
  this.ctor = c;
  this.toObjectFn = d;
  this.isRepeated = e;
};
jspb.ExtensionFieldBinaryInfo = function (a, b, c, d, e, f) {
  this.fieldInfo = a;
  this.binaryReaderFn = b;
  this.binaryWriterFn = c;
  this.binaryMessageSerializeFn = d;
  this.binaryMessageDeserializeFn = e;
  this.isPacked = f;
};
jspb.ExtensionFieldInfo.prototype.isMessageType = function () {
  return !!this.ctor;
};
jspb.Message = function () {};
jspb.Message.GENERATE_TO_OBJECT = !0;
jspb.Message.GENERATE_FROM_OBJECT = !goog.DISALLOW_TEST_ONLY_CODE;
jspb.Message.GENERATE_TO_STRING = !0;
jspb.Message.ASSUME_LOCAL_ARRAYS = !1;
jspb.Message.SERIALIZE_EMPTY_TRAILING_FIELDS = !0;
jspb.Message.SUPPORTS_UINT8ARRAY_ = "function" == typeof Uint8Array;
jspb.Message.prototype.getJsPbMessageId = function () {
  return this.messageId_;
};
jspb.Message.getIndex_ = function (a, b) {
  return b + a.arrayIndexOffset_;
};
jspb.Message.hiddenES6Property_ = function () {};
jspb.Message.getFieldNumber_ = function (a, b) {
  return b - a.arrayIndexOffset_;
};
jspb.Message.initialize = function (a, b, c, d, e, f) {
  a.wrappers_ = null;
  b || (b = c ? [c] : []);
  a.messageId_ = c ? String(c) : void 0;
  a.arrayIndexOffset_ = 0 === c ? -1 : 0;
  a.array = b;
  jspb.Message.initPivotAndExtensionObject_(a, d);
  a.convertedPrimitiveFields_ = {};
  jspb.Message.SERIALIZE_EMPTY_TRAILING_FIELDS || (a.repeatedFields = e);
  if (e) for (b = 0; b < e.length; b++) c = e[b], c < a.pivot_ ? (c = jspb.Message.getIndex_(a, c), a.array[c] = a.array[c] || jspb.Message.EMPTY_LIST_SENTINEL_) : (jspb.Message.maybeInitEmptyExtensionObject_(a), a.extensionObject_[c] = a.extensionObject_[c] || jspb.Message.EMPTY_LIST_SENTINEL_);
  if (f && f.length) for (b = 0; b < f.length; b++) jspb.Message.computeOneofCase(a, f[b]);
};
jspb.Message.EMPTY_LIST_SENTINEL_ = goog.DEBUG && Object.freeze ? Object.freeze([]) : [];
jspb.Message.isArray_ = function (a) {
  return jspb.Message.ASSUME_LOCAL_ARRAYS ? a instanceof Array : Array.isArray(a);
};
jspb.Message.isExtensionObject_ = function (a) {
  return null !== a && "object" == typeof a && !jspb.Message.isArray_(a) && !(jspb.Message.SUPPORTS_UINT8ARRAY_ && a instanceof Uint8Array);
};
jspb.Message.initPivotAndExtensionObject_ = function (a, b) {
  var c = a.array.length,
    d = -1;
  if (c && (d = c - 1, c = a.array[d], jspb.Message.isExtensionObject_(c))) {
    a.pivot_ = jspb.Message.getFieldNumber_(a, d);
    a.extensionObject_ = c;
    return;
  }
  -1 < b ? (a.pivot_ = Math.max(b, jspb.Message.getFieldNumber_(a, d + 1)), a.extensionObject_ = null) : a.pivot_ = Number.MAX_VALUE;
};
jspb.Message.maybeInitEmptyExtensionObject_ = function (a) {
  var b = jspb.Message.getIndex_(a, a.pivot_);
  a.array[b] || (a.extensionObject_ = a.array[b] = {});
};
jspb.Message.toObjectList = function (a, b, c) {
  for (var d = [], e = 0; e < a.length; e++) d[e] = b.call(a[e], c, a[e]);
  return d;
};
jspb.Message.toObjectExtension = function (a, b, c, d, e) {
  for (var f in c) {
    var g = c[f],
      h = d.call(a, g);
    if (null != h) {
      for (var k in g.fieldName) if (g.fieldName.hasOwnProperty(k)) break;
      b[k] = g.toObjectFn ? g.isRepeated ? jspb.Message.toObjectList(h, g.toObjectFn, e) : g.toObjectFn(e, h) : h;
    }
  }
};
jspb.Message.serializeBinaryExtensions = function (a, b, c, d) {
  for (var e in c) {
    var f = c[e],
      g = f.fieldInfo;
    if (!f.binaryWriterFn) throw Error("Message extension present that was generated without binary serialization support");
    var h = d.call(a, g);
    if (null != h) if (g.isMessageType()) {
      if (f.binaryMessageSerializeFn) f.binaryWriterFn.call(b, g.fieldIndex, h, f.binaryMessageSerializeFn);else throw Error("Message extension present holding submessage without binary support enabled, and message is being serialized to binary format");
    } else f.binaryWriterFn.call(b, g.fieldIndex, h);
  }
};
jspb.Message.readBinaryExtension = function (a, b, c, d, e) {
  var f = c[b.getFieldNumber()];
  if (f) {
    c = f.fieldInfo;
    if (!f.binaryReaderFn) throw Error("Deserializing extension whose generated code does not support binary format");
    if (c.isMessageType()) {
      var g = new c.ctor();
      f.binaryReaderFn.call(b, g, f.binaryMessageDeserializeFn);
    } else g = f.binaryReaderFn.call(b);
    c.isRepeated && !f.isPacked ? (b = d.call(a, c)) ? b.push(g) : e.call(a, c, [g]) : e.call(a, c, g);
  } else b.skipField();
};
jspb.Message.getField = function (a, b) {
  if (b < a.pivot_) {
    b = jspb.Message.getIndex_(a, b);
    var c = a.array[b];
    return c === jspb.Message.EMPTY_LIST_SENTINEL_ ? a.array[b] = [] : c;
  }
  if (a.extensionObject_) return c = a.extensionObject_[b], c === jspb.Message.EMPTY_LIST_SENTINEL_ ? a.extensionObject_[b] = [] : c;
};
jspb.Message.getRepeatedField = function (a, b) {
  return jspb.Message.getField(a, b);
};
jspb.Message.getOptionalFloatingPointField = function (a, b) {
  a = jspb.Message.getField(a, b);
  return null == a ? a : +a;
};
jspb.Message.getBooleanField = function (a, b) {
  a = jspb.Message.getField(a, b);
  return null == a ? a : !!a;
};
jspb.Message.getRepeatedFloatingPointField = function (a, b) {
  var c = jspb.Message.getRepeatedField(a, b);
  a.convertedPrimitiveFields_ || (a.convertedPrimitiveFields_ = {});
  if (!a.convertedPrimitiveFields_[b]) {
    for (var d = 0; d < c.length; d++) c[d] = +c[d];
    a.convertedPrimitiveFields_[b] = !0;
  }
  return c;
};
jspb.Message.getRepeatedBooleanField = function (a, b) {
  var c = jspb.Message.getRepeatedField(a, b);
  a.convertedPrimitiveFields_ || (a.convertedPrimitiveFields_ = {});
  if (!a.convertedPrimitiveFields_[b]) {
    for (var d = 0; d < c.length; d++) c[d] = !!c[d];
    a.convertedPrimitiveFields_[b] = !0;
  }
  return c;
};
jspb.Message.bytesAsB64 = function (a) {
  if (null == a || "string" === typeof a) return a;
  if (jspb.Message.SUPPORTS_UINT8ARRAY_ && a instanceof Uint8Array) return goog.crypt.base64.encodeByteArray(a);
  goog.asserts.fail("Cannot coerce to b64 string: " + goog.typeOf(a));
  return null;
};
jspb.Message.bytesAsU8 = function (a) {
  if (null == a || a instanceof Uint8Array) return a;
  if ("string" === typeof a) return goog.crypt.base64.decodeStringToUint8Array(a);
  goog.asserts.fail("Cannot coerce to Uint8Array: " + goog.typeOf(a));
  return null;
};
jspb.Message.bytesListAsB64 = function (a) {
  jspb.Message.assertConsistentTypes_(a);
  return a.length && "string" !== typeof a[0] ? goog.array.map(a, jspb.Message.bytesAsB64) : a;
};
jspb.Message.bytesListAsU8 = function (a) {
  jspb.Message.assertConsistentTypes_(a);
  return !a.length || a[0] instanceof Uint8Array ? a : goog.array.map(a, jspb.Message.bytesAsU8);
};
jspb.Message.assertConsistentTypes_ = function (a) {
  if (goog.DEBUG && a && 1 < a.length) {
    var b = goog.typeOf(a[0]);
    goog.array.forEach(a, function (a) {
      goog.typeOf(a) != b && goog.asserts.fail("Inconsistent type in JSPB repeated field array. Got " + goog.typeOf(a) + " expected " + b);
    });
  }
};
jspb.Message.getFieldWithDefault = function (a, b, c) {
  a = jspb.Message.getField(a, b);
  return null == a ? c : a;
};
jspb.Message.getBooleanFieldWithDefault = function (a, b, c) {
  a = jspb.Message.getBooleanField(a, b);
  return null == a ? c : a;
};
jspb.Message.getFloatingPointFieldWithDefault = function (a, b, c) {
  a = jspb.Message.getOptionalFloatingPointField(a, b);
  return null == a ? c : a;
};
jspb.Message.getFieldProto3 = jspb.Message.getFieldWithDefault;
jspb.Message.getMapField = function (a, b, c, d) {
  a.wrappers_ || (a.wrappers_ = {});
  if (b in a.wrappers_) return a.wrappers_[b];
  var e = jspb.Message.getField(a, b);
  if (!e) {
    if (c) return;
    e = [];
    jspb.Message.setField(a, b, e);
  }
  return a.wrappers_[b] = new jspb.Map(e, d);
};
jspb.Message.setField = function (a, b, c) {
  goog.asserts.assertInstanceof(a, jspb.Message);
  b < a.pivot_ ? a.array[jspb.Message.getIndex_(a, b)] = c : (jspb.Message.maybeInitEmptyExtensionObject_(a), a.extensionObject_[b] = c);
  return a;
};
jspb.Message.setProto3IntField = function (a, b, c) {
  return jspb.Message.setFieldIgnoringDefault_(a, b, c, 0);
};
jspb.Message.setProto3FloatField = function (a, b, c) {
  return jspb.Message.setFieldIgnoringDefault_(a, b, c, 0);
};
jspb.Message.setProto3BooleanField = function (a, b, c) {
  return jspb.Message.setFieldIgnoringDefault_(a, b, c, !1);
};
jspb.Message.setProto3StringField = function (a, b, c) {
  return jspb.Message.setFieldIgnoringDefault_(a, b, c, "");
};
jspb.Message.setProto3BytesField = function (a, b, c) {
  return jspb.Message.setFieldIgnoringDefault_(a, b, c, "");
};
jspb.Message.setProto3EnumField = function (a, b, c) {
  return jspb.Message.setFieldIgnoringDefault_(a, b, c, 0);
};
jspb.Message.setProto3StringIntField = function (a, b, c) {
  return jspb.Message.setFieldIgnoringDefault_(a, b, c, "0");
};
jspb.Message.setFieldIgnoringDefault_ = function (a, b, c, d) {
  goog.asserts.assertInstanceof(a, jspb.Message);
  c !== d ? jspb.Message.setField(a, b, c) : b < a.pivot_ ? a.array[jspb.Message.getIndex_(a, b)] = null : (jspb.Message.maybeInitEmptyExtensionObject_(a), delete a.extensionObject_[b]);
  return a;
};
jspb.Message.addToRepeatedField = function (a, b, c, d) {
  goog.asserts.assertInstanceof(a, jspb.Message);
  b = jspb.Message.getRepeatedField(a, b);
  void 0 != d ? b.splice(d, 0, c) : b.push(c);
  return a;
};
jspb.Message.setOneofField = function (a, b, c, d) {
  goog.asserts.assertInstanceof(a, jspb.Message);
  (c = jspb.Message.computeOneofCase(a, c)) && c !== b && void 0 !== d && (a.wrappers_ && c in a.wrappers_ && (a.wrappers_[c] = void 0), jspb.Message.setField(a, c, void 0));
  return jspb.Message.setField(a, b, d);
};
jspb.Message.computeOneofCase = function (a, b) {
  for (var c, d, e = 0; e < b.length; e++) {
    var f = b[e],
      g = jspb.Message.getField(a, f);
    null != g && (c = f, d = g, jspb.Message.setField(a, f, void 0));
  }
  return c ? (jspb.Message.setField(a, c, d), c) : 0;
};
jspb.Message.getWrapperField = function (a, b, c, d) {
  a.wrappers_ || (a.wrappers_ = {});
  if (!a.wrappers_[c]) {
    var e = jspb.Message.getField(a, c);
    if (d || e) a.wrappers_[c] = new b(e);
  }
  return a.wrappers_[c];
};
jspb.Message.getRepeatedWrapperField = function (a, b, c) {
  jspb.Message.wrapRepeatedField_(a, b, c);
  b = a.wrappers_[c];
  b == jspb.Message.EMPTY_LIST_SENTINEL_ && (b = a.wrappers_[c] = []);
  return b;
};
jspb.Message.wrapRepeatedField_ = function (a, b, c) {
  a.wrappers_ || (a.wrappers_ = {});
  if (!a.wrappers_[c]) {
    for (var d = jspb.Message.getRepeatedField(a, c), e = [], f = 0; f < d.length; f++) e[f] = new b(d[f]);
    a.wrappers_[c] = e;
  }
};
jspb.Message.setWrapperField = function (a, b, c) {
  goog.asserts.assertInstanceof(a, jspb.Message);
  a.wrappers_ || (a.wrappers_ = {});
  var d = c ? c.toArray() : c;
  a.wrappers_[b] = c;
  return jspb.Message.setField(a, b, d);
};
jspb.Message.setOneofWrapperField = function (a, b, c, d) {
  goog.asserts.assertInstanceof(a, jspb.Message);
  a.wrappers_ || (a.wrappers_ = {});
  var e = d ? d.toArray() : d;
  a.wrappers_[b] = d;
  return jspb.Message.setOneofField(a, b, c, e);
};
jspb.Message.setRepeatedWrapperField = function (a, b, c) {
  goog.asserts.assertInstanceof(a, jspb.Message);
  a.wrappers_ || (a.wrappers_ = {});
  c = c || [];
  for (var d = [], e = 0; e < c.length; e++) d[e] = c[e].toArray();
  a.wrappers_[b] = c;
  return jspb.Message.setField(a, b, d);
};
jspb.Message.addToRepeatedWrapperField = function (a, b, c, d, e) {
  jspb.Message.wrapRepeatedField_(a, d, b);
  var f = a.wrappers_[b];
  f || (f = a.wrappers_[b] = []);
  c = c ? c : new d();
  a = jspb.Message.getRepeatedField(a, b);
  void 0 != e ? (f.splice(e, 0, c), a.splice(e, 0, c.toArray())) : (f.push(c), a.push(c.toArray()));
  return c;
};
jspb.Message.toMap = function (a, b, c, d) {
  for (var e = {}, f = 0; f < a.length; f++) e[b.call(a[f])] = c ? c.call(a[f], d, a[f]) : a[f];
  return e;
};
jspb.Message.prototype.syncMapFields_ = function () {
  if (this.wrappers_) for (var a in this.wrappers_) {
    var b = this.wrappers_[a];
    if (Array.isArray(b)) for (var c = 0; c < b.length; c++) b[c] && b[c].toArray();else b && b.toArray();
  }
};
jspb.Message.prototype.toArray = function () {
  this.syncMapFields_();
  return this.array;
};
jspb.Message.GENERATE_TO_STRING && (jspb.Message.prototype.toString = function () {
  this.syncMapFields_();
  return this.array.toString();
});
jspb.Message.prototype.getExtension = function (a) {
  if (this.extensionObject_) {
    this.wrappers_ || (this.wrappers_ = {});
    var b = a.fieldIndex;
    if (a.isRepeated) {
      if (a.isMessageType()) return this.wrappers_[b] || (this.wrappers_[b] = goog.array.map(this.extensionObject_[b] || [], function (b) {
        return new a.ctor(b);
      })), this.wrappers_[b];
    } else if (a.isMessageType()) return !this.wrappers_[b] && this.extensionObject_[b] && (this.wrappers_[b] = new a.ctor(this.extensionObject_[b])), this.wrappers_[b];
    return this.extensionObject_[b];
  }
};
jspb.Message.prototype.setExtension = function (a, b) {
  this.wrappers_ || (this.wrappers_ = {});
  jspb.Message.maybeInitEmptyExtensionObject_(this);
  var c = a.fieldIndex;
  a.isRepeated ? (b = b || [], a.isMessageType() ? (this.wrappers_[c] = b, this.extensionObject_[c] = goog.array.map(b, function (a) {
    return a.toArray();
  })) : this.extensionObject_[c] = b) : a.isMessageType() ? (this.wrappers_[c] = b, this.extensionObject_[c] = b ? b.toArray() : b) : this.extensionObject_[c] = b;
  return this;
};
jspb.Message.difference = function (a, b) {
  if (!(a instanceof b.constructor)) throw Error("Messages have different types.");
  var c = a.toArray();
  b = b.toArray();
  var d = [],
    e = 0,
    f = c.length > b.length ? c.length : b.length;
  a.getJsPbMessageId() && (d[0] = a.getJsPbMessageId(), e = 1);
  for (; e < f; e++) jspb.Message.compareFields(c[e], b[e]) || (d[e] = b[e]);
  return new a.constructor(d);
};
jspb.Message.equals = function (a, b) {
  return a == b || !(!a || !b) && a instanceof b.constructor && jspb.Message.compareFields(a.toArray(), b.toArray());
};
jspb.Message.compareExtensions = function (a, b) {
  a = a || {};
  b = b || {};
  var c = {},
    d;
  for (d in a) c[d] = 0;
  for (d in b) c[d] = 0;
  for (d in c) if (!jspb.Message.compareFields(a[d], b[d])) return !1;
  return !0;
};
jspb.Message.compareFields = function (a, b) {
  if (a == b) return !0;
  if (!goog.isObject(a) || !goog.isObject(b)) return "number" === typeof a && isNaN(a) || "number" === typeof b && isNaN(b) ? String(a) == String(b) : !1;
  if (a.constructor != b.constructor) return !1;
  if (jspb.Message.SUPPORTS_UINT8ARRAY_ && a.constructor === Uint8Array) {
    if (a.length != b.length) return !1;
    for (var c = 0; c < a.length; c++) if (a[c] != b[c]) return !1;
    return !0;
  }
  if (a.constructor === Array) {
    var d = void 0,
      e = void 0,
      f = Math.max(a.length, b.length);
    for (c = 0; c < f; c++) {
      var g = a[c],
        h = b[c];
      g && g.constructor == Object && (goog.asserts.assert(void 0 === d), goog.asserts.assert(c === a.length - 1), d = g, g = void 0);
      h && h.constructor == Object && (goog.asserts.assert(void 0 === e), goog.asserts.assert(c === b.length - 1), e = h, h = void 0);
      if (!jspb.Message.compareFields(g, h)) return !1;
    }
    return d || e ? (d = d || {}, e = e || {}, jspb.Message.compareExtensions(d, e)) : !0;
  }
  if (a.constructor === Object) return jspb.Message.compareExtensions(a, b);
  throw Error("Invalid type in JSPB array");
};
jspb.Message.prototype.cloneMessage = function () {
  return jspb.Message.cloneMessage(this);
};
jspb.Message.prototype.clone = function () {
  return jspb.Message.cloneMessage(this);
};
jspb.Message.clone = function (a) {
  return jspb.Message.cloneMessage(a);
};
jspb.Message.cloneMessage = function (a) {
  return new a.constructor(jspb.Message.clone_(a.toArray()));
};
jspb.Message.copyInto = function (a, b) {
  goog.asserts.assertInstanceof(a, jspb.Message);
  goog.asserts.assertInstanceof(b, jspb.Message);
  goog.asserts.assert(a.constructor == b.constructor, "Copy source and target message should have the same type.");
  a = jspb.Message.clone(a);
  for (var c = b.toArray(), d = a.toArray(), e = c.length = 0; e < d.length; e++) c[e] = d[e];
  b.wrappers_ = a.wrappers_;
  b.extensionObject_ = a.extensionObject_;
};
jspb.Message.clone_ = function (a) {
  if (Array.isArray(a)) {
    for (var b = Array(a.length), c = 0; c < a.length; c++) {
      var d = a[c];
      null != d && (b[c] = "object" == typeof d ? jspb.Message.clone_(goog.asserts.assert(d)) : d);
    }
    return b;
  }
  if (jspb.Message.SUPPORTS_UINT8ARRAY_ && a instanceof Uint8Array) return new Uint8Array(a);
  b = {};
  for (c in a) d = a[c], null != d && (b[c] = "object" == typeof d ? jspb.Message.clone_(goog.asserts.assert(d)) : d);
  return b;
};
jspb.Message.registerMessageType = function (a, b) {
  b.messageId = a;
};
jspb.Message.messageSetExtensions = {};
jspb.Message.messageSetExtensionsBinary = {};
jspb.arith = {};
jspb.arith.UInt64 = function (a, b) {
  this.lo = a;
  this.hi = b;
};
jspb.arith.UInt64.prototype.cmp = function (a) {
  return this.hi < a.hi || this.hi == a.hi && this.lo < a.lo ? -1 : this.hi == a.hi && this.lo == a.lo ? 0 : 1;
};
jspb.arith.UInt64.prototype.rightShift = function () {
  return new jspb.arith.UInt64((this.lo >>> 1 | (this.hi & 1) << 31) >>> 0, this.hi >>> 1 >>> 0);
};
jspb.arith.UInt64.prototype.leftShift = function () {
  return new jspb.arith.UInt64(this.lo << 1 >>> 0, (this.hi << 1 | this.lo >>> 31) >>> 0);
};
jspb.arith.UInt64.prototype.msb = function () {
  return !!(this.hi & 2147483648);
};
jspb.arith.UInt64.prototype.lsb = function () {
  return !!(this.lo & 1);
};
jspb.arith.UInt64.prototype.zero = function () {
  return 0 == this.lo && 0 == this.hi;
};
jspb.arith.UInt64.prototype.add = function (a) {
  return new jspb.arith.UInt64((this.lo + a.lo & 4294967295) >>> 0 >>> 0, ((this.hi + a.hi & 4294967295) >>> 0) + (4294967296 <= this.lo + a.lo ? 1 : 0) >>> 0);
};
jspb.arith.UInt64.prototype.sub = function (a) {
  return new jspb.arith.UInt64((this.lo - a.lo & 4294967295) >>> 0 >>> 0, ((this.hi - a.hi & 4294967295) >>> 0) - (0 > this.lo - a.lo ? 1 : 0) >>> 0);
};
jspb.arith.UInt64.mul32x32 = function (a, b) {
  var c = a & 65535;
  a >>>= 16;
  var d = b & 65535,
    e = b >>> 16;
  b = c * d + 65536 * (c * e & 65535) + 65536 * (a * d & 65535);
  for (c = a * e + (c * e >>> 16) + (a * d >>> 16); 4294967296 <= b;) b -= 4294967296, c += 1;
  return new jspb.arith.UInt64(b >>> 0, c >>> 0);
};
jspb.arith.UInt64.prototype.mul = function (a) {
  var b = jspb.arith.UInt64.mul32x32(this.lo, a);
  a = jspb.arith.UInt64.mul32x32(this.hi, a);
  a.hi = a.lo;
  a.lo = 0;
  return b.add(a);
};
jspb.arith.UInt64.prototype.div = function (a) {
  if (0 == a) return [];
  var b = new jspb.arith.UInt64(0, 0),
    c = new jspb.arith.UInt64(this.lo, this.hi);
  a = new jspb.arith.UInt64(a, 0);
  for (var d = new jspb.arith.UInt64(1, 0); !a.msb();) a = a.leftShift(), d = d.leftShift();
  for (; !d.zero();) 0 >= a.cmp(c) && (b = b.add(d), c = c.sub(a)), a = a.rightShift(), d = d.rightShift();
  return [b, c];
};
jspb.arith.UInt64.prototype.toString = function () {
  for (var a = "", b = this; !b.zero();) {
    b = b.div(10);
    var c = b[0];
    a = b[1].lo + a;
    b = c;
  }
  "" == a && (a = "0");
  return a;
};
jspb.arith.UInt64.fromString = function (a) {
  for (var b = new jspb.arith.UInt64(0, 0), c = new jspb.arith.UInt64(0, 0), d = 0; d < a.length; d++) {
    if ("0" > a[d] || "9" < a[d]) return null;
    var e = parseInt(a[d], 10);
    c.lo = e;
    b = b.mul(10).add(c);
  }
  return b;
};
jspb.arith.UInt64.prototype.clone = function () {
  return new jspb.arith.UInt64(this.lo, this.hi);
};
jspb.arith.Int64 = function (a, b) {
  this.lo = a;
  this.hi = b;
};
jspb.arith.Int64.prototype.add = function (a) {
  return new jspb.arith.Int64((this.lo + a.lo & 4294967295) >>> 0 >>> 0, ((this.hi + a.hi & 4294967295) >>> 0) + (4294967296 <= this.lo + a.lo ? 1 : 0) >>> 0);
};
jspb.arith.Int64.prototype.sub = function (a) {
  return new jspb.arith.Int64((this.lo - a.lo & 4294967295) >>> 0 >>> 0, ((this.hi - a.hi & 4294967295) >>> 0) - (0 > this.lo - a.lo ? 1 : 0) >>> 0);
};
jspb.arith.Int64.prototype.clone = function () {
  return new jspb.arith.Int64(this.lo, this.hi);
};
jspb.arith.Int64.prototype.toString = function () {
  var a = 0 != (this.hi & 2147483648),
    b = new jspb.arith.UInt64(this.lo, this.hi);
  a && (b = new jspb.arith.UInt64(0, 0).sub(b));
  return (a ? "-" : "") + b.toString();
};
jspb.arith.Int64.fromString = function (a) {
  var b = 0 < a.length && "-" == a[0];
  b && (a = a.substring(1));
  a = jspb.arith.UInt64.fromString(a);
  if (null === a) return null;
  b && (a = new jspb.arith.UInt64(0, 0).sub(a));
  return new jspb.arith.Int64(a.lo, a.hi);
};
jspb.BinaryEncoder = function () {
  this.buffer_ = [];
};
jspb.BinaryEncoder.prototype.length = function () {
  return this.buffer_.length;
};
jspb.BinaryEncoder.prototype.end = function () {
  var a = this.buffer_;
  this.buffer_ = [];
  return a;
};
jspb.BinaryEncoder.prototype.writeSplitVarint64 = function (a, b) {
  goog.asserts.assert(a == Math.floor(a));
  goog.asserts.assert(b == Math.floor(b));
  goog.asserts.assert(0 <= a && a < jspb.BinaryConstants.TWO_TO_32);
  for (goog.asserts.assert(0 <= b && b < jspb.BinaryConstants.TWO_TO_32); 0 < b || 127 < a;) this.buffer_.push(a & 127 | 128), a = (a >>> 7 | b << 25) >>> 0, b >>>= 7;
  this.buffer_.push(a);
};
jspb.BinaryEncoder.prototype.writeSplitFixed64 = function (a, b) {
  goog.asserts.assert(a == Math.floor(a));
  goog.asserts.assert(b == Math.floor(b));
  goog.asserts.assert(0 <= a && a < jspb.BinaryConstants.TWO_TO_32);
  goog.asserts.assert(0 <= b && b < jspb.BinaryConstants.TWO_TO_32);
  this.writeUint32(a);
  this.writeUint32(b);
};
jspb.BinaryEncoder.prototype.writeUnsignedVarint32 = function (a) {
  goog.asserts.assert(a == Math.floor(a));
  for (goog.asserts.assert(0 <= a && a < jspb.BinaryConstants.TWO_TO_32); 127 < a;) this.buffer_.push(a & 127 | 128), a >>>= 7;
  this.buffer_.push(a);
};
jspb.BinaryEncoder.prototype.writeSignedVarint32 = function (a) {
  goog.asserts.assert(a == Math.floor(a));
  goog.asserts.assert(a >= -jspb.BinaryConstants.TWO_TO_31 && a < jspb.BinaryConstants.TWO_TO_31);
  if (0 <= a) this.writeUnsignedVarint32(a);else {
    for (var b = 0; 9 > b; b++) this.buffer_.push(a & 127 | 128), a >>= 7;
    this.buffer_.push(1);
  }
};
jspb.BinaryEncoder.prototype.writeUnsignedVarint64 = function (a) {
  goog.asserts.assert(a == Math.floor(a));
  goog.asserts.assert(0 <= a && a < jspb.BinaryConstants.TWO_TO_64);
  jspb.utils.splitInt64(a);
  this.writeSplitVarint64(jspb.utils.split64Low, jspb.utils.split64High);
};
jspb.BinaryEncoder.prototype.writeSignedVarint64 = function (a) {
  goog.asserts.assert(a == Math.floor(a));
  goog.asserts.assert(a >= -jspb.BinaryConstants.TWO_TO_63 && a < jspb.BinaryConstants.TWO_TO_63);
  jspb.utils.splitInt64(a);
  this.writeSplitVarint64(jspb.utils.split64Low, jspb.utils.split64High);
};
jspb.BinaryEncoder.prototype.writeZigzagVarint32 = function (a) {
  goog.asserts.assert(a == Math.floor(a));
  goog.asserts.assert(a >= -jspb.BinaryConstants.TWO_TO_31 && a < jspb.BinaryConstants.TWO_TO_31);
  this.writeUnsignedVarint32((a << 1 ^ a >> 31) >>> 0);
};
jspb.BinaryEncoder.prototype.writeZigzagVarint64 = function (a) {
  goog.asserts.assert(a == Math.floor(a));
  goog.asserts.assert(a >= -jspb.BinaryConstants.TWO_TO_63 && a < jspb.BinaryConstants.TWO_TO_63);
  jspb.utils.splitZigzag64(a);
  this.writeSplitVarint64(jspb.utils.split64Low, jspb.utils.split64High);
};
jspb.BinaryEncoder.prototype.writeZigzagVarint64String = function (a) {
  this.writeZigzagVarintHash64(jspb.utils.decimalStringToHash64(a));
};
jspb.BinaryEncoder.prototype.writeZigzagVarintHash64 = function (a) {
  var b = this;
  jspb.utils.splitHash64(a);
  jspb.utils.toZigzag64(jspb.utils.split64Low, jspb.utils.split64High, function (a, d) {
    b.writeSplitVarint64(a >>> 0, d >>> 0);
  });
};
jspb.BinaryEncoder.prototype.writeUint8 = function (a) {
  goog.asserts.assert(a == Math.floor(a));
  goog.asserts.assert(0 <= a && 256 > a);
  this.buffer_.push(a >>> 0 & 255);
};
jspb.BinaryEncoder.prototype.writeUint16 = function (a) {
  goog.asserts.assert(a == Math.floor(a));
  goog.asserts.assert(0 <= a && 65536 > a);
  this.buffer_.push(a >>> 0 & 255);
  this.buffer_.push(a >>> 8 & 255);
};
jspb.BinaryEncoder.prototype.writeUint32 = function (a) {
  goog.asserts.assert(a == Math.floor(a));
  goog.asserts.assert(0 <= a && a < jspb.BinaryConstants.TWO_TO_32);
  this.buffer_.push(a >>> 0 & 255);
  this.buffer_.push(a >>> 8 & 255);
  this.buffer_.push(a >>> 16 & 255);
  this.buffer_.push(a >>> 24 & 255);
};
jspb.BinaryEncoder.prototype.writeUint64 = function (a) {
  goog.asserts.assert(a == Math.floor(a));
  goog.asserts.assert(0 <= a && a < jspb.BinaryConstants.TWO_TO_64);
  jspb.utils.splitUint64(a);
  this.writeUint32(jspb.utils.split64Low);
  this.writeUint32(jspb.utils.split64High);
};
jspb.BinaryEncoder.prototype.writeInt8 = function (a) {
  goog.asserts.assert(a == Math.floor(a));
  goog.asserts.assert(-128 <= a && 128 > a);
  this.buffer_.push(a >>> 0 & 255);
};
jspb.BinaryEncoder.prototype.writeInt16 = function (a) {
  goog.asserts.assert(a == Math.floor(a));
  goog.asserts.assert(-32768 <= a && 32768 > a);
  this.buffer_.push(a >>> 0 & 255);
  this.buffer_.push(a >>> 8 & 255);
};
jspb.BinaryEncoder.prototype.writeInt32 = function (a) {
  goog.asserts.assert(a == Math.floor(a));
  goog.asserts.assert(a >= -jspb.BinaryConstants.TWO_TO_31 && a < jspb.BinaryConstants.TWO_TO_31);
  this.buffer_.push(a >>> 0 & 255);
  this.buffer_.push(a >>> 8 & 255);
  this.buffer_.push(a >>> 16 & 255);
  this.buffer_.push(a >>> 24 & 255);
};
jspb.BinaryEncoder.prototype.writeInt64 = function (a) {
  goog.asserts.assert(a == Math.floor(a));
  goog.asserts.assert(a >= -jspb.BinaryConstants.TWO_TO_63 && a < jspb.BinaryConstants.TWO_TO_63);
  jspb.utils.splitInt64(a);
  this.writeSplitFixed64(jspb.utils.split64Low, jspb.utils.split64High);
};
jspb.BinaryEncoder.prototype.writeInt64String = function (a) {
  goog.asserts.assert(a == Math.floor(a));
  goog.asserts.assert(+a >= -jspb.BinaryConstants.TWO_TO_63 && +a < jspb.BinaryConstants.TWO_TO_63);
  jspb.utils.splitHash64(jspb.utils.decimalStringToHash64(a));
  this.writeSplitFixed64(jspb.utils.split64Low, jspb.utils.split64High);
};
jspb.BinaryEncoder.prototype.writeFloat = function (a) {
  goog.asserts.assert(Infinity === a || -Infinity === a || isNaN(a) || a >= -jspb.BinaryConstants.FLOAT32_MAX && a <= jspb.BinaryConstants.FLOAT32_MAX);
  jspb.utils.splitFloat32(a);
  this.writeUint32(jspb.utils.split64Low);
};
jspb.BinaryEncoder.prototype.writeDouble = function (a) {
  goog.asserts.assert(Infinity === a || -Infinity === a || isNaN(a) || a >= -jspb.BinaryConstants.FLOAT64_MAX && a <= jspb.BinaryConstants.FLOAT64_MAX);
  jspb.utils.splitFloat64(a);
  this.writeUint32(jspb.utils.split64Low);
  this.writeUint32(jspb.utils.split64High);
};
jspb.BinaryEncoder.prototype.writeBool = function (a) {
  goog.asserts.assert("boolean" === typeof a || "number" === typeof a);
  this.buffer_.push(a ? 1 : 0);
};
jspb.BinaryEncoder.prototype.writeEnum = function (a) {
  goog.asserts.assert(a == Math.floor(a));
  goog.asserts.assert(a >= -jspb.BinaryConstants.TWO_TO_31 && a < jspb.BinaryConstants.TWO_TO_31);
  this.writeSignedVarint32(a);
};
jspb.BinaryEncoder.prototype.writeBytes = function (a) {
  this.buffer_.push.apply(this.buffer_, a);
};
jspb.BinaryEncoder.prototype.writeVarintHash64 = function (a) {
  jspb.utils.splitHash64(a);
  this.writeSplitVarint64(jspb.utils.split64Low, jspb.utils.split64High);
};
jspb.BinaryEncoder.prototype.writeFixedHash64 = function (a) {
  jspb.utils.splitHash64(a);
  this.writeUint32(jspb.utils.split64Low);
  this.writeUint32(jspb.utils.split64High);
};
jspb.BinaryEncoder.prototype.writeString = function (a) {
  for (var b = this.buffer_.length, c = 0; c < a.length; c++) {
    var d = a.charCodeAt(c);
    if (128 > d) this.buffer_.push(d);else if (2048 > d) this.buffer_.push(d >> 6 | 192), this.buffer_.push(d & 63 | 128);else if (65536 > d) if (55296 <= d && 56319 >= d && c + 1 < a.length) {
      var e = a.charCodeAt(c + 1);
      56320 <= e && 57343 >= e && (d = 1024 * (d - 55296) + e - 56320 + 65536, this.buffer_.push(d >> 18 | 240), this.buffer_.push(d >> 12 & 63 | 128), this.buffer_.push(d >> 6 & 63 | 128), this.buffer_.push(d & 63 | 128), c++);
    } else this.buffer_.push(d >> 12 | 224), this.buffer_.push(d >> 6 & 63 | 128), this.buffer_.push(d & 63 | 128);
  }
  return this.buffer_.length - b;
};
jspb.BinaryWriter = function () {
  this.blocks_ = [];
  this.totalLength_ = 0;
  this.encoder_ = new jspb.BinaryEncoder();
  this.bookmarks_ = [];
};
jspb.BinaryWriter.prototype.appendUint8Array_ = function (a) {
  var b = this.encoder_.end();
  this.blocks_.push(b);
  this.blocks_.push(a);
  this.totalLength_ += b.length + a.length;
};
jspb.BinaryWriter.prototype.beginDelimited_ = function (a) {
  this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.DELIMITED);
  a = this.encoder_.end();
  this.blocks_.push(a);
  this.totalLength_ += a.length;
  a.push(this.totalLength_);
  return a;
};
jspb.BinaryWriter.prototype.endDelimited_ = function (a) {
  var b = a.pop();
  b = this.totalLength_ + this.encoder_.length() - b;
  for (goog.asserts.assert(0 <= b); 127 < b;) a.push(b & 127 | 128), b >>>= 7, this.totalLength_++;
  a.push(b);
  this.totalLength_++;
};
jspb.BinaryWriter.prototype.writeSerializedMessage = function (a, b, c) {
  this.appendUint8Array_(a.subarray(b, c));
};
jspb.BinaryWriter.prototype.maybeWriteSerializedMessage = function (a, b, c) {
  null != a && null != b && null != c && this.writeSerializedMessage(a, b, c);
};
jspb.BinaryWriter.prototype.reset = function () {
  this.blocks_ = [];
  this.encoder_.end();
  this.totalLength_ = 0;
  this.bookmarks_ = [];
};
jspb.BinaryWriter.prototype.getResultBuffer = function () {
  goog.asserts.assert(0 == this.bookmarks_.length);
  for (var a = new Uint8Array(this.totalLength_ + this.encoder_.length()), b = this.blocks_, c = b.length, d = 0, e = 0; e < c; e++) {
    var f = b[e];
    a.set(f, d);
    d += f.length;
  }
  b = this.encoder_.end();
  a.set(b, d);
  d += b.length;
  goog.asserts.assert(d == a.length);
  this.blocks_ = [a];
  return a;
};
jspb.BinaryWriter.prototype.getResultBase64String = function (a) {
  return goog.crypt.base64.encodeByteArray(this.getResultBuffer(), a);
};
jspb.BinaryWriter.prototype.beginSubMessage = function (a) {
  this.bookmarks_.push(this.beginDelimited_(a));
};
jspb.BinaryWriter.prototype.endSubMessage = function () {
  goog.asserts.assert(0 <= this.bookmarks_.length);
  this.endDelimited_(this.bookmarks_.pop());
};
jspb.BinaryWriter.prototype.writeFieldHeader_ = function (a, b) {
  goog.asserts.assert(1 <= a && a == Math.floor(a));
  this.encoder_.writeUnsignedVarint32(8 * a + b);
};
jspb.BinaryWriter.prototype.writeAny = function (a, b, c) {
  var d = jspb.BinaryConstants.FieldType;
  switch (a) {
    case d.DOUBLE:
      this.writeDouble(b, c);
      break;
    case d.FLOAT:
      this.writeFloat(b, c);
      break;
    case d.INT64:
      this.writeInt64(b, c);
      break;
    case d.UINT64:
      this.writeUint64(b, c);
      break;
    case d.INT32:
      this.writeInt32(b, c);
      break;
    case d.FIXED64:
      this.writeFixed64(b, c);
      break;
    case d.FIXED32:
      this.writeFixed32(b, c);
      break;
    case d.BOOL:
      this.writeBool(b, c);
      break;
    case d.STRING:
      this.writeString(b, c);
      break;
    case d.GROUP:
      goog.asserts.fail("Group field type not supported in writeAny()");
      break;
    case d.MESSAGE:
      goog.asserts.fail("Message field type not supported in writeAny()");
      break;
    case d.BYTES:
      this.writeBytes(b, c);
      break;
    case d.UINT32:
      this.writeUint32(b, c);
      break;
    case d.ENUM:
      this.writeEnum(b, c);
      break;
    case d.SFIXED32:
      this.writeSfixed32(b, c);
      break;
    case d.SFIXED64:
      this.writeSfixed64(b, c);
      break;
    case d.SINT32:
      this.writeSint32(b, c);
      break;
    case d.SINT64:
      this.writeSint64(b, c);
      break;
    case d.FHASH64:
      this.writeFixedHash64(b, c);
      break;
    case d.VHASH64:
      this.writeVarintHash64(b, c);
      break;
    default:
      goog.asserts.fail("Invalid field type in writeAny()");
  }
};
jspb.BinaryWriter.prototype.writeUnsignedVarint32_ = function (a, b) {
  null != b && (this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.VARINT), this.encoder_.writeUnsignedVarint32(b));
};
jspb.BinaryWriter.prototype.writeSignedVarint32_ = function (a, b) {
  null != b && (this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.VARINT), this.encoder_.writeSignedVarint32(b));
};
jspb.BinaryWriter.prototype.writeUnsignedVarint64_ = function (a, b) {
  null != b && (this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.VARINT), this.encoder_.writeUnsignedVarint64(b));
};
jspb.BinaryWriter.prototype.writeSignedVarint64_ = function (a, b) {
  null != b && (this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.VARINT), this.encoder_.writeSignedVarint64(b));
};
jspb.BinaryWriter.prototype.writeZigzagVarint32_ = function (a, b) {
  null != b && (this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.VARINT), this.encoder_.writeZigzagVarint32(b));
};
jspb.BinaryWriter.prototype.writeZigzagVarint64_ = function (a, b) {
  null != b && (this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.VARINT), this.encoder_.writeZigzagVarint64(b));
};
jspb.BinaryWriter.prototype.writeZigzagVarint64String_ = function (a, b) {
  null != b && (this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.VARINT), this.encoder_.writeZigzagVarint64String(b));
};
jspb.BinaryWriter.prototype.writeZigzagVarintHash64_ = function (a, b) {
  null != b && (this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.VARINT), this.encoder_.writeZigzagVarintHash64(b));
};
jspb.BinaryWriter.prototype.writeInt32 = function (a, b) {
  null != b && (goog.asserts.assert(b >= -jspb.BinaryConstants.TWO_TO_31 && b < jspb.BinaryConstants.TWO_TO_31), this.writeSignedVarint32_(a, b));
};
jspb.BinaryWriter.prototype.writeInt32String = function (a, b) {
  null != b && (b = parseInt(b, 10), goog.asserts.assert(b >= -jspb.BinaryConstants.TWO_TO_31 && b < jspb.BinaryConstants.TWO_TO_31), this.writeSignedVarint32_(a, b));
};
jspb.BinaryWriter.prototype.writeInt64 = function (a, b) {
  null != b && (goog.asserts.assert(b >= -jspb.BinaryConstants.TWO_TO_63 && b < jspb.BinaryConstants.TWO_TO_63), this.writeSignedVarint64_(a, b));
};
jspb.BinaryWriter.prototype.writeInt64String = function (a, b) {
  null != b && (b = jspb.arith.Int64.fromString(b), this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.VARINT), this.encoder_.writeSplitVarint64(b.lo, b.hi));
};
jspb.BinaryWriter.prototype.writeUint32 = function (a, b) {
  null != b && (goog.asserts.assert(0 <= b && b < jspb.BinaryConstants.TWO_TO_32), this.writeUnsignedVarint32_(a, b));
};
jspb.BinaryWriter.prototype.writeUint32String = function (a, b) {
  null != b && (b = parseInt(b, 10), goog.asserts.assert(0 <= b && b < jspb.BinaryConstants.TWO_TO_32), this.writeUnsignedVarint32_(a, b));
};
jspb.BinaryWriter.prototype.writeUint64 = function (a, b) {
  null != b && (goog.asserts.assert(0 <= b && b < jspb.BinaryConstants.TWO_TO_64), this.writeUnsignedVarint64_(a, b));
};
jspb.BinaryWriter.prototype.writeUint64String = function (a, b) {
  null != b && (b = jspb.arith.UInt64.fromString(b), this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.VARINT), this.encoder_.writeSplitVarint64(b.lo, b.hi));
};
jspb.BinaryWriter.prototype.writeSint32 = function (a, b) {
  null != b && (goog.asserts.assert(b >= -jspb.BinaryConstants.TWO_TO_31 && b < jspb.BinaryConstants.TWO_TO_31), this.writeZigzagVarint32_(a, b));
};
jspb.BinaryWriter.prototype.writeSint64 = function (a, b) {
  null != b && (goog.asserts.assert(b >= -jspb.BinaryConstants.TWO_TO_63 && b < jspb.BinaryConstants.TWO_TO_63), this.writeZigzagVarint64_(a, b));
};
jspb.BinaryWriter.prototype.writeSintHash64 = function (a, b) {
  null != b && this.writeZigzagVarintHash64_(a, b);
};
jspb.BinaryWriter.prototype.writeSint64String = function (a, b) {
  null != b && this.writeZigzagVarint64String_(a, b);
};
jspb.BinaryWriter.prototype.writeFixed32 = function (a, b) {
  null != b && (goog.asserts.assert(0 <= b && b < jspb.BinaryConstants.TWO_TO_32), this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.FIXED32), this.encoder_.writeUint32(b));
};
jspb.BinaryWriter.prototype.writeFixed64 = function (a, b) {
  null != b && (goog.asserts.assert(0 <= b && b < jspb.BinaryConstants.TWO_TO_64), this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.FIXED64), this.encoder_.writeUint64(b));
};
jspb.BinaryWriter.prototype.writeFixed64String = function (a, b) {
  null != b && (b = jspb.arith.UInt64.fromString(b), this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.FIXED64), this.encoder_.writeSplitFixed64(b.lo, b.hi));
};
jspb.BinaryWriter.prototype.writeSfixed32 = function (a, b) {
  null != b && (goog.asserts.assert(b >= -jspb.BinaryConstants.TWO_TO_31 && b < jspb.BinaryConstants.TWO_TO_31), this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.FIXED32), this.encoder_.writeInt32(b));
};
jspb.BinaryWriter.prototype.writeSfixed64 = function (a, b) {
  null != b && (goog.asserts.assert(b >= -jspb.BinaryConstants.TWO_TO_63 && b < jspb.BinaryConstants.TWO_TO_63), this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.FIXED64), this.encoder_.writeInt64(b));
};
jspb.BinaryWriter.prototype.writeSfixed64String = function (a, b) {
  null != b && (b = jspb.arith.Int64.fromString(b), this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.FIXED64), this.encoder_.writeSplitFixed64(b.lo, b.hi));
};
jspb.BinaryWriter.prototype.writeFloat = function (a, b) {
  null != b && (this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.FIXED32), this.encoder_.writeFloat(b));
};
jspb.BinaryWriter.prototype.writeDouble = function (a, b) {
  null != b && (this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.FIXED64), this.encoder_.writeDouble(b));
};
jspb.BinaryWriter.prototype.writeBool = function (a, b) {
  null != b && (goog.asserts.assert("boolean" === typeof b || "number" === typeof b), this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.VARINT), this.encoder_.writeBool(b));
};
jspb.BinaryWriter.prototype.writeEnum = function (a, b) {
  null != b && (goog.asserts.assert(b >= -jspb.BinaryConstants.TWO_TO_31 && b < jspb.BinaryConstants.TWO_TO_31), this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.VARINT), this.encoder_.writeSignedVarint32(b));
};
jspb.BinaryWriter.prototype.writeString = function (a, b) {
  null != b && (a = this.beginDelimited_(a), this.encoder_.writeString(b), this.endDelimited_(a));
};
jspb.BinaryWriter.prototype.writeBytes = function (a, b) {
  null != b && (b = jspb.utils.byteSourceToUint8Array(b), this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.DELIMITED), this.encoder_.writeUnsignedVarint32(b.length), this.appendUint8Array_(b));
};
jspb.BinaryWriter.prototype.writeMessage = function (a, b, c) {
  null != b && (a = this.beginDelimited_(a), c(b, this), this.endDelimited_(a));
};
jspb.BinaryWriter.prototype.writeMessageSet = function (a, b, c) {
  null != b && (this.writeFieldHeader_(1, jspb.BinaryConstants.WireType.START_GROUP), this.writeFieldHeader_(2, jspb.BinaryConstants.WireType.VARINT), this.encoder_.writeSignedVarint32(a), a = this.beginDelimited_(3), c(b, this), this.endDelimited_(a), this.writeFieldHeader_(1, jspb.BinaryConstants.WireType.END_GROUP));
};
jspb.BinaryWriter.prototype.writeGroup = function (a, b, c) {
  null != b && (this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.START_GROUP), c(b, this), this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.END_GROUP));
};
jspb.BinaryWriter.prototype.writeFixedHash64 = function (a, b) {
  null != b && (goog.asserts.assert(8 == b.length), this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.FIXED64), this.encoder_.writeFixedHash64(b));
};
jspb.BinaryWriter.prototype.writeVarintHash64 = function (a, b) {
  null != b && (goog.asserts.assert(8 == b.length), this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.VARINT), this.encoder_.writeVarintHash64(b));
};
jspb.BinaryWriter.prototype.writeSplitFixed64 = function (a, b, c) {
  this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.FIXED64);
  this.encoder_.writeSplitFixed64(b, c);
};
jspb.BinaryWriter.prototype.writeSplitVarint64 = function (a, b, c) {
  this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.VARINT);
  this.encoder_.writeSplitVarint64(b, c);
};
jspb.BinaryWriter.prototype.writeSplitZigzagVarint64 = function (a, b, c) {
  this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.VARINT);
  var d = this.encoder_;
  jspb.utils.toZigzag64(b, c, function (a, b) {
    d.writeSplitVarint64(a >>> 0, b >>> 0);
  });
};
jspb.BinaryWriter.prototype.writeRepeatedInt32 = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeSignedVarint32_(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedInt32String = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeInt32String(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedInt64 = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeSignedVarint64_(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedSplitFixed64 = function (a, b, c, d) {
  if (null != b) for (var e = 0; e < b.length; e++) this.writeSplitFixed64(a, c(b[e]), d(b[e]));
};
jspb.BinaryWriter.prototype.writeRepeatedSplitVarint64 = function (a, b, c, d) {
  if (null != b) for (var e = 0; e < b.length; e++) this.writeSplitVarint64(a, c(b[e]), d(b[e]));
};
jspb.BinaryWriter.prototype.writeRepeatedSplitZigzagVarint64 = function (a, b, c, d) {
  if (null != b) for (var e = 0; e < b.length; e++) this.writeSplitZigzagVarint64(a, c(b[e]), d(b[e]));
};
jspb.BinaryWriter.prototype.writeRepeatedInt64String = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeInt64String(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedUint32 = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeUnsignedVarint32_(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedUint32String = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeUint32String(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedUint64 = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeUnsignedVarint64_(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedUint64String = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeUint64String(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedSint32 = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeZigzagVarint32_(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedSint64 = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeZigzagVarint64_(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedSint64String = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeZigzagVarint64String_(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedSintHash64 = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeZigzagVarintHash64_(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedFixed32 = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeFixed32(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedFixed64 = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeFixed64(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedFixed64String = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeFixed64String(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedSfixed32 = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeSfixed32(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedSfixed64 = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeSfixed64(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedSfixed64String = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeSfixed64String(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedFloat = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeFloat(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedDouble = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeDouble(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedBool = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeBool(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedEnum = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeEnum(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedString = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeString(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedBytes = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeBytes(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedMessage = function (a, b, c) {
  if (null != b) for (var d = 0; d < b.length; d++) {
    var e = this.beginDelimited_(a);
    c(b[d], this);
    this.endDelimited_(e);
  }
};
jspb.BinaryWriter.prototype.writeRepeatedGroup = function (a, b, c) {
  if (null != b) for (var d = 0; d < b.length; d++) this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.START_GROUP), c(b[d], this), this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.END_GROUP);
};
jspb.BinaryWriter.prototype.writeRepeatedFixedHash64 = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeFixedHash64(a, b[c]);
};
jspb.BinaryWriter.prototype.writeRepeatedVarintHash64 = function (a, b) {
  if (null != b) for (var c = 0; c < b.length; c++) this.writeVarintHash64(a, b[c]);
};
jspb.BinaryWriter.prototype.writePackedInt32 = function (a, b) {
  if (null != b && b.length) {
    a = this.beginDelimited_(a);
    for (var c = 0; c < b.length; c++) this.encoder_.writeSignedVarint32(b[c]);
    this.endDelimited_(a);
  }
};
jspb.BinaryWriter.prototype.writePackedInt32String = function (a, b) {
  if (null != b && b.length) {
    a = this.beginDelimited_(a);
    for (var c = 0; c < b.length; c++) this.encoder_.writeSignedVarint32(parseInt(b[c], 10));
    this.endDelimited_(a);
  }
};
jspb.BinaryWriter.prototype.writePackedInt64 = function (a, b) {
  if (null != b && b.length) {
    a = this.beginDelimited_(a);
    for (var c = 0; c < b.length; c++) this.encoder_.writeSignedVarint64(b[c]);
    this.endDelimited_(a);
  }
};
jspb.BinaryWriter.prototype.writePackedSplitFixed64 = function (a, b, c, d) {
  if (null != b) {
    a = this.beginDelimited_(a);
    for (var e = 0; e < b.length; e++) this.encoder_.writeSplitFixed64(c(b[e]), d(b[e]));
    this.endDelimited_(a);
  }
};
jspb.BinaryWriter.prototype.writePackedSplitVarint64 = function (a, b, c, d) {
  if (null != b) {
    a = this.beginDelimited_(a);
    for (var e = 0; e < b.length; e++) this.encoder_.writeSplitVarint64(c(b[e]), d(b[e]));
    this.endDelimited_(a);
  }
};
jspb.BinaryWriter.prototype.writePackedSplitZigzagVarint64 = function (a, b, c, d) {
  if (null != b) {
    a = this.beginDelimited_(a);
    for (var e = this.encoder_, f = 0; f < b.length; f++) jspb.utils.toZigzag64(c(b[f]), d(b[f]), function (a, b) {
      e.writeSplitVarint64(a >>> 0, b >>> 0);
    });
    this.endDelimited_(a);
  }
};
jspb.BinaryWriter.prototype.writePackedInt64String = function (a, b) {
  if (null != b && b.length) {
    a = this.beginDelimited_(a);
    for (var c = 0; c < b.length; c++) {
      var d = jspb.arith.Int64.fromString(b[c]);
      this.encoder_.writeSplitVarint64(d.lo, d.hi);
    }
    this.endDelimited_(a);
  }
};
jspb.BinaryWriter.prototype.writePackedUint32 = function (a, b) {
  if (null != b && b.length) {
    a = this.beginDelimited_(a);
    for (var c = 0; c < b.length; c++) this.encoder_.writeUnsignedVarint32(b[c]);
    this.endDelimited_(a);
  }
};
jspb.BinaryWriter.prototype.writePackedUint32String = function (a, b) {
  if (null != b && b.length) {
    a = this.beginDelimited_(a);
    for (var c = 0; c < b.length; c++) this.encoder_.writeUnsignedVarint32(parseInt(b[c], 10));
    this.endDelimited_(a);
  }
};
jspb.BinaryWriter.prototype.writePackedUint64 = function (a, b) {
  if (null != b && b.length) {
    a = this.beginDelimited_(a);
    for (var c = 0; c < b.length; c++) this.encoder_.writeUnsignedVarint64(b[c]);
    this.endDelimited_(a);
  }
};
jspb.BinaryWriter.prototype.writePackedUint64String = function (a, b) {
  if (null != b && b.length) {
    a = this.beginDelimited_(a);
    for (var c = 0; c < b.length; c++) {
      var d = jspb.arith.UInt64.fromString(b[c]);
      this.encoder_.writeSplitVarint64(d.lo, d.hi);
    }
    this.endDelimited_(a);
  }
};
jspb.BinaryWriter.prototype.writePackedSint32 = function (a, b) {
  if (null != b && b.length) {
    a = this.beginDelimited_(a);
    for (var c = 0; c < b.length; c++) this.encoder_.writeZigzagVarint32(b[c]);
    this.endDelimited_(a);
  }
};
jspb.BinaryWriter.prototype.writePackedSint64 = function (a, b) {
  if (null != b && b.length) {
    a = this.beginDelimited_(a);
    for (var c = 0; c < b.length; c++) this.encoder_.writeZigzagVarint64(b[c]);
    this.endDelimited_(a);
  }
};
jspb.BinaryWriter.prototype.writePackedSint64String = function (a, b) {
  if (null != b && b.length) {
    a = this.beginDelimited_(a);
    for (var c = 0; c < b.length; c++) this.encoder_.writeZigzagVarintHash64(jspb.utils.decimalStringToHash64(b[c]));
    this.endDelimited_(a);
  }
};
jspb.BinaryWriter.prototype.writePackedSintHash64 = function (a, b) {
  if (null != b && b.length) {
    a = this.beginDelimited_(a);
    for (var c = 0; c < b.length; c++) this.encoder_.writeZigzagVarintHash64(b[c]);
    this.endDelimited_(a);
  }
};
jspb.BinaryWriter.prototype.writePackedFixed32 = function (a, b) {
  if (null != b && b.length) for (this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.DELIMITED), this.encoder_.writeUnsignedVarint32(4 * b.length), a = 0; a < b.length; a++) this.encoder_.writeUint32(b[a]);
};
jspb.BinaryWriter.prototype.writePackedFixed64 = function (a, b) {
  if (null != b && b.length) for (this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.DELIMITED), this.encoder_.writeUnsignedVarint32(8 * b.length), a = 0; a < b.length; a++) this.encoder_.writeUint64(b[a]);
};
jspb.BinaryWriter.prototype.writePackedFixed64String = function (a, b) {
  if (null != b && b.length) for (this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.DELIMITED), this.encoder_.writeUnsignedVarint32(8 * b.length), a = 0; a < b.length; a++) {
    var c = jspb.arith.UInt64.fromString(b[a]);
    this.encoder_.writeSplitFixed64(c.lo, c.hi);
  }
};
jspb.BinaryWriter.prototype.writePackedSfixed32 = function (a, b) {
  if (null != b && b.length) for (this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.DELIMITED), this.encoder_.writeUnsignedVarint32(4 * b.length), a = 0; a < b.length; a++) this.encoder_.writeInt32(b[a]);
};
jspb.BinaryWriter.prototype.writePackedSfixed64 = function (a, b) {
  if (null != b && b.length) for (this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.DELIMITED), this.encoder_.writeUnsignedVarint32(8 * b.length), a = 0; a < b.length; a++) this.encoder_.writeInt64(b[a]);
};
jspb.BinaryWriter.prototype.writePackedSfixed64String = function (a, b) {
  if (null != b && b.length) for (this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.DELIMITED), this.encoder_.writeUnsignedVarint32(8 * b.length), a = 0; a < b.length; a++) this.encoder_.writeInt64String(b[a]);
};
jspb.BinaryWriter.prototype.writePackedFloat = function (a, b) {
  if (null != b && b.length) for (this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.DELIMITED), this.encoder_.writeUnsignedVarint32(4 * b.length), a = 0; a < b.length; a++) this.encoder_.writeFloat(b[a]);
};
jspb.BinaryWriter.prototype.writePackedDouble = function (a, b) {
  if (null != b && b.length) for (this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.DELIMITED), this.encoder_.writeUnsignedVarint32(8 * b.length), a = 0; a < b.length; a++) this.encoder_.writeDouble(b[a]);
};
jspb.BinaryWriter.prototype.writePackedBool = function (a, b) {
  if (null != b && b.length) for (this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.DELIMITED), this.encoder_.writeUnsignedVarint32(b.length), a = 0; a < b.length; a++) this.encoder_.writeBool(b[a]);
};
jspb.BinaryWriter.prototype.writePackedEnum = function (a, b) {
  if (null != b && b.length) {
    a = this.beginDelimited_(a);
    for (var c = 0; c < b.length; c++) this.encoder_.writeEnum(b[c]);
    this.endDelimited_(a);
  }
};
jspb.BinaryWriter.prototype.writePackedFixedHash64 = function (a, b) {
  if (null != b && b.length) for (this.writeFieldHeader_(a, jspb.BinaryConstants.WireType.DELIMITED), this.encoder_.writeUnsignedVarint32(8 * b.length), a = 0; a < b.length; a++) this.encoder_.writeFixedHash64(b[a]);
};
jspb.BinaryWriter.prototype.writePackedVarintHash64 = function (a, b) {
  if (null != b && b.length) {
    a = this.beginDelimited_(a);
    for (var c = 0; c < b.length; c++) this.encoder_.writeVarintHash64(b[c]);
    this.endDelimited_(a);
  }
};
jspb.Export = {};
exports.Map = jspb.Map;
exports.Message = jspb.Message;
exports.BinaryReader = jspb.BinaryReader;
exports.BinaryWriter = jspb.BinaryWriter;
exports.ExtensionFieldInfo = jspb.ExtensionFieldInfo;
exports.ExtensionFieldBinaryInfo = jspb.ExtensionFieldBinaryInfo;
exports.exportSymbol = goog.exportSymbol;
exports.inherits = goog.inherits;
exports.object = {
  extend: goog.object.extend
};
exports.typeOf = goog.typeOf;

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"buffer":2}],8:[function(require,module,exports){
(function (global){(function (){
/*

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/
var n;function aa(a){var b=0;return function(){return b<a.length?{done:!1,value:a[b++]}:{done:!0}}}var ba="function"==typeof Object.defineProperties?Object.defineProperty:function(a,b,c){a!=Array.prototype&&a!=Object.prototype&&(a[b]=c.value)};function ca(a){a=["object"==typeof window&&window,"object"==typeof self&&self,"object"==typeof global&&global,a];for(var b=0;b<a.length;++b){var c=a[b];if(c&&c.Math==Math)return c}throw Error("Cannot find global object");}var r=ca(this);
function t(){t=function(){};r.Symbol||(r.Symbol=da)}function ea(a,b){this.a=a;ba(this,"description",{configurable:!0,writable:!0,value:b})}ea.prototype.toString=function(){return this.a};var da=function(){function a(c){if(this instanceof a)throw new TypeError("Symbol is not a constructor");return new ea("jscomp_symbol_"+(c||"")+"_"+b++,c)}var b=0;return a}();
function u(){t();var a=r.Symbol.iterator;a||(a=r.Symbol.iterator=r.Symbol("Symbol.iterator"));"function"!=typeof Array.prototype[a]&&ba(Array.prototype,a,{configurable:!0,writable:!0,value:function(){return fa(aa(this))}});u=function(){}}function fa(a){u();a={next:a};a[r.Symbol.iterator]=function(){return this};return a}function ha(a){var b="undefined"!=typeof Symbol&&Symbol.iterator&&a[Symbol.iterator];return b?b.call(a):{next:aa(a)}}
var ia="function"==typeof Object.create?Object.create:function(a){function b(){}b.prototype=a;return new b},ja;if("function"==typeof Object.setPrototypeOf)ja=Object.setPrototypeOf;else{var ka;a:{var la={V:!0},ma={};try{ma.__proto__=la;ka=ma.V;break a}catch(a){}ka=!1}ja=ka?function(a,b){a.__proto__=b;if(a.__proto__!==b)throw new TypeError(a+" is not extensible");return a}:null}var na=ja;
function oa(a,b){a.prototype=ia(b.prototype);a.prototype.constructor=a;if(na)na(a,b);else for(var c in b)if("prototype"!=c)if(Object.defineProperties){var d=Object.getOwnPropertyDescriptor(b,c);d&&Object.defineProperty(a,c,d)}else a[c]=b[c];a.O=b.prototype}
function pa(a,b){u();a instanceof String&&(a+="");var c=0,d={next:function(){if(c<a.length){var f=c++;return{value:b(f,a[f]),done:!1}}d.next=function(){return{done:!0,value:void 0}};return d.next()}};d[Symbol.iterator]=function(){return d};return d}function v(a,b){if(b){var c=r;a=a.split(".");for(var d=0;d<a.length-1;d++){var f=a[d];f in c||(c[f]={});c=c[f]}a=a[a.length-1];d=c[a];b=b(d);b!=d&&null!=b&&ba(c,a,{configurable:!0,writable:!0,value:b})}}
v("Array.prototype.keys",function(a){return a?a:function(){return pa(this,function(b){return b})}});v("Array.prototype.find",function(a){return a?a:function(b,c){a:{var d=this;d instanceof String&&(d=String(d));for(var f=d.length,g=0;g<f;g++){var e=d[g];if(b.call(c,e,g,d)){b=e;break a}}b=void 0}return b}});v("Object.is",function(a){return a?a:function(b,c){return b===c?0!==b||1/b===1/c:b!==b&&c!==c}});
v("Array.prototype.includes",function(a){return a?a:function(b,c){var d=this;d instanceof String&&(d=String(d));var f=d.length;c=c||0;for(0>c&&(c=Math.max(c+f,0));c<f;c++){var g=d[c];if(g===b||Object.is(g,b))return!0}return!1}});
v("Promise",function(a){function b(e){this.b=0;this.c=void 0;this.a=[];var h=this.f();try{e(h.resolve,h.reject)}catch(k){h.reject(k)}}function c(){this.a=null}function d(e){return e instanceof b?e:new b(function(h){h(e)})}if(a)return a;c.prototype.b=function(e){if(null==this.a){this.a=[];var h=this;this.c(function(){h.g()})}this.a.push(e)};var f=r.setTimeout;c.prototype.c=function(e){f(e,0)};c.prototype.g=function(){for(;this.a&&this.a.length;){var e=this.a;this.a=[];for(var h=0;h<e.length;++h){var k=
e[h];e[h]=null;try{k()}catch(l){this.f(l)}}}this.a=null};c.prototype.f=function(e){this.c(function(){throw e;})};b.prototype.f=function(){function e(l){return function(m){k||(k=!0,l.call(h,m))}}var h=this,k=!1;return{resolve:e(this.s),reject:e(this.g)}};b.prototype.s=function(e){if(e===this)this.g(new TypeError("A Promise cannot resolve to itself"));else if(e instanceof b)this.v(e);else{a:switch(typeof e){case "object":var h=null!=e;break a;case "function":h=!0;break a;default:h=!1}h?this.m(e):this.h(e)}};
b.prototype.m=function(e){var h=void 0;try{h=e.then}catch(k){this.g(k);return}"function"==typeof h?this.w(h,e):this.h(e)};b.prototype.g=function(e){this.i(2,e)};b.prototype.h=function(e){this.i(1,e)};b.prototype.i=function(e,h){if(0!=this.b)throw Error("Cannot settle("+e+", "+h+"): Promise already settled in state"+this.b);this.b=e;this.c=h;this.l()};b.prototype.l=function(){if(null!=this.a){for(var e=0;e<this.a.length;++e)g.b(this.a[e]);this.a=null}};var g=new c;b.prototype.v=function(e){var h=this.f();
e.F(h.resolve,h.reject)};b.prototype.w=function(e,h){var k=this.f();try{e.call(h,k.resolve,k.reject)}catch(l){k.reject(l)}};b.prototype.then=function(e,h){function k(q,w){return"function"==typeof q?function(A){try{l(q(A))}catch(L){m(L)}}:w}var l,m,p=new b(function(q,w){l=q;m=w});this.F(k(e,l),k(h,m));return p};b.prototype.catch=function(e){return this.then(void 0,e)};b.prototype.F=function(e,h){function k(){switch(l.b){case 1:e(l.c);break;case 2:h(l.c);break;default:throw Error("Unexpected state: "+
l.b);}}var l=this;null==this.a?g.b(k):this.a.push(k)};b.resolve=d;b.reject=function(e){return new b(function(h,k){k(e)})};b.race=function(e){return new b(function(h,k){for(var l=ha(e),m=l.next();!m.done;m=l.next())d(m.value).F(h,k)})};b.all=function(e){var h=ha(e),k=h.next();return k.done?d([]):new b(function(l,m){function p(A){return function(L){q[A]=L;w--;0==w&&l(q)}}var q=[],w=0;do q.push(void 0),w++,d(k.value).F(p(q.length-1),m),k=h.next();while(!k.done)})};return b});var qa=qa||{},x=this||self;
function y(a,b){a=a.split(".");b=b||x;for(var c=0;c<a.length;c++)if(b=b[a[c]],null==b)return null;return b}function ra(){}function sa(a){var b=typeof a;return"object"==b&&null!=a||"function"==b}var ta="closure_uid_"+(1E9*Math.random()>>>0),ua=0;function va(a,b,c){return a.call.apply(a.bind,arguments)}
function wa(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var f=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(f,d);return a.apply(b,f)}}return function(){return a.apply(b,arguments)}}function z(a,b,c){Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?z=va:z=wa;return z.apply(null,arguments)}
function B(a,b){function c(){}c.prototype=b.prototype;a.O=b.prototype;a.prototype=new c;a.prototype.constructor=a};function xa(a){this.a=a||{}}xa.prototype.get=function(a){return this.a[a]};xa.prototype.G=function(){return Object.keys(this.a)};function C(a,b,c,d){this.f=a;this.c=b;this.b=c;this.a=d}C.prototype.getRequestMessage=function(){return this.f};C.prototype.getMethodDescriptor=function(){return this.c};C.prototype.getMetadata=function(){return this.b};C.prototype.getCallOptions=function(){return this.a};function D(a,b,c,d){c=void 0===c?{}:c;this.c=a;this.a=c;this.b=b;this.f=void 0===d?null:d}D.prototype.getResponseMessage=function(){return this.c};D.prototype.getMetadata=function(){return this.a};D.prototype.getMethodDescriptor=function(){return this.b};D.prototype.getStatus=function(){return this.f};function ya(a,b,c,d,f,g){this.name=a;this.a=f;this.b=g}function za(a,b,c){c=void 0===c?{}:c;var d=void 0===d?new xa:d;return new C(b,a,c,d)}ya.prototype.getName=function(){return this.name};ya.prototype.getName=ya.prototype.getName;function Aa(a){switch(a){case 200:return 0;case 400:return 3;case 401:return 16;case 403:return 7;case 404:return 5;case 409:return 10;case 412:return 9;case 429:return 8;case 499:return 1;case 500:return 2;case 501:return 12;case 503:return 14;case 504:return 4;default:return 2}}
function Ba(a){switch(a){case 0:return"OK";case 1:return"CANCELLED";case 2:return"UNKNOWN";case 3:return"INVALID_ARGUMENT";case 4:return"DEADLINE_EXCEEDED";case 5:return"NOT_FOUND";case 6:return"ALREADY_EXISTS";case 7:return"PERMISSION_DENIED";case 16:return"UNAUTHENTICATED";case 8:return"RESOURCE_EXHAUSTED";case 9:return"FAILED_PRECONDITION";case 10:return"ABORTED";case 11:return"OUT_OF_RANGE";case 12:return"UNIMPLEMENTED";case 13:return"INTERNAL";case 14:return"UNAVAILABLE";case 15:return"DATA_LOSS";
default:return""}};function E(a,b,c){c=void 0===c?{}:c;b=Error.call(this,b);this.message=b.message;"stack"in b&&(this.stack=b.stack);this.code=a;this.metadata=c}oa(E,Error);E.prototype.toString=function(){var a="RpcError("+(Ba(this.code)||String(this.code))+")";this.message&&(a+=": "+this.message);return a};E.prototype.name="RpcError";function Ca(a){this.a=a}Ca.prototype.on=function(a,b){return"data"==a||"error"==a?this:this.a.on(a,b)};Ca.prototype.removeListener=function(a,b){return this.a.removeListener(a,b)};Ca.prototype.cancel=function(){this.a.cancel()};function Da(a){switch(a){case 0:return"No Error";case 1:return"Access denied to content document";case 2:return"File not found";case 3:return"Firefox silently errored";case 4:return"Application custom error";case 5:return"An exception occurred";case 6:return"Http response at 400 or 500 level";case 7:return"Request was aborted";case 8:return"Request timed out";case 9:return"The resource is not available offline";default:return"Unrecognized error code"}};function F(a){if(Error.captureStackTrace)Error.captureStackTrace(this,F);else{var b=Error().stack;b&&(this.stack=b)}a&&(this.message=String(a))}B(F,Error);F.prototype.name="CustomError";function Ea(a,b){a=a.split("%s");for(var c="",d=a.length-1,f=0;f<d;f++)c+=a[f]+(f<b.length?b[f]:"%s");F.call(this,c+a[d])}B(Ea,F);Ea.prototype.name="AssertionError";function Fa(a,b){throw new Ea("Failure"+(a?": "+a:""),Array.prototype.slice.call(arguments,1));};function Ga(){this.l=null;this.i=[];this.m=0;this.b=Ha;this.f=this.a=this.h=0;this.c=null;this.g=0}
function Ia(a,b){function c(l){l==Ja?e.h=l:l==G?e.h=l:Ka(e,h,k,"invalid frame byte");e.b=La;e.a=0;e.f=0}function d(l){e.f++;e.a=(e.a<<8)+l;4==e.f&&(e.b=Ma,e.g=0,"undefined"!==typeof Uint8Array?e.c=new Uint8Array(e.a):e.c=Array(e.a),0==e.a&&g())}function f(l){e.c[e.g++]=l;e.g==e.a&&g()}function g(){var l={};l[e.h]=e.c;e.i.push(l);e.b=Ha}var e=a,h,k=0;for(b instanceof Uint8Array||b instanceof Array?h=b:h=new Uint8Array(b);k<h.length;){switch(e.b){case Na:Ka(e,h,k,"stream already broken");break;case Ha:c(h[k]);
break;case La:d(h[k]);break;case Ma:f(h[k]);break;default:throw Error("unexpected parser state: "+e.b);}e.m++;k++}a=e.i;e.i=[];return 0<a.length?a:null}var Ha=0,La=1,Ma=2,Na=3,Ja=0,G=128;function Ka(a,b,c,d){a.b=Na;a.l="The stream is broken @"+a.m+"/"+c+". Error: "+d+". With input:\n"+b;throw Error(a.l);};var Oa=Array.prototype.indexOf?function(a,b){return Array.prototype.indexOf.call(a,b,void 0)}:function(a,b){if("string"===typeof a)return"string"!==typeof b||1!=b.length?-1:a.indexOf(b,0);for(var c=0;c<a.length;c++)if(c in a&&a[c]===b)return c;return-1};var Pa=String.prototype.trim?function(a){return a.trim()}:function(a){return/^[\s\xa0]*([\s\S]*?)[\s\xa0]*$/.exec(a)[1]};function H(a,b){return-1!=a.indexOf(b)}function Qa(a,b){return a<b?-1:a>b?1:0};var I;a:{var Ra=x.navigator;if(Ra){var Sa=Ra.userAgent;if(Sa){I=Sa;break a}}I=""};function Ta(a,b){for(var c in a)b.call(void 0,a[c],c,a)}function Ua(a,b){var c={},d;for(d in a)c[d]=b.call(void 0,a[d],d,a);return c}var Va="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function Wa(a,b){for(var c,d,f=1;f<arguments.length;f++){d=arguments[f];for(c in d)a[c]=d[c];for(var g=0;g<Va.length;g++)c=Va[g],Object.prototype.hasOwnProperty.call(d,c)&&(a[c]=d[c])}};function Xa(a){var b=1;a=a.split(":");for(var c=[];0<b&&a.length;)c.push(a.shift()),b--;a.length&&c.push(a.join(":"));return c};function Ya(a){Ya[" "](a);return a}Ya[" "]=ra;function Za(a){var b=$a;return Object.prototype.hasOwnProperty.call(b,9)?b[9]:b[9]=a(9)};var ab=H(I,"Opera"),bb=H(I,"Trident")||H(I,"MSIE"),cb=H(I,"Edge"),db=H(I,"Gecko")&&!(H(I.toLowerCase(),"webkit")&&!H(I,"Edge"))&&!(H(I,"Trident")||H(I,"MSIE"))&&!H(I,"Edge"),eb=H(I.toLowerCase(),"webkit")&&!H(I,"Edge"),fb;
a:{var gb="",hb=function(){var a=I;if(db)return/rv:([^\);]+)(\)|;)/.exec(a);if(cb)return/Edge\/([\d\.]+)/.exec(a);if(bb)return/\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(a);if(eb)return/WebKit\/(\S+)/.exec(a);if(ab)return/(?:Version)[ \/]?(\S+)/.exec(a)}();hb&&(gb=hb?hb[1]:"");if(bb){var ib,jb=x.document;ib=jb?jb.documentMode:void 0;if(null!=ib&&ib>parseFloat(gb)){fb=String(ib);break a}}fb=gb}var $a={};
function kb(){return Za(function(){for(var a=0,b=Pa(String(fb)).split("."),c=Pa("9").split("."),d=Math.max(b.length,c.length),f=0;0==a&&f<d;f++){var g=b[f]||"",e=c[f]||"";do{g=/(\d*)(\D*)(.*)/.exec(g)||["","","",""];e=/(\d*)(\D*)(.*)/.exec(e)||["","","",""];if(0==g[0].length&&0==e[0].length)break;a=Qa(0==g[1].length?0:parseInt(g[1],10),0==e[1].length?0:parseInt(e[1],10))||Qa(0==g[2].length,0==e[2].length)||Qa(g[2],e[2]);g=g[3];e=e[3]}while(0==a)}return 0<=a})};function lb(){0!=mb&&(Object.prototype.hasOwnProperty.call(this,ta)&&this[ta]||(this[ta]=++ua));this.K=this.K}var mb=0;lb.prototype.K=!1;var nb=Object.freeze||function(a){return a};function J(a,b){this.type=a;this.a=this.target=b;this.defaultPrevented=!1}J.prototype.b=function(){this.defaultPrevented=!0};var ob=function(){if(!x.addEventListener||!Object.defineProperty)return!1;var a=!1,b=Object.defineProperty({},"passive",{get:function(){a=!0}});try{x.addEventListener("test",ra,b),x.removeEventListener("test",ra,b)}catch(c){}return a}();function K(a,b){J.call(this,a?a.type:"");this.relatedTarget=this.a=this.target=null;this.button=this.screenY=this.screenX=this.clientY=this.clientX=0;this.key="";this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1;this.pointerId=0;this.pointerType="";this.c=null;if(a){var c=this.type=a.type,d=a.changedTouches&&a.changedTouches.length?a.changedTouches[0]:null;this.target=a.target||a.srcElement;this.a=b;if(b=a.relatedTarget){if(db){a:{try{Ya(b.nodeName);var f=!0;break a}catch(g){}f=!1}f||(b=null)}}else"mouseover"==
c?b=a.fromElement:"mouseout"==c&&(b=a.toElement);this.relatedTarget=b;d?(this.clientX=void 0!==d.clientX?d.clientX:d.pageX,this.clientY=void 0!==d.clientY?d.clientY:d.pageY,this.screenX=d.screenX||0,this.screenY=d.screenY||0):(this.clientX=void 0!==a.clientX?a.clientX:a.pageX,this.clientY=void 0!==a.clientY?a.clientY:a.pageY,this.screenX=a.screenX||0,this.screenY=a.screenY||0);this.button=a.button;this.key=a.key||"";this.ctrlKey=a.ctrlKey;this.altKey=a.altKey;this.shiftKey=a.shiftKey;this.metaKey=
a.metaKey;this.pointerId=a.pointerId||0;this.pointerType="string"===typeof a.pointerType?a.pointerType:pb[a.pointerType]||"";this.c=a;a.defaultPrevented&&K.O.b.call(this)}}B(K,J);var pb=nb({2:"touch",3:"pen",4:"mouse"});K.prototype.b=function(){K.O.b.call(this);var a=this.c;a.preventDefault?a.preventDefault():a.returnValue=!1};var M="closure_listenable_"+(1E6*Math.random()|0);var qb=0;function rb(a,b,c,d,f){this.listener=a;this.proxy=null;this.src=b;this.type=c;this.capture=!!d;this.H=f;this.key=++qb;this.A=this.D=!1}function sb(a){a.A=!0;a.listener=null;a.proxy=null;a.src=null;a.H=null};function tb(a){this.src=a;this.a={};this.b=0}tb.prototype.add=function(a,b,c,d,f){var g=a.toString();a=this.a[g];a||(a=this.a[g]=[],this.b++);var e=ub(a,b,d,f);-1<e?(b=a[e],c||(b.D=!1)):(b=new rb(b,this.src,g,!!d,f),b.D=c,a.push(b));return b};tb.prototype.remove=function(a,b,c,d){a=a.toString();if(!(a in this.a))return!1;var f=this.a[a];b=ub(f,b,c,d);return-1<b?(sb(f[b]),Array.prototype.splice.call(f,b,1),0==f.length&&(delete this.a[a],this.b--),!0):!1};
function vb(a,b){var c=b.type;if(c in a.a){var d=a.a[c],f=Oa(d,b),g;(g=0<=f)&&Array.prototype.splice.call(d,f,1);g&&(sb(b),0==a.a[c].length&&(delete a.a[c],a.b--))}}function ub(a,b,c,d){for(var f=0;f<a.length;++f){var g=a[f];if(!g.A&&g.listener==b&&g.capture==!!c&&g.H==d)return f}return-1};var wb="closure_lm_"+(1E6*Math.random()|0),xb={},yb=0;function zb(a,b,c,d,f){if(d&&d.once)Ab(a,b,c,d,f);else if(Array.isArray(b))for(var g=0;g<b.length;g++)zb(a,b[g],c,d,f);else c=Bb(c),a&&a[M]?a.f.add(String(b),c,!1,sa(d)?!!d.capture:!!d,f):Cb(a,b,c,!1,d,f)}
function Cb(a,b,c,d,f,g){if(!b)throw Error("Invalid event type");var e=sa(f)?!!f.capture:!!f,h=Db(a);h||(a[wb]=h=new tb(a));c=h.add(b,c,d,e,g);if(!c.proxy){d=Eb();c.proxy=d;d.src=a;d.listener=c;if(a.addEventListener)ob||(f=e),void 0===f&&(f=!1),a.addEventListener(b.toString(),d,f);else if(a.attachEvent)a.attachEvent(Fb(b.toString()),d);else if(a.addListener&&a.removeListener)a.addListener(d);else throw Error("addEventListener and attachEvent are unavailable.");yb++}}
function Eb(){function a(c){return b.call(a.src,a.listener,c)}var b=Gb;return a}function Ab(a,b,c,d,f){if(Array.isArray(b))for(var g=0;g<b.length;g++)Ab(a,b[g],c,d,f);else c=Bb(c),a&&a[M]?a.f.add(String(b),c,!0,sa(d)?!!d.capture:!!d,f):Cb(a,b,c,!0,d,f)}function Hb(a,b,c,d,f){if(Array.isArray(b))for(var g=0;g<b.length;g++)Hb(a,b[g],c,d,f);else(d=sa(d)?!!d.capture:!!d,c=Bb(c),a&&a[M])?a.f.remove(String(b),c,d,f):a&&(a=Db(a))&&(b=a.a[b.toString()],a=-1,b&&(a=ub(b,c,d,f)),(c=-1<a?b[a]:null)&&Ib(c))}
function Ib(a){if("number"!==typeof a&&a&&!a.A){var b=a.src;if(b&&b[M])vb(b.f,a);else{var c=a.type,d=a.proxy;b.removeEventListener?b.removeEventListener(c,d,a.capture):b.detachEvent?b.detachEvent(Fb(c),d):b.addListener&&b.removeListener&&b.removeListener(d);yb--;(c=Db(b))?(vb(c,a),0==c.b&&(c.src=null,b[wb]=null)):sb(a)}}}function Fb(a){return a in xb?xb[a]:xb[a]="on"+a}function Gb(a,b){if(a.A)a=!0;else{b=new K(b,this);var c=a.listener,d=a.H||a.src;a.D&&Ib(a);a=c.call(d,b)}return a}
function Db(a){a=a[wb];return a instanceof tb?a:null}var Jb="__closure_events_fn_"+(1E9*Math.random()>>>0);function Bb(a){if("function"===typeof a)return a;a[Jb]||(a[Jb]=function(b){return a.handleEvent(b)});return a[Jb]};function N(){lb.call(this);this.f=new tb(this);this.U=this}B(N,lb);N.prototype[M]=!0;N.prototype.addEventListener=function(a,b,c,d){zb(this,a,b,c,d)};N.prototype.removeEventListener=function(a,b,c,d){Hb(this,a,b,c,d)};function O(a,b){a=a.U;var c=b.type||b;if("string"===typeof b)b=new J(b,a);else if(b instanceof J)b.target=b.target||a;else{var d=b;b=new J(c,a);Wa(b,d)}a=b.a=a;Kb(a,c,!0,b);Kb(a,c,!1,b)}
function Kb(a,b,c,d){if(b=a.f.a[String(b)]){b=b.concat();for(var f=!0,g=0;g<b.length;++g){var e=b[g];if(e&&!e.A&&e.capture==c){var h=e.listener,k=e.H||e.src;e.D&&vb(a.f,e);f=!1!==h.call(k,d)&&f}}}};var Lb=x;function Mb(a,b,c){if("function"===typeof a)c&&(a=z(a,c));else if(a&&"function"==typeof a.handleEvent)a=z(a.handleEvent,a);else throw Error("Invalid listener argument");return 2147483647<Number(b)?-1:Lb.setTimeout(a,b||0)};function Nb(a,b){this.name=a;this.value=b}Nb.prototype.toString=function(){return this.name};var Ob=new Nb("OFF",Infinity),Pb=new Nb("SEVERE",1E3),Qb=new Nb("CONFIG",700),Rb=new Nb("FINE",500);function Tb(){this.clear()}var Ub;Tb.prototype.clear=function(){};function Vb(a,b,c){this.reset(a||Ob,b,c,void 0,void 0)}Vb.prototype.reset=function(){};function Wb(a,b){this.a=null;this.f=[];this.b=(void 0===b?null:b)||null;this.c=[];this.g={getName:function(){return a}}}
function Xb(a){if(a.a)return a.a;if(a.b)return Xb(a.b);Fa("Root logger has no level set.");return Ob}function Yb(a,b){for(;a;)a.f.forEach(function(c){c(b)}),a=a.b}function Zb(){this.entries={};var a=new Wb("");a.a=Qb;this.entries[""]=a}var $b;function ac(a,b,c){var d=a.entries[b];if(d)return void 0!==c&&(d.a=c),d;d=ac(a,b.substr(0,b.lastIndexOf(".")));var f=new Wb(b,d);a.entries[b]=f;d.c.push(f);void 0!==c&&(f.a=c);return f}function bc(){$b||($b=new Zb);return $b}
function cc(a,b,c){var d;if(d=a)if(d=a&&b){d=b.value;var f=a?Xb(ac(bc(),a.getName())):Ob;d=d>=f.value}d&&(b=b||Ob,d=ac(bc(),a.getName()),"function"===typeof c&&(c=c()),Ub||(Ub=new Tb),a=a.getName(),a=new Vb(b,c,a),Yb(d,a))}function P(a,b){a&&cc(a,Rb,b)};function dc(){}dc.prototype.a=null;function ec(a){var b;(b=a.a)||(b={},fc(a)&&(b[0]=!0,b[1]=!0),b=a.a=b);return b};var gc;function hc(){}B(hc,dc);function ic(a){return(a=fc(a))?new ActiveXObject(a):new XMLHttpRequest}function fc(a){if(!a.b&&"undefined"==typeof XMLHttpRequest&&"undefined"!=typeof ActiveXObject){for(var b=["MSXML2.XMLHTTP.6.0","MSXML2.XMLHTTP.3.0","MSXML2.XMLHTTP","Microsoft.XMLHTTP"],c=0;c<b.length;c++){var d=b[c];try{return new ActiveXObject(d),a.b=d}catch(f){}}throw Error("Could not create ActiveXObject. ActiveX might be disabled, or MSXML might not be installed");}return a.b}gc=new hc;t();u();function jc(a,b){this.b=a[x.Symbol.iterator]();this.c=b;this.f=0}jc.prototype[Symbol.iterator]=function(){return this};jc.prototype.next=function(){var a=this.b.next();return{value:a.done?void 0:this.c.call(void 0,a.value,this.f++),done:a.done}};function kc(a,b){return new jc(a,b)}t();u();t();u();var lc="StopIteration"in x?x.StopIteration:{message:"StopIteration",stack:""};function Q(){}Q.prototype.next=function(){return Q.prototype.a.call(this)};Q.prototype.a=function(){throw lc;};Q.prototype.u=function(){return this};function mc(a){if(a instanceof R||a instanceof S||a instanceof T)return a;if("function"==typeof a.next)return new R(function(){return nc(a)});t();u();if("function"==typeof a[Symbol.iterator])return t(),u(),new R(function(){return a[Symbol.iterator]()});if("function"==typeof a.u)return new R(function(){return nc(a.u())});throw Error("Not an iterator or iterable.");}
function nc(a){if(!(a instanceof Q))return a;var b=!1;return{next:function(){for(var c;!b;)try{c=a.a();break}catch(d){if(d!==lc)throw d;b=!0}return{value:c,done:b}}}}t();u();function R(a){this.b=a}R.prototype.u=function(){return new S(this.b())};R.prototype[Symbol.iterator]=function(){return new T(this.b())};R.prototype.c=function(){return new T(this.b())};t();u();function S(a){this.b=a}oa(S,Q);S.prototype.a=function(){var a=this.b.next();if(a.done)throw lc;return a.value};S.prototype.next=function(){return S.prototype.a.call(this)};
S.prototype[Symbol.iterator]=function(){return new T(this.b)};S.prototype.c=function(){return new T(this.b)};function T(a){R.call(this,function(){return a});this.f=a}oa(T,R);T.prototype.next=function(){return this.f.next()};function oc(a,b){this.o={};this.j=[];this.B=this.size=0;var c=arguments.length;if(1<c){if(c%2)throw Error("Uneven number of arguments");for(var d=0;d<c;d+=2)this.set(arguments[d],arguments[d+1])}else a&&this.addAll(a)}n=oc.prototype;n.G=function(){pc(this);return this.j.concat()};n.has=function(a){return U(this.o,a)};n.clear=function(){this.o={};this.B=this.size=this.j.length=0};n.remove=function(a){return this.delete(a)};
n.delete=function(a){return U(this.o,a)?(delete this.o[a],--this.size,this.B++,this.j.length>2*this.size&&pc(this),!0):!1};function pc(a){if(a.size!=a.j.length){for(var b=0,c=0;b<a.j.length;){var d=a.j[b];U(a.o,d)&&(a.j[c++]=d);b++}a.j.length=c}if(a.size!=a.j.length){var f={};for(c=b=0;b<a.j.length;)d=a.j[b],U(f,d)||(a.j[c++]=d,f[d]=1),b++;a.j.length=c}}n.get=function(a,b){return U(this.o,a)?this.o[a]:b};n.set=function(a,b){U(this.o,a)||(this.size+=1,this.j.push(a),this.B++);this.o[a]=b};
n.addAll=function(a){if(a instanceof oc)for(var b=a.G(),c=0;c<b.length;c++)this.set(b[c],a.get(b[c]));else for(b in a)this.set(b,a[b])};n.forEach=function(a,b){for(var c=this.G(),d=0;d<c.length;d++){var f=c[d],g=this.get(f);a.call(b,g,f,this)}};n.clone=function(){return new oc(this)};n.keys=function(){return mc(this.u(!0)).c()};n.values=function(){return mc(this.u(!1)).c()};n.entries=function(){var a=this;return kc(this.keys(),function(b){return[b,a.get(b)]})};
n.u=function(a){pc(this);var b=0,c=this.B,d=this,f=new Q;f.a=function(){if(c!=d.B)throw Error("The map has changed since the iterator was created");if(b>=d.j.length)throw lc;var g=d.j[b++];return a?g:d.o[g]};f.next=f.a.bind(f);return f};function U(a,b){return Object.prototype.hasOwnProperty.call(a,b)};var qc=/^(?:([^:/?#.]+):)?(?:\/\/(?:([^\\/?#]*)@)?([^\\/?#]*?)(?::([0-9]+))?(?=[\\/?#]|$))?([^?#]+)?(?:\?([^#]*))?(?:#([\s\S]*))?$/;function rc(a){N.call(this);this.headers=new oc;this.C=a||null;this.c=!1;this.J=this.a=null;this.P=this.v="";this.g=0;this.l="";this.i=this.N=this.s=this.L=!1;this.h=0;this.w=null;this.m=sc;this.I=this.M=!1}B(rc,N);var sc="";rc.prototype.b=ac(bc(),"goog.net.XhrIo",void 0).g;var tc=/^https?$/i,uc=["POST","PUT"];
function vc(a,b,c){if(a.a)throw Error("[goog.net.XhrIo] Object is active with another request="+a.v+"; newUri="+b);a.v=b;a.l="";a.g=0;a.P="POST";a.L=!1;a.c=!0;a.a=a.C?ic(a.C):ic(gc);a.J=a.C?ec(a.C):ec(gc);a.a.onreadystatechange=z(a.R,a);try{P(a.b,V(a,"Opening Xhr")),a.N=!0,a.a.open("POST",String(b),!0),a.N=!1}catch(g){P(a.b,V(a,"Error opening Xhr: "+g.message));wc(a,g);return}b=c||"";c=a.headers.clone();var d=c.G().find(function(g){return"content-type"==g.toLowerCase()}),f=x.FormData&&b instanceof
x.FormData;!(0<=Oa(uc,"POST"))||d||f||c.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");c.forEach(function(g,e){this.a.setRequestHeader(e,g)},a);a.m&&(a.a.responseType=a.m);"withCredentials"in a.a&&a.a.withCredentials!==a.M&&(a.a.withCredentials=a.M);try{xc(a),0<a.h&&(a.I=yc(a.a),P(a.b,V(a,"Will abort after "+a.h+"ms if incomplete, xhr2 "+a.I)),a.I?(a.a.timeout=a.h,a.a.ontimeout=z(a.T,a)):a.w=Mb(a.T,a.h,a)),P(a.b,V(a,"Sending request")),a.s=!0,a.a.send(b),a.s=!1}catch(g){P(a.b,
V(a,"Send error: "+g.message)),wc(a,g)}}function yc(a){return bb&&kb()&&"number"===typeof a.timeout&&void 0!==a.ontimeout}n=rc.prototype;n.T=function(){"undefined"!=typeof qa&&this.a&&(this.l="Timed out after "+this.h+"ms, aborting",this.g=8,P(this.b,V(this,this.l)),O(this,"timeout"),this.abort(8))};function wc(a,b){a.c=!1;a.a&&(a.i=!0,a.a.abort(),a.i=!1);a.l=b;a.g=5;zc(a);Ac(a)}function zc(a){a.L||(a.L=!0,O(a,"complete"),O(a,"error"))}
n.abort=function(a){this.a&&this.c&&(P(this.b,V(this,"Aborting")),this.c=!1,this.i=!0,this.a.abort(),this.i=!1,this.g=a||7,O(this,"complete"),O(this,"abort"),Ac(this))};n.R=function(){this.K||(this.N||this.s||this.i?Bc(this):this.W())};n.W=function(){Bc(this)};
function Bc(a){if(a.c&&"undefined"!=typeof qa)if(a.J[1]&&4==W(a)&&2==a.getStatus())P(a.b,V(a,"Local request error detected and ignored"));else if(a.s&&4==W(a))Mb(a.R,0,a);else if(O(a,"readystatechange"),4==W(a)){P(a.b,V(a,"Request complete"));a.c=!1;try{var b=a.getStatus();a:switch(b){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var c=!0;break a;default:c=!1}var d;if(!(d=c)){var f;if(f=0===b){var g=String(a.v).match(qc)[1]||null;if(!g&&x.self&&x.self.location){var e=x.self.location.protocol;
g=e.substr(0,e.length-1)}f=!tc.test(g?g.toLowerCase():"")}d=f}if(d)O(a,"complete"),O(a,"success");else{a.g=6;try{var h=2<W(a)?a.a.statusText:""}catch(k){P(a.b,"Can not get status: "+k.message),h=""}a.l=h+" ["+a.getStatus()+"]";zc(a)}}finally{Ac(a)}}}function Ac(a){if(a.a){xc(a);var b=a.a,c=a.J[0]?ra:null;a.a=null;a.J=null;O(a,"ready");try{b.onreadystatechange=c}catch(d){(a=a.b)&&cc(a,Pb,"Problem encountered resetting onreadystatechange: "+d.message)}}}
function xc(a){a.a&&a.I&&(a.a.ontimeout=null);a.w&&(Lb.clearTimeout(a.w),a.w=null)}function W(a){return a.a?a.a.readyState:0}n.getStatus=function(){try{return 2<W(this)?this.a.status:-1}catch(a){return-1}};
function Cc(a){try{if(!a.a)return null;if("response"in a.a)return a.a.response;switch(a.m){case sc:case "text":return a.a.responseText;case "arraybuffer":if("mozResponseArrayBuffer"in a.a)return a.a.mozResponseArrayBuffer}var b=a.b;b&&cc(b,Pb,"Response type "+a.m+" is not supported on this browser");return null}catch(c){return P(a.b,"Can not get response: "+c.message),null}}
function Dc(a){var b={};a=(a.a&&4==W(a)?a.a.getAllResponseHeaders()||"":"").split("\r\n");for(var c=0;c<a.length;c++)if(!/^[\s\xa0]*$/.test(a[c])){var d=Xa(a[c]),f=d[0];d=d[1];if("string"===typeof d){d=d.trim();var g=b[f]||[];b[f]=g;g.push(d)}}return Ua(b,function(e){return e.join(", ")})}function V(a,b){return b+" ["+a.P+" "+a.v+" "+a.getStatus()+"]"};var Ec={},Fc=null;function Gc(a){var b=a.length,c=3*b/4;c%3?c=Math.floor(c):H("=.",a[b-1])&&(c=H("=.",a[b-2])?c-2:c-1);var d=new Uint8Array(c),f=0;Hc(a,function(g){d[f++]=g});return d.subarray(0,f)}
function Hc(a,b){function c(k){for(;d<a.length;){var l=a.charAt(d++),m=Fc[l];if(null!=m)return m;if(!/^[\s\xa0]*$/.test(l))throw Error("Unknown base64 encoding at char: "+l);}return k}Ic();for(var d=0;;){var f=c(-1),g=c(0),e=c(64),h=c(64);if(64===h&&-1===f)break;b(f<<2|g>>4);64!=e&&(b(g<<4&240|e>>2),64!=h&&b(e<<6&192|h))}}
function Ic(){if(!Fc){Fc={};for(var a="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split(""),b=["+/=","+/","-_=","-_.","-_"],c=0;5>c;c++){var d=a.concat(b[c].split(""));Ec[c]=d;for(var f=0;f<d.length;f++){var g=d[f];void 0===Fc[g]&&(Fc[g]=f)}}}};var Jc=["content-type","grpc-status","grpc-message"];
function X(a){this.a=a.Z;this.m=null;this.b=[];this.h=[];this.g=[];this.f=[];this.c=[];this.l=!1;this.i=0;this.s=new Ga;var b=this;zb(this.a,"readystatechange",function(){var c=b.a;if(c=c.a?c.a.getResponseHeader("Content-Type"):null){c=c.toLowerCase();if(0==c.lastIndexOf("application/grpc-web-text",0)){c=b.a;try{var d=c.a?c.a.responseText:""}catch(k){P(c.b,"Can not get responseText: "+k.message),d=""}c=d||"";d=c.length-c.length%4;c=c.substr(b.i,d-b.i);if(0==c.length)return;b.i=d;c=Gc(c)}else if(0==
c.lastIndexOf("application/grpc",0))c=new Uint8Array(Cc(b.a));else{Y(b,new E(2,"Unknown Content-type received."));return}d=null;try{d=Ia(b.s,c)}catch(k){Y(b,new E(2,"Error in parsing response body"))}if(d)for(c=0;c<d.length;c++){if(Ja in d[c]){var f=d[c][Ja];if(f){var g=!1,e=void 0;try{e=b.m(f),g=!0}catch(k){Y(b,new E(13,"Error when deserializing response data; error: "+k+(", response: "+e)))}if(g)for(f=e,g=0;g<b.b.length;g++)b.b[g](f)}}if(G in d[c]&&0<d[c][G].length){f="";for(g=0;g<d[c][G].length;g++)f+=
String.fromCharCode(d[c][G][g]);f=f.trim().split("\r\n");g={};for(e=0;e<f.length;e++){var h=f[e].indexOf(":");g[f[e].substring(0,h).trim()]=f[e].substring(h+1).trim()}f=g;g=0;e="";"grpc-status"in f&&(g=Number(f["grpc-status"]),delete f["grpc-status"]);"grpc-message"in f&&(e=f["grpc-message"],delete f["grpc-message"]);Y(b,new E(g,e,f))}}}});zb(this.a,"complete",function(){var c=b.a.g,d=2,f="",g={};d=Dc(b.a);var e={};for(h in d)d.hasOwnProperty(h)&&(e[h.toLowerCase()]=d[h]);Object.keys(e).forEach(function(k){Jc.includes(k)||
(g[k]=e[k])});Kc(b,g);var h=-1;if(0!=c){switch(c){case 7:d=10;break;case 8:d=4;break;case 6:h=b.a.getStatus();d=Aa(h);break;default:d=14}10==d&&b.l||(f=Da(c),-1!=h&&(f+=", http status code: "+h),Y(b,new E(d,f)))}else c=!1,"grpc-status"in e&&(d=Number(e["grpc-status"]),"grpc-message"in e&&(f=e["grpc-message"]),0!=d&&(Y(b,new E(d,f||"",e)),c=!0)),c||Lc(b)})}
X.prototype.on=function(a,b){"data"==a?this.b.push(b):"status"==a?this.h.push(b):"metadata"==a?this.g.push(b):"end"==a?this.c.push(b):"error"==a&&this.f.push(b);return this};function Mc(a,b){b=a.indexOf(b);-1<b&&a.splice(b,1)}X.prototype.removeListener=function(a,b){"data"==a?Mc(this.b,b):"status"==a?Mc(this.h,b):"metadata"==a?Mc(this.g,b):"end"==a?Mc(this.c,b):"error"==a&&Mc(this.f,b);return this};X.prototype.cancel=function(){this.l=!0;this.a.abort()};
function Y(a,b){if(0!=b.code)for(var c=new E(b.code,decodeURIComponent(b.message||""),b.metadata),d=0;d<a.f.length;d++)a.f[d](c);b={code:b.code,details:decodeURIComponent(b.message||""),metadata:b.metadata};for(c=0;c<a.h.length;c++)a.h[c](b)}function Kc(a,b){for(var c=0;c<a.g.length;c++)a.g[c](b)}function Lc(a){for(var b=0;b<a.c.length;b++)a.c[b]()}X.prototype.cancel=X.prototype.cancel;X.prototype.removeListener=X.prototype.removeListener;X.prototype.on=X.prototype.on;function Nc(a){var b="";Ta(a,function(c,d){b+=d;b+=":";b+=c;b+="\r\n"});return b};function Z(a,b){a=void 0===a?{}:a;this.a=a.format||y("format",a)||"text";this.g=a.aa||y("suppressCorsPreflight",a)||!1;this.f=a.withCredentials||y("withCredentials",a)||!1;this.b=a.$||y("streamInterceptors",a)||[];this.h=a.ba||y("unaryInterceptors",a)||[];this.c=b||null}Z.prototype.X=function(a,b,c,d,f){var g=this,e=a.substr(0,a.length-d.name.length);a=Oc(function(h){return Pc(g,h,e)},this.b).call(this,za(d,b,c));Qc(a,f,!1);return new Ca(a)};
Z.prototype.S=function(a,b,c,d){var f=this,g=a.substr(0,a.length-d.name.length);return Oc(function(e){return new Promise(function(h,k){var l=Pc(f,e,g),m,p,q;Qc(l,function(w,A,L,Sb,Rc){w?k(w):Rc?q=A:L?p=L:Sb?m=Sb:(w=e.getMethodDescriptor(),A=m,A=void 0===A?{}:A,h(new D(q,w,A,void 0===p?null:p)))},!0)})},this.h).call(this,za(d,b,c)).then(function(e){return e.getResponseMessage()})};Z.prototype.unaryCall=function(a,b,c,d){return this.S(a,b,c,d)};
Z.prototype.Y=function(a,b,c,d){var f=this,g=a.substr(0,a.length-d.name.length);return Oc(function(e){return Pc(f,e,g)},this.b).call(this,za(d,b,c))};
function Pc(a,b,c){var d=b.getMethodDescriptor(),f=c+d.getName();c=a.c?a.c:new rc;c.M=a.f;var g=new X({Z:c});g.m=d.b;var e=b.getMetadata();for(h in e)c.headers.set(h,e[h]);"text"==a.a?(c.headers.set("Content-Type","application/grpc-web-text"),c.headers.set("Accept","application/grpc-web-text")):c.headers.set("Content-Type","application/grpc-web+proto");c.headers.set("X-User-Agent","grpc-web-javascript/0.1");c.headers.set("X-Grpc-Web","1");if(c.headers.has("deadline")){var h=Number(c.headers.get("deadline"));
h=Math.ceil(h-(new Date).getTime());c.headers.delete("deadline");Infinity===h&&(h=0);0<h&&(c.headers.set("grpc-timeout",h+"m"),c.h=Math.max(0,Math.max(1E3,Math.ceil(1.1*h))))}if(a.g){e=c.headers;h={};for(var k=ha(e.keys()),l=k.next();!l.done;l=k.next())l=l.value,h[l]=e.get(l);c.headers.clear();b:{for(m in h){var m=!1;break b}m=!0}if(!m)if(h=Nc(h),"string"===typeof f){if(m=encodeURIComponent("$httpHeaders"),h=null!=h?"="+encodeURIComponent(String(h)):"",m+=h)h=f.indexOf("#"),0>h&&(h=f.length),e=f.indexOf("?"),
0>e||e>h?(e=h,k=""):k=f.substring(e+1,h),f=[f.substr(0,e),k,f.substr(h)],h=f[1],f[1]=m?h?h+"&"+m:m:h,f=f[0]+(f[1]?"?"+f[1]:"")+f[2]}else f.a("$httpHeaders",h)}b=(0,d.a)(b.getRequestMessage());d=b.length;m=[0,0,0,0];h=new Uint8Array(5+d);for(e=3;0<=e;e--)m[e]=d%256,d>>>=8;h.set(new Uint8Array(m),1);h.set(b,5);b=h;if("text"==a.a){a=b;var p;void 0===p&&(p=0);Ic();p=Ec[p];b=Array(Math.floor(a.length/3));d=p[64]||"";for(m=h=0;h<a.length-2;h+=3){l=a[h];var q=a[h+1];k=a[h+2];e=p[l>>2];l=p[(l&3)<<4|q>>4];
q=p[(q&15)<<2|k>>6];k=p[k&63];b[m++]=e+l+q+k}e=0;k=d;switch(a.length-h){case 2:e=a[h+1],k=p[(e&15)<<2]||d;case 1:a=a[h],b[m]=p[a>>2]+p[(a&3)<<4|e>>4]+k+d}b=b.join("")}else"binary"==a.a&&(c.m="arraybuffer");vc(c,f,b);return g}
function Qc(a,b,c){var d=!1,f=null,g=!1;a.on("data",function(e){d=!0;f=e});a.on("error",function(e){0==e.code||g||(g=!0,b(e,null))});a.on("status",function(e){0==e.code||g?c&&b(null,null,e):(g=!0,b({code:e.code,message:e.details,metadata:e.metadata},null))});if(c)a.on("metadata",function(e){b(null,null,null,e)});a.on("end",function(){g||(d?c?b(null,f,null,null,!0):b(null,f):b({code:2,message:"Incomplete response"}));c&&b(null,null)})}
function Oc(a,b){var c=a;b.forEach(function(d){var f=c;c=function(g){return d.intercept(g,f)}});return c}Z.prototype.serverStreaming=Z.prototype.Y;Z.prototype.unaryCall=Z.prototype.unaryCall;Z.prototype.thenableCall=Z.prototype.S;Z.prototype.rpcCall=Z.prototype.X;module.exports.CallOptions=xa;module.exports.MethodDescriptor=ya;module.exports.GrpcWebClientBase=Z;module.exports.RpcError=E;module.exports.StatusCode={OK:0,CANCELLED:1,UNKNOWN:2,INVALID_ARGUMENT:3,DEADLINE_EXCEEDED:4,NOT_FOUND:5,ALREADY_EXISTS:6,PERMISSION_DENIED:7,UNAUTHENTICATED:16,RESOURCE_EXHAUSTED:8,FAILED_PRECONDITION:9,ABORTED:10,OUT_OF_RANGE:11,UNIMPLEMENTED:12,INTERNAL:13,UNAVAILABLE:14,DATA_LOSS:15};module.exports.MethodType={UNARY:"unary",SERVER_STREAMING:"server_streaming",BIDI_STREAMING:"bidi_streaming"};
Lb="undefined"!==typeof globalThis&&globalThis||self;

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],9:[function(require,module,exports){
(()=>{var t=[(t,i,n)=>{var e=n(1);L.MotionMarker=L.Marker.extend({options:{animate:!0,duration:5e3-e.reductionDuration,followMarker:!1,hideMarker:!1,rotateMarker:!1,rotateAngle:0,speed:0},initialize:function(t,i){L.Marker.prototype.initialize.call(this,t[0],i),this._movingEnded=!1,this._prevLatLng=t[0],this._nextLatLng=t[1],this._animate=this.options.animate,this._rotateMarker=this.options.rotateMarker,this.options.speed>0?(this._speed=this.options.speed,this._convertSpeedToDuration()):this._duration=this.options.duration-e.reductionDuration,this._rotateMarker&&(this._rotateAngle=this.options.rotateAngle,this._tempRotateAngle=0)},onAdd:function(t){L.Marker.prototype.onAdd.call(this,t),this._nextLatLng&&(this._updateTempLatLng(this._prevLatLng,this._nextLatLng),this._animStartTime=performance.now(),this._animStartTimeStamp=performance.now(),this._doAnimation()),this.options.hideMarker&&this.hideMarker(!0)},onRemove:function(t){L.Marker.prototype.onRemove.call(this,t),this._movingEnded||L.Util.cancelAnimFrame(this._frameAnimId),this._movingEnded=!0},_interpolatePosition:function(t,i,n,e){var s=e/n;return s=(s=s>0?s:0)>1?1:s,L.latLng(t[0]+s*(i[0]-t[0]),t[1]+s*(i[1]-t[1]))},moveTo:function(t,i={}){this._nextLatLng=t,this._animStartTime=performance.now(),this._animStartTimeStamp=performance.now(),this._updateTempLatLng(this._prevLatLng,t),i.hasOwnProperty("duration")&&(this._duration=i.duration-e.reductionDuration),i.hasOwnProperty("speed")&&(this._speed=i.speed,this._convertSpeedToDuration()),this._rotateMarker&&this._rotateAngle!==i.rotateAngle&&(this._rotateAngle=i.rotateAngle),this._doAnimation()},_followMarker:function(){var t=this._animate?this._duration/1e3:0;this._map.setView(this._nextLatLng,this._map.getZoom(),{duration:t+1,animate:!0})},activeFollowMarker:function(t){if(this.options.followMarker=t,this._map&&this._nextLatLng&&!this._movingEnded){var i=performance.now()-this._animStartTime,n=this._interpolatePosition(this._prevLatLng,this._nextLatLng,this.options.duration,i);if(t&&!this._movingEnded){this._map.setView([n.lat,n.lng],this._map.getZoom(),{animate:!1});var e=this._animate?this._duration/1e3:0;this._map.setView(this._nextLatLng,this._map.getZoom(),{duration:e+1,animate:!0})}}},_updatePrevLatLng:function(){this._prevLatLng=this._nextLatLng},_convertSpeedToDuration:function(){var t=1e3*this._speed/3600,i=L.latLng(this._prevLatLng[0],this._prevLatLng[1]).distanceTo({lat:this._nextLatLng[0],lng:this._nextLatLng[1]});this._duration=1e3*Number((i/t).toFixed(0))-e.reductionDuration},_doRotation:function(){this._rotateAngle!==this._tempRotateAngle&&(this.options.rotateMarker&&(this._icon.childNodes[0].style.transformOrigin="center",this._icon.childNodes[0].style.transform="rotate("+this._rotateAngle+"deg)",this._icon.childNodes[0].style.transition="transform .2s"),this._tempRotateAngle=this._rotateAngle)},_doAnimation:function(){if(this._movingEnded=!1,this.options.rotateMarker&&this._doRotation(),this.options.followMarker&&this._followMarker(),!this._animate&&!this._movingEnded){this.setLatLng({lat:this._nextLatLng[0],lng:this._nextLatLng[1]}),this._movingEnded=!0,this._updatePrevLatLng();return}this._frameAnimId=L.Util.requestAnimFrame(function(t){this._makeAnimation(t)},this,!0)},_makeAnimation:function(t){var i=t-this._animStartTimeStamp,n=this._interpolatePosition(this._prevLatLng,this._nextLatLng,this._duration,i);i>=this._duration&&this.stop(),!this._movingEnded&&(this.setLatLng(n),this._frameAnimId=L.Util.requestAnimFrame(this._makeAnimation,this,!1))},stop:function(){!this._movingEnded&&(L.Util.cancelAnimFrame(this._frameAnimId),this._movingEnded=!0,this._updatePrevLatLng(),this.setLatLng(this._nextLatLng),this.options.followMarker&&this._map.setView(this._nextLatLng,this._map.getZoom(),{animate:!1}))},hideMarker:function(t){t?this._icon.style.display="none":t||(this._icon.style.display="block"),this.options.hideMarker=t},activeAnimate:function(t){if(t!==this._animate){var i=performance.now()-this._animStartTimeStamp;if(this._animate&&!t&&!this._movingEnded&&this._nextLatLng){this._animate=t,this.stop();return}if(t&&i<this._duration&&this._nextLatLng){this._prevLatLng=this._tempPrevLatLng,this._nextLatLng=this._tempNextLatLng,this._animate=!0,this._doAnimation();return}this._animate=t}},_updateTempLatLng:function(t,i){this._tempPrevLatLng=t,this._tempNextLatLng=i}}),L.motionMarker=function(t,i){return new L.MotionMarker(t,i)}},t=>{t.exports={reductionDuration:100}},()=>{L.MotionLine=L.Polyline.extend({options:{animate:!0,duration:5e3},initialize:function(t,i){L.Polyline.prototype.initialize.call(this,t,i),this._isOnAnimate=!1,this._animate=this.options.animate,this._prevLatLng=t[0],this._nextLatLng=t[1],this._latlngs=[[this._prevLatLng,this._prevLatLng]],this._tempLatLngs||(this._tempLatLngs=L.LineUtil.isFlat(this._latlngs)?[this._latlngs]:this._latlngs),this._update(),this._play()},_interpolatePosition:function(t,i,n,e){var s=e/n;return s=(s=s>0?s:0)>1?1:s,L.latLng(t[0]+s*(i[0]-t[0]),t[1]+s*(i[1]-t[1]))},stop:function(){this._isOnAnimate&&(this._isOnAnimate=!1,L.Util.cancelAnimFrame(this._frameAnimId),this._frameAnimId=null,this._latlngs[0].push(L.latLng(this._nextLatLng[0],this._nextLatLng[1])),this.setLatLngs(this._latlngs))},_play:function(){if(!this._isOnAnimate){if(this._animStartTime=performance.now(),!this._animate){this._latlngs=[[this._prevLatLng,this._nextLatLng]],this.setLatLngs(this._latlngs);return}return this._isOnAnimate=!0,this._playAnimate(),this}},_playAnimate:function(){var t=performance.now();if(this._currentTimelapse=t-this._animStartTime,!this._animate){this.stop();return}if(this._isOnAnimate)return this._latlngs[0].pop(),this._doAnimate(t)},_doAnimate:function(t){var i=t-this._animStartTime,n=this._interpolatePosition(this._prevLatLng,this._nextLatLng,this.options.duration,i);if(this._latlngs[0].push(L.latLng(n.lat,n.lng)),this.setLatLngs(this._latlngs),i>=this.options.duration){this._isOnAnimate=!1;return}this._frameAnimId=L.Util.requestAnimFrame(this._playAnimate,this)},activeAnimate:function(t){if(t!==this._animate){var i=performance.now()-this._animStartTime;if(t&&i<this.options.duration&&this._nextLatLng){var n=this._interpolatePosition(this._prevLatLng,this._nextLatLng,this.options.duration,i);this._latlngs=[[this._prevLatLng,[n.lat,n.lng]]],this._isOnAnimate=!0,this._animate=!0,this._playAnimate()}else this._animate=t}}}),L.motionLine=function(t,i){return new L.MotionLine(t,i)}},(t,i,n)=>{n(2),n(0),L.MoveMarker=L.FeatureGroup.extend({optionsPolyline:{animate:!0,color:"red",weight:4,hidePolylines:!1,duration:5e3,removeFirstLines:!1,maxLengthLines:3},optionsMarker:{animate:!0,hideMarker:!1,followMarker:!1,rotateMarker:!1,duration:5e3,speed:0},optionsGroup:{},initialize:function(t,i,n,e){L.FeatureGroup.prototype.initialize.call(this,[],e),this._latLngs=t,L.setOptions(this,{optionsPolyline:{...this.optionsPolyline,...i},optionsMarker:{...this.optionsMarker,...n},optionsGroup:{...this.optionsGroup,...e}})},onAdd:function(t){L.FeatureGroup.prototype.onAdd.call(this,t),this.options.optionsPolyline.hidePolylines||this.setStyleOpacityLines(),1===this._latLngs.length?this._createMarker([this._latLngs[0],]):this._latLngs.length>=2&&this._createMarker([this._latLngs[this._latLngs.length-2],this._latLngs[this._latLngs.length-1],]),this.options.optionsPolyline.animate||this.addMoreLine(this._latLngs[1],{rotateAngle:this.optionsPolyline.rotateAngle,animatePolyline:!1}),2===this._latLngs.length&&this.options.optionsPolyline.animate&&this.addMoreLine(null,{rotateAngle:this.optionsPolyline.rotateAngle,animatePolyline:this.optionsPolyline.animate})},_createLinesNoAnimate:function(t){for(var i=0;i<t.length-1;i++){var n=L.polyline([t[i],t[i+1]],this.options.optionsPolyline);this.addLayer(n)}},addMoreLine:function(t,i){var n=Object.keys(this._layers).filter(t=>{if(this._layers[t]instanceof L.MotionLine)return!0});this.options.optionsPolyline.removeFirstLines&&n.length>=this.options.optionsPolyline.maxLengthLines&&this.removeLayer(Number(n[0]));var e=this._latLngs.length;this._currentInstanceline=L.motionLine(t?[this._latLngs[e-1],t]:[this._latLngs[e-2],this._latLngs[e-1]],{...this.options.optionsPolyline,animate:!!i?.animatePolyline}),this.addLayer(this._currentInstanceline),t?this._latLngs.push(t):this._latLngs.push(this._latLngs[1]),this.hidePolylines(this.options.optionsPolyline.hidePolylines),this._marker.moveTo(t||this._latLngs[this._latLngs.length-1],i)},_createMarker:function(t){this._marker=L.motionMarker(t,this.options.optionsMarker),this.addLayer(this._marker)},hidePolylines:function(t=this.options.optionsPolyline.hidePolylines){this.options.optionsPolyline.hidePolylines=t,this.options.optionsPolyline.hidePolylines?this.setStyleHideLines():this.setStyleOpacityLines()},getMarker:function(){return this._marker},getCurrentPolyline:function(){return this._currentInstanceline},stop:function(){this._currentInstanceline instanceof L.MotionLine&&this._currentInstanceline.stop(),this._marker instanceof L.MotionMarker&&this._marker.stop()},setStyleOpacityLines:function(){var t,i=Object.keys(this._layers).filter(t=>{if(this._layers[t]instanceof L.MotionLine)return!0}),n=1;for(var e in this._layers)(t=this._layers[e])instanceof L.MotionLine&&(t.setStyle({opacity:n/i.length}),n++)},setStyleHideLines:function(){var t;for(var i in this._layers)(t=this._layers[i])instanceof L.MotionLine&&t.setStyle({opacity:0})}}),L.moveMarker=function(t,i,n,e){return new L.MoveMarker(t,i,n,e)}}],i={};function n(e){var s=i[e];if(void 0!==s)return s.exports;var a=i[e]={exports:{}};return t[e](a,a.exports,n),a.exports}n(0),n(2);var e=n(3)})();

},{}],10:[function(require,module,exports){
"use strict";

/* @preserve
 * Leaflet 1.9.4, a JS library for interactive maps. https://leafletjs.com
 * (c) 2010-2023 Vladimir Agafonkin, (c) 2010-2011 CloudMade
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) : typeof define === 'function' && define.amd ? define(['exports'], factory) : (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.leaflet = {}));
})(void 0, function (exports) {
  'use strict';

  var version = "1.9.4";

  /*
   * @namespace Util
   *
   * Various utility functions, used by Leaflet internally.
   */

  // @function extend(dest: Object, src?: Object): Object
  // Merges the properties of the `src` object (or multiple objects) into `dest` object and returns the latter. Has an `L.extend` shortcut.
  function extend(dest) {
    var i, j, len, src;
    for (j = 1, len = arguments.length; j < len; j++) {
      src = arguments[j];
      for (i in src) {
        dest[i] = src[i];
      }
    }
    return dest;
  }

  // @function create(proto: Object, properties?: Object): Object
  // Compatibility polyfill for [Object.create](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/create)
  var create$2 = Object.create || function () {
    function F() {}
    return function (proto) {
      F.prototype = proto;
      return new F();
    };
  }();

  // @function bind(fn: Function, …): Function
  // Returns a new function bound to the arguments passed, like [Function.prototype.bind](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Function/bind).
  // Has a `L.bind()` shortcut.
  function bind(fn, obj) {
    var slice = Array.prototype.slice;
    if (fn.bind) {
      return fn.bind.apply(fn, slice.call(arguments, 1));
    }
    var args = slice.call(arguments, 2);
    return function () {
      return fn.apply(obj, args.length ? args.concat(slice.call(arguments)) : arguments);
    };
  }

  // @property lastId: Number
  // Last unique ID used by [`stamp()`](#util-stamp)
  var lastId = 0;

  // @function stamp(obj: Object): Number
  // Returns the unique ID of an object, assigning it one if it doesn't have it.
  function stamp(obj) {
    if (!('_leaflet_id' in obj)) {
      obj['_leaflet_id'] = ++lastId;
    }
    return obj._leaflet_id;
  }

  // @function throttle(fn: Function, time: Number, context: Object): Function
  // Returns a function which executes function `fn` with the given scope `context`
  // (so that the `this` keyword refers to `context` inside `fn`'s code). The function
  // `fn` will be called no more than one time per given amount of `time`. The arguments
  // received by the bound function will be any arguments passed when binding the
  // function, followed by any arguments passed when invoking the bound function.
  // Has an `L.throttle` shortcut.
  function throttle(fn, time, context) {
    var lock, args, wrapperFn, later;
    later = function () {
      // reset lock and call if queued
      lock = false;
      if (args) {
        wrapperFn.apply(context, args);
        args = false;
      }
    };
    wrapperFn = function () {
      if (lock) {
        // called too soon, queue to call later
        args = arguments;
      } else {
        // call and lock until later
        fn.apply(context, arguments);
        setTimeout(later, time);
        lock = true;
      }
    };
    return wrapperFn;
  }

  // @function wrapNum(num: Number, range: Number[], includeMax?: Boolean): Number
  // Returns the number `num` modulo `range` in such a way so it lies within
  // `range[0]` and `range[1]`. The returned value will be always smaller than
  // `range[1]` unless `includeMax` is set to `true`.
  function wrapNum(x, range, includeMax) {
    var max = range[1],
      min = range[0],
      d = max - min;
    return x === max && includeMax ? x : ((x - min) % d + d) % d + min;
  }

  // @function falseFn(): Function
  // Returns a function which always returns `false`.
  function falseFn() {
    return false;
  }

  // @function formatNum(num: Number, precision?: Number|false): Number
  // Returns the number `num` rounded with specified `precision`.
  // The default `precision` value is 6 decimal places.
  // `false` can be passed to skip any processing (can be useful to avoid round-off errors).
  function formatNum(num, precision) {
    if (precision === false) {
      return num;
    }
    var pow = Math.pow(10, precision === undefined ? 6 : precision);
    return Math.round(num * pow) / pow;
  }

  // @function trim(str: String): String
  // Compatibility polyfill for [String.prototype.trim](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String/Trim)
  function trim(str) {
    return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
  }

  // @function splitWords(str: String): String[]
  // Trims and splits the string on whitespace and returns the array of parts.
  function splitWords(str) {
    return trim(str).split(/\s+/);
  }

  // @function setOptions(obj: Object, options: Object): Object
  // Merges the given properties to the `options` of the `obj` object, returning the resulting options. See `Class options`. Has an `L.setOptions` shortcut.
  function setOptions(obj, options) {
    if (!Object.prototype.hasOwnProperty.call(obj, 'options')) {
      obj.options = obj.options ? create$2(obj.options) : {};
    }
    for (var i in options) {
      obj.options[i] = options[i];
    }
    return obj.options;
  }

  // @function getParamString(obj: Object, existingUrl?: String, uppercase?: Boolean): String
  // Converts an object into a parameter URL string, e.g. `{a: "foo", b: "bar"}`
  // translates to `'?a=foo&b=bar'`. If `existingUrl` is set, the parameters will
  // be appended at the end. If `uppercase` is `true`, the parameter names will
  // be uppercased (e.g. `'?A=foo&B=bar'`)
  function getParamString(obj, existingUrl, uppercase) {
    var params = [];
    for (var i in obj) {
      params.push(encodeURIComponent(uppercase ? i.toUpperCase() : i) + '=' + encodeURIComponent(obj[i]));
    }
    return (!existingUrl || existingUrl.indexOf('?') === -1 ? '?' : '&') + params.join('&');
  }
  var templateRe = /\{ *([\w_ -]+) *\}/g;

  // @function template(str: String, data: Object): String
  // Simple templating facility, accepts a template string of the form `'Hello {a}, {b}'`
  // and a data object like `{a: 'foo', b: 'bar'}`, returns evaluated string
  // `('Hello foo, bar')`. You can also specify functions instead of strings for
  // data values — they will be evaluated passing `data` as an argument.
  function template(str, data) {
    return str.replace(templateRe, function (str, key) {
      var value = data[key];
      if (value === undefined) {
        throw new Error('No value provided for variable ' + str);
      } else if (typeof value === 'function') {
        value = value(data);
      }
      return value;
    });
  }

  // @function isArray(obj): Boolean
  // Compatibility polyfill for [Array.isArray](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray)
  var isArray = Array.isArray || function (obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  };

  // @function indexOf(array: Array, el: Object): Number
  // Compatibility polyfill for [Array.prototype.indexOf](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf)
  function indexOf(array, el) {
    for (var i = 0; i < array.length; i++) {
      if (array[i] === el) {
        return i;
      }
    }
    return -1;
  }

  // @property emptyImageUrl: String
  // Data URI string containing a base64-encoded empty GIF image.
  // Used as a hack to free memory from unused images on WebKit-powered
  // mobile devices (by setting image `src` to this string).
  var emptyImageUrl = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

  // inspired by https://paulirish.com/2011/requestanimationframe-for-smart-animating/

  function getPrefixed(name) {
    return window['webkit' + name] || window['moz' + name] || window['ms' + name];
  }
  var lastTime = 0;

  // fallback for IE 7-8
  function timeoutDefer(fn) {
    var time = +new Date(),
      timeToCall = Math.max(0, 16 - (time - lastTime));
    lastTime = time + timeToCall;
    return window.setTimeout(fn, timeToCall);
  }
  var requestFn = window.requestAnimationFrame || getPrefixed('RequestAnimationFrame') || timeoutDefer;
  var cancelFn = window.cancelAnimationFrame || getPrefixed('CancelAnimationFrame') || getPrefixed('CancelRequestAnimationFrame') || function (id) {
    window.clearTimeout(id);
  };

  // @function requestAnimFrame(fn: Function, context?: Object, immediate?: Boolean): Number
  // Schedules `fn` to be executed when the browser repaints. `fn` is bound to
  // `context` if given. When `immediate` is set, `fn` is called immediately if
  // the browser doesn't have native support for
  // [`window.requestAnimationFrame`](https://developer.mozilla.org/docs/Web/API/window/requestAnimationFrame),
  // otherwise it's delayed. Returns a request ID that can be used to cancel the request.
  function requestAnimFrame(fn, context, immediate) {
    if (immediate && requestFn === timeoutDefer) {
      fn.call(context);
    } else {
      return requestFn.call(window, bind(fn, context));
    }
  }

  // @function cancelAnimFrame(id: Number): undefined
  // Cancels a previous `requestAnimFrame`. See also [window.cancelAnimationFrame](https://developer.mozilla.org/docs/Web/API/window/cancelAnimationFrame).
  function cancelAnimFrame(id) {
    if (id) {
      cancelFn.call(window, id);
    }
  }
  var Util = {
    __proto__: null,
    extend: extend,
    create: create$2,
    bind: bind,
    get lastId() {
      return lastId;
    },
    stamp: stamp,
    throttle: throttle,
    wrapNum: wrapNum,
    falseFn: falseFn,
    formatNum: formatNum,
    trim: trim,
    splitWords: splitWords,
    setOptions: setOptions,
    getParamString: getParamString,
    template: template,
    isArray: isArray,
    indexOf: indexOf,
    emptyImageUrl: emptyImageUrl,
    requestFn: requestFn,
    cancelFn: cancelFn,
    requestAnimFrame: requestAnimFrame,
    cancelAnimFrame: cancelAnimFrame
  };

  // @class Class
  // @aka L.Class

  // @section
  // @uninheritable

  // Thanks to John Resig and Dean Edwards for inspiration!

  function Class() {}
  Class.extend = function (props) {
    // @function extend(props: Object): Function
    // [Extends the current class](#class-inheritance) given the properties to be included.
    // Returns a Javascript function that is a class constructor (to be called with `new`).
    var NewClass = function () {
      setOptions(this);

      // call the constructor
      if (this.initialize) {
        this.initialize.apply(this, arguments);
      }

      // call all constructor hooks
      this.callInitHooks();
    };
    var parentProto = NewClass.__super__ = this.prototype;
    var proto = create$2(parentProto);
    proto.constructor = NewClass;
    NewClass.prototype = proto;

    // inherit parent's statics
    for (var i in this) {
      if (Object.prototype.hasOwnProperty.call(this, i) && i !== 'prototype' && i !== '__super__') {
        NewClass[i] = this[i];
      }
    }

    // mix static properties into the class
    if (props.statics) {
      extend(NewClass, props.statics);
    }

    // mix includes into the prototype
    if (props.includes) {
      checkDeprecatedMixinEvents(props.includes);
      extend.apply(null, [proto].concat(props.includes));
    }

    // mix given properties into the prototype
    extend(proto, props);
    delete proto.statics;
    delete proto.includes;

    // merge options
    if (proto.options) {
      proto.options = parentProto.options ? create$2(parentProto.options) : {};
      extend(proto.options, props.options);
    }
    proto._initHooks = [];

    // add method for calling all hooks
    proto.callInitHooks = function () {
      if (this._initHooksCalled) {
        return;
      }
      if (parentProto.callInitHooks) {
        parentProto.callInitHooks.call(this);
      }
      this._initHooksCalled = true;
      for (var i = 0, len = proto._initHooks.length; i < len; i++) {
        proto._initHooks[i].call(this);
      }
    };
    return NewClass;
  };

  // @function include(properties: Object): this
  // [Includes a mixin](#class-includes) into the current class.
  Class.include = function (props) {
    var parentOptions = this.prototype.options;
    extend(this.prototype, props);
    if (props.options) {
      this.prototype.options = parentOptions;
      this.mergeOptions(props.options);
    }
    return this;
  };

  // @function mergeOptions(options: Object): this
  // [Merges `options`](#class-options) into the defaults of the class.
  Class.mergeOptions = function (options) {
    extend(this.prototype.options, options);
    return this;
  };

  // @function addInitHook(fn: Function): this
  // Adds a [constructor hook](#class-constructor-hooks) to the class.
  Class.addInitHook = function (fn) {
    // (Function) || (String, args...)
    var args = Array.prototype.slice.call(arguments, 1);
    var init = typeof fn === 'function' ? fn : function () {
      this[fn].apply(this, args);
    };
    this.prototype._initHooks = this.prototype._initHooks || [];
    this.prototype._initHooks.push(init);
    return this;
  };
  function checkDeprecatedMixinEvents(includes) {
    /* global L: true */
    if (typeof L === 'undefined' || !L || !L.Mixin) {
      return;
    }
    includes = isArray(includes) ? includes : [includes];
    for (var i = 0; i < includes.length; i++) {
      if (includes[i] === L.Mixin.Events) {
        console.warn('Deprecated include of L.Mixin.Events: ' + 'this property will be removed in future releases, ' + 'please inherit from L.Evented instead.', new Error().stack);
      }
    }
  }

  /*
   * @class Evented
   * @aka L.Evented
   * @inherits Class
   *
   * A set of methods shared between event-powered classes (like `Map` and `Marker`). Generally, events allow you to execute some function when something happens with an object (e.g. the user clicks on the map, causing the map to fire `'click'` event).
   *
   * @example
   *
   * ```js
   * map.on('click', function(e) {
   * 	alert(e.latlng);
   * } );
   * ```
   *
   * Leaflet deals with event listeners by reference, so if you want to add a listener and then remove it, define it as a function:
   *
   * ```js
   * function onClick(e) { ... }
   *
   * map.on('click', onClick);
   * map.off('click', onClick);
   * ```
   */

  var Events = {
    /* @method on(type: String, fn: Function, context?: Object): this
     * Adds a listener function (`fn`) to a particular event type of the object. You can optionally specify the context of the listener (object the this keyword will point to). You can also pass several space-separated types (e.g. `'click dblclick'`).
     *
     * @alternative
     * @method on(eventMap: Object): this
     * Adds a set of type/listener pairs, e.g. `{click: onClick, mousemove: onMouseMove}`
     */
    on: function (types, fn, context) {
      // types can be a map of types/handlers
      if (typeof types === 'object') {
        for (var type in types) {
          // we don't process space-separated events here for performance;
          // it's a hot path since Layer uses the on(obj) syntax
          this._on(type, types[type], fn);
        }
      } else {
        // types can be a string of space-separated words
        types = splitWords(types);
        for (var i = 0, len = types.length; i < len; i++) {
          this._on(types[i], fn, context);
        }
      }
      return this;
    },
    /* @method off(type: String, fn?: Function, context?: Object): this
     * Removes a previously added listener function. If no function is specified, it will remove all the listeners of that particular event from the object. Note that if you passed a custom context to `on`, you must pass the same context to `off` in order to remove the listener.
     *
     * @alternative
     * @method off(eventMap: Object): this
     * Removes a set of type/listener pairs.
     *
     * @alternative
     * @method off: this
     * Removes all listeners to all events on the object. This includes implicitly attached events.
     */
    off: function (types, fn, context) {
      if (!arguments.length) {
        // clear all listeners if called without arguments
        delete this._events;
      } else if (typeof types === 'object') {
        for (var type in types) {
          this._off(type, types[type], fn);
        }
      } else {
        types = splitWords(types);
        var removeAll = arguments.length === 1;
        for (var i = 0, len = types.length; i < len; i++) {
          if (removeAll) {
            this._off(types[i]);
          } else {
            this._off(types[i], fn, context);
          }
        }
      }
      return this;
    },
    // attach listener (without syntactic sugar now)
    _on: function (type, fn, context, _once) {
      if (typeof fn !== 'function') {
        console.warn('wrong listener type: ' + typeof fn);
        return;
      }

      // check if fn already there
      if (this._listens(type, fn, context) !== false) {
        return;
      }
      if (context === this) {
        // Less memory footprint.
        context = undefined;
      }
      var newListener = {
        fn: fn,
        ctx: context
      };
      if (_once) {
        newListener.once = true;
      }
      this._events = this._events || {};
      this._events[type] = this._events[type] || [];
      this._events[type].push(newListener);
    },
    _off: function (type, fn, context) {
      var listeners, i, len;
      if (!this._events) {
        return;
      }
      listeners = this._events[type];
      if (!listeners) {
        return;
      }
      if (arguments.length === 1) {
        // remove all
        if (this._firingCount) {
          // Set all removed listeners to noop
          // so they are not called if remove happens in fire
          for (i = 0, len = listeners.length; i < len; i++) {
            listeners[i].fn = falseFn;
          }
        }
        // clear all listeners for a type if function isn't specified
        delete this._events[type];
        return;
      }
      if (typeof fn !== 'function') {
        console.warn('wrong listener type: ' + typeof fn);
        return;
      }

      // find fn and remove it
      var index = this._listens(type, fn, context);
      if (index !== false) {
        var listener = listeners[index];
        if (this._firingCount) {
          // set the removed listener to noop so that's not called if remove happens in fire
          listener.fn = falseFn;

          /* copy array in case events are being fired */
          this._events[type] = listeners = listeners.slice();
        }
        listeners.splice(index, 1);
      }
    },
    // @method fire(type: String, data?: Object, propagate?: Boolean): this
    // Fires an event of the specified type. You can optionally provide a data
    // object — the first argument of the listener function will contain its
    // properties. The event can optionally be propagated to event parents.
    fire: function (type, data, propagate) {
      if (!this.listens(type, propagate)) {
        return this;
      }
      var event = extend({}, data, {
        type: type,
        target: this,
        sourceTarget: data && data.sourceTarget || this
      });
      if (this._events) {
        var listeners = this._events[type];
        if (listeners) {
          this._firingCount = this._firingCount + 1 || 1;
          for (var i = 0, len = listeners.length; i < len; i++) {
            var l = listeners[i];
            // off overwrites l.fn, so we need to copy fn to a var
            var fn = l.fn;
            if (l.once) {
              this.off(type, fn, l.ctx);
            }
            fn.call(l.ctx || this, event);
          }
          this._firingCount--;
        }
      }
      if (propagate) {
        // propagate the event to parents (set with addEventParent)
        this._propagateEvent(event);
      }
      return this;
    },
    // @method listens(type: String, propagate?: Boolean): Boolean
    // @method listens(type: String, fn: Function, context?: Object, propagate?: Boolean): Boolean
    // Returns `true` if a particular event type has any listeners attached to it.
    // The verification can optionally be propagated, it will return `true` if parents have the listener attached to it.
    listens: function (type, fn, context, propagate) {
      if (typeof type !== 'string') {
        console.warn('"string" type argument expected');
      }

      // we don't overwrite the input `fn` value, because we need to use it for propagation
      var _fn = fn;
      if (typeof fn !== 'function') {
        propagate = !!fn;
        _fn = undefined;
        context = undefined;
      }
      var listeners = this._events && this._events[type];
      if (listeners && listeners.length) {
        if (this._listens(type, _fn, context) !== false) {
          return true;
        }
      }
      if (propagate) {
        // also check parents for listeners if event propagates
        for (var id in this._eventParents) {
          if (this._eventParents[id].listens(type, fn, context, propagate)) {
            return true;
          }
        }
      }
      return false;
    },
    // returns the index (number) or false
    _listens: function (type, fn, context) {
      if (!this._events) {
        return false;
      }
      var listeners = this._events[type] || [];
      if (!fn) {
        return !!listeners.length;
      }
      if (context === this) {
        // Less memory footprint.
        context = undefined;
      }
      for (var i = 0, len = listeners.length; i < len; i++) {
        if (listeners[i].fn === fn && listeners[i].ctx === context) {
          return i;
        }
      }
      return false;
    },
    // @method once(…): this
    // Behaves as [`on(…)`](#evented-on), except the listener will only get fired once and then removed.
    once: function (types, fn, context) {
      // types can be a map of types/handlers
      if (typeof types === 'object') {
        for (var type in types) {
          // we don't process space-separated events here for performance;
          // it's a hot path since Layer uses the on(obj) syntax
          this._on(type, types[type], fn, true);
        }
      } else {
        // types can be a string of space-separated words
        types = splitWords(types);
        for (var i = 0, len = types.length; i < len; i++) {
          this._on(types[i], fn, context, true);
        }
      }
      return this;
    },
    // @method addEventParent(obj: Evented): this
    // Adds an event parent - an `Evented` that will receive propagated events
    addEventParent: function (obj) {
      this._eventParents = this._eventParents || {};
      this._eventParents[stamp(obj)] = obj;
      return this;
    },
    // @method removeEventParent(obj: Evented): this
    // Removes an event parent, so it will stop receiving propagated events
    removeEventParent: function (obj) {
      if (this._eventParents) {
        delete this._eventParents[stamp(obj)];
      }
      return this;
    },
    _propagateEvent: function (e) {
      for (var id in this._eventParents) {
        this._eventParents[id].fire(e.type, extend({
          layer: e.target,
          propagatedFrom: e.target
        }, e), true);
      }
    }
  };

  // aliases; we should ditch those eventually

  // @method addEventListener(…): this
  // Alias to [`on(…)`](#evented-on)
  Events.addEventListener = Events.on;

  // @method removeEventListener(…): this
  // Alias to [`off(…)`](#evented-off)

  // @method clearAllEventListeners(…): this
  // Alias to [`off()`](#evented-off)
  Events.removeEventListener = Events.clearAllEventListeners = Events.off;

  // @method addOneTimeEventListener(…): this
  // Alias to [`once(…)`](#evented-once)
  Events.addOneTimeEventListener = Events.once;

  // @method fireEvent(…): this
  // Alias to [`fire(…)`](#evented-fire)
  Events.fireEvent = Events.fire;

  // @method hasEventListeners(…): Boolean
  // Alias to [`listens(…)`](#evented-listens)
  Events.hasEventListeners = Events.listens;
  var Evented = Class.extend(Events);

  /*
   * @class Point
   * @aka L.Point
   *
   * Represents a point with `x` and `y` coordinates in pixels.
   *
   * @example
   *
   * ```js
   * var point = L.point(200, 300);
   * ```
   *
   * All Leaflet methods and options that accept `Point` objects also accept them in a simple Array form (unless noted otherwise), so these lines are equivalent:
   *
   * ```js
   * map.panBy([200, 300]);
   * map.panBy(L.point(200, 300));
   * ```
   *
   * Note that `Point` does not inherit from Leaflet's `Class` object,
   * which means new classes can't inherit from it, and new methods
   * can't be added to it with the `include` function.
   */

  function Point(x, y, round) {
    // @property x: Number; The `x` coordinate of the point
    this.x = round ? Math.round(x) : x;
    // @property y: Number; The `y` coordinate of the point
    this.y = round ? Math.round(y) : y;
  }
  var trunc = Math.trunc || function (v) {
    return v > 0 ? Math.floor(v) : Math.ceil(v);
  };
  Point.prototype = {
    // @method clone(): Point
    // Returns a copy of the current point.
    clone: function () {
      return new Point(this.x, this.y);
    },
    // @method add(otherPoint: Point): Point
    // Returns the result of addition of the current and the given points.
    add: function (point) {
      // non-destructive, returns a new point
      return this.clone()._add(toPoint(point));
    },
    _add: function (point) {
      // destructive, used directly for performance in situations where it's safe to modify existing point
      this.x += point.x;
      this.y += point.y;
      return this;
    },
    // @method subtract(otherPoint: Point): Point
    // Returns the result of subtraction of the given point from the current.
    subtract: function (point) {
      return this.clone()._subtract(toPoint(point));
    },
    _subtract: function (point) {
      this.x -= point.x;
      this.y -= point.y;
      return this;
    },
    // @method divideBy(num: Number): Point
    // Returns the result of division of the current point by the given number.
    divideBy: function (num) {
      return this.clone()._divideBy(num);
    },
    _divideBy: function (num) {
      this.x /= num;
      this.y /= num;
      return this;
    },
    // @method multiplyBy(num: Number): Point
    // Returns the result of multiplication of the current point by the given number.
    multiplyBy: function (num) {
      return this.clone()._multiplyBy(num);
    },
    _multiplyBy: function (num) {
      this.x *= num;
      this.y *= num;
      return this;
    },
    // @method scaleBy(scale: Point): Point
    // Multiply each coordinate of the current point by each coordinate of
    // `scale`. In linear algebra terms, multiply the point by the
    // [scaling matrix](https://en.wikipedia.org/wiki/Scaling_%28geometry%29#Matrix_representation)
    // defined by `scale`.
    scaleBy: function (point) {
      return new Point(this.x * point.x, this.y * point.y);
    },
    // @method unscaleBy(scale: Point): Point
    // Inverse of `scaleBy`. Divide each coordinate of the current point by
    // each coordinate of `scale`.
    unscaleBy: function (point) {
      return new Point(this.x / point.x, this.y / point.y);
    },
    // @method round(): Point
    // Returns a copy of the current point with rounded coordinates.
    round: function () {
      return this.clone()._round();
    },
    _round: function () {
      this.x = Math.round(this.x);
      this.y = Math.round(this.y);
      return this;
    },
    // @method floor(): Point
    // Returns a copy of the current point with floored coordinates (rounded down).
    floor: function () {
      return this.clone()._floor();
    },
    _floor: function () {
      this.x = Math.floor(this.x);
      this.y = Math.floor(this.y);
      return this;
    },
    // @method ceil(): Point
    // Returns a copy of the current point with ceiled coordinates (rounded up).
    ceil: function () {
      return this.clone()._ceil();
    },
    _ceil: function () {
      this.x = Math.ceil(this.x);
      this.y = Math.ceil(this.y);
      return this;
    },
    // @method trunc(): Point
    // Returns a copy of the current point with truncated coordinates (rounded towards zero).
    trunc: function () {
      return this.clone()._trunc();
    },
    _trunc: function () {
      this.x = trunc(this.x);
      this.y = trunc(this.y);
      return this;
    },
    // @method distanceTo(otherPoint: Point): Number
    // Returns the cartesian distance between the current and the given points.
    distanceTo: function (point) {
      point = toPoint(point);
      var x = point.x - this.x,
        y = point.y - this.y;
      return Math.sqrt(x * x + y * y);
    },
    // @method equals(otherPoint: Point): Boolean
    // Returns `true` if the given point has the same coordinates.
    equals: function (point) {
      point = toPoint(point);
      return point.x === this.x && point.y === this.y;
    },
    // @method contains(otherPoint: Point): Boolean
    // Returns `true` if both coordinates of the given point are less than the corresponding current point coordinates (in absolute values).
    contains: function (point) {
      point = toPoint(point);
      return Math.abs(point.x) <= Math.abs(this.x) && Math.abs(point.y) <= Math.abs(this.y);
    },
    // @method toString(): String
    // Returns a string representation of the point for debugging purposes.
    toString: function () {
      return 'Point(' + formatNum(this.x) + ', ' + formatNum(this.y) + ')';
    }
  };

  // @factory L.point(x: Number, y: Number, round?: Boolean)
  // Creates a Point object with the given `x` and `y` coordinates. If optional `round` is set to true, rounds the `x` and `y` values.

  // @alternative
  // @factory L.point(coords: Number[])
  // Expects an array of the form `[x, y]` instead.

  // @alternative
  // @factory L.point(coords: Object)
  // Expects a plain object of the form `{x: Number, y: Number}` instead.
  function toPoint(x, y, round) {
    if (x instanceof Point) {
      return x;
    }
    if (isArray(x)) {
      return new Point(x[0], x[1]);
    }
    if (x === undefined || x === null) {
      return x;
    }
    if (typeof x === 'object' && 'x' in x && 'y' in x) {
      return new Point(x.x, x.y);
    }
    return new Point(x, y, round);
  }

  /*
   * @class Bounds
   * @aka L.Bounds
   *
   * Represents a rectangular area in pixel coordinates.
   *
   * @example
   *
   * ```js
   * var p1 = L.point(10, 10),
   * p2 = L.point(40, 60),
   * bounds = L.bounds(p1, p2);
   * ```
   *
   * All Leaflet methods that accept `Bounds` objects also accept them in a simple Array form (unless noted otherwise), so the bounds example above can be passed like this:
   *
   * ```js
   * otherBounds.intersects([[10, 10], [40, 60]]);
   * ```
   *
   * Note that `Bounds` does not inherit from Leaflet's `Class` object,
   * which means new classes can't inherit from it, and new methods
   * can't be added to it with the `include` function.
   */

  function Bounds(a, b) {
    if (!a) {
      return;
    }
    var points = b ? [a, b] : a;
    for (var i = 0, len = points.length; i < len; i++) {
      this.extend(points[i]);
    }
  }
  Bounds.prototype = {
    // @method extend(point: Point): this
    // Extends the bounds to contain the given point.

    // @alternative
    // @method extend(otherBounds: Bounds): this
    // Extend the bounds to contain the given bounds
    extend: function (obj) {
      var min2, max2;
      if (!obj) {
        return this;
      }
      if (obj instanceof Point || typeof obj[0] === 'number' || 'x' in obj) {
        min2 = max2 = toPoint(obj);
      } else {
        obj = toBounds(obj);
        min2 = obj.min;
        max2 = obj.max;
        if (!min2 || !max2) {
          return this;
        }
      }

      // @property min: Point
      // The top left corner of the rectangle.
      // @property max: Point
      // The bottom right corner of the rectangle.
      if (!this.min && !this.max) {
        this.min = min2.clone();
        this.max = max2.clone();
      } else {
        this.min.x = Math.min(min2.x, this.min.x);
        this.max.x = Math.max(max2.x, this.max.x);
        this.min.y = Math.min(min2.y, this.min.y);
        this.max.y = Math.max(max2.y, this.max.y);
      }
      return this;
    },
    // @method getCenter(round?: Boolean): Point
    // Returns the center point of the bounds.
    getCenter: function (round) {
      return toPoint((this.min.x + this.max.x) / 2, (this.min.y + this.max.y) / 2, round);
    },
    // @method getBottomLeft(): Point
    // Returns the bottom-left point of the bounds.
    getBottomLeft: function () {
      return toPoint(this.min.x, this.max.y);
    },
    // @method getTopRight(): Point
    // Returns the top-right point of the bounds.
    getTopRight: function () {
      // -> Point
      return toPoint(this.max.x, this.min.y);
    },
    // @method getTopLeft(): Point
    // Returns the top-left point of the bounds (i.e. [`this.min`](#bounds-min)).
    getTopLeft: function () {
      return this.min; // left, top
    },
    // @method getBottomRight(): Point
    // Returns the bottom-right point of the bounds (i.e. [`this.max`](#bounds-max)).
    getBottomRight: function () {
      return this.max; // right, bottom
    },
    // @method getSize(): Point
    // Returns the size of the given bounds
    getSize: function () {
      return this.max.subtract(this.min);
    },
    // @method contains(otherBounds: Bounds): Boolean
    // Returns `true` if the rectangle contains the given one.
    // @alternative
    // @method contains(point: Point): Boolean
    // Returns `true` if the rectangle contains the given point.
    contains: function (obj) {
      var min, max;
      if (typeof obj[0] === 'number' || obj instanceof Point) {
        obj = toPoint(obj);
      } else {
        obj = toBounds(obj);
      }
      if (obj instanceof Bounds) {
        min = obj.min;
        max = obj.max;
      } else {
        min = max = obj;
      }
      return min.x >= this.min.x && max.x <= this.max.x && min.y >= this.min.y && max.y <= this.max.y;
    },
    // @method intersects(otherBounds: Bounds): Boolean
    // Returns `true` if the rectangle intersects the given bounds. Two bounds
    // intersect if they have at least one point in common.
    intersects: function (bounds) {
      // (Bounds) -> Boolean
      bounds = toBounds(bounds);
      var min = this.min,
        max = this.max,
        min2 = bounds.min,
        max2 = bounds.max,
        xIntersects = max2.x >= min.x && min2.x <= max.x,
        yIntersects = max2.y >= min.y && min2.y <= max.y;
      return xIntersects && yIntersects;
    },
    // @method overlaps(otherBounds: Bounds): Boolean
    // Returns `true` if the rectangle overlaps the given bounds. Two bounds
    // overlap if their intersection is an area.
    overlaps: function (bounds) {
      // (Bounds) -> Boolean
      bounds = toBounds(bounds);
      var min = this.min,
        max = this.max,
        min2 = bounds.min,
        max2 = bounds.max,
        xOverlaps = max2.x > min.x && min2.x < max.x,
        yOverlaps = max2.y > min.y && min2.y < max.y;
      return xOverlaps && yOverlaps;
    },
    // @method isValid(): Boolean
    // Returns `true` if the bounds are properly initialized.
    isValid: function () {
      return !!(this.min && this.max);
    },
    // @method pad(bufferRatio: Number): Bounds
    // Returns bounds created by extending or retracting the current bounds by a given ratio in each direction.
    // For example, a ratio of 0.5 extends the bounds by 50% in each direction.
    // Negative values will retract the bounds.
    pad: function (bufferRatio) {
      var min = this.min,
        max = this.max,
        heightBuffer = Math.abs(min.x - max.x) * bufferRatio,
        widthBuffer = Math.abs(min.y - max.y) * bufferRatio;
      return toBounds(toPoint(min.x - heightBuffer, min.y - widthBuffer), toPoint(max.x + heightBuffer, max.y + widthBuffer));
    },
    // @method equals(otherBounds: Bounds): Boolean
    // Returns `true` if the rectangle is equivalent to the given bounds.
    equals: function (bounds) {
      if (!bounds) {
        return false;
      }
      bounds = toBounds(bounds);
      return this.min.equals(bounds.getTopLeft()) && this.max.equals(bounds.getBottomRight());
    }
  };

  // @factory L.bounds(corner1: Point, corner2: Point)
  // Creates a Bounds object from two corners coordinate pairs.
  // @alternative
  // @factory L.bounds(points: Point[])
  // Creates a Bounds object from the given array of points.
  function toBounds(a, b) {
    if (!a || a instanceof Bounds) {
      return a;
    }
    return new Bounds(a, b);
  }

  /*
   * @class LatLngBounds
   * @aka L.LatLngBounds
   *
   * Represents a rectangular geographical area on a map.
   *
   * @example
   *
   * ```js
   * var corner1 = L.latLng(40.712, -74.227),
   * corner2 = L.latLng(40.774, -74.125),
   * bounds = L.latLngBounds(corner1, corner2);
   * ```
   *
   * All Leaflet methods that accept LatLngBounds objects also accept them in a simple Array form (unless noted otherwise), so the bounds example above can be passed like this:
   *
   * ```js
   * map.fitBounds([
   * 	[40.712, -74.227],
   * 	[40.774, -74.125]
   * ]);
   * ```
   *
   * Caution: if the area crosses the antimeridian (often confused with the International Date Line), you must specify corners _outside_ the [-180, 180] degrees longitude range.
   *
   * Note that `LatLngBounds` does not inherit from Leaflet's `Class` object,
   * which means new classes can't inherit from it, and new methods
   * can't be added to it with the `include` function.
   */

  function LatLngBounds(corner1, corner2) {
    // (LatLng, LatLng) or (LatLng[])
    if (!corner1) {
      return;
    }
    var latlngs = corner2 ? [corner1, corner2] : corner1;
    for (var i = 0, len = latlngs.length; i < len; i++) {
      this.extend(latlngs[i]);
    }
  }
  LatLngBounds.prototype = {
    // @method extend(latlng: LatLng): this
    // Extend the bounds to contain the given point

    // @alternative
    // @method extend(otherBounds: LatLngBounds): this
    // Extend the bounds to contain the given bounds
    extend: function (obj) {
      var sw = this._southWest,
        ne = this._northEast,
        sw2,
        ne2;
      if (obj instanceof LatLng) {
        sw2 = obj;
        ne2 = obj;
      } else if (obj instanceof LatLngBounds) {
        sw2 = obj._southWest;
        ne2 = obj._northEast;
        if (!sw2 || !ne2) {
          return this;
        }
      } else {
        return obj ? this.extend(toLatLng(obj) || toLatLngBounds(obj)) : this;
      }
      if (!sw && !ne) {
        this._southWest = new LatLng(sw2.lat, sw2.lng);
        this._northEast = new LatLng(ne2.lat, ne2.lng);
      } else {
        sw.lat = Math.min(sw2.lat, sw.lat);
        sw.lng = Math.min(sw2.lng, sw.lng);
        ne.lat = Math.max(ne2.lat, ne.lat);
        ne.lng = Math.max(ne2.lng, ne.lng);
      }
      return this;
    },
    // @method pad(bufferRatio: Number): LatLngBounds
    // Returns bounds created by extending or retracting the current bounds by a given ratio in each direction.
    // For example, a ratio of 0.5 extends the bounds by 50% in each direction.
    // Negative values will retract the bounds.
    pad: function (bufferRatio) {
      var sw = this._southWest,
        ne = this._northEast,
        heightBuffer = Math.abs(sw.lat - ne.lat) * bufferRatio,
        widthBuffer = Math.abs(sw.lng - ne.lng) * bufferRatio;
      return new LatLngBounds(new LatLng(sw.lat - heightBuffer, sw.lng - widthBuffer), new LatLng(ne.lat + heightBuffer, ne.lng + widthBuffer));
    },
    // @method getCenter(): LatLng
    // Returns the center point of the bounds.
    getCenter: function () {
      return new LatLng((this._southWest.lat + this._northEast.lat) / 2, (this._southWest.lng + this._northEast.lng) / 2);
    },
    // @method getSouthWest(): LatLng
    // Returns the south-west point of the bounds.
    getSouthWest: function () {
      return this._southWest;
    },
    // @method getNorthEast(): LatLng
    // Returns the north-east point of the bounds.
    getNorthEast: function () {
      return this._northEast;
    },
    // @method getNorthWest(): LatLng
    // Returns the north-west point of the bounds.
    getNorthWest: function () {
      return new LatLng(this.getNorth(), this.getWest());
    },
    // @method getSouthEast(): LatLng
    // Returns the south-east point of the bounds.
    getSouthEast: function () {
      return new LatLng(this.getSouth(), this.getEast());
    },
    // @method getWest(): Number
    // Returns the west longitude of the bounds
    getWest: function () {
      return this._southWest.lng;
    },
    // @method getSouth(): Number
    // Returns the south latitude of the bounds
    getSouth: function () {
      return this._southWest.lat;
    },
    // @method getEast(): Number
    // Returns the east longitude of the bounds
    getEast: function () {
      return this._northEast.lng;
    },
    // @method getNorth(): Number
    // Returns the north latitude of the bounds
    getNorth: function () {
      return this._northEast.lat;
    },
    // @method contains(otherBounds: LatLngBounds): Boolean
    // Returns `true` if the rectangle contains the given one.

    // @alternative
    // @method contains (latlng: LatLng): Boolean
    // Returns `true` if the rectangle contains the given point.
    contains: function (obj) {
      // (LatLngBounds) or (LatLng) -> Boolean
      if (typeof obj[0] === 'number' || obj instanceof LatLng || 'lat' in obj) {
        obj = toLatLng(obj);
      } else {
        obj = toLatLngBounds(obj);
      }
      var sw = this._southWest,
        ne = this._northEast,
        sw2,
        ne2;
      if (obj instanceof LatLngBounds) {
        sw2 = obj.getSouthWest();
        ne2 = obj.getNorthEast();
      } else {
        sw2 = ne2 = obj;
      }
      return sw2.lat >= sw.lat && ne2.lat <= ne.lat && sw2.lng >= sw.lng && ne2.lng <= ne.lng;
    },
    // @method intersects(otherBounds: LatLngBounds): Boolean
    // Returns `true` if the rectangle intersects the given bounds. Two bounds intersect if they have at least one point in common.
    intersects: function (bounds) {
      bounds = toLatLngBounds(bounds);
      var sw = this._southWest,
        ne = this._northEast,
        sw2 = bounds.getSouthWest(),
        ne2 = bounds.getNorthEast(),
        latIntersects = ne2.lat >= sw.lat && sw2.lat <= ne.lat,
        lngIntersects = ne2.lng >= sw.lng && sw2.lng <= ne.lng;
      return latIntersects && lngIntersects;
    },
    // @method overlaps(otherBounds: LatLngBounds): Boolean
    // Returns `true` if the rectangle overlaps the given bounds. Two bounds overlap if their intersection is an area.
    overlaps: function (bounds) {
      bounds = toLatLngBounds(bounds);
      var sw = this._southWest,
        ne = this._northEast,
        sw2 = bounds.getSouthWest(),
        ne2 = bounds.getNorthEast(),
        latOverlaps = ne2.lat > sw.lat && sw2.lat < ne.lat,
        lngOverlaps = ne2.lng > sw.lng && sw2.lng < ne.lng;
      return latOverlaps && lngOverlaps;
    },
    // @method toBBoxString(): String
    // Returns a string with bounding box coordinates in a 'southwest_lng,southwest_lat,northeast_lng,northeast_lat' format. Useful for sending requests to web services that return geo data.
    toBBoxString: function () {
      return [this.getWest(), this.getSouth(), this.getEast(), this.getNorth()].join(',');
    },
    // @method equals(otherBounds: LatLngBounds, maxMargin?: Number): Boolean
    // Returns `true` if the rectangle is equivalent (within a small margin of error) to the given bounds. The margin of error can be overridden by setting `maxMargin` to a small number.
    equals: function (bounds, maxMargin) {
      if (!bounds) {
        return false;
      }
      bounds = toLatLngBounds(bounds);
      return this._southWest.equals(bounds.getSouthWest(), maxMargin) && this._northEast.equals(bounds.getNorthEast(), maxMargin);
    },
    // @method isValid(): Boolean
    // Returns `true` if the bounds are properly initialized.
    isValid: function () {
      return !!(this._southWest && this._northEast);
    }
  };

  // TODO International date line?

  // @factory L.latLngBounds(corner1: LatLng, corner2: LatLng)
  // Creates a `LatLngBounds` object by defining two diagonally opposite corners of the rectangle.

  // @alternative
  // @factory L.latLngBounds(latlngs: LatLng[])
  // Creates a `LatLngBounds` object defined by the geographical points it contains. Very useful for zooming the map to fit a particular set of locations with [`fitBounds`](#map-fitbounds).
  function toLatLngBounds(a, b) {
    if (a instanceof LatLngBounds) {
      return a;
    }
    return new LatLngBounds(a, b);
  }

  /* @class LatLng
   * @aka L.LatLng
   *
   * Represents a geographical point with a certain latitude and longitude.
   *
   * @example
   *
   * ```
   * var latlng = L.latLng(50.5, 30.5);
   * ```
   *
   * All Leaflet methods that accept LatLng objects also accept them in a simple Array form and simple object form (unless noted otherwise), so these lines are equivalent:
   *
   * ```
   * map.panTo([50, 30]);
   * map.panTo({lon: 30, lat: 50});
   * map.panTo({lat: 50, lng: 30});
   * map.panTo(L.latLng(50, 30));
   * ```
   *
   * Note that `LatLng` does not inherit from Leaflet's `Class` object,
   * which means new classes can't inherit from it, and new methods
   * can't be added to it with the `include` function.
   */

  function LatLng(lat, lng, alt) {
    if (isNaN(lat) || isNaN(lng)) {
      throw new Error('Invalid LatLng object: (' + lat + ', ' + lng + ')');
    }

    // @property lat: Number
    // Latitude in degrees
    this.lat = +lat;

    // @property lng: Number
    // Longitude in degrees
    this.lng = +lng;

    // @property alt: Number
    // Altitude in meters (optional)
    if (alt !== undefined) {
      this.alt = +alt;
    }
  }
  LatLng.prototype = {
    // @method equals(otherLatLng: LatLng, maxMargin?: Number): Boolean
    // Returns `true` if the given `LatLng` point is at the same position (within a small margin of error). The margin of error can be overridden by setting `maxMargin` to a small number.
    equals: function (obj, maxMargin) {
      if (!obj) {
        return false;
      }
      obj = toLatLng(obj);
      var margin = Math.max(Math.abs(this.lat - obj.lat), Math.abs(this.lng - obj.lng));
      return margin <= (maxMargin === undefined ? 1.0E-9 : maxMargin);
    },
    // @method toString(): String
    // Returns a string representation of the point (for debugging purposes).
    toString: function (precision) {
      return 'LatLng(' + formatNum(this.lat, precision) + ', ' + formatNum(this.lng, precision) + ')';
    },
    // @method distanceTo(otherLatLng: LatLng): Number
    // Returns the distance (in meters) to the given `LatLng` calculated using the [Spherical Law of Cosines](https://en.wikipedia.org/wiki/Spherical_law_of_cosines).
    distanceTo: function (other) {
      return Earth.distance(this, toLatLng(other));
    },
    // @method wrap(): LatLng
    // Returns a new `LatLng` object with the longitude wrapped so it's always between -180 and +180 degrees.
    wrap: function () {
      return Earth.wrapLatLng(this);
    },
    // @method toBounds(sizeInMeters: Number): LatLngBounds
    // Returns a new `LatLngBounds` object in which each boundary is `sizeInMeters/2` meters apart from the `LatLng`.
    toBounds: function (sizeInMeters) {
      var latAccuracy = 180 * sizeInMeters / 40075017,
        lngAccuracy = latAccuracy / Math.cos(Math.PI / 180 * this.lat);
      return toLatLngBounds([this.lat - latAccuracy, this.lng - lngAccuracy], [this.lat + latAccuracy, this.lng + lngAccuracy]);
    },
    clone: function () {
      return new LatLng(this.lat, this.lng, this.alt);
    }
  };

  // @factory L.latLng(latitude: Number, longitude: Number, altitude?: Number): LatLng
  // Creates an object representing a geographical point with the given latitude and longitude (and optionally altitude).

  // @alternative
  // @factory L.latLng(coords: Array): LatLng
  // Expects an array of the form `[Number, Number]` or `[Number, Number, Number]` instead.

  // @alternative
  // @factory L.latLng(coords: Object): LatLng
  // Expects an plain object of the form `{lat: Number, lng: Number}` or `{lat: Number, lng: Number, alt: Number}` instead.

  function toLatLng(a, b, c) {
    if (a instanceof LatLng) {
      return a;
    }
    if (isArray(a) && typeof a[0] !== 'object') {
      if (a.length === 3) {
        return new LatLng(a[0], a[1], a[2]);
      }
      if (a.length === 2) {
        return new LatLng(a[0], a[1]);
      }
      return null;
    }
    if (a === undefined || a === null) {
      return a;
    }
    if (typeof a === 'object' && 'lat' in a) {
      return new LatLng(a.lat, 'lng' in a ? a.lng : a.lon, a.alt);
    }
    if (b === undefined) {
      return null;
    }
    return new LatLng(a, b, c);
  }

  /*
   * @namespace CRS
   * @crs L.CRS.Base
   * Object that defines coordinate reference systems for projecting
   * geographical points into pixel (screen) coordinates and back (and to
   * coordinates in other units for [WMS](https://en.wikipedia.org/wiki/Web_Map_Service) services). See
   * [spatial reference system](https://en.wikipedia.org/wiki/Spatial_reference_system).
   *
   * Leaflet defines the most usual CRSs by default. If you want to use a
   * CRS not defined by default, take a look at the
   * [Proj4Leaflet](https://github.com/kartena/Proj4Leaflet) plugin.
   *
   * Note that the CRS instances do not inherit from Leaflet's `Class` object,
   * and can't be instantiated. Also, new classes can't inherit from them,
   * and methods can't be added to them with the `include` function.
   */

  var CRS = {
    // @method latLngToPoint(latlng: LatLng, zoom: Number): Point
    // Projects geographical coordinates into pixel coordinates for a given zoom.
    latLngToPoint: function (latlng, zoom) {
      var projectedPoint = this.projection.project(latlng),
        scale = this.scale(zoom);
      return this.transformation._transform(projectedPoint, scale);
    },
    // @method pointToLatLng(point: Point, zoom: Number): LatLng
    // The inverse of `latLngToPoint`. Projects pixel coordinates on a given
    // zoom into geographical coordinates.
    pointToLatLng: function (point, zoom) {
      var scale = this.scale(zoom),
        untransformedPoint = this.transformation.untransform(point, scale);
      return this.projection.unproject(untransformedPoint);
    },
    // @method project(latlng: LatLng): Point
    // Projects geographical coordinates into coordinates in units accepted for
    // this CRS (e.g. meters for EPSG:3857, for passing it to WMS services).
    project: function (latlng) {
      return this.projection.project(latlng);
    },
    // @method unproject(point: Point): LatLng
    // Given a projected coordinate returns the corresponding LatLng.
    // The inverse of `project`.
    unproject: function (point) {
      return this.projection.unproject(point);
    },
    // @method scale(zoom: Number): Number
    // Returns the scale used when transforming projected coordinates into
    // pixel coordinates for a particular zoom. For example, it returns
    // `256 * 2^zoom` for Mercator-based CRS.
    scale: function (zoom) {
      return 256 * Math.pow(2, zoom);
    },
    // @method zoom(scale: Number): Number
    // Inverse of `scale()`, returns the zoom level corresponding to a scale
    // factor of `scale`.
    zoom: function (scale) {
      return Math.log(scale / 256) / Math.LN2;
    },
    // @method getProjectedBounds(zoom: Number): Bounds
    // Returns the projection's bounds scaled and transformed for the provided `zoom`.
    getProjectedBounds: function (zoom) {
      if (this.infinite) {
        return null;
      }
      var b = this.projection.bounds,
        s = this.scale(zoom),
        min = this.transformation.transform(b.min, s),
        max = this.transformation.transform(b.max, s);
      return new Bounds(min, max);
    },
    // @method distance(latlng1: LatLng, latlng2: LatLng): Number
    // Returns the distance between two geographical coordinates.

    // @property code: String
    // Standard code name of the CRS passed into WMS services (e.g. `'EPSG:3857'`)
    //
    // @property wrapLng: Number[]
    // An array of two numbers defining whether the longitude (horizontal) coordinate
    // axis wraps around a given range and how. Defaults to `[-180, 180]` in most
    // geographical CRSs. If `undefined`, the longitude axis does not wrap around.
    //
    // @property wrapLat: Number[]
    // Like `wrapLng`, but for the latitude (vertical) axis.

    // wrapLng: [min, max],
    // wrapLat: [min, max],

    // @property infinite: Boolean
    // If true, the coordinate space will be unbounded (infinite in both axes)
    infinite: false,
    // @method wrapLatLng(latlng: LatLng): LatLng
    // Returns a `LatLng` where lat and lng has been wrapped according to the
    // CRS's `wrapLat` and `wrapLng` properties, if they are outside the CRS's bounds.
    wrapLatLng: function (latlng) {
      var lng = this.wrapLng ? wrapNum(latlng.lng, this.wrapLng, true) : latlng.lng,
        lat = this.wrapLat ? wrapNum(latlng.lat, this.wrapLat, true) : latlng.lat,
        alt = latlng.alt;
      return new LatLng(lat, lng, alt);
    },
    // @method wrapLatLngBounds(bounds: LatLngBounds): LatLngBounds
    // Returns a `LatLngBounds` with the same size as the given one, ensuring
    // that its center is within the CRS's bounds.
    // Only accepts actual `L.LatLngBounds` instances, not arrays.
    wrapLatLngBounds: function (bounds) {
      var center = bounds.getCenter(),
        newCenter = this.wrapLatLng(center),
        latShift = center.lat - newCenter.lat,
        lngShift = center.lng - newCenter.lng;
      if (latShift === 0 && lngShift === 0) {
        return bounds;
      }
      var sw = bounds.getSouthWest(),
        ne = bounds.getNorthEast(),
        newSw = new LatLng(sw.lat - latShift, sw.lng - lngShift),
        newNe = new LatLng(ne.lat - latShift, ne.lng - lngShift);
      return new LatLngBounds(newSw, newNe);
    }
  };

  /*
   * @namespace CRS
   * @crs L.CRS.Earth
   *
   * Serves as the base for CRS that are global such that they cover the earth.
   * Can only be used as the base for other CRS and cannot be used directly,
   * since it does not have a `code`, `projection` or `transformation`. `distance()` returns
   * meters.
   */

  var Earth = extend({}, CRS, {
    wrapLng: [-180, 180],
    // Mean Earth Radius, as recommended for use by
    // the International Union of Geodesy and Geophysics,
    // see https://rosettacode.org/wiki/Haversine_formula
    R: 6371000,
    // distance between two geographical points using spherical law of cosines approximation
    distance: function (latlng1, latlng2) {
      var rad = Math.PI / 180,
        lat1 = latlng1.lat * rad,
        lat2 = latlng2.lat * rad,
        sinDLat = Math.sin((latlng2.lat - latlng1.lat) * rad / 2),
        sinDLon = Math.sin((latlng2.lng - latlng1.lng) * rad / 2),
        a = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon,
        c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return this.R * c;
    }
  });

  /*
   * @namespace Projection
   * @projection L.Projection.SphericalMercator
   *
   * Spherical Mercator projection — the most common projection for online maps,
   * used by almost all free and commercial tile providers. Assumes that Earth is
   * a sphere. Used by the `EPSG:3857` CRS.
   */

  var earthRadius = 6378137;
  var SphericalMercator = {
    R: earthRadius,
    MAX_LATITUDE: 85.0511287798,
    project: function (latlng) {
      var d = Math.PI / 180,
        max = this.MAX_LATITUDE,
        lat = Math.max(Math.min(max, latlng.lat), -max),
        sin = Math.sin(lat * d);
      return new Point(this.R * latlng.lng * d, this.R * Math.log((1 + sin) / (1 - sin)) / 2);
    },
    unproject: function (point) {
      var d = 180 / Math.PI;
      return new LatLng((2 * Math.atan(Math.exp(point.y / this.R)) - Math.PI / 2) * d, point.x * d / this.R);
    },
    bounds: function () {
      var d = earthRadius * Math.PI;
      return new Bounds([-d, -d], [d, d]);
    }()
  };

  /*
   * @class Transformation
   * @aka L.Transformation
   *
   * Represents an affine transformation: a set of coefficients `a`, `b`, `c`, `d`
   * for transforming a point of a form `(x, y)` into `(a*x + b, c*y + d)` and doing
   * the reverse. Used by Leaflet in its projections code.
   *
   * @example
   *
   * ```js
   * var transformation = L.transformation(2, 5, -1, 10),
   * 	p = L.point(1, 2),
   * 	p2 = transformation.transform(p), //  L.point(7, 8)
   * 	p3 = transformation.untransform(p2); //  L.point(1, 2)
   * ```
   */

  // factory new L.Transformation(a: Number, b: Number, c: Number, d: Number)
  // Creates a `Transformation` object with the given coefficients.
  function Transformation(a, b, c, d) {
    if (isArray(a)) {
      // use array properties
      this._a = a[0];
      this._b = a[1];
      this._c = a[2];
      this._d = a[3];
      return;
    }
    this._a = a;
    this._b = b;
    this._c = c;
    this._d = d;
  }
  Transformation.prototype = {
    // @method transform(point: Point, scale?: Number): Point
    // Returns a transformed point, optionally multiplied by the given scale.
    // Only accepts actual `L.Point` instances, not arrays.
    transform: function (point, scale) {
      // (Point, Number) -> Point
      return this._transform(point.clone(), scale);
    },
    // destructive transform (faster)
    _transform: function (point, scale) {
      scale = scale || 1;
      point.x = scale * (this._a * point.x + this._b);
      point.y = scale * (this._c * point.y + this._d);
      return point;
    },
    // @method untransform(point: Point, scale?: Number): Point
    // Returns the reverse transformation of the given point, optionally divided
    // by the given scale. Only accepts actual `L.Point` instances, not arrays.
    untransform: function (point, scale) {
      scale = scale || 1;
      return new Point((point.x / scale - this._b) / this._a, (point.y / scale - this._d) / this._c);
    }
  };

  // factory L.transformation(a: Number, b: Number, c: Number, d: Number)

  // @factory L.transformation(a: Number, b: Number, c: Number, d: Number)
  // Instantiates a Transformation object with the given coefficients.

  // @alternative
  // @factory L.transformation(coefficients: Array): Transformation
  // Expects an coefficients array of the form
  // `[a: Number, b: Number, c: Number, d: Number]`.

  function toTransformation(a, b, c, d) {
    return new Transformation(a, b, c, d);
  }

  /*
   * @namespace CRS
   * @crs L.CRS.EPSG3857
   *
   * The most common CRS for online maps, used by almost all free and commercial
   * tile providers. Uses Spherical Mercator projection. Set in by default in
   * Map's `crs` option.
   */

  var EPSG3857 = extend({}, Earth, {
    code: 'EPSG:3857',
    projection: SphericalMercator,
    transformation: function () {
      var scale = 0.5 / (Math.PI * SphericalMercator.R);
      return toTransformation(scale, 0.5, -scale, 0.5);
    }()
  });
  var EPSG900913 = extend({}, EPSG3857, {
    code: 'EPSG:900913'
  });

  // @namespace SVG; @section
  // There are several static functions which can be called without instantiating L.SVG:

  // @function create(name: String): SVGElement
  // Returns a instance of [SVGElement](https://developer.mozilla.org/docs/Web/API/SVGElement),
  // corresponding to the class name passed. For example, using 'line' will return
  // an instance of [SVGLineElement](https://developer.mozilla.org/docs/Web/API/SVGLineElement).
  function svgCreate(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
  }

  // @function pointsToPath(rings: Point[], closed: Boolean): String
  // Generates a SVG path string for multiple rings, with each ring turning
  // into "M..L..L.." instructions
  function pointsToPath(rings, closed) {
    var str = '',
      i,
      j,
      len,
      len2,
      points,
      p;
    for (i = 0, len = rings.length; i < len; i++) {
      points = rings[i];
      for (j = 0, len2 = points.length; j < len2; j++) {
        p = points[j];
        str += (j ? 'L' : 'M') + p.x + ' ' + p.y;
      }

      // closes the ring for polygons; "x" is VML syntax
      str += closed ? Browser.svg ? 'z' : 'x' : '';
    }

    // SVG complains about empty path strings
    return str || 'M0 0';
  }

  /*
   * @namespace Browser
   * @aka L.Browser
   *
   * A namespace with static properties for browser/feature detection used by Leaflet internally.
   *
   * @example
   *
   * ```js
   * if (L.Browser.ielt9) {
   *   alert('Upgrade your browser, dude!');
   * }
   * ```
   */

  var style = document.documentElement.style;

  // @property ie: Boolean; `true` for all Internet Explorer versions (not Edge).
  var ie = 'ActiveXObject' in window;

  // @property ielt9: Boolean; `true` for Internet Explorer versions less than 9.
  var ielt9 = ie && !document.addEventListener;

  // @property edge: Boolean; `true` for the Edge web browser.
  var edge = 'msLaunchUri' in navigator && !('documentMode' in document);

  // @property webkit: Boolean;
  // `true` for webkit-based browsers like Chrome and Safari (including mobile versions).
  var webkit = userAgentContains('webkit');

  // @property android: Boolean
  // **Deprecated.** `true` for any browser running on an Android platform.
  var android = userAgentContains('android');

  // @property android23: Boolean; **Deprecated.** `true` for browsers running on Android 2 or Android 3.
  var android23 = userAgentContains('android 2') || userAgentContains('android 3');

  /* See https://stackoverflow.com/a/17961266 for details on detecting stock Android */
  var webkitVer = parseInt(/WebKit\/([0-9]+)|$/.exec(navigator.userAgent)[1], 10); // also matches AppleWebKit
  // @property androidStock: Boolean; **Deprecated.** `true` for the Android stock browser (i.e. not Chrome)
  var androidStock = android && userAgentContains('Google') && webkitVer < 537 && !('AudioNode' in window);

  // @property opera: Boolean; `true` for the Opera browser
  var opera = !!window.opera;

  // @property chrome: Boolean; `true` for the Chrome browser.
  var chrome = !edge && userAgentContains('chrome');

  // @property gecko: Boolean; `true` for gecko-based browsers like Firefox.
  var gecko = userAgentContains('gecko') && !webkit && !opera && !ie;

  // @property safari: Boolean; `true` for the Safari browser.
  var safari = !chrome && userAgentContains('safari');
  var phantom = userAgentContains('phantom');

  // @property opera12: Boolean
  // `true` for the Opera browser supporting CSS transforms (version 12 or later).
  var opera12 = 'OTransition' in style;

  // @property win: Boolean; `true` when the browser is running in a Windows platform
  var win = navigator.platform.indexOf('Win') === 0;

  // @property ie3d: Boolean; `true` for all Internet Explorer versions supporting CSS transforms.
  var ie3d = ie && 'transition' in style;

  // @property webkit3d: Boolean; `true` for webkit-based browsers supporting CSS transforms.
  var webkit3d = 'WebKitCSSMatrix' in window && 'm11' in new window.WebKitCSSMatrix() && !android23;

  // @property gecko3d: Boolean; `true` for gecko-based browsers supporting CSS transforms.
  var gecko3d = 'MozPerspective' in style;

  // @property any3d: Boolean
  // `true` for all browsers supporting CSS transforms.
  var any3d = !window.L_DISABLE_3D && (ie3d || webkit3d || gecko3d) && !opera12 && !phantom;

  // @property mobile: Boolean; `true` for all browsers running in a mobile device.
  var mobile = typeof orientation !== 'undefined' || userAgentContains('mobile');

  // @property mobileWebkit: Boolean; `true` for all webkit-based browsers in a mobile device.
  var mobileWebkit = mobile && webkit;

  // @property mobileWebkit3d: Boolean
  // `true` for all webkit-based browsers in a mobile device supporting CSS transforms.
  var mobileWebkit3d = mobile && webkit3d;

  // @property msPointer: Boolean
  // `true` for browsers implementing the Microsoft touch events model (notably IE10).
  var msPointer = !window.PointerEvent && window.MSPointerEvent;

  // @property pointer: Boolean
  // `true` for all browsers supporting [pointer events](https://msdn.microsoft.com/en-us/library/dn433244%28v=vs.85%29.aspx).
  var pointer = !!(window.PointerEvent || msPointer);

  // @property touchNative: Boolean
  // `true` for all browsers supporting [touch events](https://developer.mozilla.org/docs/Web/API/Touch_events).
  // **This does not necessarily mean** that the browser is running in a computer with
  // a touchscreen, it only means that the browser is capable of understanding
  // touch events.
  var touchNative = 'ontouchstart' in window || !!window.TouchEvent;

  // @property touch: Boolean
  // `true` for all browsers supporting either [touch](#browser-touch) or [pointer](#browser-pointer) events.
  // Note: pointer events will be preferred (if available), and processed for all `touch*` listeners.
  var touch = !window.L_NO_TOUCH && (touchNative || pointer);

  // @property mobileOpera: Boolean; `true` for the Opera browser in a mobile device.
  var mobileOpera = mobile && opera;

  // @property mobileGecko: Boolean
  // `true` for gecko-based browsers running in a mobile device.
  var mobileGecko = mobile && gecko;

  // @property retina: Boolean
  // `true` for browsers on a high-resolution "retina" screen or on any screen when browser's display zoom is more than 100%.
  var retina = (window.devicePixelRatio || window.screen.deviceXDPI / window.screen.logicalXDPI) > 1;

  // @property passiveEvents: Boolean
  // `true` for browsers that support passive events.
  var passiveEvents = function () {
    var supportsPassiveOption = false;
    try {
      var opts = Object.defineProperty({}, 'passive', {
        get: function () {
          // eslint-disable-line getter-return
          supportsPassiveOption = true;
        }
      });
      window.addEventListener('testPassiveEventSupport', falseFn, opts);
      window.removeEventListener('testPassiveEventSupport', falseFn, opts);
    } catch (e) {
      // Errors can safely be ignored since this is only a browser support test.
    }
    return supportsPassiveOption;
  }();

  // @property canvas: Boolean
  // `true` when the browser supports [`<canvas>`](https://developer.mozilla.org/docs/Web/API/Canvas_API).
  var canvas$1 = function () {
    return !!document.createElement('canvas').getContext;
  }();

  // @property svg: Boolean
  // `true` when the browser supports [SVG](https://developer.mozilla.org/docs/Web/SVG).
  var svg$1 = !!(document.createElementNS && svgCreate('svg').createSVGRect);
  var inlineSvg = !!svg$1 && function () {
    var div = document.createElement('div');
    div.innerHTML = '<svg/>';
    return (div.firstChild && div.firstChild.namespaceURI) === 'http://www.w3.org/2000/svg';
  }();

  // @property vml: Boolean
  // `true` if the browser supports [VML](https://en.wikipedia.org/wiki/Vector_Markup_Language).
  var vml = !svg$1 && function () {
    try {
      var div = document.createElement('div');
      div.innerHTML = '<v:shape adj="1"/>';
      var shape = div.firstChild;
      shape.style.behavior = 'url(#default#VML)';
      return shape && typeof shape.adj === 'object';
    } catch (e) {
      return false;
    }
  }();

  // @property mac: Boolean; `true` when the browser is running in a Mac platform
  var mac = navigator.platform.indexOf('Mac') === 0;

  // @property mac: Boolean; `true` when the browser is running in a Linux platform
  var linux = navigator.platform.indexOf('Linux') === 0;
  function userAgentContains(str) {
    return navigator.userAgent.toLowerCase().indexOf(str) >= 0;
  }
  var Browser = {
    ie: ie,
    ielt9: ielt9,
    edge: edge,
    webkit: webkit,
    android: android,
    android23: android23,
    androidStock: androidStock,
    opera: opera,
    chrome: chrome,
    gecko: gecko,
    safari: safari,
    phantom: phantom,
    opera12: opera12,
    win: win,
    ie3d: ie3d,
    webkit3d: webkit3d,
    gecko3d: gecko3d,
    any3d: any3d,
    mobile: mobile,
    mobileWebkit: mobileWebkit,
    mobileWebkit3d: mobileWebkit3d,
    msPointer: msPointer,
    pointer: pointer,
    touch: touch,
    touchNative: touchNative,
    mobileOpera: mobileOpera,
    mobileGecko: mobileGecko,
    retina: retina,
    passiveEvents: passiveEvents,
    canvas: canvas$1,
    svg: svg$1,
    vml: vml,
    inlineSvg: inlineSvg,
    mac: mac,
    linux: linux
  };

  /*
   * Extends L.DomEvent to provide touch support for Internet Explorer and Windows-based devices.
   */

  var POINTER_DOWN = Browser.msPointer ? 'MSPointerDown' : 'pointerdown';
  var POINTER_MOVE = Browser.msPointer ? 'MSPointerMove' : 'pointermove';
  var POINTER_UP = Browser.msPointer ? 'MSPointerUp' : 'pointerup';
  var POINTER_CANCEL = Browser.msPointer ? 'MSPointerCancel' : 'pointercancel';
  var pEvent = {
    touchstart: POINTER_DOWN,
    touchmove: POINTER_MOVE,
    touchend: POINTER_UP,
    touchcancel: POINTER_CANCEL
  };
  var handle = {
    touchstart: _onPointerStart,
    touchmove: _handlePointer,
    touchend: _handlePointer,
    touchcancel: _handlePointer
  };
  var _pointers = {};
  var _pointerDocListener = false;

  // Provides a touch events wrapper for (ms)pointer events.
  // ref https://www.w3.org/TR/pointerevents/ https://www.w3.org/Bugs/Public/show_bug.cgi?id=22890

  function addPointerListener(obj, type, handler) {
    if (type === 'touchstart') {
      _addPointerDocListener();
    }
    if (!handle[type]) {
      console.warn('wrong event specified:', type);
      return falseFn;
    }
    handler = handle[type].bind(this, handler);
    obj.addEventListener(pEvent[type], handler, false);
    return handler;
  }
  function removePointerListener(obj, type, handler) {
    if (!pEvent[type]) {
      console.warn('wrong event specified:', type);
      return;
    }
    obj.removeEventListener(pEvent[type], handler, false);
  }
  function _globalPointerDown(e) {
    _pointers[e.pointerId] = e;
  }
  function _globalPointerMove(e) {
    if (_pointers[e.pointerId]) {
      _pointers[e.pointerId] = e;
    }
  }
  function _globalPointerUp(e) {
    delete _pointers[e.pointerId];
  }
  function _addPointerDocListener() {
    // need to keep track of what pointers and how many are active to provide e.touches emulation
    if (!_pointerDocListener) {
      // we listen document as any drags that end by moving the touch off the screen get fired there
      document.addEventListener(POINTER_DOWN, _globalPointerDown, true);
      document.addEventListener(POINTER_MOVE, _globalPointerMove, true);
      document.addEventListener(POINTER_UP, _globalPointerUp, true);
      document.addEventListener(POINTER_CANCEL, _globalPointerUp, true);
      _pointerDocListener = true;
    }
  }
  function _handlePointer(handler, e) {
    if (e.pointerType === (e.MSPOINTER_TYPE_MOUSE || 'mouse')) {
      return;
    }
    e.touches = [];
    for (var i in _pointers) {
      e.touches.push(_pointers[i]);
    }
    e.changedTouches = [e];
    handler(e);
  }
  function _onPointerStart(handler, e) {
    // IE10 specific: MsTouch needs preventDefault. See #2000
    if (e.MSPOINTER_TYPE_TOUCH && e.pointerType === e.MSPOINTER_TYPE_TOUCH) {
      preventDefault(e);
    }
    _handlePointer(handler, e);
  }

  /*
   * Extends the event handling code with double tap support for mobile browsers.
   *
   * Note: currently most browsers fire native dblclick, with only a few exceptions
   * (see https://github.com/Leaflet/Leaflet/issues/7012#issuecomment-595087386)
   */

  function makeDblclick(event) {
    // in modern browsers `type` cannot be just overridden:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Getter_only
    var newEvent = {},
      prop,
      i;
    for (i in event) {
      prop = event[i];
      newEvent[i] = prop && prop.bind ? prop.bind(event) : prop;
    }
    event = newEvent;
    newEvent.type = 'dblclick';
    newEvent.detail = 2;
    newEvent.isTrusted = false;
    newEvent._simulated = true; // for debug purposes
    return newEvent;
  }
  var delay = 200;
  function addDoubleTapListener(obj, handler) {
    // Most browsers handle double tap natively
    obj.addEventListener('dblclick', handler);

    // On some platforms the browser doesn't fire native dblclicks for touch events.
    // It seems that in all such cases `detail` property of `click` event is always `1`.
    // So here we rely on that fact to avoid excessive 'dblclick' simulation when not needed.
    var last = 0,
      detail;
    function simDblclick(e) {
      if (e.detail !== 1) {
        detail = e.detail; // keep in sync to avoid false dblclick in some cases
        return;
      }
      if (e.pointerType === 'mouse' || e.sourceCapabilities && !e.sourceCapabilities.firesTouchEvents) {
        return;
      }

      // When clicking on an <input>, the browser generates a click on its
      // <label> (and vice versa) triggering two clicks in quick succession.
      // This ignores clicks on elements which are a label with a 'for'
      // attribute (or children of such a label), but not children of
      // a <input>.
      var path = getPropagationPath(e);
      if (path.some(function (el) {
        return el instanceof HTMLLabelElement && el.attributes.for;
      }) && !path.some(function (el) {
        return el instanceof HTMLInputElement || el instanceof HTMLSelectElement;
      })) {
        return;
      }
      var now = Date.now();
      if (now - last <= delay) {
        detail++;
        if (detail === 2) {
          handler(makeDblclick(e));
        }
      } else {
        detail = 1;
      }
      last = now;
    }
    obj.addEventListener('click', simDblclick);
    return {
      dblclick: handler,
      simDblclick: simDblclick
    };
  }
  function removeDoubleTapListener(obj, handlers) {
    obj.removeEventListener('dblclick', handlers.dblclick);
    obj.removeEventListener('click', handlers.simDblclick);
  }

  /*
   * @namespace DomUtil
   *
   * Utility functions to work with the [DOM](https://developer.mozilla.org/docs/Web/API/Document_Object_Model)
   * tree, used by Leaflet internally.
   *
   * Most functions expecting or returning a `HTMLElement` also work for
   * SVG elements. The only difference is that classes refer to CSS classes
   * in HTML and SVG classes in SVG.
   */

  // @property TRANSFORM: String
  // Vendor-prefixed transform style name (e.g. `'webkitTransform'` for WebKit).
  var TRANSFORM = testProp(['transform', 'webkitTransform', 'OTransform', 'MozTransform', 'msTransform']);

  // webkitTransition comes first because some browser versions that drop vendor prefix don't do
  // the same for the transitionend event, in particular the Android 4.1 stock browser

  // @property TRANSITION: String
  // Vendor-prefixed transition style name.
  var TRANSITION = testProp(['webkitTransition', 'transition', 'OTransition', 'MozTransition', 'msTransition']);

  // @property TRANSITION_END: String
  // Vendor-prefixed transitionend event name.
  var TRANSITION_END = TRANSITION === 'webkitTransition' || TRANSITION === 'OTransition' ? TRANSITION + 'End' : 'transitionend';

  // @function get(id: String|HTMLElement): HTMLElement
  // Returns an element given its DOM id, or returns the element itself
  // if it was passed directly.
  function get(id) {
    return typeof id === 'string' ? document.getElementById(id) : id;
  }

  // @function getStyle(el: HTMLElement, styleAttrib: String): String
  // Returns the value for a certain style attribute on an element,
  // including computed values or values set through CSS.
  function getStyle(el, style) {
    var value = el.style[style] || el.currentStyle && el.currentStyle[style];
    if ((!value || value === 'auto') && document.defaultView) {
      var css = document.defaultView.getComputedStyle(el, null);
      value = css ? css[style] : null;
    }
    return value === 'auto' ? null : value;
  }

  // @function create(tagName: String, className?: String, container?: HTMLElement): HTMLElement
  // Creates an HTML element with `tagName`, sets its class to `className`, and optionally appends it to `container` element.
  function create$1(tagName, className, container) {
    var el = document.createElement(tagName);
    el.className = className || '';
    if (container) {
      container.appendChild(el);
    }
    return el;
  }

  // @function remove(el: HTMLElement)
  // Removes `el` from its parent element
  function remove(el) {
    var parent = el.parentNode;
    if (parent) {
      parent.removeChild(el);
    }
  }

  // @function empty(el: HTMLElement)
  // Removes all of `el`'s children elements from `el`
  function empty(el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  // @function toFront(el: HTMLElement)
  // Makes `el` the last child of its parent, so it renders in front of the other children.
  function toFront(el) {
    var parent = el.parentNode;
    if (parent && parent.lastChild !== el) {
      parent.appendChild(el);
    }
  }

  // @function toBack(el: HTMLElement)
  // Makes `el` the first child of its parent, so it renders behind the other children.
  function toBack(el) {
    var parent = el.parentNode;
    if (parent && parent.firstChild !== el) {
      parent.insertBefore(el, parent.firstChild);
    }
  }

  // @function hasClass(el: HTMLElement, name: String): Boolean
  // Returns `true` if the element's class attribute contains `name`.
  function hasClass(el, name) {
    if (el.classList !== undefined) {
      return el.classList.contains(name);
    }
    var className = getClass(el);
    return className.length > 0 && new RegExp('(^|\\s)' + name + '(\\s|$)').test(className);
  }

  // @function addClass(el: HTMLElement, name: String)
  // Adds `name` to the element's class attribute.
  function addClass(el, name) {
    if (el.classList !== undefined) {
      var classes = splitWords(name);
      for (var i = 0, len = classes.length; i < len; i++) {
        el.classList.add(classes[i]);
      }
    } else if (!hasClass(el, name)) {
      var className = getClass(el);
      setClass(el, (className ? className + ' ' : '') + name);
    }
  }

  // @function removeClass(el: HTMLElement, name: String)
  // Removes `name` from the element's class attribute.
  function removeClass(el, name) {
    if (el.classList !== undefined) {
      el.classList.remove(name);
    } else {
      setClass(el, trim((' ' + getClass(el) + ' ').replace(' ' + name + ' ', ' ')));
    }
  }

  // @function setClass(el: HTMLElement, name: String)
  // Sets the element's class.
  function setClass(el, name) {
    if (el.className.baseVal === undefined) {
      el.className = name;
    } else {
      // in case of SVG element
      el.className.baseVal = name;
    }
  }

  // @function getClass(el: HTMLElement): String
  // Returns the element's class.
  function getClass(el) {
    // Check if the element is an SVGElementInstance and use the correspondingElement instead
    // (Required for linked SVG elements in IE11.)
    if (el.correspondingElement) {
      el = el.correspondingElement;
    }
    return el.className.baseVal === undefined ? el.className : el.className.baseVal;
  }

  // @function setOpacity(el: HTMLElement, opacity: Number)
  // Set the opacity of an element (including old IE support).
  // `opacity` must be a number from `0` to `1`.
  function setOpacity(el, value) {
    if ('opacity' in el.style) {
      el.style.opacity = value;
    } else if ('filter' in el.style) {
      _setOpacityIE(el, value);
    }
  }
  function _setOpacityIE(el, value) {
    var filter = false,
      filterName = 'DXImageTransform.Microsoft.Alpha';

    // filters collection throws an error if we try to retrieve a filter that doesn't exist
    try {
      filter = el.filters.item(filterName);
    } catch (e) {
      // don't set opacity to 1 if we haven't already set an opacity,
      // it isn't needed and breaks transparent pngs.
      if (value === 1) {
        return;
      }
    }
    value = Math.round(value * 100);
    if (filter) {
      filter.Enabled = value !== 100;
      filter.Opacity = value;
    } else {
      el.style.filter += ' progid:' + filterName + '(opacity=' + value + ')';
    }
  }

  // @function testProp(props: String[]): String|false
  // Goes through the array of style names and returns the first name
  // that is a valid style name for an element. If no such name is found,
  // it returns false. Useful for vendor-prefixed styles like `transform`.
  function testProp(props) {
    var style = document.documentElement.style;
    for (var i = 0; i < props.length; i++) {
      if (props[i] in style) {
        return props[i];
      }
    }
    return false;
  }

  // @function setTransform(el: HTMLElement, offset: Point, scale?: Number)
  // Resets the 3D CSS transform of `el` so it is translated by `offset` pixels
  // and optionally scaled by `scale`. Does not have an effect if the
  // browser doesn't support 3D CSS transforms.
  function setTransform(el, offset, scale) {
    var pos = offset || new Point(0, 0);
    el.style[TRANSFORM] = (Browser.ie3d ? 'translate(' + pos.x + 'px,' + pos.y + 'px)' : 'translate3d(' + pos.x + 'px,' + pos.y + 'px,0)') + (scale ? ' scale(' + scale + ')' : '');
  }

  // @function setPosition(el: HTMLElement, position: Point)
  // Sets the position of `el` to coordinates specified by `position`,
  // using CSS translate or top/left positioning depending on the browser
  // (used by Leaflet internally to position its layers).
  function setPosition(el, point) {
    /*eslint-disable */
    el._leaflet_pos = point;
    /* eslint-enable */

    if (Browser.any3d) {
      setTransform(el, point);
    } else {
      el.style.left = point.x + 'px';
      el.style.top = point.y + 'px';
    }
  }

  // @function getPosition(el: HTMLElement): Point
  // Returns the coordinates of an element previously positioned with setPosition.
  function getPosition(el) {
    // this method is only used for elements previously positioned using setPosition,
    // so it's safe to cache the position for performance

    return el._leaflet_pos || new Point(0, 0);
  }

  // @function disableTextSelection()
  // Prevents the user from generating `selectstart` DOM events, usually generated
  // when the user drags the mouse through a page with text. Used internally
  // by Leaflet to override the behaviour of any click-and-drag interaction on
  // the map. Affects drag interactions on the whole document.

  // @function enableTextSelection()
  // Cancels the effects of a previous [`L.DomUtil.disableTextSelection`](#domutil-disabletextselection).
  var disableTextSelection;
  var enableTextSelection;
  var _userSelect;
  if ('onselectstart' in document) {
    disableTextSelection = function () {
      on(window, 'selectstart', preventDefault);
    };
    enableTextSelection = function () {
      off(window, 'selectstart', preventDefault);
    };
  } else {
    var userSelectProperty = testProp(['userSelect', 'WebkitUserSelect', 'OUserSelect', 'MozUserSelect', 'msUserSelect']);
    disableTextSelection = function () {
      if (userSelectProperty) {
        var style = document.documentElement.style;
        _userSelect = style[userSelectProperty];
        style[userSelectProperty] = 'none';
      }
    };
    enableTextSelection = function () {
      if (userSelectProperty) {
        document.documentElement.style[userSelectProperty] = _userSelect;
        _userSelect = undefined;
      }
    };
  }

  // @function disableImageDrag()
  // As [`L.DomUtil.disableTextSelection`](#domutil-disabletextselection), but
  // for `dragstart` DOM events, usually generated when the user drags an image.
  function disableImageDrag() {
    on(window, 'dragstart', preventDefault);
  }

  // @function enableImageDrag()
  // Cancels the effects of a previous [`L.DomUtil.disableImageDrag`](#domutil-disabletextselection).
  function enableImageDrag() {
    off(window, 'dragstart', preventDefault);
  }
  var _outlineElement, _outlineStyle;
  // @function preventOutline(el: HTMLElement)
  // Makes the [outline](https://developer.mozilla.org/docs/Web/CSS/outline)
  // of the element `el` invisible. Used internally by Leaflet to prevent
  // focusable elements from displaying an outline when the user performs a
  // drag interaction on them.
  function preventOutline(element) {
    while (element.tabIndex === -1) {
      element = element.parentNode;
    }
    if (!element.style) {
      return;
    }
    restoreOutline();
    _outlineElement = element;
    _outlineStyle = element.style.outlineStyle;
    element.style.outlineStyle = 'none';
    on(window, 'keydown', restoreOutline);
  }

  // @function restoreOutline()
  // Cancels the effects of a previous [`L.DomUtil.preventOutline`]().
  function restoreOutline() {
    if (!_outlineElement) {
      return;
    }
    _outlineElement.style.outlineStyle = _outlineStyle;
    _outlineElement = undefined;
    _outlineStyle = undefined;
    off(window, 'keydown', restoreOutline);
  }

  // @function getSizedParentNode(el: HTMLElement): HTMLElement
  // Finds the closest parent node which size (width and height) is not null.
  function getSizedParentNode(element) {
    do {
      element = element.parentNode;
    } while ((!element.offsetWidth || !element.offsetHeight) && element !== document.body);
    return element;
  }

  // @function getScale(el: HTMLElement): Object
  // Computes the CSS scale currently applied on the element.
  // Returns an object with `x` and `y` members as horizontal and vertical scales respectively,
  // and `boundingClientRect` as the result of [`getBoundingClientRect()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect).
  function getScale(element) {
    var rect = element.getBoundingClientRect(); // Read-only in old browsers.

    return {
      x: rect.width / element.offsetWidth || 1,
      y: rect.height / element.offsetHeight || 1,
      boundingClientRect: rect
    };
  }
  var DomUtil = {
    __proto__: null,
    TRANSFORM: TRANSFORM,
    TRANSITION: TRANSITION,
    TRANSITION_END: TRANSITION_END,
    get: get,
    getStyle: getStyle,
    create: create$1,
    remove: remove,
    empty: empty,
    toFront: toFront,
    toBack: toBack,
    hasClass: hasClass,
    addClass: addClass,
    removeClass: removeClass,
    setClass: setClass,
    getClass: getClass,
    setOpacity: setOpacity,
    testProp: testProp,
    setTransform: setTransform,
    setPosition: setPosition,
    getPosition: getPosition,
    get disableTextSelection() {
      return disableTextSelection;
    },
    get enableTextSelection() {
      return enableTextSelection;
    },
    disableImageDrag: disableImageDrag,
    enableImageDrag: enableImageDrag,
    preventOutline: preventOutline,
    restoreOutline: restoreOutline,
    getSizedParentNode: getSizedParentNode,
    getScale: getScale
  };

  /*
   * @namespace DomEvent
   * Utility functions to work with the [DOM events](https://developer.mozilla.org/docs/Web/API/Event), used by Leaflet internally.
   */

  // Inspired by John Resig, Dean Edwards and YUI addEvent implementations.

  // @function on(el: HTMLElement, types: String, fn: Function, context?: Object): this
  // Adds a listener function (`fn`) to a particular DOM event type of the
  // element `el`. You can optionally specify the context of the listener
  // (object the `this` keyword will point to). You can also pass several
  // space-separated types (e.g. `'click dblclick'`).

  // @alternative
  // @function on(el: HTMLElement, eventMap: Object, context?: Object): this
  // Adds a set of type/listener pairs, e.g. `{click: onClick, mousemove: onMouseMove}`
  function on(obj, types, fn, context) {
    if (types && typeof types === 'object') {
      for (var type in types) {
        addOne(obj, type, types[type], fn);
      }
    } else {
      types = splitWords(types);
      for (var i = 0, len = types.length; i < len; i++) {
        addOne(obj, types[i], fn, context);
      }
    }
    return this;
  }
  var eventsKey = '_leaflet_events';

  // @function off(el: HTMLElement, types: String, fn: Function, context?: Object): this
  // Removes a previously added listener function.
  // Note that if you passed a custom context to on, you must pass the same
  // context to `off` in order to remove the listener.

  // @alternative
  // @function off(el: HTMLElement, eventMap: Object, context?: Object): this
  // Removes a set of type/listener pairs, e.g. `{click: onClick, mousemove: onMouseMove}`

  // @alternative
  // @function off(el: HTMLElement, types: String): this
  // Removes all previously added listeners of given types.

  // @alternative
  // @function off(el: HTMLElement): this
  // Removes all previously added listeners from given HTMLElement
  function off(obj, types, fn, context) {
    if (arguments.length === 1) {
      batchRemove(obj);
      delete obj[eventsKey];
    } else if (types && typeof types === 'object') {
      for (var type in types) {
        removeOne(obj, type, types[type], fn);
      }
    } else {
      types = splitWords(types);
      if (arguments.length === 2) {
        batchRemove(obj, function (type) {
          return indexOf(types, type) !== -1;
        });
      } else {
        for (var i = 0, len = types.length; i < len; i++) {
          removeOne(obj, types[i], fn, context);
        }
      }
    }
    return this;
  }
  function batchRemove(obj, filterFn) {
    for (var id in obj[eventsKey]) {
      var type = id.split(/\d/)[0];
      if (!filterFn || filterFn(type)) {
        removeOne(obj, type, null, null, id);
      }
    }
  }
  var mouseSubst = {
    mouseenter: 'mouseover',
    mouseleave: 'mouseout',
    wheel: !('onwheel' in window) && 'mousewheel'
  };
  function addOne(obj, type, fn, context) {
    var id = type + stamp(fn) + (context ? '_' + stamp(context) : '');
    if (obj[eventsKey] && obj[eventsKey][id]) {
      return this;
    }
    var handler = function (e) {
      return fn.call(context || obj, e || window.event);
    };
    var originalHandler = handler;
    if (!Browser.touchNative && Browser.pointer && type.indexOf('touch') === 0) {
      // Needs DomEvent.Pointer.js
      handler = addPointerListener(obj, type, handler);
    } else if (Browser.touch && type === 'dblclick') {
      handler = addDoubleTapListener(obj, handler);
    } else if ('addEventListener' in obj) {
      if (type === 'touchstart' || type === 'touchmove' || type === 'wheel' || type === 'mousewheel') {
        obj.addEventListener(mouseSubst[type] || type, handler, Browser.passiveEvents ? {
          passive: false
        } : false);
      } else if (type === 'mouseenter' || type === 'mouseleave') {
        handler = function (e) {
          e = e || window.event;
          if (isExternalTarget(obj, e)) {
            originalHandler(e);
          }
        };
        obj.addEventListener(mouseSubst[type], handler, false);
      } else {
        obj.addEventListener(type, originalHandler, false);
      }
    } else {
      obj.attachEvent('on' + type, handler);
    }
    obj[eventsKey] = obj[eventsKey] || {};
    obj[eventsKey][id] = handler;
  }
  function removeOne(obj, type, fn, context, id) {
    id = id || type + stamp(fn) + (context ? '_' + stamp(context) : '');
    var handler = obj[eventsKey] && obj[eventsKey][id];
    if (!handler) {
      return this;
    }
    if (!Browser.touchNative && Browser.pointer && type.indexOf('touch') === 0) {
      removePointerListener(obj, type, handler);
    } else if (Browser.touch && type === 'dblclick') {
      removeDoubleTapListener(obj, handler);
    } else if ('removeEventListener' in obj) {
      obj.removeEventListener(mouseSubst[type] || type, handler, false);
    } else {
      obj.detachEvent('on' + type, handler);
    }
    obj[eventsKey][id] = null;
  }

  // @function stopPropagation(ev: DOMEvent): this
  // Stop the given event from propagation to parent elements. Used inside the listener functions:
  // ```js
  // L.DomEvent.on(div, 'click', function (ev) {
  // 	L.DomEvent.stopPropagation(ev);
  // });
  // ```
  function stopPropagation(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    } else if (e.originalEvent) {
      // In case of Leaflet event.
      e.originalEvent._stopped = true;
    } else {
      e.cancelBubble = true;
    }
    return this;
  }

  // @function disableScrollPropagation(el: HTMLElement): this
  // Adds `stopPropagation` to the element's `'wheel'` events (plus browser variants).
  function disableScrollPropagation(el) {
    addOne(el, 'wheel', stopPropagation);
    return this;
  }

  // @function disableClickPropagation(el: HTMLElement): this
  // Adds `stopPropagation` to the element's `'click'`, `'dblclick'`, `'contextmenu'`,
  // `'mousedown'` and `'touchstart'` events (plus browser variants).
  function disableClickPropagation(el) {
    on(el, 'mousedown touchstart dblclick contextmenu', stopPropagation);
    el['_leaflet_disable_click'] = true;
    return this;
  }

  // @function preventDefault(ev: DOMEvent): this
  // Prevents the default action of the DOM Event `ev` from happening (such as
  // following a link in the href of the a element, or doing a POST request
  // with page reload when a `<form>` is submitted).
  // Use it inside listener functions.
  function preventDefault(e) {
    if (e.preventDefault) {
      e.preventDefault();
    } else {
      e.returnValue = false;
    }
    return this;
  }

  // @function stop(ev: DOMEvent): this
  // Does `stopPropagation` and `preventDefault` at the same time.
  function stop(e) {
    preventDefault(e);
    stopPropagation(e);
    return this;
  }

  // @function getPropagationPath(ev: DOMEvent): Array
  // Compatibility polyfill for [`Event.composedPath()`](https://developer.mozilla.org/en-US/docs/Web/API/Event/composedPath).
  // Returns an array containing the `HTMLElement`s that the given DOM event
  // should propagate to (if not stopped).
  function getPropagationPath(ev) {
    if (ev.composedPath) {
      return ev.composedPath();
    }
    var path = [];
    var el = ev.target;
    while (el) {
      path.push(el);
      el = el.parentNode;
    }
    return path;
  }

  // @function getMousePosition(ev: DOMEvent, container?: HTMLElement): Point
  // Gets normalized mouse position from a DOM event relative to the
  // `container` (border excluded) or to the whole page if not specified.
  function getMousePosition(e, container) {
    if (!container) {
      return new Point(e.clientX, e.clientY);
    }
    var scale = getScale(container),
      offset = scale.boundingClientRect; // left and top  values are in page scale (like the event clientX/Y)

    return new Point(
    // offset.left/top values are in page scale (like clientX/Y),
    // whereas clientLeft/Top (border width) values are the original values (before CSS scale applies).
    (e.clientX - offset.left) / scale.x - container.clientLeft, (e.clientY - offset.top) / scale.y - container.clientTop);
  }

  //  except , Safari and
  // We need double the scroll pixels (see #7403 and #4538) for all Browsers
  // except OSX (Mac) -> 3x, Chrome running on Linux 1x

  var wheelPxFactor = Browser.linux && Browser.chrome ? window.devicePixelRatio : Browser.mac ? window.devicePixelRatio * 3 : window.devicePixelRatio > 0 ? 2 * window.devicePixelRatio : 1;
  // @function getWheelDelta(ev: DOMEvent): Number
  // Gets normalized wheel delta from a wheel DOM event, in vertical
  // pixels scrolled (negative if scrolling down).
  // Events from pointing devices without precise scrolling are mapped to
  // a best guess of 60 pixels.
  function getWheelDelta(e) {
    return Browser.edge ? e.wheelDeltaY / 2 :
    // Don't trust window-geometry-based delta
    e.deltaY && e.deltaMode === 0 ? -e.deltaY / wheelPxFactor :
    // Pixels
    e.deltaY && e.deltaMode === 1 ? -e.deltaY * 20 :
    // Lines
    e.deltaY && e.deltaMode === 2 ? -e.deltaY * 60 :
    // Pages
    e.deltaX || e.deltaZ ? 0 :
    // Skip horizontal/depth wheel events
    e.wheelDelta ? (e.wheelDeltaY || e.wheelDelta) / 2 :
    // Legacy IE pixels
    e.detail && Math.abs(e.detail) < 32765 ? -e.detail * 20 :
    // Legacy Moz lines
    e.detail ? e.detail / -32765 * 60 :
    // Legacy Moz pages
    0;
  }

  // check if element really left/entered the event target (for mouseenter/mouseleave)
  function isExternalTarget(el, e) {
    var related = e.relatedTarget;
    if (!related) {
      return true;
    }
    try {
      while (related && related !== el) {
        related = related.parentNode;
      }
    } catch (err) {
      return false;
    }
    return related !== el;
  }
  var DomEvent = {
    __proto__: null,
    on: on,
    off: off,
    stopPropagation: stopPropagation,
    disableScrollPropagation: disableScrollPropagation,
    disableClickPropagation: disableClickPropagation,
    preventDefault: preventDefault,
    stop: stop,
    getPropagationPath: getPropagationPath,
    getMousePosition: getMousePosition,
    getWheelDelta: getWheelDelta,
    isExternalTarget: isExternalTarget,
    addListener: on,
    removeListener: off
  };

  /*
   * @class PosAnimation
   * @aka L.PosAnimation
   * @inherits Evented
   * Used internally for panning animations, utilizing CSS3 Transitions for modern browsers and a timer fallback for IE6-9.
   *
   * @example
   * ```js
   * var myPositionMarker = L.marker([48.864716, 2.294694]).addTo(map);
   *
   * myPositionMarker.on("click", function() {
   * 	var pos = map.latLngToLayerPoint(myPositionMarker.getLatLng());
   * 	pos.y -= 25;
   * 	var fx = new L.PosAnimation();
   *
   * 	fx.once('end',function() {
   * 		pos.y += 25;
   * 		fx.run(myPositionMarker._icon, pos, 0.8);
   * 	});
   *
   * 	fx.run(myPositionMarker._icon, pos, 0.3);
   * });
   *
   * ```
   *
   * @constructor L.PosAnimation()
   * Creates a `PosAnimation` object.
   *
   */

  var PosAnimation = Evented.extend({
    // @method run(el: HTMLElement, newPos: Point, duration?: Number, easeLinearity?: Number)
    // Run an animation of a given element to a new position, optionally setting
    // duration in seconds (`0.25` by default) and easing linearity factor (3rd
    // argument of the [cubic bezier curve](https://cubic-bezier.com/#0,0,.5,1),
    // `0.5` by default).
    run: function (el, newPos, duration, easeLinearity) {
      this.stop();
      this._el = el;
      this._inProgress = true;
      this._duration = duration || 0.25;
      this._easeOutPower = 1 / Math.max(easeLinearity || 0.5, 0.2);
      this._startPos = getPosition(el);
      this._offset = newPos.subtract(this._startPos);
      this._startTime = +new Date();

      // @event start: Event
      // Fired when the animation starts
      this.fire('start');
      this._animate();
    },
    // @method stop()
    // Stops the animation (if currently running).
    stop: function () {
      if (!this._inProgress) {
        return;
      }
      this._step(true);
      this._complete();
    },
    _animate: function () {
      // animation loop
      this._animId = requestAnimFrame(this._animate, this);
      this._step();
    },
    _step: function (round) {
      var elapsed = +new Date() - this._startTime,
        duration = this._duration * 1000;
      if (elapsed < duration) {
        this._runFrame(this._easeOut(elapsed / duration), round);
      } else {
        this._runFrame(1);
        this._complete();
      }
    },
    _runFrame: function (progress, round) {
      var pos = this._startPos.add(this._offset.multiplyBy(progress));
      if (round) {
        pos._round();
      }
      setPosition(this._el, pos);

      // @event step: Event
      // Fired continuously during the animation.
      this.fire('step');
    },
    _complete: function () {
      cancelAnimFrame(this._animId);
      this._inProgress = false;
      // @event end: Event
      // Fired when the animation ends.
      this.fire('end');
    },
    _easeOut: function (t) {
      return 1 - Math.pow(1 - t, this._easeOutPower);
    }
  });

  /*
   * @class Map
   * @aka L.Map
   * @inherits Evented
   *
   * The central class of the API — it is used to create a map on a page and manipulate it.
   *
   * @example
   *
   * ```js
   * // initialize the map on the "map" div with a given center and zoom
   * var map = L.map('map', {
   * 	center: [51.505, -0.09],
   * 	zoom: 13
   * });
   * ```
   *
   */

  var Map = Evented.extend({
    options: {
      // @section Map State Options
      // @option crs: CRS = L.CRS.EPSG3857
      // The [Coordinate Reference System](#crs) to use. Don't change this if you're not
      // sure what it means.
      crs: EPSG3857,
      // @option center: LatLng = undefined
      // Initial geographic center of the map
      center: undefined,
      // @option zoom: Number = undefined
      // Initial map zoom level
      zoom: undefined,
      // @option minZoom: Number = *
      // Minimum zoom level of the map.
      // If not specified and at least one `GridLayer` or `TileLayer` is in the map,
      // the lowest of their `minZoom` options will be used instead.
      minZoom: undefined,
      // @option maxZoom: Number = *
      // Maximum zoom level of the map.
      // If not specified and at least one `GridLayer` or `TileLayer` is in the map,
      // the highest of their `maxZoom` options will be used instead.
      maxZoom: undefined,
      // @option layers: Layer[] = []
      // Array of layers that will be added to the map initially
      layers: [],
      // @option maxBounds: LatLngBounds = null
      // When this option is set, the map restricts the view to the given
      // geographical bounds, bouncing the user back if the user tries to pan
      // outside the view. To set the restriction dynamically, use
      // [`setMaxBounds`](#map-setmaxbounds) method.
      maxBounds: undefined,
      // @option renderer: Renderer = *
      // The default method for drawing vector layers on the map. `L.SVG`
      // or `L.Canvas` by default depending on browser support.
      renderer: undefined,
      // @section Animation Options
      // @option zoomAnimation: Boolean = true
      // Whether the map zoom animation is enabled. By default it's enabled
      // in all browsers that support CSS3 Transitions except Android.
      zoomAnimation: true,
      // @option zoomAnimationThreshold: Number = 4
      // Won't animate zoom if the zoom difference exceeds this value.
      zoomAnimationThreshold: 4,
      // @option fadeAnimation: Boolean = true
      // Whether the tile fade animation is enabled. By default it's enabled
      // in all browsers that support CSS3 Transitions except Android.
      fadeAnimation: true,
      // @option markerZoomAnimation: Boolean = true
      // Whether markers animate their zoom with the zoom animation, if disabled
      // they will disappear for the length of the animation. By default it's
      // enabled in all browsers that support CSS3 Transitions except Android.
      markerZoomAnimation: true,
      // @option transform3DLimit: Number = 2^23
      // Defines the maximum size of a CSS translation transform. The default
      // value should not be changed unless a web browser positions layers in
      // the wrong place after doing a large `panBy`.
      transform3DLimit: 8388608,
      // Precision limit of a 32-bit float

      // @section Interaction Options
      // @option zoomSnap: Number = 1
      // Forces the map's zoom level to always be a multiple of this, particularly
      // right after a [`fitBounds()`](#map-fitbounds) or a pinch-zoom.
      // By default, the zoom level snaps to the nearest integer; lower values
      // (e.g. `0.5` or `0.1`) allow for greater granularity. A value of `0`
      // means the zoom level will not be snapped after `fitBounds` or a pinch-zoom.
      zoomSnap: 1,
      // @option zoomDelta: Number = 1
      // Controls how much the map's zoom level will change after a
      // [`zoomIn()`](#map-zoomin), [`zoomOut()`](#map-zoomout), pressing `+`
      // or `-` on the keyboard, or using the [zoom controls](#control-zoom).
      // Values smaller than `1` (e.g. `0.5`) allow for greater granularity.
      zoomDelta: 1,
      // @option trackResize: Boolean = true
      // Whether the map automatically handles browser window resize to update itself.
      trackResize: true
    },
    initialize: function (id, options) {
      // (HTMLElement or String, Object)
      options = setOptions(this, options);

      // Make sure to assign internal flags at the beginning,
      // to avoid inconsistent state in some edge cases.
      this._handlers = [];
      this._layers = {};
      this._zoomBoundLayers = {};
      this._sizeChanged = true;
      this._initContainer(id);
      this._initLayout();

      // hack for https://github.com/Leaflet/Leaflet/issues/1980
      this._onResize = bind(this._onResize, this);
      this._initEvents();
      if (options.maxBounds) {
        this.setMaxBounds(options.maxBounds);
      }
      if (options.zoom !== undefined) {
        this._zoom = this._limitZoom(options.zoom);
      }
      if (options.center && options.zoom !== undefined) {
        this.setView(toLatLng(options.center), options.zoom, {
          reset: true
        });
      }
      this.callInitHooks();

      // don't animate on browsers without hardware-accelerated transitions or old Android/Opera
      this._zoomAnimated = TRANSITION && Browser.any3d && !Browser.mobileOpera && this.options.zoomAnimation;

      // zoom transitions run with the same duration for all layers, so if one of transitionend events
      // happens after starting zoom animation (propagating to the map pane), we know that it ended globally
      if (this._zoomAnimated) {
        this._createAnimProxy();
        on(this._proxy, TRANSITION_END, this._catchTransitionEnd, this);
      }
      this._addLayers(this.options.layers);
    },
    // @section Methods for modifying map state

    // @method setView(center: LatLng, zoom: Number, options?: Zoom/pan options): this
    // Sets the view of the map (geographical center and zoom) with the given
    // animation options.
    setView: function (center, zoom, options) {
      zoom = zoom === undefined ? this._zoom : this._limitZoom(zoom);
      center = this._limitCenter(toLatLng(center), zoom, this.options.maxBounds);
      options = options || {};
      this._stop();
      if (this._loaded && !options.reset && options !== true) {
        if (options.animate !== undefined) {
          options.zoom = extend({
            animate: options.animate
          }, options.zoom);
          options.pan = extend({
            animate: options.animate,
            duration: options.duration
          }, options.pan);
        }

        // try animating pan or zoom
        var moved = this._zoom !== zoom ? this._tryAnimatedZoom && this._tryAnimatedZoom(center, zoom, options.zoom) : this._tryAnimatedPan(center, options.pan);
        if (moved) {
          // prevent resize handler call, the view will refresh after animation anyway
          clearTimeout(this._sizeTimer);
          return this;
        }
      }

      // animation didn't start, just reset the map view
      this._resetView(center, zoom, options.pan && options.pan.noMoveStart);
      return this;
    },
    // @method setZoom(zoom: Number, options?: Zoom/pan options): this
    // Sets the zoom of the map.
    setZoom: function (zoom, options) {
      if (!this._loaded) {
        this._zoom = zoom;
        return this;
      }
      return this.setView(this.getCenter(), zoom, {
        zoom: options
      });
    },
    // @method zoomIn(delta?: Number, options?: Zoom options): this
    // Increases the zoom of the map by `delta` ([`zoomDelta`](#map-zoomdelta) by default).
    zoomIn: function (delta, options) {
      delta = delta || (Browser.any3d ? this.options.zoomDelta : 1);
      return this.setZoom(this._zoom + delta, options);
    },
    // @method zoomOut(delta?: Number, options?: Zoom options): this
    // Decreases the zoom of the map by `delta` ([`zoomDelta`](#map-zoomdelta) by default).
    zoomOut: function (delta, options) {
      delta = delta || (Browser.any3d ? this.options.zoomDelta : 1);
      return this.setZoom(this._zoom - delta, options);
    },
    // @method setZoomAround(latlng: LatLng, zoom: Number, options: Zoom options): this
    // Zooms the map while keeping a specified geographical point on the map
    // stationary (e.g. used internally for scroll zoom and double-click zoom).
    // @alternative
    // @method setZoomAround(offset: Point, zoom: Number, options: Zoom options): this
    // Zooms the map while keeping a specified pixel on the map (relative to the top-left corner) stationary.
    setZoomAround: function (latlng, zoom, options) {
      var scale = this.getZoomScale(zoom),
        viewHalf = this.getSize().divideBy(2),
        containerPoint = latlng instanceof Point ? latlng : this.latLngToContainerPoint(latlng),
        centerOffset = containerPoint.subtract(viewHalf).multiplyBy(1 - 1 / scale),
        newCenter = this.containerPointToLatLng(viewHalf.add(centerOffset));
      return this.setView(newCenter, zoom, {
        zoom: options
      });
    },
    _getBoundsCenterZoom: function (bounds, options) {
      options = options || {};
      bounds = bounds.getBounds ? bounds.getBounds() : toLatLngBounds(bounds);
      var paddingTL = toPoint(options.paddingTopLeft || options.padding || [0, 0]),
        paddingBR = toPoint(options.paddingBottomRight || options.padding || [0, 0]),
        zoom = this.getBoundsZoom(bounds, false, paddingTL.add(paddingBR));
      zoom = typeof options.maxZoom === 'number' ? Math.min(options.maxZoom, zoom) : zoom;
      if (zoom === Infinity) {
        return {
          center: bounds.getCenter(),
          zoom: zoom
        };
      }
      var paddingOffset = paddingBR.subtract(paddingTL).divideBy(2),
        swPoint = this.project(bounds.getSouthWest(), zoom),
        nePoint = this.project(bounds.getNorthEast(), zoom),
        center = this.unproject(swPoint.add(nePoint).divideBy(2).add(paddingOffset), zoom);
      return {
        center: center,
        zoom: zoom
      };
    },
    // @method fitBounds(bounds: LatLngBounds, options?: fitBounds options): this
    // Sets a map view that contains the given geographical bounds with the
    // maximum zoom level possible.
    fitBounds: function (bounds, options) {
      bounds = toLatLngBounds(bounds);
      if (!bounds.isValid()) {
        throw new Error('Bounds are not valid.');
      }
      var target = this._getBoundsCenterZoom(bounds, options);
      return this.setView(target.center, target.zoom, options);
    },
    // @method fitWorld(options?: fitBounds options): this
    // Sets a map view that mostly contains the whole world with the maximum
    // zoom level possible.
    fitWorld: function (options) {
      return this.fitBounds([[-90, -180], [90, 180]], options);
    },
    // @method panTo(latlng: LatLng, options?: Pan options): this
    // Pans the map to a given center.
    panTo: function (center, options) {
      // (LatLng)
      return this.setView(center, this._zoom, {
        pan: options
      });
    },
    // @method panBy(offset: Point, options?: Pan options): this
    // Pans the map by a given number of pixels (animated).
    panBy: function (offset, options) {
      offset = toPoint(offset).round();
      options = options || {};
      if (!offset.x && !offset.y) {
        return this.fire('moveend');
      }
      // If we pan too far, Chrome gets issues with tiles
      // and makes them disappear or appear in the wrong place (slightly offset) #2602
      if (options.animate !== true && !this.getSize().contains(offset)) {
        this._resetView(this.unproject(this.project(this.getCenter()).add(offset)), this.getZoom());
        return this;
      }
      if (!this._panAnim) {
        this._panAnim = new PosAnimation();
        this._panAnim.on({
          'step': this._onPanTransitionStep,
          'end': this._onPanTransitionEnd
        }, this);
      }

      // don't fire movestart if animating inertia
      if (!options.noMoveStart) {
        this.fire('movestart');
      }

      // animate pan unless animate: false specified
      if (options.animate !== false) {
        addClass(this._mapPane, 'leaflet-pan-anim');
        var newPos = this._getMapPanePos().subtract(offset).round();
        this._panAnim.run(this._mapPane, newPos, options.duration || 0.25, options.easeLinearity);
      } else {
        this._rawPanBy(offset);
        this.fire('move').fire('moveend');
      }
      return this;
    },
    // @method flyTo(latlng: LatLng, zoom?: Number, options?: Zoom/pan options): this
    // Sets the view of the map (geographical center and zoom) performing a smooth
    // pan-zoom animation.
    flyTo: function (targetCenter, targetZoom, options) {
      options = options || {};
      if (options.animate === false || !Browser.any3d) {
        return this.setView(targetCenter, targetZoom, options);
      }
      this._stop();
      var from = this.project(this.getCenter()),
        to = this.project(targetCenter),
        size = this.getSize(),
        startZoom = this._zoom;
      targetCenter = toLatLng(targetCenter);
      targetZoom = targetZoom === undefined ? startZoom : targetZoom;
      var w0 = Math.max(size.x, size.y),
        w1 = w0 * this.getZoomScale(startZoom, targetZoom),
        u1 = to.distanceTo(from) || 1,
        rho = 1.42,
        rho2 = rho * rho;
      function r(i) {
        var s1 = i ? -1 : 1,
          s2 = i ? w1 : w0,
          t1 = w1 * w1 - w0 * w0 + s1 * rho2 * rho2 * u1 * u1,
          b1 = 2 * s2 * rho2 * u1,
          b = t1 / b1,
          sq = Math.sqrt(b * b + 1) - b;

        // workaround for floating point precision bug when sq = 0, log = -Infinite,
        // thus triggering an infinite loop in flyTo
        var log = sq < 0.000000001 ? -18 : Math.log(sq);
        return log;
      }
      function sinh(n) {
        return (Math.exp(n) - Math.exp(-n)) / 2;
      }
      function cosh(n) {
        return (Math.exp(n) + Math.exp(-n)) / 2;
      }
      function tanh(n) {
        return sinh(n) / cosh(n);
      }
      var r0 = r(0);
      function w(s) {
        return w0 * (cosh(r0) / cosh(r0 + rho * s));
      }
      function u(s) {
        return w0 * (cosh(r0) * tanh(r0 + rho * s) - sinh(r0)) / rho2;
      }
      function easeOut(t) {
        return 1 - Math.pow(1 - t, 1.5);
      }
      var start = Date.now(),
        S = (r(1) - r0) / rho,
        duration = options.duration ? 1000 * options.duration : 1000 * S * 0.8;
      function frame() {
        var t = (Date.now() - start) / duration,
          s = easeOut(t) * S;
        if (t <= 1) {
          this._flyToFrame = requestAnimFrame(frame, this);
          this._move(this.unproject(from.add(to.subtract(from).multiplyBy(u(s) / u1)), startZoom), this.getScaleZoom(w0 / w(s), startZoom), {
            flyTo: true
          });
        } else {
          this._move(targetCenter, targetZoom)._moveEnd(true);
        }
      }
      this._moveStart(true, options.noMoveStart);
      frame.call(this);
      return this;
    },
    // @method flyToBounds(bounds: LatLngBounds, options?: fitBounds options): this
    // Sets the view of the map with a smooth animation like [`flyTo`](#map-flyto),
    // but takes a bounds parameter like [`fitBounds`](#map-fitbounds).
    flyToBounds: function (bounds, options) {
      var target = this._getBoundsCenterZoom(bounds, options);
      return this.flyTo(target.center, target.zoom, options);
    },
    // @method setMaxBounds(bounds: LatLngBounds): this
    // Restricts the map view to the given bounds (see the [maxBounds](#map-maxbounds) option).
    setMaxBounds: function (bounds) {
      bounds = toLatLngBounds(bounds);
      if (this.listens('moveend', this._panInsideMaxBounds)) {
        this.off('moveend', this._panInsideMaxBounds);
      }
      if (!bounds.isValid()) {
        this.options.maxBounds = null;
        return this;
      }
      this.options.maxBounds = bounds;
      if (this._loaded) {
        this._panInsideMaxBounds();
      }
      return this.on('moveend', this._panInsideMaxBounds);
    },
    // @method setMinZoom(zoom: Number): this
    // Sets the lower limit for the available zoom levels (see the [minZoom](#map-minzoom) option).
    setMinZoom: function (zoom) {
      var oldZoom = this.options.minZoom;
      this.options.minZoom = zoom;
      if (this._loaded && oldZoom !== zoom) {
        this.fire('zoomlevelschange');
        if (this.getZoom() < this.options.minZoom) {
          return this.setZoom(zoom);
        }
      }
      return this;
    },
    // @method setMaxZoom(zoom: Number): this
    // Sets the upper limit for the available zoom levels (see the [maxZoom](#map-maxzoom) option).
    setMaxZoom: function (zoom) {
      var oldZoom = this.options.maxZoom;
      this.options.maxZoom = zoom;
      if (this._loaded && oldZoom !== zoom) {
        this.fire('zoomlevelschange');
        if (this.getZoom() > this.options.maxZoom) {
          return this.setZoom(zoom);
        }
      }
      return this;
    },
    // @method panInsideBounds(bounds: LatLngBounds, options?: Pan options): this
    // Pans the map to the closest view that would lie inside the given bounds (if it's not already), controlling the animation using the options specific, if any.
    panInsideBounds: function (bounds, options) {
      this._enforcingBounds = true;
      var center = this.getCenter(),
        newCenter = this._limitCenter(center, this._zoom, toLatLngBounds(bounds));
      if (!center.equals(newCenter)) {
        this.panTo(newCenter, options);
      }
      this._enforcingBounds = false;
      return this;
    },
    // @method panInside(latlng: LatLng, options?: padding options): this
    // Pans the map the minimum amount to make the `latlng` visible. Use
    // padding options to fit the display to more restricted bounds.
    // If `latlng` is already within the (optionally padded) display bounds,
    // the map will not be panned.
    panInside: function (latlng, options) {
      options = options || {};
      var paddingTL = toPoint(options.paddingTopLeft || options.padding || [0, 0]),
        paddingBR = toPoint(options.paddingBottomRight || options.padding || [0, 0]),
        pixelCenter = this.project(this.getCenter()),
        pixelPoint = this.project(latlng),
        pixelBounds = this.getPixelBounds(),
        paddedBounds = toBounds([pixelBounds.min.add(paddingTL), pixelBounds.max.subtract(paddingBR)]),
        paddedSize = paddedBounds.getSize();
      if (!paddedBounds.contains(pixelPoint)) {
        this._enforcingBounds = true;
        var centerOffset = pixelPoint.subtract(paddedBounds.getCenter());
        var offset = paddedBounds.extend(pixelPoint).getSize().subtract(paddedSize);
        pixelCenter.x += centerOffset.x < 0 ? -offset.x : offset.x;
        pixelCenter.y += centerOffset.y < 0 ? -offset.y : offset.y;
        this.panTo(this.unproject(pixelCenter), options);
        this._enforcingBounds = false;
      }
      return this;
    },
    // @method invalidateSize(options: Zoom/pan options): this
    // Checks if the map container size changed and updates the map if so —
    // call it after you've changed the map size dynamically, also animating
    // pan by default. If `options.pan` is `false`, panning will not occur.
    // If `options.debounceMoveend` is `true`, it will delay `moveend` event so
    // that it doesn't happen often even if the method is called many
    // times in a row.

    // @alternative
    // @method invalidateSize(animate: Boolean): this
    // Checks if the map container size changed and updates the map if so —
    // call it after you've changed the map size dynamically, also animating
    // pan by default.
    invalidateSize: function (options) {
      if (!this._loaded) {
        return this;
      }
      options = extend({
        animate: false,
        pan: true
      }, options === true ? {
        animate: true
      } : options);
      var oldSize = this.getSize();
      this._sizeChanged = true;
      this._lastCenter = null;
      var newSize = this.getSize(),
        oldCenter = oldSize.divideBy(2).round(),
        newCenter = newSize.divideBy(2).round(),
        offset = oldCenter.subtract(newCenter);
      if (!offset.x && !offset.y) {
        return this;
      }
      if (options.animate && options.pan) {
        this.panBy(offset);
      } else {
        if (options.pan) {
          this._rawPanBy(offset);
        }
        this.fire('move');
        if (options.debounceMoveend) {
          clearTimeout(this._sizeTimer);
          this._sizeTimer = setTimeout(bind(this.fire, this, 'moveend'), 200);
        } else {
          this.fire('moveend');
        }
      }

      // @section Map state change events
      // @event resize: ResizeEvent
      // Fired when the map is resized.
      return this.fire('resize', {
        oldSize: oldSize,
        newSize: newSize
      });
    },
    // @section Methods for modifying map state
    // @method stop(): this
    // Stops the currently running `panTo` or `flyTo` animation, if any.
    stop: function () {
      this.setZoom(this._limitZoom(this._zoom));
      if (!this.options.zoomSnap) {
        this.fire('viewreset');
      }
      return this._stop();
    },
    // @section Geolocation methods
    // @method locate(options?: Locate options): this
    // Tries to locate the user using the Geolocation API, firing a [`locationfound`](#map-locationfound)
    // event with location data on success or a [`locationerror`](#map-locationerror) event on failure,
    // and optionally sets the map view to the user's location with respect to
    // detection accuracy (or to the world view if geolocation failed).
    // Note that, if your page doesn't use HTTPS, this method will fail in
    // modern browsers ([Chrome 50 and newer](https://sites.google.com/a/chromium.org/dev/Home/chromium-security/deprecating-powerful-features-on-insecure-origins))
    // See `Locate options` for more details.
    locate: function (options) {
      options = this._locateOptions = extend({
        timeout: 10000,
        watch: false
        // setView: false
        // maxZoom: <Number>
        // maximumAge: 0
        // enableHighAccuracy: false
      }, options);
      if (!('geolocation' in navigator)) {
        this._handleGeolocationError({
          code: 0,
          message: 'Geolocation not supported.'
        });
        return this;
      }
      var onResponse = bind(this._handleGeolocationResponse, this),
        onError = bind(this._handleGeolocationError, this);
      if (options.watch) {
        this._locationWatchId = navigator.geolocation.watchPosition(onResponse, onError, options);
      } else {
        navigator.geolocation.getCurrentPosition(onResponse, onError, options);
      }
      return this;
    },
    // @method stopLocate(): this
    // Stops watching location previously initiated by `map.locate({watch: true})`
    // and aborts resetting the map view if map.locate was called with
    // `{setView: true}`.
    stopLocate: function () {
      if (navigator.geolocation && navigator.geolocation.clearWatch) {
        navigator.geolocation.clearWatch(this._locationWatchId);
      }
      if (this._locateOptions) {
        this._locateOptions.setView = false;
      }
      return this;
    },
    _handleGeolocationError: function (error) {
      if (!this._container._leaflet_id) {
        return;
      }
      var c = error.code,
        message = error.message || (c === 1 ? 'permission denied' : c === 2 ? 'position unavailable' : 'timeout');
      if (this._locateOptions.setView && !this._loaded) {
        this.fitWorld();
      }

      // @section Location events
      // @event locationerror: ErrorEvent
      // Fired when geolocation (using the [`locate`](#map-locate) method) failed.
      this.fire('locationerror', {
        code: c,
        message: 'Geolocation error: ' + message + '.'
      });
    },
    _handleGeolocationResponse: function (pos) {
      if (!this._container._leaflet_id) {
        return;
      }
      var lat = pos.coords.latitude,
        lng = pos.coords.longitude,
        latlng = new LatLng(lat, lng),
        bounds = latlng.toBounds(pos.coords.accuracy * 2),
        options = this._locateOptions;
      if (options.setView) {
        var zoom = this.getBoundsZoom(bounds);
        this.setView(latlng, options.maxZoom ? Math.min(zoom, options.maxZoom) : zoom);
      }
      var data = {
        latlng: latlng,
        bounds: bounds,
        timestamp: pos.timestamp
      };
      for (var i in pos.coords) {
        if (typeof pos.coords[i] === 'number') {
          data[i] = pos.coords[i];
        }
      }

      // @event locationfound: LocationEvent
      // Fired when geolocation (using the [`locate`](#map-locate) method)
      // went successfully.
      this.fire('locationfound', data);
    },
    // TODO Appropriate docs section?
    // @section Other Methods
    // @method addHandler(name: String, HandlerClass: Function): this
    // Adds a new `Handler` to the map, given its name and constructor function.
    addHandler: function (name, HandlerClass) {
      if (!HandlerClass) {
        return this;
      }
      var handler = this[name] = new HandlerClass(this);
      this._handlers.push(handler);
      if (this.options[name]) {
        handler.enable();
      }
      return this;
    },
    // @method remove(): this
    // Destroys the map and clears all related event listeners.
    remove: function () {
      this._initEvents(true);
      if (this.options.maxBounds) {
        this.off('moveend', this._panInsideMaxBounds);
      }
      if (this._containerId !== this._container._leaflet_id) {
        throw new Error('Map container is being reused by another instance');
      }
      try {
        // throws error in IE6-8
        delete this._container._leaflet_id;
        delete this._containerId;
      } catch (e) {
        /*eslint-disable */
        this._container._leaflet_id = undefined;
        /* eslint-enable */
        this._containerId = undefined;
      }
      if (this._locationWatchId !== undefined) {
        this.stopLocate();
      }
      this._stop();
      remove(this._mapPane);
      if (this._clearControlPos) {
        this._clearControlPos();
      }
      if (this._resizeRequest) {
        cancelAnimFrame(this._resizeRequest);
        this._resizeRequest = null;
      }
      this._clearHandlers();
      if (this._loaded) {
        // @section Map state change events
        // @event unload: Event
        // Fired when the map is destroyed with [remove](#map-remove) method.
        this.fire('unload');
      }
      var i;
      for (i in this._layers) {
        this._layers[i].remove();
      }
      for (i in this._panes) {
        remove(this._panes[i]);
      }
      this._layers = [];
      this._panes = [];
      delete this._mapPane;
      delete this._renderer;
      return this;
    },
    // @section Other Methods
    // @method createPane(name: String, container?: HTMLElement): HTMLElement
    // Creates a new [map pane](#map-pane) with the given name if it doesn't exist already,
    // then returns it. The pane is created as a child of `container`, or
    // as a child of the main map pane if not set.
    createPane: function (name, container) {
      var className = 'leaflet-pane' + (name ? ' leaflet-' + name.replace('Pane', '') + '-pane' : ''),
        pane = create$1('div', className, container || this._mapPane);
      if (name) {
        this._panes[name] = pane;
      }
      return pane;
    },
    // @section Methods for Getting Map State

    // @method getCenter(): LatLng
    // Returns the geographical center of the map view
    getCenter: function () {
      this._checkIfLoaded();
      if (this._lastCenter && !this._moved()) {
        return this._lastCenter.clone();
      }
      return this.layerPointToLatLng(this._getCenterLayerPoint());
    },
    // @method getZoom(): Number
    // Returns the current zoom level of the map view
    getZoom: function () {
      return this._zoom;
    },
    // @method getBounds(): LatLngBounds
    // Returns the geographical bounds visible in the current map view
    getBounds: function () {
      var bounds = this.getPixelBounds(),
        sw = this.unproject(bounds.getBottomLeft()),
        ne = this.unproject(bounds.getTopRight());
      return new LatLngBounds(sw, ne);
    },
    // @method getMinZoom(): Number
    // Returns the minimum zoom level of the map (if set in the `minZoom` option of the map or of any layers), or `0` by default.
    getMinZoom: function () {
      return this.options.minZoom === undefined ? this._layersMinZoom || 0 : this.options.minZoom;
    },
    // @method getMaxZoom(): Number
    // Returns the maximum zoom level of the map (if set in the `maxZoom` option of the map or of any layers).
    getMaxZoom: function () {
      return this.options.maxZoom === undefined ? this._layersMaxZoom === undefined ? Infinity : this._layersMaxZoom : this.options.maxZoom;
    },
    // @method getBoundsZoom(bounds: LatLngBounds, inside?: Boolean, padding?: Point): Number
    // Returns the maximum zoom level on which the given bounds fit to the map
    // view in its entirety. If `inside` (optional) is set to `true`, the method
    // instead returns the minimum zoom level on which the map view fits into
    // the given bounds in its entirety.
    getBoundsZoom: function (bounds, inside, padding) {
      // (LatLngBounds[, Boolean, Point]) -> Number
      bounds = toLatLngBounds(bounds);
      padding = toPoint(padding || [0, 0]);
      var zoom = this.getZoom() || 0,
        min = this.getMinZoom(),
        max = this.getMaxZoom(),
        nw = bounds.getNorthWest(),
        se = bounds.getSouthEast(),
        size = this.getSize().subtract(padding),
        boundsSize = toBounds(this.project(se, zoom), this.project(nw, zoom)).getSize(),
        snap = Browser.any3d ? this.options.zoomSnap : 1,
        scalex = size.x / boundsSize.x,
        scaley = size.y / boundsSize.y,
        scale = inside ? Math.max(scalex, scaley) : Math.min(scalex, scaley);
      zoom = this.getScaleZoom(scale, zoom);
      if (snap) {
        zoom = Math.round(zoom / (snap / 100)) * (snap / 100); // don't jump if within 1% of a snap level
        zoom = inside ? Math.ceil(zoom / snap) * snap : Math.floor(zoom / snap) * snap;
      }
      return Math.max(min, Math.min(max, zoom));
    },
    // @method getSize(): Point
    // Returns the current size of the map container (in pixels).
    getSize: function () {
      if (!this._size || this._sizeChanged) {
        this._size = new Point(this._container.clientWidth || 0, this._container.clientHeight || 0);
        this._sizeChanged = false;
      }
      return this._size.clone();
    },
    // @method getPixelBounds(): Bounds
    // Returns the bounds of the current map view in projected pixel
    // coordinates (sometimes useful in layer and overlay implementations).
    getPixelBounds: function (center, zoom) {
      var topLeftPoint = this._getTopLeftPoint(center, zoom);
      return new Bounds(topLeftPoint, topLeftPoint.add(this.getSize()));
    },
    // TODO: Check semantics - isn't the pixel origin the 0,0 coord relative to
    // the map pane? "left point of the map layer" can be confusing, specially
    // since there can be negative offsets.
    // @method getPixelOrigin(): Point
    // Returns the projected pixel coordinates of the top left point of
    // the map layer (useful in custom layer and overlay implementations).
    getPixelOrigin: function () {
      this._checkIfLoaded();
      return this._pixelOrigin;
    },
    // @method getPixelWorldBounds(zoom?: Number): Bounds
    // Returns the world's bounds in pixel coordinates for zoom level `zoom`.
    // If `zoom` is omitted, the map's current zoom level is used.
    getPixelWorldBounds: function (zoom) {
      return this.options.crs.getProjectedBounds(zoom === undefined ? this.getZoom() : zoom);
    },
    // @section Other Methods

    // @method getPane(pane: String|HTMLElement): HTMLElement
    // Returns a [map pane](#map-pane), given its name or its HTML element (its identity).
    getPane: function (pane) {
      return typeof pane === 'string' ? this._panes[pane] : pane;
    },
    // @method getPanes(): Object
    // Returns a plain object containing the names of all [panes](#map-pane) as keys and
    // the panes as values.
    getPanes: function () {
      return this._panes;
    },
    // @method getContainer: HTMLElement
    // Returns the HTML element that contains the map.
    getContainer: function () {
      return this._container;
    },
    // @section Conversion Methods

    // @method getZoomScale(toZoom: Number, fromZoom: Number): Number
    // Returns the scale factor to be applied to a map transition from zoom level
    // `fromZoom` to `toZoom`. Used internally to help with zoom animations.
    getZoomScale: function (toZoom, fromZoom) {
      // TODO replace with universal implementation after refactoring projections
      var crs = this.options.crs;
      fromZoom = fromZoom === undefined ? this._zoom : fromZoom;
      return crs.scale(toZoom) / crs.scale(fromZoom);
    },
    // @method getScaleZoom(scale: Number, fromZoom: Number): Number
    // Returns the zoom level that the map would end up at, if it is at `fromZoom`
    // level and everything is scaled by a factor of `scale`. Inverse of
    // [`getZoomScale`](#map-getZoomScale).
    getScaleZoom: function (scale, fromZoom) {
      var crs = this.options.crs;
      fromZoom = fromZoom === undefined ? this._zoom : fromZoom;
      var zoom = crs.zoom(scale * crs.scale(fromZoom));
      return isNaN(zoom) ? Infinity : zoom;
    },
    // @method project(latlng: LatLng, zoom: Number): Point
    // Projects a geographical coordinate `LatLng` according to the projection
    // of the map's CRS, then scales it according to `zoom` and the CRS's
    // `Transformation`. The result is pixel coordinate relative to
    // the CRS origin.
    project: function (latlng, zoom) {
      zoom = zoom === undefined ? this._zoom : zoom;
      return this.options.crs.latLngToPoint(toLatLng(latlng), zoom);
    },
    // @method unproject(point: Point, zoom: Number): LatLng
    // Inverse of [`project`](#map-project).
    unproject: function (point, zoom) {
      zoom = zoom === undefined ? this._zoom : zoom;
      return this.options.crs.pointToLatLng(toPoint(point), zoom);
    },
    // @method layerPointToLatLng(point: Point): LatLng
    // Given a pixel coordinate relative to the [origin pixel](#map-getpixelorigin),
    // returns the corresponding geographical coordinate (for the current zoom level).
    layerPointToLatLng: function (point) {
      var projectedPoint = toPoint(point).add(this.getPixelOrigin());
      return this.unproject(projectedPoint);
    },
    // @method latLngToLayerPoint(latlng: LatLng): Point
    // Given a geographical coordinate, returns the corresponding pixel coordinate
    // relative to the [origin pixel](#map-getpixelorigin).
    latLngToLayerPoint: function (latlng) {
      var projectedPoint = this.project(toLatLng(latlng))._round();
      return projectedPoint._subtract(this.getPixelOrigin());
    },
    // @method wrapLatLng(latlng: LatLng): LatLng
    // Returns a `LatLng` where `lat` and `lng` has been wrapped according to the
    // map's CRS's `wrapLat` and `wrapLng` properties, if they are outside the
    // CRS's bounds.
    // By default this means longitude is wrapped around the dateline so its
    // value is between -180 and +180 degrees.
    wrapLatLng: function (latlng) {
      return this.options.crs.wrapLatLng(toLatLng(latlng));
    },
    // @method wrapLatLngBounds(bounds: LatLngBounds): LatLngBounds
    // Returns a `LatLngBounds` with the same size as the given one, ensuring that
    // its center is within the CRS's bounds.
    // By default this means the center longitude is wrapped around the dateline so its
    // value is between -180 and +180 degrees, and the majority of the bounds
    // overlaps the CRS's bounds.
    wrapLatLngBounds: function (latlng) {
      return this.options.crs.wrapLatLngBounds(toLatLngBounds(latlng));
    },
    // @method distance(latlng1: LatLng, latlng2: LatLng): Number
    // Returns the distance between two geographical coordinates according to
    // the map's CRS. By default this measures distance in meters.
    distance: function (latlng1, latlng2) {
      return this.options.crs.distance(toLatLng(latlng1), toLatLng(latlng2));
    },
    // @method containerPointToLayerPoint(point: Point): Point
    // Given a pixel coordinate relative to the map container, returns the corresponding
    // pixel coordinate relative to the [origin pixel](#map-getpixelorigin).
    containerPointToLayerPoint: function (point) {
      // (Point)
      return toPoint(point).subtract(this._getMapPanePos());
    },
    // @method layerPointToContainerPoint(point: Point): Point
    // Given a pixel coordinate relative to the [origin pixel](#map-getpixelorigin),
    // returns the corresponding pixel coordinate relative to the map container.
    layerPointToContainerPoint: function (point) {
      // (Point)
      return toPoint(point).add(this._getMapPanePos());
    },
    // @method containerPointToLatLng(point: Point): LatLng
    // Given a pixel coordinate relative to the map container, returns
    // the corresponding geographical coordinate (for the current zoom level).
    containerPointToLatLng: function (point) {
      var layerPoint = this.containerPointToLayerPoint(toPoint(point));
      return this.layerPointToLatLng(layerPoint);
    },
    // @method latLngToContainerPoint(latlng: LatLng): Point
    // Given a geographical coordinate, returns the corresponding pixel coordinate
    // relative to the map container.
    latLngToContainerPoint: function (latlng) {
      return this.layerPointToContainerPoint(this.latLngToLayerPoint(toLatLng(latlng)));
    },
    // @method mouseEventToContainerPoint(ev: MouseEvent): Point
    // Given a MouseEvent object, returns the pixel coordinate relative to the
    // map container where the event took place.
    mouseEventToContainerPoint: function (e) {
      return getMousePosition(e, this._container);
    },
    // @method mouseEventToLayerPoint(ev: MouseEvent): Point
    // Given a MouseEvent object, returns the pixel coordinate relative to
    // the [origin pixel](#map-getpixelorigin) where the event took place.
    mouseEventToLayerPoint: function (e) {
      return this.containerPointToLayerPoint(this.mouseEventToContainerPoint(e));
    },
    // @method mouseEventToLatLng(ev: MouseEvent): LatLng
    // Given a MouseEvent object, returns geographical coordinate where the
    // event took place.
    mouseEventToLatLng: function (e) {
      // (MouseEvent)
      return this.layerPointToLatLng(this.mouseEventToLayerPoint(e));
    },
    // map initialization methods

    _initContainer: function (id) {
      var container = this._container = get(id);
      if (!container) {
        throw new Error('Map container not found.');
      } else if (container._leaflet_id) {
        throw new Error('Map container is already initialized.');
      }
      on(container, 'scroll', this._onScroll, this);
      this._containerId = stamp(container);
    },
    _initLayout: function () {
      var container = this._container;
      this._fadeAnimated = this.options.fadeAnimation && Browser.any3d;
      addClass(container, 'leaflet-container' + (Browser.touch ? ' leaflet-touch' : '') + (Browser.retina ? ' leaflet-retina' : '') + (Browser.ielt9 ? ' leaflet-oldie' : '') + (Browser.safari ? ' leaflet-safari' : '') + (this._fadeAnimated ? ' leaflet-fade-anim' : ''));
      var position = getStyle(container, 'position');
      if (position !== 'absolute' && position !== 'relative' && position !== 'fixed' && position !== 'sticky') {
        container.style.position = 'relative';
      }
      this._initPanes();
      if (this._initControlPos) {
        this._initControlPos();
      }
    },
    _initPanes: function () {
      var panes = this._panes = {};
      this._paneRenderers = {};

      // @section
      //
      // Panes are DOM elements used to control the ordering of layers on the map. You
      // can access panes with [`map.getPane`](#map-getpane) or
      // [`map.getPanes`](#map-getpanes) methods. New panes can be created with the
      // [`map.createPane`](#map-createpane) method.
      //
      // Every map has the following default panes that differ only in zIndex.
      //
      // @pane mapPane: HTMLElement = 'auto'
      // Pane that contains all other map panes

      this._mapPane = this.createPane('mapPane', this._container);
      setPosition(this._mapPane, new Point(0, 0));

      // @pane tilePane: HTMLElement = 200
      // Pane for `GridLayer`s and `TileLayer`s
      this.createPane('tilePane');
      // @pane overlayPane: HTMLElement = 400
      // Pane for vectors (`Path`s, like `Polyline`s and `Polygon`s), `ImageOverlay`s and `VideoOverlay`s
      this.createPane('overlayPane');
      // @pane shadowPane: HTMLElement = 500
      // Pane for overlay shadows (e.g. `Marker` shadows)
      this.createPane('shadowPane');
      // @pane markerPane: HTMLElement = 600
      // Pane for `Icon`s of `Marker`s
      this.createPane('markerPane');
      // @pane tooltipPane: HTMLElement = 650
      // Pane for `Tooltip`s.
      this.createPane('tooltipPane');
      // @pane popupPane: HTMLElement = 700
      // Pane for `Popup`s.
      this.createPane('popupPane');
      if (!this.options.markerZoomAnimation) {
        addClass(panes.markerPane, 'leaflet-zoom-hide');
        addClass(panes.shadowPane, 'leaflet-zoom-hide');
      }
    },
    // private methods that modify map state

    // @section Map state change events
    _resetView: function (center, zoom, noMoveStart) {
      setPosition(this._mapPane, new Point(0, 0));
      var loading = !this._loaded;
      this._loaded = true;
      zoom = this._limitZoom(zoom);
      this.fire('viewprereset');
      var zoomChanged = this._zoom !== zoom;
      this._moveStart(zoomChanged, noMoveStart)._move(center, zoom)._moveEnd(zoomChanged);

      // @event viewreset: Event
      // Fired when the map needs to redraw its content (this usually happens
      // on map zoom or load). Very useful for creating custom overlays.
      this.fire('viewreset');

      // @event load: Event
      // Fired when the map is initialized (when its center and zoom are set
      // for the first time).
      if (loading) {
        this.fire('load');
      }
    },
    _moveStart: function (zoomChanged, noMoveStart) {
      // @event zoomstart: Event
      // Fired when the map zoom is about to change (e.g. before zoom animation).
      // @event movestart: Event
      // Fired when the view of the map starts changing (e.g. user starts dragging the map).
      if (zoomChanged) {
        this.fire('zoomstart');
      }
      if (!noMoveStart) {
        this.fire('movestart');
      }
      return this;
    },
    _move: function (center, zoom, data, supressEvent) {
      if (zoom === undefined) {
        zoom = this._zoom;
      }
      var zoomChanged = this._zoom !== zoom;
      this._zoom = zoom;
      this._lastCenter = center;
      this._pixelOrigin = this._getNewPixelOrigin(center);
      if (!supressEvent) {
        // @event zoom: Event
        // Fired repeatedly during any change in zoom level,
        // including zoom and fly animations.
        if (zoomChanged || data && data.pinch) {
          // Always fire 'zoom' if pinching because #3530
          this.fire('zoom', data);
        }

        // @event move: Event
        // Fired repeatedly during any movement of the map,
        // including pan and fly animations.
        this.fire('move', data);
      } else if (data && data.pinch) {
        // Always fire 'zoom' if pinching because #3530
        this.fire('zoom', data);
      }
      return this;
    },
    _moveEnd: function (zoomChanged) {
      // @event zoomend: Event
      // Fired when the map zoom changed, after any animations.
      if (zoomChanged) {
        this.fire('zoomend');
      }

      // @event moveend: Event
      // Fired when the center of the map stops changing
      // (e.g. user stopped dragging the map or after non-centered zoom).
      return this.fire('moveend');
    },
    _stop: function () {
      cancelAnimFrame(this._flyToFrame);
      if (this._panAnim) {
        this._panAnim.stop();
      }
      return this;
    },
    _rawPanBy: function (offset) {
      setPosition(this._mapPane, this._getMapPanePos().subtract(offset));
    },
    _getZoomSpan: function () {
      return this.getMaxZoom() - this.getMinZoom();
    },
    _panInsideMaxBounds: function () {
      if (!this._enforcingBounds) {
        this.panInsideBounds(this.options.maxBounds);
      }
    },
    _checkIfLoaded: function () {
      if (!this._loaded) {
        throw new Error('Set map center and zoom first.');
      }
    },
    // DOM event handling

    // @section Interaction events
    _initEvents: function (remove) {
      this._targets = {};
      this._targets[stamp(this._container)] = this;
      var onOff = remove ? off : on;

      // @event click: MouseEvent
      // Fired when the user clicks (or taps) the map.
      // @event dblclick: MouseEvent
      // Fired when the user double-clicks (or double-taps) the map.
      // @event mousedown: MouseEvent
      // Fired when the user pushes the mouse button on the map.
      // @event mouseup: MouseEvent
      // Fired when the user releases the mouse button on the map.
      // @event mouseover: MouseEvent
      // Fired when the mouse enters the map.
      // @event mouseout: MouseEvent
      // Fired when the mouse leaves the map.
      // @event mousemove: MouseEvent
      // Fired while the mouse moves over the map.
      // @event contextmenu: MouseEvent
      // Fired when the user pushes the right mouse button on the map, prevents
      // default browser context menu from showing if there are listeners on
      // this event. Also fired on mobile when the user holds a single touch
      // for a second (also called long press).
      // @event keypress: KeyboardEvent
      // Fired when the user presses a key from the keyboard that produces a character value while the map is focused.
      // @event keydown: KeyboardEvent
      // Fired when the user presses a key from the keyboard while the map is focused. Unlike the `keypress` event,
      // the `keydown` event is fired for keys that produce a character value and for keys
      // that do not produce a character value.
      // @event keyup: KeyboardEvent
      // Fired when the user releases a key from the keyboard while the map is focused.
      onOff(this._container, 'click dblclick mousedown mouseup ' + 'mouseover mouseout mousemove contextmenu keypress keydown keyup', this._handleDOMEvent, this);
      if (this.options.trackResize) {
        onOff(window, 'resize', this._onResize, this);
      }
      if (Browser.any3d && this.options.transform3DLimit) {
        (remove ? this.off : this.on).call(this, 'moveend', this._onMoveEnd);
      }
    },
    _onResize: function () {
      cancelAnimFrame(this._resizeRequest);
      this._resizeRequest = requestAnimFrame(function () {
        this.invalidateSize({
          debounceMoveend: true
        });
      }, this);
    },
    _onScroll: function () {
      this._container.scrollTop = 0;
      this._container.scrollLeft = 0;
    },
    _onMoveEnd: function () {
      var pos = this._getMapPanePos();
      if (Math.max(Math.abs(pos.x), Math.abs(pos.y)) >= this.options.transform3DLimit) {
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1203873 but Webkit also have
        // a pixel offset on very high values, see: https://jsfiddle.net/dg6r5hhb/
        this._resetView(this.getCenter(), this.getZoom());
      }
    },
    _findEventTargets: function (e, type) {
      var targets = [],
        target,
        isHover = type === 'mouseout' || type === 'mouseover',
        src = e.target || e.srcElement,
        dragging = false;
      while (src) {
        target = this._targets[stamp(src)];
        if (target && (type === 'click' || type === 'preclick') && this._draggableMoved(target)) {
          // Prevent firing click after you just dragged an object.
          dragging = true;
          break;
        }
        if (target && target.listens(type, true)) {
          if (isHover && !isExternalTarget(src, e)) {
            break;
          }
          targets.push(target);
          if (isHover) {
            break;
          }
        }
        if (src === this._container) {
          break;
        }
        src = src.parentNode;
      }
      if (!targets.length && !dragging && !isHover && this.listens(type, true)) {
        targets = [this];
      }
      return targets;
    },
    _isClickDisabled: function (el) {
      while (el && el !== this._container) {
        if (el['_leaflet_disable_click']) {
          return true;
        }
        el = el.parentNode;
      }
    },
    _handleDOMEvent: function (e) {
      var el = e.target || e.srcElement;
      if (!this._loaded || el['_leaflet_disable_events'] || e.type === 'click' && this._isClickDisabled(el)) {
        return;
      }
      var type = e.type;
      if (type === 'mousedown') {
        // prevents outline when clicking on keyboard-focusable element
        preventOutline(el);
      }
      this._fireDOMEvent(e, type);
    },
    _mouseEvents: ['click', 'dblclick', 'mouseover', 'mouseout', 'contextmenu'],
    _fireDOMEvent: function (e, type, canvasTargets) {
      if (e.type === 'click') {
        // Fire a synthetic 'preclick' event which propagates up (mainly for closing popups).
        // @event preclick: MouseEvent
        // Fired before mouse click on the map (sometimes useful when you
        // want something to happen on click before any existing click
        // handlers start running).
        var synth = extend({}, e);
        synth.type = 'preclick';
        this._fireDOMEvent(synth, synth.type, canvasTargets);
      }

      // Find the layer the event is propagating from and its parents.
      var targets = this._findEventTargets(e, type);
      if (canvasTargets) {
        var filtered = []; // pick only targets with listeners
        for (var i = 0; i < canvasTargets.length; i++) {
          if (canvasTargets[i].listens(type, true)) {
            filtered.push(canvasTargets[i]);
          }
        }
        targets = filtered.concat(targets);
      }
      if (!targets.length) {
        return;
      }
      if (type === 'contextmenu') {
        preventDefault(e);
      }
      var target = targets[0];
      var data = {
        originalEvent: e
      };
      if (e.type !== 'keypress' && e.type !== 'keydown' && e.type !== 'keyup') {
        var isMarker = target.getLatLng && (!target._radius || target._radius <= 10);
        data.containerPoint = isMarker ? this.latLngToContainerPoint(target.getLatLng()) : this.mouseEventToContainerPoint(e);
        data.layerPoint = this.containerPointToLayerPoint(data.containerPoint);
        data.latlng = isMarker ? target.getLatLng() : this.layerPointToLatLng(data.layerPoint);
      }
      for (i = 0; i < targets.length; i++) {
        targets[i].fire(type, data, true);
        if (data.originalEvent._stopped || targets[i].options.bubblingMouseEvents === false && indexOf(this._mouseEvents, type) !== -1) {
          return;
        }
      }
    },
    _draggableMoved: function (obj) {
      obj = obj.dragging && obj.dragging.enabled() ? obj : this;
      return obj.dragging && obj.dragging.moved() || this.boxZoom && this.boxZoom.moved();
    },
    _clearHandlers: function () {
      for (var i = 0, len = this._handlers.length; i < len; i++) {
        this._handlers[i].disable();
      }
    },
    // @section Other Methods

    // @method whenReady(fn: Function, context?: Object): this
    // Runs the given function `fn` when the map gets initialized with
    // a view (center and zoom) and at least one layer, or immediately
    // if it's already initialized, optionally passing a function context.
    whenReady: function (callback, context) {
      if (this._loaded) {
        callback.call(context || this, {
          target: this
        });
      } else {
        this.on('load', callback, context);
      }
      return this;
    },
    // private methods for getting map state

    _getMapPanePos: function () {
      return getPosition(this._mapPane) || new Point(0, 0);
    },
    _moved: function () {
      var pos = this._getMapPanePos();
      return pos && !pos.equals([0, 0]);
    },
    _getTopLeftPoint: function (center, zoom) {
      var pixelOrigin = center && zoom !== undefined ? this._getNewPixelOrigin(center, zoom) : this.getPixelOrigin();
      return pixelOrigin.subtract(this._getMapPanePos());
    },
    _getNewPixelOrigin: function (center, zoom) {
      var viewHalf = this.getSize()._divideBy(2);
      return this.project(center, zoom)._subtract(viewHalf)._add(this._getMapPanePos())._round();
    },
    _latLngToNewLayerPoint: function (latlng, zoom, center) {
      var topLeft = this._getNewPixelOrigin(center, zoom);
      return this.project(latlng, zoom)._subtract(topLeft);
    },
    _latLngBoundsToNewLayerBounds: function (latLngBounds, zoom, center) {
      var topLeft = this._getNewPixelOrigin(center, zoom);
      return toBounds([this.project(latLngBounds.getSouthWest(), zoom)._subtract(topLeft), this.project(latLngBounds.getNorthWest(), zoom)._subtract(topLeft), this.project(latLngBounds.getSouthEast(), zoom)._subtract(topLeft), this.project(latLngBounds.getNorthEast(), zoom)._subtract(topLeft)]);
    },
    // layer point of the current center
    _getCenterLayerPoint: function () {
      return this.containerPointToLayerPoint(this.getSize()._divideBy(2));
    },
    // offset of the specified place to the current center in pixels
    _getCenterOffset: function (latlng) {
      return this.latLngToLayerPoint(latlng).subtract(this._getCenterLayerPoint());
    },
    // adjust center for view to get inside bounds
    _limitCenter: function (center, zoom, bounds) {
      if (!bounds) {
        return center;
      }
      var centerPoint = this.project(center, zoom),
        viewHalf = this.getSize().divideBy(2),
        viewBounds = new Bounds(centerPoint.subtract(viewHalf), centerPoint.add(viewHalf)),
        offset = this._getBoundsOffset(viewBounds, bounds, zoom);

      // If offset is less than a pixel, ignore.
      // This prevents unstable projections from getting into
      // an infinite loop of tiny offsets.
      if (Math.abs(offset.x) <= 1 && Math.abs(offset.y) <= 1) {
        return center;
      }
      return this.unproject(centerPoint.add(offset), zoom);
    },
    // adjust offset for view to get inside bounds
    _limitOffset: function (offset, bounds) {
      if (!bounds) {
        return offset;
      }
      var viewBounds = this.getPixelBounds(),
        newBounds = new Bounds(viewBounds.min.add(offset), viewBounds.max.add(offset));
      return offset.add(this._getBoundsOffset(newBounds, bounds));
    },
    // returns offset needed for pxBounds to get inside maxBounds at a specified zoom
    _getBoundsOffset: function (pxBounds, maxBounds, zoom) {
      var projectedMaxBounds = toBounds(this.project(maxBounds.getNorthEast(), zoom), this.project(maxBounds.getSouthWest(), zoom)),
        minOffset = projectedMaxBounds.min.subtract(pxBounds.min),
        maxOffset = projectedMaxBounds.max.subtract(pxBounds.max),
        dx = this._rebound(minOffset.x, -maxOffset.x),
        dy = this._rebound(minOffset.y, -maxOffset.y);
      return new Point(dx, dy);
    },
    _rebound: function (left, right) {
      return left + right > 0 ? Math.round(left - right) / 2 : Math.max(0, Math.ceil(left)) - Math.max(0, Math.floor(right));
    },
    _limitZoom: function (zoom) {
      var min = this.getMinZoom(),
        max = this.getMaxZoom(),
        snap = Browser.any3d ? this.options.zoomSnap : 1;
      if (snap) {
        zoom = Math.round(zoom / snap) * snap;
      }
      return Math.max(min, Math.min(max, zoom));
    },
    _onPanTransitionStep: function () {
      this.fire('move');
    },
    _onPanTransitionEnd: function () {
      removeClass(this._mapPane, 'leaflet-pan-anim');
      this.fire('moveend');
    },
    _tryAnimatedPan: function (center, options) {
      // difference between the new and current centers in pixels
      var offset = this._getCenterOffset(center)._trunc();

      // don't animate too far unless animate: true specified in options
      if ((options && options.animate) !== true && !this.getSize().contains(offset)) {
        return false;
      }
      this.panBy(offset, options);
      return true;
    },
    _createAnimProxy: function () {
      var proxy = this._proxy = create$1('div', 'leaflet-proxy leaflet-zoom-animated');
      this._panes.mapPane.appendChild(proxy);
      this.on('zoomanim', function (e) {
        var prop = TRANSFORM,
          transform = this._proxy.style[prop];
        setTransform(this._proxy, this.project(e.center, e.zoom), this.getZoomScale(e.zoom, 1));

        // workaround for case when transform is the same and so transitionend event is not fired
        if (transform === this._proxy.style[prop] && this._animatingZoom) {
          this._onZoomTransitionEnd();
        }
      }, this);
      this.on('load moveend', this._animMoveEnd, this);
      this._on('unload', this._destroyAnimProxy, this);
    },
    _destroyAnimProxy: function () {
      remove(this._proxy);
      this.off('load moveend', this._animMoveEnd, this);
      delete this._proxy;
    },
    _animMoveEnd: function () {
      var c = this.getCenter(),
        z = this.getZoom();
      setTransform(this._proxy, this.project(c, z), this.getZoomScale(z, 1));
    },
    _catchTransitionEnd: function (e) {
      if (this._animatingZoom && e.propertyName.indexOf('transform') >= 0) {
        this._onZoomTransitionEnd();
      }
    },
    _nothingToAnimate: function () {
      return !this._container.getElementsByClassName('leaflet-zoom-animated').length;
    },
    _tryAnimatedZoom: function (center, zoom, options) {
      if (this._animatingZoom) {
        return true;
      }
      options = options || {};

      // don't animate if disabled, not supported or zoom difference is too large
      if (!this._zoomAnimated || options.animate === false || this._nothingToAnimate() || Math.abs(zoom - this._zoom) > this.options.zoomAnimationThreshold) {
        return false;
      }

      // offset is the pixel coords of the zoom origin relative to the current center
      var scale = this.getZoomScale(zoom),
        offset = this._getCenterOffset(center)._divideBy(1 - 1 / scale);

      // don't animate if the zoom origin isn't within one screen from the current center, unless forced
      if (options.animate !== true && !this.getSize().contains(offset)) {
        return false;
      }
      requestAnimFrame(function () {
        this._moveStart(true, options.noMoveStart || false)._animateZoom(center, zoom, true);
      }, this);
      return true;
    },
    _animateZoom: function (center, zoom, startAnim, noUpdate) {
      if (!this._mapPane) {
        return;
      }
      if (startAnim) {
        this._animatingZoom = true;

        // remember what center/zoom to set after animation
        this._animateToCenter = center;
        this._animateToZoom = zoom;
        addClass(this._mapPane, 'leaflet-zoom-anim');
      }

      // @section Other Events
      // @event zoomanim: ZoomAnimEvent
      // Fired at least once per zoom animation. For continuous zoom, like pinch zooming, fired once per frame during zoom.
      this.fire('zoomanim', {
        center: center,
        zoom: zoom,
        noUpdate: noUpdate
      });
      if (!this._tempFireZoomEvent) {
        this._tempFireZoomEvent = this._zoom !== this._animateToZoom;
      }
      this._move(this._animateToCenter, this._animateToZoom, undefined, true);

      // Work around webkit not firing 'transitionend', see https://github.com/Leaflet/Leaflet/issues/3689, 2693
      setTimeout(bind(this._onZoomTransitionEnd, this), 250);
    },
    _onZoomTransitionEnd: function () {
      if (!this._animatingZoom) {
        return;
      }
      if (this._mapPane) {
        removeClass(this._mapPane, 'leaflet-zoom-anim');
      }
      this._animatingZoom = false;
      this._move(this._animateToCenter, this._animateToZoom, undefined, true);
      if (this._tempFireZoomEvent) {
        this.fire('zoom');
      }
      delete this._tempFireZoomEvent;
      this.fire('move');
      this._moveEnd(true);
    }
  });

  // @section

  // @factory L.map(id: String, options?: Map options)
  // Instantiates a map object given the DOM ID of a `<div>` element
  // and optionally an object literal with `Map options`.
  //
  // @alternative
  // @factory L.map(el: HTMLElement, options?: Map options)
  // Instantiates a map object given an instance of a `<div>` HTML element
  // and optionally an object literal with `Map options`.
  function createMap(id, options) {
    return new Map(id, options);
  }

  /*
   * @class Control
   * @aka L.Control
   * @inherits Class
   *
   * L.Control is a base class for implementing map controls. Handles positioning.
   * All other controls extend from this class.
   */

  var Control = Class.extend({
    // @section
    // @aka Control Options
    options: {
      // @option position: String = 'topright'
      // The position of the control (one of the map corners). Possible values are `'topleft'`,
      // `'topright'`, `'bottomleft'` or `'bottomright'`
      position: 'topright'
    },
    initialize: function (options) {
      setOptions(this, options);
    },
    /* @section
     * Classes extending L.Control will inherit the following methods:
     *
     * @method getPosition: string
     * Returns the position of the control.
     */
    getPosition: function () {
      return this.options.position;
    },
    // @method setPosition(position: string): this
    // Sets the position of the control.
    setPosition: function (position) {
      var map = this._map;
      if (map) {
        map.removeControl(this);
      }
      this.options.position = position;
      if (map) {
        map.addControl(this);
      }
      return this;
    },
    // @method getContainer: HTMLElement
    // Returns the HTMLElement that contains the control.
    getContainer: function () {
      return this._container;
    },
    // @method addTo(map: Map): this
    // Adds the control to the given map.
    addTo: function (map) {
      this.remove();
      this._map = map;
      var container = this._container = this.onAdd(map),
        pos = this.getPosition(),
        corner = map._controlCorners[pos];
      addClass(container, 'leaflet-control');
      if (pos.indexOf('bottom') !== -1) {
        corner.insertBefore(container, corner.firstChild);
      } else {
        corner.appendChild(container);
      }
      this._map.on('unload', this.remove, this);
      return this;
    },
    // @method remove: this
    // Removes the control from the map it is currently active on.
    remove: function () {
      if (!this._map) {
        return this;
      }
      remove(this._container);
      if (this.onRemove) {
        this.onRemove(this._map);
      }
      this._map.off('unload', this.remove, this);
      this._map = null;
      return this;
    },
    _refocusOnMap: function (e) {
      // if map exists and event is not a keyboard event
      if (this._map && e && e.screenX > 0 && e.screenY > 0) {
        this._map.getContainer().focus();
      }
    }
  });
  var control = function (options) {
    return new Control(options);
  };

  /* @section Extension methods
   * @uninheritable
   *
   * Every control should extend from `L.Control` and (re-)implement the following methods.
   *
   * @method onAdd(map: Map): HTMLElement
   * Should return the container DOM element for the control and add listeners on relevant map events. Called on [`control.addTo(map)`](#control-addTo).
   *
   * @method onRemove(map: Map)
   * Optional method. Should contain all clean up code that removes the listeners previously added in [`onAdd`](#control-onadd). Called on [`control.remove()`](#control-remove).
   */

  /* @namespace Map
   * @section Methods for Layers and Controls
   */
  Map.include({
    // @method addControl(control: Control): this
    // Adds the given control to the map
    addControl: function (control) {
      control.addTo(this);
      return this;
    },
    // @method removeControl(control: Control): this
    // Removes the given control from the map
    removeControl: function (control) {
      control.remove();
      return this;
    },
    _initControlPos: function () {
      var corners = this._controlCorners = {},
        l = 'leaflet-',
        container = this._controlContainer = create$1('div', l + 'control-container', this._container);
      function createCorner(vSide, hSide) {
        var className = l + vSide + ' ' + l + hSide;
        corners[vSide + hSide] = create$1('div', className, container);
      }
      createCorner('top', 'left');
      createCorner('top', 'right');
      createCorner('bottom', 'left');
      createCorner('bottom', 'right');
    },
    _clearControlPos: function () {
      for (var i in this._controlCorners) {
        remove(this._controlCorners[i]);
      }
      remove(this._controlContainer);
      delete this._controlCorners;
      delete this._controlContainer;
    }
  });

  /*
   * @class Control.Layers
   * @aka L.Control.Layers
   * @inherits Control
   *
   * The layers control gives users the ability to switch between different base layers and switch overlays on/off (check out the [detailed example](https://leafletjs.com/examples/layers-control/)). Extends `Control`.
   *
   * @example
   *
   * ```js
   * var baseLayers = {
   * 	"Mapbox": mapbox,
   * 	"OpenStreetMap": osm
   * };
   *
   * var overlays = {
   * 	"Marker": marker,
   * 	"Roads": roadsLayer
   * };
   *
   * L.control.layers(baseLayers, overlays).addTo(map);
   * ```
   *
   * The `baseLayers` and `overlays` parameters are object literals with layer names as keys and `Layer` objects as values:
   *
   * ```js
   * {
   *     "<someName1>": layer1,
   *     "<someName2>": layer2
   * }
   * ```
   *
   * The layer names can contain HTML, which allows you to add additional styling to the items:
   *
   * ```js
   * {"<img src='my-layer-icon' /> <span class='my-layer-item'>My Layer</span>": myLayer}
   * ```
   */

  var Layers = Control.extend({
    // @section
    // @aka Control.Layers options
    options: {
      // @option collapsed: Boolean = true
      // If `true`, the control will be collapsed into an icon and expanded on mouse hover, touch, or keyboard activation.
      collapsed: true,
      position: 'topright',
      // @option autoZIndex: Boolean = true
      // If `true`, the control will assign zIndexes in increasing order to all of its layers so that the order is preserved when switching them on/off.
      autoZIndex: true,
      // @option hideSingleBase: Boolean = false
      // If `true`, the base layers in the control will be hidden when there is only one.
      hideSingleBase: false,
      // @option sortLayers: Boolean = false
      // Whether to sort the layers. When `false`, layers will keep the order
      // in which they were added to the control.
      sortLayers: false,
      // @option sortFunction: Function = *
      // A [compare function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)
      // that will be used for sorting the layers, when `sortLayers` is `true`.
      // The function receives both the `L.Layer` instances and their names, as in
      // `sortFunction(layerA, layerB, nameA, nameB)`.
      // By default, it sorts layers alphabetically by their name.
      sortFunction: function (layerA, layerB, nameA, nameB) {
        return nameA < nameB ? -1 : nameB < nameA ? 1 : 0;
      }
    },
    initialize: function (baseLayers, overlays, options) {
      setOptions(this, options);
      this._layerControlInputs = [];
      this._layers = [];
      this._lastZIndex = 0;
      this._handlingClick = false;
      this._preventClick = false;
      for (var i in baseLayers) {
        this._addLayer(baseLayers[i], i);
      }
      for (i in overlays) {
        this._addLayer(overlays[i], i, true);
      }
    },
    onAdd: function (map) {
      this._initLayout();
      this._update();
      this._map = map;
      map.on('zoomend', this._checkDisabledLayers, this);
      for (var i = 0; i < this._layers.length; i++) {
        this._layers[i].layer.on('add remove', this._onLayerChange, this);
      }
      return this._container;
    },
    addTo: function (map) {
      Control.prototype.addTo.call(this, map);
      // Trigger expand after Layers Control has been inserted into DOM so that is now has an actual height.
      return this._expandIfNotCollapsed();
    },
    onRemove: function () {
      this._map.off('zoomend', this._checkDisabledLayers, this);
      for (var i = 0; i < this._layers.length; i++) {
        this._layers[i].layer.off('add remove', this._onLayerChange, this);
      }
    },
    // @method addBaseLayer(layer: Layer, name: String): this
    // Adds a base layer (radio button entry) with the given name to the control.
    addBaseLayer: function (layer, name) {
      this._addLayer(layer, name);
      return this._map ? this._update() : this;
    },
    // @method addOverlay(layer: Layer, name: String): this
    // Adds an overlay (checkbox entry) with the given name to the control.
    addOverlay: function (layer, name) {
      this._addLayer(layer, name, true);
      return this._map ? this._update() : this;
    },
    // @method removeLayer(layer: Layer): this
    // Remove the given layer from the control.
    removeLayer: function (layer) {
      layer.off('add remove', this._onLayerChange, this);
      var obj = this._getLayer(stamp(layer));
      if (obj) {
        this._layers.splice(this._layers.indexOf(obj), 1);
      }
      return this._map ? this._update() : this;
    },
    // @method expand(): this
    // Expand the control container if collapsed.
    expand: function () {
      addClass(this._container, 'leaflet-control-layers-expanded');
      this._section.style.height = null;
      var acceptableHeight = this._map.getSize().y - (this._container.offsetTop + 50);
      if (acceptableHeight < this._section.clientHeight) {
        addClass(this._section, 'leaflet-control-layers-scrollbar');
        this._section.style.height = acceptableHeight + 'px';
      } else {
        removeClass(this._section, 'leaflet-control-layers-scrollbar');
      }
      this._checkDisabledLayers();
      return this;
    },
    // @method collapse(): this
    // Collapse the control container if expanded.
    collapse: function () {
      removeClass(this._container, 'leaflet-control-layers-expanded');
      return this;
    },
    _initLayout: function () {
      var className = 'leaflet-control-layers',
        container = this._container = create$1('div', className),
        collapsed = this.options.collapsed;

      // makes this work on IE touch devices by stopping it from firing a mouseout event when the touch is released
      container.setAttribute('aria-haspopup', true);
      disableClickPropagation(container);
      disableScrollPropagation(container);
      var section = this._section = create$1('section', className + '-list');
      if (collapsed) {
        this._map.on('click', this.collapse, this);
        on(container, {
          mouseenter: this._expandSafely,
          mouseleave: this.collapse
        }, this);
      }
      var link = this._layersLink = create$1('a', className + '-toggle', container);
      link.href = '#';
      link.title = 'Layers';
      link.setAttribute('role', 'button');
      on(link, {
        keydown: function (e) {
          if (e.keyCode === 13) {
            this._expandSafely();
          }
        },
        // Certain screen readers intercept the key event and instead send a click event
        click: function (e) {
          preventDefault(e);
          this._expandSafely();
        }
      }, this);
      if (!collapsed) {
        this.expand();
      }
      this._baseLayersList = create$1('div', className + '-base', section);
      this._separator = create$1('div', className + '-separator', section);
      this._overlaysList = create$1('div', className + '-overlays', section);
      container.appendChild(section);
    },
    _getLayer: function (id) {
      for (var i = 0; i < this._layers.length; i++) {
        if (this._layers[i] && stamp(this._layers[i].layer) === id) {
          return this._layers[i];
        }
      }
    },
    _addLayer: function (layer, name, overlay) {
      if (this._map) {
        layer.on('add remove', this._onLayerChange, this);
      }
      this._layers.push({
        layer: layer,
        name: name,
        overlay: overlay
      });
      if (this.options.sortLayers) {
        this._layers.sort(bind(function (a, b) {
          return this.options.sortFunction(a.layer, b.layer, a.name, b.name);
        }, this));
      }
      if (this.options.autoZIndex && layer.setZIndex) {
        this._lastZIndex++;
        layer.setZIndex(this._lastZIndex);
      }
      this._expandIfNotCollapsed();
    },
    _update: function () {
      if (!this._container) {
        return this;
      }
      empty(this._baseLayersList);
      empty(this._overlaysList);
      this._layerControlInputs = [];
      var baseLayersPresent,
        overlaysPresent,
        i,
        obj,
        baseLayersCount = 0;
      for (i = 0; i < this._layers.length; i++) {
        obj = this._layers[i];
        this._addItem(obj);
        overlaysPresent = overlaysPresent || obj.overlay;
        baseLayersPresent = baseLayersPresent || !obj.overlay;
        baseLayersCount += !obj.overlay ? 1 : 0;
      }

      // Hide base layers section if there's only one layer.
      if (this.options.hideSingleBase) {
        baseLayersPresent = baseLayersPresent && baseLayersCount > 1;
        this._baseLayersList.style.display = baseLayersPresent ? '' : 'none';
      }
      this._separator.style.display = overlaysPresent && baseLayersPresent ? '' : 'none';
      return this;
    },
    _onLayerChange: function (e) {
      if (!this._handlingClick) {
        this._update();
      }
      var obj = this._getLayer(stamp(e.target));

      // @namespace Map
      // @section Layer events
      // @event baselayerchange: LayersControlEvent
      // Fired when the base layer is changed through the [layers control](#control-layers).
      // @event overlayadd: LayersControlEvent
      // Fired when an overlay is selected through the [layers control](#control-layers).
      // @event overlayremove: LayersControlEvent
      // Fired when an overlay is deselected through the [layers control](#control-layers).
      // @namespace Control.Layers
      var type = obj.overlay ? e.type === 'add' ? 'overlayadd' : 'overlayremove' : e.type === 'add' ? 'baselayerchange' : null;
      if (type) {
        this._map.fire(type, obj);
      }
    },
    // IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see https://stackoverflow.com/a/119079)
    _createRadioElement: function (name, checked) {
      var radioHtml = '<input type="radio" class="leaflet-control-layers-selector" name="' + name + '"' + (checked ? ' checked="checked"' : '') + '/>';
      var radioFragment = document.createElement('div');
      radioFragment.innerHTML = radioHtml;
      return radioFragment.firstChild;
    },
    _addItem: function (obj) {
      var label = document.createElement('label'),
        checked = this._map.hasLayer(obj.layer),
        input;
      if (obj.overlay) {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'leaflet-control-layers-selector';
        input.defaultChecked = checked;
      } else {
        input = this._createRadioElement('leaflet-base-layers_' + stamp(this), checked);
      }
      this._layerControlInputs.push(input);
      input.layerId = stamp(obj.layer);
      on(input, 'click', this._onInputClick, this);
      var name = document.createElement('span');
      name.innerHTML = ' ' + obj.name;

      // Helps from preventing layer control flicker when checkboxes are disabled
      // https://github.com/Leaflet/Leaflet/issues/2771
      var holder = document.createElement('span');
      label.appendChild(holder);
      holder.appendChild(input);
      holder.appendChild(name);
      var container = obj.overlay ? this._overlaysList : this._baseLayersList;
      container.appendChild(label);
      this._checkDisabledLayers();
      return label;
    },
    _onInputClick: function () {
      // expanding the control on mobile with a click can cause adding a layer - we don't want this
      if (this._preventClick) {
        return;
      }
      var inputs = this._layerControlInputs,
        input,
        layer;
      var addedLayers = [],
        removedLayers = [];
      this._handlingClick = true;
      for (var i = inputs.length - 1; i >= 0; i--) {
        input = inputs[i];
        layer = this._getLayer(input.layerId).layer;
        if (input.checked) {
          addedLayers.push(layer);
        } else if (!input.checked) {
          removedLayers.push(layer);
        }
      }

      // Bugfix issue 2318: Should remove all old layers before readding new ones
      for (i = 0; i < removedLayers.length; i++) {
        if (this._map.hasLayer(removedLayers[i])) {
          this._map.removeLayer(removedLayers[i]);
        }
      }
      for (i = 0; i < addedLayers.length; i++) {
        if (!this._map.hasLayer(addedLayers[i])) {
          this._map.addLayer(addedLayers[i]);
        }
      }
      this._handlingClick = false;
      this._refocusOnMap();
    },
    _checkDisabledLayers: function () {
      var inputs = this._layerControlInputs,
        input,
        layer,
        zoom = this._map.getZoom();
      for (var i = inputs.length - 1; i >= 0; i--) {
        input = inputs[i];
        layer = this._getLayer(input.layerId).layer;
        input.disabled = layer.options.minZoom !== undefined && zoom < layer.options.minZoom || layer.options.maxZoom !== undefined && zoom > layer.options.maxZoom;
      }
    },
    _expandIfNotCollapsed: function () {
      if (this._map && !this.options.collapsed) {
        this.expand();
      }
      return this;
    },
    _expandSafely: function () {
      var section = this._section;
      this._preventClick = true;
      on(section, 'click', preventDefault);
      this.expand();
      var that = this;
      setTimeout(function () {
        off(section, 'click', preventDefault);
        that._preventClick = false;
      });
    }
  });

  // @factory L.control.layers(baselayers?: Object, overlays?: Object, options?: Control.Layers options)
  // Creates a layers control with the given layers. Base layers will be switched with radio buttons, while overlays will be switched with checkboxes. Note that all base layers should be passed in the base layers object, but only one should be added to the map during map instantiation.
  var layers = function (baseLayers, overlays, options) {
    return new Layers(baseLayers, overlays, options);
  };

  /*
   * @class Control.Zoom
   * @aka L.Control.Zoom
   * @inherits Control
   *
   * A basic zoom control with two buttons (zoom in and zoom out). It is put on the map by default unless you set its [`zoomControl` option](#map-zoomcontrol) to `false`. Extends `Control`.
   */

  var Zoom = Control.extend({
    // @section
    // @aka Control.Zoom options
    options: {
      position: 'topleft',
      // @option zoomInText: String = '<span aria-hidden="true">+</span>'
      // The text set on the 'zoom in' button.
      zoomInText: '<span aria-hidden="true">+</span>',
      // @option zoomInTitle: String = 'Zoom in'
      // The title set on the 'zoom in' button.
      zoomInTitle: 'Zoom in',
      // @option zoomOutText: String = '<span aria-hidden="true">&#x2212;</span>'
      // The text set on the 'zoom out' button.
      zoomOutText: '<span aria-hidden="true">&#x2212;</span>',
      // @option zoomOutTitle: String = 'Zoom out'
      // The title set on the 'zoom out' button.
      zoomOutTitle: 'Zoom out'
    },
    onAdd: function (map) {
      var zoomName = 'leaflet-control-zoom',
        container = create$1('div', zoomName + ' leaflet-bar'),
        options = this.options;
      this._zoomInButton = this._createButton(options.zoomInText, options.zoomInTitle, zoomName + '-in', container, this._zoomIn);
      this._zoomOutButton = this._createButton(options.zoomOutText, options.zoomOutTitle, zoomName + '-out', container, this._zoomOut);
      this._updateDisabled();
      map.on('zoomend zoomlevelschange', this._updateDisabled, this);
      return container;
    },
    onRemove: function (map) {
      map.off('zoomend zoomlevelschange', this._updateDisabled, this);
    },
    disable: function () {
      this._disabled = true;
      this._updateDisabled();
      return this;
    },
    enable: function () {
      this._disabled = false;
      this._updateDisabled();
      return this;
    },
    _zoomIn: function (e) {
      if (!this._disabled && this._map._zoom < this._map.getMaxZoom()) {
        this._map.zoomIn(this._map.options.zoomDelta * (e.shiftKey ? 3 : 1));
      }
    },
    _zoomOut: function (e) {
      if (!this._disabled && this._map._zoom > this._map.getMinZoom()) {
        this._map.zoomOut(this._map.options.zoomDelta * (e.shiftKey ? 3 : 1));
      }
    },
    _createButton: function (html, title, className, container, fn) {
      var link = create$1('a', className, container);
      link.innerHTML = html;
      link.href = '#';
      link.title = title;

      /*
       * Will force screen readers like VoiceOver to read this as "Zoom in - button"
       */
      link.setAttribute('role', 'button');
      link.setAttribute('aria-label', title);
      disableClickPropagation(link);
      on(link, 'click', stop);
      on(link, 'click', fn, this);
      on(link, 'click', this._refocusOnMap, this);
      return link;
    },
    _updateDisabled: function () {
      var map = this._map,
        className = 'leaflet-disabled';
      removeClass(this._zoomInButton, className);
      removeClass(this._zoomOutButton, className);
      this._zoomInButton.setAttribute('aria-disabled', 'false');
      this._zoomOutButton.setAttribute('aria-disabled', 'false');
      if (this._disabled || map._zoom === map.getMinZoom()) {
        addClass(this._zoomOutButton, className);
        this._zoomOutButton.setAttribute('aria-disabled', 'true');
      }
      if (this._disabled || map._zoom === map.getMaxZoom()) {
        addClass(this._zoomInButton, className);
        this._zoomInButton.setAttribute('aria-disabled', 'true');
      }
    }
  });

  // @namespace Map
  // @section Control options
  // @option zoomControl: Boolean = true
  // Whether a [zoom control](#control-zoom) is added to the map by default.
  Map.mergeOptions({
    zoomControl: true
  });
  Map.addInitHook(function () {
    if (this.options.zoomControl) {
      // @section Controls
      // @property zoomControl: Control.Zoom
      // The default zoom control (only available if the
      // [`zoomControl` option](#map-zoomcontrol) was `true` when creating the map).
      this.zoomControl = new Zoom();
      this.addControl(this.zoomControl);
    }
  });

  // @namespace Control.Zoom
  // @factory L.control.zoom(options: Control.Zoom options)
  // Creates a zoom control
  var zoom = function (options) {
    return new Zoom(options);
  };

  /*
   * @class Control.Scale
   * @aka L.Control.Scale
   * @inherits Control
   *
   * A simple scale control that shows the scale of the current center of screen in metric (m/km) and imperial (mi/ft) systems. Extends `Control`.
   *
   * @example
   *
   * ```js
   * L.control.scale().addTo(map);
   * ```
   */

  var Scale = Control.extend({
    // @section
    // @aka Control.Scale options
    options: {
      position: 'bottomleft',
      // @option maxWidth: Number = 100
      // Maximum width of the control in pixels. The width is set dynamically to show round values (e.g. 100, 200, 500).
      maxWidth: 100,
      // @option metric: Boolean = True
      // Whether to show the metric scale line (m/km).
      metric: true,
      // @option imperial: Boolean = True
      // Whether to show the imperial scale line (mi/ft).
      imperial: true

      // @option updateWhenIdle: Boolean = false
      // If `true`, the control is updated on [`moveend`](#map-moveend), otherwise it's always up-to-date (updated on [`move`](#map-move)).
    },
    onAdd: function (map) {
      var className = 'leaflet-control-scale',
        container = create$1('div', className),
        options = this.options;
      this._addScales(options, className + '-line', container);
      map.on(options.updateWhenIdle ? 'moveend' : 'move', this._update, this);
      map.whenReady(this._update, this);
      return container;
    },
    onRemove: function (map) {
      map.off(this.options.updateWhenIdle ? 'moveend' : 'move', this._update, this);
    },
    _addScales: function (options, className, container) {
      if (options.metric) {
        this._mScale = create$1('div', className, container);
      }
      if (options.imperial) {
        this._iScale = create$1('div', className, container);
      }
    },
    _update: function () {
      var map = this._map,
        y = map.getSize().y / 2;
      var maxMeters = map.distance(map.containerPointToLatLng([0, y]), map.containerPointToLatLng([this.options.maxWidth, y]));
      this._updateScales(maxMeters);
    },
    _updateScales: function (maxMeters) {
      if (this.options.metric && maxMeters) {
        this._updateMetric(maxMeters);
      }
      if (this.options.imperial && maxMeters) {
        this._updateImperial(maxMeters);
      }
    },
    _updateMetric: function (maxMeters) {
      var meters = this._getRoundNum(maxMeters),
        label = meters < 1000 ? meters + ' m' : meters / 1000 + ' km';
      this._updateScale(this._mScale, label, meters / maxMeters);
    },
    _updateImperial: function (maxMeters) {
      var maxFeet = maxMeters * 3.2808399,
        maxMiles,
        miles,
        feet;
      if (maxFeet > 5280) {
        maxMiles = maxFeet / 5280;
        miles = this._getRoundNum(maxMiles);
        this._updateScale(this._iScale, miles + ' mi', miles / maxMiles);
      } else {
        feet = this._getRoundNum(maxFeet);
        this._updateScale(this._iScale, feet + ' ft', feet / maxFeet);
      }
    },
    _updateScale: function (scale, text, ratio) {
      scale.style.width = Math.round(this.options.maxWidth * ratio) + 'px';
      scale.innerHTML = text;
    },
    _getRoundNum: function (num) {
      var pow10 = Math.pow(10, (Math.floor(num) + '').length - 1),
        d = num / pow10;
      d = d >= 10 ? 10 : d >= 5 ? 5 : d >= 3 ? 3 : d >= 2 ? 2 : 1;
      return pow10 * d;
    }
  });

  // @factory L.control.scale(options?: Control.Scale options)
  // Creates an scale control with the given options.
  var scale = function (options) {
    return new Scale(options);
  };
  var ukrainianFlag = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" class="leaflet-attribution-flag"><path fill="#4C7BE1" d="M0 0h12v4H0z"/><path fill="#FFD500" d="M0 4h12v3H0z"/><path fill="#E0BC00" d="M0 7h12v1H0z"/></svg>';

  /*
   * @class Control.Attribution
   * @aka L.Control.Attribution
   * @inherits Control
   *
   * The attribution control allows you to display attribution data in a small text box on a map. It is put on the map by default unless you set its [`attributionControl` option](#map-attributioncontrol) to `false`, and it fetches attribution texts from layers with the [`getAttribution` method](#layer-getattribution) automatically. Extends Control.
   */

  var Attribution = Control.extend({
    // @section
    // @aka Control.Attribution options
    options: {
      position: 'bottomright',
      // @option prefix: String|false = 'Leaflet'
      // The HTML text shown before the attributions. Pass `false` to disable.
      prefix: '<a href="https://leafletjs.com" title="A JavaScript library for interactive maps">' + (Browser.inlineSvg ? ukrainianFlag + ' ' : '') + 'Leaflet</a>'
    },
    initialize: function (options) {
      setOptions(this, options);
      this._attributions = {};
    },
    onAdd: function (map) {
      map.attributionControl = this;
      this._container = create$1('div', 'leaflet-control-attribution');
      disableClickPropagation(this._container);

      // TODO ugly, refactor
      for (var i in map._layers) {
        if (map._layers[i].getAttribution) {
          this.addAttribution(map._layers[i].getAttribution());
        }
      }
      this._update();
      map.on('layeradd', this._addAttribution, this);
      return this._container;
    },
    onRemove: function (map) {
      map.off('layeradd', this._addAttribution, this);
    },
    _addAttribution: function (ev) {
      if (ev.layer.getAttribution) {
        this.addAttribution(ev.layer.getAttribution());
        ev.layer.once('remove', function () {
          this.removeAttribution(ev.layer.getAttribution());
        }, this);
      }
    },
    // @method setPrefix(prefix: String|false): this
    // The HTML text shown before the attributions. Pass `false` to disable.
    setPrefix: function (prefix) {
      this.options.prefix = prefix;
      this._update();
      return this;
    },
    // @method addAttribution(text: String): this
    // Adds an attribution text (e.g. `'&copy; OpenStreetMap contributors'`).
    addAttribution: function (text) {
      if (!text) {
        return this;
      }
      if (!this._attributions[text]) {
        this._attributions[text] = 0;
      }
      this._attributions[text]++;
      this._update();
      return this;
    },
    // @method removeAttribution(text: String): this
    // Removes an attribution text.
    removeAttribution: function (text) {
      if (!text) {
        return this;
      }
      if (this._attributions[text]) {
        this._attributions[text]--;
        this._update();
      }
      return this;
    },
    _update: function () {
      if (!this._map) {
        return;
      }
      var attribs = [];
      for (var i in this._attributions) {
        if (this._attributions[i]) {
          attribs.push(i);
        }
      }
      var prefixAndAttribs = [];
      if (this.options.prefix) {
        prefixAndAttribs.push(this.options.prefix);
      }
      if (attribs.length) {
        prefixAndAttribs.push(attribs.join(', '));
      }
      this._container.innerHTML = prefixAndAttribs.join(' <span aria-hidden="true">|</span> ');
    }
  });

  // @namespace Map
  // @section Control options
  // @option attributionControl: Boolean = true
  // Whether a [attribution control](#control-attribution) is added to the map by default.
  Map.mergeOptions({
    attributionControl: true
  });
  Map.addInitHook(function () {
    if (this.options.attributionControl) {
      new Attribution().addTo(this);
    }
  });

  // @namespace Control.Attribution
  // @factory L.control.attribution(options: Control.Attribution options)
  // Creates an attribution control.
  var attribution = function (options) {
    return new Attribution(options);
  };
  Control.Layers = Layers;
  Control.Zoom = Zoom;
  Control.Scale = Scale;
  Control.Attribution = Attribution;
  control.layers = layers;
  control.zoom = zoom;
  control.scale = scale;
  control.attribution = attribution;

  /*
  	L.Handler is a base class for handler classes that are used internally to inject
  	interaction features like dragging to classes like Map and Marker.
  */

  // @class Handler
  // @aka L.Handler
  // Abstract class for map interaction handlers

  var Handler = Class.extend({
    initialize: function (map) {
      this._map = map;
    },
    // @method enable(): this
    // Enables the handler
    enable: function () {
      if (this._enabled) {
        return this;
      }
      this._enabled = true;
      this.addHooks();
      return this;
    },
    // @method disable(): this
    // Disables the handler
    disable: function () {
      if (!this._enabled) {
        return this;
      }
      this._enabled = false;
      this.removeHooks();
      return this;
    },
    // @method enabled(): Boolean
    // Returns `true` if the handler is enabled
    enabled: function () {
      return !!this._enabled;
    }

    // @section Extension methods
    // Classes inheriting from `Handler` must implement the two following methods:
    // @method addHooks()
    // Called when the handler is enabled, should add event hooks.
    // @method removeHooks()
    // Called when the handler is disabled, should remove the event hooks added previously.
  });

  // @section There is static function which can be called without instantiating L.Handler:
  // @function addTo(map: Map, name: String): this
  // Adds a new Handler to the given map with the given name.
  Handler.addTo = function (map, name) {
    map.addHandler(name, this);
    return this;
  };
  var Mixin = {
    Events: Events
  };

  /*
   * @class Draggable
   * @aka L.Draggable
   * @inherits Evented
   *
   * A class for making DOM elements draggable (including touch support).
   * Used internally for map and marker dragging. Only works for elements
   * that were positioned with [`L.DomUtil.setPosition`](#domutil-setposition).
   *
   * @example
   * ```js
   * var draggable = new L.Draggable(elementToDrag);
   * draggable.enable();
   * ```
   */

  var START = Browser.touch ? 'touchstart mousedown' : 'mousedown';
  var Draggable = Evented.extend({
    options: {
      // @section
      // @aka Draggable options
      // @option clickTolerance: Number = 3
      // The max number of pixels a user can shift the mouse pointer during a click
      // for it to be considered a valid click (as opposed to a mouse drag).
      clickTolerance: 3
    },
    // @constructor L.Draggable(el: HTMLElement, dragHandle?: HTMLElement, preventOutline?: Boolean, options?: Draggable options)
    // Creates a `Draggable` object for moving `el` when you start dragging the `dragHandle` element (equals `el` itself by default).
    initialize: function (element, dragStartTarget, preventOutline, options) {
      setOptions(this, options);
      this._element = element;
      this._dragStartTarget = dragStartTarget || element;
      this._preventOutline = preventOutline;
    },
    // @method enable()
    // Enables the dragging ability
    enable: function () {
      if (this._enabled) {
        return;
      }
      on(this._dragStartTarget, START, this._onDown, this);
      this._enabled = true;
    },
    // @method disable()
    // Disables the dragging ability
    disable: function () {
      if (!this._enabled) {
        return;
      }

      // If we're currently dragging this draggable,
      // disabling it counts as first ending the drag.
      if (Draggable._dragging === this) {
        this.finishDrag(true);
      }
      off(this._dragStartTarget, START, this._onDown, this);
      this._enabled = false;
      this._moved = false;
    },
    _onDown: function (e) {
      // Ignore the event if disabled; this happens in IE11
      // under some circumstances, see #3666.
      if (!this._enabled) {
        return;
      }
      this._moved = false;
      if (hasClass(this._element, 'leaflet-zoom-anim')) {
        return;
      }
      if (e.touches && e.touches.length !== 1) {
        // Finish dragging to avoid conflict with touchZoom
        if (Draggable._dragging === this) {
          this.finishDrag();
        }
        return;
      }
      if (Draggable._dragging || e.shiftKey || e.which !== 1 && e.button !== 1 && !e.touches) {
        return;
      }
      Draggable._dragging = this; // Prevent dragging multiple objects at once.

      if (this._preventOutline) {
        preventOutline(this._element);
      }
      disableImageDrag();
      disableTextSelection();
      if (this._moving) {
        return;
      }

      // @event down: Event
      // Fired when a drag is about to start.
      this.fire('down');
      var first = e.touches ? e.touches[0] : e,
        sizedParent = getSizedParentNode(this._element);
      this._startPoint = new Point(first.clientX, first.clientY);
      this._startPos = getPosition(this._element);

      // Cache the scale, so that we can continuously compensate for it during drag (_onMove).
      this._parentScale = getScale(sizedParent);
      var mouseevent = e.type === 'mousedown';
      on(document, mouseevent ? 'mousemove' : 'touchmove', this._onMove, this);
      on(document, mouseevent ? 'mouseup' : 'touchend touchcancel', this._onUp, this);
    },
    _onMove: function (e) {
      // Ignore the event if disabled; this happens in IE11
      // under some circumstances, see #3666.
      if (!this._enabled) {
        return;
      }
      if (e.touches && e.touches.length > 1) {
        this._moved = true;
        return;
      }
      var first = e.touches && e.touches.length === 1 ? e.touches[0] : e,
        offset = new Point(first.clientX, first.clientY)._subtract(this._startPoint);
      if (!offset.x && !offset.y) {
        return;
      }
      if (Math.abs(offset.x) + Math.abs(offset.y) < this.options.clickTolerance) {
        return;
      }

      // We assume that the parent container's position, border and scale do not change for the duration of the drag.
      // Therefore there is no need to account for the position and border (they are eliminated by the subtraction)
      // and we can use the cached value for the scale.
      offset.x /= this._parentScale.x;
      offset.y /= this._parentScale.y;
      preventDefault(e);
      if (!this._moved) {
        // @event dragstart: Event
        // Fired when a drag starts
        this.fire('dragstart');
        this._moved = true;
        addClass(document.body, 'leaflet-dragging');
        this._lastTarget = e.target || e.srcElement;
        // IE and Edge do not give the <use> element, so fetch it
        // if necessary
        if (window.SVGElementInstance && this._lastTarget instanceof window.SVGElementInstance) {
          this._lastTarget = this._lastTarget.correspondingUseElement;
        }
        addClass(this._lastTarget, 'leaflet-drag-target');
      }
      this._newPos = this._startPos.add(offset);
      this._moving = true;
      this._lastEvent = e;
      this._updatePosition();
    },
    _updatePosition: function () {
      var e = {
        originalEvent: this._lastEvent
      };

      // @event predrag: Event
      // Fired continuously during dragging *before* each corresponding
      // update of the element's position.
      this.fire('predrag', e);
      setPosition(this._element, this._newPos);

      // @event drag: Event
      // Fired continuously during dragging.
      this.fire('drag', e);
    },
    _onUp: function () {
      // Ignore the event if disabled; this happens in IE11
      // under some circumstances, see #3666.
      if (!this._enabled) {
        return;
      }
      this.finishDrag();
    },
    finishDrag: function (noInertia) {
      removeClass(document.body, 'leaflet-dragging');
      if (this._lastTarget) {
        removeClass(this._lastTarget, 'leaflet-drag-target');
        this._lastTarget = null;
      }
      off(document, 'mousemove touchmove', this._onMove, this);
      off(document, 'mouseup touchend touchcancel', this._onUp, this);
      enableImageDrag();
      enableTextSelection();
      var fireDragend = this._moved && this._moving;
      this._moving = false;
      Draggable._dragging = false;
      if (fireDragend) {
        // @event dragend: DragEndEvent
        // Fired when the drag ends.
        this.fire('dragend', {
          noInertia: noInertia,
          distance: this._newPos.distanceTo(this._startPos)
        });
      }
    }
  });

  /*
   * @namespace PolyUtil
   * Various utility functions for polygon geometries.
   */

  /* @function clipPolygon(points: Point[], bounds: Bounds, round?: Boolean): Point[]
   * Clips the polygon geometry defined by the given `points` by the given bounds (using the [Sutherland-Hodgman algorithm](https://en.wikipedia.org/wiki/Sutherland%E2%80%93Hodgman_algorithm)).
   * Used by Leaflet to only show polygon points that are on the screen or near, increasing
   * performance. Note that polygon points needs different algorithm for clipping
   * than polyline, so there's a separate method for it.
   */
  function clipPolygon(points, bounds, round) {
    var clippedPoints,
      edges = [1, 4, 2, 8],
      i,
      j,
      k,
      a,
      b,
      len,
      edge,
      p;
    for (i = 0, len = points.length; i < len; i++) {
      points[i]._code = _getBitCode(points[i], bounds);
    }

    // for each edge (left, bottom, right, top)
    for (k = 0; k < 4; k++) {
      edge = edges[k];
      clippedPoints = [];
      for (i = 0, len = points.length, j = len - 1; i < len; j = i++) {
        a = points[i];
        b = points[j];

        // if a is inside the clip window
        if (!(a._code & edge)) {
          // if b is outside the clip window (a->b goes out of screen)
          if (b._code & edge) {
            p = _getEdgeIntersection(b, a, edge, bounds, round);
            p._code = _getBitCode(p, bounds);
            clippedPoints.push(p);
          }
          clippedPoints.push(a);

          // else if b is inside the clip window (a->b enters the screen)
        } else if (!(b._code & edge)) {
          p = _getEdgeIntersection(b, a, edge, bounds, round);
          p._code = _getBitCode(p, bounds);
          clippedPoints.push(p);
        }
      }
      points = clippedPoints;
    }
    return points;
  }

  /* @function polygonCenter(latlngs: LatLng[], crs: CRS): LatLng
   * Returns the center ([centroid](http://en.wikipedia.org/wiki/Centroid)) of the passed LatLngs (first ring) from a polygon.
   */
  function polygonCenter(latlngs, crs) {
    var i, j, p1, p2, f, area, x, y, center;
    if (!latlngs || latlngs.length === 0) {
      throw new Error('latlngs not passed');
    }
    if (!isFlat(latlngs)) {
      console.warn('latlngs are not flat! Only the first ring will be used');
      latlngs = latlngs[0];
    }
    var centroidLatLng = toLatLng([0, 0]);
    var bounds = toLatLngBounds(latlngs);
    var areaBounds = bounds.getNorthWest().distanceTo(bounds.getSouthWest()) * bounds.getNorthEast().distanceTo(bounds.getNorthWest());
    // tests showed that below 1700 rounding errors are happening
    if (areaBounds < 1700) {
      // getting a inexact center, to move the latlngs near to [0, 0] to prevent rounding errors
      centroidLatLng = centroid(latlngs);
    }
    var len = latlngs.length;
    var points = [];
    for (i = 0; i < len; i++) {
      var latlng = toLatLng(latlngs[i]);
      points.push(crs.project(toLatLng([latlng.lat - centroidLatLng.lat, latlng.lng - centroidLatLng.lng])));
    }
    area = x = y = 0;

    // polygon centroid algorithm;
    for (i = 0, j = len - 1; i < len; j = i++) {
      p1 = points[i];
      p2 = points[j];
      f = p1.y * p2.x - p2.y * p1.x;
      x += (p1.x + p2.x) * f;
      y += (p1.y + p2.y) * f;
      area += f * 3;
    }
    if (area === 0) {
      // Polygon is so small that all points are on same pixel.
      center = points[0];
    } else {
      center = [x / area, y / area];
    }
    var latlngCenter = crs.unproject(toPoint(center));
    return toLatLng([latlngCenter.lat + centroidLatLng.lat, latlngCenter.lng + centroidLatLng.lng]);
  }

  /* @function centroid(latlngs: LatLng[]): LatLng
   * Returns the 'center of mass' of the passed LatLngs.
   */
  function centroid(coords) {
    var latSum = 0;
    var lngSum = 0;
    var len = 0;
    for (var i = 0; i < coords.length; i++) {
      var latlng = toLatLng(coords[i]);
      latSum += latlng.lat;
      lngSum += latlng.lng;
      len++;
    }
    return toLatLng([latSum / len, lngSum / len]);
  }
  var PolyUtil = {
    __proto__: null,
    clipPolygon: clipPolygon,
    polygonCenter: polygonCenter,
    centroid: centroid
  };

  /*
   * @namespace LineUtil
   *
   * Various utility functions for polyline points processing, used by Leaflet internally to make polylines lightning-fast.
   */

  // Simplify polyline with vertex reduction and Douglas-Peucker simplification.
  // Improves rendering performance dramatically by lessening the number of points to draw.

  // @function simplify(points: Point[], tolerance: Number): Point[]
  // Dramatically reduces the number of points in a polyline while retaining
  // its shape and returns a new array of simplified points, using the
  // [Ramer-Douglas-Peucker algorithm](https://en.wikipedia.org/wiki/Ramer-Douglas-Peucker_algorithm).
  // Used for a huge performance boost when processing/displaying Leaflet polylines for
  // each zoom level and also reducing visual noise. tolerance affects the amount of
  // simplification (lesser value means higher quality but slower and with more points).
  // Also released as a separated micro-library [Simplify.js](https://mourner.github.io/simplify-js/).
  function simplify(points, tolerance) {
    if (!tolerance || !points.length) {
      return points.slice();
    }
    var sqTolerance = tolerance * tolerance;

    // stage 1: vertex reduction
    points = _reducePoints(points, sqTolerance);

    // stage 2: Douglas-Peucker simplification
    points = _simplifyDP(points, sqTolerance);
    return points;
  }

  // @function pointToSegmentDistance(p: Point, p1: Point, p2: Point): Number
  // Returns the distance between point `p` and segment `p1` to `p2`.
  function pointToSegmentDistance(p, p1, p2) {
    return Math.sqrt(_sqClosestPointOnSegment(p, p1, p2, true));
  }

  // @function closestPointOnSegment(p: Point, p1: Point, p2: Point): Number
  // Returns the closest point from a point `p` on a segment `p1` to `p2`.
  function closestPointOnSegment(p, p1, p2) {
    return _sqClosestPointOnSegment(p, p1, p2);
  }

  // Ramer-Douglas-Peucker simplification, see https://en.wikipedia.org/wiki/Ramer-Douglas-Peucker_algorithm
  function _simplifyDP(points, sqTolerance) {
    var len = points.length,
      ArrayConstructor = typeof Uint8Array !== undefined + '' ? Uint8Array : Array,
      markers = new ArrayConstructor(len);
    markers[0] = markers[len - 1] = 1;
    _simplifyDPStep(points, markers, sqTolerance, 0, len - 1);
    var i,
      newPoints = [];
    for (i = 0; i < len; i++) {
      if (markers[i]) {
        newPoints.push(points[i]);
      }
    }
    return newPoints;
  }
  function _simplifyDPStep(points, markers, sqTolerance, first, last) {
    var maxSqDist = 0,
      index,
      i,
      sqDist;
    for (i = first + 1; i <= last - 1; i++) {
      sqDist = _sqClosestPointOnSegment(points[i], points[first], points[last], true);
      if (sqDist > maxSqDist) {
        index = i;
        maxSqDist = sqDist;
      }
    }
    if (maxSqDist > sqTolerance) {
      markers[index] = 1;
      _simplifyDPStep(points, markers, sqTolerance, first, index);
      _simplifyDPStep(points, markers, sqTolerance, index, last);
    }
  }

  // reduce points that are too close to each other to a single point
  function _reducePoints(points, sqTolerance) {
    var reducedPoints = [points[0]];
    for (var i = 1, prev = 0, len = points.length; i < len; i++) {
      if (_sqDist(points[i], points[prev]) > sqTolerance) {
        reducedPoints.push(points[i]);
        prev = i;
      }
    }
    if (prev < len - 1) {
      reducedPoints.push(points[len - 1]);
    }
    return reducedPoints;
  }
  var _lastCode;

  // @function clipSegment(a: Point, b: Point, bounds: Bounds, useLastCode?: Boolean, round?: Boolean): Point[]|Boolean
  // Clips the segment a to b by rectangular bounds with the
  // [Cohen-Sutherland algorithm](https://en.wikipedia.org/wiki/Cohen%E2%80%93Sutherland_algorithm)
  // (modifying the segment points directly!). Used by Leaflet to only show polyline
  // points that are on the screen or near, increasing performance.
  function clipSegment(a, b, bounds, useLastCode, round) {
    var codeA = useLastCode ? _lastCode : _getBitCode(a, bounds),
      codeB = _getBitCode(b, bounds),
      codeOut,
      p,
      newCode;

    // save 2nd code to avoid calculating it on the next segment
    _lastCode = codeB;
    while (true) {
      // if a,b is inside the clip window (trivial accept)
      if (!(codeA | codeB)) {
        return [a, b];
      }

      // if a,b is outside the clip window (trivial reject)
      if (codeA & codeB) {
        return false;
      }

      // other cases
      codeOut = codeA || codeB;
      p = _getEdgeIntersection(a, b, codeOut, bounds, round);
      newCode = _getBitCode(p, bounds);
      if (codeOut === codeA) {
        a = p;
        codeA = newCode;
      } else {
        b = p;
        codeB = newCode;
      }
    }
  }
  function _getEdgeIntersection(a, b, code, bounds, round) {
    var dx = b.x - a.x,
      dy = b.y - a.y,
      min = bounds.min,
      max = bounds.max,
      x,
      y;
    if (code & 8) {
      // top
      x = a.x + dx * (max.y - a.y) / dy;
      y = max.y;
    } else if (code & 4) {
      // bottom
      x = a.x + dx * (min.y - a.y) / dy;
      y = min.y;
    } else if (code & 2) {
      // right
      x = max.x;
      y = a.y + dy * (max.x - a.x) / dx;
    } else if (code & 1) {
      // left
      x = min.x;
      y = a.y + dy * (min.x - a.x) / dx;
    }
    return new Point(x, y, round);
  }
  function _getBitCode(p, bounds) {
    var code = 0;
    if (p.x < bounds.min.x) {
      // left
      code |= 1;
    } else if (p.x > bounds.max.x) {
      // right
      code |= 2;
    }
    if (p.y < bounds.min.y) {
      // bottom
      code |= 4;
    } else if (p.y > bounds.max.y) {
      // top
      code |= 8;
    }
    return code;
  }

  // square distance (to avoid unnecessary Math.sqrt calls)
  function _sqDist(p1, p2) {
    var dx = p2.x - p1.x,
      dy = p2.y - p1.y;
    return dx * dx + dy * dy;
  }

  // return closest point on segment or distance to that point
  function _sqClosestPointOnSegment(p, p1, p2, sqDist) {
    var x = p1.x,
      y = p1.y,
      dx = p2.x - x,
      dy = p2.y - y,
      dot = dx * dx + dy * dy,
      t;
    if (dot > 0) {
      t = ((p.x - x) * dx + (p.y - y) * dy) / dot;
      if (t > 1) {
        x = p2.x;
        y = p2.y;
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }
    dx = p.x - x;
    dy = p.y - y;
    return sqDist ? dx * dx + dy * dy : new Point(x, y);
  }

  // @function isFlat(latlngs: LatLng[]): Boolean
  // Returns true if `latlngs` is a flat array, false is nested.
  function isFlat(latlngs) {
    return !isArray(latlngs[0]) || typeof latlngs[0][0] !== 'object' && typeof latlngs[0][0] !== 'undefined';
  }
  function _flat(latlngs) {
    console.warn('Deprecated use of _flat, please use L.LineUtil.isFlat instead.');
    return isFlat(latlngs);
  }

  /* @function polylineCenter(latlngs: LatLng[], crs: CRS): LatLng
   * Returns the center ([centroid](http://en.wikipedia.org/wiki/Centroid)) of the passed LatLngs (first ring) from a polyline.
   */
  function polylineCenter(latlngs, crs) {
    var i, halfDist, segDist, dist, p1, p2, ratio, center;
    if (!latlngs || latlngs.length === 0) {
      throw new Error('latlngs not passed');
    }
    if (!isFlat(latlngs)) {
      console.warn('latlngs are not flat! Only the first ring will be used');
      latlngs = latlngs[0];
    }
    var centroidLatLng = toLatLng([0, 0]);
    var bounds = toLatLngBounds(latlngs);
    var areaBounds = bounds.getNorthWest().distanceTo(bounds.getSouthWest()) * bounds.getNorthEast().distanceTo(bounds.getNorthWest());
    // tests showed that below 1700 rounding errors are happening
    if (areaBounds < 1700) {
      // getting a inexact center, to move the latlngs near to [0, 0] to prevent rounding errors
      centroidLatLng = centroid(latlngs);
    }
    var len = latlngs.length;
    var points = [];
    for (i = 0; i < len; i++) {
      var latlng = toLatLng(latlngs[i]);
      points.push(crs.project(toLatLng([latlng.lat - centroidLatLng.lat, latlng.lng - centroidLatLng.lng])));
    }
    for (i = 0, halfDist = 0; i < len - 1; i++) {
      halfDist += points[i].distanceTo(points[i + 1]) / 2;
    }

    // The line is so small in the current view that all points are on the same pixel.
    if (halfDist === 0) {
      center = points[0];
    } else {
      for (i = 0, dist = 0; i < len - 1; i++) {
        p1 = points[i];
        p2 = points[i + 1];
        segDist = p1.distanceTo(p2);
        dist += segDist;
        if (dist > halfDist) {
          ratio = (dist - halfDist) / segDist;
          center = [p2.x - ratio * (p2.x - p1.x), p2.y - ratio * (p2.y - p1.y)];
          break;
        }
      }
    }
    var latlngCenter = crs.unproject(toPoint(center));
    return toLatLng([latlngCenter.lat + centroidLatLng.lat, latlngCenter.lng + centroidLatLng.lng]);
  }
  var LineUtil = {
    __proto__: null,
    simplify: simplify,
    pointToSegmentDistance: pointToSegmentDistance,
    closestPointOnSegment: closestPointOnSegment,
    clipSegment: clipSegment,
    _getEdgeIntersection: _getEdgeIntersection,
    _getBitCode: _getBitCode,
    _sqClosestPointOnSegment: _sqClosestPointOnSegment,
    isFlat: isFlat,
    _flat: _flat,
    polylineCenter: polylineCenter
  };

  /*
   * @namespace Projection
   * @section
   * Leaflet comes with a set of already defined Projections out of the box:
   *
   * @projection L.Projection.LonLat
   *
   * Equirectangular, or Plate Carree projection — the most simple projection,
   * mostly used by GIS enthusiasts. Directly maps `x` as longitude, and `y` as
   * latitude. Also suitable for flat worlds, e.g. game maps. Used by the
   * `EPSG:4326` and `Simple` CRS.
   */

  var LonLat = {
    project: function (latlng) {
      return new Point(latlng.lng, latlng.lat);
    },
    unproject: function (point) {
      return new LatLng(point.y, point.x);
    },
    bounds: new Bounds([-180, -90], [180, 90])
  };

  /*
   * @namespace Projection
   * @projection L.Projection.Mercator
   *
   * Elliptical Mercator projection — more complex than Spherical Mercator. Assumes that Earth is an ellipsoid. Used by the EPSG:3395 CRS.
   */

  var Mercator = {
    R: 6378137,
    R_MINOR: 6356752.314245179,
    bounds: new Bounds([-20037508.34279, -15496570.73972], [20037508.34279, 18764656.23138]),
    project: function (latlng) {
      var d = Math.PI / 180,
        r = this.R,
        y = latlng.lat * d,
        tmp = this.R_MINOR / r,
        e = Math.sqrt(1 - tmp * tmp),
        con = e * Math.sin(y);
      var ts = Math.tan(Math.PI / 4 - y / 2) / Math.pow((1 - con) / (1 + con), e / 2);
      y = -r * Math.log(Math.max(ts, 1E-10));
      return new Point(latlng.lng * d * r, y);
    },
    unproject: function (point) {
      var d = 180 / Math.PI,
        r = this.R,
        tmp = this.R_MINOR / r,
        e = Math.sqrt(1 - tmp * tmp),
        ts = Math.exp(-point.y / r),
        phi = Math.PI / 2 - 2 * Math.atan(ts);
      for (var i = 0, dphi = 0.1, con; i < 15 && Math.abs(dphi) > 1e-7; i++) {
        con = e * Math.sin(phi);
        con = Math.pow((1 - con) / (1 + con), e / 2);
        dphi = Math.PI / 2 - 2 * Math.atan(ts * con) - phi;
        phi += dphi;
      }
      return new LatLng(phi * d, point.x * d / r);
    }
  };

  /*
   * @class Projection
    * An object with methods for projecting geographical coordinates of the world onto
   * a flat surface (and back). See [Map projection](https://en.wikipedia.org/wiki/Map_projection).
    * @property bounds: Bounds
   * The bounds (specified in CRS units) where the projection is valid
    * @method project(latlng: LatLng): Point
   * Projects geographical coordinates into a 2D point.
   * Only accepts actual `L.LatLng` instances, not arrays.
    * @method unproject(point: Point): LatLng
   * The inverse of `project`. Projects a 2D point into a geographical location.
   * Only accepts actual `L.Point` instances, not arrays.
    * Note that the projection instances do not inherit from Leaflet's `Class` object,
   * and can't be instantiated. Also, new classes can't inherit from them,
   * and methods can't be added to them with the `include` function.
    */

  var index = {
    __proto__: null,
    LonLat: LonLat,
    Mercator: Mercator,
    SphericalMercator: SphericalMercator
  };

  /*
   * @namespace CRS
   * @crs L.CRS.EPSG3395
   *
   * Rarely used by some commercial tile providers. Uses Elliptical Mercator projection.
   */
  var EPSG3395 = extend({}, Earth, {
    code: 'EPSG:3395',
    projection: Mercator,
    transformation: function () {
      var scale = 0.5 / (Math.PI * Mercator.R);
      return toTransformation(scale, 0.5, -scale, 0.5);
    }()
  });

  /*
   * @namespace CRS
   * @crs L.CRS.EPSG4326
   *
   * A common CRS among GIS enthusiasts. Uses simple Equirectangular projection.
   *
   * Leaflet 1.0.x complies with the [TMS coordinate scheme for EPSG:4326](https://wiki.osgeo.org/wiki/Tile_Map_Service_Specification#global-geodetic),
   * which is a breaking change from 0.7.x behaviour.  If you are using a `TileLayer`
   * with this CRS, ensure that there are two 256x256 pixel tiles covering the
   * whole earth at zoom level zero, and that the tile coordinate origin is (-180,+90),
   * or (-180,-90) for `TileLayer`s with [the `tms` option](#tilelayer-tms) set.
   */

  var EPSG4326 = extend({}, Earth, {
    code: 'EPSG:4326',
    projection: LonLat,
    transformation: toTransformation(1 / 180, 1, -1 / 180, 0.5)
  });

  /*
   * @namespace CRS
   * @crs L.CRS.Simple
   *
   * A simple CRS that maps longitude and latitude into `x` and `y` directly.
   * May be used for maps of flat surfaces (e.g. game maps). Note that the `y`
   * axis should still be inverted (going from bottom to top). `distance()` returns
   * simple euclidean distance.
   */

  var Simple = extend({}, CRS, {
    projection: LonLat,
    transformation: toTransformation(1, 0, -1, 0),
    scale: function (zoom) {
      return Math.pow(2, zoom);
    },
    zoom: function (scale) {
      return Math.log(scale) / Math.LN2;
    },
    distance: function (latlng1, latlng2) {
      var dx = latlng2.lng - latlng1.lng,
        dy = latlng2.lat - latlng1.lat;
      return Math.sqrt(dx * dx + dy * dy);
    },
    infinite: true
  });
  CRS.Earth = Earth;
  CRS.EPSG3395 = EPSG3395;
  CRS.EPSG3857 = EPSG3857;
  CRS.EPSG900913 = EPSG900913;
  CRS.EPSG4326 = EPSG4326;
  CRS.Simple = Simple;

  /*
   * @class Layer
   * @inherits Evented
   * @aka L.Layer
   * @aka ILayer
   *
   * A set of methods from the Layer base class that all Leaflet layers use.
   * Inherits all methods, options and events from `L.Evented`.
   *
   * @example
   *
   * ```js
   * var layer = L.marker(latlng).addTo(map);
   * layer.addTo(map);
   * layer.remove();
   * ```
   *
   * @event add: Event
   * Fired after the layer is added to a map
   *
   * @event remove: Event
   * Fired after the layer is removed from a map
   */

  var Layer = Evented.extend({
    // Classes extending `L.Layer` will inherit the following options:
    options: {
      // @option pane: String = 'overlayPane'
      // By default the layer will be added to the map's [overlay pane](#map-overlaypane). Overriding this option will cause the layer to be placed on another pane by default.
      pane: 'overlayPane',
      // @option attribution: String = null
      // String to be shown in the attribution control, e.g. "© OpenStreetMap contributors". It describes the layer data and is often a legal obligation towards copyright holders and tile providers.
      attribution: null,
      bubblingMouseEvents: true
    },
    /* @section
     * Classes extending `L.Layer` will inherit the following methods:
     *
     * @method addTo(map: Map|LayerGroup): this
     * Adds the layer to the given map or layer group.
     */
    addTo: function (map) {
      map.addLayer(this);
      return this;
    },
    // @method remove: this
    // Removes the layer from the map it is currently active on.
    remove: function () {
      return this.removeFrom(this._map || this._mapToAdd);
    },
    // @method removeFrom(map: Map): this
    // Removes the layer from the given map
    //
    // @alternative
    // @method removeFrom(group: LayerGroup): this
    // Removes the layer from the given `LayerGroup`
    removeFrom: function (obj) {
      if (obj) {
        obj.removeLayer(this);
      }
      return this;
    },
    // @method getPane(name? : String): HTMLElement
    // Returns the `HTMLElement` representing the named pane on the map. If `name` is omitted, returns the pane for this layer.
    getPane: function (name) {
      return this._map.getPane(name ? this.options[name] || name : this.options.pane);
    },
    addInteractiveTarget: function (targetEl) {
      this._map._targets[stamp(targetEl)] = this;
      return this;
    },
    removeInteractiveTarget: function (targetEl) {
      delete this._map._targets[stamp(targetEl)];
      return this;
    },
    // @method getAttribution: String
    // Used by the `attribution control`, returns the [attribution option](#gridlayer-attribution).
    getAttribution: function () {
      return this.options.attribution;
    },
    _layerAdd: function (e) {
      var map = e.target;

      // check in case layer gets added and then removed before the map is ready
      if (!map.hasLayer(this)) {
        return;
      }
      this._map = map;
      this._zoomAnimated = map._zoomAnimated;
      if (this.getEvents) {
        var events = this.getEvents();
        map.on(events, this);
        this.once('remove', function () {
          map.off(events, this);
        }, this);
      }
      this.onAdd(map);
      this.fire('add');
      map.fire('layeradd', {
        layer: this
      });
    }
  });

  /* @section Extension methods
   * @uninheritable
   *
   * Every layer should extend from `L.Layer` and (re-)implement the following methods.
   *
   * @method onAdd(map: Map): this
   * Should contain code that creates DOM elements for the layer, adds them to `map panes` where they should belong and puts listeners on relevant map events. Called on [`map.addLayer(layer)`](#map-addlayer).
   *
   * @method onRemove(map: Map): this
   * Should contain all clean up code that removes the layer's elements from the DOM and removes listeners previously added in [`onAdd`](#layer-onadd). Called on [`map.removeLayer(layer)`](#map-removelayer).
   *
   * @method getEvents(): Object
   * This optional method should return an object like `{ viewreset: this._reset }` for [`addEventListener`](#evented-addeventlistener). The event handlers in this object will be automatically added and removed from the map with your layer.
   *
   * @method getAttribution(): String
   * This optional method should return a string containing HTML to be shown on the `Attribution control` whenever the layer is visible.
   *
   * @method beforeAdd(map: Map): this
   * Optional method. Called on [`map.addLayer(layer)`](#map-addlayer), before the layer is added to the map, before events are initialized, without waiting until the map is in a usable state. Use for early initialization only.
   */

  /* @namespace Map
   * @section Layer events
   *
   * @event layeradd: LayerEvent
   * Fired when a new layer is added to the map.
   *
   * @event layerremove: LayerEvent
   * Fired when some layer is removed from the map
   *
   * @section Methods for Layers and Controls
   */
  Map.include({
    // @method addLayer(layer: Layer): this
    // Adds the given layer to the map
    addLayer: function (layer) {
      if (!layer._layerAdd) {
        throw new Error('The provided object is not a Layer.');
      }
      var id = stamp(layer);
      if (this._layers[id]) {
        return this;
      }
      this._layers[id] = layer;
      layer._mapToAdd = this;
      if (layer.beforeAdd) {
        layer.beforeAdd(this);
      }
      this.whenReady(layer._layerAdd, layer);
      return this;
    },
    // @method removeLayer(layer: Layer): this
    // Removes the given layer from the map.
    removeLayer: function (layer) {
      var id = stamp(layer);
      if (!this._layers[id]) {
        return this;
      }
      if (this._loaded) {
        layer.onRemove(this);
      }
      delete this._layers[id];
      if (this._loaded) {
        this.fire('layerremove', {
          layer: layer
        });
        layer.fire('remove');
      }
      layer._map = layer._mapToAdd = null;
      return this;
    },
    // @method hasLayer(layer: Layer): Boolean
    // Returns `true` if the given layer is currently added to the map
    hasLayer: function (layer) {
      return stamp(layer) in this._layers;
    },
    /* @method eachLayer(fn: Function, context?: Object): this
     * Iterates over the layers of the map, optionally specifying context of the iterator function.
     * ```
     * map.eachLayer(function(layer){
     *     layer.bindPopup('Hello');
     * });
     * ```
     */
    eachLayer: function (method, context) {
      for (var i in this._layers) {
        method.call(context, this._layers[i]);
      }
      return this;
    },
    _addLayers: function (layers) {
      layers = layers ? isArray(layers) ? layers : [layers] : [];
      for (var i = 0, len = layers.length; i < len; i++) {
        this.addLayer(layers[i]);
      }
    },
    _addZoomLimit: function (layer) {
      if (!isNaN(layer.options.maxZoom) || !isNaN(layer.options.minZoom)) {
        this._zoomBoundLayers[stamp(layer)] = layer;
        this._updateZoomLevels();
      }
    },
    _removeZoomLimit: function (layer) {
      var id = stamp(layer);
      if (this._zoomBoundLayers[id]) {
        delete this._zoomBoundLayers[id];
        this._updateZoomLevels();
      }
    },
    _updateZoomLevels: function () {
      var minZoom = Infinity,
        maxZoom = -Infinity,
        oldZoomSpan = this._getZoomSpan();
      for (var i in this._zoomBoundLayers) {
        var options = this._zoomBoundLayers[i].options;
        minZoom = options.minZoom === undefined ? minZoom : Math.min(minZoom, options.minZoom);
        maxZoom = options.maxZoom === undefined ? maxZoom : Math.max(maxZoom, options.maxZoom);
      }
      this._layersMaxZoom = maxZoom === -Infinity ? undefined : maxZoom;
      this._layersMinZoom = minZoom === Infinity ? undefined : minZoom;

      // @section Map state change events
      // @event zoomlevelschange: Event
      // Fired when the number of zoomlevels on the map is changed due
      // to adding or removing a layer.
      if (oldZoomSpan !== this._getZoomSpan()) {
        this.fire('zoomlevelschange');
      }
      if (this.options.maxZoom === undefined && this._layersMaxZoom && this.getZoom() > this._layersMaxZoom) {
        this.setZoom(this._layersMaxZoom);
      }
      if (this.options.minZoom === undefined && this._layersMinZoom && this.getZoom() < this._layersMinZoom) {
        this.setZoom(this._layersMinZoom);
      }
    }
  });

  /*
   * @class LayerGroup
   * @aka L.LayerGroup
   * @inherits Interactive layer
   *
   * Used to group several layers and handle them as one. If you add it to the map,
   * any layers added or removed from the group will be added/removed on the map as
   * well. Extends `Layer`.
   *
   * @example
   *
   * ```js
   * L.layerGroup([marker1, marker2])
   * 	.addLayer(polyline)
   * 	.addTo(map);
   * ```
   */

  var LayerGroup = Layer.extend({
    initialize: function (layers, options) {
      setOptions(this, options);
      this._layers = {};
      var i, len;
      if (layers) {
        for (i = 0, len = layers.length; i < len; i++) {
          this.addLayer(layers[i]);
        }
      }
    },
    // @method addLayer(layer: Layer): this
    // Adds the given layer to the group.
    addLayer: function (layer) {
      var id = this.getLayerId(layer);
      this._layers[id] = layer;
      if (this._map) {
        this._map.addLayer(layer);
      }
      return this;
    },
    // @method removeLayer(layer: Layer): this
    // Removes the given layer from the group.
    // @alternative
    // @method removeLayer(id: Number): this
    // Removes the layer with the given internal ID from the group.
    removeLayer: function (layer) {
      var id = layer in this._layers ? layer : this.getLayerId(layer);
      if (this._map && this._layers[id]) {
        this._map.removeLayer(this._layers[id]);
      }
      delete this._layers[id];
      return this;
    },
    // @method hasLayer(layer: Layer): Boolean
    // Returns `true` if the given layer is currently added to the group.
    // @alternative
    // @method hasLayer(id: Number): Boolean
    // Returns `true` if the given internal ID is currently added to the group.
    hasLayer: function (layer) {
      var layerId = typeof layer === 'number' ? layer : this.getLayerId(layer);
      return layerId in this._layers;
    },
    // @method clearLayers(): this
    // Removes all the layers from the group.
    clearLayers: function () {
      return this.eachLayer(this.removeLayer, this);
    },
    // @method invoke(methodName: String, …): this
    // Calls `methodName` on every layer contained in this group, passing any
    // additional parameters. Has no effect if the layers contained do not
    // implement `methodName`.
    invoke: function (methodName) {
      var args = Array.prototype.slice.call(arguments, 1),
        i,
        layer;
      for (i in this._layers) {
        layer = this._layers[i];
        if (layer[methodName]) {
          layer[methodName].apply(layer, args);
        }
      }
      return this;
    },
    onAdd: function (map) {
      this.eachLayer(map.addLayer, map);
    },
    onRemove: function (map) {
      this.eachLayer(map.removeLayer, map);
    },
    // @method eachLayer(fn: Function, context?: Object): this
    // Iterates over the layers of the group, optionally specifying context of the iterator function.
    // ```js
    // group.eachLayer(function (layer) {
    // 	layer.bindPopup('Hello');
    // });
    // ```
    eachLayer: function (method, context) {
      for (var i in this._layers) {
        method.call(context, this._layers[i]);
      }
      return this;
    },
    // @method getLayer(id: Number): Layer
    // Returns the layer with the given internal ID.
    getLayer: function (id) {
      return this._layers[id];
    },
    // @method getLayers(): Layer[]
    // Returns an array of all the layers added to the group.
    getLayers: function () {
      var layers = [];
      this.eachLayer(layers.push, layers);
      return layers;
    },
    // @method setZIndex(zIndex: Number): this
    // Calls `setZIndex` on every layer contained in this group, passing the z-index.
    setZIndex: function (zIndex) {
      return this.invoke('setZIndex', zIndex);
    },
    // @method getLayerId(layer: Layer): Number
    // Returns the internal ID for a layer
    getLayerId: function (layer) {
      return stamp(layer);
    }
  });

  // @factory L.layerGroup(layers?: Layer[], options?: Object)
  // Create a layer group, optionally given an initial set of layers and an `options` object.
  var layerGroup = function (layers, options) {
    return new LayerGroup(layers, options);
  };

  /*
   * @class FeatureGroup
   * @aka L.FeatureGroup
   * @inherits LayerGroup
   *
   * Extended `LayerGroup` that makes it easier to do the same thing to all its member layers:
   *  * [`bindPopup`](#layer-bindpopup) binds a popup to all of the layers at once (likewise with [`bindTooltip`](#layer-bindtooltip))
   *  * Events are propagated to the `FeatureGroup`, so if the group has an event
   * handler, it will handle events from any of the layers. This includes mouse events
   * and custom events.
   *  * Has `layeradd` and `layerremove` events
   *
   * @example
   *
   * ```js
   * L.featureGroup([marker1, marker2, polyline])
   * 	.bindPopup('Hello world!')
   * 	.on('click', function() { alert('Clicked on a member of the group!'); })
   * 	.addTo(map);
   * ```
   */

  var FeatureGroup = LayerGroup.extend({
    addLayer: function (layer) {
      if (this.hasLayer(layer)) {
        return this;
      }
      layer.addEventParent(this);
      LayerGroup.prototype.addLayer.call(this, layer);

      // @event layeradd: LayerEvent
      // Fired when a layer is added to this `FeatureGroup`
      return this.fire('layeradd', {
        layer: layer
      });
    },
    removeLayer: function (layer) {
      if (!this.hasLayer(layer)) {
        return this;
      }
      if (layer in this._layers) {
        layer = this._layers[layer];
      }
      layer.removeEventParent(this);
      LayerGroup.prototype.removeLayer.call(this, layer);

      // @event layerremove: LayerEvent
      // Fired when a layer is removed from this `FeatureGroup`
      return this.fire('layerremove', {
        layer: layer
      });
    },
    // @method setStyle(style: Path options): this
    // Sets the given path options to each layer of the group that has a `setStyle` method.
    setStyle: function (style) {
      return this.invoke('setStyle', style);
    },
    // @method bringToFront(): this
    // Brings the layer group to the top of all other layers
    bringToFront: function () {
      return this.invoke('bringToFront');
    },
    // @method bringToBack(): this
    // Brings the layer group to the back of all other layers
    bringToBack: function () {
      return this.invoke('bringToBack');
    },
    // @method getBounds(): LatLngBounds
    // Returns the LatLngBounds of the Feature Group (created from bounds and coordinates of its children).
    getBounds: function () {
      var bounds = new LatLngBounds();
      for (var id in this._layers) {
        var layer = this._layers[id];
        bounds.extend(layer.getBounds ? layer.getBounds() : layer.getLatLng());
      }
      return bounds;
    }
  });

  // @factory L.featureGroup(layers?: Layer[], options?: Object)
  // Create a feature group, optionally given an initial set of layers and an `options` object.
  var featureGroup = function (layers, options) {
    return new FeatureGroup(layers, options);
  };

  /*
   * @class Icon
   * @aka L.Icon
   *
   * Represents an icon to provide when creating a marker.
   *
   * @example
   *
   * ```js
   * var myIcon = L.icon({
   *     iconUrl: 'my-icon.png',
   *     iconRetinaUrl: 'my-icon@2x.png',
   *     iconSize: [38, 95],
   *     iconAnchor: [22, 94],
   *     popupAnchor: [-3, -76],
   *     shadowUrl: 'my-icon-shadow.png',
   *     shadowRetinaUrl: 'my-icon-shadow@2x.png',
   *     shadowSize: [68, 95],
   *     shadowAnchor: [22, 94]
   * });
   *
   * L.marker([50.505, 30.57], {icon: myIcon}).addTo(map);
   * ```
   *
   * `L.Icon.Default` extends `L.Icon` and is the blue icon Leaflet uses for markers by default.
   *
   */

  var Icon = Class.extend({
    /* @section
     * @aka Icon options
     *
     * @option iconUrl: String = null
     * **(required)** The URL to the icon image (absolute or relative to your script path).
     *
     * @option iconRetinaUrl: String = null
     * The URL to a retina sized version of the icon image (absolute or relative to your
     * script path). Used for Retina screen devices.
     *
     * @option iconSize: Point = null
     * Size of the icon image in pixels.
     *
     * @option iconAnchor: Point = null
     * The coordinates of the "tip" of the icon (relative to its top left corner). The icon
     * will be aligned so that this point is at the marker's geographical location. Centered
     * by default if size is specified, also can be set in CSS with negative margins.
     *
     * @option popupAnchor: Point = [0, 0]
     * The coordinates of the point from which popups will "open", relative to the icon anchor.
     *
     * @option tooltipAnchor: Point = [0, 0]
     * The coordinates of the point from which tooltips will "open", relative to the icon anchor.
     *
     * @option shadowUrl: String = null
     * The URL to the icon shadow image. If not specified, no shadow image will be created.
     *
     * @option shadowRetinaUrl: String = null
     *
     * @option shadowSize: Point = null
     * Size of the shadow image in pixels.
     *
     * @option shadowAnchor: Point = null
     * The coordinates of the "tip" of the shadow (relative to its top left corner) (the same
     * as iconAnchor if not specified).
     *
     * @option className: String = ''
     * A custom class name to assign to both icon and shadow images. Empty by default.
     */

    options: {
      popupAnchor: [0, 0],
      tooltipAnchor: [0, 0],
      // @option crossOrigin: Boolean|String = false
      // Whether the crossOrigin attribute will be added to the tiles.
      // If a String is provided, all tiles will have their crossOrigin attribute set to the String provided. This is needed if you want to access tile pixel data.
      // Refer to [CORS Settings](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_settings_attributes) for valid String values.
      crossOrigin: false
    },
    initialize: function (options) {
      setOptions(this, options);
    },
    // @method createIcon(oldIcon?: HTMLElement): HTMLElement
    // Called internally when the icon has to be shown, returns a `<img>` HTML element
    // styled according to the options.
    createIcon: function (oldIcon) {
      return this._createIcon('icon', oldIcon);
    },
    // @method createShadow(oldIcon?: HTMLElement): HTMLElement
    // As `createIcon`, but for the shadow beneath it.
    createShadow: function (oldIcon) {
      return this._createIcon('shadow', oldIcon);
    },
    _createIcon: function (name, oldIcon) {
      var src = this._getIconUrl(name);
      if (!src) {
        if (name === 'icon') {
          throw new Error('iconUrl not set in Icon options (see the docs).');
        }
        return null;
      }
      var img = this._createImg(src, oldIcon && oldIcon.tagName === 'IMG' ? oldIcon : null);
      this._setIconStyles(img, name);
      if (this.options.crossOrigin || this.options.crossOrigin === '') {
        img.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
      }
      return img;
    },
    _setIconStyles: function (img, name) {
      var options = this.options;
      var sizeOption = options[name + 'Size'];
      if (typeof sizeOption === 'number') {
        sizeOption = [sizeOption, sizeOption];
      }
      var size = toPoint(sizeOption),
        anchor = toPoint(name === 'shadow' && options.shadowAnchor || options.iconAnchor || size && size.divideBy(2, true));
      img.className = 'leaflet-marker-' + name + ' ' + (options.className || '');
      if (anchor) {
        img.style.marginLeft = -anchor.x + 'px';
        img.style.marginTop = -anchor.y + 'px';
      }
      if (size) {
        img.style.width = size.x + 'px';
        img.style.height = size.y + 'px';
      }
    },
    _createImg: function (src, el) {
      el = el || document.createElement('img');
      el.src = src;
      return el;
    },
    _getIconUrl: function (name) {
      return Browser.retina && this.options[name + 'RetinaUrl'] || this.options[name + 'Url'];
    }
  });

  // @factory L.icon(options: Icon options)
  // Creates an icon instance with the given options.
  function icon(options) {
    return new Icon(options);
  }

  /*
   * @miniclass Icon.Default (Icon)
   * @aka L.Icon.Default
   * @section
   *
   * A trivial subclass of `Icon`, represents the icon to use in `Marker`s when
   * no icon is specified. Points to the blue marker image distributed with Leaflet
   * releases.
   *
   * In order to customize the default icon, just change the properties of `L.Icon.Default.prototype.options`
   * (which is a set of `Icon options`).
   *
   * If you want to _completely_ replace the default icon, override the
   * `L.Marker.prototype.options.icon` with your own icon instead.
   */

  var IconDefault = Icon.extend({
    options: {
      iconUrl: 'marker-icon.png',
      iconRetinaUrl: 'marker-icon-2x.png',
      shadowUrl: 'marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    },
    _getIconUrl: function (name) {
      if (typeof IconDefault.imagePath !== 'string') {
        // Deprecated, backwards-compatibility only
        IconDefault.imagePath = this._detectIconPath();
      }

      // @option imagePath: String
      // `Icon.Default` will try to auto-detect the location of the
      // blue icon images. If you are placing these images in a non-standard
      // way, set this option to point to the right path.
      return (this.options.imagePath || IconDefault.imagePath) + Icon.prototype._getIconUrl.call(this, name);
    },
    _stripUrl: function (path) {
      // separate function to use in tests
      var strip = function (str, re, idx) {
        var match = re.exec(str);
        return match && match[idx];
      };
      path = strip(path, /^url\((['"])?(.+)\1\)$/, 2);
      return path && strip(path, /^(.*)marker-icon\.png$/, 1);
    },
    _detectIconPath: function () {
      var el = create$1('div', 'leaflet-default-icon-path', document.body);
      var path = getStyle(el, 'background-image') || getStyle(el, 'backgroundImage'); // IE8

      document.body.removeChild(el);
      path = this._stripUrl(path);
      if (path) {
        return path;
      }
      var link = document.querySelector('link[href$="leaflet.css"]');
      if (!link) {
        return '';
      }
      return link.href.substring(0, link.href.length - 'leaflet.css'.length - 1);
    }
  });

  /*
   * L.Handler.MarkerDrag is used internally by L.Marker to make the markers draggable.
   */

  /* @namespace Marker
   * @section Interaction handlers
   *
   * Interaction handlers are properties of a marker instance that allow you to control interaction behavior in runtime, enabling or disabling certain features such as dragging (see `Handler` methods). Example:
   *
   * ```js
   * marker.dragging.disable();
   * ```
   *
   * @property dragging: Handler
   * Marker dragging handler (by both mouse and touch). Only valid when the marker is on the map (Otherwise set [`marker.options.draggable`](#marker-draggable)).
   */

  var MarkerDrag = Handler.extend({
    initialize: function (marker) {
      this._marker = marker;
    },
    addHooks: function () {
      var icon = this._marker._icon;
      if (!this._draggable) {
        this._draggable = new Draggable(icon, icon, true);
      }
      this._draggable.on({
        dragstart: this._onDragStart,
        predrag: this._onPreDrag,
        drag: this._onDrag,
        dragend: this._onDragEnd
      }, this).enable();
      addClass(icon, 'leaflet-marker-draggable');
    },
    removeHooks: function () {
      this._draggable.off({
        dragstart: this._onDragStart,
        predrag: this._onPreDrag,
        drag: this._onDrag,
        dragend: this._onDragEnd
      }, this).disable();
      if (this._marker._icon) {
        removeClass(this._marker._icon, 'leaflet-marker-draggable');
      }
    },
    moved: function () {
      return this._draggable && this._draggable._moved;
    },
    _adjustPan: function (e) {
      var marker = this._marker,
        map = marker._map,
        speed = this._marker.options.autoPanSpeed,
        padding = this._marker.options.autoPanPadding,
        iconPos = getPosition(marker._icon),
        bounds = map.getPixelBounds(),
        origin = map.getPixelOrigin();
      var panBounds = toBounds(bounds.min._subtract(origin).add(padding), bounds.max._subtract(origin).subtract(padding));
      if (!panBounds.contains(iconPos)) {
        // Compute incremental movement
        var movement = toPoint((Math.max(panBounds.max.x, iconPos.x) - panBounds.max.x) / (bounds.max.x - panBounds.max.x) - (Math.min(panBounds.min.x, iconPos.x) - panBounds.min.x) / (bounds.min.x - panBounds.min.x), (Math.max(panBounds.max.y, iconPos.y) - panBounds.max.y) / (bounds.max.y - panBounds.max.y) - (Math.min(panBounds.min.y, iconPos.y) - panBounds.min.y) / (bounds.min.y - panBounds.min.y)).multiplyBy(speed);
        map.panBy(movement, {
          animate: false
        });
        this._draggable._newPos._add(movement);
        this._draggable._startPos._add(movement);
        setPosition(marker._icon, this._draggable._newPos);
        this._onDrag(e);
        this._panRequest = requestAnimFrame(this._adjustPan.bind(this, e));
      }
    },
    _onDragStart: function () {
      // @section Dragging events
      // @event dragstart: Event
      // Fired when the user starts dragging the marker.

      // @event movestart: Event
      // Fired when the marker starts moving (because of dragging).

      this._oldLatLng = this._marker.getLatLng();

      // When using ES6 imports it could not be set when `Popup` was not imported as well
      this._marker.closePopup && this._marker.closePopup();
      this._marker.fire('movestart').fire('dragstart');
    },
    _onPreDrag: function (e) {
      if (this._marker.options.autoPan) {
        cancelAnimFrame(this._panRequest);
        this._panRequest = requestAnimFrame(this._adjustPan.bind(this, e));
      }
    },
    _onDrag: function (e) {
      var marker = this._marker,
        shadow = marker._shadow,
        iconPos = getPosition(marker._icon),
        latlng = marker._map.layerPointToLatLng(iconPos);

      // update shadow position
      if (shadow) {
        setPosition(shadow, iconPos);
      }
      marker._latlng = latlng;
      e.latlng = latlng;
      e.oldLatLng = this._oldLatLng;

      // @event drag: Event
      // Fired repeatedly while the user drags the marker.
      marker.fire('move', e).fire('drag', e);
    },
    _onDragEnd: function (e) {
      // @event dragend: DragEndEvent
      // Fired when the user stops dragging the marker.

      cancelAnimFrame(this._panRequest);

      // @event moveend: Event
      // Fired when the marker stops moving (because of dragging).
      delete this._oldLatLng;
      this._marker.fire('moveend').fire('dragend', e);
    }
  });

  /*
   * @class Marker
   * @inherits Interactive layer
   * @aka L.Marker
   * L.Marker is used to display clickable/draggable icons on the map. Extends `Layer`.
   *
   * @example
   *
   * ```js
   * L.marker([50.5, 30.5]).addTo(map);
   * ```
   */

  var Marker = Layer.extend({
    // @section
    // @aka Marker options
    options: {
      // @option icon: Icon = *
      // Icon instance to use for rendering the marker.
      // See [Icon documentation](#L.Icon) for details on how to customize the marker icon.
      // If not specified, a common instance of `L.Icon.Default` is used.
      icon: new IconDefault(),
      // Option inherited from "Interactive layer" abstract class
      interactive: true,
      // @option keyboard: Boolean = true
      // Whether the marker can be tabbed to with a keyboard and clicked by pressing enter.
      keyboard: true,
      // @option title: String = ''
      // Text for the browser tooltip that appear on marker hover (no tooltip by default).
      // [Useful for accessibility](https://leafletjs.com/examples/accessibility/#markers-must-be-labelled).
      title: '',
      // @option alt: String = 'Marker'
      // Text for the `alt` attribute of the icon image.
      // [Useful for accessibility](https://leafletjs.com/examples/accessibility/#markers-must-be-labelled).
      alt: 'Marker',
      // @option zIndexOffset: Number = 0
      // By default, marker images zIndex is set automatically based on its latitude. Use this option if you want to put the marker on top of all others (or below), specifying a high value like `1000` (or high negative value, respectively).
      zIndexOffset: 0,
      // @option opacity: Number = 1.0
      // The opacity of the marker.
      opacity: 1,
      // @option riseOnHover: Boolean = false
      // If `true`, the marker will get on top of others when you hover the mouse over it.
      riseOnHover: false,
      // @option riseOffset: Number = 250
      // The z-index offset used for the `riseOnHover` feature.
      riseOffset: 250,
      // @option pane: String = 'markerPane'
      // `Map pane` where the markers icon will be added.
      pane: 'markerPane',
      // @option shadowPane: String = 'shadowPane'
      // `Map pane` where the markers shadow will be added.
      shadowPane: 'shadowPane',
      // @option bubblingMouseEvents: Boolean = false
      // When `true`, a mouse event on this marker will trigger the same event on the map
      // (unless [`L.DomEvent.stopPropagation`](#domevent-stoppropagation) is used).
      bubblingMouseEvents: false,
      // @option autoPanOnFocus: Boolean = true
      // When `true`, the map will pan whenever the marker is focused (via
      // e.g. pressing `tab` on the keyboard) to ensure the marker is
      // visible within the map's bounds
      autoPanOnFocus: true,
      // @section Draggable marker options
      // @option draggable: Boolean = false
      // Whether the marker is draggable with mouse/touch or not.
      draggable: false,
      // @option autoPan: Boolean = false
      // Whether to pan the map when dragging this marker near its edge or not.
      autoPan: false,
      // @option autoPanPadding: Point = Point(50, 50)
      // Distance (in pixels to the left/right and to the top/bottom) of the
      // map edge to start panning the map.
      autoPanPadding: [50, 50],
      // @option autoPanSpeed: Number = 10
      // Number of pixels the map should pan by.
      autoPanSpeed: 10
    },
    /* @section
     *
     * In addition to [shared layer methods](#Layer) like `addTo()` and `remove()` and [popup methods](#Popup) like bindPopup() you can also use the following methods:
     */

    initialize: function (latlng, options) {
      setOptions(this, options);
      this._latlng = toLatLng(latlng);
    },
    onAdd: function (map) {
      this._zoomAnimated = this._zoomAnimated && map.options.markerZoomAnimation;
      if (this._zoomAnimated) {
        map.on('zoomanim', this._animateZoom, this);
      }
      this._initIcon();
      this.update();
    },
    onRemove: function (map) {
      if (this.dragging && this.dragging.enabled()) {
        this.options.draggable = true;
        this.dragging.removeHooks();
      }
      delete this.dragging;
      if (this._zoomAnimated) {
        map.off('zoomanim', this._animateZoom, this);
      }
      this._removeIcon();
      this._removeShadow();
    },
    getEvents: function () {
      return {
        zoom: this.update,
        viewreset: this.update
      };
    },
    // @method getLatLng: LatLng
    // Returns the current geographical position of the marker.
    getLatLng: function () {
      return this._latlng;
    },
    // @method setLatLng(latlng: LatLng): this
    // Changes the marker position to the given point.
    setLatLng: function (latlng) {
      var oldLatLng = this._latlng;
      this._latlng = toLatLng(latlng);
      this.update();

      // @event move: Event
      // Fired when the marker is moved via [`setLatLng`](#marker-setlatlng) or by [dragging](#marker-dragging). Old and new coordinates are included in event arguments as `oldLatLng`, `latlng`.
      return this.fire('move', {
        oldLatLng: oldLatLng,
        latlng: this._latlng
      });
    },
    // @method setZIndexOffset(offset: Number): this
    // Changes the [zIndex offset](#marker-zindexoffset) of the marker.
    setZIndexOffset: function (offset) {
      this.options.zIndexOffset = offset;
      return this.update();
    },
    // @method getIcon: Icon
    // Returns the current icon used by the marker
    getIcon: function () {
      return this.options.icon;
    },
    // @method setIcon(icon: Icon): this
    // Changes the marker icon.
    setIcon: function (icon) {
      this.options.icon = icon;
      if (this._map) {
        this._initIcon();
        this.update();
      }
      if (this._popup) {
        this.bindPopup(this._popup, this._popup.options);
      }
      return this;
    },
    getElement: function () {
      return this._icon;
    },
    update: function () {
      if (this._icon && this._map) {
        var pos = this._map.latLngToLayerPoint(this._latlng).round();
        this._setPos(pos);
      }
      return this;
    },
    _initIcon: function () {
      var options = this.options,
        classToAdd = 'leaflet-zoom-' + (this._zoomAnimated ? 'animated' : 'hide');
      var icon = options.icon.createIcon(this._icon),
        addIcon = false;

      // if we're not reusing the icon, remove the old one and init new one
      if (icon !== this._icon) {
        if (this._icon) {
          this._removeIcon();
        }
        addIcon = true;
        if (options.title) {
          icon.title = options.title;
        }
        if (icon.tagName === 'IMG') {
          icon.alt = options.alt || '';
        }
      }
      addClass(icon, classToAdd);
      if (options.keyboard) {
        icon.tabIndex = '0';
        icon.setAttribute('role', 'button');
      }
      this._icon = icon;
      if (options.riseOnHover) {
        this.on({
          mouseover: this._bringToFront,
          mouseout: this._resetZIndex
        });
      }
      if (this.options.autoPanOnFocus) {
        on(icon, 'focus', this._panOnFocus, this);
      }
      var newShadow = options.icon.createShadow(this._shadow),
        addShadow = false;
      if (newShadow !== this._shadow) {
        this._removeShadow();
        addShadow = true;
      }
      if (newShadow) {
        addClass(newShadow, classToAdd);
        newShadow.alt = '';
      }
      this._shadow = newShadow;
      if (options.opacity < 1) {
        this._updateOpacity();
      }
      if (addIcon) {
        this.getPane().appendChild(this._icon);
      }
      this._initInteraction();
      if (newShadow && addShadow) {
        this.getPane(options.shadowPane).appendChild(this._shadow);
      }
    },
    _removeIcon: function () {
      if (this.options.riseOnHover) {
        this.off({
          mouseover: this._bringToFront,
          mouseout: this._resetZIndex
        });
      }
      if (this.options.autoPanOnFocus) {
        off(this._icon, 'focus', this._panOnFocus, this);
      }
      remove(this._icon);
      this.removeInteractiveTarget(this._icon);
      this._icon = null;
    },
    _removeShadow: function () {
      if (this._shadow) {
        remove(this._shadow);
      }
      this._shadow = null;
    },
    _setPos: function (pos) {
      if (this._icon) {
        setPosition(this._icon, pos);
      }
      if (this._shadow) {
        setPosition(this._shadow, pos);
      }
      this._zIndex = pos.y + this.options.zIndexOffset;
      this._resetZIndex();
    },
    _updateZIndex: function (offset) {
      if (this._icon) {
        this._icon.style.zIndex = this._zIndex + offset;
      }
    },
    _animateZoom: function (opt) {
      var pos = this._map._latLngToNewLayerPoint(this._latlng, opt.zoom, opt.center).round();
      this._setPos(pos);
    },
    _initInteraction: function () {
      if (!this.options.interactive) {
        return;
      }
      addClass(this._icon, 'leaflet-interactive');
      this.addInteractiveTarget(this._icon);
      if (MarkerDrag) {
        var draggable = this.options.draggable;
        if (this.dragging) {
          draggable = this.dragging.enabled();
          this.dragging.disable();
        }
        this.dragging = new MarkerDrag(this);
        if (draggable) {
          this.dragging.enable();
        }
      }
    },
    // @method setOpacity(opacity: Number): this
    // Changes the opacity of the marker.
    setOpacity: function (opacity) {
      this.options.opacity = opacity;
      if (this._map) {
        this._updateOpacity();
      }
      return this;
    },
    _updateOpacity: function () {
      var opacity = this.options.opacity;
      if (this._icon) {
        setOpacity(this._icon, opacity);
      }
      if (this._shadow) {
        setOpacity(this._shadow, opacity);
      }
    },
    _bringToFront: function () {
      this._updateZIndex(this.options.riseOffset);
    },
    _resetZIndex: function () {
      this._updateZIndex(0);
    },
    _panOnFocus: function () {
      var map = this._map;
      if (!map) {
        return;
      }
      var iconOpts = this.options.icon.options;
      var size = iconOpts.iconSize ? toPoint(iconOpts.iconSize) : toPoint(0, 0);
      var anchor = iconOpts.iconAnchor ? toPoint(iconOpts.iconAnchor) : toPoint(0, 0);
      map.panInside(this._latlng, {
        paddingTopLeft: anchor,
        paddingBottomRight: size.subtract(anchor)
      });
    },
    _getPopupAnchor: function () {
      return this.options.icon.options.popupAnchor;
    },
    _getTooltipAnchor: function () {
      return this.options.icon.options.tooltipAnchor;
    }
  });

  // factory L.marker(latlng: LatLng, options? : Marker options)

  // @factory L.marker(latlng: LatLng, options? : Marker options)
  // Instantiates a Marker object given a geographical point and optionally an options object.
  function marker(latlng, options) {
    return new Marker(latlng, options);
  }

  /*
   * @class Path
   * @aka L.Path
   * @inherits Interactive layer
   *
   * An abstract class that contains options and constants shared between vector
   * overlays (Polygon, Polyline, Circle). Do not use it directly. Extends `Layer`.
   */

  var Path = Layer.extend({
    // @section
    // @aka Path options
    options: {
      // @option stroke: Boolean = true
      // Whether to draw stroke along the path. Set it to `false` to disable borders on polygons or circles.
      stroke: true,
      // @option color: String = '#3388ff'
      // Stroke color
      color: '#3388ff',
      // @option weight: Number = 3
      // Stroke width in pixels
      weight: 3,
      // @option opacity: Number = 1.0
      // Stroke opacity
      opacity: 1,
      // @option lineCap: String= 'round'
      // A string that defines [shape to be used at the end](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-linecap) of the stroke.
      lineCap: 'round',
      // @option lineJoin: String = 'round'
      // A string that defines [shape to be used at the corners](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-linejoin) of the stroke.
      lineJoin: 'round',
      // @option dashArray: String = null
      // A string that defines the stroke [dash pattern](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-dasharray). Doesn't work on `Canvas`-powered layers in [some old browsers](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/setLineDash#Browser_compatibility).
      dashArray: null,
      // @option dashOffset: String = null
      // A string that defines the [distance into the dash pattern to start the dash](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-dashoffset). Doesn't work on `Canvas`-powered layers in [some old browsers](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/setLineDash#Browser_compatibility).
      dashOffset: null,
      // @option fill: Boolean = depends
      // Whether to fill the path with color. Set it to `false` to disable filling on polygons or circles.
      fill: false,
      // @option fillColor: String = *
      // Fill color. Defaults to the value of the [`color`](#path-color) option
      fillColor: null,
      // @option fillOpacity: Number = 0.2
      // Fill opacity.
      fillOpacity: 0.2,
      // @option fillRule: String = 'evenodd'
      // A string that defines [how the inside of a shape](https://developer.mozilla.org/docs/Web/SVG/Attribute/fill-rule) is determined.
      fillRule: 'evenodd',
      // className: '',

      // Option inherited from "Interactive layer" abstract class
      interactive: true,
      // @option bubblingMouseEvents: Boolean = true
      // When `true`, a mouse event on this path will trigger the same event on the map
      // (unless [`L.DomEvent.stopPropagation`](#domevent-stoppropagation) is used).
      bubblingMouseEvents: true
    },
    beforeAdd: function (map) {
      // Renderer is set here because we need to call renderer.getEvents
      // before this.getEvents.
      this._renderer = map.getRenderer(this);
    },
    onAdd: function () {
      this._renderer._initPath(this);
      this._reset();
      this._renderer._addPath(this);
    },
    onRemove: function () {
      this._renderer._removePath(this);
    },
    // @method redraw(): this
    // Redraws the layer. Sometimes useful after you changed the coordinates that the path uses.
    redraw: function () {
      if (this._map) {
        this._renderer._updatePath(this);
      }
      return this;
    },
    // @method setStyle(style: Path options): this
    // Changes the appearance of a Path based on the options in the `Path options` object.
    setStyle: function (style) {
      setOptions(this, style);
      if (this._renderer) {
        this._renderer._updateStyle(this);
        if (this.options.stroke && style && Object.prototype.hasOwnProperty.call(style, 'weight')) {
          this._updateBounds();
        }
      }
      return this;
    },
    // @method bringToFront(): this
    // Brings the layer to the top of all path layers.
    bringToFront: function () {
      if (this._renderer) {
        this._renderer._bringToFront(this);
      }
      return this;
    },
    // @method bringToBack(): this
    // Brings the layer to the bottom of all path layers.
    bringToBack: function () {
      if (this._renderer) {
        this._renderer._bringToBack(this);
      }
      return this;
    },
    getElement: function () {
      return this._path;
    },
    _reset: function () {
      // defined in child classes
      this._project();
      this._update();
    },
    _clickTolerance: function () {
      // used when doing hit detection for Canvas layers
      return (this.options.stroke ? this.options.weight / 2 : 0) + (this._renderer.options.tolerance || 0);
    }
  });

  /*
   * @class CircleMarker
   * @aka L.CircleMarker
   * @inherits Path
   *
   * A circle of a fixed size with radius specified in pixels. Extends `Path`.
   */

  var CircleMarker = Path.extend({
    // @section
    // @aka CircleMarker options
    options: {
      fill: true,
      // @option radius: Number = 10
      // Radius of the circle marker, in pixels
      radius: 10
    },
    initialize: function (latlng, options) {
      setOptions(this, options);
      this._latlng = toLatLng(latlng);
      this._radius = this.options.radius;
    },
    // @method setLatLng(latLng: LatLng): this
    // Sets the position of a circle marker to a new location.
    setLatLng: function (latlng) {
      var oldLatLng = this._latlng;
      this._latlng = toLatLng(latlng);
      this.redraw();

      // @event move: Event
      // Fired when the marker is moved via [`setLatLng`](#circlemarker-setlatlng). Old and new coordinates are included in event arguments as `oldLatLng`, `latlng`.
      return this.fire('move', {
        oldLatLng: oldLatLng,
        latlng: this._latlng
      });
    },
    // @method getLatLng(): LatLng
    // Returns the current geographical position of the circle marker
    getLatLng: function () {
      return this._latlng;
    },
    // @method setRadius(radius: Number): this
    // Sets the radius of a circle marker. Units are in pixels.
    setRadius: function (radius) {
      this.options.radius = this._radius = radius;
      return this.redraw();
    },
    // @method getRadius(): Number
    // Returns the current radius of the circle
    getRadius: function () {
      return this._radius;
    },
    setStyle: function (options) {
      var radius = options && options.radius || this._radius;
      Path.prototype.setStyle.call(this, options);
      this.setRadius(radius);
      return this;
    },
    _project: function () {
      this._point = this._map.latLngToLayerPoint(this._latlng);
      this._updateBounds();
    },
    _updateBounds: function () {
      var r = this._radius,
        r2 = this._radiusY || r,
        w = this._clickTolerance(),
        p = [r + w, r2 + w];
      this._pxBounds = new Bounds(this._point.subtract(p), this._point.add(p));
    },
    _update: function () {
      if (this._map) {
        this._updatePath();
      }
    },
    _updatePath: function () {
      this._renderer._updateCircle(this);
    },
    _empty: function () {
      return this._radius && !this._renderer._bounds.intersects(this._pxBounds);
    },
    // Needed by the `Canvas` renderer for interactivity
    _containsPoint: function (p) {
      return p.distanceTo(this._point) <= this._radius + this._clickTolerance();
    }
  });

  // @factory L.circleMarker(latlng: LatLng, options?: CircleMarker options)
  // Instantiates a circle marker object given a geographical point, and an optional options object.
  function circleMarker(latlng, options) {
    return new CircleMarker(latlng, options);
  }

  /*
   * @class Circle
   * @aka L.Circle
   * @inherits CircleMarker
   *
   * A class for drawing circle overlays on a map. Extends `CircleMarker`.
   *
   * It's an approximation and starts to diverge from a real circle closer to poles (due to projection distortion).
   *
   * @example
   *
   * ```js
   * L.circle([50.5, 30.5], {radius: 200}).addTo(map);
   * ```
   */

  var Circle = CircleMarker.extend({
    initialize: function (latlng, options, legacyOptions) {
      if (typeof options === 'number') {
        // Backwards compatibility with 0.7.x factory (latlng, radius, options?)
        options = extend({}, legacyOptions, {
          radius: options
        });
      }
      setOptions(this, options);
      this._latlng = toLatLng(latlng);
      if (isNaN(this.options.radius)) {
        throw new Error('Circle radius cannot be NaN');
      }

      // @section
      // @aka Circle options
      // @option radius: Number; Radius of the circle, in meters.
      this._mRadius = this.options.radius;
    },
    // @method setRadius(radius: Number): this
    // Sets the radius of a circle. Units are in meters.
    setRadius: function (radius) {
      this._mRadius = radius;
      return this.redraw();
    },
    // @method getRadius(): Number
    // Returns the current radius of a circle. Units are in meters.
    getRadius: function () {
      return this._mRadius;
    },
    // @method getBounds(): LatLngBounds
    // Returns the `LatLngBounds` of the path.
    getBounds: function () {
      var half = [this._radius, this._radiusY || this._radius];
      return new LatLngBounds(this._map.layerPointToLatLng(this._point.subtract(half)), this._map.layerPointToLatLng(this._point.add(half)));
    },
    setStyle: Path.prototype.setStyle,
    _project: function () {
      var lng = this._latlng.lng,
        lat = this._latlng.lat,
        map = this._map,
        crs = map.options.crs;
      if (crs.distance === Earth.distance) {
        var d = Math.PI / 180,
          latR = this._mRadius / Earth.R / d,
          top = map.project([lat + latR, lng]),
          bottom = map.project([lat - latR, lng]),
          p = top.add(bottom).divideBy(2),
          lat2 = map.unproject(p).lat,
          lngR = Math.acos((Math.cos(latR * d) - Math.sin(lat * d) * Math.sin(lat2 * d)) / (Math.cos(lat * d) * Math.cos(lat2 * d))) / d;
        if (isNaN(lngR) || lngR === 0) {
          lngR = latR / Math.cos(Math.PI / 180 * lat); // Fallback for edge case, #2425
        }
        this._point = p.subtract(map.getPixelOrigin());
        this._radius = isNaN(lngR) ? 0 : p.x - map.project([lat2, lng - lngR]).x;
        this._radiusY = p.y - top.y;
      } else {
        var latlng2 = crs.unproject(crs.project(this._latlng).subtract([this._mRadius, 0]));
        this._point = map.latLngToLayerPoint(this._latlng);
        this._radius = this._point.x - map.latLngToLayerPoint(latlng2).x;
      }
      this._updateBounds();
    }
  });

  // @factory L.circle(latlng: LatLng, options?: Circle options)
  // Instantiates a circle object given a geographical point, and an options object
  // which contains the circle radius.
  // @alternative
  // @factory L.circle(latlng: LatLng, radius: Number, options?: Circle options)
  // Obsolete way of instantiating a circle, for compatibility with 0.7.x code.
  // Do not use in new applications or plugins.
  function circle(latlng, options, legacyOptions) {
    return new Circle(latlng, options, legacyOptions);
  }

  /*
   * @class Polyline
   * @aka L.Polyline
   * @inherits Path
   *
   * A class for drawing polyline overlays on a map. Extends `Path`.
   *
   * @example
   *
   * ```js
   * // create a red polyline from an array of LatLng points
   * var latlngs = [
   * 	[45.51, -122.68],
   * 	[37.77, -122.43],
   * 	[34.04, -118.2]
   * ];
   *
   * var polyline = L.polyline(latlngs, {color: 'red'}).addTo(map);
   *
   * // zoom the map to the polyline
   * map.fitBounds(polyline.getBounds());
   * ```
   *
   * You can also pass a multi-dimensional array to represent a `MultiPolyline` shape:
   *
   * ```js
   * // create a red polyline from an array of arrays of LatLng points
   * var latlngs = [
   * 	[[45.51, -122.68],
   * 	 [37.77, -122.43],
   * 	 [34.04, -118.2]],
   * 	[[40.78, -73.91],
   * 	 [41.83, -87.62],
   * 	 [32.76, -96.72]]
   * ];
   * ```
   */

  var Polyline = Path.extend({
    // @section
    // @aka Polyline options
    options: {
      // @option smoothFactor: Number = 1.0
      // How much to simplify the polyline on each zoom level. More means
      // better performance and smoother look, and less means more accurate representation.
      smoothFactor: 1.0,
      // @option noClip: Boolean = false
      // Disable polyline clipping.
      noClip: false
    },
    initialize: function (latlngs, options) {
      setOptions(this, options);
      this._setLatLngs(latlngs);
    },
    // @method getLatLngs(): LatLng[]
    // Returns an array of the points in the path, or nested arrays of points in case of multi-polyline.
    getLatLngs: function () {
      return this._latlngs;
    },
    // @method setLatLngs(latlngs: LatLng[]): this
    // Replaces all the points in the polyline with the given array of geographical points.
    setLatLngs: function (latlngs) {
      this._setLatLngs(latlngs);
      return this.redraw();
    },
    // @method isEmpty(): Boolean
    // Returns `true` if the Polyline has no LatLngs.
    isEmpty: function () {
      return !this._latlngs.length;
    },
    // @method closestLayerPoint(p: Point): Point
    // Returns the point closest to `p` on the Polyline.
    closestLayerPoint: function (p) {
      var minDistance = Infinity,
        minPoint = null,
        closest = _sqClosestPointOnSegment,
        p1,
        p2;
      for (var j = 0, jLen = this._parts.length; j < jLen; j++) {
        var points = this._parts[j];
        for (var i = 1, len = points.length; i < len; i++) {
          p1 = points[i - 1];
          p2 = points[i];
          var sqDist = closest(p, p1, p2, true);
          if (sqDist < minDistance) {
            minDistance = sqDist;
            minPoint = closest(p, p1, p2);
          }
        }
      }
      if (minPoint) {
        minPoint.distance = Math.sqrt(minDistance);
      }
      return minPoint;
    },
    // @method getCenter(): LatLng
    // Returns the center ([centroid](https://en.wikipedia.org/wiki/Centroid)) of the polyline.
    getCenter: function () {
      // throws error when not yet added to map as this center calculation requires projected coordinates
      if (!this._map) {
        throw new Error('Must add layer to map before using getCenter()');
      }
      return polylineCenter(this._defaultShape(), this._map.options.crs);
    },
    // @method getBounds(): LatLngBounds
    // Returns the `LatLngBounds` of the path.
    getBounds: function () {
      return this._bounds;
    },
    // @method addLatLng(latlng: LatLng, latlngs?: LatLng[]): this
    // Adds a given point to the polyline. By default, adds to the first ring of
    // the polyline in case of a multi-polyline, but can be overridden by passing
    // a specific ring as a LatLng array (that you can earlier access with [`getLatLngs`](#polyline-getlatlngs)).
    addLatLng: function (latlng, latlngs) {
      latlngs = latlngs || this._defaultShape();
      latlng = toLatLng(latlng);
      latlngs.push(latlng);
      this._bounds.extend(latlng);
      return this.redraw();
    },
    _setLatLngs: function (latlngs) {
      this._bounds = new LatLngBounds();
      this._latlngs = this._convertLatLngs(latlngs);
    },
    _defaultShape: function () {
      return isFlat(this._latlngs) ? this._latlngs : this._latlngs[0];
    },
    // recursively convert latlngs input into actual LatLng instances; calculate bounds along the way
    _convertLatLngs: function (latlngs) {
      var result = [],
        flat = isFlat(latlngs);
      for (var i = 0, len = latlngs.length; i < len; i++) {
        if (flat) {
          result[i] = toLatLng(latlngs[i]);
          this._bounds.extend(result[i]);
        } else {
          result[i] = this._convertLatLngs(latlngs[i]);
        }
      }
      return result;
    },
    _project: function () {
      var pxBounds = new Bounds();
      this._rings = [];
      this._projectLatlngs(this._latlngs, this._rings, pxBounds);
      if (this._bounds.isValid() && pxBounds.isValid()) {
        this._rawPxBounds = pxBounds;
        this._updateBounds();
      }
    },
    _updateBounds: function () {
      var w = this._clickTolerance(),
        p = new Point(w, w);
      if (!this._rawPxBounds) {
        return;
      }
      this._pxBounds = new Bounds([this._rawPxBounds.min.subtract(p), this._rawPxBounds.max.add(p)]);
    },
    // recursively turns latlngs into a set of rings with projected coordinates
    _projectLatlngs: function (latlngs, result, projectedBounds) {
      var flat = latlngs[0] instanceof LatLng,
        len = latlngs.length,
        i,
        ring;
      if (flat) {
        ring = [];
        for (i = 0; i < len; i++) {
          ring[i] = this._map.latLngToLayerPoint(latlngs[i]);
          projectedBounds.extend(ring[i]);
        }
        result.push(ring);
      } else {
        for (i = 0; i < len; i++) {
          this._projectLatlngs(latlngs[i], result, projectedBounds);
        }
      }
    },
    // clip polyline by renderer bounds so that we have less to render for performance
    _clipPoints: function () {
      var bounds = this._renderer._bounds;
      this._parts = [];
      if (!this._pxBounds || !this._pxBounds.intersects(bounds)) {
        return;
      }
      if (this.options.noClip) {
        this._parts = this._rings;
        return;
      }
      var parts = this._parts,
        i,
        j,
        k,
        len,
        len2,
        segment,
        points;
      for (i = 0, k = 0, len = this._rings.length; i < len; i++) {
        points = this._rings[i];
        for (j = 0, len2 = points.length; j < len2 - 1; j++) {
          segment = clipSegment(points[j], points[j + 1], bounds, j, true);
          if (!segment) {
            continue;
          }
          parts[k] = parts[k] || [];
          parts[k].push(segment[0]);

          // if segment goes out of screen, or it's the last one, it's the end of the line part
          if (segment[1] !== points[j + 1] || j === len2 - 2) {
            parts[k].push(segment[1]);
            k++;
          }
        }
      }
    },
    // simplify each clipped part of the polyline for performance
    _simplifyPoints: function () {
      var parts = this._parts,
        tolerance = this.options.smoothFactor;
      for (var i = 0, len = parts.length; i < len; i++) {
        parts[i] = simplify(parts[i], tolerance);
      }
    },
    _update: function () {
      if (!this._map) {
        return;
      }
      this._clipPoints();
      this._simplifyPoints();
      this._updatePath();
    },
    _updatePath: function () {
      this._renderer._updatePoly(this);
    },
    // Needed by the `Canvas` renderer for interactivity
    _containsPoint: function (p, closed) {
      var i,
        j,
        k,
        len,
        len2,
        part,
        w = this._clickTolerance();
      if (!this._pxBounds || !this._pxBounds.contains(p)) {
        return false;
      }

      // hit detection for polylines
      for (i = 0, len = this._parts.length; i < len; i++) {
        part = this._parts[i];
        for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
          if (!closed && j === 0) {
            continue;
          }
          if (pointToSegmentDistance(p, part[k], part[j]) <= w) {
            return true;
          }
        }
      }
      return false;
    }
  });

  // @factory L.polyline(latlngs: LatLng[], options?: Polyline options)
  // Instantiates a polyline object given an array of geographical points and
  // optionally an options object. You can create a `Polyline` object with
  // multiple separate lines (`MultiPolyline`) by passing an array of arrays
  // of geographic points.
  function polyline(latlngs, options) {
    return new Polyline(latlngs, options);
  }

  // Retrocompat. Allow plugins to support Leaflet versions before and after 1.1.
  Polyline._flat = _flat;

  /*
   * @class Polygon
   * @aka L.Polygon
   * @inherits Polyline
   *
   * A class for drawing polygon overlays on a map. Extends `Polyline`.
   *
   * Note that points you pass when creating a polygon shouldn't have an additional last point equal to the first one — it's better to filter out such points.
   *
   *
   * @example
   *
   * ```js
   * // create a red polygon from an array of LatLng points
   * var latlngs = [[37, -109.05],[41, -109.03],[41, -102.05],[37, -102.04]];
   *
   * var polygon = L.polygon(latlngs, {color: 'red'}).addTo(map);
   *
   * // zoom the map to the polygon
   * map.fitBounds(polygon.getBounds());
   * ```
   *
   * You can also pass an array of arrays of latlngs, with the first array representing the outer shape and the other arrays representing holes in the outer shape:
   *
   * ```js
   * var latlngs = [
   *   [[37, -109.05],[41, -109.03],[41, -102.05],[37, -102.04]], // outer ring
   *   [[37.29, -108.58],[40.71, -108.58],[40.71, -102.50],[37.29, -102.50]] // hole
   * ];
   * ```
   *
   * Additionally, you can pass a multi-dimensional array to represent a MultiPolygon shape.
   *
   * ```js
   * var latlngs = [
   *   [ // first polygon
   *     [[37, -109.05],[41, -109.03],[41, -102.05],[37, -102.04]], // outer ring
   *     [[37.29, -108.58],[40.71, -108.58],[40.71, -102.50],[37.29, -102.50]] // hole
   *   ],
   *   [ // second polygon
   *     [[41, -111.03],[45, -111.04],[45, -104.05],[41, -104.05]]
   *   ]
   * ];
   * ```
   */

  var Polygon = Polyline.extend({
    options: {
      fill: true
    },
    isEmpty: function () {
      return !this._latlngs.length || !this._latlngs[0].length;
    },
    // @method getCenter(): LatLng
    // Returns the center ([centroid](http://en.wikipedia.org/wiki/Centroid)) of the Polygon.
    getCenter: function () {
      // throws error when not yet added to map as this center calculation requires projected coordinates
      if (!this._map) {
        throw new Error('Must add layer to map before using getCenter()');
      }
      return polygonCenter(this._defaultShape(), this._map.options.crs);
    },
    _convertLatLngs: function (latlngs) {
      var result = Polyline.prototype._convertLatLngs.call(this, latlngs),
        len = result.length;

      // remove last point if it equals first one
      if (len >= 2 && result[0] instanceof LatLng && result[0].equals(result[len - 1])) {
        result.pop();
      }
      return result;
    },
    _setLatLngs: function (latlngs) {
      Polyline.prototype._setLatLngs.call(this, latlngs);
      if (isFlat(this._latlngs)) {
        this._latlngs = [this._latlngs];
      }
    },
    _defaultShape: function () {
      return isFlat(this._latlngs[0]) ? this._latlngs[0] : this._latlngs[0][0];
    },
    _clipPoints: function () {
      // polygons need a different clipping algorithm so we redefine that

      var bounds = this._renderer._bounds,
        w = this.options.weight,
        p = new Point(w, w);

      // increase clip padding by stroke width to avoid stroke on clip edges
      bounds = new Bounds(bounds.min.subtract(p), bounds.max.add(p));
      this._parts = [];
      if (!this._pxBounds || !this._pxBounds.intersects(bounds)) {
        return;
      }
      if (this.options.noClip) {
        this._parts = this._rings;
        return;
      }
      for (var i = 0, len = this._rings.length, clipped; i < len; i++) {
        clipped = clipPolygon(this._rings[i], bounds, true);
        if (clipped.length) {
          this._parts.push(clipped);
        }
      }
    },
    _updatePath: function () {
      this._renderer._updatePoly(this, true);
    },
    // Needed by the `Canvas` renderer for interactivity
    _containsPoint: function (p) {
      var inside = false,
        part,
        p1,
        p2,
        i,
        j,
        k,
        len,
        len2;
      if (!this._pxBounds || !this._pxBounds.contains(p)) {
        return false;
      }

      // ray casting algorithm for detecting if point is in polygon
      for (i = 0, len = this._parts.length; i < len; i++) {
        part = this._parts[i];
        for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
          p1 = part[j];
          p2 = part[k];
          if (p1.y > p.y !== p2.y > p.y && p.x < (p2.x - p1.x) * (p.y - p1.y) / (p2.y - p1.y) + p1.x) {
            inside = !inside;
          }
        }
      }

      // also check if it's on polygon stroke
      return inside || Polyline.prototype._containsPoint.call(this, p, true);
    }
  });

  // @factory L.polygon(latlngs: LatLng[], options?: Polyline options)
  function polygon(latlngs, options) {
    return new Polygon(latlngs, options);
  }

  /*
   * @class GeoJSON
   * @aka L.GeoJSON
   * @inherits FeatureGroup
   *
   * Represents a GeoJSON object or an array of GeoJSON objects. Allows you to parse
   * GeoJSON data and display it on the map. Extends `FeatureGroup`.
   *
   * @example
   *
   * ```js
   * L.geoJSON(data, {
   * 	style: function (feature) {
   * 		return {color: feature.properties.color};
   * 	}
   * }).bindPopup(function (layer) {
   * 	return layer.feature.properties.description;
   * }).addTo(map);
   * ```
   */

  var GeoJSON = FeatureGroup.extend({
    /* @section
     * @aka GeoJSON options
     *
     * @option pointToLayer: Function = *
     * A `Function` defining how GeoJSON points spawn Leaflet layers. It is internally
     * called when data is added, passing the GeoJSON point feature and its `LatLng`.
     * The default is to spawn a default `Marker`:
     * ```js
     * function(geoJsonPoint, latlng) {
     * 	return L.marker(latlng);
     * }
     * ```
     *
     * @option style: Function = *
     * A `Function` defining the `Path options` for styling GeoJSON lines and polygons,
     * called internally when data is added.
     * The default value is to not override any defaults:
     * ```js
     * function (geoJsonFeature) {
     * 	return {}
     * }
     * ```
     *
     * @option onEachFeature: Function = *
     * A `Function` that will be called once for each created `Feature`, after it has
     * been created and styled. Useful for attaching events and popups to features.
     * The default is to do nothing with the newly created layers:
     * ```js
     * function (feature, layer) {}
     * ```
     *
     * @option filter: Function = *
     * A `Function` that will be used to decide whether to include a feature or not.
     * The default is to include all features:
     * ```js
     * function (geoJsonFeature) {
     * 	return true;
     * }
     * ```
     * Note: dynamically changing the `filter` option will have effect only on newly
     * added data. It will _not_ re-evaluate already included features.
     *
     * @option coordsToLatLng: Function = *
     * A `Function` that will be used for converting GeoJSON coordinates to `LatLng`s.
     * The default is the `coordsToLatLng` static method.
     *
     * @option markersInheritOptions: Boolean = false
     * Whether default Markers for "Point" type Features inherit from group options.
     */

    initialize: function (geojson, options) {
      setOptions(this, options);
      this._layers = {};
      if (geojson) {
        this.addData(geojson);
      }
    },
    // @method addData( <GeoJSON> data ): this
    // Adds a GeoJSON object to the layer.
    addData: function (geojson) {
      var features = isArray(geojson) ? geojson : geojson.features,
        i,
        len,
        feature;
      if (features) {
        for (i = 0, len = features.length; i < len; i++) {
          // only add this if geometry or geometries are set and not null
          feature = features[i];
          if (feature.geometries || feature.geometry || feature.features || feature.coordinates) {
            this.addData(feature);
          }
        }
        return this;
      }
      var options = this.options;
      if (options.filter && !options.filter(geojson)) {
        return this;
      }
      var layer = geometryToLayer(geojson, options);
      if (!layer) {
        return this;
      }
      layer.feature = asFeature(geojson);
      layer.defaultOptions = layer.options;
      this.resetStyle(layer);
      if (options.onEachFeature) {
        options.onEachFeature(geojson, layer);
      }
      return this.addLayer(layer);
    },
    // @method resetStyle( <Path> layer? ): this
    // Resets the given vector layer's style to the original GeoJSON style, useful for resetting style after hover events.
    // If `layer` is omitted, the style of all features in the current layer is reset.
    resetStyle: function (layer) {
      if (layer === undefined) {
        return this.eachLayer(this.resetStyle, this);
      }
      // reset any custom styles
      layer.options = extend({}, layer.defaultOptions);
      this._setLayerStyle(layer, this.options.style);
      return this;
    },
    // @method setStyle( <Function> style ): this
    // Changes styles of GeoJSON vector layers with the given style function.
    setStyle: function (style) {
      return this.eachLayer(function (layer) {
        this._setLayerStyle(layer, style);
      }, this);
    },
    _setLayerStyle: function (layer, style) {
      if (layer.setStyle) {
        if (typeof style === 'function') {
          style = style(layer.feature);
        }
        layer.setStyle(style);
      }
    }
  });

  // @section
  // There are several static functions which can be called without instantiating L.GeoJSON:

  // @function geometryToLayer(featureData: Object, options?: GeoJSON options): Layer
  // Creates a `Layer` from a given GeoJSON feature. Can use a custom
  // [`pointToLayer`](#geojson-pointtolayer) and/or [`coordsToLatLng`](#geojson-coordstolatlng)
  // functions if provided as options.
  function geometryToLayer(geojson, options) {
    var geometry = geojson.type === 'Feature' ? geojson.geometry : geojson,
      coords = geometry ? geometry.coordinates : null,
      layers = [],
      pointToLayer = options && options.pointToLayer,
      _coordsToLatLng = options && options.coordsToLatLng || coordsToLatLng,
      latlng,
      latlngs,
      i,
      len;
    if (!coords && !geometry) {
      return null;
    }
    switch (geometry.type) {
      case 'Point':
        latlng = _coordsToLatLng(coords);
        return _pointToLayer(pointToLayer, geojson, latlng, options);
      case 'MultiPoint':
        for (i = 0, len = coords.length; i < len; i++) {
          latlng = _coordsToLatLng(coords[i]);
          layers.push(_pointToLayer(pointToLayer, geojson, latlng, options));
        }
        return new FeatureGroup(layers);
      case 'LineString':
      case 'MultiLineString':
        latlngs = coordsToLatLngs(coords, geometry.type === 'LineString' ? 0 : 1, _coordsToLatLng);
        return new Polyline(latlngs, options);
      case 'Polygon':
      case 'MultiPolygon':
        latlngs = coordsToLatLngs(coords, geometry.type === 'Polygon' ? 1 : 2, _coordsToLatLng);
        return new Polygon(latlngs, options);
      case 'GeometryCollection':
        for (i = 0, len = geometry.geometries.length; i < len; i++) {
          var geoLayer = geometryToLayer({
            geometry: geometry.geometries[i],
            type: 'Feature',
            properties: geojson.properties
          }, options);
          if (geoLayer) {
            layers.push(geoLayer);
          }
        }
        return new FeatureGroup(layers);
      case 'FeatureCollection':
        for (i = 0, len = geometry.features.length; i < len; i++) {
          var featureLayer = geometryToLayer(geometry.features[i], options);
          if (featureLayer) {
            layers.push(featureLayer);
          }
        }
        return new FeatureGroup(layers);
      default:
        throw new Error('Invalid GeoJSON object.');
    }
  }
  function _pointToLayer(pointToLayerFn, geojson, latlng, options) {
    return pointToLayerFn ? pointToLayerFn(geojson, latlng) : new Marker(latlng, options && options.markersInheritOptions && options);
  }

  // @function coordsToLatLng(coords: Array): LatLng
  // Creates a `LatLng` object from an array of 2 numbers (longitude, latitude)
  // or 3 numbers (longitude, latitude, altitude) used in GeoJSON for points.
  function coordsToLatLng(coords) {
    return new LatLng(coords[1], coords[0], coords[2]);
  }

  // @function coordsToLatLngs(coords: Array, levelsDeep?: Number, coordsToLatLng?: Function): Array
  // Creates a multidimensional array of `LatLng`s from a GeoJSON coordinates array.
  // `levelsDeep` specifies the nesting level (0 is for an array of points, 1 for an array of arrays of points, etc., 0 by default).
  // Can use a custom [`coordsToLatLng`](#geojson-coordstolatlng) function.
  function coordsToLatLngs(coords, levelsDeep, _coordsToLatLng) {
    var latlngs = [];
    for (var i = 0, len = coords.length, latlng; i < len; i++) {
      latlng = levelsDeep ? coordsToLatLngs(coords[i], levelsDeep - 1, _coordsToLatLng) : (_coordsToLatLng || coordsToLatLng)(coords[i]);
      latlngs.push(latlng);
    }
    return latlngs;
  }

  // @function latLngToCoords(latlng: LatLng, precision?: Number|false): Array
  // Reverse of [`coordsToLatLng`](#geojson-coordstolatlng)
  // Coordinates values are rounded with [`formatNum`](#util-formatnum) function.
  function latLngToCoords(latlng, precision) {
    latlng = toLatLng(latlng);
    return latlng.alt !== undefined ? [formatNum(latlng.lng, precision), formatNum(latlng.lat, precision), formatNum(latlng.alt, precision)] : [formatNum(latlng.lng, precision), formatNum(latlng.lat, precision)];
  }

  // @function latLngsToCoords(latlngs: Array, levelsDeep?: Number, closed?: Boolean, precision?: Number|false): Array
  // Reverse of [`coordsToLatLngs`](#geojson-coordstolatlngs)
  // `closed` determines whether the first point should be appended to the end of the array to close the feature, only used when `levelsDeep` is 0. False by default.
  // Coordinates values are rounded with [`formatNum`](#util-formatnum) function.
  function latLngsToCoords(latlngs, levelsDeep, closed, precision) {
    var coords = [];
    for (var i = 0, len = latlngs.length; i < len; i++) {
      // Check for flat arrays required to ensure unbalanced arrays are correctly converted in recursion
      coords.push(levelsDeep ? latLngsToCoords(latlngs[i], isFlat(latlngs[i]) ? 0 : levelsDeep - 1, closed, precision) : latLngToCoords(latlngs[i], precision));
    }
    if (!levelsDeep && closed && coords.length > 0) {
      coords.push(coords[0].slice());
    }
    return coords;
  }
  function getFeature(layer, newGeometry) {
    return layer.feature ? extend({}, layer.feature, {
      geometry: newGeometry
    }) : asFeature(newGeometry);
  }

  // @function asFeature(geojson: Object): Object
  // Normalize GeoJSON geometries/features into GeoJSON features.
  function asFeature(geojson) {
    if (geojson.type === 'Feature' || geojson.type === 'FeatureCollection') {
      return geojson;
    }
    return {
      type: 'Feature',
      properties: {},
      geometry: geojson
    };
  }
  var PointToGeoJSON = {
    toGeoJSON: function (precision) {
      return getFeature(this, {
        type: 'Point',
        coordinates: latLngToCoords(this.getLatLng(), precision)
      });
    }
  };

  // @namespace Marker
  // @section Other methods
  // @method toGeoJSON(precision?: Number|false): Object
  // Coordinates values are rounded with [`formatNum`](#util-formatnum) function with given `precision`.
  // Returns a [`GeoJSON`](https://en.wikipedia.org/wiki/GeoJSON) representation of the marker (as a GeoJSON `Point` Feature).
  Marker.include(PointToGeoJSON);

  // @namespace CircleMarker
  // @method toGeoJSON(precision?: Number|false): Object
  // Coordinates values are rounded with [`formatNum`](#util-formatnum) function with given `precision`.
  // Returns a [`GeoJSON`](https://en.wikipedia.org/wiki/GeoJSON) representation of the circle marker (as a GeoJSON `Point` Feature).
  Circle.include(PointToGeoJSON);
  CircleMarker.include(PointToGeoJSON);

  // @namespace Polyline
  // @method toGeoJSON(precision?: Number|false): Object
  // Coordinates values are rounded with [`formatNum`](#util-formatnum) function with given `precision`.
  // Returns a [`GeoJSON`](https://en.wikipedia.org/wiki/GeoJSON) representation of the polyline (as a GeoJSON `LineString` or `MultiLineString` Feature).
  Polyline.include({
    toGeoJSON: function (precision) {
      var multi = !isFlat(this._latlngs);
      var coords = latLngsToCoords(this._latlngs, multi ? 1 : 0, false, precision);
      return getFeature(this, {
        type: (multi ? 'Multi' : '') + 'LineString',
        coordinates: coords
      });
    }
  });

  // @namespace Polygon
  // @method toGeoJSON(precision?: Number|false): Object
  // Coordinates values are rounded with [`formatNum`](#util-formatnum) function with given `precision`.
  // Returns a [`GeoJSON`](https://en.wikipedia.org/wiki/GeoJSON) representation of the polygon (as a GeoJSON `Polygon` or `MultiPolygon` Feature).
  Polygon.include({
    toGeoJSON: function (precision) {
      var holes = !isFlat(this._latlngs),
        multi = holes && !isFlat(this._latlngs[0]);
      var coords = latLngsToCoords(this._latlngs, multi ? 2 : holes ? 1 : 0, true, precision);
      if (!holes) {
        coords = [coords];
      }
      return getFeature(this, {
        type: (multi ? 'Multi' : '') + 'Polygon',
        coordinates: coords
      });
    }
  });

  // @namespace LayerGroup
  LayerGroup.include({
    toMultiPoint: function (precision) {
      var coords = [];
      this.eachLayer(function (layer) {
        coords.push(layer.toGeoJSON(precision).geometry.coordinates);
      });
      return getFeature(this, {
        type: 'MultiPoint',
        coordinates: coords
      });
    },
    // @method toGeoJSON(precision?: Number|false): Object
    // Coordinates values are rounded with [`formatNum`](#util-formatnum) function with given `precision`.
    // Returns a [`GeoJSON`](https://en.wikipedia.org/wiki/GeoJSON) representation of the layer group (as a GeoJSON `FeatureCollection`, `GeometryCollection`, or `MultiPoint`).
    toGeoJSON: function (precision) {
      var type = this.feature && this.feature.geometry && this.feature.geometry.type;
      if (type === 'MultiPoint') {
        return this.toMultiPoint(precision);
      }
      var isGeometryCollection = type === 'GeometryCollection',
        jsons = [];
      this.eachLayer(function (layer) {
        if (layer.toGeoJSON) {
          var json = layer.toGeoJSON(precision);
          if (isGeometryCollection) {
            jsons.push(json.geometry);
          } else {
            var feature = asFeature(json);
            // Squash nested feature collections
            if (feature.type === 'FeatureCollection') {
              jsons.push.apply(jsons, feature.features);
            } else {
              jsons.push(feature);
            }
          }
        }
      });
      if (isGeometryCollection) {
        return getFeature(this, {
          geometries: jsons,
          type: 'GeometryCollection'
        });
      }
      return {
        type: 'FeatureCollection',
        features: jsons
      };
    }
  });

  // @namespace GeoJSON
  // @factory L.geoJSON(geojson?: Object, options?: GeoJSON options)
  // Creates a GeoJSON layer. Optionally accepts an object in
  // [GeoJSON format](https://tools.ietf.org/html/rfc7946) to display on the map
  // (you can alternatively add it later with `addData` method) and an `options` object.
  function geoJSON(geojson, options) {
    return new GeoJSON(geojson, options);
  }

  // Backward compatibility.
  var geoJson = geoJSON;

  /*
   * @class ImageOverlay
   * @aka L.ImageOverlay
   * @inherits Interactive layer
   *
   * Used to load and display a single image over specific bounds of the map. Extends `Layer`.
   *
   * @example
   *
   * ```js
   * var imageUrl = 'https://maps.lib.utexas.edu/maps/historical/newark_nj_1922.jpg',
   * 	imageBounds = [[40.712216, -74.22655], [40.773941, -74.12544]];
   * L.imageOverlay(imageUrl, imageBounds).addTo(map);
   * ```
   */

  var ImageOverlay = Layer.extend({
    // @section
    // @aka ImageOverlay options
    options: {
      // @option opacity: Number = 1.0
      // The opacity of the image overlay.
      opacity: 1,
      // @option alt: String = ''
      // Text for the `alt` attribute of the image (useful for accessibility).
      alt: '',
      // @option interactive: Boolean = false
      // If `true`, the image overlay will emit [mouse events](#interactive-layer) when clicked or hovered.
      interactive: false,
      // @option crossOrigin: Boolean|String = false
      // Whether the crossOrigin attribute will be added to the image.
      // If a String is provided, the image will have its crossOrigin attribute set to the String provided. This is needed if you want to access image pixel data.
      // Refer to [CORS Settings](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_settings_attributes) for valid String values.
      crossOrigin: false,
      // @option errorOverlayUrl: String = ''
      // URL to the overlay image to show in place of the overlay that failed to load.
      errorOverlayUrl: '',
      // @option zIndex: Number = 1
      // The explicit [zIndex](https://developer.mozilla.org/docs/Web/CSS/CSS_Positioning/Understanding_z_index) of the overlay layer.
      zIndex: 1,
      // @option className: String = ''
      // A custom class name to assign to the image. Empty by default.
      className: ''
    },
    initialize: function (url, bounds, options) {
      // (String, LatLngBounds, Object)
      this._url = url;
      this._bounds = toLatLngBounds(bounds);
      setOptions(this, options);
    },
    onAdd: function () {
      if (!this._image) {
        this._initImage();
        if (this.options.opacity < 1) {
          this._updateOpacity();
        }
      }
      if (this.options.interactive) {
        addClass(this._image, 'leaflet-interactive');
        this.addInteractiveTarget(this._image);
      }
      this.getPane().appendChild(this._image);
      this._reset();
    },
    onRemove: function () {
      remove(this._image);
      if (this.options.interactive) {
        this.removeInteractiveTarget(this._image);
      }
    },
    // @method setOpacity(opacity: Number): this
    // Sets the opacity of the overlay.
    setOpacity: function (opacity) {
      this.options.opacity = opacity;
      if (this._image) {
        this._updateOpacity();
      }
      return this;
    },
    setStyle: function (styleOpts) {
      if (styleOpts.opacity) {
        this.setOpacity(styleOpts.opacity);
      }
      return this;
    },
    // @method bringToFront(): this
    // Brings the layer to the top of all overlays.
    bringToFront: function () {
      if (this._map) {
        toFront(this._image);
      }
      return this;
    },
    // @method bringToBack(): this
    // Brings the layer to the bottom of all overlays.
    bringToBack: function () {
      if (this._map) {
        toBack(this._image);
      }
      return this;
    },
    // @method setUrl(url: String): this
    // Changes the URL of the image.
    setUrl: function (url) {
      this._url = url;
      if (this._image) {
        this._image.src = url;
      }
      return this;
    },
    // @method setBounds(bounds: LatLngBounds): this
    // Update the bounds that this ImageOverlay covers
    setBounds: function (bounds) {
      this._bounds = toLatLngBounds(bounds);
      if (this._map) {
        this._reset();
      }
      return this;
    },
    getEvents: function () {
      var events = {
        zoom: this._reset,
        viewreset: this._reset
      };
      if (this._zoomAnimated) {
        events.zoomanim = this._animateZoom;
      }
      return events;
    },
    // @method setZIndex(value: Number): this
    // Changes the [zIndex](#imageoverlay-zindex) of the image overlay.
    setZIndex: function (value) {
      this.options.zIndex = value;
      this._updateZIndex();
      return this;
    },
    // @method getBounds(): LatLngBounds
    // Get the bounds that this ImageOverlay covers
    getBounds: function () {
      return this._bounds;
    },
    // @method getElement(): HTMLElement
    // Returns the instance of [`HTMLImageElement`](https://developer.mozilla.org/docs/Web/API/HTMLImageElement)
    // used by this overlay.
    getElement: function () {
      return this._image;
    },
    _initImage: function () {
      var wasElementSupplied = this._url.tagName === 'IMG';
      var img = this._image = wasElementSupplied ? this._url : create$1('img');
      addClass(img, 'leaflet-image-layer');
      if (this._zoomAnimated) {
        addClass(img, 'leaflet-zoom-animated');
      }
      if (this.options.className) {
        addClass(img, this.options.className);
      }
      img.onselectstart = falseFn;
      img.onmousemove = falseFn;

      // @event load: Event
      // Fired when the ImageOverlay layer has loaded its image
      img.onload = bind(this.fire, this, 'load');
      img.onerror = bind(this._overlayOnError, this, 'error');
      if (this.options.crossOrigin || this.options.crossOrigin === '') {
        img.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
      }
      if (this.options.zIndex) {
        this._updateZIndex();
      }
      if (wasElementSupplied) {
        this._url = img.src;
        return;
      }
      img.src = this._url;
      img.alt = this.options.alt;
    },
    _animateZoom: function (e) {
      var scale = this._map.getZoomScale(e.zoom),
        offset = this._map._latLngBoundsToNewLayerBounds(this._bounds, e.zoom, e.center).min;
      setTransform(this._image, offset, scale);
    },
    _reset: function () {
      var image = this._image,
        bounds = new Bounds(this._map.latLngToLayerPoint(this._bounds.getNorthWest()), this._map.latLngToLayerPoint(this._bounds.getSouthEast())),
        size = bounds.getSize();
      setPosition(image, bounds.min);
      image.style.width = size.x + 'px';
      image.style.height = size.y + 'px';
    },
    _updateOpacity: function () {
      setOpacity(this._image, this.options.opacity);
    },
    _updateZIndex: function () {
      if (this._image && this.options.zIndex !== undefined && this.options.zIndex !== null) {
        this._image.style.zIndex = this.options.zIndex;
      }
    },
    _overlayOnError: function () {
      // @event error: Event
      // Fired when the ImageOverlay layer fails to load its image
      this.fire('error');
      var errorUrl = this.options.errorOverlayUrl;
      if (errorUrl && this._url !== errorUrl) {
        this._url = errorUrl;
        this._image.src = errorUrl;
      }
    },
    // @method getCenter(): LatLng
    // Returns the center of the ImageOverlay.
    getCenter: function () {
      return this._bounds.getCenter();
    }
  });

  // @factory L.imageOverlay(imageUrl: String, bounds: LatLngBounds, options?: ImageOverlay options)
  // Instantiates an image overlay object given the URL of the image and the
  // geographical bounds it is tied to.
  var imageOverlay = function (url, bounds, options) {
    return new ImageOverlay(url, bounds, options);
  };

  /*
   * @class VideoOverlay
   * @aka L.VideoOverlay
   * @inherits ImageOverlay
   *
   * Used to load and display a video player over specific bounds of the map. Extends `ImageOverlay`.
   *
   * A video overlay uses the [`<video>`](https://developer.mozilla.org/docs/Web/HTML/Element/video)
   * HTML5 element.
   *
   * @example
   *
   * ```js
   * var videoUrl = 'https://www.mapbox.com/bites/00188/patricia_nasa.webm',
   * 	videoBounds = [[ 32, -130], [ 13, -100]];
   * L.videoOverlay(videoUrl, videoBounds ).addTo(map);
   * ```
   */

  var VideoOverlay = ImageOverlay.extend({
    // @section
    // @aka VideoOverlay options
    options: {
      // @option autoplay: Boolean = true
      // Whether the video starts playing automatically when loaded.
      // On some browsers autoplay will only work with `muted: true`
      autoplay: true,
      // @option loop: Boolean = true
      // Whether the video will loop back to the beginning when played.
      loop: true,
      // @option keepAspectRatio: Boolean = true
      // Whether the video will save aspect ratio after the projection.
      // Relevant for supported browsers. See [browser compatibility](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit)
      keepAspectRatio: true,
      // @option muted: Boolean = false
      // Whether the video starts on mute when loaded.
      muted: false,
      // @option playsInline: Boolean = true
      // Mobile browsers will play the video right where it is instead of open it up in fullscreen mode.
      playsInline: true
    },
    _initImage: function () {
      var wasElementSupplied = this._url.tagName === 'VIDEO';
      var vid = this._image = wasElementSupplied ? this._url : create$1('video');
      addClass(vid, 'leaflet-image-layer');
      if (this._zoomAnimated) {
        addClass(vid, 'leaflet-zoom-animated');
      }
      if (this.options.className) {
        addClass(vid, this.options.className);
      }
      vid.onselectstart = falseFn;
      vid.onmousemove = falseFn;

      // @event load: Event
      // Fired when the video has finished loading the first frame
      vid.onloadeddata = bind(this.fire, this, 'load');
      if (wasElementSupplied) {
        var sourceElements = vid.getElementsByTagName('source');
        var sources = [];
        for (var j = 0; j < sourceElements.length; j++) {
          sources.push(sourceElements[j].src);
        }
        this._url = sourceElements.length > 0 ? sources : [vid.src];
        return;
      }
      if (!isArray(this._url)) {
        this._url = [this._url];
      }
      if (!this.options.keepAspectRatio && Object.prototype.hasOwnProperty.call(vid.style, 'objectFit')) {
        vid.style['objectFit'] = 'fill';
      }
      vid.autoplay = !!this.options.autoplay;
      vid.loop = !!this.options.loop;
      vid.muted = !!this.options.muted;
      vid.playsInline = !!this.options.playsInline;
      for (var i = 0; i < this._url.length; i++) {
        var source = create$1('source');
        source.src = this._url[i];
        vid.appendChild(source);
      }
    }

    // @method getElement(): HTMLVideoElement
    // Returns the instance of [`HTMLVideoElement`](https://developer.mozilla.org/docs/Web/API/HTMLVideoElement)
    // used by this overlay.
  });

  // @factory L.videoOverlay(video: String|Array|HTMLVideoElement, bounds: LatLngBounds, options?: VideoOverlay options)
  // Instantiates an image overlay object given the URL of the video (or array of URLs, or even a video element) and the
  // geographical bounds it is tied to.

  function videoOverlay(video, bounds, options) {
    return new VideoOverlay(video, bounds, options);
  }

  /*
   * @class SVGOverlay
   * @aka L.SVGOverlay
   * @inherits ImageOverlay
   *
   * Used to load, display and provide DOM access to an SVG file over specific bounds of the map. Extends `ImageOverlay`.
   *
   * An SVG overlay uses the [`<svg>`](https://developer.mozilla.org/docs/Web/SVG/Element/svg) element.
   *
   * @example
   *
   * ```js
   * var svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
   * svgElement.setAttribute('xmlns', "http://www.w3.org/2000/svg");
   * svgElement.setAttribute('viewBox', "0 0 200 200");
   * svgElement.innerHTML = '<rect width="200" height="200"/><rect x="75" y="23" width="50" height="50" style="fill:red"/><rect x="75" y="123" width="50" height="50" style="fill:#0013ff"/>';
   * var svgElementBounds = [ [ 32, -130 ], [ 13, -100 ] ];
   * L.svgOverlay(svgElement, svgElementBounds).addTo(map);
   * ```
   */

  var SVGOverlay = ImageOverlay.extend({
    _initImage: function () {
      var el = this._image = this._url;
      addClass(el, 'leaflet-image-layer');
      if (this._zoomAnimated) {
        addClass(el, 'leaflet-zoom-animated');
      }
      if (this.options.className) {
        addClass(el, this.options.className);
      }
      el.onselectstart = falseFn;
      el.onmousemove = falseFn;
    }

    // @method getElement(): SVGElement
    // Returns the instance of [`SVGElement`](https://developer.mozilla.org/docs/Web/API/SVGElement)
    // used by this overlay.
  });

  // @factory L.svgOverlay(svg: String|SVGElement, bounds: LatLngBounds, options?: SVGOverlay options)
  // Instantiates an image overlay object given an SVG element and the geographical bounds it is tied to.
  // A viewBox attribute is required on the SVG element to zoom in and out properly.

  function svgOverlay(el, bounds, options) {
    return new SVGOverlay(el, bounds, options);
  }

  /*
   * @class DivOverlay
   * @inherits Interactive layer
   * @aka L.DivOverlay
   * Base model for L.Popup and L.Tooltip. Inherit from it for custom overlays like plugins.
   */

  // @namespace DivOverlay
  var DivOverlay = Layer.extend({
    // @section
    // @aka DivOverlay options
    options: {
      // @option interactive: Boolean = false
      // If true, the popup/tooltip will listen to the mouse events.
      interactive: false,
      // @option offset: Point = Point(0, 0)
      // The offset of the overlay position.
      offset: [0, 0],
      // @option className: String = ''
      // A custom CSS class name to assign to the overlay.
      className: '',
      // @option pane: String = undefined
      // `Map pane` where the overlay will be added.
      pane: undefined,
      // @option content: String|HTMLElement|Function = ''
      // Sets the HTML content of the overlay while initializing. If a function is passed the source layer will be
      // passed to the function. The function should return a `String` or `HTMLElement` to be used in the overlay.
      content: ''
    },
    initialize: function (options, source) {
      if (options && (options instanceof LatLng || isArray(options))) {
        this._latlng = toLatLng(options);
        setOptions(this, source);
      } else {
        setOptions(this, options);
        this._source = source;
      }
      if (this.options.content) {
        this._content = this.options.content;
      }
    },
    // @method openOn(map: Map): this
    // Adds the overlay to the map.
    // Alternative to `map.openPopup(popup)`/`.openTooltip(tooltip)`.
    openOn: function (map) {
      map = arguments.length ? map : this._source._map; // experimental, not the part of public api
      if (!map.hasLayer(this)) {
        map.addLayer(this);
      }
      return this;
    },
    // @method close(): this
    // Closes the overlay.
    // Alternative to `map.closePopup(popup)`/`.closeTooltip(tooltip)`
    // and `layer.closePopup()`/`.closeTooltip()`.
    close: function () {
      if (this._map) {
        this._map.removeLayer(this);
      }
      return this;
    },
    // @method toggle(layer?: Layer): this
    // Opens or closes the overlay bound to layer depending on its current state.
    // Argument may be omitted only for overlay bound to layer.
    // Alternative to `layer.togglePopup()`/`.toggleTooltip()`.
    toggle: function (layer) {
      if (this._map) {
        this.close();
      } else {
        if (arguments.length) {
          this._source = layer;
        } else {
          layer = this._source;
        }
        this._prepareOpen();

        // open the overlay on the map
        this.openOn(layer._map);
      }
      return this;
    },
    onAdd: function (map) {
      this._zoomAnimated = map._zoomAnimated;
      if (!this._container) {
        this._initLayout();
      }
      if (map._fadeAnimated) {
        setOpacity(this._container, 0);
      }
      clearTimeout(this._removeTimeout);
      this.getPane().appendChild(this._container);
      this.update();
      if (map._fadeAnimated) {
        setOpacity(this._container, 1);
      }
      this.bringToFront();
      if (this.options.interactive) {
        addClass(this._container, 'leaflet-interactive');
        this.addInteractiveTarget(this._container);
      }
    },
    onRemove: function (map) {
      if (map._fadeAnimated) {
        setOpacity(this._container, 0);
        this._removeTimeout = setTimeout(bind(remove, undefined, this._container), 200);
      } else {
        remove(this._container);
      }
      if (this.options.interactive) {
        removeClass(this._container, 'leaflet-interactive');
        this.removeInteractiveTarget(this._container);
      }
    },
    // @namespace DivOverlay
    // @method getLatLng: LatLng
    // Returns the geographical point of the overlay.
    getLatLng: function () {
      return this._latlng;
    },
    // @method setLatLng(latlng: LatLng): this
    // Sets the geographical point where the overlay will open.
    setLatLng: function (latlng) {
      this._latlng = toLatLng(latlng);
      if (this._map) {
        this._updatePosition();
        this._adjustPan();
      }
      return this;
    },
    // @method getContent: String|HTMLElement
    // Returns the content of the overlay.
    getContent: function () {
      return this._content;
    },
    // @method setContent(htmlContent: String|HTMLElement|Function): this
    // Sets the HTML content of the overlay. If a function is passed the source layer will be passed to the function.
    // The function should return a `String` or `HTMLElement` to be used in the overlay.
    setContent: function (content) {
      this._content = content;
      this.update();
      return this;
    },
    // @method getElement: String|HTMLElement
    // Returns the HTML container of the overlay.
    getElement: function () {
      return this._container;
    },
    // @method update: null
    // Updates the overlay content, layout and position. Useful for updating the overlay after something inside changed, e.g. image loaded.
    update: function () {
      if (!this._map) {
        return;
      }
      this._container.style.visibility = 'hidden';
      this._updateContent();
      this._updateLayout();
      this._updatePosition();
      this._container.style.visibility = '';
      this._adjustPan();
    },
    getEvents: function () {
      var events = {
        zoom: this._updatePosition,
        viewreset: this._updatePosition
      };
      if (this._zoomAnimated) {
        events.zoomanim = this._animateZoom;
      }
      return events;
    },
    // @method isOpen: Boolean
    // Returns `true` when the overlay is visible on the map.
    isOpen: function () {
      return !!this._map && this._map.hasLayer(this);
    },
    // @method bringToFront: this
    // Brings this overlay in front of other overlays (in the same map pane).
    bringToFront: function () {
      if (this._map) {
        toFront(this._container);
      }
      return this;
    },
    // @method bringToBack: this
    // Brings this overlay to the back of other overlays (in the same map pane).
    bringToBack: function () {
      if (this._map) {
        toBack(this._container);
      }
      return this;
    },
    // prepare bound overlay to open: update latlng pos / content source (for FeatureGroup)
    _prepareOpen: function (latlng) {
      var source = this._source;
      if (!source._map) {
        return false;
      }
      if (source instanceof FeatureGroup) {
        source = null;
        var layers = this._source._layers;
        for (var id in layers) {
          if (layers[id]._map) {
            source = layers[id];
            break;
          }
        }
        if (!source) {
          return false;
        } // Unable to get source layer.

        // set overlay source to this layer
        this._source = source;
      }
      if (!latlng) {
        if (source.getCenter) {
          latlng = source.getCenter();
        } else if (source.getLatLng) {
          latlng = source.getLatLng();
        } else if (source.getBounds) {
          latlng = source.getBounds().getCenter();
        } else {
          throw new Error('Unable to get source layer LatLng.');
        }
      }
      this.setLatLng(latlng);
      if (this._map) {
        // update the overlay (content, layout, etc...)
        this.update();
      }
      return true;
    },
    _updateContent: function () {
      if (!this._content) {
        return;
      }
      var node = this._contentNode;
      var content = typeof this._content === 'function' ? this._content(this._source || this) : this._content;
      if (typeof content === 'string') {
        node.innerHTML = content;
      } else {
        while (node.hasChildNodes()) {
          node.removeChild(node.firstChild);
        }
        node.appendChild(content);
      }

      // @namespace DivOverlay
      // @section DivOverlay events
      // @event contentupdate: Event
      // Fired when the content of the overlay is updated
      this.fire('contentupdate');
    },
    _updatePosition: function () {
      if (!this._map) {
        return;
      }
      var pos = this._map.latLngToLayerPoint(this._latlng),
        offset = toPoint(this.options.offset),
        anchor = this._getAnchor();
      if (this._zoomAnimated) {
        setPosition(this._container, pos.add(anchor));
      } else {
        offset = offset.add(pos).add(anchor);
      }
      var bottom = this._containerBottom = -offset.y,
        left = this._containerLeft = -Math.round(this._containerWidth / 2) + offset.x;

      // bottom position the overlay in case the height of the overlay changes (images loading etc)
      this._container.style.bottom = bottom + 'px';
      this._container.style.left = left + 'px';
    },
    _getAnchor: function () {
      return [0, 0];
    }
  });
  Map.include({
    _initOverlay: function (OverlayClass, content, latlng, options) {
      var overlay = content;
      if (!(overlay instanceof OverlayClass)) {
        overlay = new OverlayClass(options).setContent(content);
      }
      if (latlng) {
        overlay.setLatLng(latlng);
      }
      return overlay;
    }
  });
  Layer.include({
    _initOverlay: function (OverlayClass, old, content, options) {
      var overlay = content;
      if (overlay instanceof OverlayClass) {
        setOptions(overlay, options);
        overlay._source = this;
      } else {
        overlay = old && !options ? old : new OverlayClass(options, this);
        overlay.setContent(content);
      }
      return overlay;
    }
  });

  /*
   * @class Popup
   * @inherits DivOverlay
   * @aka L.Popup
   * Used to open popups in certain places of the map. Use [Map.openPopup](#map-openpopup) to
   * open popups while making sure that only one popup is open at one time
   * (recommended for usability), or use [Map.addLayer](#map-addlayer) to open as many as you want.
   *
   * @example
   *
   * If you want to just bind a popup to marker click and then open it, it's really easy:
   *
   * ```js
   * marker.bindPopup(popupContent).openPopup();
   * ```
   * Path overlays like polylines also have a `bindPopup` method.
   *
   * A popup can be also standalone:
   *
   * ```js
   * var popup = L.popup()
   * 	.setLatLng(latlng)
   * 	.setContent('<p>Hello world!<br />This is a nice popup.</p>')
   * 	.openOn(map);
   * ```
   * or
   * ```js
   * var popup = L.popup(latlng, {content: '<p>Hello world!<br />This is a nice popup.</p>')
   * 	.openOn(map);
   * ```
   */

  // @namespace Popup
  var Popup = DivOverlay.extend({
    // @section
    // @aka Popup options
    options: {
      // @option pane: String = 'popupPane'
      // `Map pane` where the popup will be added.
      pane: 'popupPane',
      // @option offset: Point = Point(0, 7)
      // The offset of the popup position.
      offset: [0, 7],
      // @option maxWidth: Number = 300
      // Max width of the popup, in pixels.
      maxWidth: 300,
      // @option minWidth: Number = 50
      // Min width of the popup, in pixels.
      minWidth: 50,
      // @option maxHeight: Number = null
      // If set, creates a scrollable container of the given height
      // inside a popup if its content exceeds it.
      // The scrollable container can be styled using the
      // `leaflet-popup-scrolled` CSS class selector.
      maxHeight: null,
      // @option autoPan: Boolean = true
      // Set it to `false` if you don't want the map to do panning animation
      // to fit the opened popup.
      autoPan: true,
      // @option autoPanPaddingTopLeft: Point = null
      // The margin between the popup and the top left corner of the map
      // view after autopanning was performed.
      autoPanPaddingTopLeft: null,
      // @option autoPanPaddingBottomRight: Point = null
      // The margin between the popup and the bottom right corner of the map
      // view after autopanning was performed.
      autoPanPaddingBottomRight: null,
      // @option autoPanPadding: Point = Point(5, 5)
      // Equivalent of setting both top left and bottom right autopan padding to the same value.
      autoPanPadding: [5, 5],
      // @option keepInView: Boolean = false
      // Set it to `true` if you want to prevent users from panning the popup
      // off of the screen while it is open.
      keepInView: false,
      // @option closeButton: Boolean = true
      // Controls the presence of a close button in the popup.
      closeButton: true,
      // @option autoClose: Boolean = true
      // Set it to `false` if you want to override the default behavior of
      // the popup closing when another popup is opened.
      autoClose: true,
      // @option closeOnEscapeKey: Boolean = true
      // Set it to `false` if you want to override the default behavior of
      // the ESC key for closing of the popup.
      closeOnEscapeKey: true,
      // @option closeOnClick: Boolean = *
      // Set it if you want to override the default behavior of the popup closing when user clicks
      // on the map. Defaults to the map's [`closePopupOnClick`](#map-closepopuponclick) option.

      // @option className: String = ''
      // A custom CSS class name to assign to the popup.
      className: ''
    },
    // @namespace Popup
    // @method openOn(map: Map): this
    // Alternative to `map.openPopup(popup)`.
    // Adds the popup to the map and closes the previous one.
    openOn: function (map) {
      map = arguments.length ? map : this._source._map; // experimental, not the part of public api

      if (!map.hasLayer(this) && map._popup && map._popup.options.autoClose) {
        map.removeLayer(map._popup);
      }
      map._popup = this;
      return DivOverlay.prototype.openOn.call(this, map);
    },
    onAdd: function (map) {
      DivOverlay.prototype.onAdd.call(this, map);

      // @namespace Map
      // @section Popup events
      // @event popupopen: PopupEvent
      // Fired when a popup is opened in the map
      map.fire('popupopen', {
        popup: this
      });
      if (this._source) {
        // @namespace Layer
        // @section Popup events
        // @event popupopen: PopupEvent
        // Fired when a popup bound to this layer is opened
        this._source.fire('popupopen', {
          popup: this
        }, true);
        // For non-path layers, we toggle the popup when clicking
        // again the layer, so prevent the map to reopen it.
        if (!(this._source instanceof Path)) {
          this._source.on('preclick', stopPropagation);
        }
      }
    },
    onRemove: function (map) {
      DivOverlay.prototype.onRemove.call(this, map);

      // @namespace Map
      // @section Popup events
      // @event popupclose: PopupEvent
      // Fired when a popup in the map is closed
      map.fire('popupclose', {
        popup: this
      });
      if (this._source) {
        // @namespace Layer
        // @section Popup events
        // @event popupclose: PopupEvent
        // Fired when a popup bound to this layer is closed
        this._source.fire('popupclose', {
          popup: this
        }, true);
        if (!(this._source instanceof Path)) {
          this._source.off('preclick', stopPropagation);
        }
      }
    },
    getEvents: function () {
      var events = DivOverlay.prototype.getEvents.call(this);
      if (this.options.closeOnClick !== undefined ? this.options.closeOnClick : this._map.options.closePopupOnClick) {
        events.preclick = this.close;
      }
      if (this.options.keepInView) {
        events.moveend = this._adjustPan;
      }
      return events;
    },
    _initLayout: function () {
      var prefix = 'leaflet-popup',
        container = this._container = create$1('div', prefix + ' ' + (this.options.className || '') + ' leaflet-zoom-animated');
      var wrapper = this._wrapper = create$1('div', prefix + '-content-wrapper', container);
      this._contentNode = create$1('div', prefix + '-content', wrapper);
      disableClickPropagation(container);
      disableScrollPropagation(this._contentNode);
      on(container, 'contextmenu', stopPropagation);
      this._tipContainer = create$1('div', prefix + '-tip-container', container);
      this._tip = create$1('div', prefix + '-tip', this._tipContainer);
      if (this.options.closeButton) {
        var closeButton = this._closeButton = create$1('a', prefix + '-close-button', container);
        closeButton.setAttribute('role', 'button'); // overrides the implicit role=link of <a> elements #7399
        closeButton.setAttribute('aria-label', 'Close popup');
        closeButton.href = '#close';
        closeButton.innerHTML = '<span aria-hidden="true">&#215;</span>';
        on(closeButton, 'click', function (ev) {
          preventDefault(ev);
          this.close();
        }, this);
      }
    },
    _updateLayout: function () {
      var container = this._contentNode,
        style = container.style;
      style.width = '';
      style.whiteSpace = 'nowrap';
      var width = container.offsetWidth;
      width = Math.min(width, this.options.maxWidth);
      width = Math.max(width, this.options.minWidth);
      style.width = width + 1 + 'px';
      style.whiteSpace = '';
      style.height = '';
      var height = container.offsetHeight,
        maxHeight = this.options.maxHeight,
        scrolledClass = 'leaflet-popup-scrolled';
      if (maxHeight && height > maxHeight) {
        style.height = maxHeight + 'px';
        addClass(container, scrolledClass);
      } else {
        removeClass(container, scrolledClass);
      }
      this._containerWidth = this._container.offsetWidth;
    },
    _animateZoom: function (e) {
      var pos = this._map._latLngToNewLayerPoint(this._latlng, e.zoom, e.center),
        anchor = this._getAnchor();
      setPosition(this._container, pos.add(anchor));
    },
    _adjustPan: function () {
      if (!this.options.autoPan) {
        return;
      }
      if (this._map._panAnim) {
        this._map._panAnim.stop();
      }

      // We can endlessly recurse if keepInView is set and the view resets.
      // Let's guard against that by exiting early if we're responding to our own autopan.
      if (this._autopanning) {
        this._autopanning = false;
        return;
      }
      var map = this._map,
        marginBottom = parseInt(getStyle(this._container, 'marginBottom'), 10) || 0,
        containerHeight = this._container.offsetHeight + marginBottom,
        containerWidth = this._containerWidth,
        layerPos = new Point(this._containerLeft, -containerHeight - this._containerBottom);
      layerPos._add(getPosition(this._container));
      var containerPos = map.layerPointToContainerPoint(layerPos),
        padding = toPoint(this.options.autoPanPadding),
        paddingTL = toPoint(this.options.autoPanPaddingTopLeft || padding),
        paddingBR = toPoint(this.options.autoPanPaddingBottomRight || padding),
        size = map.getSize(),
        dx = 0,
        dy = 0;
      if (containerPos.x + containerWidth + paddingBR.x > size.x) {
        // right
        dx = containerPos.x + containerWidth - size.x + paddingBR.x;
      }
      if (containerPos.x - dx - paddingTL.x < 0) {
        // left
        dx = containerPos.x - paddingTL.x;
      }
      if (containerPos.y + containerHeight + paddingBR.y > size.y) {
        // bottom
        dy = containerPos.y + containerHeight - size.y + paddingBR.y;
      }
      if (containerPos.y - dy - paddingTL.y < 0) {
        // top
        dy = containerPos.y - paddingTL.y;
      }

      // @namespace Map
      // @section Popup events
      // @event autopanstart: Event
      // Fired when the map starts autopanning when opening a popup.
      if (dx || dy) {
        // Track that we're autopanning, as this function will be re-ran on moveend
        if (this.options.keepInView) {
          this._autopanning = true;
        }
        map.fire('autopanstart').panBy([dx, dy]);
      }
    },
    _getAnchor: function () {
      // Where should we anchor the popup on the source layer?
      return toPoint(this._source && this._source._getPopupAnchor ? this._source._getPopupAnchor() : [0, 0]);
    }
  });

  // @namespace Popup
  // @factory L.popup(options?: Popup options, source?: Layer)
  // Instantiates a `Popup` object given an optional `options` object that describes its appearance and location and an optional `source` object that is used to tag the popup with a reference to the Layer to which it refers.
  // @alternative
  // @factory L.popup(latlng: LatLng, options?: Popup options)
  // Instantiates a `Popup` object given `latlng` where the popup will open and an optional `options` object that describes its appearance and location.
  var popup = function (options, source) {
    return new Popup(options, source);
  };

  /* @namespace Map
   * @section Interaction Options
   * @option closePopupOnClick: Boolean = true
   * Set it to `false` if you don't want popups to close when user clicks the map.
   */
  Map.mergeOptions({
    closePopupOnClick: true
  });

  // @namespace Map
  // @section Methods for Layers and Controls
  Map.include({
    // @method openPopup(popup: Popup): this
    // Opens the specified popup while closing the previously opened (to make sure only one is opened at one time for usability).
    // @alternative
    // @method openPopup(content: String|HTMLElement, latlng: LatLng, options?: Popup options): this
    // Creates a popup with the specified content and options and opens it in the given point on a map.
    openPopup: function (popup, latlng, options) {
      this._initOverlay(Popup, popup, latlng, options).openOn(this);
      return this;
    },
    // @method closePopup(popup?: Popup): this
    // Closes the popup previously opened with [openPopup](#map-openpopup) (or the given one).
    closePopup: function (popup) {
      popup = arguments.length ? popup : this._popup;
      if (popup) {
        popup.close();
      }
      return this;
    }
  });

  /*
   * @namespace Layer
   * @section Popup methods example
   *
   * All layers share a set of methods convenient for binding popups to it.
   *
   * ```js
   * var layer = L.Polygon(latlngs).bindPopup('Hi There!').addTo(map);
   * layer.openPopup();
   * layer.closePopup();
   * ```
   *
   * Popups will also be automatically opened when the layer is clicked on and closed when the layer is removed from the map or another popup is opened.
   */

  // @section Popup methods
  Layer.include({
    // @method bindPopup(content: String|HTMLElement|Function|Popup, options?: Popup options): this
    // Binds a popup to the layer with the passed `content` and sets up the
    // necessary event listeners. If a `Function` is passed it will receive
    // the layer as the first argument and should return a `String` or `HTMLElement`.
    bindPopup: function (content, options) {
      this._popup = this._initOverlay(Popup, this._popup, content, options);
      if (!this._popupHandlersAdded) {
        this.on({
          click: this._openPopup,
          keypress: this._onKeyPress,
          remove: this.closePopup,
          move: this._movePopup
        });
        this._popupHandlersAdded = true;
      }
      return this;
    },
    // @method unbindPopup(): this
    // Removes the popup previously bound with `bindPopup`.
    unbindPopup: function () {
      if (this._popup) {
        this.off({
          click: this._openPopup,
          keypress: this._onKeyPress,
          remove: this.closePopup,
          move: this._movePopup
        });
        this._popupHandlersAdded = false;
        this._popup = null;
      }
      return this;
    },
    // @method openPopup(latlng?: LatLng): this
    // Opens the bound popup at the specified `latlng` or at the default popup anchor if no `latlng` is passed.
    openPopup: function (latlng) {
      if (this._popup) {
        if (!(this instanceof FeatureGroup)) {
          this._popup._source = this;
        }
        if (this._popup._prepareOpen(latlng || this._latlng)) {
          // open the popup on the map
          this._popup.openOn(this._map);
        }
      }
      return this;
    },
    // @method closePopup(): this
    // Closes the popup bound to this layer if it is open.
    closePopup: function () {
      if (this._popup) {
        this._popup.close();
      }
      return this;
    },
    // @method togglePopup(): this
    // Opens or closes the popup bound to this layer depending on its current state.
    togglePopup: function () {
      if (this._popup) {
        this._popup.toggle(this);
      }
      return this;
    },
    // @method isPopupOpen(): boolean
    // Returns `true` if the popup bound to this layer is currently open.
    isPopupOpen: function () {
      return this._popup ? this._popup.isOpen() : false;
    },
    // @method setPopupContent(content: String|HTMLElement|Popup): this
    // Sets the content of the popup bound to this layer.
    setPopupContent: function (content) {
      if (this._popup) {
        this._popup.setContent(content);
      }
      return this;
    },
    // @method getPopup(): Popup
    // Returns the popup bound to this layer.
    getPopup: function () {
      return this._popup;
    },
    _openPopup: function (e) {
      if (!this._popup || !this._map) {
        return;
      }
      // prevent map click
      stop(e);
      var target = e.layer || e.target;
      if (this._popup._source === target && !(target instanceof Path)) {
        // treat it like a marker and figure out
        // if we should toggle it open/closed
        if (this._map.hasLayer(this._popup)) {
          this.closePopup();
        } else {
          this.openPopup(e.latlng);
        }
        return;
      }
      this._popup._source = target;
      this.openPopup(e.latlng);
    },
    _movePopup: function (e) {
      this._popup.setLatLng(e.latlng);
    },
    _onKeyPress: function (e) {
      if (e.originalEvent.keyCode === 13) {
        this._openPopup(e);
      }
    }
  });

  /*
   * @class Tooltip
   * @inherits DivOverlay
   * @aka L.Tooltip
   * Used to display small texts on top of map layers.
   *
   * @example
   * If you want to just bind a tooltip to marker:
   *
   * ```js
   * marker.bindTooltip("my tooltip text").openTooltip();
   * ```
   * Path overlays like polylines also have a `bindTooltip` method.
   *
   * A tooltip can be also standalone:
   *
   * ```js
   * var tooltip = L.tooltip()
   * 	.setLatLng(latlng)
   * 	.setContent('Hello world!<br />This is a nice tooltip.')
   * 	.addTo(map);
   * ```
   * or
   * ```js
   * var tooltip = L.tooltip(latlng, {content: 'Hello world!<br />This is a nice tooltip.'})
   * 	.addTo(map);
   * ```
   *
   *
   * Note about tooltip offset. Leaflet takes two options in consideration
   * for computing tooltip offsetting:
   * - the `offset` Tooltip option: it defaults to [0, 0], and it's specific to one tooltip.
   *   Add a positive x offset to move the tooltip to the right, and a positive y offset to
   *   move it to the bottom. Negatives will move to the left and top.
   * - the `tooltipAnchor` Icon option: this will only be considered for Marker. You
   *   should adapt this value if you use a custom icon.
   */

  // @namespace Tooltip
  var Tooltip = DivOverlay.extend({
    // @section
    // @aka Tooltip options
    options: {
      // @option pane: String = 'tooltipPane'
      // `Map pane` where the tooltip will be added.
      pane: 'tooltipPane',
      // @option offset: Point = Point(0, 0)
      // Optional offset of the tooltip position.
      offset: [0, 0],
      // @option direction: String = 'auto'
      // Direction where to open the tooltip. Possible values are: `right`, `left`,
      // `top`, `bottom`, `center`, `auto`.
      // `auto` will dynamically switch between `right` and `left` according to the tooltip
      // position on the map.
      direction: 'auto',
      // @option permanent: Boolean = false
      // Whether to open the tooltip permanently or only on mouseover.
      permanent: false,
      // @option sticky: Boolean = false
      // If true, the tooltip will follow the mouse instead of being fixed at the feature center.
      sticky: false,
      // @option opacity: Number = 0.9
      // Tooltip container opacity.
      opacity: 0.9
    },
    onAdd: function (map) {
      DivOverlay.prototype.onAdd.call(this, map);
      this.setOpacity(this.options.opacity);

      // @namespace Map
      // @section Tooltip events
      // @event tooltipopen: TooltipEvent
      // Fired when a tooltip is opened in the map.
      map.fire('tooltipopen', {
        tooltip: this
      });
      if (this._source) {
        this.addEventParent(this._source);

        // @namespace Layer
        // @section Tooltip events
        // @event tooltipopen: TooltipEvent
        // Fired when a tooltip bound to this layer is opened.
        this._source.fire('tooltipopen', {
          tooltip: this
        }, true);
      }
    },
    onRemove: function (map) {
      DivOverlay.prototype.onRemove.call(this, map);

      // @namespace Map
      // @section Tooltip events
      // @event tooltipclose: TooltipEvent
      // Fired when a tooltip in the map is closed.
      map.fire('tooltipclose', {
        tooltip: this
      });
      if (this._source) {
        this.removeEventParent(this._source);

        // @namespace Layer
        // @section Tooltip events
        // @event tooltipclose: TooltipEvent
        // Fired when a tooltip bound to this layer is closed.
        this._source.fire('tooltipclose', {
          tooltip: this
        }, true);
      }
    },
    getEvents: function () {
      var events = DivOverlay.prototype.getEvents.call(this);
      if (!this.options.permanent) {
        events.preclick = this.close;
      }
      return events;
    },
    _initLayout: function () {
      var prefix = 'leaflet-tooltip',
        className = prefix + ' ' + (this.options.className || '') + ' leaflet-zoom-' + (this._zoomAnimated ? 'animated' : 'hide');
      this._contentNode = this._container = create$1('div', className);
      this._container.setAttribute('role', 'tooltip');
      this._container.setAttribute('id', 'leaflet-tooltip-' + stamp(this));
    },
    _updateLayout: function () {},
    _adjustPan: function () {},
    _setPosition: function (pos) {
      var subX,
        subY,
        map = this._map,
        container = this._container,
        centerPoint = map.latLngToContainerPoint(map.getCenter()),
        tooltipPoint = map.layerPointToContainerPoint(pos),
        direction = this.options.direction,
        tooltipWidth = container.offsetWidth,
        tooltipHeight = container.offsetHeight,
        offset = toPoint(this.options.offset),
        anchor = this._getAnchor();
      if (direction === 'top') {
        subX = tooltipWidth / 2;
        subY = tooltipHeight;
      } else if (direction === 'bottom') {
        subX = tooltipWidth / 2;
        subY = 0;
      } else if (direction === 'center') {
        subX = tooltipWidth / 2;
        subY = tooltipHeight / 2;
      } else if (direction === 'right') {
        subX = 0;
        subY = tooltipHeight / 2;
      } else if (direction === 'left') {
        subX = tooltipWidth;
        subY = tooltipHeight / 2;
      } else if (tooltipPoint.x < centerPoint.x) {
        direction = 'right';
        subX = 0;
        subY = tooltipHeight / 2;
      } else {
        direction = 'left';
        subX = tooltipWidth + (offset.x + anchor.x) * 2;
        subY = tooltipHeight / 2;
      }
      pos = pos.subtract(toPoint(subX, subY, true)).add(offset).add(anchor);
      removeClass(container, 'leaflet-tooltip-right');
      removeClass(container, 'leaflet-tooltip-left');
      removeClass(container, 'leaflet-tooltip-top');
      removeClass(container, 'leaflet-tooltip-bottom');
      addClass(container, 'leaflet-tooltip-' + direction);
      setPosition(container, pos);
    },
    _updatePosition: function () {
      var pos = this._map.latLngToLayerPoint(this._latlng);
      this._setPosition(pos);
    },
    setOpacity: function (opacity) {
      this.options.opacity = opacity;
      if (this._container) {
        setOpacity(this._container, opacity);
      }
    },
    _animateZoom: function (e) {
      var pos = this._map._latLngToNewLayerPoint(this._latlng, e.zoom, e.center);
      this._setPosition(pos);
    },
    _getAnchor: function () {
      // Where should we anchor the tooltip on the source layer?
      return toPoint(this._source && this._source._getTooltipAnchor && !this.options.sticky ? this._source._getTooltipAnchor() : [0, 0]);
    }
  });

  // @namespace Tooltip
  // @factory L.tooltip(options?: Tooltip options, source?: Layer)
  // Instantiates a `Tooltip` object given an optional `options` object that describes its appearance and location and an optional `source` object that is used to tag the tooltip with a reference to the Layer to which it refers.
  // @alternative
  // @factory L.tooltip(latlng: LatLng, options?: Tooltip options)
  // Instantiates a `Tooltip` object given `latlng` where the tooltip will open and an optional `options` object that describes its appearance and location.
  var tooltip = function (options, source) {
    return new Tooltip(options, source);
  };

  // @namespace Map
  // @section Methods for Layers and Controls
  Map.include({
    // @method openTooltip(tooltip: Tooltip): this
    // Opens the specified tooltip.
    // @alternative
    // @method openTooltip(content: String|HTMLElement, latlng: LatLng, options?: Tooltip options): this
    // Creates a tooltip with the specified content and options and open it.
    openTooltip: function (tooltip, latlng, options) {
      this._initOverlay(Tooltip, tooltip, latlng, options).openOn(this);
      return this;
    },
    // @method closeTooltip(tooltip: Tooltip): this
    // Closes the tooltip given as parameter.
    closeTooltip: function (tooltip) {
      tooltip.close();
      return this;
    }
  });

  /*
   * @namespace Layer
   * @section Tooltip methods example
   *
   * All layers share a set of methods convenient for binding tooltips to it.
   *
   * ```js
   * var layer = L.Polygon(latlngs).bindTooltip('Hi There!').addTo(map);
   * layer.openTooltip();
   * layer.closeTooltip();
   * ```
   */

  // @section Tooltip methods
  Layer.include({
    // @method bindTooltip(content: String|HTMLElement|Function|Tooltip, options?: Tooltip options): this
    // Binds a tooltip to the layer with the passed `content` and sets up the
    // necessary event listeners. If a `Function` is passed it will receive
    // the layer as the first argument and should return a `String` or `HTMLElement`.
    bindTooltip: function (content, options) {
      if (this._tooltip && this.isTooltipOpen()) {
        this.unbindTooltip();
      }
      this._tooltip = this._initOverlay(Tooltip, this._tooltip, content, options);
      this._initTooltipInteractions();
      if (this._tooltip.options.permanent && this._map && this._map.hasLayer(this)) {
        this.openTooltip();
      }
      return this;
    },
    // @method unbindTooltip(): this
    // Removes the tooltip previously bound with `bindTooltip`.
    unbindTooltip: function () {
      if (this._tooltip) {
        this._initTooltipInteractions(true);
        this.closeTooltip();
        this._tooltip = null;
      }
      return this;
    },
    _initTooltipInteractions: function (remove) {
      if (!remove && this._tooltipHandlersAdded) {
        return;
      }
      var onOff = remove ? 'off' : 'on',
        events = {
          remove: this.closeTooltip,
          move: this._moveTooltip
        };
      if (!this._tooltip.options.permanent) {
        events.mouseover = this._openTooltip;
        events.mouseout = this.closeTooltip;
        events.click = this._openTooltip;
        if (this._map) {
          this._addFocusListeners();
        } else {
          events.add = this._addFocusListeners;
        }
      } else {
        events.add = this._openTooltip;
      }
      if (this._tooltip.options.sticky) {
        events.mousemove = this._moveTooltip;
      }
      this[onOff](events);
      this._tooltipHandlersAdded = !remove;
    },
    // @method openTooltip(latlng?: LatLng): this
    // Opens the bound tooltip at the specified `latlng` or at the default tooltip anchor if no `latlng` is passed.
    openTooltip: function (latlng) {
      if (this._tooltip) {
        if (!(this instanceof FeatureGroup)) {
          this._tooltip._source = this;
        }
        if (this._tooltip._prepareOpen(latlng)) {
          // open the tooltip on the map
          this._tooltip.openOn(this._map);
          if (this.getElement) {
            this._setAriaDescribedByOnLayer(this);
          } else if (this.eachLayer) {
            this.eachLayer(this._setAriaDescribedByOnLayer, this);
          }
        }
      }
      return this;
    },
    // @method closeTooltip(): this
    // Closes the tooltip bound to this layer if it is open.
    closeTooltip: function () {
      if (this._tooltip) {
        return this._tooltip.close();
      }
    },
    // @method toggleTooltip(): this
    // Opens or closes the tooltip bound to this layer depending on its current state.
    toggleTooltip: function () {
      if (this._tooltip) {
        this._tooltip.toggle(this);
      }
      return this;
    },
    // @method isTooltipOpen(): boolean
    // Returns `true` if the tooltip bound to this layer is currently open.
    isTooltipOpen: function () {
      return this._tooltip.isOpen();
    },
    // @method setTooltipContent(content: String|HTMLElement|Tooltip): this
    // Sets the content of the tooltip bound to this layer.
    setTooltipContent: function (content) {
      if (this._tooltip) {
        this._tooltip.setContent(content);
      }
      return this;
    },
    // @method getTooltip(): Tooltip
    // Returns the tooltip bound to this layer.
    getTooltip: function () {
      return this._tooltip;
    },
    _addFocusListeners: function () {
      if (this.getElement) {
        this._addFocusListenersOnLayer(this);
      } else if (this.eachLayer) {
        this.eachLayer(this._addFocusListenersOnLayer, this);
      }
    },
    _addFocusListenersOnLayer: function (layer) {
      var el = typeof layer.getElement === 'function' && layer.getElement();
      if (el) {
        on(el, 'focus', function () {
          this._tooltip._source = layer;
          this.openTooltip();
        }, this);
        on(el, 'blur', this.closeTooltip, this);
      }
    },
    _setAriaDescribedByOnLayer: function (layer) {
      var el = typeof layer.getElement === 'function' && layer.getElement();
      if (el) {
        el.setAttribute('aria-describedby', this._tooltip._container.id);
      }
    },
    _openTooltip: function (e) {
      if (!this._tooltip || !this._map) {
        return;
      }

      // If the map is moving, we will show the tooltip after it's done.
      if (this._map.dragging && this._map.dragging.moving() && !this._openOnceFlag) {
        this._openOnceFlag = true;
        var that = this;
        this._map.once('moveend', function () {
          that._openOnceFlag = false;
          that._openTooltip(e);
        });
        return;
      }
      this._tooltip._source = e.layer || e.target;
      this.openTooltip(this._tooltip.options.sticky ? e.latlng : undefined);
    },
    _moveTooltip: function (e) {
      var latlng = e.latlng,
        containerPoint,
        layerPoint;
      if (this._tooltip.options.sticky && e.originalEvent) {
        containerPoint = this._map.mouseEventToContainerPoint(e.originalEvent);
        layerPoint = this._map.containerPointToLayerPoint(containerPoint);
        latlng = this._map.layerPointToLatLng(layerPoint);
      }
      this._tooltip.setLatLng(latlng);
    }
  });

  /*
   * @class DivIcon
   * @aka L.DivIcon
   * @inherits Icon
   *
   * Represents a lightweight icon for markers that uses a simple `<div>`
   * element instead of an image. Inherits from `Icon` but ignores the `iconUrl` and shadow options.
   *
   * @example
   * ```js
   * var myIcon = L.divIcon({className: 'my-div-icon'});
   * // you can set .my-div-icon styles in CSS
   *
   * L.marker([50.505, 30.57], {icon: myIcon}).addTo(map);
   * ```
   *
   * By default, it has a 'leaflet-div-icon' CSS class and is styled as a little white square with a shadow.
   */

  var DivIcon = Icon.extend({
    options: {
      // @section
      // @aka DivIcon options
      iconSize: [12, 12],
      // also can be set through CSS

      // iconAnchor: (Point),
      // popupAnchor: (Point),

      // @option html: String|HTMLElement = ''
      // Custom HTML code to put inside the div element, empty by default. Alternatively,
      // an instance of `HTMLElement`.
      html: false,
      // @option bgPos: Point = [0, 0]
      // Optional relative position of the background, in pixels
      bgPos: null,
      className: 'leaflet-div-icon'
    },
    createIcon: function (oldIcon) {
      var div = oldIcon && oldIcon.tagName === 'DIV' ? oldIcon : document.createElement('div'),
        options = this.options;
      if (options.html instanceof Element) {
        empty(div);
        div.appendChild(options.html);
      } else {
        div.innerHTML = options.html !== false ? options.html : '';
      }
      if (options.bgPos) {
        var bgPos = toPoint(options.bgPos);
        div.style.backgroundPosition = -bgPos.x + 'px ' + -bgPos.y + 'px';
      }
      this._setIconStyles(div, 'icon');
      return div;
    },
    createShadow: function () {
      return null;
    }
  });

  // @factory L.divIcon(options: DivIcon options)
  // Creates a `DivIcon` instance with the given options.
  function divIcon(options) {
    return new DivIcon(options);
  }
  Icon.Default = IconDefault;

  /*
   * @class GridLayer
   * @inherits Layer
   * @aka L.GridLayer
   *
   * Generic class for handling a tiled grid of HTML elements. This is the base class for all tile layers and replaces `TileLayer.Canvas`.
   * GridLayer can be extended to create a tiled grid of HTML elements like `<canvas>`, `<img>` or `<div>`. GridLayer will handle creating and animating these DOM elements for you.
   *
   *
   * @section Synchronous usage
   * @example
   *
   * To create a custom layer, extend GridLayer and implement the `createTile()` method, which will be passed a `Point` object with the `x`, `y`, and `z` (zoom level) coordinates to draw your tile.
   *
   * ```js
   * var CanvasLayer = L.GridLayer.extend({
   *     createTile: function(coords){
   *         // create a <canvas> element for drawing
   *         var tile = L.DomUtil.create('canvas', 'leaflet-tile');
   *
   *         // setup tile width and height according to the options
   *         var size = this.getTileSize();
   *         tile.width = size.x;
   *         tile.height = size.y;
   *
   *         // get a canvas context and draw something on it using coords.x, coords.y and coords.z
   *         var ctx = tile.getContext('2d');
   *
   *         // return the tile so it can be rendered on screen
   *         return tile;
   *     }
   * });
   * ```
   *
   * @section Asynchronous usage
   * @example
   *
   * Tile creation can also be asynchronous, this is useful when using a third-party drawing library. Once the tile is finished drawing it can be passed to the `done()` callback.
   *
   * ```js
   * var CanvasLayer = L.GridLayer.extend({
   *     createTile: function(coords, done){
   *         var error;
   *
   *         // create a <canvas> element for drawing
   *         var tile = L.DomUtil.create('canvas', 'leaflet-tile');
   *
   *         // setup tile width and height according to the options
   *         var size = this.getTileSize();
   *         tile.width = size.x;
   *         tile.height = size.y;
   *
   *         // draw something asynchronously and pass the tile to the done() callback
   *         setTimeout(function() {
   *             done(error, tile);
   *         }, 1000);
   *
   *         return tile;
   *     }
   * });
   * ```
   *
   * @section
   */

  var GridLayer = Layer.extend({
    // @section
    // @aka GridLayer options
    options: {
      // @option tileSize: Number|Point = 256
      // Width and height of tiles in the grid. Use a number if width and height are equal, or `L.point(width, height)` otherwise.
      tileSize: 256,
      // @option opacity: Number = 1.0
      // Opacity of the tiles. Can be used in the `createTile()` function.
      opacity: 1,
      // @option updateWhenIdle: Boolean = (depends)
      // Load new tiles only when panning ends.
      // `true` by default on mobile browsers, in order to avoid too many requests and keep smooth navigation.
      // `false` otherwise in order to display new tiles _during_ panning, since it is easy to pan outside the
      // [`keepBuffer`](#gridlayer-keepbuffer) option in desktop browsers.
      updateWhenIdle: Browser.mobile,
      // @option updateWhenZooming: Boolean = true
      // By default, a smooth zoom animation (during a [touch zoom](#map-touchzoom) or a [`flyTo()`](#map-flyto)) will update grid layers every integer zoom level. Setting this option to `false` will update the grid layer only when the smooth animation ends.
      updateWhenZooming: true,
      // @option updateInterval: Number = 200
      // Tiles will not update more than once every `updateInterval` milliseconds when panning.
      updateInterval: 200,
      // @option zIndex: Number = 1
      // The explicit zIndex of the tile layer.
      zIndex: 1,
      // @option bounds: LatLngBounds = undefined
      // If set, tiles will only be loaded inside the set `LatLngBounds`.
      bounds: null,
      // @option minZoom: Number = 0
      // The minimum zoom level down to which this layer will be displayed (inclusive).
      minZoom: 0,
      // @option maxZoom: Number = undefined
      // The maximum zoom level up to which this layer will be displayed (inclusive).
      maxZoom: undefined,
      // @option maxNativeZoom: Number = undefined
      // Maximum zoom number the tile source has available. If it is specified,
      // the tiles on all zoom levels higher than `maxNativeZoom` will be loaded
      // from `maxNativeZoom` level and auto-scaled.
      maxNativeZoom: undefined,
      // @option minNativeZoom: Number = undefined
      // Minimum zoom number the tile source has available. If it is specified,
      // the tiles on all zoom levels lower than `minNativeZoom` will be loaded
      // from `minNativeZoom` level and auto-scaled.
      minNativeZoom: undefined,
      // @option noWrap: Boolean = false
      // Whether the layer is wrapped around the antimeridian. If `true`, the
      // GridLayer will only be displayed once at low zoom levels. Has no
      // effect when the [map CRS](#map-crs) doesn't wrap around. Can be used
      // in combination with [`bounds`](#gridlayer-bounds) to prevent requesting
      // tiles outside the CRS limits.
      noWrap: false,
      // @option pane: String = 'tilePane'
      // `Map pane` where the grid layer will be added.
      pane: 'tilePane',
      // @option className: String = ''
      // A custom class name to assign to the tile layer. Empty by default.
      className: '',
      // @option keepBuffer: Number = 2
      // When panning the map, keep this many rows and columns of tiles before unloading them.
      keepBuffer: 2
    },
    initialize: function (options) {
      setOptions(this, options);
    },
    onAdd: function () {
      this._initContainer();
      this._levels = {};
      this._tiles = {};
      this._resetView(); // implicit _update() call
    },
    beforeAdd: function (map) {
      map._addZoomLimit(this);
    },
    onRemove: function (map) {
      this._removeAllTiles();
      remove(this._container);
      map._removeZoomLimit(this);
      this._container = null;
      this._tileZoom = undefined;
    },
    // @method bringToFront: this
    // Brings the tile layer to the top of all tile layers.
    bringToFront: function () {
      if (this._map) {
        toFront(this._container);
        this._setAutoZIndex(Math.max);
      }
      return this;
    },
    // @method bringToBack: this
    // Brings the tile layer to the bottom of all tile layers.
    bringToBack: function () {
      if (this._map) {
        toBack(this._container);
        this._setAutoZIndex(Math.min);
      }
      return this;
    },
    // @method getContainer: HTMLElement
    // Returns the HTML element that contains the tiles for this layer.
    getContainer: function () {
      return this._container;
    },
    // @method setOpacity(opacity: Number): this
    // Changes the [opacity](#gridlayer-opacity) of the grid layer.
    setOpacity: function (opacity) {
      this.options.opacity = opacity;
      this._updateOpacity();
      return this;
    },
    // @method setZIndex(zIndex: Number): this
    // Changes the [zIndex](#gridlayer-zindex) of the grid layer.
    setZIndex: function (zIndex) {
      this.options.zIndex = zIndex;
      this._updateZIndex();
      return this;
    },
    // @method isLoading: Boolean
    // Returns `true` if any tile in the grid layer has not finished loading.
    isLoading: function () {
      return this._loading;
    },
    // @method redraw: this
    // Causes the layer to clear all the tiles and request them again.
    redraw: function () {
      if (this._map) {
        this._removeAllTiles();
        var tileZoom = this._clampZoom(this._map.getZoom());
        if (tileZoom !== this._tileZoom) {
          this._tileZoom = tileZoom;
          this._updateLevels();
        }
        this._update();
      }
      return this;
    },
    getEvents: function () {
      var events = {
        viewprereset: this._invalidateAll,
        viewreset: this._resetView,
        zoom: this._resetView,
        moveend: this._onMoveEnd
      };
      if (!this.options.updateWhenIdle) {
        // update tiles on move, but not more often than once per given interval
        if (!this._onMove) {
          this._onMove = throttle(this._onMoveEnd, this.options.updateInterval, this);
        }
        events.move = this._onMove;
      }
      if (this._zoomAnimated) {
        events.zoomanim = this._animateZoom;
      }
      return events;
    },
    // @section Extension methods
    // Layers extending `GridLayer` shall reimplement the following method.
    // @method createTile(coords: Object, done?: Function): HTMLElement
    // Called only internally, must be overridden by classes extending `GridLayer`.
    // Returns the `HTMLElement` corresponding to the given `coords`. If the `done` callback
    // is specified, it must be called when the tile has finished loading and drawing.
    createTile: function () {
      return document.createElement('div');
    },
    // @section
    // @method getTileSize: Point
    // Normalizes the [tileSize option](#gridlayer-tilesize) into a point. Used by the `createTile()` method.
    getTileSize: function () {
      var s = this.options.tileSize;
      return s instanceof Point ? s : new Point(s, s);
    },
    _updateZIndex: function () {
      if (this._container && this.options.zIndex !== undefined && this.options.zIndex !== null) {
        this._container.style.zIndex = this.options.zIndex;
      }
    },
    _setAutoZIndex: function (compare) {
      // go through all other layers of the same pane, set zIndex to max + 1 (front) or min - 1 (back)

      var layers = this.getPane().children,
        edgeZIndex = -compare(-Infinity, Infinity); // -Infinity for max, Infinity for min

      for (var i = 0, len = layers.length, zIndex; i < len; i++) {
        zIndex = layers[i].style.zIndex;
        if (layers[i] !== this._container && zIndex) {
          edgeZIndex = compare(edgeZIndex, +zIndex);
        }
      }
      if (isFinite(edgeZIndex)) {
        this.options.zIndex = edgeZIndex + compare(-1, 1);
        this._updateZIndex();
      }
    },
    _updateOpacity: function () {
      if (!this._map) {
        return;
      }

      // IE doesn't inherit filter opacity properly, so we're forced to set it on tiles
      if (Browser.ielt9) {
        return;
      }
      setOpacity(this._container, this.options.opacity);
      var now = +new Date(),
        nextFrame = false,
        willPrune = false;
      for (var key in this._tiles) {
        var tile = this._tiles[key];
        if (!tile.current || !tile.loaded) {
          continue;
        }
        var fade = Math.min(1, (now - tile.loaded) / 200);
        setOpacity(tile.el, fade);
        if (fade < 1) {
          nextFrame = true;
        } else {
          if (tile.active) {
            willPrune = true;
          } else {
            this._onOpaqueTile(tile);
          }
          tile.active = true;
        }
      }
      if (willPrune && !this._noPrune) {
        this._pruneTiles();
      }
      if (nextFrame) {
        cancelAnimFrame(this._fadeFrame);
        this._fadeFrame = requestAnimFrame(this._updateOpacity, this);
      }
    },
    _onOpaqueTile: falseFn,
    _initContainer: function () {
      if (this._container) {
        return;
      }
      this._container = create$1('div', 'leaflet-layer ' + (this.options.className || ''));
      this._updateZIndex();
      if (this.options.opacity < 1) {
        this._updateOpacity();
      }
      this.getPane().appendChild(this._container);
    },
    _updateLevels: function () {
      var zoom = this._tileZoom,
        maxZoom = this.options.maxZoom;
      if (zoom === undefined) {
        return undefined;
      }
      for (var z in this._levels) {
        z = Number(z);
        if (this._levels[z].el.children.length || z === zoom) {
          this._levels[z].el.style.zIndex = maxZoom - Math.abs(zoom - z);
          this._onUpdateLevel(z);
        } else {
          remove(this._levels[z].el);
          this._removeTilesAtZoom(z);
          this._onRemoveLevel(z);
          delete this._levels[z];
        }
      }
      var level = this._levels[zoom],
        map = this._map;
      if (!level) {
        level = this._levels[zoom] = {};
        level.el = create$1('div', 'leaflet-tile-container leaflet-zoom-animated', this._container);
        level.el.style.zIndex = maxZoom;
        level.origin = map.project(map.unproject(map.getPixelOrigin()), zoom).round();
        level.zoom = zoom;
        this._setZoomTransform(level, map.getCenter(), map.getZoom());

        // force the browser to consider the newly added element for transition
        falseFn(level.el.offsetWidth);
        this._onCreateLevel(level);
      }
      this._level = level;
      return level;
    },
    _onUpdateLevel: falseFn,
    _onRemoveLevel: falseFn,
    _onCreateLevel: falseFn,
    _pruneTiles: function () {
      if (!this._map) {
        return;
      }
      var key, tile;
      var zoom = this._map.getZoom();
      if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
        this._removeAllTiles();
        return;
      }
      for (key in this._tiles) {
        tile = this._tiles[key];
        tile.retain = tile.current;
      }
      for (key in this._tiles) {
        tile = this._tiles[key];
        if (tile.current && !tile.active) {
          var coords = tile.coords;
          if (!this._retainParent(coords.x, coords.y, coords.z, coords.z - 5)) {
            this._retainChildren(coords.x, coords.y, coords.z, coords.z + 2);
          }
        }
      }
      for (key in this._tiles) {
        if (!this._tiles[key].retain) {
          this._removeTile(key);
        }
      }
    },
    _removeTilesAtZoom: function (zoom) {
      for (var key in this._tiles) {
        if (this._tiles[key].coords.z !== zoom) {
          continue;
        }
        this._removeTile(key);
      }
    },
    _removeAllTiles: function () {
      for (var key in this._tiles) {
        this._removeTile(key);
      }
    },
    _invalidateAll: function () {
      for (var z in this._levels) {
        remove(this._levels[z].el);
        this._onRemoveLevel(Number(z));
        delete this._levels[z];
      }
      this._removeAllTiles();
      this._tileZoom = undefined;
    },
    _retainParent: function (x, y, z, minZoom) {
      var x2 = Math.floor(x / 2),
        y2 = Math.floor(y / 2),
        z2 = z - 1,
        coords2 = new Point(+x2, +y2);
      coords2.z = +z2;
      var key = this._tileCoordsToKey(coords2),
        tile = this._tiles[key];
      if (tile && tile.active) {
        tile.retain = true;
        return true;
      } else if (tile && tile.loaded) {
        tile.retain = true;
      }
      if (z2 > minZoom) {
        return this._retainParent(x2, y2, z2, minZoom);
      }
      return false;
    },
    _retainChildren: function (x, y, z, maxZoom) {
      for (var i = 2 * x; i < 2 * x + 2; i++) {
        for (var j = 2 * y; j < 2 * y + 2; j++) {
          var coords = new Point(i, j);
          coords.z = z + 1;
          var key = this._tileCoordsToKey(coords),
            tile = this._tiles[key];
          if (tile && tile.active) {
            tile.retain = true;
            continue;
          } else if (tile && tile.loaded) {
            tile.retain = true;
          }
          if (z + 1 < maxZoom) {
            this._retainChildren(i, j, z + 1, maxZoom);
          }
        }
      }
    },
    _resetView: function (e) {
      var animating = e && (e.pinch || e.flyTo);
      this._setView(this._map.getCenter(), this._map.getZoom(), animating, animating);
    },
    _animateZoom: function (e) {
      this._setView(e.center, e.zoom, true, e.noUpdate);
    },
    _clampZoom: function (zoom) {
      var options = this.options;
      if (undefined !== options.minNativeZoom && zoom < options.minNativeZoom) {
        return options.minNativeZoom;
      }
      if (undefined !== options.maxNativeZoom && options.maxNativeZoom < zoom) {
        return options.maxNativeZoom;
      }
      return zoom;
    },
    _setView: function (center, zoom, noPrune, noUpdate) {
      var tileZoom = Math.round(zoom);
      if (this.options.maxZoom !== undefined && tileZoom > this.options.maxZoom || this.options.minZoom !== undefined && tileZoom < this.options.minZoom) {
        tileZoom = undefined;
      } else {
        tileZoom = this._clampZoom(tileZoom);
      }
      var tileZoomChanged = this.options.updateWhenZooming && tileZoom !== this._tileZoom;
      if (!noUpdate || tileZoomChanged) {
        this._tileZoom = tileZoom;
        if (this._abortLoading) {
          this._abortLoading();
        }
        this._updateLevels();
        this._resetGrid();
        if (tileZoom !== undefined) {
          this._update(center);
        }
        if (!noPrune) {
          this._pruneTiles();
        }

        // Flag to prevent _updateOpacity from pruning tiles during
        // a zoom anim or a pinch gesture
        this._noPrune = !!noPrune;
      }
      this._setZoomTransforms(center, zoom);
    },
    _setZoomTransforms: function (center, zoom) {
      for (var i in this._levels) {
        this._setZoomTransform(this._levels[i], center, zoom);
      }
    },
    _setZoomTransform: function (level, center, zoom) {
      var scale = this._map.getZoomScale(zoom, level.zoom),
        translate = level.origin.multiplyBy(scale).subtract(this._map._getNewPixelOrigin(center, zoom)).round();
      if (Browser.any3d) {
        setTransform(level.el, translate, scale);
      } else {
        setPosition(level.el, translate);
      }
    },
    _resetGrid: function () {
      var map = this._map,
        crs = map.options.crs,
        tileSize = this._tileSize = this.getTileSize(),
        tileZoom = this._tileZoom;
      var bounds = this._map.getPixelWorldBounds(this._tileZoom);
      if (bounds) {
        this._globalTileRange = this._pxBoundsToTileRange(bounds);
      }
      this._wrapX = crs.wrapLng && !this.options.noWrap && [Math.floor(map.project([0, crs.wrapLng[0]], tileZoom).x / tileSize.x), Math.ceil(map.project([0, crs.wrapLng[1]], tileZoom).x / tileSize.y)];
      this._wrapY = crs.wrapLat && !this.options.noWrap && [Math.floor(map.project([crs.wrapLat[0], 0], tileZoom).y / tileSize.x), Math.ceil(map.project([crs.wrapLat[1], 0], tileZoom).y / tileSize.y)];
    },
    _onMoveEnd: function () {
      if (!this._map || this._map._animatingZoom) {
        return;
      }
      this._update();
    },
    _getTiledPixelBounds: function (center) {
      var map = this._map,
        mapZoom = map._animatingZoom ? Math.max(map._animateToZoom, map.getZoom()) : map.getZoom(),
        scale = map.getZoomScale(mapZoom, this._tileZoom),
        pixelCenter = map.project(center, this._tileZoom).floor(),
        halfSize = map.getSize().divideBy(scale * 2);
      return new Bounds(pixelCenter.subtract(halfSize), pixelCenter.add(halfSize));
    },
    // Private method to load tiles in the grid's active zoom level according to map bounds
    _update: function (center) {
      var map = this._map;
      if (!map) {
        return;
      }
      var zoom = this._clampZoom(map.getZoom());
      if (center === undefined) {
        center = map.getCenter();
      }
      if (this._tileZoom === undefined) {
        return;
      } // if out of minzoom/maxzoom

      var pixelBounds = this._getTiledPixelBounds(center),
        tileRange = this._pxBoundsToTileRange(pixelBounds),
        tileCenter = tileRange.getCenter(),
        queue = [],
        margin = this.options.keepBuffer,
        noPruneRange = new Bounds(tileRange.getBottomLeft().subtract([margin, -margin]), tileRange.getTopRight().add([margin, -margin]));

      // Sanity check: panic if the tile range contains Infinity somewhere.
      if (!(isFinite(tileRange.min.x) && isFinite(tileRange.min.y) && isFinite(tileRange.max.x) && isFinite(tileRange.max.y))) {
        throw new Error('Attempted to load an infinite number of tiles');
      }
      for (var key in this._tiles) {
        var c = this._tiles[key].coords;
        if (c.z !== this._tileZoom || !noPruneRange.contains(new Point(c.x, c.y))) {
          this._tiles[key].current = false;
        }
      }

      // _update just loads more tiles. If the tile zoom level differs too much
      // from the map's, let _setView reset levels and prune old tiles.
      if (Math.abs(zoom - this._tileZoom) > 1) {
        this._setView(center, zoom);
        return;
      }

      // create a queue of coordinates to load tiles from
      for (var j = tileRange.min.y; j <= tileRange.max.y; j++) {
        for (var i = tileRange.min.x; i <= tileRange.max.x; i++) {
          var coords = new Point(i, j);
          coords.z = this._tileZoom;
          if (!this._isValidTile(coords)) {
            continue;
          }
          var tile = this._tiles[this._tileCoordsToKey(coords)];
          if (tile) {
            tile.current = true;
          } else {
            queue.push(coords);
          }
        }
      }

      // sort tile queue to load tiles in order of their distance to center
      queue.sort(function (a, b) {
        return a.distanceTo(tileCenter) - b.distanceTo(tileCenter);
      });
      if (queue.length !== 0) {
        // if it's the first batch of tiles to load
        if (!this._loading) {
          this._loading = true;
          // @event loading: Event
          // Fired when the grid layer starts loading tiles.
          this.fire('loading');
        }

        // create DOM fragment to append tiles in one batch
        var fragment = document.createDocumentFragment();
        for (i = 0; i < queue.length; i++) {
          this._addTile(queue[i], fragment);
        }
        this._level.el.appendChild(fragment);
      }
    },
    _isValidTile: function (coords) {
      var crs = this._map.options.crs;
      if (!crs.infinite) {
        // don't load tile if it's out of bounds and not wrapped
        var bounds = this._globalTileRange;
        if (!crs.wrapLng && (coords.x < bounds.min.x || coords.x > bounds.max.x) || !crs.wrapLat && (coords.y < bounds.min.y || coords.y > bounds.max.y)) {
          return false;
        }
      }
      if (!this.options.bounds) {
        return true;
      }

      // don't load tile if it doesn't intersect the bounds in options
      var tileBounds = this._tileCoordsToBounds(coords);
      return toLatLngBounds(this.options.bounds).overlaps(tileBounds);
    },
    _keyToBounds: function (key) {
      return this._tileCoordsToBounds(this._keyToTileCoords(key));
    },
    _tileCoordsToNwSe: function (coords) {
      var map = this._map,
        tileSize = this.getTileSize(),
        nwPoint = coords.scaleBy(tileSize),
        sePoint = nwPoint.add(tileSize),
        nw = map.unproject(nwPoint, coords.z),
        se = map.unproject(sePoint, coords.z);
      return [nw, se];
    },
    // converts tile coordinates to its geographical bounds
    _tileCoordsToBounds: function (coords) {
      var bp = this._tileCoordsToNwSe(coords),
        bounds = new LatLngBounds(bp[0], bp[1]);
      if (!this.options.noWrap) {
        bounds = this._map.wrapLatLngBounds(bounds);
      }
      return bounds;
    },
    // converts tile coordinates to key for the tile cache
    _tileCoordsToKey: function (coords) {
      return coords.x + ':' + coords.y + ':' + coords.z;
    },
    // converts tile cache key to coordinates
    _keyToTileCoords: function (key) {
      var k = key.split(':'),
        coords = new Point(+k[0], +k[1]);
      coords.z = +k[2];
      return coords;
    },
    _removeTile: function (key) {
      var tile = this._tiles[key];
      if (!tile) {
        return;
      }
      remove(tile.el);
      delete this._tiles[key];

      // @event tileunload: TileEvent
      // Fired when a tile is removed (e.g. when a tile goes off the screen).
      this.fire('tileunload', {
        tile: tile.el,
        coords: this._keyToTileCoords(key)
      });
    },
    _initTile: function (tile) {
      addClass(tile, 'leaflet-tile');
      var tileSize = this.getTileSize();
      tile.style.width = tileSize.x + 'px';
      tile.style.height = tileSize.y + 'px';
      tile.onselectstart = falseFn;
      tile.onmousemove = falseFn;

      // update opacity on tiles in IE7-8 because of filter inheritance problems
      if (Browser.ielt9 && this.options.opacity < 1) {
        setOpacity(tile, this.options.opacity);
      }
    },
    _addTile: function (coords, container) {
      var tilePos = this._getTilePos(coords),
        key = this._tileCoordsToKey(coords);
      var tile = this.createTile(this._wrapCoords(coords), bind(this._tileReady, this, coords));
      this._initTile(tile);

      // if createTile is defined with a second argument ("done" callback),
      // we know that tile is async and will be ready later; otherwise
      if (this.createTile.length < 2) {
        // mark tile as ready, but delay one frame for opacity animation to happen
        requestAnimFrame(bind(this._tileReady, this, coords, null, tile));
      }
      setPosition(tile, tilePos);

      // save tile in cache
      this._tiles[key] = {
        el: tile,
        coords: coords,
        current: true
      };
      container.appendChild(tile);
      // @event tileloadstart: TileEvent
      // Fired when a tile is requested and starts loading.
      this.fire('tileloadstart', {
        tile: tile,
        coords: coords
      });
    },
    _tileReady: function (coords, err, tile) {
      if (err) {
        // @event tileerror: TileErrorEvent
        // Fired when there is an error loading a tile.
        this.fire('tileerror', {
          error: err,
          tile: tile,
          coords: coords
        });
      }
      var key = this._tileCoordsToKey(coords);
      tile = this._tiles[key];
      if (!tile) {
        return;
      }
      tile.loaded = +new Date();
      if (this._map._fadeAnimated) {
        setOpacity(tile.el, 0);
        cancelAnimFrame(this._fadeFrame);
        this._fadeFrame = requestAnimFrame(this._updateOpacity, this);
      } else {
        tile.active = true;
        this._pruneTiles();
      }
      if (!err) {
        addClass(tile.el, 'leaflet-tile-loaded');

        // @event tileload: TileEvent
        // Fired when a tile loads.
        this.fire('tileload', {
          tile: tile.el,
          coords: coords
        });
      }
      if (this._noTilesToLoad()) {
        this._loading = false;
        // @event load: Event
        // Fired when the grid layer loaded all visible tiles.
        this.fire('load');
        if (Browser.ielt9 || !this._map._fadeAnimated) {
          requestAnimFrame(this._pruneTiles, this);
        } else {
          // Wait a bit more than 0.2 secs (the duration of the tile fade-in)
          // to trigger a pruning.
          setTimeout(bind(this._pruneTiles, this), 250);
        }
      }
    },
    _getTilePos: function (coords) {
      return coords.scaleBy(this.getTileSize()).subtract(this._level.origin);
    },
    _wrapCoords: function (coords) {
      var newCoords = new Point(this._wrapX ? wrapNum(coords.x, this._wrapX) : coords.x, this._wrapY ? wrapNum(coords.y, this._wrapY) : coords.y);
      newCoords.z = coords.z;
      return newCoords;
    },
    _pxBoundsToTileRange: function (bounds) {
      var tileSize = this.getTileSize();
      return new Bounds(bounds.min.unscaleBy(tileSize).floor(), bounds.max.unscaleBy(tileSize).ceil().subtract([1, 1]));
    },
    _noTilesToLoad: function () {
      for (var key in this._tiles) {
        if (!this._tiles[key].loaded) {
          return false;
        }
      }
      return true;
    }
  });

  // @factory L.gridLayer(options?: GridLayer options)
  // Creates a new instance of GridLayer with the supplied options.
  function gridLayer(options) {
    return new GridLayer(options);
  }

  /*
   * @class TileLayer
   * @inherits GridLayer
   * @aka L.TileLayer
   * Used to load and display tile layers on the map. Note that most tile servers require attribution, which you can set under `Layer`. Extends `GridLayer`.
   *
   * @example
   *
   * ```js
   * L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png?{foo}', {foo: 'bar', attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
   * ```
   *
   * @section URL template
   * @example
   *
   * A string of the following form:
   *
   * ```
   * 'https://{s}.somedomain.com/blabla/{z}/{x}/{y}{r}.png'
   * ```
   *
   * `{s}` means one of the available subdomains (used sequentially to help with browser parallel requests per domain limitation; subdomain values are specified in options; `a`, `b` or `c` by default, can be omitted), `{z}` — zoom level, `{x}` and `{y}` — tile coordinates. `{r}` can be used to add "&commat;2x" to the URL to load retina tiles.
   *
   * You can use custom keys in the template, which will be [evaluated](#util-template) from TileLayer options, like this:
   *
   * ```
   * L.tileLayer('https://{s}.somedomain.com/{foo}/{z}/{x}/{y}.png', {foo: 'bar'});
   * ```
   */

  var TileLayer = GridLayer.extend({
    // @section
    // @aka TileLayer options
    options: {
      // @option minZoom: Number = 0
      // The minimum zoom level down to which this layer will be displayed (inclusive).
      minZoom: 0,
      // @option maxZoom: Number = 18
      // The maximum zoom level up to which this layer will be displayed (inclusive).
      maxZoom: 18,
      // @option subdomains: String|String[] = 'abc'
      // Subdomains of the tile service. Can be passed in the form of one string (where each letter is a subdomain name) or an array of strings.
      subdomains: 'abc',
      // @option errorTileUrl: String = ''
      // URL to the tile image to show in place of the tile that failed to load.
      errorTileUrl: '',
      // @option zoomOffset: Number = 0
      // The zoom number used in tile URLs will be offset with this value.
      zoomOffset: 0,
      // @option tms: Boolean = false
      // If `true`, inverses Y axis numbering for tiles (turn this on for [TMS](https://en.wikipedia.org/wiki/Tile_Map_Service) services).
      tms: false,
      // @option zoomReverse: Boolean = false
      // If set to true, the zoom number used in tile URLs will be reversed (`maxZoom - zoom` instead of `zoom`)
      zoomReverse: false,
      // @option detectRetina: Boolean = false
      // If `true` and user is on a retina display, it will request four tiles of half the specified size and a bigger zoom level in place of one to utilize the high resolution.
      detectRetina: false,
      // @option crossOrigin: Boolean|String = false
      // Whether the crossOrigin attribute will be added to the tiles.
      // If a String is provided, all tiles will have their crossOrigin attribute set to the String provided. This is needed if you want to access tile pixel data.
      // Refer to [CORS Settings](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_settings_attributes) for valid String values.
      crossOrigin: false,
      // @option referrerPolicy: Boolean|String = false
      // Whether the referrerPolicy attribute will be added to the tiles.
      // If a String is provided, all tiles will have their referrerPolicy attribute set to the String provided.
      // This may be needed if your map's rendering context has a strict default but your tile provider expects a valid referrer
      // (e.g. to validate an API token).
      // Refer to [HTMLImageElement.referrerPolicy](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/referrerPolicy) for valid String values.
      referrerPolicy: false
    },
    initialize: function (url, options) {
      this._url = url;
      options = setOptions(this, options);

      // detecting retina displays, adjusting tileSize and zoom levels
      if (options.detectRetina && Browser.retina && options.maxZoom > 0) {
        options.tileSize = Math.floor(options.tileSize / 2);
        if (!options.zoomReverse) {
          options.zoomOffset++;
          options.maxZoom = Math.max(options.minZoom, options.maxZoom - 1);
        } else {
          options.zoomOffset--;
          options.minZoom = Math.min(options.maxZoom, options.minZoom + 1);
        }
        options.minZoom = Math.max(0, options.minZoom);
      } else if (!options.zoomReverse) {
        // make sure maxZoom is gte minZoom
        options.maxZoom = Math.max(options.minZoom, options.maxZoom);
      } else {
        // make sure minZoom is lte maxZoom
        options.minZoom = Math.min(options.maxZoom, options.minZoom);
      }
      if (typeof options.subdomains === 'string') {
        options.subdomains = options.subdomains.split('');
      }
      this.on('tileunload', this._onTileRemove);
    },
    // @method setUrl(url: String, noRedraw?: Boolean): this
    // Updates the layer's URL template and redraws it (unless `noRedraw` is set to `true`).
    // If the URL does not change, the layer will not be redrawn unless
    // the noRedraw parameter is set to false.
    setUrl: function (url, noRedraw) {
      if (this._url === url && noRedraw === undefined) {
        noRedraw = true;
      }
      this._url = url;
      if (!noRedraw) {
        this.redraw();
      }
      return this;
    },
    // @method createTile(coords: Object, done?: Function): HTMLElement
    // Called only internally, overrides GridLayer's [`createTile()`](#gridlayer-createtile)
    // to return an `<img>` HTML element with the appropriate image URL given `coords`. The `done`
    // callback is called when the tile has been loaded.
    createTile: function (coords, done) {
      var tile = document.createElement('img');
      on(tile, 'load', bind(this._tileOnLoad, this, done, tile));
      on(tile, 'error', bind(this._tileOnError, this, done, tile));
      if (this.options.crossOrigin || this.options.crossOrigin === '') {
        tile.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
      }

      // for this new option we follow the documented behavior
      // more closely by only setting the property when string
      if (typeof this.options.referrerPolicy === 'string') {
        tile.referrerPolicy = this.options.referrerPolicy;
      }

      // The alt attribute is set to the empty string,
      // allowing screen readers to ignore the decorative image tiles.
      // https://www.w3.org/WAI/tutorials/images/decorative/
      // https://www.w3.org/TR/html-aria/#el-img-empty-alt
      tile.alt = '';
      tile.src = this.getTileUrl(coords);
      return tile;
    },
    // @section Extension methods
    // @uninheritable
    // Layers extending `TileLayer` might reimplement the following method.
    // @method getTileUrl(coords: Object): String
    // Called only internally, returns the URL for a tile given its coordinates.
    // Classes extending `TileLayer` can override this function to provide custom tile URL naming schemes.
    getTileUrl: function (coords) {
      var data = {
        r: Browser.retina ? '@2x' : '',
        s: this._getSubdomain(coords),
        x: coords.x,
        y: coords.y,
        z: this._getZoomForUrl()
      };
      if (this._map && !this._map.options.crs.infinite) {
        var invertedY = this._globalTileRange.max.y - coords.y;
        if (this.options.tms) {
          data['y'] = invertedY;
        }
        data['-y'] = invertedY;
      }
      return template(this._url, extend(data, this.options));
    },
    _tileOnLoad: function (done, tile) {
      // For https://github.com/Leaflet/Leaflet/issues/3332
      if (Browser.ielt9) {
        setTimeout(bind(done, this, null, tile), 0);
      } else {
        done(null, tile);
      }
    },
    _tileOnError: function (done, tile, e) {
      var errorUrl = this.options.errorTileUrl;
      if (errorUrl && tile.getAttribute('src') !== errorUrl) {
        tile.src = errorUrl;
      }
      done(e, tile);
    },
    _onTileRemove: function (e) {
      e.tile.onload = null;
    },
    _getZoomForUrl: function () {
      var zoom = this._tileZoom,
        maxZoom = this.options.maxZoom,
        zoomReverse = this.options.zoomReverse,
        zoomOffset = this.options.zoomOffset;
      if (zoomReverse) {
        zoom = maxZoom - zoom;
      }
      return zoom + zoomOffset;
    },
    _getSubdomain: function (tilePoint) {
      var index = Math.abs(tilePoint.x + tilePoint.y) % this.options.subdomains.length;
      return this.options.subdomains[index];
    },
    // stops loading all tiles in the background layer
    _abortLoading: function () {
      var i, tile;
      for (i in this._tiles) {
        if (this._tiles[i].coords.z !== this._tileZoom) {
          tile = this._tiles[i].el;
          tile.onload = falseFn;
          tile.onerror = falseFn;
          if (!tile.complete) {
            tile.src = emptyImageUrl;
            var coords = this._tiles[i].coords;
            remove(tile);
            delete this._tiles[i];
            // @event tileabort: TileEvent
            // Fired when a tile was loading but is now not wanted.
            this.fire('tileabort', {
              tile: tile,
              coords: coords
            });
          }
        }
      }
    },
    _removeTile: function (key) {
      var tile = this._tiles[key];
      if (!tile) {
        return;
      }

      // Cancels any pending http requests associated with the tile
      tile.el.setAttribute('src', emptyImageUrl);
      return GridLayer.prototype._removeTile.call(this, key);
    },
    _tileReady: function (coords, err, tile) {
      if (!this._map || tile && tile.getAttribute('src') === emptyImageUrl) {
        return;
      }
      return GridLayer.prototype._tileReady.call(this, coords, err, tile);
    }
  });

  // @factory L.tilelayer(urlTemplate: String, options?: TileLayer options)
  // Instantiates a tile layer object given a `URL template` and optionally an options object.

  function tileLayer(url, options) {
    return new TileLayer(url, options);
  }

  /*
   * @class TileLayer.WMS
   * @inherits TileLayer
   * @aka L.TileLayer.WMS
   * Used to display [WMS](https://en.wikipedia.org/wiki/Web_Map_Service) services as tile layers on the map. Extends `TileLayer`.
   *
   * @example
   *
   * ```js
   * var nexrad = L.tileLayer.wms("http://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi", {
   * 	layers: 'nexrad-n0r-900913',
   * 	format: 'image/png',
   * 	transparent: true,
   * 	attribution: "Weather data © 2012 IEM Nexrad"
   * });
   * ```
   */

  var TileLayerWMS = TileLayer.extend({
    // @section
    // @aka TileLayer.WMS options
    // If any custom options not documented here are used, they will be sent to the
    // WMS server as extra parameters in each request URL. This can be useful for
    // [non-standard vendor WMS parameters](https://docs.geoserver.org/stable/en/user/services/wms/vendor.html).
    defaultWmsParams: {
      service: 'WMS',
      request: 'GetMap',
      // @option layers: String = ''
      // **(required)** Comma-separated list of WMS layers to show.
      layers: '',
      // @option styles: String = ''
      // Comma-separated list of WMS styles.
      styles: '',
      // @option format: String = 'image/jpeg'
      // WMS image format (use `'image/png'` for layers with transparency).
      format: 'image/jpeg',
      // @option transparent: Boolean = false
      // If `true`, the WMS service will return images with transparency.
      transparent: false,
      // @option version: String = '1.1.1'
      // Version of the WMS service to use
      version: '1.1.1'
    },
    options: {
      // @option crs: CRS = null
      // Coordinate Reference System to use for the WMS requests, defaults to
      // map CRS. Don't change this if you're not sure what it means.
      crs: null,
      // @option uppercase: Boolean = false
      // If `true`, WMS request parameter keys will be uppercase.
      uppercase: false
    },
    initialize: function (url, options) {
      this._url = url;
      var wmsParams = extend({}, this.defaultWmsParams);

      // all keys that are not TileLayer options go to WMS params
      for (var i in options) {
        if (!(i in this.options)) {
          wmsParams[i] = options[i];
        }
      }
      options = setOptions(this, options);
      var realRetina = options.detectRetina && Browser.retina ? 2 : 1;
      var tileSize = this.getTileSize();
      wmsParams.width = tileSize.x * realRetina;
      wmsParams.height = tileSize.y * realRetina;
      this.wmsParams = wmsParams;
    },
    onAdd: function (map) {
      this._crs = this.options.crs || map.options.crs;
      this._wmsVersion = parseFloat(this.wmsParams.version);
      var projectionKey = this._wmsVersion >= 1.3 ? 'crs' : 'srs';
      this.wmsParams[projectionKey] = this._crs.code;
      TileLayer.prototype.onAdd.call(this, map);
    },
    getTileUrl: function (coords) {
      var tileBounds = this._tileCoordsToNwSe(coords),
        crs = this._crs,
        bounds = toBounds(crs.project(tileBounds[0]), crs.project(tileBounds[1])),
        min = bounds.min,
        max = bounds.max,
        bbox = (this._wmsVersion >= 1.3 && this._crs === EPSG4326 ? [min.y, min.x, max.y, max.x] : [min.x, min.y, max.x, max.y]).join(','),
        url = TileLayer.prototype.getTileUrl.call(this, coords);
      return url + getParamString(this.wmsParams, url, this.options.uppercase) + (this.options.uppercase ? '&BBOX=' : '&bbox=') + bbox;
    },
    // @method setParams(params: Object, noRedraw?: Boolean): this
    // Merges an object with the new parameters and re-requests tiles on the current screen (unless `noRedraw` was set to true).
    setParams: function (params, noRedraw) {
      extend(this.wmsParams, params);
      if (!noRedraw) {
        this.redraw();
      }
      return this;
    }
  });

  // @factory L.tileLayer.wms(baseUrl: String, options: TileLayer.WMS options)
  // Instantiates a WMS tile layer object given a base URL of the WMS service and a WMS parameters/options object.
  function tileLayerWMS(url, options) {
    return new TileLayerWMS(url, options);
  }
  TileLayer.WMS = TileLayerWMS;
  tileLayer.wms = tileLayerWMS;

  /*
   * @class Renderer
   * @inherits Layer
   * @aka L.Renderer
   *
   * Base class for vector renderer implementations (`SVG`, `Canvas`). Handles the
   * DOM container of the renderer, its bounds, and its zoom animation.
   *
   * A `Renderer` works as an implicit layer group for all `Path`s - the renderer
   * itself can be added or removed to the map. All paths use a renderer, which can
   * be implicit (the map will decide the type of renderer and use it automatically)
   * or explicit (using the [`renderer`](#path-renderer) option of the path).
   *
   * Do not use this class directly, use `SVG` and `Canvas` instead.
   *
   * @event update: Event
   * Fired when the renderer updates its bounds, center and zoom, for example when
   * its map has moved
   */

  var Renderer = Layer.extend({
    // @section
    // @aka Renderer options
    options: {
      // @option padding: Number = 0.1
      // How much to extend the clip area around the map view (relative to its size)
      // e.g. 0.1 would be 10% of map view in each direction
      padding: 0.1
    },
    initialize: function (options) {
      setOptions(this, options);
      stamp(this);
      this._layers = this._layers || {};
    },
    onAdd: function () {
      if (!this._container) {
        this._initContainer(); // defined by renderer implementations

        // always keep transform-origin as 0 0
        addClass(this._container, 'leaflet-zoom-animated');
      }
      this.getPane().appendChild(this._container);
      this._update();
      this.on('update', this._updatePaths, this);
    },
    onRemove: function () {
      this.off('update', this._updatePaths, this);
      this._destroyContainer();
    },
    getEvents: function () {
      var events = {
        viewreset: this._reset,
        zoom: this._onZoom,
        moveend: this._update,
        zoomend: this._onZoomEnd
      };
      if (this._zoomAnimated) {
        events.zoomanim = this._onAnimZoom;
      }
      return events;
    },
    _onAnimZoom: function (ev) {
      this._updateTransform(ev.center, ev.zoom);
    },
    _onZoom: function () {
      this._updateTransform(this._map.getCenter(), this._map.getZoom());
    },
    _updateTransform: function (center, zoom) {
      var scale = this._map.getZoomScale(zoom, this._zoom),
        viewHalf = this._map.getSize().multiplyBy(0.5 + this.options.padding),
        currentCenterPoint = this._map.project(this._center, zoom),
        topLeftOffset = viewHalf.multiplyBy(-scale).add(currentCenterPoint).subtract(this._map._getNewPixelOrigin(center, zoom));
      if (Browser.any3d) {
        setTransform(this._container, topLeftOffset, scale);
      } else {
        setPosition(this._container, topLeftOffset);
      }
    },
    _reset: function () {
      this._update();
      this._updateTransform(this._center, this._zoom);
      for (var id in this._layers) {
        this._layers[id]._reset();
      }
    },
    _onZoomEnd: function () {
      for (var id in this._layers) {
        this._layers[id]._project();
      }
    },
    _updatePaths: function () {
      for (var id in this._layers) {
        this._layers[id]._update();
      }
    },
    _update: function () {
      // Update pixel bounds of renderer container (for positioning/sizing/clipping later)
      // Subclasses are responsible of firing the 'update' event.
      var p = this.options.padding,
        size = this._map.getSize(),
        min = this._map.containerPointToLayerPoint(size.multiplyBy(-p)).round();
      this._bounds = new Bounds(min, min.add(size.multiplyBy(1 + p * 2)).round());
      this._center = this._map.getCenter();
      this._zoom = this._map.getZoom();
    }
  });

  /*
   * @class Canvas
   * @inherits Renderer
   * @aka L.Canvas
   *
   * Allows vector layers to be displayed with [`<canvas>`](https://developer.mozilla.org/docs/Web/API/Canvas_API).
   * Inherits `Renderer`.
   *
   * Due to [technical limitations](https://caniuse.com/canvas), Canvas is not
   * available in all web browsers, notably IE8, and overlapping geometries might
   * not display properly in some edge cases.
   *
   * @example
   *
   * Use Canvas by default for all paths in the map:
   *
   * ```js
   * var map = L.map('map', {
   * 	renderer: L.canvas()
   * });
   * ```
   *
   * Use a Canvas renderer with extra padding for specific vector geometries:
   *
   * ```js
   * var map = L.map('map');
   * var myRenderer = L.canvas({ padding: 0.5 });
   * var line = L.polyline( coordinates, { renderer: myRenderer } );
   * var circle = L.circle( center, { renderer: myRenderer } );
   * ```
   */

  var Canvas = Renderer.extend({
    // @section
    // @aka Canvas options
    options: {
      // @option tolerance: Number = 0
      // How much to extend the click tolerance around a path/object on the map.
      tolerance: 0
    },
    getEvents: function () {
      var events = Renderer.prototype.getEvents.call(this);
      events.viewprereset = this._onViewPreReset;
      return events;
    },
    _onViewPreReset: function () {
      // Set a flag so that a viewprereset+moveend+viewreset only updates&redraws once
      this._postponeUpdatePaths = true;
    },
    onAdd: function () {
      Renderer.prototype.onAdd.call(this);

      // Redraw vectors since canvas is cleared upon removal,
      // in case of removing the renderer itself from the map.
      this._draw();
    },
    _initContainer: function () {
      var container = this._container = document.createElement('canvas');
      on(container, 'mousemove', this._onMouseMove, this);
      on(container, 'click dblclick mousedown mouseup contextmenu', this._onClick, this);
      on(container, 'mouseout', this._handleMouseOut, this);
      container['_leaflet_disable_events'] = true;
      this._ctx = container.getContext('2d');
    },
    _destroyContainer: function () {
      cancelAnimFrame(this._redrawRequest);
      delete this._ctx;
      remove(this._container);
      off(this._container);
      delete this._container;
    },
    _updatePaths: function () {
      if (this._postponeUpdatePaths) {
        return;
      }
      var layer;
      this._redrawBounds = null;
      for (var id in this._layers) {
        layer = this._layers[id];
        layer._update();
      }
      this._redraw();
    },
    _update: function () {
      if (this._map._animatingZoom && this._bounds) {
        return;
      }
      Renderer.prototype._update.call(this);
      var b = this._bounds,
        container = this._container,
        size = b.getSize(),
        m = Browser.retina ? 2 : 1;
      setPosition(container, b.min);

      // set canvas size (also clearing it); use double size on retina
      container.width = m * size.x;
      container.height = m * size.y;
      container.style.width = size.x + 'px';
      container.style.height = size.y + 'px';
      if (Browser.retina) {
        this._ctx.scale(2, 2);
      }

      // translate so we use the same path coordinates after canvas element moves
      this._ctx.translate(-b.min.x, -b.min.y);

      // Tell paths to redraw themselves
      this.fire('update');
    },
    _reset: function () {
      Renderer.prototype._reset.call(this);
      if (this._postponeUpdatePaths) {
        this._postponeUpdatePaths = false;
        this._updatePaths();
      }
    },
    _initPath: function (layer) {
      this._updateDashArray(layer);
      this._layers[stamp(layer)] = layer;
      var order = layer._order = {
        layer: layer,
        prev: this._drawLast,
        next: null
      };
      if (this._drawLast) {
        this._drawLast.next = order;
      }
      this._drawLast = order;
      this._drawFirst = this._drawFirst || this._drawLast;
    },
    _addPath: function (layer) {
      this._requestRedraw(layer);
    },
    _removePath: function (layer) {
      var order = layer._order;
      var next = order.next;
      var prev = order.prev;
      if (next) {
        next.prev = prev;
      } else {
        this._drawLast = prev;
      }
      if (prev) {
        prev.next = next;
      } else {
        this._drawFirst = next;
      }
      delete layer._order;
      delete this._layers[stamp(layer)];
      this._requestRedraw(layer);
    },
    _updatePath: function (layer) {
      // Redraw the union of the layer's old pixel
      // bounds and the new pixel bounds.
      this._extendRedrawBounds(layer);
      layer._project();
      layer._update();
      // The redraw will extend the redraw bounds
      // with the new pixel bounds.
      this._requestRedraw(layer);
    },
    _updateStyle: function (layer) {
      this._updateDashArray(layer);
      this._requestRedraw(layer);
    },
    _updateDashArray: function (layer) {
      if (typeof layer.options.dashArray === 'string') {
        var parts = layer.options.dashArray.split(/[, ]+/),
          dashArray = [],
          dashValue,
          i;
        for (i = 0; i < parts.length; i++) {
          dashValue = Number(parts[i]);
          // Ignore dash array containing invalid lengths
          if (isNaN(dashValue)) {
            return;
          }
          dashArray.push(dashValue);
        }
        layer.options._dashArray = dashArray;
      } else {
        layer.options._dashArray = layer.options.dashArray;
      }
    },
    _requestRedraw: function (layer) {
      if (!this._map) {
        return;
      }
      this._extendRedrawBounds(layer);
      this._redrawRequest = this._redrawRequest || requestAnimFrame(this._redraw, this);
    },
    _extendRedrawBounds: function (layer) {
      if (layer._pxBounds) {
        var padding = (layer.options.weight || 0) + 1;
        this._redrawBounds = this._redrawBounds || new Bounds();
        this._redrawBounds.extend(layer._pxBounds.min.subtract([padding, padding]));
        this._redrawBounds.extend(layer._pxBounds.max.add([padding, padding]));
      }
    },
    _redraw: function () {
      this._redrawRequest = null;
      if (this._redrawBounds) {
        this._redrawBounds.min._floor();
        this._redrawBounds.max._ceil();
      }
      this._clear(); // clear layers in redraw bounds
      this._draw(); // draw layers

      this._redrawBounds = null;
    },
    _clear: function () {
      var bounds = this._redrawBounds;
      if (bounds) {
        var size = bounds.getSize();
        this._ctx.clearRect(bounds.min.x, bounds.min.y, size.x, size.y);
      } else {
        this._ctx.save();
        this._ctx.setTransform(1, 0, 0, 1, 0, 0);
        this._ctx.clearRect(0, 0, this._container.width, this._container.height);
        this._ctx.restore();
      }
    },
    _draw: function () {
      var layer,
        bounds = this._redrawBounds;
      this._ctx.save();
      if (bounds) {
        var size = bounds.getSize();
        this._ctx.beginPath();
        this._ctx.rect(bounds.min.x, bounds.min.y, size.x, size.y);
        this._ctx.clip();
      }
      this._drawing = true;
      for (var order = this._drawFirst; order; order = order.next) {
        layer = order.layer;
        if (!bounds || layer._pxBounds && layer._pxBounds.intersects(bounds)) {
          layer._updatePath();
        }
      }
      this._drawing = false;
      this._ctx.restore(); // Restore state before clipping.
    },
    _updatePoly: function (layer, closed) {
      if (!this._drawing) {
        return;
      }
      var i,
        j,
        len2,
        p,
        parts = layer._parts,
        len = parts.length,
        ctx = this._ctx;
      if (!len) {
        return;
      }
      ctx.beginPath();
      for (i = 0; i < len; i++) {
        for (j = 0, len2 = parts[i].length; j < len2; j++) {
          p = parts[i][j];
          ctx[j ? 'lineTo' : 'moveTo'](p.x, p.y);
        }
        if (closed) {
          ctx.closePath();
        }
      }
      this._fillStroke(ctx, layer);

      // TODO optimization: 1 fill/stroke for all features with equal style instead of 1 for each feature
    },
    _updateCircle: function (layer) {
      if (!this._drawing || layer._empty()) {
        return;
      }
      var p = layer._point,
        ctx = this._ctx,
        r = Math.max(Math.round(layer._radius), 1),
        s = (Math.max(Math.round(layer._radiusY), 1) || r) / r;
      if (s !== 1) {
        ctx.save();
        ctx.scale(1, s);
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y / s, r, 0, Math.PI * 2, false);
      if (s !== 1) {
        ctx.restore();
      }
      this._fillStroke(ctx, layer);
    },
    _fillStroke: function (ctx, layer) {
      var options = layer.options;
      if (options.fill) {
        ctx.globalAlpha = options.fillOpacity;
        ctx.fillStyle = options.fillColor || options.color;
        ctx.fill(options.fillRule || 'evenodd');
      }
      if (options.stroke && options.weight !== 0) {
        if (ctx.setLineDash) {
          ctx.setLineDash(layer.options && layer.options._dashArray || []);
        }
        ctx.globalAlpha = options.opacity;
        ctx.lineWidth = options.weight;
        ctx.strokeStyle = options.color;
        ctx.lineCap = options.lineCap;
        ctx.lineJoin = options.lineJoin;
        ctx.stroke();
      }
    },
    // Canvas obviously doesn't have mouse events for individual drawn objects,
    // so we emulate that by calculating what's under the mouse on mousemove/click manually

    _onClick: function (e) {
      var point = this._map.mouseEventToLayerPoint(e),
        layer,
        clickedLayer;
      for (var order = this._drawFirst; order; order = order.next) {
        layer = order.layer;
        if (layer.options.interactive && layer._containsPoint(point)) {
          if (!(e.type === 'click' || e.type === 'preclick') || !this._map._draggableMoved(layer)) {
            clickedLayer = layer;
          }
        }
      }
      this._fireEvent(clickedLayer ? [clickedLayer] : false, e);
    },
    _onMouseMove: function (e) {
      if (!this._map || this._map.dragging.moving() || this._map._animatingZoom) {
        return;
      }
      var point = this._map.mouseEventToLayerPoint(e);
      this._handleMouseHover(e, point);
    },
    _handleMouseOut: function (e) {
      var layer = this._hoveredLayer;
      if (layer) {
        // if we're leaving the layer, fire mouseout
        removeClass(this._container, 'leaflet-interactive');
        this._fireEvent([layer], e, 'mouseout');
        this._hoveredLayer = null;
        this._mouseHoverThrottled = false;
      }
    },
    _handleMouseHover: function (e, point) {
      if (this._mouseHoverThrottled) {
        return;
      }
      var layer, candidateHoveredLayer;
      for (var order = this._drawFirst; order; order = order.next) {
        layer = order.layer;
        if (layer.options.interactive && layer._containsPoint(point)) {
          candidateHoveredLayer = layer;
        }
      }
      if (candidateHoveredLayer !== this._hoveredLayer) {
        this._handleMouseOut(e);
        if (candidateHoveredLayer) {
          addClass(this._container, 'leaflet-interactive'); // change cursor
          this._fireEvent([candidateHoveredLayer], e, 'mouseover');
          this._hoveredLayer = candidateHoveredLayer;
        }
      }
      this._fireEvent(this._hoveredLayer ? [this._hoveredLayer] : false, e);
      this._mouseHoverThrottled = true;
      setTimeout(bind(function () {
        this._mouseHoverThrottled = false;
      }, this), 32);
    },
    _fireEvent: function (layers, e, type) {
      this._map._fireDOMEvent(e, type || e.type, layers);
    },
    _bringToFront: function (layer) {
      var order = layer._order;
      if (!order) {
        return;
      }
      var next = order.next;
      var prev = order.prev;
      if (next) {
        next.prev = prev;
      } else {
        // Already last
        return;
      }
      if (prev) {
        prev.next = next;
      } else if (next) {
        // Update first entry unless this is the
        // single entry
        this._drawFirst = next;
      }
      order.prev = this._drawLast;
      this._drawLast.next = order;
      order.next = null;
      this._drawLast = order;
      this._requestRedraw(layer);
    },
    _bringToBack: function (layer) {
      var order = layer._order;
      if (!order) {
        return;
      }
      var next = order.next;
      var prev = order.prev;
      if (prev) {
        prev.next = next;
      } else {
        // Already first
        return;
      }
      if (next) {
        next.prev = prev;
      } else if (prev) {
        // Update last entry unless this is the
        // single entry
        this._drawLast = prev;
      }
      order.prev = null;
      order.next = this._drawFirst;
      this._drawFirst.prev = order;
      this._drawFirst = order;
      this._requestRedraw(layer);
    }
  });

  // @factory L.canvas(options?: Renderer options)
  // Creates a Canvas renderer with the given options.
  function canvas(options) {
    return Browser.canvas ? new Canvas(options) : null;
  }

  /*
   * Thanks to Dmitry Baranovsky and his Raphael library for inspiration!
   */

  var vmlCreate = function () {
    try {
      document.namespaces.add('lvml', 'urn:schemas-microsoft-com:vml');
      return function (name) {
        return document.createElement('<lvml:' + name + ' class="lvml">');
      };
    } catch (e) {
      // Do not return fn from catch block so `e` can be garbage collected
      // See https://github.com/Leaflet/Leaflet/pull/7279
    }
    return function (name) {
      return document.createElement('<' + name + ' xmlns="urn:schemas-microsoft.com:vml" class="lvml">');
    };
  }();

  /*
   * @class SVG
   *
   *
   * VML was deprecated in 2012, which means VML functionality exists only for backwards compatibility
   * with old versions of Internet Explorer.
   */

  // mixin to redefine some SVG methods to handle VML syntax which is similar but with some differences
  var vmlMixin = {
    _initContainer: function () {
      this._container = create$1('div', 'leaflet-vml-container');
    },
    _update: function () {
      if (this._map._animatingZoom) {
        return;
      }
      Renderer.prototype._update.call(this);
      this.fire('update');
    },
    _initPath: function (layer) {
      var container = layer._container = vmlCreate('shape');
      addClass(container, 'leaflet-vml-shape ' + (this.options.className || ''));
      container.coordsize = '1 1';
      layer._path = vmlCreate('path');
      container.appendChild(layer._path);
      this._updateStyle(layer);
      this._layers[stamp(layer)] = layer;
    },
    _addPath: function (layer) {
      var container = layer._container;
      this._container.appendChild(container);
      if (layer.options.interactive) {
        layer.addInteractiveTarget(container);
      }
    },
    _removePath: function (layer) {
      var container = layer._container;
      remove(container);
      layer.removeInteractiveTarget(container);
      delete this._layers[stamp(layer)];
    },
    _updateStyle: function (layer) {
      var stroke = layer._stroke,
        fill = layer._fill,
        options = layer.options,
        container = layer._container;
      container.stroked = !!options.stroke;
      container.filled = !!options.fill;
      if (options.stroke) {
        if (!stroke) {
          stroke = layer._stroke = vmlCreate('stroke');
        }
        container.appendChild(stroke);
        stroke.weight = options.weight + 'px';
        stroke.color = options.color;
        stroke.opacity = options.opacity;
        if (options.dashArray) {
          stroke.dashStyle = isArray(options.dashArray) ? options.dashArray.join(' ') : options.dashArray.replace(/( *, *)/g, ' ');
        } else {
          stroke.dashStyle = '';
        }
        stroke.endcap = options.lineCap.replace('butt', 'flat');
        stroke.joinstyle = options.lineJoin;
      } else if (stroke) {
        container.removeChild(stroke);
        layer._stroke = null;
      }
      if (options.fill) {
        if (!fill) {
          fill = layer._fill = vmlCreate('fill');
        }
        container.appendChild(fill);
        fill.color = options.fillColor || options.color;
        fill.opacity = options.fillOpacity;
      } else if (fill) {
        container.removeChild(fill);
        layer._fill = null;
      }
    },
    _updateCircle: function (layer) {
      var p = layer._point.round(),
        r = Math.round(layer._radius),
        r2 = Math.round(layer._radiusY || r);
      this._setPath(layer, layer._empty() ? 'M0 0' : 'AL ' + p.x + ',' + p.y + ' ' + r + ',' + r2 + ' 0,' + 65535 * 360);
    },
    _setPath: function (layer, path) {
      layer._path.v = path;
    },
    _bringToFront: function (layer) {
      toFront(layer._container);
    },
    _bringToBack: function (layer) {
      toBack(layer._container);
    }
  };
  var create = Browser.vml ? vmlCreate : svgCreate;

  /*
   * @class SVG
   * @inherits Renderer
   * @aka L.SVG
   *
   * Allows vector layers to be displayed with [SVG](https://developer.mozilla.org/docs/Web/SVG).
   * Inherits `Renderer`.
   *
   * Due to [technical limitations](https://caniuse.com/svg), SVG is not
   * available in all web browsers, notably Android 2.x and 3.x.
   *
   * Although SVG is not available on IE7 and IE8, these browsers support
   * [VML](https://en.wikipedia.org/wiki/Vector_Markup_Language)
   * (a now deprecated technology), and the SVG renderer will fall back to VML in
   * this case.
   *
   * @example
   *
   * Use SVG by default for all paths in the map:
   *
   * ```js
   * var map = L.map('map', {
   * 	renderer: L.svg()
   * });
   * ```
   *
   * Use a SVG renderer with extra padding for specific vector geometries:
   *
   * ```js
   * var map = L.map('map');
   * var myRenderer = L.svg({ padding: 0.5 });
   * var line = L.polyline( coordinates, { renderer: myRenderer } );
   * var circle = L.circle( center, { renderer: myRenderer } );
   * ```
   */

  var SVG = Renderer.extend({
    _initContainer: function () {
      this._container = create('svg');

      // makes it possible to click through svg root; we'll reset it back in individual paths
      this._container.setAttribute('pointer-events', 'none');
      this._rootGroup = create('g');
      this._container.appendChild(this._rootGroup);
    },
    _destroyContainer: function () {
      remove(this._container);
      off(this._container);
      delete this._container;
      delete this._rootGroup;
      delete this._svgSize;
    },
    _update: function () {
      if (this._map._animatingZoom && this._bounds) {
        return;
      }
      Renderer.prototype._update.call(this);
      var b = this._bounds,
        size = b.getSize(),
        container = this._container;

      // set size of svg-container if changed
      if (!this._svgSize || !this._svgSize.equals(size)) {
        this._svgSize = size;
        container.setAttribute('width', size.x);
        container.setAttribute('height', size.y);
      }

      // movement: update container viewBox so that we don't have to change coordinates of individual layers
      setPosition(container, b.min);
      container.setAttribute('viewBox', [b.min.x, b.min.y, size.x, size.y].join(' '));
      this.fire('update');
    },
    // methods below are called by vector layers implementations

    _initPath: function (layer) {
      var path = layer._path = create('path');

      // @namespace Path
      // @option className: String = null
      // Custom class name set on an element. Only for SVG renderer.
      if (layer.options.className) {
        addClass(path, layer.options.className);
      }
      if (layer.options.interactive) {
        addClass(path, 'leaflet-interactive');
      }
      this._updateStyle(layer);
      this._layers[stamp(layer)] = layer;
    },
    _addPath: function (layer) {
      if (!this._rootGroup) {
        this._initContainer();
      }
      this._rootGroup.appendChild(layer._path);
      layer.addInteractiveTarget(layer._path);
    },
    _removePath: function (layer) {
      remove(layer._path);
      layer.removeInteractiveTarget(layer._path);
      delete this._layers[stamp(layer)];
    },
    _updatePath: function (layer) {
      layer._project();
      layer._update();
    },
    _updateStyle: function (layer) {
      var path = layer._path,
        options = layer.options;
      if (!path) {
        return;
      }
      if (options.stroke) {
        path.setAttribute('stroke', options.color);
        path.setAttribute('stroke-opacity', options.opacity);
        path.setAttribute('stroke-width', options.weight);
        path.setAttribute('stroke-linecap', options.lineCap);
        path.setAttribute('stroke-linejoin', options.lineJoin);
        if (options.dashArray) {
          path.setAttribute('stroke-dasharray', options.dashArray);
        } else {
          path.removeAttribute('stroke-dasharray');
        }
        if (options.dashOffset) {
          path.setAttribute('stroke-dashoffset', options.dashOffset);
        } else {
          path.removeAttribute('stroke-dashoffset');
        }
      } else {
        path.setAttribute('stroke', 'none');
      }
      if (options.fill) {
        path.setAttribute('fill', options.fillColor || options.color);
        path.setAttribute('fill-opacity', options.fillOpacity);
        path.setAttribute('fill-rule', options.fillRule || 'evenodd');
      } else {
        path.setAttribute('fill', 'none');
      }
    },
    _updatePoly: function (layer, closed) {
      this._setPath(layer, pointsToPath(layer._parts, closed));
    },
    _updateCircle: function (layer) {
      var p = layer._point,
        r = Math.max(Math.round(layer._radius), 1),
        r2 = Math.max(Math.round(layer._radiusY), 1) || r,
        arc = 'a' + r + ',' + r2 + ' 0 1,0 ';

      // drawing a circle with two half-arcs
      var d = layer._empty() ? 'M0 0' : 'M' + (p.x - r) + ',' + p.y + arc + r * 2 + ',0 ' + arc + -r * 2 + ',0 ';
      this._setPath(layer, d);
    },
    _setPath: function (layer, path) {
      layer._path.setAttribute('d', path);
    },
    // SVG does not have the concept of zIndex so we resort to changing the DOM order of elements
    _bringToFront: function (layer) {
      toFront(layer._path);
    },
    _bringToBack: function (layer) {
      toBack(layer._path);
    }
  });
  if (Browser.vml) {
    SVG.include(vmlMixin);
  }

  // @namespace SVG
  // @factory L.svg(options?: Renderer options)
  // Creates a SVG renderer with the given options.
  function svg(options) {
    return Browser.svg || Browser.vml ? new SVG(options) : null;
  }
  Map.include({
    // @namespace Map; @method getRenderer(layer: Path): Renderer
    // Returns the instance of `Renderer` that should be used to render the given
    // `Path`. It will ensure that the `renderer` options of the map and paths
    // are respected, and that the renderers do exist on the map.
    getRenderer: function (layer) {
      // @namespace Path; @option renderer: Renderer
      // Use this specific instance of `Renderer` for this path. Takes
      // precedence over the map's [default renderer](#map-renderer).
      var renderer = layer.options.renderer || this._getPaneRenderer(layer.options.pane) || this.options.renderer || this._renderer;
      if (!renderer) {
        renderer = this._renderer = this._createRenderer();
      }
      if (!this.hasLayer(renderer)) {
        this.addLayer(renderer);
      }
      return renderer;
    },
    _getPaneRenderer: function (name) {
      if (name === 'overlayPane' || name === undefined) {
        return false;
      }
      var renderer = this._paneRenderers[name];
      if (renderer === undefined) {
        renderer = this._createRenderer({
          pane: name
        });
        this._paneRenderers[name] = renderer;
      }
      return renderer;
    },
    _createRenderer: function (options) {
      // @namespace Map; @option preferCanvas: Boolean = false
      // Whether `Path`s should be rendered on a `Canvas` renderer.
      // By default, all `Path`s are rendered in a `SVG` renderer.
      return this.options.preferCanvas && canvas(options) || svg(options);
    }
  });

  /*
   * L.Rectangle extends Polygon and creates a rectangle when passed a LatLngBounds object.
   */

  /*
   * @class Rectangle
   * @aka L.Rectangle
   * @inherits Polygon
   *
   * A class for drawing rectangle overlays on a map. Extends `Polygon`.
   *
   * @example
   *
   * ```js
   * // define rectangle geographical bounds
   * var bounds = [[54.559322, -5.767822], [56.1210604, -3.021240]];
   *
   * // create an orange rectangle
   * L.rectangle(bounds, {color: "#ff7800", weight: 1}).addTo(map);
   *
   * // zoom the map to the rectangle bounds
   * map.fitBounds(bounds);
   * ```
   *
   */

  var Rectangle = Polygon.extend({
    initialize: function (latLngBounds, options) {
      Polygon.prototype.initialize.call(this, this._boundsToLatLngs(latLngBounds), options);
    },
    // @method setBounds(latLngBounds: LatLngBounds): this
    // Redraws the rectangle with the passed bounds.
    setBounds: function (latLngBounds) {
      return this.setLatLngs(this._boundsToLatLngs(latLngBounds));
    },
    _boundsToLatLngs: function (latLngBounds) {
      latLngBounds = toLatLngBounds(latLngBounds);
      return [latLngBounds.getSouthWest(), latLngBounds.getNorthWest(), latLngBounds.getNorthEast(), latLngBounds.getSouthEast()];
    }
  });

  // @factory L.rectangle(latLngBounds: LatLngBounds, options?: Polyline options)
  function rectangle(latLngBounds, options) {
    return new Rectangle(latLngBounds, options);
  }
  SVG.create = create;
  SVG.pointsToPath = pointsToPath;
  GeoJSON.geometryToLayer = geometryToLayer;
  GeoJSON.coordsToLatLng = coordsToLatLng;
  GeoJSON.coordsToLatLngs = coordsToLatLngs;
  GeoJSON.latLngToCoords = latLngToCoords;
  GeoJSON.latLngsToCoords = latLngsToCoords;
  GeoJSON.getFeature = getFeature;
  GeoJSON.asFeature = asFeature;

  /*
   * L.Handler.BoxZoom is used to add shift-drag zoom interaction to the map
   * (zoom to a selected bounding box), enabled by default.
   */

  // @namespace Map
  // @section Interaction Options
  Map.mergeOptions({
    // @option boxZoom: Boolean = true
    // Whether the map can be zoomed to a rectangular area specified by
    // dragging the mouse while pressing the shift key.
    boxZoom: true
  });
  var BoxZoom = Handler.extend({
    initialize: function (map) {
      this._map = map;
      this._container = map._container;
      this._pane = map._panes.overlayPane;
      this._resetStateTimeout = 0;
      map.on('unload', this._destroy, this);
    },
    addHooks: function () {
      on(this._container, 'mousedown', this._onMouseDown, this);
    },
    removeHooks: function () {
      off(this._container, 'mousedown', this._onMouseDown, this);
    },
    moved: function () {
      return this._moved;
    },
    _destroy: function () {
      remove(this._pane);
      delete this._pane;
    },
    _resetState: function () {
      this._resetStateTimeout = 0;
      this._moved = false;
    },
    _clearDeferredResetState: function () {
      if (this._resetStateTimeout !== 0) {
        clearTimeout(this._resetStateTimeout);
        this._resetStateTimeout = 0;
      }
    },
    _onMouseDown: function (e) {
      if (!e.shiftKey || e.which !== 1 && e.button !== 1) {
        return false;
      }

      // Clear the deferred resetState if it hasn't executed yet, otherwise it
      // will interrupt the interaction and orphan a box element in the container.
      this._clearDeferredResetState();
      this._resetState();
      disableTextSelection();
      disableImageDrag();
      this._startPoint = this._map.mouseEventToContainerPoint(e);
      on(document, {
        contextmenu: stop,
        mousemove: this._onMouseMove,
        mouseup: this._onMouseUp,
        keydown: this._onKeyDown
      }, this);
    },
    _onMouseMove: function (e) {
      if (!this._moved) {
        this._moved = true;
        this._box = create$1('div', 'leaflet-zoom-box', this._container);
        addClass(this._container, 'leaflet-crosshair');
        this._map.fire('boxzoomstart');
      }
      this._point = this._map.mouseEventToContainerPoint(e);
      var bounds = new Bounds(this._point, this._startPoint),
        size = bounds.getSize();
      setPosition(this._box, bounds.min);
      this._box.style.width = size.x + 'px';
      this._box.style.height = size.y + 'px';
    },
    _finish: function () {
      if (this._moved) {
        remove(this._box);
        removeClass(this._container, 'leaflet-crosshair');
      }
      enableTextSelection();
      enableImageDrag();
      off(document, {
        contextmenu: stop,
        mousemove: this._onMouseMove,
        mouseup: this._onMouseUp,
        keydown: this._onKeyDown
      }, this);
    },
    _onMouseUp: function (e) {
      if (e.which !== 1 && e.button !== 1) {
        return;
      }
      this._finish();
      if (!this._moved) {
        return;
      }
      // Postpone to next JS tick so internal click event handling
      // still see it as "moved".
      this._clearDeferredResetState();
      this._resetStateTimeout = setTimeout(bind(this._resetState, this), 0);
      var bounds = new LatLngBounds(this._map.containerPointToLatLng(this._startPoint), this._map.containerPointToLatLng(this._point));
      this._map.fitBounds(bounds).fire('boxzoomend', {
        boxZoomBounds: bounds
      });
    },
    _onKeyDown: function (e) {
      if (e.keyCode === 27) {
        this._finish();
        this._clearDeferredResetState();
        this._resetState();
      }
    }
  });

  // @section Handlers
  // @property boxZoom: Handler
  // Box (shift-drag with mouse) zoom handler.
  Map.addInitHook('addHandler', 'boxZoom', BoxZoom);

  /*
   * L.Handler.DoubleClickZoom is used to handle double-click zoom on the map, enabled by default.
   */

  // @namespace Map
  // @section Interaction Options

  Map.mergeOptions({
    // @option doubleClickZoom: Boolean|String = true
    // Whether the map can be zoomed in by double clicking on it and
    // zoomed out by double clicking while holding shift. If passed
    // `'center'`, double-click zoom will zoom to the center of the
    //  view regardless of where the mouse was.
    doubleClickZoom: true
  });
  var DoubleClickZoom = Handler.extend({
    addHooks: function () {
      this._map.on('dblclick', this._onDoubleClick, this);
    },
    removeHooks: function () {
      this._map.off('dblclick', this._onDoubleClick, this);
    },
    _onDoubleClick: function (e) {
      var map = this._map,
        oldZoom = map.getZoom(),
        delta = map.options.zoomDelta,
        zoom = e.originalEvent.shiftKey ? oldZoom - delta : oldZoom + delta;
      if (map.options.doubleClickZoom === 'center') {
        map.setZoom(zoom);
      } else {
        map.setZoomAround(e.containerPoint, zoom);
      }
    }
  });

  // @section Handlers
  //
  // Map properties include interaction handlers that allow you to control
  // interaction behavior in runtime, enabling or disabling certain features such
  // as dragging or touch zoom (see `Handler` methods). For example:
  //
  // ```js
  // map.doubleClickZoom.disable();
  // ```
  //
  // @property doubleClickZoom: Handler
  // Double click zoom handler.
  Map.addInitHook('addHandler', 'doubleClickZoom', DoubleClickZoom);

  /*
   * L.Handler.MapDrag is used to make the map draggable (with panning inertia), enabled by default.
   */

  // @namespace Map
  // @section Interaction Options
  Map.mergeOptions({
    // @option dragging: Boolean = true
    // Whether the map is draggable with mouse/touch or not.
    dragging: true,
    // @section Panning Inertia Options
    // @option inertia: Boolean = *
    // If enabled, panning of the map will have an inertia effect where
    // the map builds momentum while dragging and continues moving in
    // the same direction for some time. Feels especially nice on touch
    // devices. Enabled by default.
    inertia: true,
    // @option inertiaDeceleration: Number = 3000
    // The rate with which the inertial movement slows down, in pixels/second².
    inertiaDeceleration: 3400,
    // px/s^2

    // @option inertiaMaxSpeed: Number = Infinity
    // Max speed of the inertial movement, in pixels/second.
    inertiaMaxSpeed: Infinity,
    // px/s

    // @option easeLinearity: Number = 0.2
    easeLinearity: 0.2,
    // TODO refactor, move to CRS
    // @option worldCopyJump: Boolean = false
    // With this option enabled, the map tracks when you pan to another "copy"
    // of the world and seamlessly jumps to the original one so that all overlays
    // like markers and vector layers are still visible.
    worldCopyJump: false,
    // @option maxBoundsViscosity: Number = 0.0
    // If `maxBounds` is set, this option will control how solid the bounds
    // are when dragging the map around. The default value of `0.0` allows the
    // user to drag outside the bounds at normal speed, higher values will
    // slow down map dragging outside bounds, and `1.0` makes the bounds fully
    // solid, preventing the user from dragging outside the bounds.
    maxBoundsViscosity: 0.0
  });
  var Drag = Handler.extend({
    addHooks: function () {
      if (!this._draggable) {
        var map = this._map;
        this._draggable = new Draggable(map._mapPane, map._container);
        this._draggable.on({
          dragstart: this._onDragStart,
          drag: this._onDrag,
          dragend: this._onDragEnd
        }, this);
        this._draggable.on('predrag', this._onPreDragLimit, this);
        if (map.options.worldCopyJump) {
          this._draggable.on('predrag', this._onPreDragWrap, this);
          map.on('zoomend', this._onZoomEnd, this);
          map.whenReady(this._onZoomEnd, this);
        }
      }
      addClass(this._map._container, 'leaflet-grab leaflet-touch-drag');
      this._draggable.enable();
      this._positions = [];
      this._times = [];
    },
    removeHooks: function () {
      removeClass(this._map._container, 'leaflet-grab');
      removeClass(this._map._container, 'leaflet-touch-drag');
      this._draggable.disable();
    },
    moved: function () {
      return this._draggable && this._draggable._moved;
    },
    moving: function () {
      return this._draggable && this._draggable._moving;
    },
    _onDragStart: function () {
      var map = this._map;
      map._stop();
      if (this._map.options.maxBounds && this._map.options.maxBoundsViscosity) {
        var bounds = toLatLngBounds(this._map.options.maxBounds);
        this._offsetLimit = toBounds(this._map.latLngToContainerPoint(bounds.getNorthWest()).multiplyBy(-1), this._map.latLngToContainerPoint(bounds.getSouthEast()).multiplyBy(-1).add(this._map.getSize()));
        this._viscosity = Math.min(1.0, Math.max(0.0, this._map.options.maxBoundsViscosity));
      } else {
        this._offsetLimit = null;
      }
      map.fire('movestart').fire('dragstart');
      if (map.options.inertia) {
        this._positions = [];
        this._times = [];
      }
    },
    _onDrag: function (e) {
      if (this._map.options.inertia) {
        var time = this._lastTime = +new Date(),
          pos = this._lastPos = this._draggable._absPos || this._draggable._newPos;
        this._positions.push(pos);
        this._times.push(time);
        this._prunePositions(time);
      }
      this._map.fire('move', e).fire('drag', e);
    },
    _prunePositions: function (time) {
      while (this._positions.length > 1 && time - this._times[0] > 50) {
        this._positions.shift();
        this._times.shift();
      }
    },
    _onZoomEnd: function () {
      var pxCenter = this._map.getSize().divideBy(2),
        pxWorldCenter = this._map.latLngToLayerPoint([0, 0]);
      this._initialWorldOffset = pxWorldCenter.subtract(pxCenter).x;
      this._worldWidth = this._map.getPixelWorldBounds().getSize().x;
    },
    _viscousLimit: function (value, threshold) {
      return value - (value - threshold) * this._viscosity;
    },
    _onPreDragLimit: function () {
      if (!this._viscosity || !this._offsetLimit) {
        return;
      }
      var offset = this._draggable._newPos.subtract(this._draggable._startPos);
      var limit = this._offsetLimit;
      if (offset.x < limit.min.x) {
        offset.x = this._viscousLimit(offset.x, limit.min.x);
      }
      if (offset.y < limit.min.y) {
        offset.y = this._viscousLimit(offset.y, limit.min.y);
      }
      if (offset.x > limit.max.x) {
        offset.x = this._viscousLimit(offset.x, limit.max.x);
      }
      if (offset.y > limit.max.y) {
        offset.y = this._viscousLimit(offset.y, limit.max.y);
      }
      this._draggable._newPos = this._draggable._startPos.add(offset);
    },
    _onPreDragWrap: function () {
      // TODO refactor to be able to adjust map pane position after zoom
      var worldWidth = this._worldWidth,
        halfWidth = Math.round(worldWidth / 2),
        dx = this._initialWorldOffset,
        x = this._draggable._newPos.x,
        newX1 = (x - halfWidth + dx) % worldWidth + halfWidth - dx,
        newX2 = (x + halfWidth + dx) % worldWidth - halfWidth - dx,
        newX = Math.abs(newX1 + dx) < Math.abs(newX2 + dx) ? newX1 : newX2;
      this._draggable._absPos = this._draggable._newPos.clone();
      this._draggable._newPos.x = newX;
    },
    _onDragEnd: function (e) {
      var map = this._map,
        options = map.options,
        noInertia = !options.inertia || e.noInertia || this._times.length < 2;
      map.fire('dragend', e);
      if (noInertia) {
        map.fire('moveend');
      } else {
        this._prunePositions(+new Date());
        var direction = this._lastPos.subtract(this._positions[0]),
          duration = (this._lastTime - this._times[0]) / 1000,
          ease = options.easeLinearity,
          speedVector = direction.multiplyBy(ease / duration),
          speed = speedVector.distanceTo([0, 0]),
          limitedSpeed = Math.min(options.inertiaMaxSpeed, speed),
          limitedSpeedVector = speedVector.multiplyBy(limitedSpeed / speed),
          decelerationDuration = limitedSpeed / (options.inertiaDeceleration * ease),
          offset = limitedSpeedVector.multiplyBy(-decelerationDuration / 2).round();
        if (!offset.x && !offset.y) {
          map.fire('moveend');
        } else {
          offset = map._limitOffset(offset, map.options.maxBounds);
          requestAnimFrame(function () {
            map.panBy(offset, {
              duration: decelerationDuration,
              easeLinearity: ease,
              noMoveStart: true,
              animate: true
            });
          });
        }
      }
    }
  });

  // @section Handlers
  // @property dragging: Handler
  // Map dragging handler (by both mouse and touch).
  Map.addInitHook('addHandler', 'dragging', Drag);

  /*
   * L.Map.Keyboard is handling keyboard interaction with the map, enabled by default.
   */

  // @namespace Map
  // @section Keyboard Navigation Options
  Map.mergeOptions({
    // @option keyboard: Boolean = true
    // Makes the map focusable and allows users to navigate the map with keyboard
    // arrows and `+`/`-` keys.
    keyboard: true,
    // @option keyboardPanDelta: Number = 80
    // Amount of pixels to pan when pressing an arrow key.
    keyboardPanDelta: 80
  });
  var Keyboard = Handler.extend({
    keyCodes: {
      left: [37],
      right: [39],
      down: [40],
      up: [38],
      zoomIn: [187, 107, 61, 171],
      zoomOut: [189, 109, 54, 173]
    },
    initialize: function (map) {
      this._map = map;
      this._setPanDelta(map.options.keyboardPanDelta);
      this._setZoomDelta(map.options.zoomDelta);
    },
    addHooks: function () {
      var container = this._map._container;

      // make the container focusable by tabbing
      if (container.tabIndex <= 0) {
        container.tabIndex = '0';
      }
      on(container, {
        focus: this._onFocus,
        blur: this._onBlur,
        mousedown: this._onMouseDown
      }, this);
      this._map.on({
        focus: this._addHooks,
        blur: this._removeHooks
      }, this);
    },
    removeHooks: function () {
      this._removeHooks();
      off(this._map._container, {
        focus: this._onFocus,
        blur: this._onBlur,
        mousedown: this._onMouseDown
      }, this);
      this._map.off({
        focus: this._addHooks,
        blur: this._removeHooks
      }, this);
    },
    _onMouseDown: function () {
      if (this._focused) {
        return;
      }
      var body = document.body,
        docEl = document.documentElement,
        top = body.scrollTop || docEl.scrollTop,
        left = body.scrollLeft || docEl.scrollLeft;
      this._map._container.focus();
      window.scrollTo(left, top);
    },
    _onFocus: function () {
      this._focused = true;
      this._map.fire('focus');
    },
    _onBlur: function () {
      this._focused = false;
      this._map.fire('blur');
    },
    _setPanDelta: function (panDelta) {
      var keys = this._panKeys = {},
        codes = this.keyCodes,
        i,
        len;
      for (i = 0, len = codes.left.length; i < len; i++) {
        keys[codes.left[i]] = [-1 * panDelta, 0];
      }
      for (i = 0, len = codes.right.length; i < len; i++) {
        keys[codes.right[i]] = [panDelta, 0];
      }
      for (i = 0, len = codes.down.length; i < len; i++) {
        keys[codes.down[i]] = [0, panDelta];
      }
      for (i = 0, len = codes.up.length; i < len; i++) {
        keys[codes.up[i]] = [0, -1 * panDelta];
      }
    },
    _setZoomDelta: function (zoomDelta) {
      var keys = this._zoomKeys = {},
        codes = this.keyCodes,
        i,
        len;
      for (i = 0, len = codes.zoomIn.length; i < len; i++) {
        keys[codes.zoomIn[i]] = zoomDelta;
      }
      for (i = 0, len = codes.zoomOut.length; i < len; i++) {
        keys[codes.zoomOut[i]] = -zoomDelta;
      }
    },
    _addHooks: function () {
      on(document, 'keydown', this._onKeyDown, this);
    },
    _removeHooks: function () {
      off(document, 'keydown', this._onKeyDown, this);
    },
    _onKeyDown: function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) {
        return;
      }
      var key = e.keyCode,
        map = this._map,
        offset;
      if (key in this._panKeys) {
        if (!map._panAnim || !map._panAnim._inProgress) {
          offset = this._panKeys[key];
          if (e.shiftKey) {
            offset = toPoint(offset).multiplyBy(3);
          }
          if (map.options.maxBounds) {
            offset = map._limitOffset(toPoint(offset), map.options.maxBounds);
          }
          if (map.options.worldCopyJump) {
            var newLatLng = map.wrapLatLng(map.unproject(map.project(map.getCenter()).add(offset)));
            map.panTo(newLatLng);
          } else {
            map.panBy(offset);
          }
        }
      } else if (key in this._zoomKeys) {
        map.setZoom(map.getZoom() + (e.shiftKey ? 3 : 1) * this._zoomKeys[key]);
      } else if (key === 27 && map._popup && map._popup.options.closeOnEscapeKey) {
        map.closePopup();
      } else {
        return;
      }
      stop(e);
    }
  });

  // @section Handlers
  // @section Handlers
  // @property keyboard: Handler
  // Keyboard navigation handler.
  Map.addInitHook('addHandler', 'keyboard', Keyboard);

  /*
   * L.Handler.ScrollWheelZoom is used by L.Map to enable mouse scroll wheel zoom on the map.
   */

  // @namespace Map
  // @section Interaction Options
  Map.mergeOptions({
    // @section Mouse wheel options
    // @option scrollWheelZoom: Boolean|String = true
    // Whether the map can be zoomed by using the mouse wheel. If passed `'center'`,
    // it will zoom to the center of the view regardless of where the mouse was.
    scrollWheelZoom: true,
    // @option wheelDebounceTime: Number = 40
    // Limits the rate at which a wheel can fire (in milliseconds). By default
    // user can't zoom via wheel more often than once per 40 ms.
    wheelDebounceTime: 40,
    // @option wheelPxPerZoomLevel: Number = 60
    // How many scroll pixels (as reported by [L.DomEvent.getWheelDelta](#domevent-getwheeldelta))
    // mean a change of one full zoom level. Smaller values will make wheel-zooming
    // faster (and vice versa).
    wheelPxPerZoomLevel: 60
  });
  var ScrollWheelZoom = Handler.extend({
    addHooks: function () {
      on(this._map._container, 'wheel', this._onWheelScroll, this);
      this._delta = 0;
    },
    removeHooks: function () {
      off(this._map._container, 'wheel', this._onWheelScroll, this);
    },
    _onWheelScroll: function (e) {
      var delta = getWheelDelta(e);
      var debounce = this._map.options.wheelDebounceTime;
      this._delta += delta;
      this._lastMousePos = this._map.mouseEventToContainerPoint(e);
      if (!this._startTime) {
        this._startTime = +new Date();
      }
      var left = Math.max(debounce - (+new Date() - this._startTime), 0);
      clearTimeout(this._timer);
      this._timer = setTimeout(bind(this._performZoom, this), left);
      stop(e);
    },
    _performZoom: function () {
      var map = this._map,
        zoom = map.getZoom(),
        snap = this._map.options.zoomSnap || 0;
      map._stop(); // stop panning and fly animations if any

      // map the delta with a sigmoid function to -4..4 range leaning on -1..1
      var d2 = this._delta / (this._map.options.wheelPxPerZoomLevel * 4),
        d3 = 4 * Math.log(2 / (1 + Math.exp(-Math.abs(d2)))) / Math.LN2,
        d4 = snap ? Math.ceil(d3 / snap) * snap : d3,
        delta = map._limitZoom(zoom + (this._delta > 0 ? d4 : -d4)) - zoom;
      this._delta = 0;
      this._startTime = null;
      if (!delta) {
        return;
      }
      if (map.options.scrollWheelZoom === 'center') {
        map.setZoom(zoom + delta);
      } else {
        map.setZoomAround(this._lastMousePos, zoom + delta);
      }
    }
  });

  // @section Handlers
  // @property scrollWheelZoom: Handler
  // Scroll wheel zoom handler.
  Map.addInitHook('addHandler', 'scrollWheelZoom', ScrollWheelZoom);

  /*
   * L.Map.TapHold is used to simulate `contextmenu` event on long hold,
   * which otherwise is not fired by mobile Safari.
   */

  var tapHoldDelay = 600;

  // @namespace Map
  // @section Interaction Options
  Map.mergeOptions({
    // @section Touch interaction options
    // @option tapHold: Boolean
    // Enables simulation of `contextmenu` event, default is `true` for mobile Safari.
    tapHold: Browser.touchNative && Browser.safari && Browser.mobile,
    // @option tapTolerance: Number = 15
    // The max number of pixels a user can shift his finger during touch
    // for it to be considered a valid tap.
    tapTolerance: 15
  });
  var TapHold = Handler.extend({
    addHooks: function () {
      on(this._map._container, 'touchstart', this._onDown, this);
    },
    removeHooks: function () {
      off(this._map._container, 'touchstart', this._onDown, this);
    },
    _onDown: function (e) {
      clearTimeout(this._holdTimeout);
      if (e.touches.length !== 1) {
        return;
      }
      var first = e.touches[0];
      this._startPos = this._newPos = new Point(first.clientX, first.clientY);
      this._holdTimeout = setTimeout(bind(function () {
        this._cancel();
        if (!this._isTapValid()) {
          return;
        }

        // prevent simulated mouse events https://w3c.github.io/touch-events/#mouse-events
        on(document, 'touchend', preventDefault);
        on(document, 'touchend touchcancel', this._cancelClickPrevent);
        this._simulateEvent('contextmenu', first);
      }, this), tapHoldDelay);
      on(document, 'touchend touchcancel contextmenu', this._cancel, this);
      on(document, 'touchmove', this._onMove, this);
    },
    _cancelClickPrevent: function cancelClickPrevent() {
      off(document, 'touchend', preventDefault);
      off(document, 'touchend touchcancel', cancelClickPrevent);
    },
    _cancel: function () {
      clearTimeout(this._holdTimeout);
      off(document, 'touchend touchcancel contextmenu', this._cancel, this);
      off(document, 'touchmove', this._onMove, this);
    },
    _onMove: function (e) {
      var first = e.touches[0];
      this._newPos = new Point(first.clientX, first.clientY);
    },
    _isTapValid: function () {
      return this._newPos.distanceTo(this._startPos) <= this._map.options.tapTolerance;
    },
    _simulateEvent: function (type, e) {
      var simulatedEvent = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        // detail: 1,
        screenX: e.screenX,
        screenY: e.screenY,
        clientX: e.clientX,
        clientY: e.clientY
        // button: 2,
        // buttons: 2
      });
      simulatedEvent._simulated = true;
      e.target.dispatchEvent(simulatedEvent);
    }
  });

  // @section Handlers
  // @property tapHold: Handler
  // Long tap handler to simulate `contextmenu` event (useful in mobile Safari).
  Map.addInitHook('addHandler', 'tapHold', TapHold);

  /*
   * L.Handler.TouchZoom is used by L.Map to add pinch zoom on supported mobile browsers.
   */

  // @namespace Map
  // @section Interaction Options
  Map.mergeOptions({
    // @section Touch interaction options
    // @option touchZoom: Boolean|String = *
    // Whether the map can be zoomed by touch-dragging with two fingers. If
    // passed `'center'`, it will zoom to the center of the view regardless of
    // where the touch events (fingers) were. Enabled for touch-capable web
    // browsers.
    touchZoom: Browser.touch,
    // @option bounceAtZoomLimits: Boolean = true
    // Set it to false if you don't want the map to zoom beyond min/max zoom
    // and then bounce back when pinch-zooming.
    bounceAtZoomLimits: true
  });
  var TouchZoom = Handler.extend({
    addHooks: function () {
      addClass(this._map._container, 'leaflet-touch-zoom');
      on(this._map._container, 'touchstart', this._onTouchStart, this);
    },
    removeHooks: function () {
      removeClass(this._map._container, 'leaflet-touch-zoom');
      off(this._map._container, 'touchstart', this._onTouchStart, this);
    },
    _onTouchStart: function (e) {
      var map = this._map;
      if (!e.touches || e.touches.length !== 2 || map._animatingZoom || this._zooming) {
        return;
      }
      var p1 = map.mouseEventToContainerPoint(e.touches[0]),
        p2 = map.mouseEventToContainerPoint(e.touches[1]);
      this._centerPoint = map.getSize()._divideBy(2);
      this._startLatLng = map.containerPointToLatLng(this._centerPoint);
      if (map.options.touchZoom !== 'center') {
        this._pinchStartLatLng = map.containerPointToLatLng(p1.add(p2)._divideBy(2));
      }
      this._startDist = p1.distanceTo(p2);
      this._startZoom = map.getZoom();
      this._moved = false;
      this._zooming = true;
      map._stop();
      on(document, 'touchmove', this._onTouchMove, this);
      on(document, 'touchend touchcancel', this._onTouchEnd, this);
      preventDefault(e);
    },
    _onTouchMove: function (e) {
      if (!e.touches || e.touches.length !== 2 || !this._zooming) {
        return;
      }
      var map = this._map,
        p1 = map.mouseEventToContainerPoint(e.touches[0]),
        p2 = map.mouseEventToContainerPoint(e.touches[1]),
        scale = p1.distanceTo(p2) / this._startDist;
      this._zoom = map.getScaleZoom(scale, this._startZoom);
      if (!map.options.bounceAtZoomLimits && (this._zoom < map.getMinZoom() && scale < 1 || this._zoom > map.getMaxZoom() && scale > 1)) {
        this._zoom = map._limitZoom(this._zoom);
      }
      if (map.options.touchZoom === 'center') {
        this._center = this._startLatLng;
        if (scale === 1) {
          return;
        }
      } else {
        // Get delta from pinch to center, so centerLatLng is delta applied to initial pinchLatLng
        var delta = p1._add(p2)._divideBy(2)._subtract(this._centerPoint);
        if (scale === 1 && delta.x === 0 && delta.y === 0) {
          return;
        }
        this._center = map.unproject(map.project(this._pinchStartLatLng, this._zoom).subtract(delta), this._zoom);
      }
      if (!this._moved) {
        map._moveStart(true, false);
        this._moved = true;
      }
      cancelAnimFrame(this._animRequest);
      var moveFn = bind(map._move, map, this._center, this._zoom, {
        pinch: true,
        round: false
      }, undefined);
      this._animRequest = requestAnimFrame(moveFn, this, true);
      preventDefault(e);
    },
    _onTouchEnd: function () {
      if (!this._moved || !this._zooming) {
        this._zooming = false;
        return;
      }
      this._zooming = false;
      cancelAnimFrame(this._animRequest);
      off(document, 'touchmove', this._onTouchMove, this);
      off(document, 'touchend touchcancel', this._onTouchEnd, this);

      // Pinch updates GridLayers' levels only when zoomSnap is off, so zoomSnap becomes noUpdate.
      if (this._map.options.zoomAnimation) {
        this._map._animateZoom(this._center, this._map._limitZoom(this._zoom), true, this._map.options.zoomSnap);
      } else {
        this._map._resetView(this._center, this._map._limitZoom(this._zoom));
      }
    }
  });

  // @section Handlers
  // @property touchZoom: Handler
  // Touch zoom handler.
  Map.addInitHook('addHandler', 'touchZoom', TouchZoom);
  Map.BoxZoom = BoxZoom;
  Map.DoubleClickZoom = DoubleClickZoom;
  Map.Drag = Drag;
  Map.Keyboard = Keyboard;
  Map.ScrollWheelZoom = ScrollWheelZoom;
  Map.TapHold = TapHold;
  Map.TouchZoom = TouchZoom;
  exports.Bounds = Bounds;
  exports.Browser = Browser;
  exports.CRS = CRS;
  exports.Canvas = Canvas;
  exports.Circle = Circle;
  exports.CircleMarker = CircleMarker;
  exports.Class = Class;
  exports.Control = Control;
  exports.DivIcon = DivIcon;
  exports.DivOverlay = DivOverlay;
  exports.DomEvent = DomEvent;
  exports.DomUtil = DomUtil;
  exports.Draggable = Draggable;
  exports.Evented = Evented;
  exports.FeatureGroup = FeatureGroup;
  exports.GeoJSON = GeoJSON;
  exports.GridLayer = GridLayer;
  exports.Handler = Handler;
  exports.Icon = Icon;
  exports.ImageOverlay = ImageOverlay;
  exports.LatLng = LatLng;
  exports.LatLngBounds = LatLngBounds;
  exports.Layer = Layer;
  exports.LayerGroup = LayerGroup;
  exports.LineUtil = LineUtil;
  exports.Map = Map;
  exports.Marker = Marker;
  exports.Mixin = Mixin;
  exports.Path = Path;
  exports.Point = Point;
  exports.PolyUtil = PolyUtil;
  exports.Polygon = Polygon;
  exports.Polyline = Polyline;
  exports.Popup = Popup;
  exports.PosAnimation = PosAnimation;
  exports.Projection = index;
  exports.Rectangle = Rectangle;
  exports.Renderer = Renderer;
  exports.SVG = SVG;
  exports.SVGOverlay = SVGOverlay;
  exports.TileLayer = TileLayer;
  exports.Tooltip = Tooltip;
  exports.Transformation = Transformation;
  exports.Util = Util;
  exports.VideoOverlay = VideoOverlay;
  exports.bind = bind;
  exports.bounds = toBounds;
  exports.canvas = canvas;
  exports.circle = circle;
  exports.circleMarker = circleMarker;
  exports.control = control;
  exports.divIcon = divIcon;
  exports.extend = extend;
  exports.featureGroup = featureGroup;
  exports.geoJSON = geoJSON;
  exports.geoJson = geoJson;
  exports.gridLayer = gridLayer;
  exports.icon = icon;
  exports.imageOverlay = imageOverlay;
  exports.latLng = toLatLng;
  exports.latLngBounds = toLatLngBounds;
  exports.layerGroup = layerGroup;
  exports.map = createMap;
  exports.marker = marker;
  exports.point = toPoint;
  exports.polygon = polygon;
  exports.polyline = polyline;
  exports.popup = popup;
  exports.rectangle = rectangle;
  exports.setOptions = setOptions;
  exports.stamp = stamp;
  exports.svg = svg;
  exports.svgOverlay = svgOverlay;
  exports.tileLayer = tileLayer;
  exports.tooltip = tooltip;
  exports.transformation = toTransformation;
  exports.version = version;
  exports.videoOverlay = videoOverlay;
  var oldL = window.L;
  exports.noConflict = function () {
    window.L = oldL;
    return this;
  };
  // Always export us to window global (see #2364)
  window.L = exports;
});

},{}]},{},[6]);
