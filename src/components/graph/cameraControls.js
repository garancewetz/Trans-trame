import * as THREE from 'three'

export function setupKeyboardHandlers({ keysRef, selectedNodeRef, fgRef }) {
  const BLOCKED = [
    'arrowup',
    'arrowdown',
    'arrowleft',
    'arrowright',
    ' ',
    'keyz',
    'keys',
    'equal',
    'minus',
    'z',
    's',
    '+',
    '-',
    '=',
  ]

  const onDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
    const codeKey = (e.code || '').toLowerCase()
    const charKey = (e.key || '').toLowerCase()
    if (codeKey) keysRef.current.add(codeKey)
    if (charKey) keysRef.current.add(charKey)
    if (BLOCKED.includes(codeKey) || BLOCKED.includes(charKey)) e.preventDefault()

    if (charKey === ' ') {
      const node = selectedNodeRef.current
      if (node?.x != null && fgRef.current) {
        const { x, y, z } = node
        fgRef.current.cameraPosition({ x: x + 100, y: y + 30, z: z + 100 }, { x, y, z }, 900)
      }
    }
  }

  const onUp = (e) => {
    const codeKey = (e.code || '').toLowerCase()
    const charKey = (e.key || '').toLowerCase()
    if (codeKey) keysRef.current.delete(codeKey)
    if (charKey) keysRef.current.delete(charKey)
  }

  window.addEventListener('keydown', onDown)
  window.addEventListener('keyup', onUp)

  return () => {
    window.removeEventListener('keydown', onDown)
    window.removeEventListener('keyup', onUp)
  }
}

export function setupMousePanHandlers({ containerRef, velRef }) {
  let dragging = false
  let lastX = 0
  let lastY = 0

  const onPointerDown = (e) => {
    if (e.button !== 0) return
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
  }

  const onPointerMove = (e) => {
    if (!dragging) return
    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY

    // Inject drag movement into the same pan velocity used by arrow keys.
    const DRAG_TO_VEL = 0.08
    const vel = velRef.current
    vel.moveX = (vel.moveX ?? 0) + dx * DRAG_TO_VEL
    vel.moveY = (vel.moveY ?? 0) - dy * DRAG_TO_VEL
  }

  const stopDragging = () => {
    dragging = false
  }

  const el = containerRef.current
  if (!el) return () => {}

  el.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', stopDragging)
  window.addEventListener('pointercancel', stopDragging)

  return () => {
    el.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', stopDragging)
    window.removeEventListener('pointercancel', stopDragging)
  }
}

export function setupWheelZoomHandlers({ containerRef, fgRef, velRef, lastCameraStateRef }) {
  const el = containerRef.current
  if (!el) return () => {}

  const MIN_RADIUS = 35
  const MAX_RADIUS = 2400
  const TRACKPAD_ZOOM_FACTOR = 0.0035

  const onWheel = (e) => {
    const fg = fgRef.current
    if (!fg) return
    const camera = fg.camera?.()
    if (!camera) return
    const ctrl = fg.controls?.()
    const savedTarget = lastCameraStateRef.current?.target
    const target = ctrl?.target ?? savedTarget ?? new THREE.Vector3(0, 0, 0)

    // Keep page from scrolling and route trackpad pinch/wheel to graph zoom.
    e.preventDefault()

    // Trackpad pinch generally emits wheel events (often with ctrlKey=true).
    const radial = camera.position.clone().sub(target)
    const dist = radial.length()
    if (dist <= 0.0001) return

    // Scale zoom speed proportionally to distance so it feels consistent at any depth.
    const zoomDelta = e.deltaY * TRACKPAD_ZOOM_FACTOR * dist
    const nextDist = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, dist + zoomDelta))
    camera.position.copy(target.clone().addScaledVector(radial.normalize(), nextDist))
    if (ctrl?.target) {
      ctrl.target.copy(target)
      ctrl.update?.()
    } else {
      camera.lookAt(target)
    }

    lastCameraStateRef.current = {
      ...(lastCameraStateRef.current || {}),
      position: camera.position.clone(),
      rotation: camera.rotation.clone(),
      target: target.clone(),
    }

    // Cancel residual keyboard zoom inertia for immediate wheel control.
    velRef.current.zoom = 0
  }

  el.addEventListener('wheel', onWheel, { passive: false })

  return () => {
    el.removeEventListener('wheel', onWheel)
  }
}

export function startTankLoop({ fgRef, keysRef, velRef, animFrameRef, lastCameraStateRef }) {
  const MOVE_ACCEL = 0.9
  const MAX_MOVE = 10
  const ZOOM_ACCEL = 1.2
  const MAX_ZOOM = 16
  const DAMP = 0.82
  const BOUNDS = 1400
  let target = new THREE.Vector3(0, 0, 0)

  const animate = () => {
    animFrameRef.current = requestAnimationFrame(animate)
    const fg = fgRef.current
    if (!fg) return
    const camera = fg.camera()
    if (!camera) return
    const ctrl = fg.controls?.()

    const keys = keysRef.current
    const vel = velRef.current

    // Synchronise le "target" avec la vraie cible des controls (même si ctrl.enabled=false).
    if (ctrl?.target) {
      if (!vel.__targetSyncedOnce) {
        const savedTarget = lastCameraStateRef.current?.target
        target.copy(savedTarget ?? ctrl.target)
        vel.__targetSyncedOnce = true
      } else {
        target.copy(ctrl.target)
      }
    } else if (!vel.__targetSyncedOnce) {
      const savedTarget = lastCameraStateRef.current?.target
      target.copy(savedTarget ?? target)
      vel.__targetSyncedOnce = true
    }

    // Pan caméra (dans le plan de l'écran)
    const left = keys.has('arrowleft')
    const right = keys.has('arrowright')
    const up = keys.has('arrowup')
    const down = keys.has('arrowdown')

    const targetMoveX = right ? 1 : left ? -1 : 0
    const targetMoveY = up ? 1 : down ? -1 : 0

    vel.moveX = (vel.moveX ?? 0) * DAMP + targetMoveX * MOVE_ACCEL
    vel.moveY = (vel.moveY ?? 0) * DAMP + targetMoveY * MOVE_ACCEL
    vel.moveX = Math.max(-MAX_MOVE, Math.min(MAX_MOVE, vel.moveX))
    vel.moveY = Math.max(-MAX_MOVE, Math.min(MAX_MOVE, vel.moveY))

    if (Math.abs(vel.moveX) > 0.02 || Math.abs(vel.moveY) > 0.02) {
      const forward = new THREE.Vector3()
      camera.getWorldDirection(forward)
      forward.normalize()
      const rightVec = forward.clone().cross(camera.up).normalize()
      const upVec = rightVec.clone().cross(forward).normalize()

      const delta = new THREE.Vector3()
        .addScaledVector(rightVec, vel.moveX)
        .addScaledVector(upVec, vel.moveY)

      camera.position.add(delta)
      target.add(delta)
      if (ctrl?.target) {
        ctrl.target.copy(target)
        ctrl.update?.()
      }
    }

    // Zoom: + / - (fallback Z / S AZERTY) le long de la direction de vue
    const zoomIn = keys.has('+') || keys.has('=') || keys.has('equal') || keys.has('z')
    const zoomOut = keys.has('-') || keys.has('minus') || keys.has('s')
    const targetZoom = zoomIn ? -1 : zoomOut ? 1 : 0

    vel.zoom = (vel.zoom ?? 0) * DAMP + targetZoom * ZOOM_ACCEL
    vel.zoom = Math.max(-MAX_ZOOM, Math.min(MAX_ZOOM, vel.zoom))

    if (Math.abs(vel.zoom) > 0.02) {
      const radial = camera.position.clone().sub(target)
      const len = radial.length()
      if (len > 0.0001) camera.position.addScaledVector(radial.normalize(), vel.zoom)
    }

    if (ctrl?.target) {
      // OrbitControls gère l'orientation via target
      ctrl.update?.()
    } else {
      camera.lookAt(target)
    }

    const distFromOrigin = camera.position.length()
    if (distFromOrigin > BOUNDS) {
      const clamped = camera.position.clone().clampLength(0, BOUNDS)
      const correction = clamped.clone().sub(camera.position)
      camera.position.copy(clamped)
      target.add(correction)
      if (ctrl?.target) {
        ctrl.target.copy(target)
        ctrl.update?.()
      }
      vel.moveX = 0
      vel.moveY = 0
      vel.zoom = 0
    }

    lastCameraStateRef.current = { position: camera.position.clone(), rotation: camera.rotation.clone(), target: target.clone() }
  }

  animFrameRef.current = requestAnimationFrame(animate)
  return () => cancelAnimationFrame(animFrameRef.current)
}

export function restoreCamera({ fgRef, lastCameraStateRef }) {
  const fg = fgRef.current
  if (!fg) return
  const camera = fg.camera()
  const saved = lastCameraStateRef.current
  if (!camera || !saved) return
  camera.position.copy(saved.position)
  camera.rotation.copy(saved.rotation)
  if (saved.target) camera.lookAt(saved.target)
}
