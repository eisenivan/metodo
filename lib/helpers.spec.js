const {
  relativeElapsedTime
} = require('./helpers')

describe('relativeElapsedTime', () => {
  it('should be a function', () => {
    expect(typeof relativeElapsedTime).toBe('function')
  })
})
