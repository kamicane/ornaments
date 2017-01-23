'use strict'

const { defineProperty } = Object
const sequence = require('async-sequence')

function getDescriptorKey (descriptor) {
  if ('get' in descriptor) return 'get'
  else if ('value' in descriptor) return 'value'
  else if ('initializer' in descriptor) return 'initializer'
  return null
}

exports.hidden = function (target, key, descriptor) {
  descriptor.enumerable = false
  return descriptor
}

exports.readonly = function (target, key, descriptor) {
  descriptor.writable = false
  return descriptor
}

exports.noconf = function (target, key, descriptor) {
  descriptor.configurable = false
  return descriptor
}

exports.sequence = function (target, key, descriptor) {
  let dk = getDescriptorKey(descriptor)
  if (!dk) return descriptor
  descriptor[dk] = sequence(descriptor[dk])
  return descriptor
}

exports.memoize = function (target, key, descriptor) {
  let dk = getDescriptorKey(descriptor)
  if (!dk) return descriptor

  let mk = `_${key}`
  let method = descriptor[dk]

  descriptor[dk] = function () {
    if (mk in this) return this[mk]

    let result = method.call(this)

    defineProperty(this, mk, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: result
    })

    return result
  }

  return descriptor
}

exports.immediate = function (target, key, descriptor) {
  let dk = getDescriptorKey(descriptor)
  if (!dk) return descriptor

  let mk = `_${key}`
  let method = descriptor[dk]

  descriptor[dk] = function () {
    if (mk in this) return this[mk]

    let result = new Promise((resolve) => {
      setImmediate(() => {
        delete this[mk]
        resolve(method.call(this))
      })
    })

    defineProperty(this, mk, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: result
    })

    return result
  }

  return descriptor
}

exports.reduce = function (target, key, descriptor) {
  let dk = getDescriptorKey(descriptor)
  if (!dk) return descriptor

  let mk = `_${key}_promise`
  let method = descriptor[dk]

  descriptor[dk] = function () {
    let queue = this[mk]

    let factory = () => method.call(this)

    let result = queue ? queue.then(factory) : factory()

    defineProperty(this, mk, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: result
    })

    return result
  }

  return descriptor
}
