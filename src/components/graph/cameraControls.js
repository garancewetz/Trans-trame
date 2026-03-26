import * as THREE from 'three'

export function setupKeyboardHandlers({ keysRef, selectedNodeRef, fgRef }) {
  const BLOCKED = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ']

  const onDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
    const key = (e.code || e.key).toLowerCase()
    keysRef.current.add(key)
    if (BLOCKED.includes(key)) e.preventDefault()

    if (key === ' ') {
      const node = selectedNodeRef.current
      if (node?.x != null && fgRef.current) {
        const { x, y, z } = node
        fgRef.current.cameraPosition({ x: x + 100, y: y + 30, z: z + 100 }, { x, y, z }, 900)
      }
    }
  }

  const onUp = (e) => keysRef.current.delete((e.code || e.key).toLowerCase())

  window.addEventListener('keydown', onDown)
  window.addEventListener('keyup', onUp)

  return () => {
    window.removeEventListener('keydown', onDown)
    window.removeEventListener('keyup', onUp)
  }
}

export function startTankLoop({ fgRef, keysRef, velRef, animFrameRef, lastCameraStateRef }) {
  const FWD_ACCEL = 1.5
  const MAX_FWD = 15
  const YAW_ACCEL = 0.003
  const MAX_YAW = 0.05
  const DAMP = 0.82
  const BOUNDS = 1400

  const animate = () => {
    animFrameRef.current = requestAnimationFrame(animate)
    const fg = fgRef.current
    if (!fg) return
    const camera = fg.camera()
    if (!camera) return

    camera.rotation.order = 'YXZ'

    const keys = keysRef.current
    const vel = velRef.current

    if (keys.has('arrowleft')) vel.yaw = Math.min(vel.yaw + YAW_ACCEL, MAX_YAW)
    else if (keys.has('arrowright')) vel.yaw = Math.max(vel.yaw - YAW_ACCEL, -MAX_YAW)
    else vel.yaw *= DAMP
    camera.rotation.y += vel.yaw

    if (keys.has('arrowup')) vel.forward = Math.min(vel.forward + FWD_ACCEL, MAX_FWD)
    else if (keys.has('arrowdown')) vel.forward = Math.max(vel.forward - FWD_ACCEL, -MAX_FWD)
    else vel.forward *= DAMP

    if (Math.abs(vel.forward) > 0.05) {
      const dir = new THREE.Vector3()
      camera.getWorldDirection(dir)
      camera.position.addScaledVector(dir, vel.forward)
    }

    if (camera.position.length() > BOUNDS) {
      camera.position.clampLength(0, BOUNDS)
      vel.forward = 0
    }

    lastCameraStateRef.current = { position: camera.position.clone(), rotation: camera.rotation.clone() }
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
}
