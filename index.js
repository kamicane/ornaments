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
  const dk = getDescriptorKey(descriptor)
  if (!dk) return descriptor
  descriptor[dk] = sequence(descriptor[dk])
  return descriptor
}

exports.memoize = function (target, key, descriptor) {
  const dk = getDescriptorKey(descriptor)
  if (!dk) return descriptor

  const mk = `_${key}`
  const method = descriptor[dk]

  descriptor[dk] = function (control) {
    const sk = control == null ? mk : `${mk}_${control}`
    if (sk in this) return this[sk]

    const result = method.call(this)

    defineProperty(this, sk, {
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
  const dk = getDescriptorKey(descriptor)
  if (!dk) return descriptor

  const mk = `_${key}`
  const method = descriptor[dk]

  descriptor[dk] = function (control) {
    const sk = control == null ? mk : `${mk}_${control}`
    if (sk in this) return this[sk]

    const result = new Promise((resolve) => {
      setImmediate(() => {
        delete this[sk]
        resolve(method.call(this))
      })
    })

    defineProperty(this, sk, {
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
  const dk = getDescriptorKey(descriptor)
  if (!dk) return descriptor

  const mk = `_${key}_promise`
  const method = descriptor[dk]

  descriptor[dk] = function (control) {
    const sk = control == null ? mk : `${mk}_${control}`
    const queue = this[sk]

    const factory = () => method.call(this)

    const result = queue ? queue.then(factory) : factory()

    defineProperty(this, sk, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: result
    })

    return result
  }

  return descriptor
}
