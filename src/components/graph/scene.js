import * as THREE from 'three'
import { AXES_COLORS } from '../../categories'

export function createStarField() {
  const geometry = new THREE.BufferGeometry()
  const vertices = []
  for (let i = 0; i < 3000; i++) {
    vertices.push((Math.random() - 0.5) * 3000, (Math.random() - 0.5) * 3000, (Math.random() - 0.5) * 3000)
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  const material = new THREE.PointsMaterial({ color: 0xffffff, size: 1.0, transparent: true, opacity: 0.7 })
  return new THREE.Points(geometry, material)
}

const textureCache = new Map()

export function getGradientTexture(axes) {
  const key = (axes || []).join('|') || '_empty'
  if (textureCache.has(key)) return textureCache.get(key)

  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const colors = (axes || []).map((a) => AXES_COLORS[a]).filter(Boolean)
  if (colors.length === 0) colors.push('#ffffff')

  if (colors.length === 1) {
    ctx.fillStyle = colors[0]
    ctx.fillRect(0, 0, size, size)
  } else {
    const gradient = ctx.createConicGradient(0, size / 2, size / 2)
    colors.forEach((c, i) => gradient.addColorStop(i / colors.length, c))
    gradient.addColorStop(1, colors[0])
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  textureCache.set(key, texture)
  return texture
}
