// jsdom implements neither PointerEvent nor pointer capture. Without the
// polyfill, fireEvent.pointerDown falls back to a plain Event and silently
// drops clientX, pointerId and pointerType, so drag tests pass vacuously:
// Math.hypot(NaN, NaN) never crosses the threshold and nothing is asserted.
if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number
    readonly pointerType: string
    readonly isPrimary: boolean

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      this.pointerId = params.pointerId ?? 0
      this.pointerType = params.pointerType ?? 'mouse'
      this.isPrimary = params.isPrimary ?? true
    }
  }

  window.PointerEvent = PointerEventPolyfill as unknown as typeof window.PointerEvent
}

if (typeof Element !== 'undefined' && !Element.prototype.setPointerCapture) {
  const captured = new WeakMap<Element, Set<number>>()

  Element.prototype.setPointerCapture = function setPointerCapture(pointerId: number) {
    const ids = captured.get(this) ?? new Set<number>()
    ids.add(pointerId)
    captured.set(this, ids)
  }

  Element.prototype.releasePointerCapture = function releasePointerCapture(pointerId: number) {
    captured.get(this)?.delete(pointerId)
  }

  Element.prototype.hasPointerCapture = function hasPointerCapture(pointerId: number) {
    return captured.get(this)?.has(pointerId) ?? false
  }
}
